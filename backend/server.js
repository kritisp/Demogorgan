const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const GameManager = require('./gameManager');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const gameManager = new GameManager(io);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  gameManager.handleConnection(socket);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    gameManager.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
