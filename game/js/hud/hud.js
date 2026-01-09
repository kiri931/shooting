import { score, life } from "./score.js";

export class Hud {
    constructor({ score: scoreManager = score, life: lifeManager = life } = {}) {
        this.score = scoreManager;
        this.life = lifeManager;
    }

    render() {
        this.score.render();
        this.life.render();
    }
}

export const hud = new Hud();
