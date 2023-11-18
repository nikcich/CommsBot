import { SlashCommandBuilder } from '@discordjs/builders';

const resetCommand = new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset communications bot configuration for your subscription.');

export default resetCommand;