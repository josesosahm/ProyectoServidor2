/*  inicializamos express*/
var express = require('express');

/* inicializamos la app con express */
var app = express();

/* inicializamos el serv */
var serv = require ('http').Server(app);
/* mostramos nuestra pagina de index */

app.get('/',function(req,res){
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

/* creamos un socket list para guardar a los usuarios que entran */
var SOCKET_LIST = {};

var Entity = function(){
	var self = {
		x:250,
		y:250,
		spdX:0,
		spdY:0,
		id:"",
	}

	self.update = function(){
		self.updatePosition();
	}

	self.update = function(){
		self.x += self.spdX;
		self.y += self.spdY;
	}

	return self;
}


//nuestro modelo de player
var Player = function(id){
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10*Math.random());
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.maxSpd = 10;

	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();
	}

	self.updateSpd = function(){
		if(self.pressingRight)
			self.spdX += self.maxSpd;
		else if(self.pressingLeft)
			self.spdX -= self.maxSpd;
		else
			self.spdX = 0;

		if(self.pressingUp)
			self.spdY += self.maxSpd;
		else if(self.pressingDown)
			self.spdY -= self.maxSpd;
		else
			self.spdY = 0;
	}
	Player.list[id] = self;
	return self;
}

Player.list = {};

Player.onConnect = function(socket){
	//creamos nuestro player
	var player = Player(socket.id);
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
	});
}

//si el player se desconecta lo quitamos de
//nuestra app
Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}
//actualizamos cada jugador player
Player.update = function(){
	var pack = [];
	for(var i in Player.list){
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			number:player.number
		});
	}
	return pack;
}

/*=============================================
=            bullet - balas        =
=============================================*/
//model de nuestro bullet
var Bullet = function(angle){
	var self =Entity();
	self.id = Math.random();
	self.spdX = Math.cos(angle/180*Math.PI) *10
	self.spdY = Math.sin(angle/180*Math.PI) *10
	self.timer = 0;
	self.toRemove = false;

	var super_update = self.update
	self.update = function(){
		if(self.timer++ >100)
			self.toRemove = true
		super_update()
	}

	//anadimos a una lista de balas
	Bullet.list[self.id] = self
	//retornamos 
	return self
}
//creamos nuestro arrelo para guardar las balas
Bullet.list = {}


//actualizando
Bullet.update = function(){
	if (Math.random() < 0.1) {
		Bullet(Math.random()*360)
	}

	var pack = [];
	for(var i in Bullet.list){
		var bullet = Bullet.list[i];
		bullet.update();
		pack.push({
			x:bullet.x,
			y:bullet.y
		});
	}
	return pack;
}


/*=====  End obullet - balas  ======*/


var io = require('socket.io')(serv,{});
io.sockets.on('connection',function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	Player.onConnect(socket);

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
});

/*=============================================
= creacion de un intervalo para actualizar nuestro canvas 25 fps 
=============================================*/
setInterval(function(){
	var pack = {
		player: Player.update(),
		bullet: Bullet.update()

	}

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack);
	}
},1000/25);


/*=====  End of Section intervalo ======*/



