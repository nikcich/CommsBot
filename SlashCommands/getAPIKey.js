import { SlashCommandBuilder } from '@discordjs/builders';


const getAPIKey = new SlashCommandBuilder()
    .setName('getapikey')
    .setDescription('Gets your API Key for subscription.');

export default getAPIKey;