document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const minimapCanvas = document.getElementById('minimapCanvas');

  // Initialize Core Systems
  const particles = new ParticleSystem();
  const renderer = new Renderer(canvas, minimapCanvas);
  const client = new GameClient();
  window.client = client;

  client.init(renderer, particles);

  // Profile and Stored Nickname
  const nameInput = document.getElementById('playerNameInput');
  const storedName = localStorage.getItem('tank_player_name') || `Komutan_${Math.floor(Math.random() * 900 + 100)}`;
  if (nameInput) {
    nameInput.value = storedName;
    nameInput.addEventListener('change', () => {
      localStorage.setItem('tank_player_name', nameInput.value.trim());
      loadPlayerProfile(nameInput.value.trim());
    });
  }

  // Load Career Stats for Banner
  function loadPlayerProfile(name) {
    fetch(`/api/player/${encodeURIComponent(name || storedName)}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok' && data.player) {
          const p = data.player;
          const badgeElem = document.getElementById('profileBadge');
          const tierElem = document.getElementById('profileTier');
          const eloElem = document.getElementById('profileEloVal');
          if (badgeElem) badgeElem.textContent = p.badge;
          if (tierElem) {
            tierElem.textContent = p.tier;
            tierElem.style.color = p.color || '#ffd700';
          }
          if (eloElem) eloElem.textContent = p.elo;
        }
      })
      .catch(e => console.warn('Profile fetch failed:', e));
  }
  loadPlayerProfile(storedName);

  // Check URL query parameters for direct room invite: ?room=XYZ
  const urlParams = new URLSearchParams(window.location.search);
  const inviteRoom = urlParams.get('room');
  if (inviteRoom) {
    window.UI.showToast(`Arkadaş odası tespit edildi: #${inviteRoom}`);
    const roomCodeInput = document.getElementById('joinRoomCodeInput');
    if (roomCodeInput) roomCodeInput.value = inviteRoom;
  }

  // Tank Customization (Garage) Management
  let currentCustomization = {
    color: '#00e5ff',
    camo: 'none',
    tankClass: 'balanced'
  };

  try {
    const savedCustom = localStorage.getItem('tank_customization');
    if (savedCustom) {
      currentCustomization = { ...currentCustomization, ...JSON.parse(savedCustom) };
    }
  } catch (e) {
    console.warn('Failed parsing saved customization', e);
  }

  const garagePreviewCanvas = document.getElementById('garagePreviewCanvas');
  const previewClassName = document.getElementById('previewClassName');

  function renderGaragePreview() {
    if (!garagePreviewCanvas) return;
    const ctx = garagePreviewCanvas.getContext('2d');
    const w = garagePreviewCanvas.width;
    const h = garagePreviewCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const isTitan = currentCustomization.tankClass === 'titan';
    const isScout = currentCustomization.tankClass === 'scout';

    const bodyW = isTitan ? 46 : isScout ? 36 : 40;
    const bodyH = isTitan ? 54 : isScout ? 42 : 48;
    const color = currentCustomization.color || '#00e5ff';
    const camo = currentCustomization.camo || 'none';

    ctx.save();
    ctx.translate(cx, cy);

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-bodyW/2 - 7, -bodyH/2, 6, bodyH);
    ctx.fillRect(bodyW/2 + 1, -bodyH/2, 6, bodyH);
    ctx.restore();

    // Tracks
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-bodyW/2 - 7, -bodyH/2, 6, bodyH);
    ctx.fillRect(bodyW/2 + 1, -bodyH/2, 6, bodyH);

    // Tread lines
    ctx.fillStyle = '#0f172a';
    for (let y = -bodyH/2; y < bodyH/2; y += 6) {
      ctx.fillRect(-bodyW/2 - 7, y, 6, 2);
      ctx.fillRect(bodyW/2 + 1, y, 6, 2);
    }

    // Chassis
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(-bodyW/2, -bodyH/2, bodyW, bodyH);

    ctx.fillStyle = color;
    ctx.fillRect(-bodyW/2 + 3, -bodyH/2 + 3, bodyW - 6, bodyH - 6);

    // Camo overlay
    if (camo === 'stripes') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.moveTo(-bodyW/2 + 5, -bodyH/2);
      ctx.lineTo(bodyW/2 - 5, bodyH/2);
      ctx.lineTo(bodyW/2 - 12, bodyH/2);
      ctx.lineTo(-bodyW/2, -bodyH/2 + 8);
      ctx.fill();
    } else if (camo === 'carbon') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      for (let x = -bodyW/2 + 4; x < bodyW/2 - 4; x += 6) {
        for (let y = -bodyH/2 + 4; y < bodyH/2 - 4; y += 6) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
    } else if (camo === 'digital') {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(-bodyW/4, -bodyH/4, 10, 10);
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-bodyW/3, 2, 7, 7);
      ctx.fillRect(2, -bodyH/3, 9, 9);
    } else if (camo === 'neon') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-bodyW/2 + 4, -bodyH/2 + 4, bodyW - 8, bodyH - 8);
    }

    // Turret Barrel
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-3, -bodyH/2 - 14, 6, 18);

    // Turret Center
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (previewClassName) {
      const names = {
        scout: '⚡ İZCİ (SCOUT) - HIZLI & ÇEVİK',
        balanced: '🛡️ DENGELİ SAVAŞÇI - KUSURSUZ DENGE',
        titan: '🦾 TİTAN - AĞIR ZIRH & YÜKSEK HP'
      };
      previewClassName.textContent = names[currentCustomization.tankClass] || 'DENGELİ SAVAŞÇI';
    }
  }

  // Garage Modal wiring
  const btnOpenGarageModal = document.getElementById('btnOpenGarageModal');
  const garageModal = document.getElementById('garageModal');
  const btnCloseGarageModal = document.getElementById('btnCloseGarageModal');
  const btnSaveGarage = document.getElementById('btnSaveGarage');

  if (btnOpenGarageModal && garageModal) {
    btnOpenGarageModal.addEventListener('click', () => {
      // Sync UI buttons to currentCustomization
      document.querySelectorAll('.garage-class-card').forEach(b => {
        b.classList.toggle('active', b.dataset.class === currentCustomization.tankClass);
      });
      document.querySelectorAll('.swatch-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.color.toLowerCase() === currentCustomization.color.toLowerCase());
      });
      document.querySelectorAll('.camo-card-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.camo === currentCustomization.camo);
      });

      renderGaragePreview();
      garageModal.classList.add('active');
    });
  }

  if (btnCloseGarageModal && garageModal) {
    btnCloseGarageModal.addEventListener('click', () => {
      garageModal.classList.remove('active');
    });
  }

  // Class card clicks
  document.querySelectorAll('.garage-class-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.garage-class-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      currentCustomization.tankClass = card.dataset.class;
      renderGaragePreview();
    });
  });

  // Color swatch clicks
  document.querySelectorAll('.swatch-btn').forEach(swatch => {
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.swatch-btn').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      currentCustomization.color = swatch.dataset.color;
      renderGaragePreview();
    });
  });

  // Camo clicks
  document.querySelectorAll('.camo-card-btn').forEach(camoBtn => {
    camoBtn.addEventListener('click', () => {
      document.querySelectorAll('.camo-card-btn').forEach(c => c.classList.remove('active'));
      camoBtn.classList.add('active');
      currentCustomization.camo = camoBtn.dataset.camo;
      renderGaragePreview();
    });
  });

  if (btnSaveGarage && garageModal) {
    btnSaveGarage.addEventListener('click', () => {
      localStorage.setItem('tank_customization', JSON.stringify(currentCustomization));
      garageModal.classList.remove('active');
      window.UI.showToast('Tank kişiselleştirmesi kaydedildi ve kuşandı!');
    });
  }

  // Lobby Buttons
  const menuScreen = document.getElementById('menuScreen');
  const gameHUD = document.getElementById('gameHUD');

  function enterGame(roomId = null) {
    const name = nameInput ? nameInput.value.trim() : 'Komutan';
    localStorage.setItem('tank_player_name', name);

    window.audioManager.ensureContext();
    client.joinGame(name, roomId, currentCustomization);

    menuScreen.classList.add('hidden');
    gameHUD.classList.remove('hidden');
  }

  // 1. Quick Match
  const btnQuickPlay = document.getElementById('btnQuickPlay');
  if (btnQuickPlay) {
    btnQuickPlay.addEventListener('click', () => {
      enterGame('public_arena');
    });
  }

  // 2. Create Custom Room Modal
  const btnOpenCreateModal = document.getElementById('btnOpenCreateModal');
  const createRoomModal = document.getElementById('createRoomModal');
  const btnCloseCreateModal = document.getElementById('btnCloseCreateModal');
  const btnConfirmCreateRoom = document.getElementById('btnConfirmCreateRoom');

  if (btnOpenCreateModal && createRoomModal) {
    btnOpenCreateModal.addEventListener('click', () => {
      createRoomModal.classList.add('active');
    });
  }
  if (btnCloseCreateModal && createRoomModal) {
    btnCloseCreateModal.addEventListener('click', () => {
      createRoomModal.classList.remove('active');
    });
  }

  if (btnConfirmCreateRoom) {
    btnConfirmCreateRoom.addEventListener('click', () => {
      const creatorName = nameInput.value.trim() || 'Komutan';
      const roomName = document.getElementById('customRoomName').value || `${creatorName}'in Özel Odası`;
      const botCount = parseInt(document.getElementById('customBotCount').value, 10);
      const mapId = document.getElementById('customMapSelect').value;
      const mode = document.getElementById('customModeSelect') ? document.getElementById('customModeSelect').value : 'ffa';
      const botDifficulty = document.getElementById('customBotDiffSelect') ? document.getElementById('customBotDiffSelect').value : 'normal';

      client.createRoom({
        creatorName,
        name: roomName,
        botCount,
        mapId,
        mode,
        botDifficulty,
        customization: currentCustomization
      }, (res) => {
        if (res && res.success) {
          createRoomModal.classList.remove('active');
          menuScreen.classList.add('hidden');
          gameHUD.classList.remove('hidden');

          // Copy invite link
          const inviteUrl = `${window.location.origin}/?room=${res.roomCode}`;
          window.UI.showToast(`Özel Oda Açıldı! [${mode.toUpperCase()} - ${botDifficulty.toUpperCase()}] Davet Kodu: ${res.roomCode}`);
        }
      });
    });
  }

  // 3. Join Custom Room
  const btnJoinWithCode = document.getElementById('btnJoinWithCode');
  const joinRoomCodeInput = document.getElementById('joinRoomCodeInput');

  if (btnJoinWithCode && joinRoomCodeInput) {
    btnJoinWithCode.addEventListener('click', () => {
      const code = joinRoomCodeInput.value.trim().toUpperCase();
      if (!code) {
        window.UI.showToast('Lütfen geçerli bir oda kodu girin!');
        return;
      }
      enterGame(`room_${code}`);
    });
  }

  // 4. Leaderboard Modal
  const btnOpenLeaderboard = document.getElementById('btnOpenLeaderboard');
  const leaderboardModal = document.getElementById('leaderboardModal');
  const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');

  if (btnOpenLeaderboard && leaderboardModal) {
    btnOpenLeaderboard.addEventListener('click', () => {
      client.requestLeaderboard();
      leaderboardModal.classList.add('active');
    });
  }
  if (btnCloseLeaderboard && leaderboardModal) {
    btnCloseLeaderboard.addEventListener('click', () => {
      leaderboardModal.classList.remove('active');
    });
  }

  // 5. How to Play Modal
  const btnOpenGuide = document.getElementById('btnOpenGuide');
  const guideModal = document.getElementById('guideModal');
  const btnCloseGuide = document.getElementById('btnCloseGuide');

  if (btnOpenGuide && guideModal) {
    btnOpenGuide.addEventListener('click', () => {
      guideModal.classList.add('active');
    });
  }
  if (btnCloseGuide && guideModal) {
    btnCloseGuide.addEventListener('click', () => {
      guideModal.classList.remove('active');
    });
  }

  // Copy Room Link from in-game HUD
  const hudRoomCode = document.getElementById('hudRoomCode');
  if (hudRoomCode) {
    hudRoomCode.addEventListener('click', () => {
      const text = hudRoomCode.textContent.replace('#', '');
      const inviteUrl = `${window.location.origin}/?room=${text}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        window.UI.showToast('Davet linki panoya kopyalandı! Arkadaşına at.');
      }).catch(() => {
        window.UI.showToast(`Oda Kodu: ${text}`);
      });
    });
  }

  // In-Game Exit & Pause Menu Handling
  const pauseMenuModal = document.getElementById('pauseMenuModal');
  const btnLeaveMatch = document.getElementById('btnLeaveMatch');
  const btnClosePauseModal = document.getElementById('btnClosePauseModal');
  const btnResumeGame = document.getElementById('btnResumeGame');
  const btnConfirmLeaveGame = document.getElementById('btnConfirmLeaveGame');
  const btnPauseLeaderboard = document.getElementById('btnPauseLeaderboard');

  function openPauseMenu() {
    if (pauseMenuModal) pauseMenuModal.classList.add('active');
  }

  function closePauseMenu() {
    if (pauseMenuModal) pauseMenuModal.classList.remove('active');
  }

  function leaveGameToLobby() {
    client.leaveGame();
    closePauseMenu();
    if (window.UI) {
      window.UI.toggleScoreboard(false);
    }
    gameHUD.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    window.history.replaceState({}, '', '/');
    loadPlayerProfile(nameInput.value.trim());
    window.UI.showToast('Lobidesiniz.');
  }

  // Scoreboard Close Button
  const btnCloseScoreboardOverlay = document.getElementById('btnCloseScoreboardOverlay');
  if (btnCloseScoreboardOverlay) {
    btnCloseScoreboardOverlay.addEventListener('click', () => {
      if (window.UI) {
        window.UI.toggleScoreboard(false);
      }
    });
  }

  if (btnLeaveMatch) {
    btnLeaveMatch.addEventListener('click', () => {
      openPauseMenu();
    });
  }

  if (btnClosePauseModal) {
    btnClosePauseModal.addEventListener('click', closePauseMenu);
  }

  if (btnResumeGame) {
    btnResumeGame.addEventListener('click', closePauseMenu);
  }

  if (btnConfirmLeaveGame) {
    btnConfirmLeaveGame.addEventListener('click', leaveGameToLobby);
  }

  if (btnPauseLeaderboard) {
    btnPauseLeaderboard.addEventListener('click', () => {
      client.requestLeaderboard();
      leaderboardModal.classList.add('active');
    });
  }

  // In-Game Tactical Chat & ESC Key Navigation
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const text = chatInput.value.trim();
        if (text) {
          client.sendChat(text);
          chatInput.value = '';
        }
        chatInput.blur();
      } else if (e.key === 'Escape') {
        chatInput.blur();
      }
    });

    window.addEventListener('keydown', (e) => {
      // If ESC is pressed
      if (e.key === 'Escape') {
        if (document.activeElement === chatInput) {
          chatInput.blur();
          return;
        }

        // Close scoreboard or modals first
        if (window.UI && window.UI.isTabOpen) {
          window.UI.toggleScoreboard(false);
          return;
        }
        if (leaderboardModal && leaderboardModal.classList.contains('active')) {
          leaderboardModal.classList.remove('active');
          return;
        }
        if (garageModal && garageModal.classList.contains('active')) {
          garageModal.classList.remove('active');
          return;
        }
        if (guideModal && guideModal.classList.contains('active')) {
          guideModal.classList.remove('active');
          return;
        }
        if (createRoomModal && createRoomModal.classList.contains('active')) {
          createRoomModal.classList.remove('active');
          return;
        }

        // If in game, toggle pause/exit menu
        if (menuScreen.classList.contains('hidden')) {
          if (pauseMenuModal.classList.contains('active')) {
            closePauseMenu();
          } else {
            openPauseMenu();
          }
        }
        return;
      }

      // Focus chat when Enter is pressed while in-game
      if (e.key === 'Enter' && document.activeElement !== chatInput && menuScreen.classList.contains('hidden') && !pauseMenuModal.classList.contains('active')) {
        e.preventDefault();
        chatInput.focus();
      }
    });
  }
});

