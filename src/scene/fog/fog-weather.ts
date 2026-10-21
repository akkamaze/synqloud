export type RandomSource = () => number;

export interface DustAtmosphere {
  density: number;
  phase: 'gathering' | 'dissipating' | 'dense' | 'wispy';
}

export interface DustWeather {
  sample(elapsed: number): DustAtmosphere;
}

const smooth = (progress: number): number => progress * progress * (3 - 2 * progress);
const between = (random: RandomSource, minimum: number, maximum: number): number =>
  minimum + random() * (maximum - minimum);

export function createDustWeather(random: RandomSource = Math.random): DustWeather {
  const initialDensity = random() < .1 ? between(random, .72, .98) : between(random, .08, .26);
  let from = initialDensity;
  let target = initialDensity;
  let start = 0;
  let duration = between(random, 60000, 160000);
  let transitioning = false;

  return {
    sample(elapsed) {
      while (elapsed >= start + duration) {
        start += duration;
        from = target;
        transitioning = !transitioning;
        if (transitioning) {
          const gather = from < .6 && random() < .18;
          target = gather ? between(random, .72, .98) : between(random, .06, .28);
          duration = between(random, 35000, 80000);
        } else {
          duration = target > .6 ? between(random, 45000, 110000) : between(random, 80000, 200000);
        }
      }
      const progress = smooth(Math.max(0, Math.min(1, (elapsed - start) / duration)));
      const density = from + (target - from) * progress;
      const phase = transitioning && target > .6 ? 'gathering'
        : transitioning && from > .6 ? 'dissipating'
        : density > .6 ? 'dense' : 'wispy';
      return { density, phase };
    },
  };
}
