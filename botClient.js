import { config as dotenvConfig } from 'dotenv';
import select from './MenuSelection.js';
import GenerateAPIKey from './GenerateAPIKey.js';
import {
  Client, ActionRowBuilder,
  Events, GatewayIntentBits, PermissionsBitField,
  VoiceChannel, ButtonBuilder, ButtonStyle
} from 'discord.js';

import {
  insertDataIntoMongo, fetchByUserId, fetchByServerId, deleteByApiKey, fetchByUserIdAndServerId
} from './DBInterface.js';

dotenvConfig();

const botToken = process.env.BOT_TOKEN;
const primaryGuild = process.env.GUILD_ID;
const MAX_SERVERS = process.env.MAX_SERVERS;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once(Events.ClientReady, async c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  const guilds = await client.guilds.fetch();

  guilds.forEach(guild => {
    console.log(`Guild ${guild.name}`);
  });


  await client.guilds.cache.forEach(async guild => {
    console.log(`Fetching members for  ${guild.name}`);
    try {
      await guild.members.fetch();
      await guild.channels.fetch();
      console.log(`Fetched members for guild: ${guild.name}`);
    } catch (error) {
      console.error(`Failed to fetch members for guild: ${guild.name}`);
    }
  });
});

async function handleSetupInteraction(interaction) {
  const guild = getClientGuild(primaryGuild);
  const requestingUser = interaction.user;
  const userInGuild = isUserInGuild(guild, requestingUser);

  if (!userInGuild) {
    await replyUnauthorized(interaction);
    return;
  }

  let data = await fetchByUserId(interaction.user.id);
  if (data.length >= MAX_SERVERS) {
    await interaction.reply("You have reached the maximum number of servers for your subscription.");
    return;
  }

  let serverConfigs = await fetchByServerId(interaction.guild.id);
  if (serverConfigs.length >= 1) {
    await interaction.reply("This server already has a configuration.");
    return;
  }

  const interactionGuild = interaction.guild;
  const voiceChannels = getVoiceChannels(interactionGuild);
  const channelButtons = createChannelButtons(voiceChannels);
  const row = new ActionRowBuilder().addComponents(channelButtons);

  const response = await replyWithChannelButtons(interaction, row);

  try {
    const confirmation = await waitForConfirmation(response, interaction.user.id);

    const lobbyId = confirmation.customId;
    const channelOptions = getChannelOptions(voiceChannels, lobbyId);

    if (channelOptions.length === 0) {
      await interaction.editReply({ content: 'Not enough voice channels to set up bot.', components: [] });
      return;
    }

    const selectionMenu = createSelectionMenu(channelOptions);
    const selectionRow = new ActionRowBuilder().addComponents(selectionMenu);

    const selectionResponse = await updateWithSelectionMenu(confirmation, 'Select voice channels for the communications system to operate on:', selectionRow);

    const selectionConfirmation = await waitForConfirmation(selectionResponse, interaction.user.id);
    const selectedChannels = selectionConfirmation.values;
    const selectedListStr = formatSelectedChannels(selectedChannels);
    const selectedMsg = `Selected: ${selectedListStr} to operate on.`;
    const lobbyMsg = `Communications lobby is set to: <#${lobbyId}>`;

    // Double check before inserting to DB
    let data = await fetchByUserId(interaction.user.id);
    if (data.length >= MAX_SERVERS) {
      await interaction.editReply({
        content: "You have reached the maximum number of servers for your subscription.",
        components: [],
      });
      return;
    }

    let serverConfigs = await fetchByServerId(interaction.guild.id);
    if (serverConfigs.length >= 1) {
      await interaction.editReply({
        content: "This server already has a configuration.",
        components: [],
      });
      return;
    }

    await insertDataIntoMongo({
      api_key: String(GenerateAPIKey()),
      user_id: String(interaction.user.id),
      server_id: String(interaction.guild.id),
      lobby_id: String(lobbyId),
      channels: [...channelOptions.map((c) => String(c.value)), String(lobbyId)]
    });

    await interaction.editReply({
      content: `${selectedMsg}\n\n${lobbyMsg}`,
      components: [],
    });

  } catch (e) {
    console.error(e);
    await interaction.editReply({ content: 'There was an error in the setup process.', components: [] });
  }
}

// Helper functions

function makeButton(id, label, style) {
  const btn = new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style);

  return btn;
}

function getClientGuild(primaryGuild) {
  return client.guilds.cache.get(primaryGuild);
}

function isUserInGuild(guild, user) {
  return guild && guild.members.cache.has(user.id);
}

function getVoiceChannels(guild) {
  return guild.channels.cache.filter((c) => c instanceof VoiceChannel);
}

function createChannelButtons(channels) {
  return channels.map((c) => makeButton(c.id, c.name, ButtonStyle.Primary));
}

function replyUnauthorized(interaction) {
  return interaction.reply("You are not authorized to set up this bot.");
}

