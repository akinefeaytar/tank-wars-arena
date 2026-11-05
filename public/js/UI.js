class UIManager {
  constructor() {
    this.cachedKillFeedIds = new Set();
    this.isTabOpen = false;
    this.lastMatchState = 'waiting';
  }

  updateHUD(state, localPlayerId) {
    if (!state) return;

    // 1. Match Timer
    const timerElem = document.getElementById('hudTimer');
    if (timerElem) {
      const mins = Math.floor(state.timeRemaining / 60);
      const secs = state.timeRemaining % 60;
      timerElem.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 2. Local Player Status
    const localTank = state.tanks.find(t => t.id === localPlayerId);
    if (localTank) {
      // Health
      const hpPct = Math.max(0, (localTank.health / localTank.maxHealth) * 100);
      const hpFill = document.getElementById('hudHealthFill');
      const hpVal = document.getElementById('hudHealthVal');
      if (hpFill) hpFill.style.width = `${hpPct}%`;
      if (hpVal) hpVal.textContent = `${Math.ceil(localTank.health)} / ${localTank.maxHealth}`;

      // Shield
      const shPct = Math.max(0, (localTank.shield / localTank.maxShield) * 100);
      const shFill = document.getElementById('hudShieldFill');
      const shVal = document.getElementById('hudShieldVal');
      if (shFill) shFill.style.width = `${shPct}%`;
      if (shVal) shVal.textContent = `${Math.ceil(localTank.shield)} / ${localTank.maxShield}`;

      // Weapon
      const wpnElem = document.getElementById('hudWeaponName');
      if (wpnElem) {
        const names = {
          standard: 'Standart Top',
          triple: '🔥 Üçlü Namlu',
          sniper: '⚡ Raygun / Sniper',
          rocket: '🚀 Güdümlü Roket',
          shotgun: '🟣 Pompalı'
        };
        wpnElem.textContent = names[localTank.weaponId] || 'Standart Top';
      }

      // Kills & Streak
      const scoreElem = document.getElementById('hudScoreStats');
      if (scoreElem) {
        scoreElem.textContent = `Skor: ${localTank.score} | Leş: ${localTank.kills} | Seri: ${localTank.streak}`;
      }
    }

    // 3. Kill Feed
    this.renderKillFeed(state.killFeed);

    // 4. Update Tab Scoreboard if open
    if (this.isTabOpen) {
      this.renderScoreboard(state.tanks, localPlayerId);
    }

    // 5. Match End Detection
    if (state.matchState === 'ended' && this.lastMatchState !== 'ended') {
      this.showMatchEnd(state.endSummary);
    } else if (state.matchState === 'playing' && this.lastMatchState === 'ended') {
      this.hideMatchEnd();
    }
    this.lastMatchState = state.matchState;
  }

  renderKillFeed(killFeed) {
    const feedContainer = document.getElementById('killFeedContainer');
    if (!feedContainer || !killFeed) return;

    for (const item of killFeed) {
      if (!this.cachedKillFeedIds.has(item.id)) {
        this.cachedKillFeedIds.add(item.id);

        const el = document.createElement('div');
        el.className = 'kill-feed-item';
        
        const weaponNames = {
          standard: '💥 Top',
          triple: '🔥 Üçlü',
          sniper: '⚡ Sniper',
          rocket: '🚀 Roket',
          suicide: '💀 İntihar'
        };
        const weaponStr = weaponNames[item.weapon] || '💥';

        el.innerHTML = `
          <span class="killer-name">${item.killer}</span>
          <span class="kill-weapon">${weaponStr}</span>
          <span class="victim-name">${item.victim}</span>
          ${item.streak >= 3 ? `<span style="color:#ffbe0b;">(🔥 ${item.streak})</span>` : ''}
        `;

        feedContainer.appendChild(el);

        // Auto remove after 5 seconds
        setTimeout(() => {
          el.remove();
        }, 5000);
      }
    }
  }

  toggleScoreboard(show) {
    this.isTabOpen = show;
    const overlay = document.getElementById('scoreboardOverlay');
    if (overlay) {
      overlay.classList.toggle('visible', show);
    }
    if (show && window.client && window.client.gameState) {
      this.renderScoreboard(window.client.gameState.tanks, window.client.localPlayerId);
    }
  }

  renderScoreboard(tanks, localPlayerId) {
    const tbody = document.getElementById('scoreboardBody');
    if (!tbody || !tanks) return;

    const sorted = [...tanks].sort((a, b) => b.kills - a.kills || b.score - a.score);

    tbody.innerHTML = sorted.map((t, idx) => {
      const isLocal = t.id === localPlayerId;
      const rowStyle = isLocal ? 'background: rgba(0, 242, 254, 0.12); font-weight: 700;' : '';
      return `
        <tr style="${rowStyle}">
          <td class="rank-num rank-num-${idx + 1}">${idx + 1}</td>
          <td class="player-col">
            <span style="font-size: 16px;">${t.badge || '🥉'}</span>
            <span style="color: ${t.color}">${t.name}</span>
            ${t.isBot ? '<span style="font-size: 10px; color:#ff3838; background:rgba(255,0,0,0.1); padding:2px 6px; border-radius:4px;">BOT</span>' : ''}
            ${isLocal ? '<span style="font-size: 10px; color:#00f2fe;">(SEN)</span>' : ''}
          </td>
          <td>${t.score}</td>
          <td style="color:#2ed573; font-weight:700;">${t.kills}</td>
          <td style="color:#ff4757;">${t.deaths}</td>
          <td>🔥 ${t.streak}</td>
        </tr>
      `;
    }).join('');
  }

  showDeathAlert() {
    this.showToast('Tankın patlatıldı! 3 saniye içinde yeniden doğacaksın...');
  }

  showMatchEnd(summary) {
    const overlay = document.getElementById('matchEndOverlay');
    if (!overlay) return;

    overlay.classList.add('visible');

    const winnerElem = document.getElementById('matchWinnerName');
    if (winnerElem) {
      winnerElem.textContent = summary ? summary.winner : 'Maç Bitti';
    }

    const tbody = document.getElementById('matchEndScoreboard');
    if (tbody && summary && summary.leaderboard) {
      tbody.innerHTML = summary.leaderboard.map((item, idx) => `
        <tr>
          <td class="rank-num rank-num-${idx + 1}">${idx + 1}</td>
          <td class="player-col">${item.name} ${item.isBot ? '(BOT)' : ''}</td>
          <td style="color:#2ed573;">${item.kills}</td>
          <td style="color:#ff4757;">${item.deaths}</td>
          <td>${item.score}</td>
        </tr>
      `).join('');
    }
  }

  hideMatchEnd() {
    const overlay = document.getElementById('matchEndOverlay');
    if (overlay) {
      overlay.classList.remove('visible');
    }
  }

  addChatMessage(msg) {
    const log = document.getElementById('chatLog');
    if (!log) return;

    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = `<span style="color:${msg.color}; font-weight:700;">${msg.sender}:</span> <span>${msg.message}</span>`;
    log.appendChild(line);

    // Limit to 6 visible messages
    while (log.children.length > 6) {
      log.removeChild(log.firstChild);
    }

    log.scrollTop = log.scrollHeight;

    // Smoothly fade out old messages after 10 seconds
    setTimeout(() => {
      line.style.transition = 'opacity 1s ease';
      line.style.opacity = '0';
      setTimeout(() => {
        if (line.parentNode) line.remove();
      }, 1000);
    }, 10000);
  }

  updateLeaderboardModal(leaderboard) {
    const tbody = document.getElementById('leaderboardModalBody');
    if (!tbody) return;

    if (!leaderboard || leaderboard.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px 10px; color: var(--text-muted); font-size: 15px;">
            🎖️ Henüz online oyuncu kaydı bulunmuyor.<br>
            <span style="color: var(--accent-cyan); font-size: 13px; margin-top: 6px; display: inline-block;">Savaşa girip ilk leşini alarak sıralamada 1 numara ol!</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = leaderboard.map(p => `
      <tr>
        <td class="rank-num rank-num-${p.rank}">${p.rank}</td>
        <td class="player-col">
          <span style="font-size: 18px;">${p.badge}</span>
          <span style="color:${p.color}">${p.name}</span>
          <span style="font-size: 11px; color:#8b9bb4;">[${p.tier}]</span>
        </td>
        <td style="color:#00f2fe; font-weight:700;">${p.elo}</td>
        <td style="color:#2ed573;">${p.kills}</td>
        <td style="color:#ff4757;">${p.deaths}</td>
        <td>${p.kd}</td>
        <td>${p.wins} (${p.winRate})</td>
      </tr>
    `).join('');
  }

  showToast(text) {
    const old = document.querySelector('.toast-notice');
    if (old) old.remove();

    const t = document.createElement('div');
    t.className = 'toast-notice';
    t.textContent = text;
    document.body.appendChild(t);

    setTimeout(() => {
      t.remove();
    }, 3500);
  }
}

window.UI = new UIManager();

