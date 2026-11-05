class GameClient {
  constructor() {
    this.socket = null;
    this.localPlayerId = null;
    this.gameState = null;
    this.renderer = null;
    this.particles = null;

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      aimAngle: 0,
      shoot: false,
      dash: false
    };

    this.mousePos = { x: 0, y: 0 };
    this.lastShootState = false;
    this.prevBullets = new Map();
    this.prevTanks = new Map();
  }

  init(renderer, particles) {
    this.renderer = renderer;
    this.particles = particles;
    this.socket = io();

    this.bindNetworkEvents();
    this.bindInputEvents();
    this.startClientLoop();
  }

  bindNetworkEvents() {
    this.socket.on('joined_room', (data) => {
      this.localPlayerId = data.playerId;
      console.log('Odaya bağlanıldı:', data);
      
      // Update UI header
      const titleElem = document.getElementById('hudRoomTitle');
      if (titleElem) titleElem.textContent = data.roomName;
      
      const codeElem = document.getElementById('hudRoomCode');
      if (codeElem) codeElem.textContent = `#${data.roomId.replace('room_', '')}`;
    });

    this.socket.on('game_state', (state) => {
      this.processStateDelta(state);
      this.gameState = state;
      window.UI.updateHUD(state, this.localPlayerId);
    });

    this.socket.on('chat_broadcast', (msg) => {
      window.UI.addChatMessage(msg);
    });

    this.socket.on('leaderboard_update', (leaderboard) => {
      window.UI.updateLeaderboardModal(leaderboard);
    });
  }

  bindInputEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.inputState.up = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.inputState.down = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.inputState.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.inputState.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'Space':
          this.inputState.dash = true;
          window.audioManager.playDash();
          break;
        case 'Tab':
          e.preventDefault();
          window.UI.toggleScoreboard(true);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.inputState.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.inputState.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.inputState.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.inputState.right = false;
          break;
        case 'Tab':
          e.preventDefault();
          window.UI.toggleScoreboard(false);
          break;
      }
    });

    // Mouse movement & aiming
    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    // Mouse click shooting
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      if (e.button === 0) {
        this.inputState.shoot = true;
      } else if (e.button === 2) {
        // Right click dash
        e.preventDefault();
        this.inputState.dash = true;
        window.audioManager.playDash();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.inputState.shoot = false;
      }
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  startClientLoop() {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Calculate aim angle towards mouse
      if (this.renderer && this.gameState) {
        const localTank = this.gameState.tanks.find(t => t.id === this.localPlayerId);
        if (localTank) {
          const screenX = localTank.x - this.renderer.camera.x;
          const screenY = localTank.y - this.renderer.camera.y;
          this.inputState.aimAngle = Math.atan2(this.mousePos.y - screenY, this.mousePos.x - screenX);

          // Add tank tread dust while moving
          if (Math.hypot(localTank.x - (this.lastX || localTank.x), localTank.y - (this.lastY || localTank.y)) > 1.2) {
            this.particles.addTrack(localTank.x, localTank.y, localTank.angle);
          }
          this.lastX = localTank.x;
          this.lastY = localTank.y;
        }
      }

      // Send input state to server
      if (this.socket && this.localPlayerId) {
        this.socket.emit('player_input', {
          keys: {
            up: this.inputState.up,
            down: this.inputState.down,
            left: this.inputState.left,
            right: this.inputState.right
          },
          aimAngle: this.inputState.aimAngle,
          shoot: this.inputState.shoot,
          dash: this.inputState.dash
        });
        this.inputState.dash = false; // Reset single pulse
      }

      // Update particle effects
      if (this.particles) {
        this.particles.update(dt);
      }

      // Render frame
      if (this.renderer && this.gameState) {
        this.renderer.render(this.gameState, this.localPlayerId, this.particles);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  processStateDelta(nextState) {
    // 1. Detect new bullets spawned -> play sound & muzzle sparks
    const currentBulletIds = new Set();
    for (const b of nextState.bullets) {
      currentBulletIds.add(b.id);
      if (!this.prevBullets.has(b.id)) {
        // New shot fired!
        if (b.ownerId === this.localPlayerId) {
          window.audioManager.playShoot(b.weaponId);
        }
        this.particles.addMuzzleFlash(b.x, b.y, b.angle, b.color);
      }
    }

    // 2. Detect destroyed bullets -> explosion / ricochet
    for (const [id, oldB] of this.prevBullets) {
      if (!currentBulletIds.has(id)) {
        this.particles.addExplosion(oldB.x, oldB.y, oldB.weaponId === 'rocket' ? 60 : 25, oldB.color);
        window.audioManager.playExplosion(oldB.weaponId === 'rocket');
      }
    }

    this.prevBullets.clear();
    for (const b of nextState.bullets) {
      this.prevBullets.set(b.id, b);
    }

    // 3. Detect Tank hits, damage & deaths
    for (const tank of nextState.tanks) {
      const prev = this.prevTanks.get(tank.id);
      if (prev) {
        // Health lost
        if (tank.health < prev.health) {
          const dmg = prev.health - tank.health;
          this.particles.addDamageText(tank.x, tank.y, `-${dmg}`, '#ff3366');
          if (tank.id === this.localPlayerId) {
            this.particles.addScreenShake(8);
          }
        }
        // Tank destroyed
        if (prev.health > 0 && tank.health <= 0) {
          this.particles.addExplosion(tank.x, tank.y, 75, tank.color);
          window.audioManager.playExplosion(true);
          if (tank.id === this.localPlayerId) {
            window.UI.showDeathAlert();
          }
        }
      }
      this.prevTanks.set(tank.id, tank);
    }
  }

  joinGame(name, roomId = null) {
    this.socket.emit('join_game', { name, roomId });
  }

  leaveGame() {
    if (this.socket) {
      this.socket.emit('leave_game');
    }
    this.localPlayerId = null;
    this.gameState = null;
  }

  createRoom(roomConfig, callback) {
    this.socket.emit('create_room', roomConfig, callback);
  }

  sendChat(text) {
    if (this.socket) {
      this.socket.emit('send_chat', text);
    }
  }

  requestLeaderboard() {
    if (this.socket) {
      this.socket.emit('get_leaderboard');
    }
  }
}

window.GameClient = GameClient;

