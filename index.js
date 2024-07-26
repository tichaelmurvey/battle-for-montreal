//add to server: https://discord.com/api/oauth2/authorize?client_id=1242564010734256231&permissions=0&scope=bot%20applications.commands


//import env
require('dotenv').config();
const path = require('path');
const fs = require('fs');
//import discord
const Discord = require('discord.js');
const token = process.env.TOKEN;
//create a new discord client
const client = new Discord.Client({ intents: [
	Discord.GatewayIntentBits.Guilds,
	Discord.GatewayIntentBits.GuildMessages,
	Discord.GatewayIntentBits.MessageContent,
	Discord.GatewayIntentBits.GuildMembers,
	Discord.GatewayIntentBits.GuildMessageReactions,
]});


//create commands collection
client.commands = new Discord.Collection();
const commands = [];
//get commands modules
const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
		commands.push(command.data.toJSON());
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}


//Handle interactions and run commands
client.on(Discord.Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	} else if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}
		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}
});


// Establish rest application which sends commands to the server
const rest = new Discord.REST({ version: '9' }).setToken(token);


(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		const data = rest.put(
			Discord.Routes.applicationGuildCommands(process.env.clientID, process.env.serverID),
			{ body: commands },
		);
		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
		} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();




//when the client is ready, run this code
client.once('ready', () => {
	console.log('Ready!');
});

client.login(token);