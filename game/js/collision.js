import { player } from "./player.js";
import { enemies } from "./enemies.js";
import { bullets } from "./bullets.js";
import { detectBulletEnemyHits, detectPlayerEnemyHits } from "./collisionDetect.js";
import { applyBulletEnemyHits, applyPlayerEnemyHits } from "./collisionApply.js";

// collision.js は「当たり判定処理の司令塔」です。
//
// ここでは “当たっているかどうかを調べる” ことと、
// “当たった結果を反映する（消す・スコア加算・Life減らす）” ことを分けています。
//
// - 調べるだけ：collisionDetect.js
// - 反映するだけ：collisionApply.js
//
// こうしておくと、処理の見通しがよくなり、バグも追いやすくなります。

export function handleCollisions() {
  // 1) 弾と敵が「重なっている」組み合わせを集める（まだ消したりはしない）
  const bulletEnemyHits = detectBulletEnemyHits({ bullets, enemies });

  // 2) 上で見つけたヒット情報を使って、弾と敵を消してスコアを加算する
  applyBulletEnemyHits({ bullets, enemies, hits: bulletEnemyHits });

  // 3) 自機と敵が「重なっている」かを調べる（当たった敵の番号を返す）
  const playerEnemyHits = detectPlayerEnemyHits({ player, enemies });

  // 4) 当たっていたら敵を消して Life を減らす（Life が 0 ならリロード）
  return applyPlayerEnemyHits({ enemies, enemyIndices: playerEnemyHits });
}

// main.js からは collisionSystem.update() を呼ぶだけにしています。
// （他の BulletSystem / EnemySystem と形を揃えるため）
export class CollisionSystem {
  update() {
    return handleCollisions();
  }
}

export const collisionSystem = new CollisionSystem();
