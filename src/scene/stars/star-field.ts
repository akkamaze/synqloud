import { isExpired, makeStar, type Star, starOpacity } from './star.ts';

export interface StarField {
  resize(): void;
  draw(elapsed: number): void;
}

const STAR_COUNT = 52;
const HALO_MIN_RADIUS = 1.15;
const MAX_PIXEL_RATIO = 2;

function drawStar(context: CanvasRenderingContext2D, star: Star, opacity: number, width: number, height: number): void {
  const x = star.x * width;
  const y = star.y * height;

  if (star.radius > HALO_MIN_RADIUS) {
    const halo = context.createRadialGradient(x, y, 0, x, y, star.radius * 4);
    halo.addColorStop(0, `rgba(177,213,250,${opacity * 0.28})`);
    halo.addColorStop(1, 'rgba(177,213,250,0)');

    context.fillStyle = halo;
    context.beginPath();
    context.arc(x, y, star.radius * 4, 0, Math.PI * 2);
    context.fill();
  }

  context.fillStyle = `rgba(211,230,251,${opacity})`;
  context.beginPath();
  context.arc(x, y, star.radius, 0, Math.PI * 2);
  context.fill();
}

export function createStarField(canvas: HTMLCanvasElement, host: HTMLElement): StarField {
  const context = canvas.getContext('2d');
  const stars = Array.from({ length: STAR_COUNT }, () => makeStar(0, Math.random, true));

  let elapsed = 0;
  let renewed = 0;
  let width = 1;
  let height = 1;

  function draw(now: number): void {
    elapsed = now;
    if (!context) return;

    context.clearRect(0, 0, width, height);

    stars.forEach((star, index) => {
      if (isExpired(star, elapsed)) {
        stars[index] = makeStar(elapsed, Math.random);
        renewed++;
      }
      drawStar(context, stars[index], starOpacity(stars[index], elapsed), width, height);
    });

    canvas.dataset.time = (elapsed / 1000).toFixed(3);
    canvas.dataset.renewed = String(renewed);
  }

  function resize(): void {
    width = host.clientWidth;
    height = host.clientHeight;

    const ratio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);

    draw(elapsed);
  }

  return { resize, draw };
}