function replyWithChannelButtons(interaction, row) {
  return interaction.reply({
    content: "Welcome to ComsBot, select the \"Lobby\" Channel for your communications.",
    components: [row],
  });
}

function waitForConfirmation(response, userId) {
  const collectorFilter = (i) => i.user.id === userId;
  return response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
}

function getChannelOptions(channels, lobbyId) {
  return channels
    .filter((c) => c.id !== lobbyId)
    .map((c) => ({
      label: c.name,
      description: `Voice Channel: ${c.name}`,
      value: c.id,
    }));
}

function createSelectionMenu(channelOptions) {
  return select(channelOptions);
}

function updateWithSelectionMenu(response, content, row) {
  return response.update({
    content,
    components: [row],
  });
}

function formatSelectedChannels(selectedChannels) {
  return selectedChannels.map((c) => `<#${c}>`).join(", ");
}

async function handleSettingsInteraction(interaction) {
  const guild = getClientGuild(primaryGuild);
  const requestingUser = interaction.user;
  const userInGuild = isUserInGuild(guild, requestingUser);

  if (!userInGuild) {
    await replyUnauthorized(interaction);
    return;
  }

  let data = await fetchByUserId(interaction.user.id);
  data = data.filter((d) => d.server_id == interaction.guild.id)

  if (data.length == 0) {
    await interaction.reply("This server is not configured.");
    return;
  } else if (data.length > 1) {

    let configurations = data.map((d, i) => {
      let operatingChannels = d.channels.map((c) => `\t\t <#${c}>`)
      let configMessage =
        `Config ${i + 1}: 
        \`\`\`Server: ${d.server_id}
Lobby: <#${d.lobby_id}>
Bot Config Owner: <@${d.user_id}>
Operating Channels: 
${operatingChannels.join('\n')}\`\`\`
`;
      return configMessage;
    });

    const configButtons = data.map((d, i) => makeButton(d.api_key, `Config ${i + 1}`, ButtonStyle.Danger));
    const row = new ActionRowBuilder().addComponents(configButtons);

    const response = await interaction.reply({
      content: "This server has multiple configuration settings. This should not be possible. Choose which set to keep \n\nHere are your configurations: \n\n " + configurations.join('\n\n') + "\n\n Select which one to remove:",
      components: [row],
    });

    try {
      const confirmation = await waitForConfirmation(response, interaction.user.id);
      await deleteByApiKey(confirmation.customId);
      await interaction.editReply({ content: `Removed configuration.`, components: [] });
    } catch (e) {
      await interaction.editReply({ content: "Error in command processing...", components: [] });
    }

  } else {
    let d = data[0];

    let operatingChannels = d.channels.map((c) => `\t <#${c}>`)

    await interaction.reply(
      `Server: ${d.server_id}
Lobby: <#${d.lobby_id}>
Bot Config Owner: <@${d.user_id}>
Operating Channels: 
${operatingChannels.join('\n')}
`);
  }
}

async function handleAPIKeyInteraction(interaction) {
  const guild = getClientGuild(primaryGuild);
  const requestingUser = interaction.user;
  const userInGuild = isUserInGuild(guild, requestingUser);

  if (!userInGuild) {
    await replyUnauthorized(interaction);
    return;
  }

  let data = await fetchByUserId(interaction.user.id);
  data = data.filter((d) => d.server_id == interaction.guild.id)

  if (data.length == 0) {
    await interaction.reply("This server is not configured, and as such has no API Key.");
    return;
  } else if (data.length > 1) {
    await interaction.reply("This server has multiple configuration settings. This should not be possible. Use the /settings command to fix this.");
  } else {
    let d = data[0];
    await interaction.reply("Sending API Key in DM's for privacy.");
    await interaction.user.send(`Click to reveal API Key: ||\`${d.api_key}\`||`);
  }
}

async function handleResetInteraction(interaction) {
  let userConfigurationsInServer = await fetchByUserIdAndServerId(interaction.user.id, interaction.guild.id);

  userConfigurationsInServer.forEach(async (c) => {
    await deleteByApiKey(c.api_key)
  });

  await interaction.reply("Resetting server configuration...\nRun /setup to re-configure.");
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.guild === null) {
    await interaction.reply("Unable to process command outside of a discord server.");
    return;
  }

  try {
    await interaction.guild.members.fetch();
    await interaction.guild.channels.fetch();
  } catch (error) { }

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    await interaction.reply("You must be an administrator to use this bot.");
    return;
  }

  if (interaction.commandName === 'setup') {
    await handleSetupInteraction(interaction);
  } else if (interaction.commandName === 'settings') {
    await handleSettingsInteraction(interaction);
  } else if (interaction.commandName === 'getapikey') {
    await handleAPIKeyInteraction(interaction);
  } else if (interaction.commandName === 'reset') {
    await handleResetInteraction(interaction);
  }
});

// Log in to Discord with your client's token
client.login(botToken);

export { client };