class ParticleSystem {
  constructor() {
    this.particles = [];
    this.tracks = []; // Persistent tank tread tracks
    this.damageTexts = [];
    this.screenShake = 0;
  }

  addTrack(x, y, angle) {
    this.tracks.push({
      x,
      y,
      angle,
      alpha: 0.35,
      createdAt: Date.now()
    });

    // Limit tracks to 150 to keep canvas performant
    if (this.tracks.length > 150) {
      this.tracks.shift();
    }
  }

  addMuzzleFlash(x, y, angle, color = '#ffcc00') {
    for (let i = 0; i < 4; i++) {
      const spread = (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 3 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        radius: Math.random() * 2 + 1.5,
        color,
        alpha: 0.9,
        decay: 0.1,
        type: 'spark'
      });
    }
  }

  addHitSparks(x, y, color = '#ffcc00') {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2 + 1,
        color,
        alpha: 0.8,
        decay: 0.08,
        type: 'spark'
      });
    }
  }

  addFlamePuff(x, y) {
    this.particles.push({
      x: x + (Math.random() * 6 - 3),
      y: y + (Math.random() * 6 - 3),
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 3 + 2,
      color: Math.random() < 0.5 ? '#ff9900' : '#ff4400',
      alpha: 0.7,
      decay: 0.08,
      type: 'debris'
    });
  }

  addExplosion(x, y, radius = 30, color = '#ff5500', isHeavy = false) {
    if (isHeavy) {
      this.addScreenShake(radius > 50 ? 8 : 4);

      // Shockwave ring for heavy explosions only (rocket, tank death)
      this.particles.push({
        x,
        y,
        radius: 4,
        maxRadius: radius * 1.3,
        color: '#ffffff',
        alpha: 0.7,
        growSpeed: radius * 0.12,
        type: 'shockwave'
      });
    }

    // Fire & Smoke debris (clean, controlled count)
    const count = isHeavy ? Math.min(18, Math.floor(radius * 0.5)) : 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (radius / 10) + 1.2;
      const isSmoke = Math.random() < 0.35;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3 + 2,
        color: isSmoke ? '#666666' : (Math.random() < 0.5 ? '#ffcc00' : '#ff4400'),
        alpha: 0.9,
        decay: Math.random() * 0.05 + 0.04,
        type: 'debris'
      });
    }

    // Cap particles so it never exceeds 100
    if (this.particles.length > 100) {
      this.particles.splice(0, this.particles.length - 100);
    }
  }

  addDamageText(x, y, text, color = '#ff3366') {
    this.damageTexts.push({
      x: x + (Math.random() * 20 - 10),
      y: y - 10,
      vy: -1.4,
      text,
      color,
      alpha: 1,
      decay: 0.025
    });
  }

  addScreenShake(amount) {
    this.screenShake = Math.min(20, this.screenShake + amount);
  }

  update(dt) {
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Update tracks fading
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i];
      tr.alpha -= 0.0006;
      if (tr.alpha <= 0) {
        this.tracks.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'shockwave') {
        p.radius += p.growSpeed;
        p.alpha -= 0.05;
        if (p.alpha <= 0 || p.radius >= p.maxRadius) {
          this.particles.splice(i, 1);
        }
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating damage numbers
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtText = this.damageTexts[i];
      dtText.y += dtText.vy;
      dtText.alpha -= dtText.decay;
      if (dtText.alpha <= 0) {
        this.damageTexts.splice(i, 1);
      }
    }
  }

  renderTracks(ctx) {
    for (const tr of this.tracks) {
      ctx.save();
      ctx.translate(tr.x, tr.y);
      ctx.rotate(tr.angle);
      ctx.fillStyle = `rgba(15, 20, 28, ${tr.alpha})`;
      // Left tread track
      ctx.fillRect(-10, -14, 20, 5);
      // Right tread track
      ctx.fillRect(-10, 9, 20, 5);
      ctx.restore();
    }
  }

  renderParticles(ctx) {
    for (const p of this.particles) {
      ctx.save();
      if (p.type === 'shockwave') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Render floating damage numbers
    for (const dtText of this.damageTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, dtText.alpha);
      ctx.fillStyle = dtText.color;
      ctx.font = 'bold 16px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(dtText.text, dtText.x, dtText.y);
      ctx.restore();
    }
  }
}

window.ParticleSystem = ParticleSystem;

