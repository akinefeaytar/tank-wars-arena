const { 
  MAP_WIDTH, 
  MAP_HEIGHT, 
  SERVER_TICK_RATE, 
  TANK_RADIUS, 
  TANK_MAX_SPEED, 
  TANK_ACCELERATION, 
  TANK_FRICTION, 
  TANK_TURN_SPEED, 
  TANK_TURRET_TURN_SPEED, 
  TANK_MAX_HEALTH, 
  TANK_MAX_SHIELD, 
  TANK_DASH_SPEED, 
  TANK_DASH_DURATION, 
  TANK_DASH_COOLDOWN, 
  BULLET_SPEED, 
  BULLET_RADIUS, 
  BULLET_DAMAGE, 
  BULLET_LIFETIME, 
  WEAPONS, 
  POWERUP_TYPES, 
  TILE_STEEL, 
  TILE_BRICK, 
  TILE_SIZE, 
  DEFAULT_MATCH_DURATION, 
  DEFAULT_KILL_LIMIT, 
  RESPAWN_DELAY 
} = require('./Constants');
const MapData = require('./MapData');
const BotAI = require('./BotAI');
const LeaderboardStore = require('./LeaderboardStore');

class GameRoom {
  constructor(roomId, options = {}) {
    this.roomId = roomId;
    this.name = options.name || `Oda #${roomId.substring(0, 5)}`;
    this.isPrivate = !!options.isPrivate;
    this.mapId = options.mapId || 'classic';
    this.targetBotCount = options.botCount !== undefined ? options.botCount : 4;
    this.maxPlayers = options.maxPlayers || 10;
    this.matchDuration = options.duration || DEFAULT_MATCH_DURATION;
    this.killLimit = options.killLimit || DEFAULT_KILL_LIMIT;

    this.map = MapData.generateMap(this.mapId);
    this.players = new Map(); // socketId -> Tank
    this.bots = new Map();    // botId -> { tank, ai }
    this.bullets = [];
    this.powerups = [];
    this.nextBulletId = 1;
    this.nextPowerupId = 1;
    this.matchState = 'waiting'; // 'waiting', 'playing', 'ended'
    this.timeRemaining = this.matchDuration;
    this.lastTickTime = Date.now();
    this.lastPowerupSpawn = Date.now();
    this.killFeed = [];
    this.destroyedBricks = [];

    // Colors for tanks
    this.playerColors = [
      '#00e5ff', '#ff0055', '#ffe600', '#00ff88', '#bd00ff', 
      '#ff7700', '#00ffff', '#e056fd', '#ff5252', '#2ed573'
    ];
    this.colorIndex = 0;

    this.startLoop();
    this.populateBots();
    this.spawnInitialPowerups();
  }

