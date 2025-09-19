// Canvasの準備
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 自機の情報
const player = {
  x: canvas.width / 2 - 15, // 横中央
  y: canvas.height - 60,    // 下寄り
  width: 30,
  height: 30,
  color: "lime"
};

// ゲームループ
function gameLoop() {
  // 背景を塗りつぶし
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 自機を描画
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // 次のフレームを呼ぶ
  requestAnimationFrame(gameLoop);
}

// ゲーム開始
gameLoop();
