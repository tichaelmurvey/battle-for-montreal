const Discord = require('discord.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
		.setName('game_status')
		.setDescription('Check the status of the current game'),
	async execute(interaction) {
		console.log('checking game status')
		//get the channel
		const channel = interaction.channel;
		//get the game
		const game = interaction.guild.game;
		//respond to the interaction
		if (game) {
			await interaction.reply(
				`The current game has ${game.teams.length} teams. \n
				The admin is ${game.admin.username}`
			);
		} else {
			await interaction.reply(
				'There is no game in progress.'
			);
		}
	},
}