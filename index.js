var Steam = require('steam');

const SteamUser = require('steam-user');
var user = new SteamUser({
	promptSteamGuardCode: true,
	singleSentryfile: true,
	autoRelogin: true
});

const SteamCommunity = require('steamcommunity');
let community = new SteamCommunity();

var SteamTotp = require('steam-totp');
var steamid = require('steamid');
var TradeOfferManager = require('steam-tradeoffer-manager');
var steamCommentPackage = require('steam-market');
var steamClient = new Steam.SteamClient();

var SteamRepAPI = require('steamrep');

const chalk = require("chalk");

var fs = require('fs');

var code = SteamTotp.generateAuthCode('');

var authID;
var gamesPlaying;

var Green = "\x1b[32m";
var Yellow = "\x1b[33m";
var Red = "\x1b[31m";
var Cyan = "\x1b[36m";
var White = "\x1b[37m";

var gamesfile = require('./games.js');

manager = new TradeOfferManager({
	"steam": user,
	"pollInterval": "10000",
	"cancelTime": "1800000"
});

const config = require('./config.json');

var gamesEnabled = config.gamesEnabled;
var logsEnabled = config.logsEnabled;

var consoleMessagePrefix = "[BOT]";

var appIDs = config.games.split(',').map(Number);

function sleep(seconds){
    var waitUntil = new Date().getTime() + seconds*1000;
    while(new Date().getTime() < waitUntil) true;
}

function stopGames() {
  clearInterval(gamesPlaying); 
  return false;
}

console.log(consoleMessagePrefix + " Estamos a logar...");
console.log(consoleMessagePrefix + " LOGIN COM SENTRY: Se o Login com sentry ocorrer o mesmo irá logar automaticamente utilizadores que usem o SteamGuard por EMAIL, desde que mão alterem a palavra passe ou a maquina em questão. ATENÇÃO: SE USARES NÃO APAGUES O FICHEIRO sentry CASO APAGUES IRÁS TER QUE LOGAR OUTRA VEZ!");
console.log(consoleMessagePrefix + " Caso tiveres 2FA na tua conta. O mesmo não irá afetar em nada.");

if (fs.existsSync('sentry'))
{
	user.setSentry(sentry);
    var sentry = fs.readFileSync('sentry');
    console.log(consoleMessagePrefix + ' A Logar com Sentry.');
		user.logOn({
			accountName: config.username,
			password: config.password,
			rememberPassword: true,
			shaSentryfile: sentry,
			twoFactorCode: code
		});
}
else
{
  console.log(consoleMessagePrefix + ' A logar sem Sentry. Insere o SteamGuard em baixo:');	
	user.logOn({
		accountName: config.username,
		password: config.password,
		rememberPassword: true,
		authcode: code,
		twoFactorCode: code
	});
	user.on('steamGuard', function(domain, callback) {
		console.log(consoleMessagePrefix + " Codigo do SteamGuard no Email que acaba em: " + domain);
		var code = getCodeSomehow();
		callback(code);
	});
}

user.on('sentry', function(sentryHash) {
    fs.writeFile('sentry',sentryHash,function(err) {
    if(err){
      console.log(consoleMessagePrefix + " Ocorreu um erro ao guardar o ficheiro sentry! ERRO: " + err);
	} else {
		console.log(consoleMessagePrefix + ' Ficheiro sentry criado e guardado.');
	}});
});

user.on('error', function(err) {
    if (err.eresult == Steam.EResult.InvalidPassword) {
		console.log(consoleMessagePrefix + " Password invalida.");
    } else if (err.eresult == Steam.EResult.AlreadyLoggedInElsewhere) {
		console.log(consoleMessagePrefix + " Logado em outro local.");
    } else if (err.eresult == Steam.EResult.AccountLogonDenied) {
		console.log(consoleMessagePrefix + " Necessita de SteamGuard.");
    } else if (err.eresult == Steam.EResult.TwoFactorCodeMismatch) {
		console.log(consoleMessagePrefix + " Codigo de 2FA errado!");
	} 
	setTimeout(function(){
		user.logOn({
			accountName: config.username,
			password: config.password,
			twoFactorCode: code,
			rememberPassword: true
		});
	}, 10000);
});

user.on('loggedOn', () => {
  user.setPersona(Steam.EPersonaState.Busy, '');
  user.getPersonas([user.steamID], (personas) => {
	console.log(consoleMessagePrefix + " Bem-vindo, " + personas[user.steamID].player_name + ", (" + user.steamID.getSteamID64() + ").");
	user.setPersona(SteamUser.Steam.EPersonaState.Busy);
  });
  user.gamesPlayed(appIDs);
  if (gamesEnabled) {
		gamesPlaying = setInterval(function random1() {
			user.gamesPlayed();
			sleep(2);
			var randomnumber = Math.floor(Math.random() * (gamesfile.customgames.length));
			var customgameplayingnow = gamesfile.customgames[randomnumber];
			//user.gamesPlayed([customgameplayingnow], appIDs);
			user.gamesPlayed(appIDs);
			if (logsEnabled) {
				console.log(consoleMessagePrefix + " Jogos e Custom Games a rodar começaram. Custom Game que estás a jogar agora: " + customgameplayingnow);
			}
		}, 180000);
		user.on('playingState', (blocked, playingApp) => {
			if (blocked === true) {
				console.log(consoleMessagePrefix + " Os seguites jogos:" + playingApp + " , já estão a ser jogados em outra sessão. Nesse caso apenas irão ser jogados os jogos costumizados, se pertender que os outros jogos sejam jogados, desligue os jogos e reinicie o BOT.");
				stopGames();
				user.gamesPlayed();
				sleep(2);
				setInterval(function random2() {
					var randomnumber = Math.floor(Math.random() * (gamesfile.customgames.length));
					var customgameplayingnow = gamesfile.customgames[randomnumber];
					user.gamesPlayed([customgameplayingnow]);
					if (logsEnabled) {
						console.log(consoleMessagePrefix + " Custom Games a rodar começaram. (APENAS CUSTOM GAMES!) Custom Game que estás a jogar agora: " + customgameplayingnow);
					}
				}, 180000);
			}		
		});
  }

  user.on("friendMessage", function(steamid, msg) {
	user.getPersonas([steamid], function(personas) {
		var persona = personas[steamid];
		var name = persona ? persona.player_name : ("[" + steamid + "]");
		if (logsEnabled) {
			console.log(consoleMessagePrefix + " " + name + " (" + steamid + ") enviou-te uma mensagem: " + msg + " .");
		}
	});
  });
});