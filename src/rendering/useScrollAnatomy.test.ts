import test from 'node:test';
import assert from 'node:assert/strict';
import { springStep, wheelToAmount } from './useScrollAnatomy';
import { staggeredExplodeFraction } from './explodeView';

test('anatomy spring settles on its target with only a small, organic overshoot', () => {
  let x = 0;
  let v = 0;
  let peak = 0;
  for (let i = 0; i < 240; i++) {
    ({ x, v } = springStep(x, v, 1, 1 / 60));
    peak = Math.max(peak, x);
  }
  assert.ok(Math.abs(x - 1) < 0.002, `settles: ${x}`);
  assert.ok(peak > 1.0 && peak < 1.08, `overshoot ${peak}`);
});

test('wheel deltas map to explode units for pixel, line and page modes', () => {
  assert.equal(wheelToAmount(650, 0), 1);
  assert.equal(wheelToAmount(-65, 0), -0.1);
  assert.ok(wheelToAmount(3, 1) > 0.07 && wheelToAmount(3, 1) < 0.08);
  assert.ok(wheelToAmount(1, 2) < 1);
});

test('staggered explode starts tiers one after another and ends exactly', () => {
  for (let rank = 0; rank < 4; rank++) {
    assert.equal(staggeredExplodeFraction(0, rank, 4), 0);
    assert.equal(staggeredExplodeFraction(1, rank, 4), 1);
    let prev = 0;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      const f = staggeredExplodeFraction(t, rank, 4);
      assert.ok(f >= prev - 1e-12, 'never moves backwards as t grows');
      prev = f;
    }
  }
  // At a midpoint the first tier is further out than the last.
  assert.ok(staggeredExplodeFraction(0.3, 0, 4) > staggeredExplodeFraction(0.3, 3, 4));
});
