/*
    The following code goes into it's own file, and you run this file
    instead of your main bot file.
*/
const logo = require('asciiart-logo');
const chalk = require("chalk");
console.log(chalk.keyword('orange')(
    logo({
        name: 'ZORA',
        font: 'Doh',
        lineChars: 15,
        padding: 5,
        margin: 2
    })
    .emptyLine()
    .right('version 0.1.0 beta')
    .emptyLine()
    .wrap('ZoraBOT was created by Avery Wagar and Nathan Laha')
    .render()
));
const Discord = require('discord.js');
const Manager = new Discord.ShardingManager('./src/index.js');
Manager.spawn(1); // This example will spawn 2 shards (5,000 guilds);

/**
 * Web Interface!
 * Express Server
 */

const express = require('express');
const path = require('path');
const https = require('https');
const fs = require('fs');
const app = express();
const bodyParser = require("body-parser");
var url = require('url');
const config = require("./config.json");
var ClientOAuth2 = require('client-oauth2')
const axios = require('axios');
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

// URL that points to MongoDB database
var url = "mongodb://localhost:27017/zora";

// Connect/Create MongoDB database
mongoose.connect(url, {
    user: config.databaseuser,
    pass: config.databasepass
});
console.log(chalk.green('connected web interface to database'));

// Default server configuration (also used with .clearcfg)
var defaultConfig = new Schema({
    name: {
        type: String,
        default: ''
    },
    _id: Schema.Types.Decimal128,
    prefix: {
        type: String,
        default: "+"
    },
    modlogChannel: {
        type: String,
        default: "modlog"
    },
    welcomes: {
        type: Boolean,
        default: false
    },
    modules: {
        music: {
            type: Boolean,
            default: true
        },
        gamestats: {
            type: Boolean,
            default: true
        }
    },
    stats: {
        users: {
            type: Number,
            default: 0
        },
        richest: {
            id: Schema.Types.Decimal128,
            name: {
                type: String,
                default: ''
            },
            zcoins: {
                type: Number,
                default: 0
            }
        }
    },
    premium: {
        type: Boolean,
        default: false
    },
    reddit: {
        subreddits: [],
        posts: {
            type: String,
            default: 3
        },
        channel: {
            type: String,
            default: "memes"
        },
        interval: {
            type: Number,
            default: 1
        }
    },
    automod: {
        bannedwords: []
    }
});

// Default user profile config
var defaultprofile = new Schema({
    level: {
        type: Number,
        default: "1"
    },
    username: String,
    xp: {
        type: Number,
        default: "0"
    },
    zcoins: {
        type: Number,
        default: "100"
    },
    VIP: {
        type: Boolean,
        default: false
    },
    inventory: [],
    _id: Schema.Types.Decimal128
});

// Define models
const UserM = mongoose.model("Users", defaultprofile);
const ServerM = mongoose.model("Servers", defaultConfig);

async function getServerConfig(id) {
    var outserver;
    await ServerM.findById(id, function (err, server) {
        outserver = server;
    });
    return outserver;
}

async function setServerConfig(id, newconfig) {
    await ServerM.findById(id, function (err, server) {
        if (newconfig.prefix) {
            server.prefix = newconfig.prefix
        }
        if (newconfig.modlogChannel) {
            server.modlogChannel = newconfig.modlogChannel
        }
        if (newconfig.welcomes) {
            server.welcomes = newconfig.welcomes
        }
        server.save();
    });
    return;
}

var discordAuth = new ClientOAuth2({
    clientId: config.ws.clientid,
    clientSecret: config.ws.clientsecret,
    accessTokenUri: config.ws.tokenurl,
    authorizationUri: config.ws.authurl,
    redirectUri: 'https://dta.dekutree.org/api/discord/callback',
    scopes: ['identify', 'guilds', 'messages.read']
})

app.use(express.static(path.join(__dirname, 'static')))

// Register bodyParser as parser for Post requests body in JSON-format
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// SSL Certs
// TODO move into config.json
const options = {
    cert: fs.readFileSync('./sslcert/fullchain.pem'),
    key: fs.readFileSync('./sslcert/privkey.pem')
};

app.listen(80, () => {
    console.info(chalk.green('HTTP server set up at port 80'));
});
var server = https.createServer(options, app).listen(443);
var io = require('socket.io')(server);
console.log(chalk.green("HTTPS server set up at port 443"))

