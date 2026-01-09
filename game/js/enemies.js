import { player } from "./player.js";
export const enemies = [];
const SIZE = 50;
const enemyImageHoming = new Image();
enemyImageHoming.src = "image/enemy_homing.png";

const enemyImageStraight = new Image();
enemyImageStraight.src = "image/enemy_straight.png";

const ENEMY_TYPE = {
  HOMING: "homing",
  STRAIGHT: "straight",
};

function pushEnemies(canvas) {
  const w = SIZE;
  const h = SIZE;
  const x = Math.random() * (canvas.width - w);
  const y = 0;
  const type = Math.random() < 0.5 ? ENEMY_TYPE.HOMING : ENEMY_TYPE.STRAIGHT;

  // 直進タイプ：上から下へまっすぐ
  if (type === ENEMY_TYPE.STRAIGHT) {
    const vy = 5;
    enemies.push({ type, x, y, width: w, height: h, vy });
    return;
  }

  // 追尾タイプ：プレイヤー（中心）に向かって移動
  const speed = 4;
  enemies.push({ type, x, y, width: w, height: h, speed });
}

export function spawnEnemy(canvas) {
 if (enemies.length < 5) {
    pushEnemies(canvas);
 }
}

export function updateEnemies(canvas) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];

    if (e.type === ENEMY_TYPE.STRAIGHT) {
      // 直進：y だけ進める
      e.y += e.vy;
    } else if (e.type === ENEMY_TYPE.HOMING) {
      // 追尾：自機の中心に向かって進める
      const playerCx = player.x + player.width / 2;
      const playerCy = player.y + player.height / 2;
      const enemyCx = e.x + e.width / 2;
      const enemyCy = e.y + e.height / 2;

      const dx = playerCx - enemyCx;
      const dy = playerCy - enemyCy;
      const dist = Math.hypot(dx, dy) || 1;

      e.x += (dx / dist) * e.speed;
      e.y += (dy / dist) * e.speed;

      // 画面の外に出ないように左右だけ補正
      if (e.x < 0) e.x = 0;
      if (e.x > canvas.width - e.width) e.x = canvas.width - e.width;
    }

    if (e.y > canvas.height) {
      enemies.splice(i,1);

    }
  }
}

export function drawEnemies(ctx) {
  for (const e of enemies) {
     const img = e.type === ENEMY_TYPE.HOMING ? enemyImageHoming : enemyImageStraight;
     ctx.drawImage(img, e.x, e.y, e.width, e.height);
  }
}

export function clearEnemies() {
  enemies.length = 0;
}

export class EnemySystem {
  update(canvas) {
    spawnEnemy(canvas);
    updateEnemies(canvas);
  }

  draw(ctx) {
    drawEnemies(ctx);
  }

  clear() {
    clearEnemies();
  }
}

export const enemySystem = new EnemySystem();
