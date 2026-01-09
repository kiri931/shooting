import { score, life } from "./hud/index.js";

// collisionApply.js は「当たった結果を反映するだけ」のファイルです。
//
// collisionDetect.js で見つけたヒット情報（番号）を受け取り、
// - 弾や敵を配列から消す
// - スコアを増やす
// - Life を減らす
// といった “ゲーム状態の更新” を行います。

export function applyBulletEnemyHits({ bullets, enemies, hits }) {
    // hits は「どの敵(enemyIndex)と、どの弾(bulletIndex)が当たったか」の配列です。
    //
    // 注意：配列から要素を消すと index がずれてしまいます。
    // そのため splice の安全のため、index が大きいものから（降順で）消します。
    const ordered = [...hits].sort((a, b) => {
        if (a.enemyIndex !== b.enemyIndex) return b.enemyIndex - a.enemyIndex;
        return b.bulletIndex - a.bulletIndex;
    });

    for (let i = 0; i < ordered.length; i++) {
        const { enemyIndex, bulletIndex } = ordered[i];

        if (!enemies[enemyIndex] || !bullets[bulletIndex]) continue;

        // 当たった弾と敵を消す
        bullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);

        // スコアを +1
        score.add(1);
    }
}

export function applyPlayerEnemyHits({ enemies, enemyIndices }) {
    // enemyIndices は「自機に当たった敵の番号」の配列です。
    // これも配列から消すので、降順で消します。
    const ordered = [...enemyIndices].sort((a, b) => b - a);

    for (let i = 0; i < ordered.length; i++) {
        const enemyIndex = ordered[i];
        if (!enemies[enemyIndex]) continue;

        // 当たった敵を消して、Life を 1 減らす
        enemies.splice(enemyIndex, 1);
        life.lose(1);

        // Life が 0 以下ならゲームオーバー（ここでは「ゲームオーバーになった」ことだけ返す）
        if (life.value <= 0) {
            return true;
        }
    }

    return false;
}
