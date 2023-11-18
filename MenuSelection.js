import {
    ActionRowBuilder, StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, SlashCommandBuilder
} from 'discord.js';

function buildSelectMenu(options) {
    let optionsList = options.map((option) => {
        return new StringSelectMenuOptionBuilder()
            .setLabel(option.label)
            .setDescription(option.description)
            .setValue(option.value)
    });

    return new StringSelectMenuBuilder()
        .setMinValues(1)
        .setMaxValues(options.length > 10 ? 10 : options.length)
        .setCustomId('starter')
        .setPlaceholder('Make a selection!')
        .addOptions(optionsList);
}

export default buildSelectMenu;