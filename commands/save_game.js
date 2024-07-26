const fs = require('fs');
const Discord = require('discord.js');
const {ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('save_game')
		.setDescription('Save a game in this channel'),
	async execute(interaction) {
		console.log('Saving game')
		if (!interaction.guild.game) {
			interaction.reply("no game to save");
			return;
		}
		utilities.save_game(interaction.guild.game);
		interaction.reply({content: "game saved", ephemeral: true});
	}
}
