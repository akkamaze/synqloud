import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isExpired, makeStar, type Star, starOpacity } from './star.ts';

const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++];
};

const star: Star = {
  x: 0.5,
  y: 0.5,
  radius: 1,
  brightness: 0.8,
  phase: 0,
  period: 20000,
  lifetime: 60000,
  born: 0,
};

test('makeStar reads random values in a fixed field order', () => {
  const made = makeStar(1000, sequence(0.5, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8), true);

  assert.deepEqual(made, {
    lifetime: 65000,
    x: 0.1,
    y: 0.2,
    radius: 0.4 + 0.3 ** 2 * 1.1,
    brightness: 0.28 + 0.4 * 0.5,
    phase: 0.6 * Math.PI * 2,
    period: 12000 + 0.7 * 16000,
    born: 1000 - 0.8 * 65000,
  });
});

test('a new star is born now and draws no age', () => {
  const random = sequence(0.5, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7);
  assert.equal(makeStar(1000, random).born, 1000);
});

test('a star expires exactly at the end of its lifetime', () => {
  assert.equal(isExpired(star, 59999), false);
  assert.equal(isExpired(star, 60000), true);
});

test('a star is invisible at birth and death and brightest mid-life on a pulse peak', () => {
  assert.equal(starOpacity(star, 0), 0);
  assert.ok(starOpacity(star, 60000) < 1e-10);

  // Mid-life, 30 s in: pulse phase is 3 full periods + half, so use a quarter-period offset.
  const peak = { ...star, phase: Math.PI / 2 - (30000 * Math.PI * 2) / star.period };
  assert.ok(Math.abs(starOpacity(peak, 30000) - star.brightness) < 1e-12);
});
