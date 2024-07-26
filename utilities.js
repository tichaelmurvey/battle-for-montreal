const fs = require('fs');
const challenge_cards = JSON.parse(fs.readFileSync('./challenge_cards.json'));
const battle_cards = JSON.parse(fs.readFileSync('./battle_cards.json'));
const curse_cards = JSON.parse(fs.readFileSync('./curse_cards.json'));
const Discord = require('discord.js');
const nodeHtmlToImage = require('node-html-to-image');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ThreadAutoArchiveDuration, PermissionsBitField, Colors  } = require('discord.js');

var team_names = ['Orange','Purple', 'Green', 'Aqua'];
const colour_codes = {
	'orange': '#FFB99C',
	'purple': '#EB9CFF',
	'green': '#B1FF9C',
	'aqua': '#97FDFF'
}
const initial_file = fs.readFileSync('./map.html', 'utf8');

//team class
class Team {
	constructor(channel) {
		this.name = channel.name;
		this.colour = colour_codes[channel.name.split('-')[0]];
		this.channel = channel;
		this.challenge_deck = create_challenge_deck();
		this.challenge_hand = [];
		this.curse_deck = create_curse_deck();
		this.bagels = 1;
		this.curses = [];
		this.zones = [];
		this.game = null;
		this.instructions_message = null;
		this.transit = [];
	}
}

class SaveData {
	constructor(game){
		this.teams = structuredClone(game.teams);
		this.battle_deck = structuredClone(game.battle_deck);
	}
	clean_data(){
		this.teams.forEach(team => {
			team.channel = null;
			team.game = null;
			team.instructions_message = null;
			//clean messages from hand
			team.challenge_hand.forEach(card => card.message = null);
		});
	}
}


async function save_game(game){
	//pull out necessary information
	var save_data = new SaveData(game);
	//remove channel from save data
	save_data.clean_data();
	console.log('saving game', save_data);
	//save game to file
	fs.writeFileSync('./game.json', JSON.stringify(save_data, function(key, value) {
		console.log(key, value);
		return value;
	}
	));
}

function load_game(interaction){
	//load game from file
	console.log('loading game');
	game_data = JSON.parse(fs.readFileSync('./game.json'));
	//recreate game
}

function create_challenge_deck(){
	challenge_deck = structuredClone(challenge_cards);
	shuffle(challenge_deck);
	return challenge_deck;
}

function create_curse_deck(){
	curse_deck = structuredClone(curse_cards);
	shuffle(curse_deck);
	return curse_deck;
}

function create_battle_deck(){
	battle_deck = structuredClone(battle_cards);
	//console.log('Hider deck created', hider_deck.length);
	shuffle(battle_deck);
	//console.log('Hider deck shuffled', hider_deck.length);
	return battle_deck;
}

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

async function add_team(game){
	//choose name
	shuffle(team_names);
	if (team_names.length === 0){
		team_names = ['Orange','Purple', 'Green', 'Aqua'];
	}
	const team_color = team_names.pop();
	const team_name = team_color+ ' team';
	//create specific role for team
	console.log('Creating role', team_color.toUpperCase());
	const role = await game.guild.roles.create({
		name: team_name,
		color: Colors[team_color],
		mentionable: true
	});
	//create channel for team
	const channel = await game.guild.channels.create({
		name: team_name,
		type: Discord.ChannelType.GuildText,
		parent: game.channel.parent,
		//give permissions to team
		permissionOverwrites: [
			{
				id: role.id,
				allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
			},
			{
				id: game.guild.id,
				deny: [PermissionsBitField.Flags.ViewChannel]
			}
		]
	});
	//create team
	const team = new Team(channel);
	console.log('Team created', team.name, team.colour);
	//add game to team
	team.game = game;
	//add team to channel
	channel.team = team;
	return team;
}


