const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 1) 背景（黒）を塗る
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 2) 自機（プレイヤー）を四角で描く
// x,y は「左上の座標」、width,height は「大きさ」
const player = {
  width: 30,
  height: 30,
  // 画面の中央あたり（少し下）に置く
  x: canvas.width / 2 - 30 / 2,
  y: canvas.height - 60,
};

ctx.fillStyle = "yellow";
ctx.fillRect(player.x, player.y, player.width, player.height);
