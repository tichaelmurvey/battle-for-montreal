const fs = require('fs');
const Discord = require('discord.js');
const {ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('load_game')
		.setDescription('Load a game in this channel'),
	async execute(interaction) {
		console.log('Creating new game')
		//check if save file exists, if so load it
		if (fs.existsSync('game.json')) {
			utilities.load_game(interaction);
			interaction.reply("loading game");
		} else {
			interaction.reply("no game to load");
		}
	}
}
