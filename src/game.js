import {
  BULLET,
  ENEMY,
  GRAVITY,
  PLATFORMS,
  PLAYER,
  VIEWPORT,
  WORLD,
} from './constants.js';
import { centerOf, clamp, moveAndCollide, normalize, rectsOverlap } from './physics.js';

const GROUND_Y = PLATFORMS[0].y;

function createPlayer() {
  return {
    x: PLAYER.startX,
    y: GROUND_Y - PLAYER.height,
    w: PLAYER.width,
    h: PLAYER.height,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    alive: true,
    lives: PLAYER.maxLives,
    invulnerable: 0,
    shootCooldown: 0,
  };
}

function createBullet(x, y, vx, vy, owner) {
  return {
    x,
    y,
    w: BULLET.width,
    h: BULLET.height,
    vx,
    vy,
    owner,
    damage: BULLET.damage,
    life: BULLET.life,
    alive: true,
  };
}

function createEnemy(x, y) {
  return {
    x,
    y,
    w: ENEMY.width,
    h: ENEMY.height,
    vx: -ENEMY.speed,
    vy: 0,
    direction: -1,
    hp: ENEMY.hp,
    points: ENEMY.points,
    shootCooldown: ENEMY.fireCooldown,
    hitFlash: 0,
    onGround: false,
    alive: true,
  };
}

export class Game {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.reset();
  }

  reset() {
    this.player = createPlayer();
    this.bullets = [];
    this.enemies = [];
    this.score = 0;
    this.enemiesDefeated = 0;
    this.time = 0;
    this.spawnTimer = ENEMY.spawnInterval;
    this.jumpHeld = false;
    this.running = true;
    this.paused = false;
    this.gameOver = false;
  }

  update(dt, input = {}) {
    if (!this.running || this.paused) return;

    this.time += dt;
    this.updatePlayer(dt, input);
    this.updateBullets(dt);
    this.updateEnemies(dt);
    this.resolveCollisions();
    this.cleanup();
    this.updateSpawning(dt);
  }

  updatePlayer(dt, input) {
    const player = this.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (!player.alive) return;

    const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (direction !== 0) {
      player.facing = direction;
      player.vx = direction * PLAYER.speed;
    } else {
      player.vx = 0;
    }

    if (input.jump && !this.jumpHeld && player.onGround) {
      player.vy = PLAYER.jumpVelocity;
      player.onGround = false;
    }
    this.jumpHeld = Boolean(input.jump);

    player.vy += GRAVITY * dt;
    moveAndCollide(player, PLATFORMS, dt, WORLD.width);

    player.shootCooldown = Math.max(0, player.shootCooldown - dt);
    if (input.fire && player.shootCooldown <= 0) {
      this.shootPlayer(input);
      player.shootCooldown = PLAYER.fireCooldown;
    }
  }

  shootPlayer(input) {
    const player = this.player;
    let dx = player.facing;
    let dy = 0;

    if (input.up) {
      dx = 0;
      dy = -1;
    } else if (input.down && !player.onGround) {
      dx = player.facing * Math.SQRT1_2;
      dy = Math.SQRT1_2;
    }

    const direction = normalize(dx, dy);
    const offset = player.w / 2 + 8;
    const originX = player.x + player.w / 2 + direction.x * offset;
    const originY = player.y + player.h * 0.42 + direction.y * offset;

    this.bullets.push(
      createBullet(
        originX - BULLET.width / 2,
        originY - BULLET.height / 2,
        direction.x * PLAYER.bulletSpeed,
        direction.y * PLAYER.bulletSpeed,
        'player',
      ),
    );
  }

  spawnEnemyBullet(enemy, direction) {
    const center = centerOf(enemy);
    this.bullets.push(
      createBullet(
        center.x + direction.x * 18 - BULLET.width / 2,
        center.y + direction.y * 18 - BULLET.height / 2,
        direction.x * ENEMY.bulletSpeed,
        direction.y * ENEMY.bulletSpeed,
        'enemy',
      ),
    );
  }

  updateBullets(dt) {
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      const outsideWorld =
        bullet.x < -60 ||
        bullet.x > WORLD.width + 60 ||
        bullet.y < -120 ||
        bullet.y > VIEWPORT.height + 120;

      if (bullet.life <= 0 || outsideWorld) bullet.alive = false;
    }
  }

  updateEnemies(dt) {
    const player = this.player;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const dx = centerOf(player).x - centerOf(enemy).x;
      const dy = centerOf(player).y - centerOf(enemy).y;

      enemy.direction = dx < 0 ? -1 : 1;
      enemy.vx = enemy.direction * ENEMY.speed;
      enemy.vy += GRAVITY * dt;
      moveAndCollide(enemy, PLATFORMS, dt, WORLD.width);

      if (enemy.x < -80 || enemy.y > VIEWPORT.height + 400) {
        enemy.alive = false;
        continue;
      }

      enemy.shootCooldown -= dt;
      const inRange =
        Math.abs(dx) < ENEMY.aggroRangeX && Math.abs(dy) < ENEMY.aggroRangeY;

      if (player.alive && inRange && enemy.shootCooldown <= 0) {
        this.spawnEnemyBullet(enemy, normalize(dx, dy));
        enemy.shootCooldown = ENEMY.fireCooldown * (0.7 + this.random() * 0.6);
      }
    }
  }

  resolveCollisions() {
    const player = this.player;

    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;

      if (bullet.owner === 'player') {
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          if (!rectsOverlap(bullet, enemy)) continue;

          bullet.alive = false;
          enemy.hp -= bullet.damage;
          enemy.hitFlash = 0.08;

          if (enemy.hp <= 0) {
            enemy.alive = false;
            this.score += enemy.points;
            this.enemiesDefeated += 1;
          }
          break;
        }
      } else if (player.alive && rectsOverlap(bullet, player)) {
        bullet.alive = false;
        this.damagePlayer();
      }
    }

    if (player.alive && player.invulnerable <= 0) {
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (rectsOverlap(player, enemy)) {
          this.damagePlayer();
          break;
        }
      }
    }
  }

  damagePlayer() {
    const player = this.player;
    if (!player.alive || player.invulnerable > 0) return false;

    player.lives -= 1;
    player.invulnerable = PLAYER.invulnerableTime;
    player.vy = -420;
    player.vx = -player.facing * 180;

    if (player.lives <= 0) {
      player.lives = 0;
      player.alive = false;
      this.running = false;
      this.gameOver = true;
    }

    return true;
  }

  cleanup() {
    this.bullets = this.bullets.filter((bullet) => bullet.alive);
    this.enemies = this.enemies.filter((enemy) => enemy.alive);
  }

  updateSpawning(dt) {
    if (this.enemies.length >= ENEMY.maxCount) return;

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    this.spawnEnemy();
    this.spawnTimer = ENEMY.spawnInterval * (0.7 + this.random() * 0.6);
  }

  spawnEnemy() {
    if (this.enemies.length >= ENEMY.maxCount) return null;

    const minX = clamp(this.player.x + 500, 200, WORLD.width - 100);
    const maxX = clamp(this.player.x + 900, minX + 1, WORLD.width - 100);
    const x = minX + this.random() * Math.max(0, maxX - minX);
    const enemy = createEnemy(x, GROUND_Y - ENEMY.height);

    enemy.direction = enemy.x > this.player.x ? -1 : 1;
    enemy.shootCooldown = ENEMY.fireCooldown * (0.5 + this.random());

    this.enemies.push(enemy);
    return enemy;
  }
}

export function createGame(options) {
  return new Game(options);
}