import { Particle, FloatingText, Shockwave } from './types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];
  private nextTextId = 1;

  public explodeBlock(x: number, y: number, color: string, blockSize: number) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = Math.random() * 260 + 120;
      this.particles.push({
        x: x + blockSize / 2 + (Math.random() - 0.5) * 12,
        y: y + blockSize / 2 + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90, // slight upward kick
        size: Math.random() * 8 + 5,
        color,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        life: 0,
        maxLife: Math.random() * 0.35 + 0.5, // 0.5 - 0.85s
        isStar: Math.random() > 0.6,
      });
    }
  }

  public addShockwave(x: number, y: number, maxRadius: number = 180, color: string = '#ffd600') {
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius,
      color,
      alpha: 1,
      life: 0,
      maxLife: 0.55,
    });
  }

  public addFloatingText(text: string, subText: string | undefined, x: number, y: number, color: string) {
    this.floatingTexts.push({
      id: this.nextTextId++,
      text,
      subText,
      x,
      y,
      color,
      alpha: 1,
      scale: 0.5,
      vy: -110,
      life: 0,
      maxLife: 1.1,
    });
  }

  public update(dt: number) {
    // Update particles
    const gravity = 680;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravity * dt;
      p.rotation += p.vRot * dt;
      p.alpha = Math.max(0, 1 - p.life / p.maxLife);
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = sw.life / sw.maxLife;
      // Ease out cubic
      sw.radius = 10 + (sw.maxRadius - 10) * (1 - Math.pow(1 - progress, 3));
      sw.alpha = 1 - progress;
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.vy *= 0.94; // decelerate upward speed

      // Pop scale bounce
      const progress = ft.life / ft.maxLife;
      if (progress < 0.2) {
        ft.scale = 0.5 + (progress / 0.2) * 0.7; // pop up to 1.2
      } else if (progress < 0.35) {
        ft.scale = 1.2 - ((progress - 0.2) / 0.15) * 0.2; // settle back to 1.0
      } else {
        ft.scale = 1.0;
      }

      if (progress > 0.6) {
        ft.alpha = 1 - (progress - 0.6) / 0.4;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    // Draw shockwaves behind particles
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = sw.alpha * 0.85;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 6 * (1 - sw.life / sw.maxLife);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    ctx.save();
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.isStar) {
        // Draw 4-point star sparkle
        const r = p.size;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.quadraticCurveTo(0, 0, 0, r);
        ctx.quadraticCurveTo(0, 0, -r, 0);
        ctx.quadraticCurveTo(0, 0, 0, -r);
        ctx.fill();
      } else {
        // Draw jewel shard (rounded square)
        const s = p.size;
        ctx.beginPath();
        ctx.roundRect(-s / 2, -s / 2, s, s, 2);
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-s / 2 + 1, -s / 2 + 1, s / 2, s / 2);
      }
      ctx.restore();
    }
    ctx.restore();

    // Draw floating texts
    ctx.save();
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text stroke for arcade outline
      ctx.font = '900 32px "Pretendard", "Segoe UI", system-ui, sans-serif';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#0f172a';
      ctx.strokeText(ft.text, 0, 0);

      // Main gradient / color
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      if (ft.subText) {
        ctx.font = '800 18px "Pretendard", "Segoe UI", system-ui, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0f172a';
        ctx.strokeText(ft.subText, 0, 32);

        ctx.fillStyle = '#f8fafc';
        ctx.fillText(ft.subText, 0, 32);
      }

      ctx.restore();
    }
    ctx.restore();
  }

  public clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }
}
