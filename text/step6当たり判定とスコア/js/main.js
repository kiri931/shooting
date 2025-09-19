// js/main.js
import { setupInput } from "./input.js";
import { player, initPlayer, updatePlayer, renderPlayer } from "./player.js";
import { bullets, tryShoot, updateBullets, renderBullets } from "./bullets.js";
import { enemies, trySpawnEnemy, updateEnemies, renderEnemies } from "./enemies.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 入力とプレイヤー初期化
setupInput(window);
initPlayer(canvas);

// ====== 追加：スコアとゲーム状態 ======
let score = 0;
let isGameOver = false;

// Enterでリトライ
window.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && isGameOver) {
    resetGame();
  }
});

function resetGame() {
  // 配列を空に
  enemies.length = 0;
  bullets.length = 0;
  // プレイヤーとスコアを初期化
  initPlayer(canvas);
  score = 0;
  isGameOver = false;
}

// ====== 追加：AABB衝突判定 ======
function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ====== 追加：衝突処理 ======
function handleCollisions() {
  // 弾 × 敵
  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    let hit = false;

    for (let bi = bullets.length - 1; bi >= 0; bi--) {
      const b = bullets[bi];
      if (rectsIntersect(
        { x: b.x, y: b.y, width: b.width, height: b.height },
        { x: e.x, y: e.y, width: e.width, height: e.height }
      )) {
        // 命中：弾と敵を削除、スコア加算
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        score += 1;
        hit = true;
        break; // この敵は消えたので次の敵へ
      }
    }

    if (hit) continue;
  }

  // 自機 × 敵（ゲームオーバー）
  for (let ei = enemies.length - 1; ei >= 0; ei--) {
    const e = enemies[ei];
    if (rectsIntersect(
      { x: player.x, y: player.y, width: player.width, height: player.height },
      { x: e.x, y: e.y, width: e.width, height: e.height }
    )) {
      isGameOver = true;
      break;
    }
  }
}

function update(now) {
  if (isGameOver) return; // ゲームオーバー中は停止

  updatePlayer(canvas);

  // 敵
  trySpawnEnemy(now, canvas);
  updateEnemies(canvas);

  // 弾（発射 & 更新）
  tryShoot(now);
  updateBullets();

  // 衝突処理
  handleCollisions();
}

function renderHUD() {
  // スコア
  ctx.fillStyle = "white";
  ctx.font = "20px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`SCORE: ${score}`, 10, 10);

  if (isGameOver) {
    // 画面中央にメッセージ
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px monospace";
    ctx.fillText("Press Enter to Retry", canvas.width / 2, canvas.height / 2 + 24);
  }
}

function render() {
  // 背景
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 描画順：敵 → 弾 → 自機
  renderEnemies(ctx);
  renderBullets(ctx);
  renderPlayer(ctx);

  // HUD
  renderHUD();
}

function gameLoop(now = 0) {
  update(now);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
