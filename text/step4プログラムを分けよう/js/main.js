// js/main.js
import { setupInput } from "./input.js";
import { player, initPlayer, updatePlayer, renderPlayer } from "./player.js";
import { tryShoot, updateBullets, renderBullets } from "./bullets.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 入力とプレイヤー初期化
setupInput(window);
initPlayer(canvas);

function update(now) {
  updatePlayer(canvas);
  tryShoot(now);
  updateBullets();
}

function render() {
  // 背景
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 自機・弾
  renderPlayer(ctx);
  renderBullets(ctx);
}

function gameLoop(now = 0) {
  update(now);
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
