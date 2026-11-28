import test from 'node:test';
import assert from 'node:assert/strict';
import { shuffledOptionOrder } from './optionShuffle';

test('shuffledOptionOrder returns a stable permutation for a given key', () => {
  const a = shuffledOptionOrder(4, 'M1#0');
  assert.deepEqual([...a].sort(), [0, 1, 2, 3]);
  assert.deepEqual(shuffledOptionOrder(4, 'M1#0'), a);
});

test('the correct answer lands in every display position with similar frequency', () => {
  const counts = [0, 0, 0, 0];
  const trials = 4000;
  for (let i = 0; i < trials; i++) {
    const order = shuffledOptionOrder(4, `item-${i}`);
    counts[order.indexOf(0)] += 1;
  }
  for (const c of counts) {
    // Expected 1000 each; allow a generous band so the test is not flaky.
    assert.ok(c > 850 && c < 1150, `position counts ${counts.join('/')}`);
  }
});

