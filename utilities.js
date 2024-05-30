const fs = require('fs');
const seeker_cards = JSON.parse(fs.readFileSync('./seeker_cards.json'));
const hider_cards = JSON.parse(fs.readFileSync('./hider_cards.json'));
const question_data = JSON.parse(fs.readFileSync('./questions.json'));
const trick_data = JSON.parse(fs.readFileSync('./tricks.json'));
const Discord = require('discord.js');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ThreadAutoArchiveDuration, PermissionsBitField, Colors  } = require('discord.js');

var team_names = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];

//team class
class Team {
	constructor(channel) {
		this.name = channel.name;
		this.role = 'hiding';
		this.channel = channel;
		this.players = null;
		this.seeker = {}
		this.hider = {}
		this.seeker.deck = [];
		this.seeker.hand = [];
		this.seeker.questions = {};
		this.hider.deck = [];
		this.hider.hand = [];
		this.hider.tricks = {};
		this.game = null;
	}
}

function create_seeker_deck(){
	seeker_deck = structuredClone(seeker_cards);
	//console.log('Seeker deck created', seeker_deck.length);
	shuffle(seeker_deck);
	//console.log('Seeker deck shuffled', seeker_deck.length);
	return seeker_deck;
}

function create_hider_deck(){
	hider_deck = structuredClone(hider_cards);
	//console.log('Hider deck created', hider_deck.length);
	shuffle(hider_deck);
	//console.log('Hider deck shuffled', hider_deck.length);
	return hider_deck;
}

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
}

async function add_team(game){
	//choose name
	shuffle(team_names);
	if (team_names.length === 0){
		team_names = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
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
	//add game to team
	team.game = game;
	//create seeker deck
	//console.log("seeker cards", seeker_cards[0]);
	team.seeker.deck = create_seeker_deck();
	//create hider deck
	team.hider.deck = create_hider_deck();
	//return team
	//console.log('Team created', team.name);
	//console.log('Seeker deck created', team.seeker.deck.length);
	//console.log('Hider deck created', team.hider.deck.length);
	return team;
}

//update hand of seeker cards for a team
async function update_seeker_hand(team){
	//if there are cards in the hider hand, remove them
	//console.log("deleting hider cards")
	team.hider.hand.forEach(card => {
		if (card.message){
			//console.log("deleting card" , card.name, card.message.id)
			delete_message(card.message);
		}
	});
	//get current hand
	var hand = team.seeker.hand;
	//check length of deck
	//console.log('Seeker deck length', team.seeker.deck.length);
	//console.log('Seeker hand length', hand.length);
	//check if hand is less than 5
	while (hand.length < 5){
		//draw a card
		if (team.seeker.deck.length === 0){
			//console.log('No more cards in deck');
			await team.channel.send('No more cards in deck');
			break;
		}
		const challenge = team.seeker.deck.pop();
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
			team.seeker.hand = hand.filter(card => card.challenge.name !== challenge.name);
			//draw new card
			update_seeker_hand(team);
			//Send question choice message
			send_question_message(challenge, team);
			//remove this card
		});


		hand.push({
			"challenge": challenge,
			"message": challenge_card,
		});
	}
}

async function update_hider_hand(team){
	//if there are cards in the seeker hand, remove them
	////console.log("deleting seeker cards")
	if (team.seeker.hand.length > 0){
		team.seeker.hand.forEach(card => {
			if (card.message){
				////console.log("deleting card" , card.name, card.message.id)
				delete_message(card.message);
			}
		});
		//shuffle seeker cards back into seeker deck
		team.seeker.deck = team.seeker.deck.concat(team.seeker.hand.map(card => card.challenge));
		team.seeker.hand = [];
	}
	//remove current hider hand cards
	team.hider.hand.forEach(card => {
		if (card.message){
			//("deleting card" , card.name, card.message.id)
			card.message.delete();
		}
	});
	team.hider.hand = [];
	//draw 3 cards
	for (let i = 0; i < 3; i++){
		const challenge = team.hider.deck.pop();
		//add card to hand
		////console.log(" drew a challenge", challenge);
		const message = render_hider_challenge_card(challenge);
		const challenge_card = await team.channel.send(message);
		const collector = challenge_card.createMessageComponentCollector({ componentType: ComponentType.Button});
		collector.on('collect', async i => {
			if (i.customId === 'complete') {
				//remove card
				delete_message(challenge_card)
				//update hand
				team.hider.hand = team.hider.hand.filter(card => card.challenge !== challenge);
				//Send question choice message
				add_trick(team, challenge.reward);
			}
		});
		team.hider.hand.push({
			"challenge": challenge,
			"message": challenge_card,
		});
	}
}

