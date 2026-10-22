import type { RandomSource } from '../random.ts';

export interface Star {
  x: number;
  y: number;
  radius: number;
  brightness: number;
  phase: number;
  period: number;
  lifetime: number;
  born: number;
}

// Field order matters: it fixes the sequence of random draws.
export function makeStar(elapsed: number, random: RandomSource, randomAge = false): Star {
  const lifetime = 40000 + random() * 50000;

  return {
    x: random(),
    y: random(),
    radius: 0.4 + random() ** 2 * 1.1,
    brightness: 0.28 + random() * 0.5,
    phase: random() * Math.PI * 2,
    period: 12000 + random() * 16000,
    lifetime,
    born: elapsed - (randomAge ? random() * lifetime : 0),
  };
}

export function isExpired(star: Star, elapsed: number): boolean {
  return elapsed - star.born >= star.lifetime;
}

// Fades in and out over the star's life, twinkling with its own period.
export function starOpacity(star: Star, elapsed: number): number {
  const age = Math.max(0, Math.min(1, (elapsed - star.born) / star.lifetime));
  const life = Math.sin(Math.PI * age) ** 0.75;
  const pulse = 0.5 + 0.5 * Math.sin((elapsed * Math.PI * 2) / star.period + star.phase);

  return star.brightness * life * (0.4 + 0.6 * pulse);
}
