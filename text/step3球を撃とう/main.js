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
  speed: 5
};

// 弾の管理
const bullets = []; // { x, y, width, height, vy }
const BULLET_SPEED = -10;       // 上方向へ進むのでマイナス
const BULLET_SIZE = { w: 4, h: 10 };
const BULLET_COOLDOWN_MS = 120; // 連射間隔（短くすると連射が速くなる）
let lastShotAt = 0;

// 入力状態（押しっぱなし対応）
const keys = new Set();
function isLeftPressed() { return keys.has("arrowleft") || keys.has("a"); }
function isRightPressed() { return keys.has("arrowright") || keys.has("d"); }
function isShootPressed() { return keys.has(" "); } // Space

// キーボードイベント
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  // Spaceは e.key が " "（半角スペース）になる点に注意
  if (["arrowleft", "arrowright", "a", "d", " "].includes(k)) {
    keys.add(k);
    // スクロールやページ移動を防止
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keys.delete(k);
});

// 射撃処理
function tryShoot(now) {
  if (!isShootPressed()) return;

  if (now - lastShotAt >= BULLET_COOLDOWN_MS) {
    // 砲口（自機の上辺中央）から発射
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

// 更新処理
function update(now) {
  // 左右移動
  let vx = 0;
  if (isLeftPressed()) vx -= player.speed;
  if (isRightPressed()) vx += player.speed;
  player.x += vx;

  // はみ出し防止
  const left = 0;
  const right = canvas.width - player.width;
  if (player.x < left) player.x = left;
  if (player.x > right) player.x = right;

  // 射撃（押しっぱなしで一定間隔の連射）
  tryShoot(now);

  // 弾の更新
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.y += b.vy;

    // 画面外で削除
    if (b.y + b.height < 0) {
      bullets.splice(i, 1);
    }
  }
}

// 描画処理
function render() {
  // 背景
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 自機
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // 弾
  ctx.fillStyle = "white";
  for (const b of bullets) {
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
}

// ゲームループ
function gameLoop(now = 0) {
  update(now);
  render();
  requestAnimationFrame(gameLoop);
}

// ゲーム開始
requestAnimationFrame(gameLoop);
