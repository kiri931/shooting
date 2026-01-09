const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 画像（背景・自機・敵2種類）
const mapImage = new Image();
mapImage.src = "../image/map.png";

const playerImage = new Image();
playerImage.src = "../image/player.png";

const enemyImageStraight = new Image();
enemyImageStraight.src = "../image/enemy_straight.png";

const enemyImageHoming = new Image();
enemyImageHoming.src = "../image/enemy_homing.png";

// 入力（押しっぱなし対応）
const input = {
	left: false,
	right: false,
};

// ゲーム状態
const STATE = {
	START: "start",
	PLAYING: "playing",
	GAMEOVER: "gameover",
};
let state = STATE.START;

// 自機
const player = {
	width: 30,
	height: 30,
	x: canvas.width / 2 - 30 / 2,
	y: canvas.height - 60,
	speed: 5,
};

// 弾
const bullets = [];
const BULLET_SIZE = 10;
const BULLET_SPEED_Y = -8;
const BULLET_SPEED_X = 3;
let shootCooldown = 0;

// 武器（Uキーで強化）
let weaponLevel = 1;
const MAX_WEAPON_LEVEL = 3;

function getVxPattern(level) {
	if (level <= 1) return [0];
	if (level === 2) return [-BULLET_SPEED_X, BULLET_SPEED_X];
	return [-BULLET_SPEED_X, 0, BULLET_SPEED_X];
}

function upgradeWeapon() {
	if (weaponLevel < MAX_WEAPON_LEVEL) weaponLevel++;
}

function spawnBulletsByWeapon() {
	const vxList = getVxPattern(weaponLevel);
	for (let i = 0; i < vxList.length; i++) {
		const vx = vxList[i];
		bullets.push({
			size: BULLET_SIZE,
			x: player.x + player.width / 2 - BULLET_SIZE / 2,
			y: player.y,
			vx,
			vy: BULLET_SPEED_Y,
		});
	}
}

// 敵
const ENEMY_TYPE = {
	STRAIGHT: "straight",
	HOMING: "homing",
};

const enemies = [];
const ENEMY_SIZE = 50;
const ENEMY_SPEED = 3.6;
const ENEMY_HOMING_SPEED = 2.4;

// HUD
let score = 0;
const SCORE_PER_KILL = 100;

let life = 3;
let invincibleTimer = 0;

function resetToStart() {
	state = STATE.START;
	bullets.length = 0;
	enemies.length = 0;
	shootCooldown = 0;
	score = 0;
	life = 3;
	invincibleTimer = 0;
	weaponLevel = 1;
	player.x = canvas.width / 2 - player.width / 2;
}

function startGame() {
	state = STATE.PLAYING;
	bullets.length = 0;
	enemies.length = 0;
	shootCooldown = 0;
	score = 0;
	life = 3;
	invincibleTimer = 0;
	weaponLevel = 1;
	player.x = canvas.width / 2 - player.width / 2;
}

function circleHit(ax, ay, ar, bx, by, br) {
	const dx = ax - bx;
	const dy = ay - by;
	const r = ar + br;
	return dx * dx + dy * dy <= r * r;
}

function spawnEnemy() {
	if (enemies.length >= 7) return;
	if (Math.random() < 0.03) {
		const type = Math.random() < 0.5 ? ENEMY_TYPE.STRAIGHT : ENEMY_TYPE.HOMING;
		enemies.push({
			type,
			x: Math.random() * (canvas.width - ENEMY_SIZE),
			y: -ENEMY_SIZE,
			width: ENEMY_SIZE,
			height: ENEMY_SIZE,
			vy: ENEMY_SPEED,
		});
	}
}

function updatePlayer() {
	if (input.left) player.x -= player.speed;
	if (input.right) player.x += player.speed;

	if (player.x < 0) player.x = 0;
	if (player.x > canvas.width - player.width) {
		player.x = canvas.width - player.width;
	}
}

function updateBullets() {
	for (let i = bullets.length - 1; i >= 0; i--) {
		const b = bullets[i];
		b.x += b.vx;
		b.y += b.vy;

		// 画面の外に出た弾は消す
		if (b.y + b.size < 0 || b.x + b.size < 0 || b.x > canvas.width) {
			bullets.splice(i, 1);
		}
	}
}

function updateEnemies() {
	const pcx = player.x + player.width / 2;
	const pcy = player.y + player.height / 2;

	for (let i = enemies.length - 1; i >= 0; i--) {
		const e = enemies[i];

		if (e.type === ENEMY_TYPE.STRAIGHT) {
			e.y += e.vy;
		} else {
			// 追尾：プレイヤー中心へ向かう
			const ecx = e.x + e.width / 2;
			const ecy = e.y + e.height / 2;
			const dx = pcx - ecx;
			const dy = pcy - ecy;
			const len = Math.hypot(dx, dy) || 1;
			e.x += (dx / len) * ENEMY_HOMING_SPEED;
			e.y += (dy / len) * ENEMY_HOMING_SPEED;
		}

		if (e.y > canvas.height + ENEMY_SIZE) {
			enemies.splice(i, 1);
		}
	}
}

