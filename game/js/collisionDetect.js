// collisionDetect.js は「当たっているかどうかを調べるだけ」のファイルです。
//
// 重要ポイント：ここでは “配列から消す” や “スコアを増やす” はしません。
// 何が当たったか（どの敵とどの弾か）を「番号（index）」で返すだけにしています。

function rectsIntersect(a, b) {
    // 2つの四角形（a と b）が重なっているかの判定
    // a が b の右側に完全にある / 左側に完全にある / 上に完全にある / 下に完全にある
    // どれでもなければ「重なっている」と判断できます。
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

export function detectBulletEnemyHits({ bullets, enemies }) {
    // 弾と敵が当たった “組み合わせ” を集めて返します。
    // 戻り値の例：[{ enemyIndex: 3, bulletIndex: 10 }, ...]
    const hits = [];

    // 元の実装に合わせて「敵1体につき最初に当たった弾1発」だけをヒット扱い
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemies[enemyIndex];

        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];

            if (
                rectsIntersect(
                    { x: bullet.x, y: bullet.y, width: bullet.width, height: bullet.height },
                    { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
                )
            ) {
                hits.push({ enemyIndex, bulletIndex });
                break;
            }
        }
    }

    return hits;
}

export function detectPlayerEnemyHits({ player, enemies }) {
    // 自機と敵が当たった敵の番号（enemyIndex）を配列で返します。
    // 戻り値の例：[2] （敵2番が自機に当たった）
    const enemyIndices = [];

    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemies[enemyIndex];
        if (
            rectsIntersect(
                { x: player.x, y: player.y, width: player.width, height: player.height },
                { x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height }
            )
        ) {
            enemyIndices.push(enemyIndex);
            // 元の実装は1回当たったら break していた
            break;
        }
    }

    return enemyIndices;
}