  startLoop() {
    this.matchState = 'playing';
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 1000 / SERVER_TICK_RATE);
  }

  stopLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);
  }

  populateBots() {
    const currentBots = this.bots.size;
    const humanCount = this.players.size;
    const needed = Math.max(0, this.targetBotCount - humanCount);

    if (currentBots < needed) {
      for (let i = currentBots; i < needed; i++) {
        const botId = `bot_${Date.now()}_${i}`;
        const personalities = ['hunter', 'sniper', 'tactician', 'balanced'];
        const personality = personalities[i % personalities.length];
        const ai = new BotAI(botId, i, personality);
        const tank = this.createTank(botId, ai.name, true);
        this.bots.set(botId, { tank, ai });
      }
    } else if (currentBots > needed) {
      // Remove excess bots
      const toRemove = currentBots - needed;
      let count = 0;
      for (const [id] of this.bots) {
        if (count >= toRemove) break;
        this.bots.delete(id);
        count++;
      }
    }
  }

  createTank(id, name, isBot = false) {
    const spawn = this.getRandomSpawnPoint();
    const color = isBot 
      ? '#ff3838' 
      : this.playerColors[(this.colorIndex++) % this.playerColors.length];

    const stats = !isBot ? LeaderboardStore.getOrCreatePlayer(name) : null;

    return {
      id,
      name,
      isBot,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      turretAngle: 0,
      color,
      health: TANK_MAX_HEALTH,
      maxHealth: TANK_MAX_HEALTH,
      shield: 0,
      maxShield: TANK_MAX_SHIELD,
      weapon: { ...WEAPONS.STANDARD },
      weaponExpiresAt: 0,
      speedBoostExpiresAt: 0,
      isDashing: false,
      dashEndsAt: 0,
      dashCooldownEndsAt: 0,
      lastShotTime: 0,
      kills: 0,
      deaths: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      elo: stats ? stats.elo : 1000,
      badge: stats ? stats.badge : '🥉',
      tier: stats ? stats.tier : 'Bronz',
      rankColor: stats ? stats.color : '#cd7f32',
      respawnAt: 0,
      inputs: { up: false, down: false, left: false, right: false, aimAngle: 0, shoot: false, dash: false }
    };
  }

  getRandomSpawnPoint() {
    if (this.map.spawns && this.map.spawns.length > 0) {
      const sp = this.map.spawns[Math.floor(Math.random() * this.map.spawns.length)];
      return { 
        x: sp.x + TILE_SIZE / 2 + (Math.random() * 20 - 10), 
        y: sp.y + TILE_SIZE / 2 + (Math.random() * 20 - 10) 
      };
    }
    return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  }

  addPlayer(socketId, playerName) {
    const tank = this.createTank(socketId, playerName, false);
    this.players.set(socketId, tank);
    this.populateBots(); // Balance bot count
    return tank;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.populateBots();
  }

  handlePlayerInput(socketId, inputData) {
    const tank = this.players.get(socketId);
    if (!tank || tank.health <= 0) return;

    if (inputData.keys) tank.inputs = { ...tank.inputs, ...inputData.keys };
    if (inputData.aimAngle !== undefined) tank.inputs.aimAngle = inputData.aimAngle;
    if (inputData.shoot !== undefined) tank.inputs.shoot = inputData.shoot;
    if (inputData.dash) tank.inputs.dash = true;
  }

  spawnInitialPowerups() {
    for (const sp of this.map.powerupSpawns) {
      this.spawnPowerup(sp.x + TILE_SIZE / 2, sp.y + TILE_SIZE / 2);
    }
  }

  spawnPowerup(x, y, forcedType = null) {
    const types = Object.keys(POWERUP_TYPES);
    const typeKey = forcedType || types[Math.floor(Math.random() * types.length)];
    const def = POWERUP_TYPES[typeKey];

    this.powerups.push({
      id: `pu_${this.nextPowerupId++}`,
      type: def.id,
      name: def.name,
      color: def.color,
      icon: def.icon,
      x: x || (Math.random() * (MAP_WIDTH - 200) + 100),
      y: y || (Math.random() * (MAP_HEIGHT - 200) + 100),
      radius: 18,
      spawnedAt: Date.now()
    });
  }

  tick() {
    const now = Date.now();
    const dt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    if (this.matchState === 'playing') {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.endMatch('Süre doldu!');
      }
    }

    // Periodic Powerup Spawner
    if (now - this.lastPowerupSpawn > 14000 && this.powerups.length < 8) {
      this.lastPowerupSpawn = now;
      if (this.map.powerupSpawns.length > 0) {
        const sp = this.map.powerupSpawns[Math.floor(Math.random() * this.map.powerupSpawns.length)];
        this.spawnPowerup(sp.x + TILE_SIZE / 2, sp.y + TILE_SIZE / 2);
      }
    }

    // 1. Update Bots AI
    for (const [botId, { tank, ai }] of this.bots) {
      if (tank.health <= 0) {
        if (now >= tank.respawnAt) {
          this.respawnTank(tank);
        }
        continue;
      }

      const botDecision = ai.update(tank, {
        tanks: this.getAllTanksMap(),
        bullets: this.bullets,
        powerups: this.powerups,
        map: this.map
      }, dt);

      tank.inputs = {
        up: botDecision.keys.up,
        down: botDecision.keys.down,
        left: botDecision.keys.left,
        right: botDecision.keys.right,
        aimAngle: botDecision.aimAngle,
        shoot: botDecision.shoot,
        dash: botDecision.dash
      };
    }

    // 2. Update All Tanks Physics
    const allTanks = this.getAllTanks();
    for (const tank of allTanks) {
      if (tank.health <= 0) {
        if (!tank.isBot && now >= tank.respawnAt && tank.respawnAt > 0) {
          this.respawnTank(tank);
        }
        continue;
      }

      this.updateTankPhysics(tank, now, dt);
    }

    // 3. Tank vs Tank collision
    for (let i = 0; i < allTanks.length; i++) {
      for (let j = i + 1; j < allTanks.length; j++) {
        const t1 = allTanks[i];
        const t2 = allTanks[j];
        if (t1.health <= 0 || t2.health <= 0) continue;

        const dx = t2.x - t1.x;
        const dy = t2.y - t1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = TANK_RADIUS * 2;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          t1.x -= nx * overlap;
          t1.y -= ny * overlap;
          t2.x += nx * overlap;
          t2.y += ny * overlap;
        }
      }
    }

    // 4. Update Bullets
    this.updateBullets(now, dt);

    // 5. Update Powerup Collisions
    this.updatePowerups(now);
  }

  updateTankPhysics(tank, now, dt) {
    // Check weapon expiry
    if (tank.weapon.id !== 'standard' && now >= tank.weaponExpiresAt) {
      tank.weapon = { ...WEAPONS.STANDARD };
    }

    // Dash handling
    if (tank.inputs.dash && now >= tank.dashCooldownEndsAt && !tank.isDashing) {
      tank.isDashing = true;
      tank.dashEndsAt = now + TANK_DASH_DURATION;
      tank.dashCooldownEndsAt = now + TANK_DASH_COOLDOWN;
      tank.inputs.dash = false;
    }

    if (tank.isDashing && now >= tank.dashEndsAt) {
      tank.isDashing = false;
    }

    // Movement calculation
    let moveSpeed = TANK_MAX_SPEED;
    if (now < tank.speedBoostExpiresAt) moveSpeed *= 1.45;
    if (tank.isDashing) moveSpeed = TANK_DASH_SPEED;

    let targetVx = 0;
    let targetVy = 0;

    if (tank.inputs.up) targetVy -= moveSpeed;
    if (tank.inputs.down) targetVy += moveSpeed;
    if (tank.inputs.left) targetVx -= moveSpeed;
    if (tank.inputs.right) targetVx += moveSpeed;

    // Normalize diagonal movement
    if (targetVx !== 0 && targetVy !== 0) {
      targetVx *= 0.7071;
      targetVy *= 0.7071;
    }

    // Smooth acceleration & inertia
    tank.vx += (targetVx - tank.vx) * TANK_ACCELERATION;
    tank.vy += (targetVy - tank.vy) * TANK_ACCELERATION;

    // Rotate chassis smoothly towards movement direction if moving
    if (Math.hypot(tank.vx, tank.vy) > 0.4) {
      const moveAngle = Math.atan2(tank.vy, tank.vx);
      tank.angle = this.lerpAngle(tank.angle, moveAngle, 0.22);
    }

    // Aim turret smoothly towards target
    if (tank.inputs.aimAngle !== undefined) {
      tank.turretAngle = this.lerpAngle(tank.turretAngle, tank.inputs.aimAngle, 0.35);
    }

    // New proposed position
    let newX = tank.x + tank.vx;
    let newY = tank.y + tank.vy;

    // Check Wall Collisions (X-axis, then Y-axis for smooth sliding)
    if (!this.checkWallCollision(newX, tank.y, TANK_RADIUS)) {
      tank.x = newX;
    } else {
      tank.vx = 0;
    }

    if (!this.checkWallCollision(tank.x, newY, TANK_RADIUS)) {
      tank.y = newY;
    } else {
      tank.vy = 0;
    }

    // Keep inside map bounds
    tank.x = Math.max(TANK_RADIUS + 10, Math.min(MAP_WIDTH - TANK_RADIUS - 10, tank.x));
    tank.y = Math.max(TANK_RADIUS + 10, Math.min(MAP_HEIGHT - TANK_RADIUS - 10, tank.y));

    // Handle Shooting
    if (tank.inputs.shoot && now - tank.lastShotTime >= tank.weapon.reloadTime) {
      this.fireWeapon(tank, now);
      tank.lastShotTime = now;
    }
  }

  fireWeapon(tank, now) {
    const w = tank.weapon;
    const barrelLength = 32;
    const spawnX = tank.x + Math.cos(tank.turretAngle) * barrelLength;
    const spawnY = tank.y + Math.sin(tank.turretAngle) * barrelLength;

    // Recoil push
    const recoilForce = w.id === 'sniper' ? 3.5 : (w.id === 'rocket' ? 2.5 : 1.2);
    tank.vx -= Math.cos(tank.turretAngle) * recoilForce;
    tank.vy -= Math.sin(tank.turretAngle) * recoilForce;

    if (w.shots && w.shots > 1) {
      // Multi-shot (Triple shot, Shotgun)
      const count = w.shots;
      const spread = w.spread || 0.25;
      const startAngle = tank.turretAngle - (spread * (count - 1)) / 2;

      for (let i = 0; i < count; i++) {
        const shotAngle = startAngle + i * spread;
        this.createBullet(tank, spawnX, spawnY, shotAngle, w);
      }
    } else {
      // Single shot
      this.createBullet(tank, spawnX, spawnY, tank.turretAngle, w);
    }
  }

  createBullet(tank, x, y, angle, weapon) {
    const bullet = {
      id: `b_${this.nextBulletId++}`,
      ownerId: tank.id,
      ownerName: tank.name,
      x,
      y,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      angle,
      damage: weapon.damage,
      radius: weapon.radius,
      bouncesLeft: weapon.bounces || 0,
      color: weapon.color,
      weaponId: weapon.id,
      explosionRadius: weapon.explosionRadius || 0,
      pierceLeft: weapon.pierce || 0,
      createdAt: Date.now()
    };
    this.bullets.push(bullet);
  }

  updateBullets(now, dt) {
    const survivingBullets = [];

    for (const b of this.bullets) {
      if (now - b.createdAt > BULLET_LIFETIME) continue;

      let nextX = b.x + b.vx;
      let nextY = b.y + b.vy;

      // 1. Check Tile Wall Collision
      const tileCol = this.checkBulletTileCollision(nextX, nextY, b);
      if (tileCol.hit) {
        if (tileCol.destroyedBrick) {
          // Brick destroyed, bullet explodes
          this.onExplosion(b.x, b.y, b.explosionRadius || 20, b.damage, b.ownerId);
          continue;
        }

        if (b.bouncesLeft > 0 && tileCol.normal) {
          b.bouncesLeft--;
          // Reflect velocity
          if (tileCol.normal.x !== 0) b.vx = -b.vx;
          if (tileCol.normal.y !== 0) b.vy = -b.vy;
          b.angle = Math.atan2(b.vy, b.vx);
          b.x += b.vx;
          b.y += b.vy;
          survivingBullets.push(b);
          continue;
        } else {
          // Explode on steel wall
          this.onExplosion(b.x, b.y, b.explosionRadius || 15, b.damage, b.ownerId);
          continue;
        }
      }

      // 2. Check Tank Hit
      let hitTank = null;
      for (const tank of this.getAllTanks()) {
        if (tank.health <= 0 || tank.id === b.ownerId) continue;
        const dist = Math.hypot(tank.x - nextX, tank.y - nextY);
        if (dist < TANK_RADIUS + b.radius) {
          hitTank = tank;
          break;
        }
      }

      if (hitTank) {
        this.damageTank(hitTank, b.damage, b.ownerId, b.ownerName, b.weaponId);
        
        if (b.explosionRadius > 0) {
          this.onExplosion(nextX, nextY, b.explosionRadius, b.damage * 0.6, b.ownerId);
        }

        if (b.pierceLeft > 0) {
          b.pierceLeft--;
          b.x = nextX;
          b.y = nextY;
          survivingBullets.push(b);
          continue;
        }
        continue; // Bullet consumed
      }

      b.x = nextX;
      b.y = nextY;
      survivingBullets.push(b);
    }

    this.bullets = survivingBullets;
  }

  damageTank(tank, damage, attackerId, attackerName, weaponId) {
    if (tank.health <= 0) return;

    let remainingDamage = damage;
    // Shield absorbs first
    if (tank.shield > 0) {
      if (tank.shield >= remainingDamage) {
        tank.shield -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= tank.shield;
        tank.shield = 0;
      }
    }

    tank.health = Math.max(0, tank.health - remainingDamage);

    if (tank.health <= 0) {
      this.handleTankDeath(tank, attackerId, attackerName, weaponId);
    }
  }

  handleTankDeath(victim, killerId, killerName, weaponId) {
    victim.deaths += 1;
    victim.streak = 0;
    victim.respawnAt = Date.now() + RESPAWN_DELAY;

    // Immediately record victim death in career stats
    if (!victim.isBot) {
      const updatedVictim = LeaderboardStore.recordDeath(victim.name);
      victim.elo = updatedVictim.elo;
      victim.badge = updatedVictim.badge;
      victim.tier = updatedVictim.tier;
      victim.rankColor = updatedVictim.color;
    }

    const killer = this.findTankById(killerId);
    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.score += 100;
      killer.streak += 1;
      if (killer.streak > killer.maxStreak) killer.maxStreak = killer.streak;

      // Immediately record killer kill & ELO gain in career stats
      if (!killer.isBot) {
        const updatedKiller = LeaderboardStore.recordKill(killer.name, killer.streak);
        killer.elo = updatedKiller.elo;
        killer.badge = updatedKiller.badge;
        killer.tier = updatedKiller.tier;
        killer.rankColor = updatedKiller.color;
      }

      // Broadcast kill feed item
      this.addKillFeed(killer.name, victim.name, weaponId, killer.streak);

      // Check match win condition
      if (killer.kills >= this.killLimit) {
        this.endMatch(`${killer.name} ${this.killLimit} leşe ulaşarak zafer kazandı!`);
      }
    } else {
      // Suicide / environment
      this.addKillFeed('Çevre', victim.name, 'suicide', 0);
    }

    // Chance to drop a powerup at death location
    if (Math.random() < 0.6) {
      this.spawnPowerup(victim.x, victim.y);
    }
  }

  respawnTank(tank) {
    const sp = this.getRandomSpawnPoint();
    tank.x = sp.x;
    tank.y = sp.y;
    tank.vx = 0;
    tank.vy = 0;
    tank.health = TANK_MAX_HEALTH;
    tank.shield = 25; // Quick shield on respawn for protection
    tank.weapon = { ...WEAPONS.STANDARD };
    tank.isDashing = false;
    tank.respawnAt = 0;
  }

  updatePowerups(now) {
    const remaining = [];
    const allTanks = this.getAllTanks();

    for (const pu of this.powerups) {
      let collected = false;

      for (const tank of allTanks) {
        if (tank.health <= 0) continue;
        const dist = Math.hypot(tank.x - pu.x, tank.y - pu.y);
        if (dist < TANK_RADIUS + pu.radius) {
          this.applyPowerup(tank, pu.type, now);
          collected = true;
          break;
        }
      }

      if (!collected) {
        remaining.push(pu);
      }
    }

    this.powerups = remaining;
  }

  applyPowerup(tank, type, now) {
    switch (type) {
      case 'health':
        tank.health = Math.min(tank.maxHealth, tank.health + 50);
        break;
      case 'shield':
        tank.shield = tank.maxShield;
        break;
      case 'speed':
        tank.speedBoostExpiresAt = now + 9000;
        break;
      case 'triple':
        tank.weapon = { ...WEAPONS.TRIPLE };
        tank.weaponExpiresAt = now + WEAPONS.TRIPLE.duration;
        break;
      case 'sniper':
        tank.weapon = { ...WEAPONS.SNIPER };
        tank.weaponExpiresAt = now + WEAPONS.SNIPER.duration;
        break;
      case 'rocket':
        tank.weapon = { ...WEAPONS.ROCKET };
        tank.weaponExpiresAt = now + WEAPONS.ROCKET.duration;
        break;
    }
  }

  onExplosion(x, y, radius, damage, ownerId) {
    // Area of effect damage to tanks
    for (const tank of this.getAllTanks()) {
      if (tank.health <= 0) continue;
      const dist = Math.hypot(tank.x - x, tank.y - y);
      if (dist < radius + TANK_RADIUS) {
        const falloff = 1 - (dist / (radius + TANK_RADIUS));
        const finalDmg = Math.round(damage * Math.max(0.3, falloff));
        const owner = this.findTankById(ownerId);
        this.damageTank(tank, finalDmg, ownerId, owner ? owner.name : 'Patlama', 'rocket');
      }
    }
  }

  checkWallCollision(x, y, radius) {
    const minCol = Math.max(0, Math.floor((x - radius) / TILE_SIZE));
    const maxCol = Math.min(this.map.cols - 1, Math.floor((x + radius) / TILE_SIZE));
    const minRow = Math.max(0, Math.floor((y - radius) / TILE_SIZE));
    const maxRow = Math.min(this.map.rows - 1, Math.floor((y + radius) / TILE_SIZE));

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const tile = this.map.grid[r][c];
        if (tile === TILE_STEEL || tile === TILE_BRICK) {
          // AABB vs Circle
          const boxLeft = c * TILE_SIZE;
          const boxRight = boxLeft + TILE_SIZE;
          const boxTop = r * TILE_SIZE;
          const boxBottom = boxTop + TILE_SIZE;

          const closestX = Math.max(boxLeft, Math.min(x, boxRight));
          const closestY = Math.max(boxTop, Math.min(y, boxBottom));

          const dx = x - closestX;
          const dy = y - closestY;
          if (dx * dx + dy * dy < radius * radius) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkBulletTileCollision(x, y, bullet) {
    const c = Math.floor(x / TILE_SIZE);
    const r = Math.floor(y / TILE_SIZE);

    if (r < 0 || r >= this.map.rows || c < 0 || c >= this.map.cols) {
      return { hit: true, normal: { x: 1, y: 0 } };
    }

    const tile = this.map.grid[r][c];
    if (tile === TILE_STEEL || tile === TILE_BRICK) {
      // Calculate collision normal
      const tileCenterX = c * TILE_SIZE + TILE_SIZE / 2;
      const tileCenterY = r * TILE_SIZE + TILE_SIZE / 2;
      const diffX = x - tileCenterX;
      const diffY = y - tileCenterY;

      let normal = { x: 0, y: 0 };
      if (Math.abs(diffX) > Math.abs(diffY)) {
        normal.x = diffX > 0 ? 1 : -1;
      } else {
        normal.y = diffY > 0 ? 1 : -1;
      }

      let destroyedBrick = false;
      if (tile === TILE_BRICK) {
        const key = `${r}_${c}`;
        this.map.brickHealth[key] = (this.map.brickHealth[key] || 2) - 1;
        if (this.map.brickHealth[key] <= 0) {
          this.map.grid[r][c] = 0; // Destroy block!
          delete this.map.brickHealth[key];
          this.destroyedBricks.push([r, c]);
          destroyedBrick = true;
          // Chance to drop powerup from destroyed brick crate!
          if (Math.random() < 0.35) {
            this.spawnPowerup(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2);
          }
        }
      }

      return { hit: true, normal, destroyedBrick };
    }

    return { hit: false };
  }

  addKillFeed(killer, victim, weapon, streak) {
    const item = {
      id: Date.now() + Math.random(),
      killer,
      victim,
      weapon,
      streak,
      time: Date.now()
    };
    this.killFeed.unshift(item);
    if (this.killFeed.length > 6) this.killFeed.pop();
  }

  endMatch(reason) {
    if (this.matchState === 'ended') return;
    this.matchState = 'ended';

    // Build final summary
    const allTanks = this.getAllTanks();
    allTanks.sort((a, b) => b.kills - a.kills || b.score - a.score);

    const winner = allTanks[0];
    const summary = allTanks.map((t, idx) => ({
      name: t.name,
      kills: t.kills,
      deaths: t.deaths,
      score: t.score,
      maxStreak: t.maxStreak,
      isBot: t.isBot,
      won: idx === 0
    }));

    // Save rankings persistently
    LeaderboardStore.recordMatch(summary);

    this.endSummary = {
      reason,
      winner: winner ? winner.name : 'Berabere',
      leaderboard: summary
    };

    // Auto-restart after 8 seconds
    setTimeout(() => {
      this.resetMatch();
    }, 8000);
  }

  resetMatch() {
    this.bullets = [];
    this.powerups = [];
    this.killFeed = [];
    this.destroyedBricks = [];
    this.timeRemaining = this.matchDuration;
    this.map = MapData.generateMap(this.mapId);
    this.spawnInitialPowerups();

    for (const tank of this.getAllTanks()) {
      tank.kills = 0;
      tank.deaths = 0;
      tank.score = 0;
      tank.streak = 0;
      tank.maxStreak = 0;
      this.respawnTank(tank);
    }

    this.matchState = 'playing';
    this.endSummary = null;
  }

  getAllTanks() {
    const list = Array.from(this.players.values());
    for (const { tank } of this.bots.values()) {
      list.push(tank);
    }
    return list;
  }

  getAllTanksMap() {
    const obj = {};
    for (const [id, t] of this.players) obj[id] = t;
    for (const [id, { tank }] of this.bots) obj[id] = tank;
    return obj;
  }

  findTankById(id) {
    if (this.players.has(id)) return this.players.get(id);
    if (this.bots.has(id)) return this.bots.get(id).tank;
    return null;
  }

  lerpAngle(a, b, t) {
    const diff = this.normalizeAngle(b - a);
    return a + diff * t;
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  getSnapshot() {
    return {
      roomId: this.roomId,
      roomName: this.name,
      matchState: this.matchState,
      timeRemaining: Math.ceil(this.timeRemaining),
      endSummary: this.endSummary,
      map: {
        mapId: this.map.mapId,
        cols: this.map.cols,
        rows: this.map.rows,
        destroyedBricks: this.destroyedBricks
      },
      tanks: this.getAllTanks().map(t => ({
        id: t.id,
        name: t.name,
        isBot: t.isBot,
        x: Math.round(t.x * 10) / 10,
        y: Math.round(t.y * 10) / 10,
        vx: Math.round(t.vx * 10) / 10,
        vy: Math.round(t.vy * 10) / 10,
        angle: Math.round(t.angle * 100) / 100,
        turretAngle: Math.round(t.turretAngle * 100) / 100,
        color: t.color,
        health: t.health,
        maxHealth: t.maxHealth,
        shield: t.shield,
        maxShield: t.maxShield,
        weaponId: t.weapon.id,
        isDashing: t.isDashing,
        kills: t.kills,
        deaths: t.deaths,
        score: t.score,
        streak: t.streak,
        badge: t.badge,
        tier: t.tier,
        rankColor: t.rankColor
      })),
      bullets: this.bullets.map(b => ({
        id: b.id,
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        vx: Math.round(b.vx * 10) / 10,
        vy: Math.round(b.vy * 10) / 10,
        angle: Math.round(b.angle * 100) / 100,
        color: b.color,
        radius: b.radius,
        weaponId: b.weaponId
      })),
      powerups: this.powerups.map(pu => ({
        id: pu.id,
        type: pu.type,
        x: Math.round(pu.x),
        y: Math.round(pu.y),
        color: pu.color,
        icon: pu.icon
      })),
      killFeed: this.killFeed
    };
  }
}

module.exports = GameRoom;

