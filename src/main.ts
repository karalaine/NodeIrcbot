declare function require(path: string): any;

var irc = require('irc');
var sqlite3 = require('sqlite3');
import request = require('request');
import cheerio  = require('cheerio');
import _ = require('underscore');
var AutoDetectDecoderStream = require('autodetect-decoder-stream');

var config = {
    channel: "#kctite09",
    server: "irc.quakenet.org",
    botName: "JormaNode"
};

var db = new sqlite3.Database('urldb');

function checkForDb(url, nick) {
    var statement = db.prepare('select nick, date from entries where url = ?');
    statement.get(url, function (err, row) {
        if (row == undefined) {
            db.run("insert into entries values(?, ?, datetime('now','localtime'))", url, nick, function (err) {
                if(err)
                    console.log("Error: " + err);
            });
        }
        else {
            console.log(row.nick + ' at ' + row.date);
            client.say(config.channel, "Wanha! " + row.nick + ' lähetti tämän ' + row.date);
        }
    });
}

function loadUrl(url: String) {
    var body = "";
    var req = request({url: url, encoding: null})
	.on('response', function (response)
	{
        if (response.headers['content-type'].indexOf('text/html') == -1) {
            req.abort();
        }
        else {
            req.pipe(new AutoDetectDecoderStream())
                .on('data', function(chunk) {
                    body += chunk;
                })
                .on('end',function() {
                    var $ = cheerio.load(body);
                    var title = $('title');
                    if (title) {
                        title = title.first().text();
                        title = title.replace(/\s\s+/g, " ").trim();
                        client.say(config.channel, "URL: " + title);
                    }
                });
        }
	});
}

var client = new irc.Client(config.server, config.botName, {
    channels: [config.channel]
});

function checkForUrl(message: String, from: String)
{
    var lowMsg = message.toLowerCase();
    var pos = lowMsg.indexOf("http");
    if (pos == -1)
    {
        pos = lowMsg.indexOf("www.");
        if (pos == -1)
        {
            pos = lowMsg.indexOf("ftp");
            if (pos == -1)
            {
                return false;
            }
        }
    }
    else
    {
            var spotify = lowMsg.indexOf("play.spotify");
            if (spotify != -1)
            {
                console.log("Found bad spotify URL");
                var spotStr = message;
                var correctURL = spotStr.substr(0, spotify) + "open" + spotStr.substr(spotify+4, spotStr.length-4-spotify);
                client.say(config.channel, from + " pls, use open.spotify.com like this: " + correctURL);
            }
    }

    var endPos = message.indexOf(" ", pos);
    if (endPos == -1)
        endPos = message.length;

    var url = message.substr(pos, endPos);
    loadUrl(url);
    checkForDb(url, from);
    return true;
}
function roll(command: Array<String>, from: String)
{
    var lower = 1;
    var upper = 100;
    if(command.length == 3)
    {
        lower = +command[1];
        upper = +command[2];
    }
    else if(command.length == 2)
    {
        if(command[1] === "help")
        {
             client.say(config.channel, "Usage: !roll or !random, parameters: [[<lower>] <upper>] e.g. !roll 1 20");
             return;
        }
        upper = +command[1];
    }
    client.say(config.channel, from + " rollasi: " + Math.floor((Math.random() * upper)  + lower)); 
}


function checkForCommand(message: String, from: String) {
    if(message.length > 1 && message[0] === '!')
    {
        var command = message.split(" ");
        switch (command[0].toLowerCase()) {
            case "!random":
            case "!roll":
                roll(command, from);
                break;
            default:
                break;
        }
    }
}

client.addListener('message#', function(from, to, message) {
    console.log(from + ' => ' + to + ': ' + message);
    if(checkForUrl(message, from) == false)
    {
        checkForCommand(message, from);
    }
});

client.addListener('pm', function(from, message) {
    console.log(from + ' => ME: ' + message);
});
