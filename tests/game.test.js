import test from 'node:test';
import assert from 'node:assert/strict';
import { BULLET, FIXED_DT, PLATFORMS } from '../src/constants.js';
import { Game } from '../src/game.js';

const GROUND_Y = PLATFORMS[0].y;

function makeGame() {
  return new Game({ random: () => 0.5 });
}

function input(overrides = {}) {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    fire: false,
    ...overrides,
  };
}

function step(game, frames, controls = input()) {
  for (let i = 0; i < frames; i += 1) game.update(FIXED_DT, controls);
}

function makeBullet(owner, x, y, overrides = {}) {
  return {
    x,
    y,
    w: BULLET.width,
    h: BULLET.height,
    vx: 0,
    vy: 0,
    owner,
    damage: BULLET.damage,
    life: BULLET.life,
    alive: true,
    ...overrides,
  };
}

test('new game starts with full lives and a grounded player', () => {
  const game = makeGame();

  assert.equal(game.running, true);
  assert.equal(game.gameOver, false);
  assert.equal(game.score, 0);
  assert.equal(game.player.lives, 3);
  assert.equal(game.player.alive, true);
  assert.equal(game.player.y, GROUND_Y - game.player.h);
  assert.equal(game.player.onGround, true);
});

test('player moves left and right with responsive updates', () => {
  const game = makeGame();
  const startX = game.player.x;

  step(game, 10, input({ right: true }));

  assert.ok(game.player.x > startX);
  assert.equal(game.player.facing, 1);
  assert.equal(game.player.vx, 300);

  const movedX = game.player.x;
  step(game, 6, input({ left: true }));

  assert.ok(game.player.x < movedX);
  assert.equal(game.player.facing, -1);
});

test('jumping leaves the ground and gravity brings the player back', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;
  const startY = game.player.y;

  game.update(FIXED_DT, input({ jump: true }));

  assert.ok(game.player.y < startY);
  assert.equal(game.player.onGround, false);
  assert.ok(game.player.vy < 0);

  step(game, 90);

  assert.equal(game.player.y, startY);
  assert.equal(game.player.onGround, true);
  assert.equal(game.player.vy, 0);
});

test('holding jump does not trigger repeated jumps', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;
  const heldJump = input({ jump: true });

  step(game, 2, heldJump);
  const firstVy = game.player.vy;
  step(game, 1, heldJump);
  const secondVy = game.player.vy;

  assert.ok(secondVy > firstVy);
  assert.ok(secondVy < 0);
});

test('shooting spawns a player bullet and respects the fire cooldown', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;
  const fire = input({ fire: true });

  game.update(FIXED_DT, fire);

  assert.equal(game.bullets.length, 1);
  assert.equal(game.bullets[0].owner, 'player');
  assert.ok(game.bullets[0].vx > 0);

  game.update(FIXED_DT, fire);
  assert.equal(game.bullets.length, 1);
});

test('aiming up fires a bullet with upward velocity', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;

  game.update(FIXED_DT, input({ fire: true, up: true }));

  assert.equal(game.bullets.length, 1);
  assert.ok(game.bullets[0].vy < 0);
  assert.ok(Math.abs(game.bullets[0].vx) < 1);
});

test('player bullets destroy enemies, score points and are consumed', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;
  const enemy = game.spawnEnemy();
  enemy.x = game.player.x + 120;
  enemy.y = game.player.y;
  enemy.hp = 1;

  game.bullets.push(makeBullet('player', enemy.x + 5, enemy.y + 10));
  game.update(FIXED_DT, input());

  assert.equal(game.enemies.length, 0);
  assert.equal(game.bullets.length, 0);
  assert.equal(game.score, 100);
  assert.equal(game.enemiesDefeated, 1);
});

test('enemy bullets damage the player and grant temporary invulnerability', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;

  game.bullets.push(
    makeBullet('enemy', game.player.x + 5, game.player.y + 10),
  );
  game.update(FIXED_DT, input());

  assert.equal(game.player.lives, 2);
  assert.ok(game.player.invulnerable > 0);

  game.bullets.push(
    makeBullet('enemy', game.player.x + 5, game.player.y + 10),
  );
  game.update(FIXED_DT, input());

  assert.equal(game.player.lives, 2);
});

test('touching an enemy also damages the player', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;
  const enemy = game.spawnEnemy();
  enemy.x = game.player.x;
  enemy.y = game.player.y;
  enemy.vx = 0;

  game.update(FIXED_DT, input());

  assert.equal(game.player.lives, 2);
  assert.ok(game.player.invulnerable > 0);
});

test('losing the final life ends the game', () => {
  const game = makeGame();
  game.spawnTimer = Number.POSITIVE_INFINITY;
  game.player.lives = 1;
  game.player.invulnerable = 0;
  game.bullets.push(
    makeBullet('enemy', game.player.x + 5, game.player.y + 10),
  );

  game.update(FIXED_DT, input());

  assert.equal(game.player.lives, 0);
  assert.equal(game.player.alive, false);
  assert.equal(game.running, false);
  assert.equal(game.gameOver, true);
});

test('enemy spawning respects the spawn timer and world bounds', () => {
  const game = makeGame();
  game.enemies = [];
  game.spawnTimer = 0;

  game.update(FIXED_DT, input());

  assert.equal(game.enemies.length, 1);
  const enemy = game.enemies[0];
  assert.ok(enemy.x > game.player.x);
  assert.ok(enemy.x < 3200);
  assert.equal(enemy.y, GROUND_Y - enemy.h);
  assert.ok(game.spawnTimer > 0);
});

test('reset restores a clean playable state', () => {
  const game = makeGame();
  game.score = 500;
  game.player.lives = 1;
  game.enemies.push(game.spawnEnemy());
  game.gameOver = true;
  game.running = false;

  game.reset();

  assert.equal(game.score, 0);
  assert.equal(game.player.lives, 3);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.bullets.length, 0);
  assert.equal(game.running, true);
  assert.equal(game.gameOver, false);
});
test('long-running simulation stays stable and bounded', () => {
  const game = makeGame();
  game.player.lives = 99;

  for (let frame = 0; frame < 1800; frame += 1) {
    const controls = input({
      right: true,
      fire: true,
      jump: frame % 90 < 3,
    });
    game.update(FIXED_DT, controls);

    assert.ok(Number.isFinite(game.player.x));
    assert.ok(Number.isFinite(game.player.y));
    assert.ok(game.player.x >= 0 && game.player.x <= 3200 - game.player.w);
    assert.ok(game.player.y >= 0);
    assert.ok(game.enemies.length <= 8);
  }

  assert.ok(game.score >= 0);
  assert.ok(game.enemiesDefeated >= 0);
});
