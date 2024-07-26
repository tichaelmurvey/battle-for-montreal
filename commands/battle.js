const Discord = require('discord.js');
const {ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('battle')
		.setDescription('Start a battle'),
	async execute(interaction) {
		console.log('Starting a battle');
		const guild = interaction.guild;
		const game = guild.game;
		if (!game) {
			await interaction.reply({ content: 'There is no game in this channel. Please start a new game first.', ephemeral: true });
			return;
		}
		//create a new battle
		const battle = utilities.create_battle_message(game);
		//send battle message
		const battle_message_send = await interaction.channel.send(battle);
		battle_message_send.startThread({
			name: 'battle-thread',
			autoArchiveDuration: Discord.ThreadAutoArchiveDuration.OneDay,
			reason: 'Battle thread'
		})
	}
}