async function update_questions(team){
	////console.log(team.seeker.questions)
	//check if questions message exists
	if (!team.questions_message){
		//create questions message
		const questions_message = await team.channel.send("### Questions");
		team.questions_message = questions_message;
		//add collector
		const collector = questions_message.createMessageComponentCollector({ componentType: ComponentType.Button});
		collector.on('collect', async i => {
			//get question
			var question = i.customId;
			//trim whitespace from question
			question = question.trim();
			////console.log("got question", question)
			//check number of this question on the team
			const number = team.seeker.questions[question];
			//if number is greater than 1, decrease number
			if (number > 1){
				team.seeker.questions[question] -= 1;
			} else {
				//remove question from team
				delete team.seeker.questions[question];
			}
			//send positive interaction response
			i.reply({ content: `Question removed`, ephemeral: true });
			//send question to questions channel
			const question_channel = team.game.questions_channel;
			const question_message = render_question(question, team);
			const question_message_send = await question_channel.send({content: `@everyone`, embeds: [question_message] });
			//add thread to question message
			question_message_send.startThread({
				name: question,
				autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
				reason: 'Question thread'
			})
			
			update_questions(team);
		});
	}
	//update questions message
	const questions = team.seeker.questions;
	//if questions exist, add each question as a button
	if (Object.keys(questions).length > 0){
		var buttons = [];
		const questions_list = Object.keys(questions);
		if (questions_list.length <= 5){
			for (const question of questions_list){
				var action_row = new ActionRowBuilder();
				////console.log("adding question", question)
				const button = new ButtonBuilder()
					.setCustomId(question)
					.setLabel(`${question} x${questions[question]}`)
					.setStyle(ButtonStyle.Success);
				action_row.addComponents(button);
				buttons.push(action_row);
			}
		} else {
			//create multiple action rows with 5 buttons each
			for (let i = 0; i < questions_list.length; i += 5){
				var action_row = new ActionRowBuilder();
				for (let j = 0; j < 5; j++){
					if (i + j < questions_list.length){
						const question = questions_list[i + j];
					//	//console.log("adding question", question)
						const button = new ButtonBuilder()
							.setCustomId(question)
							.setLabel(`${question} x${questions[question]}`)
							.setStyle(ButtonStyle.Success);
						action_row.addComponents(button);
					}
				}
				buttons.push(action_row);
			}
		}
		//update message
		team.questions_message.edit({
			content: `# Questions 🔎\n** Select a button to ask a question **`,
			components: buttons
		});
	} else {
		team.questions_message.edit({
			content: `# Questions 🔎\nYou have no questions right now. Complete challenges to earn questions. 🤷`,
			components: []
		});
	}
}

// function render_question(question, team){
// 	//lookup question data, with whitespace trimmed and case insensitve
// 	const question_info = question_data.find(q => q.name.trim().toLowerCase() === question.trim().toLowerCase());
// 	//check if question exists
// 	if (question_info){
// 		//render question message
// 		const message = [
// 			`# New question`,
// 			`*${team.name} asked:*`,
// 			`## ${question_info.name}`,
// 			question_info.description,
// 			`**Time to complete:** ${question_info.time}`,
// 			`@everyone`
// 		];
// 		return message.join('\n\n');
// 	} else {
// 		return `# New question\n
// *${team.name} asked:* \n
// **${question}** @everyone`;
// 	}