async function instructions_message(team){
	var content = `# Welcome, ${team.name}! 👋 \n You control **${team.zones.length} neighbourhoods** \n You have **${team.bagels} bagels**.
## Your transit options:
${
	team.transit.join('\n')
}

## Curses
Press the button to spend a curse.
`		
	//check if team message already exists
	if (!team.instructions_message){
		const team_message = await team.channel.send({
			content: content,
			components: []
			})
			const collector = team_message.createMessageComponentCollector({ componentType: ComponentType.Button});
			collector.on('collect', async i => {
				team.curses.splice(Number(i.customId), 1);
				//send positive interaction response
				instructions_message(team);
				i.reply({ content: `Curse used. Let them know in the game channel!`, ephemeral: true });
				instructions_message(team)
			});
	
		team.instructions_message = team_message;
		team.instructions_message.pin();
	} else {
	//update curses message
	const curses = team.curses;
	//if curses exist, add each curses as a button
	var buttons = [];
	if (curses.length > 0){
		if (curses.length <= 5){
			var i = 0;
			for (const curse of curses){
				var action_row = new ActionRowBuilder();
				////console.log("adding curses", curses)
				const button = new ButtonBuilder()
					.setCustomId(String(i))
					.setLabel(`${curse.name}`)
					.setStyle(ButtonStyle.Danger);
				action_row.addComponents(button);
				buttons.push(action_row);
				i++
			}
		} else {
			//create multiple action rows with 5 buttons each
			for (let i = 0; i < curses.length; i += 5){
				var action_row = new ActionRowBuilder();
				for (let j = 0; j < 5; j++){
					if (i + j < curses.length){
						const curse = curses[i + j];
					//	//console.log("adding curses", curses)
						const button = new ButtonBuilder()
						.setCustomId(String(i))
						.setLabel(`${curse.name}`)
						.setStyle(ButtonStyle.Danger);
						action_row.addComponents(button);
					}
				}
				buttons.push(action_row);
				}
			}
		}
		team.instructions_message.edit({
			content: content,
			components: buttons
		});
	}
}

//update hand of seeker cards for a team
async function update_challenge_hand(team){
	console.log("updating challenge hand")
	//get current hand
	var hand = team.challenge_hand;
	//check if hand is less than 5
	while (hand.length < 5){
		//draw a card
		if (team.challenge_deck.length === 0){
			//console.log('No more cards in deck');
			await team.channel.send('No more cards in deck');
			break;
		}
		const challenge = team.challenge_deck.pop();
		//add card to hand
		console.log(" drew a challenge", challenge.name);
		const message = render_challenge_card(challenge);
		const challenge_card = await team.channel.send(message);
		const collector = challenge_card.createMessageComponentCollector({ componentType: ComponentType.Button});	
		collector.on('collect', async i => {
			//find challenge card
			delete_message(challenge_card);
			//update hand
			console.log("got challenge", challenge.name)
			team.challenge_hand = hand.filter(card => card.challenge.name !== challenge.name);
			//draw new card
			update_challenge_hand(team);
			//Add bagels
			team.bagels += Number(challenge.bagels);
			//update instructions message
			instructions_message(team);
		});
		hand.push({
			"challenge": challenge,
			"message": challenge_card,
		});
	}
}

function create_battle_message(game){
	//check if battle deck is empty
	if (game.battle_deck.length === 0){
		//create new battle deck
		game.battle_deck = create_battle_deck();
	}
	//draw a battle card and post it to the game channel
	const battle_card = game.battle_deck.pop();
	const battle_message = render_battle_card(battle_card);
	return battle_message;
}

// async function update_curses(team){
// 	//check if curses message exists
// 	if (!team.curses_message){
// 		//create curses message
// 		const curses_message = await team.channel.send("### Curses");
// 		team.curses_message = curses_message;
// 		//add collector
// 		const collector = curses_message.createMessageComponentCollector({ componentType: ComponentType.Button});
// 		collector.on('collect', async i => {
// 			//get curses
// 			var curse = i.customId;
// 			//trim whitespace from curses
// 			curse = curse.trim();
// 			////console.log("got curses", curses)
// 			//check number of this curses on the team
// 			const number = team.curses[curse];
// 			//if number is greater than 1, decrease number
// 			if (number > 1){
// 				team.curses[curse] -= 1;
// 			} else {
// 				//remove curses from team
// 				delete team.curses[curse];
// 			}
// 			//send positive interaction response
// 			update_curses(team);
// 			i.reply({ content: `Curse used. Send it to the team you want to curse!`, ephemeral: true });
// 		});
// 	}
// 	//update curses message
// 	const curses = team.curses;
// 	//if curses exist, add each curses as a button
// 	if (curses.length > 0){
// 		var buttons = [];
// 		if (curses.length <= 5){
// 			for (const curse of curses){
// 				var action_row = new ActionRowBuilder();
// 				////console.log("adding curses", curses)
// 				const button = new ButtonBuilder()
// 					.setCustomId(curse.name)
// 					.setLabel(`${curse.name}`)
// 					.setStyle(ButtonStyle.Danger);
// 				action_row.addComponents(button);
// 				buttons.push(action_row);
// 			}
// 		} else {
// 			//create multiple action rows with 5 buttons each
// 			for (let i = 0; i < curses.length; i += 5){
// 				var action_row = new ActionRowBuilder();
// 				for (let j = 0; j < 5; j++){
// 					if (i + j < curses.length){
// 						const curse = curses[i + j];
// 					//	//console.log("adding curses", curses)
// 						const button = new ButtonBuilder()
// 							.setCustomId(curse)
// 							.setLabel(`${curse.name}`)
// 							.setStyle(ButtonStyle.Success);
// 						action_row.addComponents(button);
// 					}
// 				}
// 				buttons.push(action_row);
// 			}
// 		}
// 		//update message
// 		team.curses_message.edit({
// 			content: `# curses 🔎\n** Press a curse to use it. **`,
// 			components: buttons
// 		});
// 	} else {
// 		team.curses_message.edit({
// 			content: `# curses 🔎\nYou have no curses right now. Spend bagels to buy curses. 🤷`,
// 			components: []
// 		});
// 	}
// }

