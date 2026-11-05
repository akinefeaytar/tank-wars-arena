const { 
  TANK_RADIUS, 
  TANK_MAX_SPEED, 
  BULLET_SPEED, 
  TILE_SIZE, 
  TILE_STEEL, 
  TILE_BRICK 
} = require('./Constants');

const BOT_NAMES = [
  'Ares-01', 'Viper-X', 'Titan-7', 'Gölge-Kurt', 'Panzer-Bot',
  'Demir-Pençe', 'Yıldırım-9', 'Kasırga-AI', 'Akrep-T', 'Balyoz-4'
];

class BotAI {
  constructor(id, botIndex, personality = 'balanced') {
    this.id = id;
    this.name = BOT_NAMES[botIndex % BOT_NAMES.length] || `Bot_${botIndex}`;
    this.personality = personality; // 'hunter', 'sniper', 'tactician', 'balanced'
    this.targetId = null;
    this.nextDecisionTime = 0;
    this.preferredDistance = personality === 'sniper' ? 450 : (personality === 'hunter' ? 180 : 300);
    this.dodgeCooldown = 0;
  }

  update(botTank, gameState, dt) {
    if (!botTank || botTank.health <= 0) return { keys: {}, aimAngle: 0, shoot: false, dash: false };

    const now = Date.now();
    const result = {
      keys: { up: false, down: false, left: false, right: false },
      aimAngle: botTank.turretAngle,
      shoot: false,
      dash: false
    };

    // 1. Target Selection (Find closest living enemy tank or low health player)
    let bestTarget = null;
    let minTargetDist = Infinity;

    for (const [otherId, otherTank] of Object.entries(gameState.tanks)) {
      if (otherId === botTank.id || otherTank.health <= 0) continue;
      
      const dx = otherTank.x - botTank.x;
      const dy = otherTank.y - botTank.y;
      const dist = Math.hypot(dx, dy);

      // Prioritize human players slightly for more engaging gameplay
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

    // 3. Dodge Incoming Projectiles
    let bulletThreat = null;
    if (gameState.bullets) {
      for (const bullet of gameState.bullets) {
        if (bullet.ownerId === botTank.id) continue;
        const bdx = botTank.x - bullet.x;
        const bdy = botTank.y - bullet.y;
        const bDist = Math.hypot(bdx, bdy);
        
        if (bDist < 250) {
          // Check if bullet velocity vector is directed towards bot
          const dot = (bullet.vx * bdx + bullet.vy * bdy) / (bDist * Math.hypot(bullet.vx, bullet.vy) || 1);
          if (dot > 0.7) {
            bulletThreat = bullet;
            break;
          }
        }
      }
    }

    // 4. Movement Planning
    let desiredMoveX = 0;
    let desiredMoveY = 0;

    if (bulletThreat) {
      // Evasive maneuver: move perpendicular to bullet path
      const perpX = -bulletThreat.vy;
      const perpY = bulletThreat.vx;
      desiredMoveX = perpX;
      desiredMoveY = perpY;
      
      // Nitro dash dodge if available and in grave danger
      if (Math.hypot(bulletThreat.x - botTank.x, bulletThreat.y - botTank.y) < 120 && botTank.canDash) {
        result.dash = true;
      }
    } else if (targetPowerup) {
      // Move towards powerup
      desiredMoveX = targetPowerup.x - botTank.x;
      desiredMoveY = targetPowerup.y - botTank.y;
    } else if (bestTarget) {
      const dx = bestTarget.x - botTank.x;
      const dy = bestTarget.y - botTank.y;
      const dist = Math.hypot(dx, dy);

      if (dist > this.preferredDistance + 60) {
        // Move closer
        desiredMoveX = dx;
        desiredMoveY = dy;
      } else if (dist < this.preferredDistance - 60) {
        // Back off
        desiredMoveX = -dx;
        desiredMoveY = -dy;
      } else {
        // Strafe around target
        desiredMoveX = -dy;
        desiredMoveY = dx;
      }
    } else {
      // Wander slightly
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

    // 6. Turret Aiming with Predictive Lead Calculation
    if (bestTarget) {
      const dx = bestTarget.x - botTank.x;
      const dy = bestTarget.y - botTank.y;
      const dist = Math.hypot(dx, dy);

      // Lead targeting: estimate where player will be when shell arrives
      const travelTime = dist / BULLET_SPEED;
      const predictedX = bestTarget.x + (bestTarget.vx || 0) * travelTime * 0.85;
      const predictedY = bestTarget.y + (bestTarget.vy || 0) * travelTime * 0.85;

      const aimAngle = Math.atan2(predictedY - botTank.y, predictedX - botTank.x);
      result.aimAngle = aimAngle;

      // Check Line of Sight (LOS)
      const hasLOS = this.hasLineOfSight(botTank.x, botTank.y, predictedX, predictedY, gameState.map);
      
      // Fire if target is in sight and angle is reasonably aligned
      const angleDiff = Math.abs(this.normalizeAngle(botTank.turretAngle - aimAngle));
      if (hasLOS && angleDiff < 0.28 && dist < 850) {
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

