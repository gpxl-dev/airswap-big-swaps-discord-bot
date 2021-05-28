### Airswap Big Swaps discord bot

This is a basic nodejs discord bot that listents to `Swap` events from the AirSwap RFQ light contract on the ethereum blockchain. When a swap occurs, we fetch the current USD price of the two tokens involved from CoinGecko, and send a description of the swap to Discord if the value exceeds a threshold.

Note that a swap has two USD values that may be different, so we use the average of the two.

### Installation

Clone the repo and run `npm i`. You'll need node & npm installed.

### Environment set up

The bot needs a few environment variables to run:

Create a `.env` file in the root directory with the following variables (fill them in!) or use whatever mechanism your server uses to populate them.

```env
INFURA_PROJECT_ID=
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=
USD_SWAP_THRESHOLD=
LOG_ALL_SWAPS=
```

- `INFURA_PROJECT_ID` if you want to use your own API key for Infura. (I'm not sure if ethers will sometimes use other providers)
- `DISCORD_BOT_TOKEN` bot token for discord
- `DISCORD_CHANNEL_ID` the id of the channel to send the swap alerts to. You can get this by enabling developer mode in Discord's "advanced" user settings, then right clicking the desired channel and clicking "Copy Id".
- `USD_SWAP_THRESHOLD` (default 500000) - only swaps above this threshold are sent to Discord
- `LOG_ALL_SWAPS` - set to `true` if you want all swaps to be logged to your terminal/console (this **doesn't** send everything to discord)

### Adding the bot to your server

You need to generate an oAuth url with the `bot` scope and `Send Messages` text permission. You can then follow the link to add the bot to your server.

### Running the bot server

The server is written in typescript, the easiest way to run it at the moment is to execute `npx ts-node index.ts`.
