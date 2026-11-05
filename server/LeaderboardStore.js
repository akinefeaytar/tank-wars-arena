const fs = require('fs');
const path = require('path');
const { RANK_TIERS } = require('./Constants');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');

class LeaderboardStore {
  constructor() {
    this.players = new Map();
    this.ensureDirectory();
    this.loadData();
  }

  ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadData() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          if (!val || !val.name) continue;
          this.players.set(key.toLowerCase(), val);
        }
      }
    } catch (err) {
      console.error('Error loading leaderboard data:', err.message);
    }
  }

  saveData() {
    try {
      const obj = {};
      for (const [key, val] of this.players.entries()) {
        obj[key] = val;
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving leaderboard data:', err.message);
    }
  }

  getTierForElo(elo) {
    let best = RANK_TIERS[0];
    for (const tier of RANK_TIERS) {
      if (elo >= tier.minElo) {
        best = tier;
      }
    }
    return best;
  }

  getOrCreatePlayer(rawName) {
    const cleanName = (rawName || 'Tanker').trim().substring(0, 16);
    const key = cleanName.toLowerCase();

    if (!this.players.has(key)) {
      const initialTier = this.getTierForElo(1000);
      const playerRecord = {
        name: cleanName,
        elo: 1000,
        kills: 0,
        deaths: 0,
        wins: 0,
        matches: 0,
        highestStreak: 0,
        badge: initialTier.badge,
        tier: initialTier.name,
        color: initialTier.color,
        lastPlayed: Date.now()
      };
      this.players.set(key, playerRecord);
      this.saveData();
      return playerRecord;
    }

    return this.players.get(key);
  }

  // Real-time immediate kill recording
  recordKill(killerName, currentStreak = 1) {
    const record = this.getOrCreatePlayer(killerName);
    record.kills += 1;
    const streakBonus = currentStreak >= 3 ? 5 : 0;
    record.elo = Math.max(100, record.elo + 15 + streakBonus);
    if (currentStreak > record.highestStreak) {
      record.highestStreak = currentStreak;
    }
    const tier = this.getTierForElo(record.elo);
    record.badge = tier.badge;
    record.tier = tier.name;
    record.color = tier.color;
    record.lastPlayed = Date.now();
    this.saveData();
    return record;
  }

  // Real-time immediate death recording
  recordDeath(victimName) {
    const record = this.getOrCreatePlayer(victimName);
    record.deaths += 1;
    record.elo = Math.max(100, record.elo - 8);
    const tier = this.getTierForElo(record.elo);
    record.badge = tier.badge;
    record.tier = tier.name;
    record.color = tier.color;
    record.lastPlayed = Date.now();
    this.saveData();
    return record;
  }

  recordMatch(matchSummary) {
    for (const entry of matchSummary) {
      if (entry.isBot) continue;
      
      const record = this.getOrCreatePlayer(entry.name);
      record.matches += 1;
      if (entry.won) {
        record.wins += 1;
        record.elo += 30; // Match victory bonus
      }

      const tier = this.getTierForElo(record.elo);
      record.badge = tier.badge;
      record.tier = tier.name;
      record.color = tier.color;
      record.lastPlayed = Date.now();
    }

    this.saveData();
  }

  getLeaderboard(limit = 20) {
    const list = Array.from(this.players.values());
    list.sort((a, b) => b.elo - a.elo || (b.kills - b.deaths) - (a.kills - a.deaths));
    
    return list.slice(0, limit).map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      elo: p.elo,
      kills: p.kills,
      deaths: p.deaths,
      kd: p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2),
      wins: p.wins,
      matches: p.matches,
      winRate: p.matches > 0 ? Math.round((p.wins / p.matches) * 100) + '%' : '0%',
      badge: p.badge,
      tier: p.tier,
      color: p.color
    }));
  }
}

module.exports = new LeaderboardStore();
