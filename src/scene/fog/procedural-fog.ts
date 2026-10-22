import { createCanvasFog } from './canvas-fog.ts';
import type { FogRenderer, FogSeed } from './fog-renderer.ts';
import { createFogWeather } from './fog-weather.ts';
import { createWebGLFog } from './webgl-fog.ts';

export interface ProceduralFog {
  setActive(value: boolean): void;
  draw(elapsed: number): void;
  dispose(): void;
}

const MAX_PIXEL_RATIO = 2;

function makeCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'fog-layer';
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

// Prepends the fog canvas to host; WebGL when it works, a 2D canvas otherwise.
export function createProceduralFog(host: HTMLElement): ProceduralFog {
  const seed: FogSeed = [Math.random() * 40 + 2, Math.random() * 40 + 2];
  const weather = createFogWeather();

  let canvas = makeCanvas();
  let disposed = false;
  let active = false;
  let lastElapsed = 0;

  host.prepend(canvas);

  function label(renderer: FogRenderer): FogRenderer {
    canvas.dataset.renderer = renderer.kind;
    canvas.dataset.seed = seed.map(value => value.toFixed(3)).join(',');
    return renderer;
  }

  // A canvas that ever held a WebGL context cannot give a 2D one, so swap it.
  function canvasFallback(): FogRenderer {
    const previous = canvas;
    canvas = makeCanvas();
    previous.replaceWith(canvas);
    return label(createCanvasFog(canvas, seed));
  }

  function onContextLost(): void {
    renderer = canvasFallback();
    resize();
  }

  function startRenderer(): FogRenderer {
    try {
      return label(createWebGLFog(canvas, seed, onContextLost));
    } catch {
      return canvasFallback();
    }
  }

  function resize(): void {
    if (disposed) return;

    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.round((host.clientWidth || 1) * ratio);
    canvas.height = Math.round((host.clientHeight || 1) * ratio);
    canvas.dataset.resolution = `${canvas.width}x${canvas.height}`;

    draw(lastElapsed);
  }

  function draw(elapsed: number): void {
    if (disposed || !active) return;

    lastElapsed = elapsed;
    const seconds = elapsed / 1000;
    const atmosphere = weather.sample(elapsed);

    renderer.draw({ seconds, density: atmosphere.density });

    canvas.dataset.time = seconds.toFixed(3);
    canvas.dataset.morph = (seconds * 0.025).toFixed(3);
    canvas.dataset.weather = atmosphere.phase;
    canvas.dataset.density = atmosphere.density.toFixed(4);
  }

  let renderer = startRenderer();

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    setActive(value) {
      active = value;
      canvas.hidden = !value;
      if (value) resize();
    },

    draw,

    dispose() {
      disposed = true;
      observer.disconnect();
      renderer.dispose();
      canvas.remove();
    },
  };
}
