class GameClient {
  constructor() {
    this.socket = null;
    this.localPlayerId = null;
    this.latestServerState = null;
    this.renderer = null;
    this.particles = null;

    // Smoothed entities for rendering
    this.tanksMap = new Map();
    this.bulletsMap = new Map();
    this.cachedMap = null;

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
    this.lastInputSendTime = 0;
    this.prevBullets = new Map();
    this.prevTanks = new Map();
  }

  init(renderer, particles) {
    this.renderer = renderer;
    this.particles = particles;
    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.bindNetworkEvents();
    this.bindInputEvents();
    this.startClientLoop();
  }

  bindNetworkEvents() {
    this.socket.on('joined_room', (data) => {
      this.localPlayerId = data.playerId;
      this.cachedMap = data.map;
      this.tanksMap.clear();
      this.bulletsMap.clear();
      console.log('Odaya bağlanıldı:', data);
      
      const titleElem = document.getElementById('hudRoomTitle');
      if (titleElem) titleElem.textContent = data.roomName;
      
      const codeElem = document.getElementById('hudRoomCode');
      if (codeElem) codeElem.textContent = `#${data.roomId.replace('room_', '')}`;
    });

    this.socket.on('game_state', (state) => {
      this.latestServerState = state;
      this.processStateDelta(state);

      // Handle map updates (destroyed bricks)
      if (state.map && state.map.destroyedBricks && this.cachedMap && this.cachedMap.grid) {
        for (const [r, c] of state.map.destroyedBricks) {
          if (this.cachedMap.grid[r]) {
            this.cachedMap.grid[r][c] = 0;
          }
        }
      }

      // Update target states for tanks
      const currentIds = new Set();
      for (const t of state.tanks) {
        currentIds.add(t.id);
        let existing = this.tanksMap.get(t.id);
        if (!existing) {
          existing = {
            ...t,
            renderX: t.x,
            renderY: t.y,
            renderAngle: t.angle,
            renderTurretAngle: t.turretAngle,
            targetX: t.x,
            targetY: t.y,
            targetAngle: t.angle,
            targetTurretAngle: t.turretAngle
          };
          this.tanksMap.set(t.id, existing);
        } else {
          // Copy metadata and properties
          Object.assign(existing, t);
          existing.targetX = t.x;
          existing.targetY = t.y;
          existing.targetAngle = t.angle;
          existing.targetTurretAngle = t.turretAngle;
        }
      }

      // Clean up disconnected tanks
      for (const id of this.tanksMap.keys()) {
        if (!currentIds.has(id)) {
          this.tanksMap.delete(id);
        }
      }

      // Update bullets
      const currentBulletIds = new Set();
      for (const b of state.bullets) {
        currentBulletIds.add(b.id);
        let existingB = this.bulletsMap.get(b.id);
        if (!existingB) {
          existingB = {
            ...b,
            renderX: b.x,
            renderY: b.y
          };
          this.bulletsMap.set(b.id, existingB);
        } else {
          existingB.vx = b.vx;
          existingB.vy = b.vy;
          existingB.angle = b.angle;
          // Soft-sync position with server
          existingB.renderX += (b.x - existingB.renderX) * 0.4;
          existingB.renderY += (b.y - existingB.renderY) * 0.4;
        }
      }
      for (const id of this.bulletsMap.keys()) {
        if (!currentBulletIds.has(id)) {
          this.bulletsMap.delete(id);
        }
      }

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
          this.inputState.dash = true;
          window.audioManager.playDash();
          break;
        case 'Space':
          this.inputState.shoot = true;
          break;
        case 'KeyE':
          this.inputState.barrier = true;
          window.audioManager.playBarrier();
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
        case 'Space':
          this.inputState.shoot = false;
          break;
      }
    });

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      if (e.button === 0) {
        this.inputState.shoot = true;
      } else if (e.button === 2) {
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
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const localTank = this.tanksMap.get(this.localPlayerId);

      // 1. Calculate local aim angle
      if (this.renderer && localTank) {
        const screenX = localTank.renderX - this.renderer.camera.x;
        const screenY = localTank.renderY - this.renderer.camera.y;
        this.inputState.aimAngle = Math.atan2(this.mousePos.y - screenY, this.mousePos.x - screenX);
        localTank.renderTurretAngle = this.inputState.aimAngle;

        // Tread particles
        if (Math.hypot(localTank.renderX - (this.lastX || localTank.renderX), localTank.renderY - (this.lastY || localTank.renderY)) > 1.2) {
          this.particles.addTrack(localTank.renderX, localTank.renderY, localTank.renderAngle);
        }
        this.lastX = localTank.renderX;
        this.lastY = localTank.renderY;
      }

      // 2. Local Player Instant Client-Side Prediction (0ms Input Delay)
      if (localTank && localTank.health > 0) {
        let moveSpeed = 4.2;
        if (localTank.isDashing) moveSpeed = 9.5;

        let moveVx = 0;
        let moveVy = 0;
        if (this.inputState.up) moveVy -= moveSpeed;
        if (this.inputState.down) moveVy += moveSpeed;
        if (this.inputState.left) moveVx -= moveSpeed;
        if (this.inputState.right) moveVx += moveSpeed;

        if (moveVx !== 0 && moveVy !== 0) {
          moveVx *= 0.7071;
          moveVy *= 0.7071;
        }

        // Apply local prediction directly
        localTank.renderX += moveVx;
        localTank.renderY += moveVy;

        if (Math.hypot(moveVx, moveVy) > 0.4) {
          const moveAngle = Math.atan2(moveVy, moveVx);
          localTank.renderAngle = this.lerpAngle(localTank.renderAngle, moveAngle, 0.25);
        }

        // Smooth reconciliation towards server authoritative target
        if (localTank.targetX !== undefined) {
          const reconFactor = 1 - Math.exp(-12 * dt);
          localTank.renderX += (localTank.targetX - localTank.renderX) * reconFactor;
          localTank.renderY += (localTank.targetY - localTank.renderY) * reconFactor;
        }
      }

      // 3. Smooth Interpolation for Remote Tanks & Bots (Buttery 60-120 FPS LERP)
      const remoteLerp = 1 - Math.exp(-22 * dt);
      for (const [id, t] of this.tanksMap) {
        if (id === this.localPlayerId) continue;
        if (t.targetX !== undefined) {
          t.renderX += (t.targetX - t.renderX) * remoteLerp;
          t.renderY += (t.targetY - t.renderY) * remoteLerp;
          t.renderAngle = this.lerpAngle(t.renderAngle, t.targetAngle, remoteLerp);
          t.renderTurretAngle = this.lerpAngle(t.renderTurretAngle, t.targetTurretAngle, remoteLerp);
        }
      }

      // 4. Smooth Bullet Flight (Extrapolation)
      for (const b of this.bulletsMap.values()) {
        b.renderX += (b.vx || 0) * (dt * 30);
        b.renderY += (b.vy || 0) * (dt * 30);
      }

      // 5. Rate-Limited Network Send (30Hz = clean 33ms cadence, prevents socket congestion)
      if (this.socket && this.localPlayerId && (currentTime - this.lastInputSendTime >= 33)) {
        this.socket.emit('player_input', {
          keys: {
            up: this.inputState.up,
            down: this.inputState.down,
            left: this.inputState.left,
            right: this.inputState.right
          },
          aimAngle: this.inputState.aimAngle,
          shoot: this.inputState.shoot,
          dash: this.inputState.dash,
          barrier: this.inputState.barrier
        });
        this.inputState.dash = false;
        this.inputState.barrier = false;
        this.lastInputSendTime = currentTime;
      }

      // 6. Update particles
      if (this.particles) {
        this.particles.update(dt);
      }

      // 7. Render frame using smoothly interpolated state
      if (this.renderer && this.latestServerState && this.cachedMap) {
        const renderState = {
          ...this.latestServerState,
          map: this.cachedMap,
          tanks: Array.from(this.tanksMap.values()),
          bullets: Array.from(this.bulletsMap.values())
        };
        this.renderer.render(renderState, this.localPlayerId, this.particles);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  processStateDelta(nextState) {
    const currentBulletIds = new Set();
    for (const b of nextState.bullets) {
      currentBulletIds.add(b.id);
      if (!this.prevBullets.has(b.id)) {
        if (b.ownerId === this.localPlayerId) {
          window.audioManager.playShoot(b.weaponId);
        }
        this.particles.addMuzzleFlash(b.x, b.y, b.angle, b.color);
      }
    }

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

    for (const tank of nextState.tanks) {
      const prev = this.prevTanks.get(tank.id);
      if (prev) {
        if (tank.health < prev.health) {
          const dmg = prev.health - tank.health;
          this.particles.addDamageText(tank.x, tank.y, `-${dmg}`, '#ff3366');
          if (tank.id === this.localPlayerId) {
            this.particles.addScreenShake(8);
          }
        }
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

  lerpAngle(a, b, t) {
    let diff = (b - a) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }

  joinGame(name, roomId = null, customization = {}) {
    this.socket.emit('join_game', { name, roomId, customization });
  }

  leaveGame() {
    if (this.socket) {
      this.socket.emit('leave_game');
    }
    this.localPlayerId = null;
    this.latestServerState = null;
    this.tanksMap.clear();
    this.bulletsMap.clear();
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
