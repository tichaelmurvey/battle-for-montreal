const Discord = require('discord.js');
const {ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ComponentType } = require('discord.js');
const utilities = require('../utilities.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('buy')
		.setDescription('Buy a powerup')
		.addStringOption(option =>
			option.setName('query')
				.setDescription('The powerup you want to buy')
				.setRequired(true)
				.setAutocomplete(true)),
			async autocomplete(interaction) {
				const focusedValue = interaction.options.getFocused();
				const choices = ['Car trip', 'Cycling', 'Green line', 'Orange line', 'Yellow line', 'Blue line', 'Bus travel', 'Snapshot', 'Curse', 'Tracker', 'Redraw hand', 'Resteal'];
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
				console.log("Buying a powerup");
				//get team from channel name
				const team = interaction.channel.team;
				if(!team){
					await interaction.reply({ content: `Use this in your team channel.`, ephemeral: true });
					return;
				}
				const powerup_formatted = interaction.options.getString('query')
				const powerup = powerup_formatted.toLowerCase().replaceAll(' ', '-');
				
				//check if they can afford it
				const price = powerup_cost[powerup]
				if (price > team.bagels){
					await interaction.reply({ content: `You don't have enough bagels.`, ephemeral: true });
					return;
				}

				//subtract price
				team.bagels -= price;

				//add powerup to team
				switch(powerup) {
					case "redraw-hand":
						//redraw hand
						team.challenge_hand.forEach(card => delete_message(card.message));
						team.challenge_hand = [];
						update_challenge_hand(team);
						break;
					case "curse":
						utilities.add_curse(team, 1);
						break;
					case "resteal", "car-trip":
						break;
					default:
						team.transit.push(powerup_formatted);
				}
				utilities.instructions_message(team);

				//send confirmation message
				await interaction.reply({ content: `You have purchased ${powerup_formatted}`, ephemeral: true });

			},
		};
		
const powerup_cost = {
	'car-trip': 2,
	'cycling': 2,
	'green-line' : 1,
	'blue-line' : 1,
	'orange-line' : 1,
	'yellow-line' : 1,
	'bus-travel' : 1,
	"snapshot" : 1,
	"curse" : 1,
	"tracker" : 2,
	"redraw-hand" : 1,
	"resteal" : 3
}