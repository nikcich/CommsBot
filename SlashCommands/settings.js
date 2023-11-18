import { SlashCommandBuilder } from '@discordjs/builders';

const settingCommand = new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Get list of configuration settings.');

export default settingCommand;