﻿var irc = require('irc');
var sqlite3 = require('sqlite3').verbose();
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
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

function loadUrl(url) {
    var body = "";
    var req = request({url: url, encoding: null})
	.pipe(new AutoDetectDecoderStream())
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
    }).on('response', function (response) {
        if (response.headers['content-type'].indexOf('text/html') == -1)
            req.abort();
    });
}

var client = new irc.Client(config.server, config.botName, {
    channels: [config.channel]
});

client.addListener('message#', function(from, to, message) {
    console.log(from + ' => ' + to + ': ' + message);
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
                return;
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
                var correctURL = spotStr.replace(spotify, 4, "open");
                client.say(config.channel, from + " pls, use open.spotify.com like this: " + correctURL);
                upMsg = spotStr;
            }
    }

    var endPos = message.indexOf(" ", pos);
    if (endPos == -1)
        endPos = message.length;

    var url = message.substr(pos, endPos);
    loadUrl(url);
    checkForDb(url, from);
});

client.addListener('pm', function(from, message) {
    console.log(from + ' => ME: ' + message);
});
