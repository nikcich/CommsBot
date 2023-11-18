import { SlashCommandBuilder } from '@discordjs/builders';


const setupCommand = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Sets up server for bot use');

export default setupCommand;