// }

function render_question(question, team){
	// 	//lookup question data, with whitespace trimmed and case insensitve
	const question_info = question_data.find(q => q.name.trim().toLowerCase() === question.trim().toLowerCase());
	//check if question exists
	if (question_info){
		const embed = new Discord.EmbedBuilder()
			.setAuthor({ name: team.name })
			.setTitle(question_info.name)
			.setDescription(question_info.description)
			.setFields({
				name: 'Time to complete',
				value: question_info.time
			})
			.setColor(Colors.Blue)
		return embed;
	}
}

async function update_tricks(team){
	////console.log(team.hider.tricks)
	//check if tricks message exists
	if (!team.tricks_message){
		//create tricks message
		const tricks_message = await team.channel.send("### Tricks");
		team.tricks_message = tricks_message;
		//pin message
		tricks_message.pin();
		//add collector
		const collector = tricks_message.createMessageComponentCollector({ componentType: ComponentType.Button});
		collector.on('collect', async i => {
			//get trick
			const trick = i.customId;
			////console.log("got trick", trick)
			//check number of this trick on the team
			const number = team.hider.tricks[trick];
			//if number is greater than 1, decrease number
			if (number > 1){
				team.hider.tricks[trick] -= 1;
			} else {
				//remove trick from team
				delete team.hider.tricks[trick];
			}
			//send positive interaction response
			i.reply({ content: `trick removed`, ephemeral: true });
			update_tricks(team);
		});
	}
	//update tricks message
	const tricks = team.hider.tricks;
	//if tricks exist, add each trick as a button
	if (Object.keys(tricks).length > 0){
		const action_row = new ActionRowBuilder();
		const tricks_list = Object.keys(tricks);
		for (const trick of tricks_list){
			//console.log("adding trick", trick)
			const button = new ButtonBuilder()
				.setCustomId(trick)
				.setLabel(`${trick} x${tricks[trick]}`)
				.setStyle(ButtonStyle.Success);
			action_row.addComponents(button);
		}
		//update message
		team.tricks_message.edit({
			content: `
	# 😉 Tricks \n** Select a button to spend a trick **
			`,
			components: [action_row]
		});
	} else {
		team.tricks_message.edit({
			content: `# Tricks \nYou have no tricks right now. Complete challenges to earn tricks. 🤷`,
			components: []
		});
	}

}

// function render_hider_challenge_card(challenge){
// 	text = [
// 		`## 🎴 ${challenge.name}`,
// 		challenge.description,
// 		`🎁 **Reward:** ` + challenge.reward
// 	]
// 	text = text.join('\n\n');
// 	//create action row
// 	const action_row = new ActionRowBuilder()
// 		.addComponents(
// 			new Discord.ButtonBuilder()
// 				.setCustomId('complete')
// 				.setLabel('Complete')
// 				.setStyle(Discord.ButtonStyle.Primary),
// 		);
// 	//return message
// 	return {
// 		content: text,
// 		components: [action_row]
// 	};
// }

function render_hider_challenge_card(challenge){
	hider_embed = new Discord.EmbedBuilder()
		.setTitle(`${challenge.name}`)
		.setDescription(challenge.description)
		.setColor(Colors.Orange)
		.setAuthor({ name: 'Hider Challenge Card' })
		.addFields({
			name: '🎁 Reward',
			value: challenge.reward
		})
		const action_row = new ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId('complete')
				.setLabel('Complete')
				.setStyle(Discord.ButtonStyle.Primary),
		);
		return {
			embeds: [hider_embed],
			components: [action_row]
		};
}