function render_challenge_card(challenge){
	challenge_embed = new Discord.EmbedBuilder()
		.setTitle(`${challenge.name}`)
		.setDescription(challenge.description)
		.setColor(Colors.Blue)
		.setAuthor({ name: 'Challenge Card' })
		const action_row = new ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(challenge.name)
				.setLabel('Complete')
				.setStyle(Discord.ButtonStyle.Primary),
		);
	if (challenge.bagels){
		challenge_embed.addFields({name: 'Bagels', value: challenge.bagels});
	}
	return {
		content: "_ _",
		embeds: [challenge_embed],
		components: [action_row]
	};
	
}

function render_battle_card(battle){
	console.log("rendering battle card", battle)
	const battle_embed = new Discord.EmbedBuilder()
		.setTitle(`${battle.name}`)
		.setDescription(battle.description)
		.setColor(Colors.Blue)
		.setAuthor({ name: 'Battle Challenge' })
	return {
		content: "_ _",
		embeds: [battle_embed],
		components: []
	};
	}


function delete_message(message){
	console.log("deleting message", message.content)
	if (message.deletable){
		message.delete().catch(console.error);
	} else {
		console.log("Message not deletable")
	}
}

async function start_game(game){
	game.round_active = true;
	//deal cards to each team
	game.teams.forEach(async team => {
		//update hand
		update_challenge_hand(team);
	});
	//update map
	update_map(game);
}

async function add_curse(team, number){
	if (team.curse_deck.length === 0){
		//create new curse deck
		team.curse_deck = create_curse_deck();
	}
	//console.log("adding curses ", curses, " x", number)
	const curse = team.curse_deck.pop();
	//add curse to deck
	team.curses.push(curse)
	//update curses message
}

async function update_map(game){
	//send message with the current map

	//get current claimed zones for each team
	var zones = [];
	//iterate over each team
	for(const team of game.teams){
		//iterate over each zone
		for (const zone of team.zones){
			//add zone to zones with team colour
			zones.push({zone: zone, colour: team.colour})
		}
	}
	//get the map image
	const img = await generateMapImage(zones);
	//send the image
	console.log("sending image")
	game.channel.send({files: [{attachment: img}]})
	.catch(console.error);
}

async function generateMapImage(zones){
	console.log(zones);
	//return image
	const img = nodeHtmlToImage({
		html: initial_file,
		content: {zones: zones}
  	}).catch(console.error);
	return img;
}

function areYouSure(){
	const modal = new Discord.ModalBuilder()
		.setTitle('Are you sure?')
		.setCustomId('confirm')
	const favoriteColorInput = new Discord.TextInputBuilder()
		.setCustomId('favoriteColorInput')
		// The label is the prompt the user sees for this input
		.setLabel("Ignore this field")
		// Short means only a single line of text
		.setStyle(Discord.TextInputStyle.Short);
	const firstActionRow = new ActionRowBuilder().addComponents(favoriteColorInput);
	modal.addComponents(firstActionRow);
	// //create action row with confirm button
	// const action_row = new ActionRowBuilder()
	// 	.addComponents(
	// 		new ButtonBuilder()
	// 			.setCustomId('confirm')
	// 			.setLabel('Confirm')
	// 			.setStyle(ButtonStyle.Success),
	// 	);
	// modal.addComponents(action_row);
	return modal;
}


//export functions
module.exports = {instructions_message, add_team, create_battle_deck, start_game, update_map, create_battle_message, add_curse, save_game, load_game};