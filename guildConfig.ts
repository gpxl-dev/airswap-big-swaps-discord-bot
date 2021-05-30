import loadJsonFile from "load-json-file";
import makeDir from "make-dir";
import { resolve } from "path";
import { readdir } from "fs/promises";
import writeJsonFile from "write-json-file";

const defaultConfigDir = "configs";
const configDir = process.env.CONFIG_DIR || defaultConfigDir;

export interface SwapCriteria {
  upperThreshold: number | null;
  lowerThreshold: number | null;
}

export interface GuildConfig {
  guildId: string;
  guildName: string;
  configVersion: number;
  channelConfigs: {
    [channelId: string]: {
      swapTitle: string;
      swapCriteria: SwapCriteria;
    };
  };
}

export const defaultSwapTitle = "🚨🐳 Big Swap Alert! 🐳🚨";

export const defaultGuildConfig: GuildConfig = {
  guildId: "",
  guildName: "",
  configVersion: 1,
  channelConfigs: {},
};

const cachedGuildConfigs: {
  [guildId: string]: GuildConfig;
} = {};

export const makeConfigDir = async () => {
  const dir = await makeDir(configDir);
  return `Config dir: ${dir}`;
};

export const loadAllConfigs = async () => {
  const configFiles = (await readdir(configDir)).filter((file) =>
    file.endsWith(".json")
  );
  const loadFilePromises = configFiles.map((configFile) =>
    loadJsonFile<GuildConfig>(resolve(configDir, configFile))
  );
  const configs = await Promise.all(loadFilePromises);
  configs.forEach((config) => {
    cachedGuildConfigs[config.guildId] = config;
  });
  console.log(`Successfully loaded ${loadFilePromises.length} configs`);
  return cachedGuildConfigs;
};

export const getGuildConfig = async (guildId: string, guildName: string) => {
  if (cachedGuildConfigs[guildId]) return cachedGuildConfigs[guildId];
  try {
    return await loadJsonFile<GuildConfig>(
      resolve(configDir, `${guildId}.json`)
    );
  } catch (e) {
    const newConfig = {
      ...defaultGuildConfig,
      guildName,
      guildId,
    };
    await saveGuildConfig(newConfig, guildId);
    return newConfig;
  }
};

export const saveGuildConfig = async (
  config: GuildConfig,
  guildId?: string
) => {
  let resolvedId = guildId;
  if (!resolvedId) {
    resolvedId = config.guildId;
  }
  cachedGuildConfigs[resolvedId] = config;
  return await writeJsonFile(resolve(configDir, `${resolvedId}.json`), config);
};