app.use(express.static('public'))

app.get('/api/discord/login', function (req, res) {
    var uri = discordAuth.code.getUri()
    res.redirect(uri)
})

app.get('/api/discord/callback', function (req, res) {
    discordAuth.state =
        discordAuth.code.getToken(req.originalUrl)
        .then(function (user) {

            user.expiresIn(124241);

            // Sign API requests on behalf of the current user.
            user.sign({
                method: 'get',
                url: 'https://dta.dekutree.org'
            })

            return res.redirect(`https://zora.netlify.com/#/dashboard?token=${user.accessToken}`)

        })
})


io.on('connection', function (socket) {
    console.log(chalk.cyan('Dashboard User Connected'));
    socket.on('disconnect', function () {
        console.log(chalk.cyan('Dashboard User Disconnected'));
    });
    socket.on('getServers', function (token) {
        axios.get('https://discordapp.com/api/users/@me/guilds', {
                headers: {
                    'user-agent': "DiscordBot (https://github.com/ajmwagar/zora, 0.1)",
                    Authorization: `Bearer ${token}`
                }
            })
            .then(function (response) {
                let ownedservers = [];
                response.data.forEach(function (server) {
                    if (server.owner == true) {
                        ownedservers.push(server);
                    }
                });
                socket.emit('updateServers', ownedservers, function (answer) {});
            })
            .catch(function (error) {
                console.log(error);
            })
            .then(function () {
                // always executed
            });
    });
    socket.on('getChannels', function (token, serverid) {
        /**
         * Always make sure the token submitted by the client
         * has access to the server you are modifying
         */
        axios.get('https://discordapp.com/api/users/@me/guilds', {
                headers: {
                    'user-agent': "DiscordBot (https://github.com/ajmwagar/zora, 0.1)",
                    Authorization: `Bearer ${token}`
                }
            })
            .then(async function (response) {
                let ownedservers = [];
                let ownsserver = false;

                response.data.forEach(function (server) {
                    if (server.owner == true) {
                        ownedservers.push(server);
                        if (server.id == serverid) {
                            ownsserver = true;
                        }
                    }
                });

                if (ownsserver == true) {
                    /**
                     *  If the client is authorized to modify settings for this server
                     *  get the current values and send them over socket.io
                     * */
                    let channel = "modlog";
                    let prefix = "+";
                    let welcomestate = false;
                    let musicstate = true;
                    let playercount = 0;

                    // get current config for server from database
                    cdserver = await getServerConfig(serverid);

                    // update variables based on database
                    prefix = cdserver.prefix;
                    channel = cdserver.modlogChannel;
                    welcomestate = cdserver.welcomes;
                    playercount = cdserver.stats.users;
                    socket.emit('updateChannel', channel);
                    socket.emit('updatePrefix', prefix);
                    socket.emit('updateWelcome', welcomestate);
                    socket.emit('updatePlayercount', playercount);
                }
            })
            .catch(function (error) {
                console.log(error);
            })
            .then(function () {
                // always executed
            });
    });
    socket.on('SaveCFG', function (token, serverid, newconfiguration) {
        /**
         * Always make sure the token submitted by the client
         * has access to the server you are modifying
         */
        axios.get('https://discordapp.com/api/users/@me/guilds', {
                headers: {
                    'user-agent': "DiscordBot (https://github.com/ajmwagar/zora, 0.1)",
                    Authorization: `Bearer ${token}`
                }
            })
            .then(async function (response) {
                let ownedservers = [];
                let ownsserver = false;

                response.data.forEach(function (server) {
                    if (server.owner == true) {
                        ownedservers.push(server);
                        if (server.id == serverid) {
                            ownsserver = true;
                        }
                    }
                });

                if (ownsserver == true) {
                    /**
                     *  If the client is authorized to modify settings for this server
                     *  set the current values
                     * */

                    var newconfig = {};

                    newconfig = newconfiguration;

                    // set current config for server in database
                    console.log(serverid)
                    console.log(newconfig)
                    await setServerConfig(serverid, newconfig);
                }
            })
            .catch(function (error) {
                console.log(error);
            })
            .then(function () {
                // always executed
            });
    });
});