export class Score {
    constructor({ elementId = "scoreBoard", prefix = "Score: " } = {}) {
        this._elementId = elementId;
        this._prefix = prefix;
        this._value = 0;
        this._element = null;
    }

    get value() {
        return this._value;
    }

    set(value) {
        this._value = value;
        this.render();
    }

    add(delta = 1) {
        this._value += delta;
        this.render();
    }

    reset() {
        this._value = 0;
        this.render();
    }

    render() {
        if (!this._element) {
            this._element = document.getElementById(this._elementId);
        }
        if (!this._element) return;
        this._element.innerText = `${this._prefix}${this._value}`;
    }
}

export class Life {
    constructor({ elementId = "lifeBoard", prefix = "Life: ", initial = 3 } = {}) {
        this._elementId = elementId;
        this._prefix = prefix;
        this._value = initial;
        this._element = null;
    }

    get value() {
        return this._value;
    }

    set(value) {
        this._value = value;
        this.render();
    }

    add(delta = 1) {
        this._value += delta;
        this.render();
    }

    lose(delta = 1) {
        this._value -= delta;
        this.render();
    }

    reset(value = 3) {
        this._value = value;
        this.render();
    }

    render() {
        if (!this._element) {
            this._element = document.getElementById(this._elementId);
        }
        if (!this._element) return;
        this._element.innerText = `${this._prefix}${this._value}`;
    }
}

export const score = new Score();
export const life = new Life();
