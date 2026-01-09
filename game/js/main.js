
import { player, initPlayer, drawPlayer } from "./player.js";
import { enemySystem } from "./enemies.js";
import { collisionSystem } from "./collision.js";
import { bulletSystem } from "./bullets.js";
import { tryShoot, upgradeWeapon, resetWeapon } from "./shooting.js";
import { initInput } from "./input.js";
import { hud, score, life } from "./hud/index.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mapImage = new Image();
mapImage.src = "image/map.png";

initPlayer(canvas);

// 初期表示
hud.render();

let gameState = "start"; // "start" | "playing" | "gameover"

function startGame() {
    gameState = "playing";
}

function resetGame() {
    bulletSystem.clear();
    enemySystem.clear();
    score.reset();
    life.reset(3);
    resetWeapon();
    initPlayer(canvas);
    hud.render();
}

function restartGame() {
    resetGame();
    startGame();
}

function handleSpace() {
    if (gameState === "start") {
        restartGame();
        return;
    }
    if (gameState === "gameover") {
        resetGame();
        gameState = "start";
        return;
    }
    tryShoot();
}

function handleUpgrade() {
    if (gameState !== "playing") return;
    upgradeWeapon();
}

function updateHud() {
    hud.render();
}

initInput({
    canvas,
    player,
    onShoot: handleSpace,
    onUpgrade: handleUpgrade,
});

function update() {
    if (gameState !== "playing") {
        updateHud();
        return;
    }
    bulletSystem.update();
    enemySystem.update(canvas);
    const isGameOver = collisionSystem.update();
    if (isGameOver) {
        gameState = "gameover";
    }
    updateHud();
}

function drawOverlay({ title, subTitle }) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "32px sans-serif";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = "18px sans-serif";
    ctx.fillText(subTitle, canvas.width / 2, canvas.height / 2 + 20);
}

function draw() {
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    drawPlayer(ctx);

    bulletSystem.draw(ctx);

    enemySystem.draw(ctx);

    if (gameState === "start") {
        drawOverlay({ title: "START", subTitle: "SPACEで開始" });
    } else if (gameState === "gameover") {
        drawOverlay({ title: "GAME OVER", subTitle: "SPACEでスタート画面へ" });
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
