// Ran once just to register the slash commands...

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import setupCommand from './SlashCommands/setup.js';
import getAPIKey from './SlashCommands/getAPIKey.js';
import settingCommand from './SlashCommands/settings.js';
import resetCommand from './SlashCommands/reset.js';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const commands = [setupCommand.toJSON(), getAPIKey.toJSON(), resetCommand.toJSON(), settingCommand.toJSON()];
const rest = new REST({ version: '9' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
