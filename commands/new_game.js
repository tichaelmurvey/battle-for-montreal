const Discord = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');

module.exports = {
	data: new Discord.SlashCommandBuilder()
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
				channel[1].delete();
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
		roles.forEach(role => role.delete());
		//create the teams
		for (let i = 0; i < num_teams; i++) {
			const team = await utilities.add_team(game).then(team => {
			game.teams.push(team);
			console.log('Team added', team.name);
			});
		}
		//send list of teams
		const new_round_button = new ButtonBuilder()
			.setCustomId('new_round')
			.setLabel('Start round 1')
			.setStyle(ButtonStyle.Danger);
		const game_buttons = new ActionRowBuilder()
			.addComponents(new_round_button);
		const game_message = await interaction.channel.send({
			content:
			`
# Hide and Seek
*Admin*: ${game.admin}
*Teams*: ${game.teams.map(team => team.name).join(', ')}
			`,
			components: [game_buttons]
		});
		//pin the message to the channel
		game_message.pin();
		//add a collector to the message
		const collector = game_message.createMessageComponentCollector({ componentType: ComponentType.Button});
		collector.on('collect', async i => {
			//check if button was pressed by the admin
			console.log(i.customId, i.user.id, game.admin.id)
			if (i.customId === 'new_round' && i.user.id === game.admin.id) {
				console.log('Starting new round');
				//check if there is a seeker team
				if (game.teams.filter(team => team.role === 'seeking').length === 0){
					//send a message to create a seeker team
					i.reply({
						content: `There must be at least one seeking team to start the game.`,
						ephemeral: true
					});
					return;
				}
				await utilities.start_round(game);
				//respond with message
				i.update({
					content: `## Round ${game.round} started. 🏃`,
					components: [
						new ActionRowBuilder()
						.addComponents(
						new ButtonBuilder()
							.setCustomId('end_round')
							.setLabel(`End round ${game.round}`)
							.setStyle(ButtonStyle.Danger)
						)

					]
				});
			} else if (i.customId === "end_round" && i.user.id === game.admin.id) {
				console.log('Ending round');
				await utilities.end_round(game);
				//respond with message
				i.update({
					content: `## Round ${game.round} ended.`,
					components: [
						new ActionRowBuilder()
						.addComponents(
						new ButtonBuilder()
							.setCustomId('new_round')
							.setLabel(`Start round ${game.round + 1}`)
							.setStyle(ButtonStyle.Danger)
						)

					]
				});
			}
		});
		//send instructions to each team
		game.teams.forEach(team => {
			instructions_message(team);
		});
		//delete existing questions channels
		const questions_channels = await guild.channels.cache.filter(channel => channel.name === 'questions');
		questions_channels.forEach(channel => channel.delete());
		//Create a questions channel
		const questions_channel = await game.guild.channels.create({
			name: "questions",
			type: Discord.ChannelType.GuildText,
			parent: game.channel.parent
		});
		game.questions_channel = questions_channel;
		//delete existing channels starting with answer
		const answer_channels = await guild.channels.cache.filter(channel => channel.name.startsWith('answer'));
		//Create a game info channel
		//delete existing info channels
		const info_channels = await guild.channels.cache.filter(channel => channel.name === 'game-info');
		info_channels.forEach(channel => channel.delete());
		//Create a game info channel
		const info_channel = await game.guild.channels.create({
			name: "game-info",
			type: Discord.ChannelType.GuildText,
			parent: game.channel.parent
		});
		game.info_channel = info_channel;
		//Send the game info
		const game_info = await game.info_channel.send({
			content: `# Game Info
*Admin*: ${game.admin}
*Rules*: https://docs.google.com/document/d/1iAQnw_6TBRxGqC8euyN8t1qAXoGB7lqllvptvTH3oc4/edit
`
		});
	}
}

async function instructions_message(team){
		const role_button = new ButtonBuilder()
			.setCustomId('change_role')
			.setLabel(`Switch to ${team.role === 'seeking' ? 'hiding' : 'seeking'}`)
			.setStyle(ButtonStyle.Danger);
		const role_buttons = new ActionRowBuilder()
			.addComponents(role_button);
		var content = `# Welcome, ${team.name}! 👋\n You are currently **${team.role}**.`			

		//check if team message already exists
		if (!team.message){
			const team_message = await team.channel.send({
				content: content,
				components: [role_buttons]
				})
			team.message = team_message;
			team.message.pin()
			const collector = team.message.createMessageComponentCollector({ componentType: ComponentType.Button});
			collector.on('collect', async i => {
				if (i.customId === 'change_role') {
					team.role = team.role === 'seeking' ? 'hiding' : 'seeking';
					//if round is active, update the hand
					if (team.game.round_active) {
						team.role === 'seeking' ? utilities.update_seeker_hand(team) : utilities.update_hider_hand(team);
					}
					//respond with message
					await i.update({
						content: `Updating...`,
					});
					//update the message
					instructions_message(team);
				}
			});	
		} else {
			team.message.edit({
				content: content,
				components: [role_buttons]
			});
		}
	}

//game class
class Game {
	constructor(channel, guild, admin) {
		this.channel = channel;
		this.guild = guild;
		this.admin = admin;
		this.teams = [];
		this.round = 0;
		this.round_active = false;
	}
}

