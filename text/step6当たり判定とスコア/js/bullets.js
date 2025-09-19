// js/bullets.js
import { isShootPressed } from "./input.js";
import { player } from "./player.js";

export const bullets = []; // { x, y, width, height, vy }

const BULLET_SPEED = -10;
const BULLET_SIZE  = { w: 4, h: 10 };
const BULLET_COOLDOWN_MS = 120;

let lastShotAt = 0;

export function tryShoot(now) {
  if (!isShootPressed()) return;

  if (now - lastShotAt >= BULLET_COOLDOWN_MS) {
    const muzzleX = player.x + player.width / 2 - BULLET_SIZE.w / 2;
    const muzzleY = player.y - BULLET_SIZE.h;

    bullets.push({
      x: muzzleX,
      y: muzzleY,
      width: BULLET_SIZE.w,
      height: BULLET_SIZE.h,
      vy: BULLET_SPEED
    });

    lastShotAt = now;
  }
}

export function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;
    if (b.y + b.height < 0) bullets.splice(i, 1); // 画面外で削除
  }
}

export function renderBullets(ctx) {
  ctx.fillStyle = "white";
  for (const b of bullets) {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
}
