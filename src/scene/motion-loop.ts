export interface MotionLoop {
  sync(): void;
  stop(): void;
}

// About 25 fps: the scene moves slowly, so fewer frames save power.
const FRAME_INTERVAL_MS = 40;

// Calls onFrame with total running time, paused while hidden or under reduced motion.
export function createMotionLoop(host: HTMLElement, onFrame: (elapsed: number) => void): MotionLoop {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let elapsed = 0;
  let previous = 0;
  let frame = 0;

  function step(time: number): void {
    frame = 0;
    if (reducedMotion.matches || document.hidden) return;

    if (!previous) previous = time;
    if (time - previous >= FRAME_INTERVAL_MS) {
      elapsed += time - previous;
      previous = time;
      onFrame(elapsed);
    }

    frame = requestAnimationFrame(step);
  }

  function stop(): void {
    cancelAnimationFrame(frame);
  }

  function sync(): void {
    stop();
    frame = 0;
    previous = 0;

    const running = !reducedMotion.matches && !document.hidden;
    host.dataset.motion = running ? 'running' : 'paused';
    if (running) frame = requestAnimationFrame(step);
  }

  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);

  return { sync, stop };
}
