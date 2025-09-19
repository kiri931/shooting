// js/input.js
export const keys = new Set();

const HANDLED_KEYS = ["arrowleft", "arrowright", "a", "d", " "]; // Spaceは" "

export function setupInput(target = window) {
  target.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (HANDLED_KEYS.includes(k)) {
      keys.add(k);
      e.preventDefault(); // スクロール/戻る等の既定動作を防ぐ
    }
  });

  target.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    keys.delete(k);
  });
}

// 押下状態ヘルパ
export function isLeftPressed()  { return keys.has("arrowleft") || keys.has("a"); }
export function isRightPressed() { return keys.has("arrowright") || keys.has("d"); }
export function isShootPressed() { return keys.has(" "); } // Space
