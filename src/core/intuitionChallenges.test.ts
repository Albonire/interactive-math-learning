import test from 'node:test';
import assert from 'node:assert/strict';
import { INTUITION_CHALLENGES } from './intuitionChallenges';

const step = (id: keyof typeof INTUITION_CHALLENGES, i: number) => INTUITION_CHALLENGES[id]![i];

test('every challenge step has a prompt, a hint and an insight', () => {
  for (const [id, steps] of Object.entries(INTUITION_CHALLENGES)) {
    assert.ok(steps && steps.length > 0, id);
    for (const s of steps!) {
      assert.ok(s.prompt.length > 20 && s.hint.length > 10 && s.insight.length > 20, `${id}: ${s.prompt}`);
    }
  }
});

test('challenges do not start solved from the visuals initial states', () => {
  // Initial states as written in the visuals (after making them start unsolved).
  assert.equal(step('M2', 0).check({ tab: 'areas', a: 3, b: 2 }), false);
  assert.equal(step('M3', 0).check({ tab: 'mapping', isFunction: false, isInjective: false, isSurjective: false }), false);
  assert.equal(step('M13', 0).check({ kind: 'cont', eps: 0.8, delta: 0.5, insideBand: true }), false);
  assert.equal(step('M15', 0).check({ exact: 0.15 * 2.2 ** 3 + 0.4 * 2.2 }), false);
  assert.equal(step('M19', 0).check({ x: 0, y: 0, solved: false }), false);
  assert.equal(step('M24', 0).check({ prevalence: 5, posterior: 0.333 }), false);
  assert.equal(step('M31', 0).check({ p1: 0.7, q1: 0.5, kl: 0.119 }), false);
});

test('challenge targets are reachable with the controls the visuals offer', () => {
  // M15: F(b) = 0.15 b³ + 0.4 b equals 2 at b = 2.0, which the 0.1-step handle can reach.
  assert.equal(step('M15', 0).check({ exact: 0.15 * 8 + 0.4 * 2 }), true);
  // M24 step 2: prevalence 2 %, sensitivity 99 %, false positives 1 % gives P(E|+) ≈ 0.67.
  const prior = 0.02;
  const post = (prior * 0.99) / (prior * 0.99 + (1 - prior) * 0.01);
  assert.ok(post > 0.5);
  assert.equal(step('M24', 1).check({ prevalence: 2, posterior: post }), true);
  // M31 step 2: p = 0.95, q = 0.05 costs about 3.8 bits extra.
  const kl = 0.95 * Math.log2(0.95 / 0.05) + 0.05 * Math.log2(0.05 / 0.95);
  assert.ok(kl > 2);
  // M10 step 2: n − 1 is its own inverse.
  for (const n of [5, 8, 12]) assert.equal(((n - 1) * (n - 1)) % n, 1);
});

test('phase 1 challenges (M1, M4, M5) do not start solved', () => {
  const m1 = { tab: 'bases', decimal: 173, base: 2 };
  INTUITION_CHALLENGES.M1!.forEach((st) => assert.equal(st.check(m1), false));
  const m4 = { tab: 'trig', deg: 57 };
  INTUITION_CHALLENGES.M4!.forEach((st) => assert.equal(st.check(m4), false));
  // M5 initial grid: every x has some y (true) but no single y covers all x (false).
  const m5 = { tab: 'truth', p: false, q: true, forallXexistsY: true, existsYforallX: false };
  INTUITION_CHALLENGES.M5!.forEach((st) => assert.equal(st.check(m5), false));
  assert.equal(step('M5', 1).check({ ...m5, tab: 'quantifiers' }), false);
  assert.equal(step('M5', 2).check({ ...m5, tab: 'quantifiers' }), false);
});

test('phase 1 challenge targets are reachable and correct', () => {
  // 100 is reachable with bits only, and the insight's decomposition is right.
  assert.equal(64 + 32 + 4, 100);
  assert.equal((100).toString(2).padStart(8, '0'), '01100100');
  assert.equal((45).toString(16).toUpperCase(), '2D');
  assert.equal(step('M1', 2).check({ tab: 'bases', decimal: 45, base: 16 }), true);
  // sin = cos exactly at 45° and 225°.
  for (const d of [45, 225]) {
    const r = (d * Math.PI) / 180;
    assert.ok(Math.abs(Math.sin(r) - Math.cos(r)) < 1e-12);
    assert.equal(step('M4', 0).check({ tab: 'trig', deg: d }), true);
  }
  assert.equal(step('M4', 2).check({ tab: 'trig', deg: 300 }), true);
  assert.ok(Math.sin((300 * Math.PI) / 180) < 0 && Math.cos((300 * Math.PI) / 180) > 0);
  assert.equal(step('M5', 0).check({ tab: 'truth', p: true, q: false }), true);
});

