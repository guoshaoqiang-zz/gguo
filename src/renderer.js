import {
  ENEMY,
  PLATFORMS,
  PLAYER,
  VIEWPORT,
  WORLD,
} from './constants.js';
import { clamp } from './physics.js';

const VIEW_W = VIEWPORT.width;
const VIEW_H = VIEWPORT.height;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = VIEW_W;
    this.height = VIEW_H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.camera = 0;

    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    canvas.style.aspectRatio = `${this.width} / ${this.height}`;

    this.stars = Array.from({ length: 90 }, (_, i) => ({
      x: (i * 193.7) % VIEW_W,
      y: (i * 97.3) % 360,
      size: i % 11 === 0 ? 2 : 1,
      layer: ((i * 37) % 100) / 100,
    }));
  }

  render(game) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    this.updateCamera(game.player);
    this.drawBackground(game.time);

    ctx.save();
    ctx.translate(-this.camera, 0);
    this.drawPlatforms();
    this.drawBullets(game.bullets);
    for (const enemy of game.enemies) this.drawEnemy(enemy, game.time);
    this.drawPlayer(game.player, game.time);
    ctx.restore();

    this.drawHud(game);
    this.drawVignette();

    if (game.paused && !game.gameOver) this.drawPause();
    if (game.gameOver) this.drawGameOver(game);
  }

  updateCamera(player) {
    const target = clamp(
      player.x + player.w / 2 - VIEW_W / 2,
      0,
      WORLD.width - VIEW_W,
    );
    this.camera += (target - this.camera) * 0.12;
    this.camera = clamp(this.camera, 0, WORLD.width - VIEW_W);
  }

  drawBackground(time) {
    const ctx = this.ctx;
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#070b1f');
    sky.addColorStop(0.45, '#12183a');
    sky.addColorStop(0.78, '#2a2145');
    sky.addColorStop(1, '#43294b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    for (const star of this.stars) {
      const x = ((star.x - this.camera * (0.04 + star.layer * 0.08)) % VIEW_W + VIEW_W) % VIEW_W;
      ctx.globalAlpha = 0.35 + star.layer * 0.65;
      ctx.fillStyle = star.layer > 0.7 ? '#ffe6a7' : '#b8d4ff';
      ctx.fillRect(Math.round(x), Math.round(star.y), star.size, star.size);
    }
    ctx.globalAlpha = 1;

    const moonX = VIEW_W - 150 - this.camera * 0.03;
    const moonY = 96;
    const glow = ctx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 90);
    glow.addColorStop(0, 'rgba(255, 226, 160, 0.55)');
    glow.addColorStop(1, 'rgba(255, 226, 160, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(moonX - 90, moonY - 90, 180, 180);
    ctx.fillStyle = '#ffe3a0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210, 168, 96, 0.35)';
    ctx.beginPath();
    ctx.arc(moonX - 10, moonY - 8, 8, 0, Math.PI * 2);
    ctx.arc(moonX + 12, moonY + 12, 5, 0, Math.PI * 2);
    ctx.arc(moonX + 4, moonY - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    this.drawMountainLayer(this.camera * 0.16, '#171a2d', 392, 116, 250);
    this.drawMountainLayer(this.camera * 0.32, '#1e2138', 430, 86, 190);
    this.drawJungleLayer(this.camera * 0.5, time);
  }

  drawMountainLayer(offset, color, baseY, peakHeight, spacing) {
    const ctx = this.ctx;
    const start = -(((offset % spacing) + spacing) % spacing) - spacing;
    ctx.beginPath();
    ctx.moveTo(start - spacing, baseY);
    let index = 0;
    for (let x = start; x <= VIEW_W + spacing * 2; x += spacing) {
      const peak = baseY - peakHeight * (index % 2 === 0 ? 1 : 0.68);
      ctx.lineTo(x + spacing * 0.5, peak);
      ctx.lineTo(x + spacing, baseY);
      index += 1;
    }
    ctx.lineTo(VIEW_W + spacing * 2, VIEW_H);
    ctx.lineTo(-spacing, VIEW_H);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  drawJungleLayer(offset, time) {
    const ctx = this.ctx;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    const spacing = 74;
    const start = -(((offset % spacing) + spacing) % spacing) - spacing;
    for (let x = start, i = 0; x <= VIEW_W + spacing * 2; x += spacing, i += 1) {
      const sway = Math.sin(time * 1.4 + i) * 3;
      const height = 70 + (i * 29) % 70;
      ctx.lineTo(x + sway, 452 - height);
      ctx.lineTo(x + spacing * 0.45, 452 - height * 0.45);
      ctx.lineTo(x + spacing, 452);
    }
    ctx.lineTo(VIEW_W + spacing * 2, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }

  drawPlatforms() {
    const ctx = this.ctx;
    for (const platform of PLATFORMS) {
      if (
        platform.x + platform.w < this.camera - 40 ||
        platform.x > this.camera + VIEW_W + 40
      ) {
        continue;
      }

      ctx.fillStyle = '#161d2c';
      ctx.fillRect(platform.x, platform.y, platform.w, platform.h);

      const topColor = platform.h > 30 ? '#2fbf8f' : '#4fd6b0';
      ctx.fillStyle = '#263146';
      ctx.fillRect(platform.x, platform.y + 4, platform.w, platform.h - 4);
      ctx.fillStyle = topColor;
      ctx.fillRect(platform.x, platform.y, platform.w, 4);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      for (let x = platform.x + 12; x < platform.x + platform.w - 8; x += 42) {
        ctx.fillRect(x, platform.y + 10, 2, Math.max(0, platform.h - 18));
      }
    }
  }

  drawBullets(bullets) {
    const ctx = this.ctx;
    for (const bullet of bullets) {
      if (!bullet.alive) continue;
      const playerBullet = bullet.owner === 'player';
      const color = playerBullet ? '#ffe066' : '#ff7a45';
      const trail = playerBullet ? 'rgba(255, 224, 102, 0.35)' : 'rgba(255, 122, 69, 0.35)';

      ctx.fillStyle = trail;
      ctx.fillRect(
        bullet.x - Math.sign(bullet.vx) * 10,
        bullet.y + 1,
        bullet.w + 10,
        Math.max(1, bullet.h - 2),
      );

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        bullet.x + bullet.w / 2,
        bullet.y + bullet.h / 2,
        playerBullet ? 3.6 : 3.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  drawPlayer(player, time) {
    if (!player.alive) return;

    const ctx = this.ctx;
    const blinking =
      player.invulnerable > 0 && Math.floor(time * 18) % 2 === 0;
    const moving = Math.abs(player.vx) > 1 && player.onGround;
    const legPhase = moving ? Math.sin(time * 18) * 5 : 0;

    ctx.save();
    ctx.globalAlpha = blinking ? 0.4 : 1;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(player.x + player.w / 2, player.y + player.h + 2, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(player.x + player.w / 2, player.y);
    ctx.scale(player.facing, 1);

    ctx.fillStyle = '#24406e';
    ctx.fillRect(-9, 35 + legPhase, 8, 17);
    ctx.fillRect(1, 35 - legPhase, 8, 17);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-11, 49 + legPhase, 11, 5);
    ctx.fillRect(0, 49 - legPhase, 11, 5);

    ctx.fillStyle = '#3f8f6b';
    ctx.fillRect(-9, 17, 18, 20);
    ctx.fillStyle = '#2f6f54';
    ctx.fillRect(-9, 24, 18, 5);
    ctx.fillStyle = '#d6a06b';
    ctx.fillRect(-9, 17, 4, 12);

    ctx.fillStyle = '#f0c08a';
    ctx.beginPath();
    ctx.arc(0, 9, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4226';
    ctx.fillRect(-7, 4, 14, 4);
    ctx.fillStyle = '#d83b3b';
    ctx.fillRect(-8, 2, 16, 4);
    ctx.fillRect(-16, 5, 9, 3);

    ctx.fillStyle = '#d6a06b';
    ctx.fillRect(6, 23, 8, 5);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(12, 22, 15, 4);
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(13, 26, 3, 4);

    if (player.shootCooldown > 0.08) {
      ctx.fillStyle = '#fff3a3';
      ctx.beginPath();
      ctx.arc(29, 24, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawEnemy(enemy, time) {
    if (!enemy.alive) return;

    const ctx = this.ctx;
    const moving = Math.abs(enemy.vx) > 1;
    const legPhase = moving ? Math.sin(time * 14 + enemy.x) * 4 : 0;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h + 2, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(enemy.x + enemy.w / 2, enemy.y);
    ctx.scale(enemy.direction, 1);

    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : '#7a2f2f';
    ctx.fillRect(-9, 35 + legPhase, 8, 17);
    ctx.fillRect(1, 35 - legPhase, 8, 17);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-11, 49 + legPhase, 11, 4);
    ctx.fillRect(0, 49 - legPhase, 11, 4);

    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : '#b93b3b';
    ctx.fillRect(-10, 16, 20, 21);
    ctx.fillStyle = '#5b1f1f';
    ctx.fillRect(-10, 23, 20, 4);

    ctx.fillStyle = '#c98c63';
    ctx.beginPath();
    ctx.arc(0, 8, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a24';
    ctx.fillRect(-8, 2, 16, 5);
    ctx.fillStyle = '#e2b13c';
    ctx.fillRect(-8, 13, 16, 3);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(4, 22, 16, 4);
    ctx.fillStyle = '#d6a06b';
    ctx.fillRect(3, 24, 5, 4);

    ctx.restore();
  }

  drawHud(game) {
    const ctx = this.ctx;
    ctx.save();

    const bar = ctx.createLinearGradient(0, 0, 0, 46);
    bar.addColorStop(0, 'rgba(7, 11, 31, 0.9)');
    bar.addColorStop(1, 'rgba(7, 11, 31, 0)');
    ctx.fillStyle = bar;
    ctx.fillRect(0, 0, VIEW_W, 52);

    ctx.font = '700 18px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8ecff';
    ctx.fillText(`SCORE ${String(game.score).padStart(6, '0')}`, 24, 24);

    ctx.fillStyle = '#ff6b6b';
    const livesLabel = `LIVES ${game.player.lives}`;
    ctx.fillText(livesLabel, VIEW_W - ctx.measureText(livesLabel).width - 24, 24);

    const progress = clamp(game.player.x / (WORLD.width - VIEW_W), 0, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(VIEW_W / 2 - 110, 19, 220, 6);
    ctx.fillStyle = '#4fd6b0';
    ctx.fillRect(VIEW_W / 2 - 110, 19, 220 * progress, 6);

    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = 'rgba(220, 226, 255, 0.62)';
    ctx.textAlign = 'center';
    ctx.fillText(
      'A/D 移动   SPACE 跳跃   J 射击   W 向上瞄准   S 下蹲斜射   P 暂停   R 重开',
      VIEW_W / 2,
      VIEW_H - 18,
    );
    ctx.textAlign = 'left';

    ctx.restore();
  }

  drawVignette() {
    const ctx = this.ctx;
    const vignette = ctx.createRadialGradient(
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_H * 0.45,
      VIEW_W / 2,
      VIEW_H / 2,
      VIEW_W * 0.72,
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawPause() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5, 8, 22, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8ecff';
    ctx.font = '800 52px "Courier New", monospace';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 6);
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = 'rgba(220, 226, 255, 0.7)';
    ctx.fillText('按 P 继续游戏', VIEW_W / 2, VIEW_H / 2 + 42);
    ctx.textAlign = 'left';
  }

  drawGameOver(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20, 4, 10, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '800 60px "Courier New", monospace';
    ctx.fillText('GAME OVER', VIEW_W / 2, VIEW_H / 2 - 34);
    ctx.fillStyle = '#e8ecff';
    ctx.font = '700 24px "Courier New", monospace';
    ctx.fillText(`得分 ${game.score}`, VIEW_W / 2, VIEW_H / 2 + 24);
    ctx.font = '16px "Courier New", monospace';
    ctx.fillStyle = 'rgba(220, 226, 255, 0.75)';
    ctx.fillText('按 R 重新开始', VIEW_W / 2, VIEW_H / 2 + 66);
    ctx.textAlign = 'left';
  }
}