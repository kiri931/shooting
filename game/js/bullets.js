export const bullets = [];

export function clearBullets() {
	bullets.length = 0;
}

export function spawnBullet({ x, y, vx = 0, vy = -5, size = 10 } = {}) {
	bullets.push({
		x,
		y,
		width: size,
		height: size,
		vx,
		vy,
	});
}

export function updateBullets() {
	for (let i = bullets.length - 1; i >= 0; i--) {
		const bullet = bullets[i];
		bullet.y += bullet.vy;
		bullet.x += bullet.vx;
		if (bullet.y + bullet.height < 0) {
			bullets.splice(i, 1);
		}
	}
}

export function drawBullets(ctx) {
	ctx.fillStyle = "white";
	for (let i = 0; i < bullets.length; i++) {
		const bullet = bullets[i];
		const radius = Math.min(bullet.width, bullet.height) / 2;
		const cx = bullet.x + bullet.width / 2;
		const cy = bullet.y + bullet.height / 2;
		ctx.beginPath();
		ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		ctx.fill();
	}
}

export class BulletSystem {
	spawn(params) {
		spawnBullet(params);
	}

	update() {
		updateBullets();
	}

	draw(ctx) {
		drawBullets(ctx);
	}

	clear() {
		clearBullets();
	}
}

export const bulletSystem = new BulletSystem();
