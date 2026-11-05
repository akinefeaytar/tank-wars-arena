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

  // Lobby Buttons
  const menuScreen = document.getElementById('menuScreen');
  const gameHUD = document.getElementById('gameHUD');

  function enterGame(roomId = null) {
    const name = nameInput ? nameInput.value.trim() : 'Komutan';
    localStorage.setItem('tank_player_name', name);

    window.audioManager.ensureContext();
    client.joinGame(name, roomId);

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

      client.createRoom({
        creatorName,
        name: roomName,
        botCount,
        mapId
      }, (res) => {
        if (res && res.success) {
          createRoomModal.classList.remove('active');
          menuScreen.classList.add('hidden');
          gameHUD.classList.remove('hidden');

          // Copy invite link
          const inviteUrl = `${window.location.origin}/?room=${res.roomCode}`;
          window.UI.showToast(`Özel Oda Açıldı! Davet Kodu: ${res.roomCode}`);
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
    gameHUD.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    window.history.replaceState({}, '', '/');
    loadPlayerProfile(nameInput.value.trim());
    window.UI.showToast('Lobidesiniz.');
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

        // Close any open modals first
        if (leaderboardModal && leaderboardModal.classList.contains('active')) {
          leaderboardModal.classList.remove('active');
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

