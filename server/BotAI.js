const { 
  TANK_RADIUS, 
  TANK_MAX_SPEED, 
  BULLET_SPEED, 
  TILE_SIZE, 
  TILE_STEEL, 
  TILE_BRICK,
  BOT_DIFFICULTIES
} = require('./Constants');

const BOT_NAMES = [
  'Ares-01', 'Viper-X', 'Titan-7', 'Gölge-Kurt', 'Panzer-Bot',
  'Demir-Pençe', 'Yıldırım-9', 'Kasırga-AI', 'Akrep-T', 'Balyoz-4'
];

class BotAI {
  constructor(id, botIndex, personality = 'balanced', difficulty = 'normal') {
    this.id = id;
    this.name = BOT_NAMES[botIndex % BOT_NAMES.length] || `Bot_${botIndex}`;
    this.personality = personality; // 'hunter', 'sniper', 'tactician', 'balanced'
    this.difficulty = difficulty; // 'easy', 'normal', 'hard'
    this.diffConfig = BOT_DIFFICULTIES[difficulty.toUpperCase()] || BOT_DIFFICULTIES.NORMAL;
    this.targetId = null;
    this.preferredDistance = personality === 'sniper' ? 450 : (personality === 'hunter' ? 180 : 300);
    this.dodgeCooldown = 0;
  }

  update(botTank, gameState, dt) {
    if (!botTank || botTank.health <= 0) return { keys: {}, aimAngle: 0, shoot: false, dash: false, barrier: false };

    const now = Date.now();
    const result = {
      keys: { up: false, down: false, left: false, right: false },
      aimAngle: botTank.turretAngle,
      shoot: false,
      dash: false,
      barrier: false
    };

    // 1. Target Selection (Find closest living enemy tank - respect TDM teams)
    let bestTarget = null;
    let minTargetDist = Infinity;

    for (const [otherId, otherTank] of Object.entries(gameState.tanks)) {
      if (otherId === botTank.id || otherTank.health <= 0) continue;
      // If Team Deathmatch, don't target teammate
      if (gameState.mode === 'tdm' && botTank.team && otherTank.team === botTank.team) continue;
      
      const dx = otherTank.x - botTank.x;
      const dy = otherTank.y - botTank.y;
      const dist = Math.hypot(dx, dy);

      // Prioritize human players slightly
      const weight = otherTank.isBot ? 1.0 : 0.8;
      const effectiveDist = dist * weight;

      if (effectiveDist < minTargetDist) {
        minTargetDist = effectiveDist;
        bestTarget = otherTank;
      }
    }

    // 2. Power-Up Seeking (If low health, look for Health/Shield)
    let targetPowerup = null;
    if (botTank.health < 60 && gameState.powerups && gameState.powerups.length > 0) {
      let minPUDist = Infinity;
      for (const pu of gameState.powerups) {
        if (pu.type === 'health' || pu.type === 'shield') {
          const pDist = Math.hypot(pu.x - botTank.x, pu.y - botTank.y);
          if (pDist < minPUDist && pDist < 600) {
            minPUDist = pDist;
            targetPowerup = pu;
          }
        }
      }
    }

    // 3. Dodge Incoming Projectiles & Use Barrier Shield
    let bulletThreat = null;
    if (gameState.bullets) {
      for (const bullet of gameState.bullets) {
        if (bullet.ownerId === botTank.id) continue;
        // Ignore teammates bullets in TDM
        if (gameState.mode === 'tdm' && bullet.ownerTeam === botTank.team) continue;

        const bdx = botTank.x - bullet.x;
        const bdy = botTank.y - bullet.y;
        const bDist = Math.hypot(bdx, bdy);
        
        if (bDist < 260) {
          const dot = (bullet.vx * bdx + bullet.vy * bdy) / (bDist * Math.hypot(bullet.vx, bullet.vy) || 1);
          if (dot > 0.65) {
            bulletThreat = bullet;
            break;
          }
        }
      }
    }

    // 4. Movement & Evasive Planning
    let desiredMoveX = 0;
    let desiredMoveY = 0;

    if (bulletThreat && Math.random() < this.diffConfig.dodgeChance) {
      // Perpendicular evasive maneuver
      const perpX = -bulletThreat.vy;
      const perpY = bulletThreat.vx;
      desiredMoveX = perpX;
      desiredMoveY = perpY;
      
      const threatDist = Math.hypot(bulletThreat.x - botTank.x, bulletThreat.y - botTank.y);
      if (threatDist < 110) {
        // Use Emergency 'E' Barrier Shield if in mortal danger
        if (botTank.canUseBarrier && botTank.health < 45) {
          result.barrier = true;
        } else if (botTank.canDash) {
          result.dash = true;
        }
      }
    } else if (targetPowerup) {
      desiredMoveX = targetPowerup.x - botTank.x;
      desiredMoveY = targetPowerup.y - botTank.y;
    } else if (bestTarget) {
      const dx = bestTarget.x - botTank.x;
      const dy = bestTarget.y - botTank.y;
      const dist = Math.hypot(dx, dy);

      if (dist > this.preferredDistance + 60) {
        desiredMoveX = dx;
        desiredMoveY = dy;
      } else if (dist < this.preferredDistance - 60) {
        desiredMoveX = -dx;
        desiredMoveY = -dy;
      } else {
        desiredMoveX = -dy;
        desiredMoveY = dx;
      }
    } else {
      desiredMoveX = Math.cos(botTank.angle);
      desiredMoveY = Math.sin(botTank.angle);
    }

    // 5. Obstacle Avoidance (Raycast feelers)
    const avoidance = this.getObstacleAvoidanceVector(botTank, gameState.map);
    desiredMoveX += avoidance.x * 2.5;
    desiredMoveY += avoidance.y * 2.5;

    // Convert desired vector to WASD keys
    if (desiredMoveY < -30) result.keys.up = true;
    if (desiredMoveY > 30) result.keys.down = true;
    if (desiredMoveX < -30) result.keys.left = true;
    if (desiredMoveX > 30) result.keys.right = true;

    // 6. Turret Aiming with Difficulty-Scaled Lead Prediction
    if (bestTarget) {
      const dx = bestTarget.x - botTank.x;
      const dy = bestTarget.y - botTank.y;
      const dist = Math.hypot(dx, dy);

      // Lead targeting scaled by difficulty accuracy
      const travelTime = dist / BULLET_SPEED;
      const leadMul = this.diffConfig.leadAccuracy || 0.8;
      const predictedX = bestTarget.x + (bestTarget.vx || 0) * travelTime * leadMul;
      const predictedY = bestTarget.y + (bestTarget.vy || 0) * travelTime * leadMul;

      // Inaccuracy error based on difficulty
      const aimSpread = (Math.random() - 0.5) * this.diffConfig.aimInaccuracy;
      const aimAngle = Math.atan2(predictedY - botTank.y, predictedX - botTank.x) + aimSpread;
      result.aimAngle = aimAngle;

      const hasLOS = this.hasLineOfSight(botTank.x, botTank.y, predictedX, predictedY, gameState.map);
      const angleDiff = Math.abs(this.normalizeAngle(botTank.turretAngle - aimAngle));
      
      const fireAngleTolerance = this.difficulty === 'hard' ? 0.35 : 0.25;
      const maxFireDist = (botTank.weapon && botTank.weapon.id === 'flamethrower') ? 240 : 850;
      if (hasLOS && angleDiff < fireAngleTolerance && dist < maxFireDist) {
        result.shoot = true;
      }
    }

    return result;
  }

