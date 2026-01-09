export function initInput({
    canvas,
    player,
    onShoot,
    onUpgrade,
    moveStep = 10,
    padding = 10,
} = {}) {
    function handleKeyDown(e) {
        if (e.key === "ArrowLeft") {
            if (player.x > padding) {
                player.x -= moveStep;
            }
        } else if (e.key === "ArrowRight") {
            if (player.x < canvas.width - player.width - padding) {
                player.x += moveStep;
            }
        } else if (e.code === "Space") {
            onShoot?.();
        } else if (e.key === "u" || e.key === "U") {
            onUpgrade?.();
        }
    }

    window.addEventListener("keydown", handleKeyDown);

    return {
        dispose() {
            window.removeEventListener("keydown", handleKeyDown);
        },
    };
}
