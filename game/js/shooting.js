import { player } from "./player.js";
import { bulletSystem } from "./bullets.js";

const BULLET_SPEED = -5;
const BULLET_SIZE = 10;

let weaponLevel = 1;

export function setWeaponLevel(level) {
    const next = Number(level);
    if (!Number.isFinite(next)) return;
    weaponLevel = Math.max(1, Math.min(5, Math.floor(next)));
}

export function upgradeWeapon() {
    setWeaponLevel(weaponLevel + 1);
}

export function resetWeapon() {
    setWeaponLevel(1);
}

function getVxPattern(level) {
    switch (level) {
        case 1:
            return [0];
        case 2:
            return [-1, 1];
        case 3:
            return [-1, 0, 1];
        case 4:
            return [-2, -1, 1, 2];
        case 5:
        default:
            return [-2, -1, 0, 1, 2];
    }
}

export function tryShoot() {
    const baseX = player.x + player.width / 2 - BULLET_SIZE / 2;
    const baseY = player.y;

    const vxs = getVxPattern(weaponLevel);
    for (let i = 0; i < vxs.length; i++) {
        bulletSystem.spawn({
            x: baseX,
            y: baseY,
            vx: vxs[i],
            vy: BULLET_SPEED,
            size: BULLET_SIZE,
        });
    }
}