  getObstacleAvoidanceVector(botTank, map) {
    if (!map || !map.grid) return { x: 0, y: 0 };

    let avoidX = 0;
    let avoidY = 0;
    const feelers = [
      { angle: 0, dist: 65 },
      { angle: Math.PI / 4, dist: 55 },
      { angle: -Math.PI / 4, dist: 55 },
      { angle: Math.PI / 2, dist: 45 },
      { angle: -Math.PI / 2, dist: 45 }
    ];

    for (const feeler of feelers) {
      const checkAngle = botTank.angle + feeler.angle;
      const testX = botTank.x + Math.cos(checkAngle) * feeler.dist;
      const testY = botTank.y + Math.sin(checkAngle) * feeler.dist;

      const c = Math.floor(testX / TILE_SIZE);
      const r = Math.floor(testY / TILE_SIZE);

      if (r < 0 || r >= map.rows || c < 0 || c >= map.cols) {
        avoidX -= Math.cos(checkAngle);
        avoidY -= Math.sin(checkAngle);
        continue;
      }

      const tile = map.grid[r][c];
      if (tile === TILE_STEEL || tile === TILE_BRICK) {
        avoidX -= Math.cos(checkAngle);
        avoidY -= Math.sin(checkAngle);
      }
    }

    return { x: avoidX, y: avoidY };
  }

  hasLineOfSight(x0, y0, x1, y1, map) {
    if (!map || !map.grid) return true;

    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.ceil(Math.hypot(dx, dy) / 25);
    
    for (let i = 1; i < steps; i++) {
      const cx = x0 + (dx * i) / steps;
      const cy = y0 + (dy * i) / steps;
      const c = Math.floor(cx / TILE_SIZE);
      const r = Math.floor(cy / TILE_SIZE);

      if (r >= 0 && r < map.rows && c >= 0 && c < map.cols) {
        const tile = map.grid[r][c];
        if (tile === TILE_STEEL || tile === TILE_BRICK) {
          return false;
        }
      }
    }
    return true;
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
}

module.exports = BotAI;
