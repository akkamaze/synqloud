import { createProceduralFog } from './fog/procedural-fog.ts';
import { createMotionLoop } from './motion-loop.ts';
import { createStarField } from './stars/star-field.ts';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Synqloud scene is missing ${selector}`);
  return element;
}

const host = requireElement<HTMLElement>('.synqloud');
const starCanvas = requireElement<HTMLCanvasElement>('.star-layer');

// The fog draws its random seed before the stars do; keep this order.
const fog = createProceduralFog(host);
const stars = createStarField(starCanvas, host);

const motion = createMotionLoop(host, elapsed => {
  fog.draw(elapsed);
  stars.draw(elapsed);
});

const resizeObserver = new ResizeObserver(stars.resize);
resizeObserver.observe(host);

fog.setActive(true);
fog.draw(0);
stars.resize();
motion.sync();

window.addEventListener('pagehide', event => {
  motion.stop();
  if (event.persisted) return;

  resizeObserver.disconnect();
  fog.dispose();
});
window.addEventListener('pageshow', motion.sync);
