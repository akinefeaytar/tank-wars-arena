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
  TANK_DASH_SPEED: 9.5,
  TANK_DASH_DURATION: 180, // ms
  TANK_DASH_COOLDOWN: 3500, // ms
  
  // Weapons & Bullets
  BULLET_SPEED: 11,
  BULLET_RADIUS: 5,
  BULLET_DAMAGE: 34,
  BULLET_LIFETIME: 3200, // ms
  BULLET_MAX_BOUNCES: 1, // Ricochet off steel walls
  RELOAD_TIME: 450, // ms between regular shots
  
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
      duration: 12000,
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
    SHOTGUN: {
      id: 'shotgun',
      name: 'Yivli Pompalı',
      damage: 18,
      speed: 13,
      radius: 4,
      shots: 5,
      spread: 0.45,
      reloadTime: 650,
      duration: 12000,
      color: '#e056fd'
    }
  },

  // Powerup definitions
  POWERUP_TYPES: {
    HEALTH: { id: 'health', name: 'Tamir Kiti', color: '#2ecc71', icon: '❤️' },
    SHIELD: { id: 'shield', name: 'Enerji Kalkanı', color: '#3498db', icon: '🛡️' },
    TRIPLE: { id: 'triple', name: 'Üçlü Atış', color: '#e74c3c', icon: '🔥' },
    SNIPER: { id: 'sniper', name: 'Ağır Sniper', color: '#00d2d3', icon: '⚡' },
    ROCKET: { id: 'rocket', name: 'Ağır Roket', color: '#f39c12', icon: '🚀' },
    SPEED: { id: 'speed', name: 'Nitro Hız', color: '#f1c40f', icon: '💨' }
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

