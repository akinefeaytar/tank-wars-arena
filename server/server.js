const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const GameManager = require('./GameManager');
const LeaderboardStore = require('./LeaderboardStore');
const MapData = require('./MapData');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// Initialize Game Manager
const gameManager = new GameManager(io);

// REST API Endpoints
app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({
    status: 'ok',
    leaderboard: LeaderboardStore.getLeaderboard(limit)
  });
});

app.get('/api/rooms', (req, res) => {
  res.json({
    status: 'ok',
    rooms: gameManager.getPublicRoomList()
  });
});

app.get('/api/maps', (req, res) => {
  res.json({
    status: 'ok',
    maps: MapData.getMaps()
  });
});

app.get('/api/player/:name', (req, res) => {
  const player = LeaderboardStore.getOrCreatePlayer(req.params.name);
  res.json({
    status: 'ok',
    player
  });
});

// Socket.IO Realtime Events
io.on('connection', (socket) => {
  console.log(`[Socket] Oyuncu bağlandı: ${socket.id}`);

  // Send current leaderboards immediately
  socket.emit('leaderboard_update', LeaderboardStore.getLeaderboard(20));

  // Player joins game (either quick play or specific room)
  socket.on('join_game', ({ name, roomId, customization }) => {
    const cleanName = (name || 'Tankçı').trim().substring(0, 16);
    gameManager.joinPlayer(socket, roomId, cleanName, customization || {});
  });

  // Host creates custom room for friends
  socket.on('create_room', (roomOptions, callback) => {
    const { creatorName, name, botCount, botDifficulty, mode, mapId, killLimit, duration, customization } = roomOptions || {};
    const cleanCreator = (creatorName || 'Komutan').trim().substring(0, 16);
    
    const { roomId, roomCode } = gameManager.createCustomRoom(cleanCreator, {
      name,
      mode: mode || 'ffa',
      botDifficulty: botDifficulty || 'normal',
      botCount: botCount !== undefined ? parseInt(botCount, 10) : 4,
      mapId: mapId || 'classic',
      killLimit: killLimit ? parseInt(killLimit, 10) : 25,
      duration: duration ? parseInt(duration, 10) : 300
    });

    gameManager.joinPlayer(socket, roomId, cleanCreator, customization || {});

    if (typeof callback === 'function') {
      callback({ success: true, roomId, roomCode });
    }
  });

  // Player input payload
  socket.on('player_input', (inputData) => {
    gameManager.handlePlayerInput(socket.id, inputData);
  });

  // In-game tactical chat / quick emotes
  socket.on('send_chat', (messageText) => {
    const roomId = gameManager.playerRoomMap.get(socket.id);
    if (!roomId) return;
    const room = gameManager.rooms.get(roomId);
    if (!room) return;
    const tank = room.findTankById(socket.id);
    if (!tank) return;

    const cleanMsg = (messageText || '').trim().substring(0, 80);
    if (cleanMsg.length > 0) {
      io.to(roomId).emit('chat_broadcast', {
        sender: tank.name,
        color: tank.color,
        message: cleanMsg,
        time: Date.now()
      });
    }
  });

  // Player manually leaves game / returns to lobby
  socket.on('leave_game', () => {
    console.log(`[Socket] Oyuncu maçtan ayrıldı: ${socket.id}`);
    gameManager.leavePlayer(socket.id);
  });

  // Request refreshed ranking
  socket.on('get_leaderboard', () => {
    socket.emit('leaderboard_update', LeaderboardStore.getLeaderboard(50));
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Oyuncu ayrıldı: ${socket.id}`);
    gameManager.leavePlayer(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎮 TANK WARS ARENA`);
  console.log(`🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`===============================================`);
});

