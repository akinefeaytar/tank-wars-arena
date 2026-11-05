class Renderer {
  constructor(canvas, minimapCanvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');

    this.camera = { x: 0, y: 0, zoom: 1 };
    this.tileSize = 60;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  render(gameState, localPlayerId, particles) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!gameState || !gameState.map) return;

    // 1. Center camera on local player tank
    const localTank = gameState.tanks.find(t => t.id === localPlayerId);
    if (localTank) {
      // Smooth camera interpolation
      const targetCamX = localTank.x - this.canvas.width / 2;
      const targetCamY = localTank.y - this.canvas.height / 2;
      this.camera.x += (targetCamX - this.camera.x) * 0.12;
      this.camera.y += (targetCamY - this.camera.y) * 0.12;
    }

    // Apply screen shake
    let shakeX = 0;
    let shakeY = 0;
    if (particles && particles.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * particles.screenShake;
      shakeY = (Math.random() - 0.5) * particles.screenShake;
    }

    ctx.save();
    ctx.translate(-this.camera.x + shakeX, -this.camera.y + shakeY);

    // 2. Render Arena Ground & Grid
    this.renderGround(ctx, gameState.map);

    // 3. Render Tank Treads Tracks
    if (particles) {
      particles.renderTracks(ctx);
    }

    // 4. Render Powerups
    this.renderPowerups(ctx, gameState.powerups);

    // 5. Render Tanks
    this.renderTanks(ctx, gameState.tanks, localPlayerId);

    // 6. Render Bullets
    this.renderBullets(ctx, gameState.bullets);

    // 7. Render Particles & Damage text
    if (particles) {
      particles.renderParticles(ctx);
    }

    // 8. Render Map Tiles (Steel, Brick, Bushes)
    this.renderTiles(ctx, gameState.map);

    ctx.restore();

    // 9. Render Minimap
    this.renderMinimap(gameState, localPlayerId);
  }

  renderGround(ctx, map) {
    const mapW = map.cols * this.tileSize;
    const mapH = map.rows * this.tileSize;

    // Ground floor base
    ctx.fillStyle = '#121822';
    ctx.fillRect(0, 0, mapW, mapH);

    // Tactical ground grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= mapW; x += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mapH);
      ctx.stroke();
    }
    for (let y = 0; y <= mapH; y += this.tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(mapW, y);
      ctx.stroke();
    }

    // Outer boundary hazard border
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, mapW, mapH);
  }

  renderTiles(ctx, map) {
    const grid = map.grid;
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const tile = grid[r][c];
        if (tile === 0) continue;

        const x = c * this.tileSize;
        const y = r * this.tileSize;

        if (tile === 1) {
          // Steel Wall (Indestructible)
          ctx.fillStyle = '#1e2838';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);

          // Metallic bevel & rivet details
          ctx.strokeStyle = '#384860';
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);

          ctx.fillStyle = '#00f2fe';
          ctx.fillRect(x + 6, y + 6, 4, 4);
          ctx.fillRect(x + this.tileSize - 10, y + 6, 4, 4);
          ctx.fillRect(x + 6, y + this.tileSize - 10, 4, 4);
          ctx.fillRect(x + this.tileSize - 10, y + this.tileSize - 10, 4, 4);
        } else if (tile === 2) {
          // Brick Block (Destructible)
          ctx.fillStyle = '#8b3a2b';
          ctx.fillRect(x, y, this.tileSize, this.tileSize);

          // Brick lines pattern
          ctx.strokeStyle = '#4a1d15';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, this.tileSize, this.tileSize);

          ctx.beginPath();
          ctx.moveTo(x, y + this.tileSize / 2);
          ctx.lineTo(x + this.tileSize, y + this.tileSize / 2);
          ctx.moveTo(x + this.tileSize / 2, y);
          ctx.lineTo(x + this.tileSize / 2, y + this.tileSize / 2);
          ctx.stroke();
        } else if (tile === 4) {
          // Bush (Concealment)
          ctx.fillStyle = 'rgba(28, 94, 48, 0.75)';
          ctx.beginPath();
          ctx.roundRect(x, y, this.tileSize, this.tileSize, 10);
          ctx.fill();

          ctx.strokeStyle = '#2ed573';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  renderTanks(ctx, tanks, localPlayerId) {
    for (const tank of tanks) {
      if (tank.health <= 0) continue;

      ctx.save();
      ctx.translate(tank.x, tank.y);

      // Dash trail glow
      if (tank.isDashing) {
        ctx.save();
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 1. Tank Chassis (Hull & Treads)
      ctx.save();
      ctx.rotate(tank.angle);

      // Left & Right Treads
      ctx.fillStyle = '#181e26';
      ctx.fillRect(-22, -22, 44, 9);
      ctx.fillRect(-22, 13, 44, 9);

      // Tread ribs
      ctx.fillStyle = '#323f4f';
      for (let tx = -20; tx <= 16; tx += 6) {
        ctx.fillRect(tx, -22, 2, 9);
        ctx.fillRect(tx, 13, 2, 9);
      }

      // Main Hull Body
      ctx.fillStyle = tank.color;
      ctx.beginPath();
      ctx.roundRect(-18, -13, 36, 26, 6);
      ctx.fill();

      // Armor plating highlights
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Exhaust pipe
      ctx.fillStyle = '#0a0d12';
      ctx.fillRect(-20, -6, 4, 12);

      ctx.restore();

      // 2. Turret & Cannon Barrel
      ctx.save();
      ctx.rotate(tank.turretAngle);

      // Cannon Barrel
      const barrelLen = tank.weaponId === 'sniper' ? 38 : (tank.weaponId === 'rocket' ? 28 : 30);
      const barrelWidth = tank.weaponId === 'rocket' ? 9 : 6;

      ctx.fillStyle = '#222c38';
      ctx.fillRect(0, -barrelWidth / 2, barrelLen, barrelWidth);

      // Muzzle Brake
      ctx.fillStyle = tank.color;
      ctx.fillRect(barrelLen - 4, -barrelWidth / 2 - 1.5, 4, barrelWidth + 3);

      // Turret Dome
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#1c2430';
      ctx.fill();
      ctx.strokeStyle = tank.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Commander Hatch
      ctx.beginPath();
      ctx.arc(-3, 0, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#2f3b4c';
      ctx.fill();

      // Laser guide line for local player
      if (tank.id === localPlayerId) {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(barrelLen, 0);
        ctx.lineTo(barrelLen + 600, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();

      // 3. Overhead Name, Rank & Health/Shield Bars
      this.renderOverheadHUD(ctx, tank);

      ctx.restore();
    }
  }

  renderOverheadHUD(ctx, tank) {
    const overheadY = -36;

    // Rank Badge & Name
    ctx.font = 'bold 13px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;

    const streakIcon = tank.streak >= 3 ? '🔥 ' : '';
    const nameText = `${tank.badge} ${streakIcon}${tank.name}`;

    ctx.fillStyle = tank.isBot ? '#ff5252' : '#ffffff';
    ctx.fillText(nameText, 0, overheadY - 8);

    // Health Bar Container
    const barW = 46;
    const barH = 5;
    const barX = -barW / 2;
    const barY = overheadY;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Health Fill
    const healthPct = Math.max(0, tank.health / tank.maxHealth);
    ctx.fillStyle = healthPct > 0.5 ? '#2ed573' : (healthPct > 0.25 ? '#ffa502' : '#ff4757');
    ctx.fillRect(barX, barY, barW * healthPct, barH);

    // Shield Bar (if any)
    if (tank.shield > 0) {
      const shieldPct = Math.min(1, tank.shield / tank.maxShield);
      ctx.fillStyle = '#00f2fe';
      ctx.fillRect(barX, barY - 3, barW * shieldPct, 2.5);
    }
  }

  renderBullets(ctx, bullets) {
    for (const b of bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = b.color;

      if (b.weaponId === 'rocket') {
        // Rocket missile body + flame
        ctx.fillRect(-10, -3.5, 16, 7);
        ctx.fillStyle = '#ff3300';
        ctx.beginPath();
        ctx.moveTo(-10, -3);
        ctx.lineTo(-16, 0);
        ctx.lineTo(-10, 3);
        ctx.fill();
      } else if (b.weaponId === 'sniper') {
        // High speed laser bolt
        ctx.fillRect(-16, -2, 28, 4);
      } else {
        // Regular glowing round projectile
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  renderPowerups(ctx, powerups) {
    const t = Date.now() / 250;
    for (const pu of powerups) {
      ctx.save();
      ctx.translate(pu.x, pu.y + Math.sin(t) * 3);

      // Glowing aura
      ctx.shadowColor = pu.color;
      ctx.shadowBlur = 15;

      // Hexagonal crate box
      ctx.fillStyle = 'rgba(15, 22, 33, 0.9)';
      ctx.strokeStyle = pu.color;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Powerup Emoji / Icon
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.icon, 0, 1);

      ctx.restore();
    }
  }

  renderMinimap(gameState, localPlayerId) {
    const mCtx = this.minimapCtx;
    const map = gameState.map;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    mCtx.clearRect(0, 0, w, h);

    const scaleX = w / (map.cols * this.tileSize);
    const scaleY = h / (map.rows * this.tileSize);

    // Minimap Background
    mCtx.fillStyle = 'rgba(8, 12, 18, 0.9)';
    mCtx.fillRect(0, 0, w, h);

    // Walls
    mCtx.fillStyle = '#3a4a60';
    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        if (map.grid[r][c] === 1 || map.grid[r][c] === 2) {
          mCtx.fillRect(c * this.tileSize * scaleX, r * this.tileSize * scaleY, this.tileSize * scaleX, this.tileSize * scaleY);
        }
      }
    }

    // Powerups
    mCtx.fillStyle = '#00f2fe';
    for (const pu of gameState.powerups) {
      mCtx.fillRect(pu.x * scaleX - 2, pu.y * scaleY - 2, 4, 4);
    }

    // Tanks
    for (const tank of gameState.tanks) {
      if (tank.health <= 0) continue;
      const isLocal = tank.id === localPlayerId;
      mCtx.fillStyle = isLocal ? '#00f2fe' : (tank.isBot ? '#ff3838' : '#ffe600');

      mCtx.beginPath();
      mCtx.arc(tank.x * scaleX, tank.y * scaleY, isLocal ? 3.5 : 2.5, 0, Math.PI * 2);
      mCtx.fill();
    }
  }
}

window.Renderer = Renderer;

