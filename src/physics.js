export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function centerOf(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/**
 * Integrates an entity on each axis and resolves it against solid platforms.
 * Entities are expected to expose x, y, w, h, vx and vy.
 */
export function moveAndCollide(entity, platforms, dt, worldWidth) {
  entity.onGround = false;

  entity.x += entity.vx * dt;
  for (const platform of platforms) {
    if (!rectsOverlap(entity, platform)) continue;
    if (entity.vx > 0) {
      entity.x = platform.x - entity.w;
    } else if (entity.vx < 0) {
      entity.x = platform.x + platform.w;
    }
    entity.vx = 0;
  }
  entity.x = clamp(entity.x, 0, worldWidth - entity.w);

  entity.y += entity.vy * dt;
  for (const platform of platforms) {
    if (!rectsOverlap(entity, platform)) continue;
    if (entity.vy > 0) {
      entity.y = platform.y - entity.h;
      entity.onGround = true;
    } else if (entity.vy < 0) {
      entity.y = platform.y + platform.h;
    }
    entity.vy = 0;
  }

  return entity;
}

export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}