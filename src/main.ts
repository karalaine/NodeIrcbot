declare function require(path: string): any;

var irc = require("irc");
var sqlite3 = require("sqlite3");
var request = require("request");
var cheerio = require("cheerio");
var _ = require("underscore");
var AutoDetectDecoderStream = require("autodetect-decoder-stream");
var xml2js = require("xml2js").parseString;
var querystring = require("querystring");
var fs = require("fs-ext");

var config = {
  channel: "#kctite09",
  server: "irc.quakenet.org",
  botName: "JormaNode"
};
/*
var config = {
    channel: "#mikonkannu",
    server: "chat.freenode.net",
    botName: "KeliBotti"
};
*/
var db = new sqlite3.Database("urldb");

function checkForDb(url, nick) {
  var statement = db.prepare("select nick, date from entries where url = ?");
  statement.get(url, function(err, row) {
    if (row == undefined) {
      db.run(
        "insert into entries values(?, ?, datetime('now','localtime'))",
        url,
        nick,
        function(err) {
          if (err) console.log("Error: " + err);
        }
      );
    } else {
      console.log(row.nick + " at " + row.date);
      client.say(
        config.channel,
        "Wanha! " + row.nick + " lähetti tämän " + row.date
      );
    }
  });
}

function loadUrl(url: string) {
  var body = "";
  var req = request({
    url: url,
    encoding: null
  }).on("response", function(response) {
    if (response.headers["content-type"].indexOf("text/html") == -1) {
      req.abort();
    } else {
      req
        .pipe(new AutoDetectDecoderStream())
        .on("data", function(chunk) {
          body += chunk;
        })
        .on("end", function() {
          var $ = cheerio.load(body);
          var titleElem = $("title");
          if (titleElem) {
            var title = titleElem.first().text();
            title = title.replace(/\s\s+/g, " ").trim();
            client.say(config.channel, "URL: " + title);
          }
        });
    }
  });
}

function checkForUrl(message: String, from: String) {
  var lowMsg = message.toLowerCase();
  var pos = lowMsg.indexOf("http");
  if (pos == -1) {
    pos = lowMsg.indexOf("www.");
    if (pos == -1) {
      pos = lowMsg.indexOf("ftp");
      if (pos == -1) {
        return false;
      }
    }
  } else {
    var spotify = lowMsg.indexOf("play.spotify");
    if (spotify != -1) {
      console.log("Found bad spotify URL");
      var spotStr = message;
      var correctURL =
        spotStr.substr(0, spotify) +
        "open" +
        spotStr.substr(spotify + 4, spotStr.length - 4 - spotify);
      client.say(
        config.channel,
        from + " pls, use open.spotify.com like this: " + correctURL
      );
    }
  }

  var endPos = message.indexOf(" ", pos);
  if (endPos == -1) endPos = message.length;

  var url = message.substr(pos, endPos);
  loadUrl(url);
  checkForDb(url, from);
  return true;
}
function roll(command: Array<String>, from: String) {
  var lower = 1;
  var upper = 100;
  if (command.length == 3) {
    lower = +command[1];
    upper = +command[2];
  } else if (command.length == 2) {
    if (command[1] === "help") {
      client.say(
        config.channel,
        "Usage: !roll or !random, parameters: [[<lower>] <upper>] e.g. !roll 1 20"
      );
      return;
    }
    upper = +command[1];
  }
  client.say(
    config.channel,
    from + " rollasi: " + Math.floor(Math.random() * upper + lower)
  );
}
/*
 ;*/

function findRecursive(object, key) {
  if (
    _.has(object, key) // or just (key in obj)
  )
    return [object];

  var res = [];
  _.forEach(object, function(v) {
    if (typeof v == "object" && (v = findRecursive(v, key)).length)
      res.push.apply(res, v);
  });
  return res;
}

var WAWA = {
  10: "utua",

  20: "sumua",
  21: "sadetta",
  22: "tihkusadetta",
  23: "vesisadetta",
  24: "lumisadetta",
  25: "jäätävää tihkua",

  30: "sumua",
  31: "sumua",
  32: "sumua",
  33: "sumua",
  34: "sumua",

  40: "sadetta",
  41: "heikkoa tai kohtalaista sadetta",
  42: "kovaa sadetta",

  50: "tihkusadetta",
  51: "heikkoa tihkusadetta",
  52: "kohtalaista tihkusadetta",
  53: "kovaa tihkusadetta",
  54: "jäätävää heikkoa tihkusadetta",
  55: "jäätävää kohtalaista tihkusadetta",
  56: "jäätävää kovaa tihkusadetta",

  60: "vesisadetta",
  61: "heikkoa vesisadetta",
  62: "kohtalaista vesisadetta",
  63: "kovaa vesisadetta",
  64: "jäätävää heikkoa vesisadetta",
  65: "jäätävää kohtalaista vesisadetta",
  66: "jäätävää kovaa vesisadetta",
  67: "räntää",
  68: "räntää",

  70: "lumisadetta",
  71: "heikkoa lumisadetta",
  72: "kohtalaista lumisadetta",
  73: "tiheää lumisadetta",
  74: "heikkoa jääjyväsadetta",
  75: "kohtalaista jääjyväsadetta",
  76: "kovaa jääjyväsadetta",
  77: "lumijyväsiä",
  78: "jääkiteitä",

  80: "sadekuuroja",
  81: "heikkoja sadekuuroja",
  82: "kohtalaisia sadekuuroja",
  84: "heikkoja lumikuuroja",
  85: "kohtalaisia lumikuuroja",
  86: "kovia lumikuuroja",
  87: "raekuuroja"
};

