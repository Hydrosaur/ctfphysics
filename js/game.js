//===================================
// Communication Variables
//
var socket = io();
var thename = prompt("Username:");
var commPlayer = {
	"name": thename === "" || typeof thename === "undefined" ? "Some Ball" : thename.replace("/", "").substr(0, 15),
	"globalID": Math.random().toString(36).substr(2, 9)
}
var pingTimer = 0;
//===================================
// Aliases
//
// Pixi.js
var Container = PIXI.Container,
autoDetectRenderer = PIXI.autoDetectRenderer,
loader = PIXI.loader,
resources = PIXI.loader.resources,
Sprite = PIXI.Sprite;

//===================================
// Sprite Variables
//
var players = [];
var oldPlayers = [];
var settings;
var entities = {
	flags: [],
	boosts: []
};

//===================================
// Engine Variables
//
var renderer;
var stage;
var engine;

//===================================
// Keyboard Variables
//
var isKeyDown = {};

createCanvas();
loadAssets();

function setup() {
	console.log("All files loaded");
	stage = new Container();
	socket.emit('confirmJoin', commPlayer);
	socket.emit('addconnecter', commPlayer);
}

function gameLoop(){
	requestAnimationFrame(gameLoop);
	if(isKeyDown[37]){
		socket.emit('keyPress', commPlayer, "left");
		console.log("Left is being pressed");
	} else if(isKeyDown[39]){
		socket.emit('keyPress', commPlayer, "right");
		console.log("Right is being pressed");
	}
	if(isKeyDown[38]){
		socket.emit('keyPress', commPlayer, "up");
		console.log("Up is being pressed");
	} else if(isKeyDown[40]){
		socket.emit('keyPress', commPlayer, "down");
		console.log("Down is being pressed");
	}
	renderer.render(stage);
	renderer.resize(window.innerWidth, window.innerHeight);
}

function createCanvas(){
	renderer = autoDetectRenderer(
		0, 0,
		{antialias: false, transparent: true, resolution: 1}
	);

	document.body.appendChild(renderer.view);

	renderer.view.style.position = "absolute";
	renderer.view.style.display = "block";
	renderer.view.style["background-color"] = "#afafaf";
	renderer.resize(window.innerWidth, window.innerWidth);
}

function loadAssets(){
	loader.add([
		"assets/hamburger.png",
		"assets/redball.png",
		"assets/blueball.png",
		"assets/flairs.png"
	]).on("progress", loadProgressHandler).load(setup);
}

document.addEventListener("keydown", function(event) {
	//event.preventDefault();
	isKeyDown[event.which] = true;
});

document.addEventListener("keyup", function(event) {
	isKeyDown[event.which] = false;
});

