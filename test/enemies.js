
export const enemies = [];

//const MIN_SPEED = 2.0;
//const MAX_SPEED = 4.0;
const SIZE = 26;


// const SPAWN_MIN_FRAMES = 30; // 最小フレーム（約0.5秒 @60fps）
// const SPAWN_MAX_FRAMES = 120; // 最大フレーム（約2秒 @60fps）
// const MAX_ENEMIES = 5;

// let spawnTimer = 0;
// function resetSpawnTimer() {
//   spawnTimer = Math.floor(
//     SPAWN_MIN_FRAMES + Math.random() * (SPAWN_MAX_FRAMES - SPAWN_MIN_FRAMES + 1)
//   );
// }
// resetSpawnTimer();


/** 敵を1体生成 */
function spawnEnemy(canvas) {
  const w = SIZE;
  const h = SIZE;
  const x = Math.random() * (canvas.width - w);
  const y = -h;
  const vy = 5//MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

  enemies.push({ x, y, width: w, height: h, vy });
}

export function SpawnEnemy(canvas) {
  if (enemies.length < 5) {
    spawnEnemy(canvas);
  }
}

// export function SpawnEnemy(canvas) {
//   if (enemies.length >= MAX_ENEMIES) {
//     return;
//   }
//   spawnTimer--;
//   if (spawnTimer <= 0) {
//     spawnEnemy(canvas);
//     resetSpawnTimer();
//   }
// }

/** 位置更新＆画面外削除 */
export function updateEnemies(canvas) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.y += e.vy;
    if (e.y > canvas.height) {
      enemies.splice(i, 1); // 下に抜けたら消す
    }
  }
}

/** 描画（赤い四角） */
export function drawEnemies(ctx) {
  ctx.fillStyle = "crimson";
  for (const e of enemies) {
    ctx.fillRect(e.x, e.y, e.width, e.height);
  }
}
