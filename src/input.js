const KEY_ACTIONS = Object.freeze({
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  Space: 'jump',
  KeyJ: 'fire',
  KeyX: 'fire',
});

const PREVENT_DEFAULT = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
]);

export class InputManager {
  constructor(target = window) {
    this.target = target;
    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      jump: false,
      fire: false,
    };

    this.onKeyDown = (event) => {
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();
      this.state[action] = true;
    };

    this.onKeyUp = (event) => {
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();
      this.state[action] = false;
    };

    this.onBlur = () => this.clear();

    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  clear() {
    for (const key of Object.keys(this.state)) this.state[key] = false;
  }

  destroy() {
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('blur', this.onBlur);
  }
}