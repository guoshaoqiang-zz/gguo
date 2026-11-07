export const VIEWPORT = Object.freeze({ width: 960, height: 540 });
export const WORLD = Object.freeze({ width: 3200 });
export const FIXED_DT = 1 / 60;
export const GRAVITY = 2400;

export const PLAYER = Object.freeze({
  width: 30,
  height: 54,
  speed: 300,
  jumpVelocity: -820,
  maxLives: 3,
  invulnerableTime: 1.6,
  fireCooldown: 0.13,
  bulletSpeed: 760,
  startX: 120,
});

export const BULLET = Object.freeze({
  width: 8,
  height: 4,
  life: 2.5,
  damage: 1,
});

export const ENEMY = Object.freeze({
  width: 30,
  height: 52,
  speed: 70,
  hp: 2,
  points: 100,
  fireCooldown: 1.7,
  bulletSpeed: 340,
  aggroRangeX: 560,
  aggroRangeY: 190,
  maxCount: 8,
  spawnInterval: 1.5,
});

export const PLATFORMS = Object.freeze([
  { x: 0, y: 470, w: WORLD.width, h: 70 },
  { x: 240, y: 380, w: 170, h: 18 },
  { x: 500, y: 300, w: 150, h: 18 },
  { x: 760, y: 380, w: 180, h: 18 },
  { x: 1080, y: 330, w: 200, h: 18 },
  { x: 1400, y: 385, w: 160, h: 18 },
  { x: 1660, y: 300, w: 150, h: 18 },
  { x: 1900, y: 370, w: 210, h: 18 },
  { x: 2220, y: 320, w: 180, h: 18 },
  { x: 2520, y: 385, w: 180, h: 18 },
  { x: 2840, y: 320, w: 160, h: 18 },
]);