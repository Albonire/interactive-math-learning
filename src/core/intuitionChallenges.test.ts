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
