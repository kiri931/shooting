import { player } from "./player.js";
import { enemies } from "./enemies.js";
import { bullets } from "./main.js";

export function handleCollisions() {
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
        // score += 1;
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
    //   isGameOver = true;
      break;
    }
  }
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
} 