// js/player.js
import { isLeftPressed, isRightPressed } from "./input.js";

export const player = {
  x: 0,           // 初期化は initPlayer でキャンバスサイズから決める
  y: 0,
  width: 30,
  height: 30,
  color: "lime",
  speed: 5
};

export function initPlayer(canvas) {
  player.x = canvas.width / 2 - player.width / 2;
  player.y = canvas.height - 60;
}

export function updatePlayer(canvas) {
  let vx = 0;
  if (isLeftPressed())  vx -= player.speed;
  if (isRightPressed()) vx += player.speed;
  player.x += vx;

  // はみ出し防止
  const minX = 0;
  const maxX = canvas.width - player.width;
  if (player.x < minX) player.x = minX;
  if (player.x > maxX) player.x = maxX;
}

export function renderPlayer(ctx) {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
}
