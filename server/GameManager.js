const GameRoom = require('./GameRoom');
const LeaderboardStore = require('./LeaderboardStore');

class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRoomMap = new Map(); // socketId -> roomId

    // Default public lobby room
    this.getOrCreateRoom('public_arena', {
      name: 'Genel Savaş Arenası',
      isPrivate: false,
      botCount: 4,
      mapId: 'classic'
    });

    this.startBroadcastLoop();
  }

  getOrCreateRoom(roomId, options = {}) {
    if (!this.rooms.has(roomId)) {
      const room = new GameRoom(roomId, options);
      this.rooms.set(roomId, room);
      console.log(`[GameManager] Oda açıldı: ${roomId} (${room.name})`);
    }
    return this.rooms.get(roomId);
  }

  createCustomRoom(creatorName, options = {}) {
    const customCode = (options.roomCode || Math.random().toString(36).substring(2, 7)).toUpperCase();
    const roomId = `room_${customCode}`;

    const room = this.getOrCreateRoom(roomId, {
      name: options.name || `${creatorName}'in Özel Odası`,
      isPrivate: true,
      botCount: options.botCount !== undefined ? options.botCount : 4,
      mapId: options.mapId || 'classic',
      killLimit: options.killLimit || 25,
      duration: options.duration || 300
    });

    return { roomId, roomCode: customCode, room };
  }

  joinPlayer(socket, roomId, playerName) {
    // Leave previous room if any
    this.leavePlayer(socket.id);

    const targetRoomId = roomId || 'public_arena';
    const room = this.getOrCreateRoom(targetRoomId);

    const tank = room.addPlayer(socket.id, playerName);
    this.playerRoomMap.set(socket.id, targetRoomId);
    socket.join(targetRoomId);

    console.log(`[GameManager] ${playerName} odaya katıldı: ${targetRoomId}`);

    // Send initial join confirmation
    socket.emit('joined_room', {
      roomId: targetRoomId,
      roomName: room.name,
      playerId: socket.id,
      tank,
      map: room.map
    });

    return room;
  }

  leavePlayer(socketId) {
    if (this.playerRoomMap.has(socketId)) {
      const roomId = this.playerRoomMap.get(socketId);
      const room = this.rooms.get(roomId);
      if (room) {
        room.removePlayer(socketId);
        // If private room is completely empty, clean it up
        if (room.isPrivate && room.players.size === 0) {
          room.stopLoop();
          this.rooms.delete(roomId);
          console.log(`[GameManager] Boş kalan özel oda kapatıldı: ${roomId}`);
        }
      }
      this.playerRoomMap.delete(socketId);
    }
  }

  handlePlayerInput(socketId, inputData) {
    const roomId = this.playerRoomMap.get(socketId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (room) {
      room.handlePlayerInput(socketId, inputData);
    }
  }

  startBroadcastLoop() {
    setInterval(() => {
      for (const [roomId, room] of this.rooms) {
        const snapshot = room.getSnapshot();
        this.io.to(roomId).emit('game_state', snapshot);
      }
    }, 1000 / 30); // 30 FPS network sync
  }

  getPublicRoomList() {
    const list = [];
    for (const [id, room] of this.rooms) {
      list.push({
        id,
        name: room.name,
        isPrivate: room.isPrivate,
        mapId: room.mapId,
        players: room.players.size,
        bots: room.bots.size,
        maxPlayers: room.maxPlayers
      });
    }
    return list;
  }
}

module.exports = GameManager;

