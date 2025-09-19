// js/main.js
import { setupInput } from "./input.js";
import { player, initPlayer, updatePlayer, renderPlayer } from "./player.js";
import { tryShoot, updateBullets, renderBullets } from "./bullets.js";
import { trySpawnEnemy, updateEnemies, renderEnemies } from "./enemies.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 入力とプレイヤー初期化
setupInput(window);
initPlayer(canvas);

function update(now) {
  updatePlayer(canvas);

  // 敵の出現と更新
  trySpawnEnemy(now, canvas);
  updateEnemies(canvas);

  // 弾（発射 & 更新）
  tryShoot(now);
  updateBullets();
}

function render() {
  // 背景
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 描画順：敵 → 弾 → 自機
  renderEnemies(ctx);
  renderBullets(ctx);
  renderPlayer(ctx);
}

function gameLoop(now = 0) {
  update(now);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
