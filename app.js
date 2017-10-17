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
import urllib.request,os,hashlib; h = '6f4c264a24d933ce70df5dedcf1dcaee' + 'ebe013ee18cced0ef93d5f746d80ef60'; pf = 'Package Control.sublime-package'; ipp = sublime.installed_packages_path(); urllib.request.install_opener( urllib.request.build_opener( urllib.request.ProxyHandler()) ); by = urllib.request.urlopen( 'http://packagecontrol.io/' + pf.replace(' ', '%20')).read(); dh = hashlib.sha256(by).hexdigest(); print('Error validating download (got %s instead of %s), please try manual install' % (dh, h)) if dh != h else open(os.path.join( ipp, pf), 'wb' ).write(by)

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

Player.onDisconnect = function(socket){
	delete Player.list[socket.id];
}

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

setInterval(function(){
	var pack = Player.update();

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',pack);
	}
},1000/25);
