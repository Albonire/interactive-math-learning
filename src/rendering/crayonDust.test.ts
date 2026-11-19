import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CrayonDustPool,
  ParameterEnergyTracker,
  computeDustFlakeAlpha,
} from './crayonDust';

test('ParameterEnergyTracker ignores gentle nudges and fires on heavy interaction', () => {
  const tracker = new ParameterEnergyTracker({
    decayHalfLifeMs: 220,
    triggerThreshold: 0.24,
    emitCooldownMs: 120,
  });

  // Tiny single nudge stays quiet
  const gentle = tracker.recordDelta(0.03, 1000);
  assert.equal(gentle.shouldEmit, false);

  // Rapid heavy drag accumulates vigor and emits dust burst
  const heavy1 = tracker.recordDelta(0.14, 1040);
  const heavy2 = tracker.recordDelta(0.16, 1070);
  assert.ok(
    heavy1.shouldEmit || heavy2.shouldEmit,
    'Heavy parameter interaction should cross threshold and trigger dust emission'
  );

  // Cooldown prevents noisy spam on the very next millisecond
  const immediate = tracker.recordDelta(0.18, 1085);
  assert.equal(immediate.shouldEmit, false);
});

test('CrayonDustPool emits fewer crumbs in Eco Mode and decays cleanly to zero', () => {
  const pool = new CrayonDustPool(48);
  const normalCount = pool.emitBurst({
    origin: [0.5, 0.5, 0.5],
    crayon: 'cobalt',
    intensity: 0.85,
    ecoMode: false,
  });
  assert.ok(normalCount >= 10 && normalCount <= 16);
  assert.equal(pool.activeCount(), normalCount);

  pool.clear();
  const ecoCount = pool.emitBurst({
    origin: [0.5, 0.5, 0.5],
    crayon: 'cobalt',
    intensity: 0.85,
    ecoMode: true,
  });
  assert.ok(ecoCount < normalCount, `Expected Eco Mode dust (${ecoCount}) < normal (${normalCount})`);

  // Advance simulation until all particles expire
  let stillActive = true;
  for (let i = 0; i < 40; i++) {
    stillActive = pool.step(0.05);
  }
  assert.equal(stillActive, false);
  assert.equal(pool.activeCount(), 0);
});

test('computeDustFlakeAlpha fades in smoothly and tapers to zero at end of life', () => {
  assert.equal(computeDustFlakeAlpha(0), 0);
  assert.ok(computeDustFlakeAlpha(0.2) > 0.45);
  assert.ok(computeDustFlakeAlpha(0.75) < computeDustFlakeAlpha(0.2));
  assert.equal(computeDustFlakeAlpha(1), 0);
});