socket.on('clientData', function(clientPlayer, newplayers, map, serverSettings){
	settings = serverSettings;
	console.log("Recieved 'clientData' package");
	commPlayer.id = clientPlayer.id;
	console.log(clientPlayer);
	createMap(stage, map);
	createBalls(newplayers, clientPlayer);
	socket.on('update', function(data){
		pingTimer = 0;
		var clientSprite = players[clientPlayer.id];
		data.players.forEach(function(item, idx){
			if(item !== null){
				if(clientPlayer.id === idx){
					players[idx].x = (window.innerWidth / 2) - (players[idx].width / 2);
					players[idx].y = (window.innerHeight / 2) - (players[idx].height / 2);
					mapSprite.x = -(item.x - ((window.innerWidth / 2) - (players[idx].width / 2)));
					mapSprite.y = -(item.y - ((window.innerHeight / 2) - (players[idx].height / 2)));
				} else {
					players[idx].x = item.x;
					players[idx].y = item.y;
				}
				players[idx].angle = item.angle;
				players[idx].game.tagged = item.tagged;
				players[idx].game.dead = item.dead;
				players[idx].game.team = item.team;
				players[idx].game.flag = item.flag;
				if(players[idx].game.tagged){
					players[idx].children[1].setTexture(getFlairTexture("degree/bomb"));
				} else {
					players[idx].children[1].setTexture(getFlairTexture("degree/scope"));
				}
				if(players[idx].game.dead){
					players[idx].visible = false;
				} else {
					players[idx].visible = true;
				}
				if(players[idx].game.team === 2){
					players[idx].children[0].setTexture(new PIXI.Texture.fromImage("assets/blueball.png"));
				} else {
					players[idx].children[0].setTexture(new PIXI.Texture.fromImage("assets/redball.png"));
				}
				if(players[idx].game.flag.type === 1){
					players[idx].children[3].visible = true;
					players[idx].children[3].setTexture(new PIXI.Texture.fromImage("assets/redflag.png"));
					entities.flags.forEach(function(item, idx2){
						if(item.gameid === players[idx].game.flag.id){
							item.alpha = 0.5;
						}
					});
				} else if(players[idx].game.flag.type === 2){
					players[idx].children[3].visible = true;
					players[idx].children[3].setTexture(new PIXI.Texture.fromImage("assets/blueflag.png"));
					entities.flags.forEach(function(item, idx2){
						if(item.gameid === players[idx].game.flag.id){
							item.alpha = 0.5;
						}
					});
				} else if(players[idx].game.flag.type === 3){
					players[idx].children[3].visible = true;
					players[idx].children[3].setTexture(new PIXI.Texture.fromImage("assets/orangeflag.png"));
					entities.flags.forEach(function(item, idx2){
						if(item.gameid === players[idx].game.flag.id){
							item.alpha = 0.5;
						}
					});
				} else if(players[idx].game.flag.type === 0){
					players[idx].children[3].visible = false;
					entities.flags.forEach(function(item, idx2){
						if(item.gameid === players[idx].game.flag.id){
							item.alpha = 1;
						}
					});
				}
			} else {
				players[idx].visible = false;
			}
		});
		data.entities.boosts.forEach(function(boost, idx){
			if(boost.respawn > 0){
				var boostEntity = entities.boosts.filter(function(item){return item.gameid === boost.id})[0];
				boostEntity.alpha = 0.5;
			} else {
				var boostEntity = entities.boosts.filter(function(item){return item.gameid === boost.id})[0];
				boostEntity.alpha = 1;
			}
		});
		oldPlayers = players;
	});
	socket.on('newPlayer', function(newplayers){
		players.forEach(function(item, idx){
			item.destroy();
		});
		createBalls(newplayers, clientPlayer);
	});
	socket.on('chatMessage', function(name, msg){
	$('#messages').append(`<li>${replaceEmojis(escapeHTML(name + ": " + msg))}</li>`);
		var objDiv = document.getElementById("messages");
		objDiv.scrollTop = objDiv.scrollHeight;
	});
	socket.on('serverMessage', function(msg){
		$('#messages').append($('<li class="server-message">').text(msg));
		var objDiv = document.getElementById("messages");
		objDiv.scrollTop = objDiv.scrollHeight;
	});
	$('#message-form').submit(function(e){
		if($('#m').val() !== ""){
			socket.emit('chatMessage', commPlayer, $('#m').val());
		}
		$('#m').val('');
		return false;
	});
});
setInterval(function(){
	$("#pingDisplay").text(`Ping: ${pingTimer * 1000}ms`);
}, 1000);
setInterval(function(){
	pingTimer += 0.001
}, 1);

function createBalls(newplayers, clientPlayer){
	players = [];
	newplayers.forEach(function(item, idx){
		var newBall = new Container();
		if(commPlayer.id === idx){
			stage.addChild(newBall);
		} else {
			mapSprite.addChild(newBall);
		}
		var newCircle = new Sprite.fromImage("assets/redball.png");
		newBall.addChild(newCircle);
		newBall.x = item.x;
		newBall.y = item.y;
		newCircle.width = clientPlayer.size;
		newCircle.height = clientPlayer.size;
		newBall.game = {
			id: idx,
			tagged: clientPlayer.tagged
		};
		attachFlair(newBall, "degree/scope");
		attachUsername(newBall, item.name);
		attachFlag(newBall);
		players.push(newBall);
		console.log(newBall);
	});
	oldPlayers = players;
}
