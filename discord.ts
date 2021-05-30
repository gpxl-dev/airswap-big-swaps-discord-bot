import {
  MessageEmbed,
  Client,
  TextChannel,
  GuildMemberManager,
} from "discord.js";
import makeDir from "make-dir";
import { SwapDetails } from ".";
import commands from "./commands";
import { matchesCriteria } from "./criteraChecks";
import { truncateEthAddress } from "./formatting";
import {
  defaultGuildConfig,
  getGuildConfig,
  GuildConfig,
  loadAllConfigs,
} from "./guildConfig";

const client = new Client();

let configs: {
  [guildId: string]: GuildConfig;
};
export const init = async () => {
  const configReady = loadAllConfigs().then((loadedConfigs) => {
    configs = loadedConfigs;
  });
  const discordReady = client.login(process.env.DISCORD_BOT_TOKEN);
  return Promise.all([discordReady, configReady]);
};

client.on("ready", async () => {
  const dir = await makeDir(process.env.CONFIG_DIR || "config");
  console.log(`Configs dir: ${dir}`);
  console.log("discord login");
});

client.on("message", async (message) => {
  if (
    !message.cleanContent.startsWith(process.env.COMMAND_PREFIX!) ||
    !message.guild
  )
    return;
  const guildMemberManager = new GuildMemberManager(message.guild);
  const guildMember = await guildMemberManager.fetch(message.author.id);
  const hasPermission = guildMember?.hasPermission("ADMINISTRATOR");
  if (!hasPermission) {
    console.log(
      `${message.author.username} attempted to use an admin command but isn't an admin`
    );
    return;
  }
  const trimmedMessage = message.cleanContent
    .split(`${process.env.COMMAND_PREFIX} `)[1]
    .trim();

  let commandMatched = false;
  const commandPromises = commands.map(async (command) => {
    const guildId = message.guild?.id;
    if (!guildId) {
      console.log(`Received message with no guild id, ignoring`);
      return;
    }
    const match = trimmedMessage.match(command.regex);
    const guildConfig = await getGuildConfig(guildId, message.guild!.name);
    if (match) {
      commandMatched = true;
      try {
        const response = await command.onMatch(message, match, guildConfig);
        message.react("👌");
        if (response?.length) {
          message.reply(response);
        }
      } catch (e) {
        message.react("⚠️");
        console.log("command failed: " + e.message);
      }
    }
  });
  await Promise.all(commandPromises);
  if (!commandMatched) {
    message.react("🤷‍♀️");
  }
});

export const sendIfMeetsCriteria = (details: SwapDetails) => {
  Object.values(configs).forEach((config) => {
    Object.keys(config.channelConfigs).forEach(async (channelId) => {
      const channelConfig = config.channelConfigs[channelId];
      if (matchesCriteria(details, channelConfig.swapCriteria)) {
        const configChannel = await client.channels.fetch(channelId);
        if (configChannel && configChannel.isText()) {
          sendSwapEmbed(
            channelConfig.swapTitle,
            details,
            configChannel as TextChannel
          );
        }
      }
    });
  });
};

const sendMessage = (message: string, channel: TextChannel) => {
  if (!channel) return;
  channel.send(message);
};

const sendSwapEmbed: (
  title: string,
  details: SwapDetails,
  channel: TextChannel
) => void = (
  title,
  {
    timestamp,
    senderTokens,
    signerTokens,
    usdValue,
    airswapFee,
    makerAddress,
    txHash,
  },
  channel
) => {
  const embed = new MessageEmbed()
    .setDescription(title)
    .setColor(2847231)
    .setTimestamp(timestamp)
    .addFields([
      {
        name: "Sender tokens",
        value: senderTokens,
        inline: true,
      },
      {
        name: "Signer tokens",
        value: signerTokens,
        inline: true,
      },
    ])
    .addFields([
      {
        name: "USD Value",
        value: usdValue,
        inline: true,
      },
      {
        name: "AirSwap fee",
        value: airswapFee,
        inline: true,
      },
      {
        name: "Maker address",
        value: `[${truncateEthAddress(
          makerAddress
        )}](https://etherscan.io/address/${makerAddress})`,
        inline: true,
      },
      {
        name: "Transaction",
        value: `[View on Etherscan](https://etherscan.io/tx/${txHash})`,
        inline: true,
      },
    ]);
  channel.send(embed);
};

// TODO: ! command to add current channel to broadcast list (server owner only)

export { sendMessage, sendSwapEmbed };
