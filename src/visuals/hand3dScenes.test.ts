import test from 'node:test';
import assert from 'node:assert/strict';
import { binomial, descentPath, dot3, fibCallTree, isPrime, projectOntoPlane } from './hand3dScenes';

test('projection error is orthogonal to both spanning vectors', () => {
  const a1 = { x: 1, y: 0.18, z: 0.05 };
  const a2 = { x: 0.1, y: 0.12, z: 1 };
  for (const b of [{ x: 0.8, y: 1, z: 0.3 }, { x: -0.2, y: 0.7, z: 0.9 }]) {
    const { p, e } = projectOntoPlane(b, a1, a2);
    assert.ok(Math.abs(dot3(e, a1)) < 1e-12);
    assert.ok(Math.abs(dot3(e, a2)) < 1e-12);
    assert.ok(Math.abs(p.x + e.x - b.x) < 1e-12 && Math.abs(p.y + e.y - b.y) < 1e-12);
  }
});

test('n² + n + 41 is prime for n = 0..39 and fails first at n = 40', () => {
  for (let n = 0; n < 40; n++) assert.ok(isPrime(n * n + n + 41), `n = ${n}`);
  assert.equal(isPrime(40 * 40 + 40 + 41), false);
  assert.equal(40 * 40 + 40 + 41, 41 * 41);
});

test('naive fib(5) makes 15 calls over 6 distinct arguments', () => {
  const nodes = fibCallTree(5);
  assert.equal(nodes.length, 15);
  assert.equal(new Set(nodes.map((n) => n.arg)).size, 6);
});

test('binomial coefficients match Pascal', () => {
  assert.equal(binomial(8, 4), 70);
  for (let n = 1; n < 10; n++)
    for (let k = 1; k < n; k++) assert.equal(binomial(n, k), binomial(n - 1, k - 1) + binomial(n - 1, k));
});

test('momentum reaches closer to the minimum than plain descent on the M29 valley', () => {
  const start = { x: -1.1, z: 0.55 };
  const gd = descentPath(start, 0.06, 0.72, 1.2, 0, 18).at(-1)!;
  const mom = descentPath(start, 0.06, 0.72, 0.5, 0.6, 18).at(-1)!;
  assert.ok(Math.hypot(mom.x, mom.z) < Math.hypot(gd.x, gd.z));
  // Plain descent zigzags across the steep axis (sign flips every step).
  const zs = descentPath(start, 0.06, 0.72, 1.2, 0, 4).map((p) => Math.sign(p.z));
  assert.deepEqual(zs, [1, -1, 1, -1, 1]);
});