function handleBulletEnemyCollisions() {
	for (let bi = bullets.length - 1; bi >= 0; bi--) {
		const b = bullets[bi];
		const br = b.size / 2;
		const bcx = b.x + br;
		const bcy = b.y + br;

		for (let ei = enemies.length - 1; ei >= 0; ei--) {
			const e = enemies[ei];
			const er = Math.min(e.width, e.height) / 2;
			const ecx = e.x + e.width / 2;
			const ecy = e.y + e.height / 2;

			if (circleHit(bcx, bcy, br, ecx, ecy, er)) {
				bullets.splice(bi, 1);
				enemies.splice(ei, 1);
				score += SCORE_PER_KILL;
				break;
			}
		}
	}
}

function handlePlayerEnemyCollisions() {
	if (invincibleTimer > 0) return;

	const pr = Math.min(player.width, player.height) / 2;
	const pcx = player.x + player.width / 2;
	const pcy = player.y + player.height / 2;

	for (let ei = enemies.length - 1; ei >= 0; ei--) {
		const e = enemies[ei];
		const er = Math.min(e.width, e.height) / 2;
		const ecx = e.x + e.width / 2;
		const ecy = e.y + e.height / 2;

		if (circleHit(pcx, pcy, pr, ecx, ecy, er)) {
			enemies.splice(ei, 1);
			life -= 1;
			invincibleTimer = 60;
			if (life <= 0) state = STATE.GAMEOVER;
			break;
		}
	}
}

window.addEventListener("keydown", (e) => {
	if (e.key === "ArrowLeft") input.left = true;
	if (e.key === "ArrowRight") input.right = true;

	if (e.key === "u" || e.key === "U") {
		if (state === STATE.PLAYING) upgradeWeapon();
	}

	if (e.code === "Space") {
		if (state === STATE.START) {
			startGame();
			return;
		}
		if (state === STATE.GAMEOVER) {
			resetToStart();
			return;
		}

		// PLAYING中は発射
		if (shootCooldown === 0) {
			spawnBulletsByWeapon();
			shootCooldown = 8;
		}
	}
});

window.addEventListener("keyup", (e) => {
	if (e.key === "ArrowLeft") input.left = false;
	if (e.key === "ArrowRight") input.right = false;
});

function updatePlaying() {
	if (shootCooldown > 0) shootCooldown--;
	if (invincibleTimer > 0) invincibleTimer--;

	updatePlayer();
	spawnEnemy();
	updateBullets();
	updateEnemies();
	handleBulletEnemyCollisions();
	handlePlayerEnemyCollisions();
}

function drawHud() {
	ctx.fillStyle = "white";
	ctx.font = "16px sans-serif";
	ctx.fillText(`SCORE: ${score}`, 12, 24);
	ctx.fillText(`LIFE: ${life}`, 12, 46);
	ctx.fillText(`WEAPON: Lv.${weaponLevel}`, 12, 68);
}

function drawBackground() {
	if (mapImage.complete) {
		ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);
	} else {
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
	}
}

function drawEntities() {
	// 自機（無敵中は点滅）
	const blink = invincibleTimer > 0 && Math.floor(invincibleTimer / 6) % 2 === 0;
	if (!blink) {
		if (playerImage.complete) {
			ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
		} else {
			ctx.fillStyle = "yellow";
			ctx.fillRect(player.x, player.y, player.width, player.height);
		}
	}

	// 弾
	ctx.fillStyle = "white";
	for (let i = 0; i < bullets.length; i++) {
		const b = bullets[i];
		const r = b.size / 2;
		const cx = b.x + r;
		const cy = b.y + r;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();
	}

	// 敵（typeで画像を切り替え）
	for (let i = 0; i < enemies.length; i++) {
		const e = enemies[i];
		const img = e.type === ENEMY_TYPE.HOMING ? enemyImageHoming : enemyImageStraight;
		if (img.complete) {
			ctx.drawImage(img, e.x, e.y, e.width, e.height);
		} else {
			ctx.fillStyle = e.type === ENEMY_TYPE.HOMING ? "deepskyblue" : "crimson";
			ctx.fillRect(e.x, e.y, e.width, e.height);
		}
	}
}

function drawOverlay(title, sub) {
	ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.font = "28px sans-serif";
	ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
	ctx.font = "16px sans-serif";
	ctx.fillText(sub, canvas.width / 2, canvas.height / 2 + 24);
	ctx.textAlign = "left";
}

function draw() {
	drawBackground();
	drawEntities();
	drawHud();

	if (state === STATE.START) {
		drawOverlay("START", "Spaceで開始 / Uで武器強化");
	}
	if (state === STATE.GAMEOVER) {
		drawOverlay("GAME OVER", "Spaceでスタートに戻る");
	}
}

function gameLoop() {
	if (state === STATE.PLAYING) {
		updatePlaying();
	}
	draw();
	requestAnimationFrame(gameLoop);
}

resetToStart();
gameLoop();
