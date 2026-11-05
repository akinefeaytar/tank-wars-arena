module.exports = {
  // Arena Dimensions
  MAP_WIDTH: 2400,
  MAP_HEIGHT: 1800,
  
  // Game Loop
  SERVER_TICK_RATE: 30, // 30 updates per second
  CLIENT_INTERPOLATION_TIME: 100,
  
  // Tank Physics & Attributes
  TANK_RADIUS: 24,
  TANK_MAX_SPEED: 4.2,
  TANK_ACCELERATION: 0.35,
  TANK_FRICTION: 0.88,
  TANK_TURN_SPEED: 0.065,
  TANK_TURRET_TURN_SPEED: 0.12,
  TANK_MAX_HEALTH: 100,
  TANK_MAX_SHIELD: 50,
  TANK_DASH_SPEED: 10.5,
  TANK_DASH_DURATION: 220, // ms
  TANK_DASH_COOLDOWN: 3000, // ms

  // 'E' Key Energy Barrier (Invulnerability Shield)
  TANK_BARRIER_DURATION: 2500, // 2.5 seconds of full immunity
  TANK_BARRIER_COOLDOWN: 10000, // 10 seconds cooldown
  
  // Weapons & Bullets
  BULLET_SPEED: 11,
  BULLET_RADIUS: 5,
  BULLET_DAMAGE: 34,
  BULLET_LIFETIME: 3200, // ms
  BULLET_MAX_BOUNCES: 1,
  RELOAD_TIME: 450,
  
  // Weapon Types
  WEAPONS: {
    STANDARD: {
      id: 'standard',
      name: 'Standart Top',
      damage: 34,
      speed: 11,
      radius: 5,
      reloadTime: 450,
      bounces: 1,
      color: '#ffcc00'
    },
    TRIPLE: {
      id: 'triple',
      name: 'Üçlü Namlu',
      damage: 26,
      speed: 11.5,
      radius: 4.5,
      reloadTime: 550,
      spread: 0.22,
      shots: 3,
      duration: 14000,
      color: '#ff3366'
    },
    SNIPER: {
      id: 'sniper',
      name: 'Ağır Raygun / Sniper',
      damage: 85,
      speed: 22,
      radius: 6,
      reloadTime: 1200,
      bounces: 0,
      pierce: 2,
      duration: 15000,
      color: '#00ffff'
    },
    ROCKET: {
      id: 'rocket',
      name: 'Güdümlü Roket',
      damage: 60,
      speed: 9,
      radius: 7,
      explosionRadius: 80,
      reloadTime: 850,
      bounces: 0,
      duration: 15000,
      color: '#ff6600'
    },
    PLASMA: {
      id: 'plasma',
      name: 'Plazma Topu',
      damage: 75,
      speed: 8.5,
      radius: 12,
      explosionRadius: 75,
      reloadTime: 950,
      duration: 16000,
      color: '#00ffcc'
    },
    BOUNCING_LASER: {
      id: 'bouncing_laser',
      name: 'Girdap Lazeri',
      damage: 28,
      speed: 16,
      radius: 4.5,
      bounces: 4,
      reloadTime: 380,
      duration: 15000,
      color: '#ff00ff'
    },
    FLAMETHROWER: {
      id: 'flamethrower',
      name: 'Termal Alev Topu',
      damage: 14,
      speed: 11,
      radius: 6,
      lifetime: 450, // Kısa menzilli gerçekçi alev konisi (ekranı kaplamaz)
      shots: 3,
      spread: 0.32,
      reloadTime: 240,
      duration: 12000,
      color: '#ff4500'
    },
    CLUSTER: {
      id: 'cluster',
      name: 'Küme Bombası',
      damage: 48,
      speed: 9.5,
      radius: 8,
      isCluster: true,
      explosionRadius: 60,
      reloadTime: 900,
      duration: 15000,
      color: '#a8ff00'
    }
  },

  // Powerup definitions
  POWERUP_TYPES: {
    HEALTH: { id: 'health', name: 'Tamir Kiti', color: '#2ecc71', icon: '❤️' },
    SHIELD: { id: 'shield', name: 'Zırh Güçlendirme', color: '#3498db', icon: '🛡️' },
    TRIPLE: { id: 'triple', name: 'Üçlü Atış', color: '#e74c3c', icon: '🔥' },
    SNIPER: { id: 'sniper', name: 'Ağır Sniper', color: '#00d2d3', icon: '⚡' },
    ROCKET: { id: 'rocket', name: 'Ağır Roket', color: '#f39c12', icon: '🚀' },
    PLASMA: { id: 'plasma', name: 'Plazma Topu', color: '#00ffcc', icon: '🌌' },
    BOUNCING_LASER: { id: 'bouncing_laser', name: 'Girdap Lazeri', color: '#ff00ff', icon: '🌀' },
    FLAMETHROWER: { id: 'flamethrower', name: 'Alev Topu', color: '#ff4500', icon: '🌋' },
    CLUSTER: { id: 'cluster', name: 'Küme Bombası', color: '#a8ff00', icon: '💣' },
    SPEED: { id: 'speed', name: 'Süper Nitro', color: '#f1c40f', icon: '💨' }
  },

  // Tank Classes / Garaj
  TANK_CLASSES: {
    BALANCED: { id: 'balanced', name: 'Dengeli Taktik', health: 100, speedMul: 1.0, desc: 'Klasik hız ve dayanıklılık' },
    SCOUT: { id: 'scout', name: 'Hafif Keşif (Hızlı)', health: 80, speedMul: 1.25, desc: 'Yüksek hareket ve depar hızı' },
    TITAN: { id: 'titan', name: 'Ağır Zırhlı (Titan)', health: 140, speedMul: 0.85, desc: 'Ekstra gövde direnci ve kalkan' }
  },

  // Bot Difficulties
  BOT_DIFFICULTIES: {
    EASY: { id: 'easy', name: 'Kolay', aimInaccuracy: 0.35, dodgeChance: 0.3, leadAccuracy: 0.4 },
    NORMAL: { id: 'normal', name: 'Normal', aimInaccuracy: 0.16, dodgeChance: 0.65, leadAccuracy: 0.8 },
    HARD: { id: 'hard', name: 'Zor (Veteran)', aimInaccuracy: 0.04, dodgeChance: 0.95, leadAccuracy: 1.0 }
  },

  // Game Modes
  GAME_MODES: {
    FFA: 'ffa', // Free For All (Herkes Tek)
    TDM: 'tdm'  // Team Deathmatch (Kırmızı vs Mavi)
  },

  // Ranks
  RANK_TIERS: [
    { name: 'Bronz', minElo: 0, badge: '🥉', color: '#cd7f32' },
    { name: 'Gümüş', minElo: 1000, badge: '🥈', color: '#c0c0c0' },
    { name: 'Altın', minElo: 1400, badge: '🥇', color: '#ffd700' },
    { name: 'Platin', minElo: 1800, badge: '💎', color: '#00e5ff' },
    { name: 'Elmas', minElo: 2300, badge: '🔮', color: '#b33939' },
    { name: 'Apex Tanker', minElo: 2800, badge: '👑', color: '#ff0055' }
  ],

  // Block Types
  TILE_STEEL: 1, // Indestructible
  TILE_BRICK: 2, // Destructible (takes 2 hits)
  TILE_WATER: 3, // Bullets pass, tanks can't
  TILE_BUSH: 4,  // Hides tanks inside!
  
  TILE_SIZE: 60,

  // Match limits
  DEFAULT_MATCH_DURATION: 300, // 5 minutes
  DEFAULT_KILL_LIMIT: 25,
  RESPAWN_DELAY: 3000 // ms
};
