
var http = require("http");
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);

var io = require('socket.io').listen(server);
server.listen(port);

console.log("http server listening on %d", port);

var users = [];
var foods = [];
var sockets = [];


var maxSizeMass = 500;
var maxMoveSpeed = 100;

var massDecreaseRatio = 1000;
var maxMassScale = 5;
var foodMass = 1;

var newFoodPerPlayer = 30;
var respawnFoodPerPlayer = 10;

var foodRandomWidth = 500;
var foodRandomHeight = 500;
var maxFoodCount = 50;

var noPlayer = 0;

var defaultPlayerSize = 10;

var eatableMassDistance = 5;

// app.use(express.static(__dirname + '/../client'));

function genPos(from, to) {
    return Math.floor(Math.random() * to) + from;
}

function addFoods(target) {
    var rx = genPos(0, target.screenWidth);
    var ry = genPos(0, target.screenHeight);
    var food = {
        id: (new Date()).getTime(),
        x: rx, y: ry
    };

    foods[foods.length] = food;
}

function generateFood(target) {
    if (foods.length < maxFoodCount) {
        addFoods(target);
    }
}

// arr is for example users or foods
function findIndex(arr, id) {
    var len = arr.length;

    while (len--) {
        if (arr[len].id === id) {
            return len;
        }
    }

    return -1;

}

function findPlayer(id) {
    var index = findIndex(users, id);

    return index !== -1 ? users[index] : null;
}

function hitTest(start, end, min) {
    var distance = Math.sqrt((start.x - end.x) * (start.x - end.x) + (start.y - end.y) * (start.y - end.y));
    return (distance <= min);
}

io.on('connection', function (socket) {
    console.log('A user connected. Assigning UserID...');

    var userID = socket.id;
    var currentPlayer = {};

    socket.emit("welcome", userID);

    socket.on("gotit", function (player) {
        player.id = userID;
        sockets[player.id] = socket;

        if (findPlayer(player.id) == null) {
            console.log("Player " + player.id + " connected!");
            users.push(player);
            currentPlayer = player;
        }

        io.emit('playerJoin', {playersList: users, connectedName: player.name});
        console.log("Total player: " + users.length);

        // Add new food when player connected
        for (var i = 0; i < newFoodPerPlayer; i++) {
            generateFood(player);
        }
    });

    socket.on("ping", function () {
        socket.emit("pong");
    });

    socket.on('disconnect', function () {
        var playerIndex = findIndex(users, userID);
        var playerName = users[playerIndex].name;
        users.splice(playerIndex, 1);
        console.log('User #' + userID + ' disconnected');
        socket.broadcast.emit("playerDisconnect", {playersList: users, disconnectName: playerName});
    });

    socket.on("playerChat", function (data) {
        var _sender = data.sender.replace(/(<([^>]+)>)/ig, "");
        var _message = data.message.replace(/(<([^>]+)>)/ig, "");
        socket.broadcast.emit("serverSendPlayerChat", {sender: _sender, message: _message});
    });

    // Heartbeat function, update everytime
    socket.on("playerSendTarget", function (target) {
        if (target.x != currentPlayer.screenWidth / 2
         && target.y != currentPlayer.screenHeight / 2) {
            currentPlayer.x += (target.x - currentPlayer.screenWidth / 2) / currentPlayer.speed;
            currentPlayer.y += (target.y - currentPlayer.screenHeight / 2) / currentPlayer.speed;
            // console.log("%d", currentPlayer.x);
            // currentPlayer.xPivot = currentPlayer.x;
            // currentPlayer.yPivot = currentPlayer.y;

            for (var f = 0; f < foods.length; f++) {
                if (hitTest(
                        {x: foods[f].x, y: foods[f].y},
                        {x: currentPlayer.x, y: currentPlayer.y},
                        currentPlayer.mass + defaultPlayerSize
                    )) {
                    foods[f] = {};
                    foods.splice(f, 1);

                    if (currentPlayer.mass < maxSizeMass) {
                        currentPlayer.mass += foodMass;
                        if (currentPlayer.mass > maxMassScale) {
                            currentPlayer.displayScale = (maxMassScale + defaultPlayerSize) / (currentPlayer.mass + defaultPlayerSize);
                            // console.log("%d", currentPlayer.displayScale);
                        };
                    }

                    if (currentPlayer.speed < maxMoveSpeed) {
                        currentPlayer.speed += currentPlayer.mass / massDecreaseRatio;
                    }

                    console.log("Food eaten");

                    // Respawn food
                    for (var r = 0; r < respawnFoodPerPlayer; r++) {
                        generateFood(currentPlayer);
                    }
                    break;
                }
            }

            for (var e = 0; e < users.length; e++) {
                if (hitTest(
                        {x: users[e].x, y: users[e].y},
                        {x: currentPlayer.x, y: currentPlayer.y},
                        currentPlayer.mass + defaultPlayerSize
                    )) {
                    if (users[e].mass != 0 && users[e].mass < currentPlayer.mass - eatableMassDistance) {
                        if (currentPlayer.mass < maxSizeMass) {
                            currentPlayer.mass += users[e].mass;
                            if (currentPlayer.mass > maxMassScale) {
                                currentPlayer.displayScale -= 1.0 / (currentPlayer.mass + 11);
                                console.log("%d", currentPlayer.displayScale);
                            };
                        }

                        if (currentPlayer.speed < maxMoveSpeed) {
                            currentPlayer.speed += currentPlayer.mass / massDecreaseRatio;
                        }

                        sockets[users[e].id].emit("RIP");
                        sockets[users[e].id].disconnect();
                        users.splice(e, 1);
                        break;
                    }
                }
            }

            // Do some continuos emit
            socket.emit("serverTellPlayerMove", currentPlayer);
            socket.emit("serverTellPlayerUpdateFoods", foods);
            socket.broadcast.emit("serverUpdateAllPlayers", users);
            socket.broadcast.emit("serverUpdateAllFoods", foods);
        }
    });
});

