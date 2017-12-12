var mongojs = require("mongojs");
var db = mongojs('localhost:27017/myGame2', ['account', 'progress']);//////Tomar en cuenta siempre el nombre de la base de datos
var express = require('express');
var app = express();
var serv = require ('http').Server(app);

app.get('/',function(req,res){
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");
var SOCKET_LIST = {};

var Entity = function(){
	var self = {
		x:250,
		y:250,
		velX:0,
		velY:0,
		id:"",
	}

	self.update = function(){
		self.updatePosition();
	}

	self.update = function(){
		self.x += self.velX;
		self.y += self.velY;
	}

	self.getDistance = function(pt){
		return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
	}

	return self;
}

var Jugador = function(id){
	var self = Entity();
	self.id = id;
	self.number = "" + Math.floor(10*Math.random());
	self.aptRight = false;
	self.aptLeft = false;
	self.aptUp = false;
	self.aptDown = false;
	self.aptAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 10;
	self.vida = 10;
	self.vidaMax = 10;
	self.score = 0;

	var super_update = self.update;
	self.update = function(){
		self.updateSpd();
		super_update();

		if(self.aptAttack){
			self.shootBala(self.mouseAngle);
		}
	}
	self.shootBala = function(angle){
		var b = Bala(self.id,angle);
		b.x = self.x;
		b.y = self.y;
	}

	//Velocidades para el movimiento del jugador
	self.updateSpd = function(){
		if(self.aptRight)
			self.velX += self.maxSpd;
		else if(self.aptLeft)
			self.velX -= self.maxSpd;
		else
			self.velX = 0;

		if(self.aptUp)
			self.velY += self.maxSpd;
		else if(self.aptDown)
			self.velY -= self.maxSpd;
		else
			self.velY = 0;
	}

	self.getInitPack = function(){
		return{
			id:self.id,
			x:self.x,
			y:self.y,
			number:self.number,
			vida:self.vida,
			vidaMax:self.vidaMax,
			score:self.score,
		};
	}

	self.getUpdatePack = function(){
		return{
			id:self.id,
			x:self.x,
			y:self.y,
			vida:self.vida,
			score:self.score,
		}
	}

	Jugador.list[id] = self;
	initPack.jugador.push(self.getInitPack());
	return self;
}
//Fin de la definici[on de jugador]

//Definicion de inputs de las teclas del jugador
//Tambien esta
Jugador.list = {};
Jugador.Conectado = function(socket){
	var jugador = Jugador(socket.id);
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			jugador.aptLeft = data.state;
		else if(data.inputId === 'right')
			jugador.aptRight = data.state;
		else if(data.inputId === 'up')
			jugador.aptUp = data.state;
		else if(data.inputId === 'down')
			jugador.aptDown = data.state;
		else if(data.inputId === 'attack')
			jugador.aptAttack = data.state;
	  else if(data.inputId === 'mouseAngle')
			jugador.mouseAngle = data.state;
	});

	socket.emit('init',{
		selfId:socket.id,
		jugador:Jugador.getAllInitPack(),
		bala:Bala.getAllInitPack(),
	})
}

Jugador.getAllInitPack = function(){
	var jugadores = [];
	for(var i in Jugador.list)
		jugadores.push(Jugador.list[i].getInitPack());
	return jugadores;
}

Jugador.Desconectado = function(socket){
	delete Jugador.list[socket.id];
	removePack.jugador.push(socket.id);
}

Jugador.update = function(){
	var pack = [];
	for(var i in Jugador.list){
		var jugador = Jugador.list[i];
		jugador.update();
		pack.push(jugador.getUpdatePack());
	}
	return pack;
}

var Bala = function(parent,angle){
	var self = Entity();
	self.id = Math.random();
	self.velX = Math.cos(angle/180*Math.PI) * 10;
	self.velY = Math.sin(angle/180*Math.PI) * 10;
	self.parent = parent;
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function(){
		if(self.timer++ > 100)
			self.toRemove = true;
		super_update();

		for(var i in Jugador.list){
			var j = Jugador.list[i];
			if(self.getDistance(j) < 32 && self.parent!==j.id){
				j.vida -= 1;

				if(j.vida < 0){
					var shooter = Jugador.list[self.parent];
					if(shooter)
						shooter.score += 1;
					j.vida = j.vidaMax;
					j.x = Math.random() * 500;
					j.y = Math.random() * 500;
				}
				self.toRemove = true;
			}
		}
	}

	self.getInitPack = function(){
		return{
			id:self.id,
			x:self.x,
			y:self.y,
		};
	}

	self.getUpdatePack = function(){
		return{
			id:self.id,
			x:self.x,
			y:self.y,
		}
	}

	Bala.list[self.id] = self;
	initPack.bala.push(self.getInitPack());
	return self;
}

Bala.list = {};

Bala.update = function(){
	var pack = [];
	for(var i in Bala.list){
		var bala = Bala.list[i];
		bala.update();
		if(bala.toRemove){
			delete Bala.list[i];
			removePack.bala.push(bala.id);
		}
		else
			pack.push(bala.getUpdatePack());
	}
	return pack;
}

Bala.getAllInitPack = function(){
	var balas = [];
	for(var i in Bala.list)
			balas.push(Bala.list[i],getInitPack());
	return balas;
}

var DEBUG = true;

var USERS = {
	"jose":"123",
	"jose2":"234"
};

var PasswordOK = function(data, cb){
	db.account.find({usuario:data.usuario,password:data.password},function(err,res){
		if(res.length>0)
			cb(true);
		else
			cb(false);
	});
}

var UsuarioRegistrado = function(data, cb){
	db.account.find({usuario:data.usuario},function(err,res){
		if(res.length>0)
			cb(true);
		else
			cb(false);
	});
}

var addUser = function(data, cb){
	db.account.insert({usuario:data.usuario,password:data.password},function(err){
		cb();
	});
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection',function(socket){
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	socket.on('signIn',function(data){
		PasswordOK(data,function(res){
			if(res)
			{
				Jugador.Conectado(socket);
				socket.emit('signInResponse',{success:true});
			}else{
				socket.emit('signInResponse',{success:false});
			}
		});
	});

	socket.on('signUp',function(data)
	{
		UsuarioRegistrado(data,function(res)
		{
			if(res)
			{
				socket.emit('signUpResponse',{success:false});
			}
			else
			{
				addUser(data,function(){
				socket.emit('signUpResponse',{success:true});
			});
			}
		});
	});

	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		Jugador.Desconectado(socket);
	});

	socket.on('sendMsgToServer',function(data){
		var jugadorName = ("" + socket.id).slice(2,7);
		for(var i in SOCKET_LIST){
			SOCKET_LIST[i].emit('addToChat', jugadorName + ': ' + data);
		}
	});

	socket.on('evalServer',function(data){
		if(!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer',res);
	});
});

var initPack = {jugador:[],bala:[]};
var removePack = {jugador:[],bala:[]};

setInterval(function(){
	var pack = {
		jugador:Jugador.update(),
		bala:Bala.update(),
	};

	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('init',initPack);
		socket.emit('update',pack);
		socket.emit('remove',removePack);
	}

	initPack.jugador=[];
	initPack.bala=[];
	removePack.jugador = [];
	removePack.bala=[];
},1000/25);
