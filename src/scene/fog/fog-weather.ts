import { between, type RandomSource } from '../random.ts';

export type FogPhase = 'gathering' | 'dissipating' | 'dense' | 'wispy';

export interface FogAtmosphere {
  density: number;
  phase: FogPhase;
}

export interface FogWeather {
  sample(elapsed: number): FogAtmosphere;
}

const DENSE = 0.6;

const smooth = (progress: number): number => progress * progress * (3 - 2 * progress);

function phaseOf(transitioning: boolean, from: number, target: number, density: number): FogPhase {
  if (transitioning && target > DENSE) return 'gathering';
  if (transitioning && from > DENSE) return 'dissipating';
  return density > DENSE ? 'dense' : 'wispy';
}

// Alternates holds and transitions; dense fog is rare and short-lived.
export function createFogWeather(random: RandomSource = Math.random): FogWeather {
  const initialDensity =
    random() < 0.1 ? between(random, 0.72, 0.98) : between(random, 0.08, 0.26);

  let from = initialDensity;
  let target = initialDensity;
  let start = 0;
  let duration = between(random, 60000, 160000);
  let transitioning = false;

  function advanceTo(elapsed: number): void {
    while (elapsed >= start + duration) {
      start += duration;
      from = target;
      transitioning = !transitioning;

      if (transitioning) {
        const gather = from < DENSE && random() < 0.18;
        target = gather ? between(random, 0.72, 0.98) : between(random, 0.06, 0.28);
        duration = between(random, 35000, 80000);
      } else {
        duration =
          target > DENSE ? between(random, 45000, 110000) : between(random, 80000, 200000);
      }
    }
  }

  return {
    sample(elapsed) {
      advanceTo(elapsed);

      const progress = smooth(Math.max(0, Math.min(1, (elapsed - start) / duration)));
      const density = from + (target - from) * progress;

      return { density, phase: phaseOf(transitioning, from, target, density) };
    },
  };
}
