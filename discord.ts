import { MessageEmbed, Client, TextChannel } from "discord.js";
import { truncateEthAddress } from "./formatting";

const client = new Client();
client.login(process.env.DISCORD_BOT_TOKEN);

let sendChannel: TextChannel | null = null;

client.on("ready", () => {
  console.log("discord login");
  const channel = client.channels.cache.find(
    (channel) => channel.id === process.env.DISCORD_CHANNEL_ID
  );
  if (channel && channel.isText()) {
    console.log("discord channel ready");
    sendChannel = channel as TextChannel;
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
  txHash: string;
}) => void = ({
  timestamp,
  senderTokens,
  signerTokens,
  usdValue,
  airswapFee,
  makerAddress,
  txHash,
}) => {
  if (!sendChannel) return;
  const embed = new MessageEmbed()
    .setDescription("🚨🐳 Big Swap Alert! 🐳🚨")
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
  sendChannel.send(embed);
};

// TODO: ! command to add current channel to broadcast list (server owner only)

export { sendMessage, sendSwapEmbed };
