# agar-io

A minimal multiplayer **[agar.io](https://agar.io)** clone: Node.js + Express + **Socket.IO** on the server, a plain HTML5 canvas client. Move your cell with the mouse, eat food pellets and smaller players to grow, get eaten by bigger ones.

## How It Works

- **Server** (`index.js`) — keeps the authoritative world state (players, food). On every `playerSendTarget` heartbeat it moves the player toward their mouse target, resolves food and player-vs-player collisions by distance check (a player eats another only when sufficiently more massive), respawns food, and broadcasts the updated world. Eaten players get an `RIP` event and are disconnected.
- **Client** (`js/app.js`, `index.html`) — prompts for a name, connects over Socket.IO, sends the mouse position each animation frame, and renders the camera-centered world (food, enemies, you, and a grid) on a canvas. Includes an in-game chat box with a `-ping` latency command.

## Running

```bash
npm install express socket.io
node index.js
```

Then open `http://127.0.0.1:5000` in one or more browser tabs (the client's server address is hardcoded in `js/app.js`; change it to play over a LAN).

## Status

A weekend-project snapshot of the early agar.io-clone era: no rooms, no mass decay, no cell splitting or ejecting, and the trust model is "the client is honest". Fun as a Socket.IO study, not a production game.
