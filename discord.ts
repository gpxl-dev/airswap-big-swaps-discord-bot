import Discord, { MessageEmbed } from "discord.js";

const client = new Discord.Client();
client.login(process.env.DISCORD_BOT_TOKEN);

let sendChannel: Discord.TextChannel | null = null;

client.on("ready", () => {
  console.log("discord login");
  const channel = client.channels.cache.find(
    (channel) => channel.id === process.env.DISCORD_CHANNEL_ID
  );
  if (channel && channel.isText()) {
    console.log("discord channel ready");
    sendChannel = channel as Discord.TextChannel;
  }
});

const sendMessage = (message: string) => {
  if (!sendChannel) return;
  sendChannel.send(message);
};

const sendSwapEmbed: (details: {
  timestamp: number;
  senderTokens: string;
  signerTokens: string;
  usdValue: string;
  airswapFee: string;
  makerAddress: string;
}) => void = ({
  timestamp,
  senderTokens,
  signerTokens,
  usdValue,
  airswapFee,
  makerAddress,
}) => {
  if (!sendChannel) return;
  const embed = new MessageEmbed()
    .setDescription("🚀🚨 Big Swap Alert! 🚨🚀")
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
    ])
    .addFields([
      {
        name: "Maker address",
        value: makerAddress,
        inline: false,
      },
    ]);
  sendChannel.send(embed);
};

// TODO: ! command to add current channel to broadcast list (server owner only)

export { sendMessage, sendSwapEmbed };
