const Discord = require('discord.js');
const {ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unclaim')
		.setDescription('unclaim a neighbourhood')
		.addStringOption(option =>
		option.setName('query')
			.setDescription('The neighbourhood you are in')
			.setRequired(true)
			.setAutocomplete(true)),
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();
		const choices = ['The Triangle', 'Mt Royal', 'Park Ex', 'Villeray', 'St Michel', 'Francois-Perrault', 'Little Maghreb', 'Cote des Neiges', 'Outremont', 'Mile Ex', 'Little Italy', 'La Petite Patrie', 'Parc Molson', 'Nouveau Rosemont', 'Mile End', 'Laurier Est', 'De Lorimer', 'Vieux Rosemont', 'Angus', 'Olympic Park and Garden', 'Victoria Village', 'Westmount', 'Mont Royal', 'McGill', 'McGill Ghetto', 'The Plateau', 'Shaughnessy Village', 'Downtown', 'Quartier des Spectacles', 'Chinatown', 'The Village', 'Old Port', 'Griffintown', 'Cite Multimedia', 'Sainte Marie', 'Hochelaga', 'Maisonneuve', 'Little Burgundy', 'Saint Henri', 'Verdun', 'Nuns Island', 'Point St Charles', 'Cite du Havre', 'Jean Drapeau', 'Ile Notre Dame', 'Old Longueuil'];
		const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedValue.toLowerCase()));
		let options;
		if (filtered.length > 25) {
			options = filtered.slice(0, 25);
		} else {
			options = filtered;
		}
		await interaction.respond(
			options.map(choice => ({ name: choice, value: choice })),
		);
	},
	async execute(interaction) {
		console.log("unclaiming a neighbourhood");
		const guild = interaction.guild;
		//send confirmation message
		await interaction.reply({ content: `You have unclaimed ${interaction.options.getString('query')}`, ephemeral: true });
		//get team from channel name
		//const team = interaction.channel.team;
		const neighbourhood = interaction.options.getString('query');
		//transform neighbourhood name to lowercase with hypens
		const neighbourhood_role = neighbourhood.toLowerCase().replaceAll(' ', '-');
		//team.zones.push(neighbourhood_role);
		//remove zone from other teams
		for (let team of guild.game.teams) {
			team.zones = team.zones.filter(zone => zone !== neighbourhood_role);
		}
		//update message
		//utilities.instructions_message(team);
		utilities.update_map(guild.game);
	},
};
