import { FIXED_DT } from './constants.js';
import { createGame } from './game.js';
import { InputManager } from './input.js';
import { Renderer } from './renderer.js';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start-btn');

const game = createGame();
const input = new InputManager(window);
const renderer = new Renderer(canvas);

let started = false;
let lastTime = performance.now();
let accumulator = 0;

function startGame() {
  if (started) game.reset();
  started = true;
  game.paused = false;
  accumulator = 0;
  overlay.classList.add('is-hidden');
}

function restartGame() {
  game.reset();
  started = true;
  accumulator = 0;
  overlay.classList.add('is-hidden');
}

startButton.addEventListener('click', startGame);

window.addEventListener('keydown', (event) => {
  if (!started && (event.code === 'Enter' || event.code === 'Space')) {
    event.preventDefault();
    startGame();
    return;
  }

  if (event.code === 'KeyP' && started && !game.gameOver) {
    game.paused = !game.paused;
  }

  if (event.code === 'KeyR' && started) {
    restartGame();
  }
});

function frame(now) {
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (started && !game.paused && !game.gameOver) {
    accumulator += delta;
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < 6) {
      game.update(FIXED_DT, input.state);
      accumulator -= FIXED_DT;
      steps += 1;
    }
    if (steps === 6) accumulator = 0;
  } else {
    accumulator = 0;
  }

  renderer.render(game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);