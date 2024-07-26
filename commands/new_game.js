const Discord = require('discord.js');
const {ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('new_game')
		.addNumberOption(option =>
			option.setName('num_teams')
				.setDescription('Number of teams in the game')
				.setRequired(true)
			)
		.setDescription('Create a new game in this channel'),
	async execute(interaction) {
		console.log('Creating new game')
		// Create a new game
		//get the channel
		const channel = interaction.channel;
		//get the admin
		const admin = interaction.user;
		//get the server
		const guild = interaction.guild;
		//archive channels which end with -team
		const channels = await guild.channels.fetch();
		for (let channel of channels) {
			if (channel[1].name.endsWith('-team')) {
				channel[1].delete().catch(console.error);
			}
		}
		//remove all pinned messages
		channel.messages.fetchPinned().then(messages => {
			messages.forEach(message => message.unpin());
		});
		//create a new game
		const game = new Game(channel, guild, admin);
		//add the game to the guild
		guild.game = game;
		//get the number of teams
		const num_teams = interaction.options.getNumber('num_teams');
		//delete existing team roles
		const roles = await guild.roles.cache.filter(role => role.name.endsWith('team'));
		roles.forEach(async role => await role.delete().catch(console.error));
		//create the teams
		for (let i = 0; i < num_teams; i++) {
			const team = await utilities.add_team(game).then(team => {
			game.teams.push(team);

			console.log('Team added', team.name);
			});
		}
		//create start game button
		const start_button = new ButtonBuilder()
			.setCustomId('start_game')
			.setLabel('Start Game')
			.setStyle(ButtonStyle.Danger)
		const game_buttons = new ActionRowBuilder()
			.addComponents(start_button);
			//send list of teams
		const game_message = await interaction.channel.send({
			content:
			`# Hide and Seek
*Admin*: ${game.admin}
*Teams*: ${game.teams.map(team => team.name).join(', ')}`,
			components: [game_buttons]
		});
		//add a collector to the message
		const collector = game_message.createMessageComponentCollector({ componentType: ComponentType.Button});
		utilities.update_map(game)
		collector.on('collect', async i => {
			if (i.user.id === game.admin.id) {
				//start the game
				console.log("starting game")
				utilities.start_game(game);
			}
		});
		//pin the message to the channel
		game_message.pin();
		//add a collector to the message
		game.teams.forEach(team => {
			utilities.instructions_message(team);
		});
		utilities.save_game(game);
	}
}

//game class
class Game {
	constructor(channel, guild, admin) {
		this.channel = channel;
		this.guild = guild;
		this.admin = admin;
		this.teams = [];
		this.battle_deck = utilities.create_battle_deck();
	}
}