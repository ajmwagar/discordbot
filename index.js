// Load up the discord.js library
const Discord = require("discord.js");
const fs = require('fs');
// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

// Here we load the config.json file that contains our token and our prefix values. 
const config = require("./config.json");
// config.token contains the bot's token
// config.prefix contains the message prefix.

const axios = require('axios');

// Internal modules
const admin = require('./admin');
const memes = require('./reddit');
const radio = require('./radio');


// var memeInterval = setInterval(getMemes, config.reddit.interval * 1000 * 60 * 60);

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  client.user.setActivity(`${client.guilds.size} servers | ${config.prefix}help`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setActivity(`${client.guilds.size} servers | ${config.prefix}help`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setActivity(`${client.guilds.size} | ${config.prefix}help`);
});


client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.

  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if (message.author.bot) return;

  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  // TODO Automod filter
  if (message.content.indexOf(config.prefix) !== 0) return;

  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // Admin

  admin.bot(client, message, command, args);

  // Memes

  memes.bot(message, command, args);

  // Music

  radio.bot(message, command, args);


  // Weather

  if (command === "weather") {

    var city = args[0];

    if (!city) {
      return message.reply("Please provide a valid city");
    } else {
      const m = await message.channel.send("Getting Weather Data...");
      const weather = axios.create({
        baseURL: "http://api.apixu.com/v1/current.json?key=5d0a7d3aa80e4d5b843181446181308&q=" + city.trim(),
        headers: {
          Accept: "application/json"
        }
      });
      weather.get("/").then(res => {
        m.edit("Current Weather:\n  Conditions: " + res.data.current.condition.text + "\n  Temperature: " + res.data.current.temp_f + "\n  Humidity: " + res.data.current.humidity);
      })
    }
  }

  // Jokes

  // Tell a joke using icanhazdadjoke.com (random dad jokes)
  // Use axios to create an api
  if (command === "joke"){
    // Tee it up
    const m = await message.channel.send("Let me think...");

    // Get the joke
    const jokeApi = axios.create( {
      baseURL: "https://icanhazdadjoke.com",
      headers: {
        Accept: "application/json"
      }
    } );

    // respond
    jokeApi.get("/").then(res => {m.edit(res.data.joke)})
  }



});

client.login(config.token);