test('the 14 new challenges do not start solved from the visuals initial states', () => {
  const none = (id: keyof typeof INTUITION_CHALLENGES, st: Record<string, unknown>) =>
    INTUITION_CHALLENGES[id]!.forEach((c, i) => assert.equal(c.check(st), false, `${id} step ${i}`));
  none('M6', { tab: 'flow', claim: 'euler', n: 1, holds: true });
  none('M7', { tab: 'domino', baseOk: true, stepOk: true, pushed: true });
  none('M9', { tab: 'stair', nStair: 5 });
  none('M11', { tab: 'pascal', value: 6, pigeons: 7, holes: 5 });
  none('M14', { tab: 'secant', x0: 0.8, h: 0.9 });
  none('M18', { det: 1.4 * 1.1 - 0.5 * 0.2 });
  none('M20', { m: 4, n: 5, r: 2 });
  none('M21', { sse: 0.58 });
  none('M23', { k: 2, energy: 97.2 });
  none('M25', { dist: 'binom', n: 10, p: 0.4 });
  none('M26', { source: 'skewed', sampleN: 12 });
  none('M27', { tab: 'bayes', heads: 7, tails: 3, mle: 0.7, map: 9 / 14 });
  none('M28', { loss: 0.5 * (1.5 * 2 + 0.5 - 5) ** 2 });
  none('M30', { tab: 'softmax', scaleZ: 100, naiveBroken: false });
});

test('the 14 new challenge targets are reachable and their insights are right', () => {
  const isPrime = (v: number) => { if (v < 2) return false; for (let d = 2; d * d <= v; d++) if (v % d === 0) return false; return true; };
  assert.equal(isPrime(40 * 40 + 40 + 41), false);
  assert.equal(2 ** 11 - 1, 23 * 89);
  for (const p of [2, 3, 5, 7]) assert.ok(isPrime(2 ** p - 1));
  assert.equal(step('M6', 1).check({ tab: 'counter', claim: 'mersenne', n: 11, holds: false }), true);
  assert.equal(step('M6', 1).check({ tab: 'counter', claim: 'mersenne', n: 4, holds: false }), false, 'n = 4 is not prime');
  assert.equal((7 * 8) / 2, 28);
  assert.equal(step('M11', 1).check({ tab: 'pigeon', pigeons: 11, holes: 5 }), true);
  // M14: f'(x) = x² − 1 vanishes at ±1, reachable with the 0.1 step.
  assert.equal(step('M14', 1).check({ tab: 'secant', x0: -1, h: 0.5 }), true);
  // M21: the OLS line for the visual's points has SSE ≈ 0.098 < 0.12.
  const pts = [[1, 1.4], [2, 1.9], [3, 3.1], [4, 3.6]];
  const sse = pts.reduce((a, [x, y]) => a + (y - (0.78 * x + 0.55)) ** 2, 0);
  assert.ok(Math.abs(sse - 0.098) < 1e-9 && sse < 0.12);
  // M23: energies with σ = 12, 5.2, 2.1, 0.7, 0.2, 0.05.
  const sig = [12, 5.2, 2.1, 0.7, 0.2, 0.05];
  const tot = sig.reduce((a, v) => a + v * v, 0);
  const kept = (k: number) => (sig.slice(0, k).reduce((a, v) => a + v * v, 0) / tot) * 100;
  assert.ok(kept(2) < 99.5 && kept(3) >= 99.5);
  // M27: prior Beta(1,1) gives MAP = MLE; Beta(1,8) pulls MAP below 0.5 with the same data.
  const map = (a0: number, b0: number) => (a0 + 7 - 1) / (a0 + b0 + 10 - 2);
  assert.equal(map(1, 1), 0.7);
  assert.ok(map(1, 8) < 0.5);
  // M30: logits [z, z+1, z+2] overflow first at z = 710 on the 10-step slider.
  assert.ok(Number.isFinite(Math.exp(702)) && !Number.isFinite(Math.exp(712)));
  assert.equal(step('M30', 0).check({ tab: 'softmax', scaleZ: 710, naiveBroken: true }), true);
  assert.equal(step('M25', 1).check({ dist: 'binom', n: 16, p: 0.7500000001 }), true);
});
