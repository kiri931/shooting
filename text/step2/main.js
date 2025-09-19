// Canvasの準備
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 自機の情報
const player = {
  x: canvas.width / 2 - 15, // 横中央
  y: canvas.height - 60,    // 下寄り
  width: 30,
  height: 30,
  color: "lime",
  speed: 5                  // 1フレームの移動量（px）
};

// 入力状態を管理（押しっぱなし対応）
const keys = new Set();

function isLeftPressed() {
  return keys.has("arrowleft") || keys.has("a");
}
function isRightPressed() {
  return keys.has("arrowright") || keys.has("d");
}

// キーボードイベント
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowleft", "arrowright", "a", "d"].includes(k)) {
    keys.add(k);
    e.preventDefault(); // スクロールなどのデフォルト動作を防ぐ
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keys.delete(k);
});

// 更新処理
function update() {
  // 左右入力で速度決定（同時押しは相殺）
  let vx = 0;
  if (isLeftPressed()) vx -= player.speed;
  if (isRightPressed()) vx += player.speed;

  player.x += vx;

  // 画面外に出ないようにクリッピング
  const left = 0;
  const right = canvas.width - player.width;
  if (player.x < left) player.x = left;
  if (player.x > right) player.x = right;
}

// 描画処理
function render() {
  // 背景
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 自機
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// ゲームループ
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// ゲーム開始
gameLoop();