function weather(command: Array<string>) {
  var SERVER_URL =
    "http://data.fmi.fi/fmi-apikey/f4b3c455-56e0-4a21-a4b3-a8c8616ea896/wfs?";
  var STORED_QUERY_OBSERVATION =
    "fmi::observations::weather::multipointcoverage";
  var place = "Helsinki";
  if (command.length > 1) {
    place = command[1];
  }
  var startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - 30);
  var params = {
    request: "getFeature",
    storedquery_id: "fmi::observations::weather::timevaluepair",
    parameters: "t2m,ws_10min,rh,n_man,wawa",
    crs: "EPSG::3067",
    place: place,
    maxlocations: 1,
    starttime: startTime
      .toISOString()
      .split(/\.\d+/)
      .join("")
  };

  var totalUrl = SERVER_URL + querystring.stringify(params);
  request(totalUrl, function(errors, response, body) {
    if (errors) {
      client.say(config.channel, "Http virhe");
    } else {
      var xml = xml2js(body, { trim: true }, function(err, result) {
        if (!err) {
          if (findRecursive(result, "gml:name").length == 0) {
            client.say(config.channel, "Paikkaa ei löytynyt");
            return;
          }

          var measurements = findRecursive(
            result,
            "wml2:MeasurementTimeseries"
          );
          var values = {};
          _.each(measurements, function(m) {
            var target = m["wml2:MeasurementTimeseries"][0].$["gml:id"]
              .split("-")
              .pop();
            var value = findRecursive(m, "wml2:value").pop()["wml2:value"][0];
            if (value.length > 1 && value != "NaN") values[target] = value;
          });
          var text = "Sää " + place + " ";
          if ("t2m" in values)
            text +=
              "lämpötila: " + parseFloat(values["t2m"]).toFixed(1) + "°C ";
          if ("t2m" in values && "ws_10min" in values) {
            // Calculate "feels like" if both temperature and wind speed were found
            var feels_like =
              13.12 +
              0.6215 * values["t2m"] -
              13.956 * values["ws_10min"] ** 0.16 +
              0.4867 * values["t2m"] * values["ws_10min"] ** 0.16;
            text += "tuntuu kuin: " + feels_like.toFixed(1) + "°C ";
          }
          if ("ws_10min" in values)
            text +=
              "tuulen nopeus: " + Math.round(values["ws_10min"]) + " m/s ";
          if ("rh" in values)
            text += "ilman kosteus: " + Math.round(values["rh"]) + "% ";
          if ("n_man" in values)
            text += "pilvisyys: " + Math.floor(values["n_man"]) + "/8 ";
          if ("wawa" in values && Math.floor(values["wawa"]) in WAWA)
            text += WAWA[Math.floor(values["wawa"])];
          client.say(config.channel, text);
        }
      });
    }
  });
}

function checkForCommand(message: String, from: String) {
  if (message.length > 1 && message[0] === "!") {
    var command = message.split(" ");
    switch (command[0].toLowerCase()) {
      case "!random":
      case "!roll":
        roll(command, from);
        break;
      case "!sää":
      case "!keli":
      case "!weather":
        weather(command);
        break;
      default:
        break;
    }
  }
}

var fd = fs.openSync(".oidentd.conf", "w+");

fs.flockSync(fd, "ex");

fs.writeSync(fd, 'global { reply "jorma" }');

var client = new irc.Client(config.server, config.botName, {
  channels: [config.channel]
});

client.addListener("message#", function(from, to, message) {
  console.log(from + " => " + to + ": " + message);

  if (checkForUrl(message, from) == false) {
    checkForCommand(message, from);
  }
});

client.addListener("pm", function(from, message) {
  console.log(from + " => ME: " + message);
});

client.addListener("registered", function(message) {
  fs.truncateSync(fd);
  fs.flock(fd, "un", function(err) {
    if (err) {
      return console.log("Couldn't unlock file, too bad");
    }
  });
});
