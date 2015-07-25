var playerName = prompt("Your name please:").replace(/(<([^>]+)>)/ig,"");

// Canvas
var gameWidth = 3000;
var gameHeight = 3000;


var socket;
socket = io.connect('127.0.0.1:5000');
var gameStart = false;
var disconnected = false;

var startPingTime = 0;

var KEY_ENTER = 13;

var foodConfig = {
  border: 2,
  borderColor: "#f39c12",
  fillColor: "#f1c40f",
  size: 5
};

var aliasConfig = {
  width: 2,
  spacing: 30,       //px
  color: "#ff0000"
}

var playerConfig = {
  border: 3,
  borderColor: "#c0392b",
  fillColor: "#ea6153",
  textColor: "#FFFFFF",
  textBorder: "#000000",
  textBorderSize: 3,
  defaultSize: 10
};

var enemyConfig = {
  border: 3,
  borderColor: "#27ae60",
  fillColor: "#2ecc71",
  textColor: "#FFFFFF",
  textBorder: "#000000",
  textBorderSize: 3,
  defaultSize: 10
};

var player = {
  playerID: -1,
  x: window.innerWidth / 2, y: window.innerHeight / 2,
  mass: 0, speed: 80,
  displayScale: 1,
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight
};

var foods = [];
var enemies = [];
var target = {x: player.x, y: player.y};

var c = document.getElementById("cvs");
c.addEventListener("mousemove", gameInput, false);
c.width = window.innerWidth; c.height = window.innerHeight;

var graph = c.getContext("2d");

var chatInput = document.getElementById("chatInput");
chatInput.addEventListener("keypress", sendChat);

// Chat
function addChatLine(name, text) {
  var chatLine = document.createElement("li");
  chatLine.className = (name == player.name)?"me":"friend";
  chatLine.innerHTML = "<b>" + name + "</b>: " + text;
  var chatList = document.getElementById("chatList");
  chatList.insertBefore(chatLine, chatList.childNodes[0]);
}

function addSystemLine(text) {
  var chatLine = document.createElement("li");
  chatLine.className = "system";
  chatLine.innerHTML = text;
  var chatList = document.getElementById("chatList");
  chatList.insertBefore(chatLine, chatList.childNodes[0]);
}

function checkLatency() {
  // Ping
  startPingTime = Date.now();
  socket.emit("ping");
}

function sendChat(key) {
  var key = key.which || key.keyCode;
  if (key == KEY_ENTER) {
    var text = chatInput.value.replace(/(<([^>]+)>)/ig,"");
    if (text != "") {
      if (text != "-ping") {
        socket.emit("playerChat", { sender: player.name, message: text });
        addChatLine(player.name, text);
      } else {
        checkLatency();
      }
      chatInput.value = "";
    }
  }
}

// Handle ping
socket.on("pong", function(){
  var latency = Date.now() - startPingTime;
  console.log("Latency: " + latency + "ms");
  addSystemLine("Ping: " + latency + "ms");
});

// Handle error
socket.on("connect_failed", function() {
  socket.close();
  disconnected = true;
});

socket.on("disconnect", function() {
  socket.close();
  disconnected = true;
});

// Handle connection
socket.on("welcome", function(userID) {
  player.playerID = userID;
  player.name = playerName;
  console.log("Scale:" + player.displayScale);
  // if (player.name == "尤靖蓉") {
  //   playerConfig.defaultSize = 100;
  // };
  socket.emit("gotit", player);
  gameStart = true;
  console.log("Game is started: " + gameStart);
  addSystemLine("Connected to the game!");
});

socket.on("playerDisconnect", function(data) {
  enemies = data.playersList;
  document.getElementById("status").innerHTML = "Players: " + enemies.length;
  addSystemLine("Player <b>" + data.disconnectName + "</b> disconnected!");
});

socket.on("playerJoin", function(data) {
  console.log(data);
  enemies = data.playersList;
  document.getElementById("status").innerHTML = "Players: " + enemies.length;
  addSystemLine("Player <b>" + data.connectedName + "</b> joined!");
});

// Chat
socket.on("serverSendPlayerChat", function(data){
  addChatLine(data.sender, data.message);
});

// Handle movement
socket.on("serverTellPlayerMove", function(playerData) {
  player = playerData;
});

socket.on("serverUpdateAllPlayers", function(players) {
  enemies = players;
});


// Update others
socket.on("serverTellPlayerUpdateFoods", function(foodsList) {
  foods = foodsList;
});

socket.on("serverUpdateAllFoods", function(foodsList) {
  foods = foodsList;
});


// Die
socket.on("RIP", function(){
  gameStart = false;
  socket.close();
});


