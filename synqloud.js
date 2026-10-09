import { createProceduralDust } from './procedural-dust.js';

const host = document.querySelector('.synqloud');
const canvas = document.querySelector('.synqloud-stars');
const context = canvas.getContext('2d');
const dust = createProceduralDust(host, { fullScreen: true });
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stars = Array.from({ length: 96 }, () => ({ x: Math.random(), y: Math.random(), radius: .4 + Math.random() ** 3 * 1.1, brightness: .15 + Math.random() * .5, phase: Math.random() * Math.PI * 2, period: 4000 + Math.random() * 13000 }));
let elapsed = 0;
let previous = 0;
let frame = 0;
let width = 1;
let height = 1;

function drawStars() {
  if (!context) return;
  context.clearRect(0, 0, width, height);
  for (const star of stars) {
    const opacity = star.brightness * (.65 + .35 * Math.sin(elapsed / star.period + star.phase));
    context.fillStyle = `rgba(211,230,251,${opacity})`;
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function step(time) {
  frame = 0;
  if (reducedMotion.matches || document.hidden) return;
  if (!previous) previous = time;
  if (time - previous >= 40) {
    elapsed += time - previous;
    previous = time;
    dust.draw(elapsed);
    drawStars();
  }
  frame = requestAnimationFrame(step);
}

function syncMotion() {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
  const stopped = reducedMotion.matches;
  host.dataset.motion = stopped || document.hidden ? 'paused' : 'running';
  if (!stopped && !document.hidden) frame = requestAnimationFrame(step);
}

function resize() {
  width = host.clientWidth;
  height = host.clientHeight;
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawStars();
}

document.addEventListener('visibilitychange', syncMotion);
reducedMotion.addEventListener('change', syncMotion);
const observer = new ResizeObserver(resize);
observer.observe(host);
dust.setActive(true);
dust.draw(0);
resize();
syncMotion();
window.addEventListener('pagehide', event => {
  cancelAnimationFrame(frame);
  if (!event.persisted) { observer.disconnect(); dust.dispose(); }
});
window.addEventListener('pageshow', syncMotion);
