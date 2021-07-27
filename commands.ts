import { Message } from "discord.js";
import { commify } from "ethers/lib/utils";
import { defaultSwapTitle, GuildConfig, saveGuildConfig } from "./guildConfig";

interface Command {
  regex: RegExp;
  onMatch: (
    message: Message,
    match: RegExpMatchArray,
    currentConfig: GuildConfig
  ) => Promise<string | null>;
}

// TODO:
// - help
// - list config
// - set admin roles or users.
// - set title

const commands: Command[] = [
  {
    regex: /test/,
    onMatch: async (match) => {
      return null;
    },
  },
  {
    regex: /^all/,
    onMatch: async (message, match, currentConfig) => {
      currentConfig.channelConfigs[message.channel.id] = {
        swapTitle:
          currentConfig.channelConfigs[message.channel.id]?.swapTitle ||
          defaultSwapTitle,
        swapCriteria: {
          upperThreshold: null,
          lowerThreshold: null,
        },
        registry:
          currentConfig.channelConfigs[message.channel.id]?.registry || false,
      };
      saveGuildConfig(currentConfig);
      return `Changed config to report **all** swaps in this channel`;
    },
  },
  {
    regex: /^>(\d+)/,
    onMatch: async (message, match, currentConfig) => {
      currentConfig.channelConfigs[message.channel.id] = {
        swapTitle:
          currentConfig.channelConfigs[message.channel.id]?.swapTitle ||
          defaultSwapTitle,
        swapCriteria: {
          upperThreshold: null,
          lowerThreshold: parseInt(match[1]),
        },
        registry:
          currentConfig.channelConfigs[message.channel.id]?.registry || false,
      };
      saveGuildConfig(currentConfig);
      return `Changed config to report swaps with a value greater than $${commify(
        match[1]
      )} in this channel`;
    },
  },
  {
    regex: /^<(\d+)/,
    onMatch: async (message, match, currentConfig) => {
      currentConfig.channelConfigs[message.channel.id] = {
        swapTitle:
          currentConfig.channelConfigs[message.channel.id]?.swapTitle ||
          defaultSwapTitle,
        swapCriteria: {
          lowerThreshold: null,
          upperThreshold: parseInt(match[1]),
        },
        registry:
          currentConfig.channelConfigs[message.channel.id]?.registry || false,
      };
      saveGuildConfig(currentConfig);
      return `Changed config to only report swaps with a value less than $${commify(
        match[1]
      )} in this channel`;
    },
  },
  {
    regex: /^(\d+)\s?-\s?(\d+)/,
    onMatch: async (message, match, currentConfig) => {
      currentConfig.channelConfigs[message.channel.id] = {
        swapTitle:
          currentConfig.channelConfigs[message.channel.id]?.swapTitle ||
          defaultSwapTitle,
        swapCriteria: {
          lowerThreshold: parseInt(match[1]),
          upperThreshold: parseInt(match[2]),
        },
        registry:
          currentConfig.channelConfigs[message.channel.id]?.registry || false,
      };
      saveGuildConfig(currentConfig);
      return `Changed config to only report swaps with a value between $${commify(
        match[1]
      )} and $${commify(match[2])} in this channel`;
    },
  },
  {
    regex: /^(stop)|(disable)|(off)/,
    onMatch: async (message, match, currentConfig) => {
      delete currentConfig.channelConfigs[message.channel.id];
      saveGuildConfig(currentConfig);
      return `No longer reporting swaps in this channel`;
    },
  },
  {
    regex: /^status/,
    onMatch: async (message, match, currentConfig) => {
      const current = currentConfig.channelConfigs[message.channel.id];
      if (!current) {
        return "Not currently reporting swaps or registry events in this channel";
      } else {
        const { upperThreshold, lowerThreshold } = current.swapCriteria || {
          upperThreshold: null,
          lowerThreshold: null,
        };
        const registry = current.registry;
        return `Swap thresholds: upper: $${upperThreshold}, lower: $${lowerThreshold}. Registry events: ${registry}`;
      }
    },
  },
  {
    regex: /^registry on/,
    onMatch: async (message, match, currentConfig) => {
      let current = currentConfig.channelConfigs[message.channel.id];
      if (!current) {
        current = {
          swapTitle: defaultSwapTitle,
          swapCriteria: false,
          registry: false,
        };
      }
      currentConfig.channelConfigs[message.channel.id] = {
        ...current,
        registry: true,
      };
      saveGuildConfig(currentConfig);
      return `Now reporting registry events in this channel`;
    },
  },
  {
    regex: /^registry off/,
    onMatch: async (message, match, currentConfig) => {
      let current = currentConfig.channelConfigs[message.channel.id];
      if (!current) {
        current = {
          swapTitle: defaultSwapTitle,
          swapCriteria: false,
          registry: false,
        };
      }
      currentConfig.channelConfigs[message.channel.id] = {
        ...current,
        registry: false,
      };
      saveGuildConfig(currentConfig);
      return `No longer reporting registry events in this channel`;
    },
  },
];

export default commands;