function drawFood(food) {
  graph.strokeStyle = foodConfig.borderColor;
  graph.fillStyle = foodConfig.fillColor;
  graph.lineWidth = foodConfig.border;
  graph.beginPath();
  graph.arc(food.x - player.x + player.screenWidth / 2, food.y - player.y + player.screenHeight / 2, foodConfig.size, 0, 2 * Math.PI);
  graph.stroke();
  graph.fill();
}

function drawPlayer() {
  graph.strokeStyle = playerConfig.borderColor;
  graph.fillStyle = playerConfig.fillColor;
  graph.lineWidth = playerConfig.border;
  graph.beginPath();
  graph.arc(player.screenWidth / 2, player.screenHeight / 2, (playerConfig.defaultSize + player.mass) * player.displayScale, 0, 2 * Math.PI);
  graph.stroke();
  graph.fill();

  var fontSize = ((player.mass / 2) + playerConfig.defaultSize) * player.displayScale;
  graph.lineWidth = playerConfig.textBorderSize;
  graph.textAlign = "center";
  graph.fillStyle = playerConfig.textColor;
  graph.textBaseline = 'middle';
  graph.strokeStyle = playerConfig.textBorder;
  graph.font = "bold " + fontSize + "px sans-serif";
  graph.strokeText(player.name, player.screenWidth / 2, player.screenHeight / 2);
  graph.fillText(player.name, player.screenWidth / 2, player.screenHeight / 2);
}

function drawEnemy(enemy) {
  graph.strokeStyle = enemyConfig.borderColor;
  graph.fillStyle = enemyConfig.fillColor;
  graph.lineWidth = enemyConfig.border;
  graph.beginPath();
  graph.arc(enemy.x - player.x + player.screenWidth / 2, enemy.y - player.y + player.screenHeight / 2, 
    (enemyConfig.defaultSize + enemy.mass) * player.displayScale, 0, 2 * Math.PI);
  graph.fill();
  graph.stroke();

  var fontSize = ((enemy.mass / 2) + enemyConfig.defaultSize) * player.displayScale;

  graph.lineWidth = enemyConfig.textBorderSize;
  graph.textAlign = "center";
  graph.fillStyle = enemyConfig.textColor;
  graph.textBaseline = 'middle';
  graph.strokeStyle = enemyConfig.textBorder;
  graph.font = "bold " + fontSize + "px sans-serif";
  graph.strokeText(enemy.name, enemy.x - player.x+ player.screenWidth / 2, enemy.y - player.y + player.screenHeight / 2);
  graph.fillText(enemy.name, enemy.x - player.x + player.screenWidth / 2, enemy.y - player.y+ player.screenHeight / 2);
}

function drawAlias() {
  graph.lineWidth = aliasConfig.width;
  graph.strokeStyle = aliasConfig.color;
  
  
  var xmin = player.x - player.screenWidth / player.displayScale;
  var xmax = player.x + player.screenWidth / player.displayScale;
  xmin = Math.floor(xmin / aliasConfig.spacing) * aliasConfig.spacing;
  xmax = Math.ceil(xmax / aliasConfig.spacing) * aliasConfig.spacing;
  for (var i = xmin; i <= xmax; i += aliasConfig.spacing) {
    var x = (i - player.x) * player.displayScale + player.screenWidth / 2;
    graph.beginPath();
    graph.moveTo(x, 0);
    graph.lineTo(x, player.screenHeight);
    graph.stroke();
  };

}

function gameInput(mouse) {
  target.x = mouse.clientX;
  target.y = mouse.clientY;
}

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 120);
          };
})();

(function animloop(){
  requestAnimFrame(animloop);
  gameLoop();
})();

function gameLoop() {
  if (!disconnected) {
    if (gameStart) {
      graph.fillStyle = "#EEEEEE";
      graph.fillRect(0, 0, player.screenWidth, player.screenHeight);

      for (var i = 0; i < foods.length; i++) {
        drawFood(foods[i]);
      }

      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].playerID != player.playerID) {
          drawEnemy(enemies[i]);
        }
      }

      drawPlayer();
      socket.emit("playerSendTarget", target);
      document.getElementById("pos").innerHTML = "Postion: (" + (player.x / 10).toFixed(0) + "," + (player.y / 10).toFixed(0) + ")";
      drawAlias();
    } else {
      graph.fillStyle = "#333333";
      graph.fillRect(0, 0, player.screenWidth, player.screenHeight);

      graph.textAlign = "center";
      graph.fillStyle = "#FFFFFF";
      graph.font = "bold 30px sans-serif";
      graph.fillText("Game Over!", player.screenWidth / 2, player.screenHeight / 2);
    }
  } else {
    graph.fillStyle = "#333333";
    graph.fillRect(0, 0, player.screenWidth, player.screenHeight);

    graph.textAlign = "center";
    graph.fillStyle = "#FFFFFF";
    graph.font = "bold 30px sans-serif";
    graph.fillText("Disconnected!", player.screenWidth / 2, player.screenHeight / 2);
  }
}