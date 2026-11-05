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
          this.players.set(key.toLowerCase(), val);
        }
      }
    } catch (err) {
      console.error('Error loading leaderboard data:', err.message);
    }

    // Seed default champions if empty so the leaderboard is instantly lively
    if (this.players.size === 0) {
      this.seedDefaultRankings();
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

  seedDefaultRankings() {
    const defaults = [
      { name: 'Fatih_Komutan', elo: 2450, kills: 1420, deaths: 410, wins: 88, matches: 110, streak: 14 },
      { name: 'Ghost_Panzer', elo: 2180, kills: 980, deaths: 350, wins: 56, matches: 75, streak: 9 },
      { name: 'Demir_Yumruk', elo: 1920, kills: 740, deaths: 310, wins: 41, matches: 62, streak: 7 },
      { name: 'Sniper_Alpha', elo: 1650, kills: 520, deaths: 270, wins: 30, matches: 50, streak: 5 },
      { name: 'Ates_Hatti', elo: 1380, kills: 380, deaths: 240, wins: 18, matches: 35, streak: 4 },
      { name: 'Zırhlı_Birlik', elo: 1150, kills: 210, deaths: 180, wins: 11, matches: 25, streak: 3 },
      { name: 'Caylak_Tankci', elo: 950, kills: 85, deaths: 120, wins: 3, matches: 15, streak: 2 }
    ];

    for (const d of defaults) {
      const rankInfo = this.getTierForElo(d.elo);
      this.players.set(d.name.toLowerCase(), {
        name: d.name,
        elo: d.elo,
        kills: d.kills,
        deaths: d.deaths,
        wins: d.wins,
        matches: d.matches,
        highestStreak: d.streak,
        badge: rankInfo.badge,
        tier: rankInfo.name,
        color: rankInfo.color,
        lastPlayed: Date.now() - Math.floor(Math.random() * 86400000)
      });
    }
    this.saveData();
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

  recordMatch(matchSummary) {
    // matchSummary: [{ name, kills, deaths, score, won, maxStreak, isBot }]
    for (const entry of matchSummary) {
      if (entry.isBot) continue; // Only persist human player stats
      
      const record = this.getOrCreatePlayer(entry.name);
      record.kills += entry.kills || 0;
      record.deaths += entry.deaths || 0;
      record.matches += 1;
      if (entry.won) record.wins += 1;
      if (entry.maxStreak && entry.maxStreak > record.highestStreak) {
        record.highestStreak = entry.maxStreak;
      }

      // ELO Calculation: Kills (+15), Deaths (-8), Win (+30), Match participation (+5)
      const eloGain = (entry.kills * 15) - (entry.deaths * 8) + (entry.won ? 30 : 5);
      record.elo = Math.max(100, record.elo + eloGain);

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

