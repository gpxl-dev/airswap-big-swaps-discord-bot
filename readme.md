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
COMMAND_PREFIX=
LOG_ALL_SWAPS=
```

- `INFURA_PROJECT_ID` if you want to use your own API key for Infura. (I'm not sure if ethers will sometimes use other providers)
- `DISCORD_BOT_TOKEN` bot token for discord
- `COMMAND_PREFIX` prefix for bot commands (see below)
- `LOG_ALL_SWAPS` - set to `true` if you want all swaps to be logged to your terminal/console (this **doesn't** send everything to discord)

### Adding the bot to your server

You need to generate an oAuth url with the `bot` scope and `Send Messages` text permission. You can then follow the link to add the bot to your server.

### Running the bot server

The server is written in typescript, the easiest way to run it at the moment is to execute `npx ts-node --files index.ts`.

### Commands

This bot has several commands, in the format `[prefix] [command]`. Prefix is set by the environment variable `COMMAND_PREFIX` and should be something that wouldn't get typed in a normal conversation.

Currently commands can only be executed by people with `ADMINISTRATOR` server permissions.

The bot will respond to some commands with text, but in all cases will respond with one of the following reactions:

- 👌 - command succeeded
- ⚠️ - command failed
- 🤷‍♀️ - unknown command

> **_NOTE_: Commands change the config for the channel in which the command was issued only.**

#### Available commands

- `test` - checks if bot is listening to commands
- `all` - report all swaps
- `>x` - report all swaps with a value higher than `x` (x should be a number)
- `<x` - report all swaps with a value less than `x`
- `x - y` - report all swaps with a value between `x` and `y`
- `stop` / `disable` / `off` - stop reporting swaps
- `registry on` - report registry events
- `registry off` - stop registry events
