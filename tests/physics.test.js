import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp,
  moveAndCollide,
  normalize,
  rectsOverlap,
} from '../src/physics.js';

test('rectsOverlap detects intersecting and separated rectangles', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };

  assert.equal(rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 }), true);
  assert.equal(rectsOverlap(a, { x: 10, y: 0, w: 10, h: 10 }), false);
  assert.equal(rectsOverlap(a, { x: 0, y: 10, w: 10, h: 10 }), false);
  assert.equal(rectsOverlap(a, { x: -20, y: 0, w: 10, h: 10 }), false);
});

test('moveAndCollide lands an entity on top of a platform', () => {
  const platform = { x: 0, y: 50, w: 200, h: 10 };
  const entity = { x: 10, y: 0, w: 10, h: 10, vx: 0, vy: 100 };

  moveAndCollide(entity, [platform], 0.55, 500);

  assert.equal(entity.y, 40);
  assert.equal(entity.vy, 0);
  assert.equal(entity.onGround, true);
});

test('moveAndCollide stops horizontal movement against a solid platform', () => {
  const platform = { x: 50, y: 50, w: 100, h: 10 };
  const entity = { x: 0, y: 45, w: 10, h: 10, vx: 100, vy: 0 };

  moveAndCollide(entity, [platform], 0.5, 500);

  assert.equal(entity.x, 40);
  assert.equal(entity.vx, 0);
});

test('moveAndCollide clamps entities to the world bounds', () => {
  const entity = { x: 100, y: 0, w: 10, h: 10, vx: -1000, vy: 0 };

  moveAndCollide(entity, [], 1, 200);
  assert.equal(entity.x, 0);

  entity.vx = 1000;
  moveAndCollide(entity, [], 1, 200);
  assert.equal(entity.x, 190);
});

test('normalize returns a unit vector and handles zero length', () => {
  const vector = normalize(3, 4);
  assert.equal(vector.x, 0.6);
  assert.equal(vector.y, 0.8);
  assert.deepEqual(normalize(0, 0), { x: 0, y: 0 });
});

test('clamp keeps values inside the requested range', () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(15, 0, 10), 10);
  assert.equal(clamp(5, 0, 10), 5);
});