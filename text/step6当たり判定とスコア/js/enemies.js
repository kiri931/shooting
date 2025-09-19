// js/enemies.js
// 敵の管理（上からランダムに出現し下へ移動）

export const enemies = []; // { x, y, width, height, vy }

const BASE_SPAWN_INTERVAL_MS = 900; // 出現間隔（短いほど多く出る）
const MIN_SPEED = 2.0;
const MAX_SPEED = 4.0;
const SIZE = 26;

let lastSpawnAt = 0;
let startAt = performance.now(); // 難易度用（あとで使える）

/** 敵を1体生成 */
function spawnEnemy(canvas) {
  const w = SIZE;
  const h = SIZE;
  const x = Math.random() * (canvas.width - w);
  const y = -h; // 画面外から登場
  const vy = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

  enemies.push({ x, y, width: w, height: h, vy });
}

/** 出現判定（必要なら難易度で間隔を詰める） */
export function trySpawnEnemy(now, canvas) {
  // 経過時間で少しだけ出現を速くする例（任意）
  const elapsed = (now - startAt) / 1000; // 秒
  const accel = Math.min(0.5, elapsed / 60); // 1分で最大50%短縮
  const interval = BASE_SPAWN_INTERVAL_MS * (1 - accel);

  if (now - lastSpawnAt >= interval) {
    spawnEnemy(canvas);
    lastSpawnAt = now;
  }
}

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
export function renderEnemies(ctx) {
  ctx.fillStyle = "crimson";
  for (const e of enemies) {
    ctx.fillRect(e.x, e.y, e.width, e.height);
  }
}
