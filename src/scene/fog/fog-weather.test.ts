import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFogWeather } from './fog-weather.ts';

const constant = (value: number) => () => value;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test('usually starts wispy and holds its density', () => {
  // random 0.5: not the 10% dense start; density .08 + .5 * .18; hold 60 s + .5 * 100 s.
  const weather = createFogWeather(constant(0.5));

  for (const elapsed of [0, 109999]) {
    const { density, phase } = weather.sample(elapsed);
    assert.ok(Math.abs(density - 0.17) < 1e-12);
    assert.equal(phase, 'wispy');
  }
});

test('sometimes starts dense', () => {
  const weather = createFogWeather(constant(0.05));
  const { density, phase } = weather.sample(0);

  assert.ok(density >= 0.72 && density <= 0.98);
  assert.equal(phase, 'dense');
});

test('a transition eases from the held density to its target', () => {
  // Dense start .85, held 110 s; dense fog never gathers, so the next draws are the
  // wispy target .06 + .5 * .22 = .17 and the transition length 35 s + .5 * 45 s.
  const values = [0.05, 0.5, 0.5, 0.5, 0.5];
  let index = 0;
  const weather = createFogWeather(() => values[index++] ?? 0.5);
  const start = weather.sample(0);

  assert.equal(start.phase, 'dense');

  const holdEnd = 60000 + 0.5 * 100000;
  const transition = 35000 + 0.5 * 45000;
  const middle = weather.sample(holdEnd + transition / 2);
  const end = weather.sample(holdEnd + transition - 1);

  assert.equal(middle.phase, 'dissipating');
  assert.ok(middle.density < start.density && middle.density > 0.17);
  assert.ok(Math.abs(end.density - 0.17) < 1e-6);
});

test('density stays within the dense and wispy bounds over a long run', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const weather = createFogWeather(seeded(seed));

    for (let elapsed = 0; elapsed < 6 * 60 * 60 * 1000; elapsed += 5000) {
      const { density } = weather.sample(elapsed);
      assert.ok(density >= 0.06 && density <= 0.98, `seed ${seed} at ${elapsed} ms: ${density}`);
    }
  }
});
