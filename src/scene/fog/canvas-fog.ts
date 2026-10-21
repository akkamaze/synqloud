import type { FogRenderer, FogSeed } from './fog-renderer.ts';

const TEXTURE_WIDTH = 400;
const TEXTURE_HEIGHT = 280;
const MORPH_RATE = 0.025;
const FOG_RGB = '128,171,206';

function makeTexture(epoch: number, seed: FogSeed): HTMLCanvasElement {
  const texture = document.createElement('canvas');
  texture.width = TEXTURE_WIDTH;
  texture.height = TEXTURE_HEIGHT;

  const context = texture.getContext('2d');
  if (!context) return texture;

  const pixels = context.createImageData(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const random = (salt: number): number => {
    const value = Math.sin(epoch * 12.9898 + seed[0] * 78.233 + salt) * 43758.5453;
    return value - Math.floor(value);
  };
  const angles = [random(1) * 6.28, random(2) * 6.28, random(3) * 6.28];

  for (let y = 0; y < TEXTURE_HEIGHT; y++) {
    for (let x = 0; x < TEXTURE_WIDTH; x++) {
      const waves =
        Math.sin(x * 0.041 + y * 0.073 + angles[0]) +
        Math.sin(x * 0.13 - y * 0.033 + angles[1]) +
        Math.sin(x * 0.009 + y * 0.017 + angles[2]);
      const n = waves * 0.166 + 0.5;
      const i = (y * TEXTURE_WIDTH + x) * 4;

      pixels.data[i] = 90;
      pixels.data[i + 1] = 140;
      pixels.data[i + 2] = 184;
      pixels.data[i + 3] = Math.max(0, n ** 4 * 0.8 * 160);
    }
  }

  context.putImageData(pixels, 0, 0);
  return texture;
}

// Cross-fades two generated textures per epoch, reusing the previous epoch's next one.
export function createCanvasFog(canvas: HTMLCanvasElement, seed: FogSeed): FogRenderer {
  const context = canvas.getContext('2d');
  let textures: HTMLCanvasElement[] = [];
  let textureEpoch = -1;

  function texturesFor(epoch: number): HTMLCanvasElement[] {
    if (epoch !== textureEpoch) {
      const reusable = textureEpoch === epoch - 1 && textures[1];
      textures = [reusable || makeTexture(epoch, seed), makeTexture(epoch + 1, seed)];
      textureEpoch = epoch;
    }
    return textures;
  }

  function drawGlow(context: CanvasRenderingContext2D, density: number): void {
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.5;
    const glow = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      canvas.width * 0.9,
    );
    glow.addColorStop(0, `rgba(${FOG_RGB},${density * 0.38})`);
    glow.addColorStop(1, `rgba(${FOG_RGB},0)`);

    context.globalAlpha = 1;
    context.fillStyle = glow;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  return {
    kind: 'canvas',

    draw({ seconds, density }) {
      if (!context) return;

      const epoch = Math.floor(seconds * MORPH_RATE);
      const phase = seconds * MORPH_RATE - epoch;
      const blend = phase * phase * (3 - 2 * phase);
      const [current, next] = texturesFor(epoch);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'lighter';
      drawGlow(context, density);

      const brightness = 0.94 + 0.06 * Math.sin(seconds * 0.22);
      const x = -24 + Math.sin(seconds * 0.07) * 24;
      const y = -12 + Math.cos(seconds * 0.055) * 12;
      const width = canvas.width + 48;
      const height = canvas.height + 36;

      context.globalAlpha = brightness * (1 - blend);
      context.drawImage(current, x, y, width, height);
      context.globalAlpha = brightness * blend;
      context.drawImage(next, x, y, width, height);

      context.globalCompositeOperation = 'source-over';
    },

    dispose() {},
  };
}
