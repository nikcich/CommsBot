import { config as dotenvConfig } from 'dotenv';
import {
  Client, ActionRowBuilder,
  Events, GatewayIntentBits,
  VoiceChannel, ButtonBuilder, ButtonStyle
} from 'discord.js';

import select from './MenuSelection.js';

dotenvConfig();

const botToken = process.env.BOT_TOKEN;
const primaryGuild = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

function makeButton(id, label, style){
  const btn = new ButtonBuilder()
			.setCustomId(id)
			.setLabel(label)
			.setStyle(style);

  return btn;
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const guild = client.guilds.cache.get(primaryGuild);
  const requestingUser = interaction.user;
  const userInGuild = guild && guild.members.cache.has(requestingUser.id);

  if (interaction.commandName === 'setup') {
    // voiceChannels.forEach((c) => {
    //   console.log(c.name, c.id);
    // })
    if(userInGuild){
      
      const interactionGuild = interaction.guild;
      const voiceChannels = interactionGuild.channels.cache.filter(c => c instanceof VoiceChannel);
      let row = new ActionRowBuilder();

      const channelButtons = voiceChannels.map((c) => {
       return makeButton(c.id, c.name, ButtonStyle.Primary);
      });

      row.addComponents(channelButtons);

      const response = await interaction.reply( {
        content: "Welcome to ComsBot, select the \"Lobby\" Channel for your communications.",
        components: [row],
      });

      const collectorFilter = i => i.user.id === interaction.user.id;

      try{
        const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
        const lobbyId = confirmation.customId;

        const channelOptions = voiceChannels.filter(c => c.id != lobbyId).map((c) => {
          return {
            label: c.name,
            description: "Voice Channel: " + c.name,
            value: c.id
          }
        });

        if(channelOptions.length == 0){
          await interaction.editReply({ content: 'Not enough voice channels to set up bot.', components: [] });
          return;
        }

        const selectionMenu = select(channelOptions);
        const row = new ActionRowBuilder().addComponents(selectionMenu);

        const selectionResponse = await confirmation.update({ 
          content: `Select voice channels for the communications system to operate on:`,
          components: [row] 
        });

      }catch(e){
        console.log(e);
        await interaction.editReply({ content: 'There was an error processing request.', components: [] });
      }



    }else{
      await interaction.reply("You are not authorized to setup this bot.");
    }
  }
});

// Handle the modal submission
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  console.log(interaction);
});


// Log in to Discord with your client's token
client.login(botToken);

export { client };