function render_challenge_card(challenge){
	challenge_embed = new Discord.EmbedBuilder()
		.setTitle(`${challenge.name}`)
		.setDescription(challenge.description)
		.setColor(Colors.Blue)
		.setAuthor({ name: 'Seeker Challenge Card' })
		.addFields({
			name: '🎁 Rewards',
			value:  challenge.rewards.map(question => `${question.name} x${question.number}`).join(` **${challenge.method}** `)
		})
		const action_row = new ActionRowBuilder()
		.addComponents(
			new Discord.ButtonBuilder()
				.setCustomId(challenge.name)
				.setLabel('Complete')
				.setStyle(Discord.ButtonStyle.Primary),
		);
		return {
			content: "_ _",
			embeds: [challenge_embed],
			components: [action_row]
		};
	
}

async function end_round(game){
	game.round_active = false;
	//remove all cards from teams
	game.teams.forEach(team => {
		//remove seeker cards
		team.seeker.hand.forEach(card => {
			if (card.message){
				delete_message(card.message);
			}
		});
		team.seeker.hand = [];
		//remove hider cards
		team.hider.hand.forEach(card => {
			if (card.message){
				delete_message(card.message);
			}
		});
		team.hider.hand = [];
		//remove questions message
		if (team.questions_message){
			delete_message(team.questions_message);
			team.questions_message = null;
		}
		//remove tricks message
		if (team.tricks_message){
			delete_message(team.tricks_message);
			team.tricks_message = null;
		}
	});
}

function delete_message(message){
	console.log("deleting message", message.content)
	try {
		message.delete();
	}
	catch (error){
		console.log("error deleting message", error)
	}
}

async function start_round(game){
	//check if there is a seeker team
	//set round active
	game.round += 1;
	game.round_active = true;
	//deal cards to each team
	game.teams.forEach(team => {
		if (team.role === 'seeking'){
			update_questions(team);
			update_seeker_hand(team);
		}
		else {
			update_tricks(team);
			update_hider_hand(team);
		}
	});
}

async function add_trick(team, trick){
	//console.log("adding trick ", trick)
	//check if question exists on team already
	if (team.hider.tricks[trick]){
		//increase question count
		team.hider.tricks[trick] += 1;
	} else {
		//add question to team
		team.hider.tricks[trick] = 1;
	}
	//update questions message
	update_tricks(team);
}
async function send_question_message(challenge, team){
	var message = {
		content: ``,
		components: []
	};
	//check question method
	if (challenge.method === 'AND') {
		//add all questions to team
		for (question of challenge.rewards){
			//console.log("got question", question.name, question.number)
			add_question(team, question.name, question.number);
		}
		await update_questions(team);
	} else {
		//create choice message
		message.content = "## Choose a question as a reward:";
		//create actionrow
		const action_row = new ActionRowBuilder()
		//add buttons for each question
		for (question of challenge.rewards){
			const button = new ButtonBuilder()
				.setCustomId(question.name +question.number)
				.setLabel(`${question.name} x${question.number}`)
				.setStyle(ButtonStyle.Success)
			action_row.addComponents(button);
		}
		message.components.push(action_row);
		const question_message = await team.channel.send(message);
		//if choice message, add collector
		if (message.components.length > 0){
			const collector = question_message.createMessageComponentCollector({ componentType: ComponentType.Button});
			collector.on('collect', async i => {
				//get question
				const question = i.customId;
				//console.log("got question", question)
				//get question number from last character of ID
				const number = parseInt(question.slice(-1));
				//get question name
				const name = question.slice(0, -1);
				//add question to team
				add_question(team, name, number);
				update_questions(team);
				//remove message
				delete_message(question_message);
			});
		}
	
	}
}

async function add_question(team, question, number){
	//console.log("adding question ", question, " x", number)
	//check if question exists on team already
	if (team.seeker.questions[question]){
		//increase question count
		team.seeker.questions[question] += number;
	} else {
		//add question to team
		team.seeker.questions[question] = number;
	}
	//update questions message
}

//export functions
module.exports = {create_seeker_deck, add_team, update_seeker_hand, update_hider_hand, start_round, end_round};