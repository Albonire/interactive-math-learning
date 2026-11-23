import test from 'node:test';
import assert from 'node:assert/strict';
import type { SceneId } from '../core/types';
import {
  buildInitialShuffledOrder,
  checkDerivationOrder,
  checkSymbolicEquivalence,
  evaluateSymbolicExpression,
  SYMBOLIC_EXERCISES,
} from './symbolicEngine';
import { CODELAB_SPECS, evaluateCodeLabSubmission } from './codelabEngine';
import {
  computeDecayedMastery,
  createInitialBktMap,
  needsSpacedReview,
  updateBktSkill,
} from '../ai/bktEngine';
import { createInitialBanditState } from '../ai/contextualBandit';
import {
  createDefaultPersistedData,
  exportProgressJson,
  migratePersistedAiData,
  parseImportedProgressJson,
} from '../storage/localTelemetry';

const ALL_SCENES: SceneId[] = [
  'lin-span',
  'lin-svd',
  'lin-eigen',
  'lin-manifold',
  'calc-partials',
  'calc-autodiff',
  'calc-optimizers',
  'calc-symbolic',
];

test('evaluateSymbolicExpression handles precedence, unary minus, powers, functions, and division by zero', () => {
  const r1 = evaluateSymbolicExpression('2 + 3 * 4', {});
  assert.equal(r1.ok, true);
  if (r1.ok) assert.equal(r1.value, 14);

  const r2 = evaluateSymbolicExpression('-x^2 + 3*y', { x: 2, y: 5 });
  assert.equal(r2.ok, true);
  if (r2.ok) assert.equal(r2.value, 11);

  const r2b = evaluateSymbolicExpression('(-x)^2 + 2^-3', { x: 2 });
  assert.equal(r2b.ok, true);
  if (r2b.ok) assert.equal(r2b.value, 4.125);

  const r3 = evaluateSymbolicExpression('abs(-3.5) + sqrt(16)', {});
  assert.equal(r3.ok, true);
  if (r3.ok) assert.equal(r3.value, 7.5);

  const divZero = evaluateSymbolicExpression('10 / (x - 2)', { x: 2 });
  assert.equal(divZero.ok, false);

  const unknownVar = evaluateSymbolicExpression('x + z', { x: 1 });
  assert.equal(unknownVar.ok, false);
});

test('checkSymbolicEquivalence accepts equivalent algebra and produces numeric counterexample on mismatch', () => {
  const eq = checkSymbolicEquivalence('(b + a) * c', 'c * a + c * b', [
    { a: 1, b: 2, c: 3 },
    { a: -2, b: 4, c: 0.5 },
  ]);
  assert.equal(eq.equivalent, true);
  assert.equal(eq.counterexample, undefined);

  const wrong = checkSymbolicEquivalence('a * d + b * c', 'a * d - b * c', [
    { a: 2, b: 3, c: 1, d: 4 },
  ]);
  assert.equal(wrong.equivalent, false);
  assert.ok(wrong.counterexample);
  assert.equal(wrong.counterexample.expected, 5);
  assert.equal(wrong.counterexample.actual, 11);
});

test('checkDerivationOrder and buildInitialShuffledOrder validate step-by-step proofs for all 8 lessons', () => {
  for (const sceneId of ALL_SCENES) {
    const spec = SYMBOLIC_EXERCISES[sceneId];
    assert.ok(spec, `missing symbolic spec for ${sceneId}`);

    const shuffled = buildInitialShuffledOrder(spec.correctOrder, 42);
    assert.equal(shuffled.length, spec.correctOrder.length);
    assert.notDeepEqual(shuffled, spec.correctOrder, `${sceneId} initial shuffle should not be pre-solved`);

    const wrongRes = checkDerivationOrder(shuffled, spec.correctOrder);
    assert.equal(wrongRes.orderCorrect, false);

    const okRes = checkDerivationOrder(spec.correctOrder, spec.correctOrder);
    assert.equal(okRes.orderCorrect, true);
    assert.equal(okRes.matchedCount, spec.correctOrder.length);

    // Each lesson's targetExpression must be self-equivalent on its own sample inputs
    const selfEq = checkSymbolicEquivalence(
      spec.targetExpression,
      spec.targetExpression,
      spec.sampleInputs
    );
    assert.equal(selfEq.equivalent, true, `${sceneId} target expression must evaluate cleanly`);
  }
});

test('evaluateCodeLabSubmission passes all 8 lessons when assembled correctly and catches order or slot bugs', () => {
  for (const sceneId of ALL_SCENES) {
    const spec = CODELAB_SPECS[sceneId];
    assert.ok(spec, `missing codelab spec for ${sceneId}`);
    assert.ok(spec.blocks.length >= 3);
    assert.ok(spec.slots.length >= 1);

    const correctSlots: Record<string, string> = {};
    for (const s of spec.slots) {
      correctSlots[s.id] = s.correctOptionId;
    }

    const passRes = evaluateCodeLabSubmission(sceneId, spec.correctOrder, correctSlots);
    assert.equal(passRes.passedAll, true, `${sceneId} should pass all CodeLab tests when solved`);
    assert.equal(passRes.orderCorrect, true);
    assert.equal(passRes.slotsCorrect, true);
    assert.ok(passRes.tests.every((t) => t.passed));

    // Reversing order must fail
    const badOrder = [...spec.correctOrder].reverse();
    const failOrderRes = evaluateCodeLabSubmission(sceneId, badOrder, correctSlots);
    assert.equal(failOrderRes.passedAll, false, `${sceneId} reversed order must fail`);
    assert.equal(failOrderRes.orderCorrect, false);

    // Selecting a distractor slot option must fail
    const badSlots: Record<string, string> = { ...correctSlots };
    const firstSlot = spec.slots[0];
    const wrongOpt = firstSlot.options.find((o) => o.id !== firstSlot.correctOptionId);
    assert.ok(wrongOpt, `${sceneId} slot must have at least one distractor`);
    badSlots[firstSlot.id] = wrongOpt.id;

    const failSlotRes = evaluateCodeLabSubmission(sceneId, spec.correctOrder, badSlots);
    assert.equal(failSlotRes.passedAll, false, `${sceneId} wrong slot option must fail`);
    assert.equal(failSlotRes.slotsCorrect, false);
  }
});

test('BKT FSRS-lite mastery decay and spaced review detection work cleanly', () => {
  const initial = createInitialBktMap()['lin_span_rank'];
  const practicedAt = 1_700_000_000_000;
  const afterSuccess = updateBktSkill(initial, true, practicedAt);
  assert.ok(afterSuccess.pL > initial.pL);
  assert.equal(afterSuccess.lastPracticedAt, practicedAt);

  // Immediately after practice: no decay
  assert.equal(computeDecayedMastery(afterSuccess, practicedAt), afterSuccess.pL);
  assert.equal(needsSpacedReview(afterSuccess, practicedAt), false);

  // After 42 days without practice (two half-lives): mastery decays noticeably toward baseline
  const fortyTwoDaysLater = practicedAt + 42 * 86_400_000;
  const decayed = computeDecayedMastery(afterSuccess, fortyTwoDaysLater);
  assert.ok(decayed < afterSuccess.pL - 0.12);
  assert.equal(needsSpacedReview(afterSuccess, fortyTwoDaysLater), true);
});

test('localTelemetry migrates v2 payloads to v3 and round-trips JSON export/import cleanly', () => {
  const v2Payload = {
    version: 2,
    bkt: {
      lin_span_rank: {
        skillId: 'lin_span_rank',
        pL: 0.82,
        pT: 0.18,
        pG: 0.12,
        pS: 0.1,
        attempts: 4,
        successes: 4,
      },
    },
    bandit: createInitialBanditState(),
    lastErrorBySkill: { lin_span_rank: 0.05 },
    updatedAt: 1_700_000_000_000,
  };

  const migrated = migratePersistedAiData(v2Payload);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.bkt['lin_span_rank'].pL, 0.82);
  assert.ok(
    migrated.bkt['lin_span_rank'].halfLifeDays && migrated.bkt['lin_span_rank'].halfLifeDays > 0
  );
  assert.deepEqual(migrated.completedSymbolicScenes, []);
  assert.deepEqual(migrated.completedCodeLabScenes, []);

  // Round-trip export/import with completed workspaces and steps
  const rich = createDefaultPersistedData();
  rich.completedSymbolicScenes = ['lin-span', 'calc-partials'];
  rich.completedCodeLabScenes = ['lin-span'];
  const rawJson = exportProgressJson(rich, ['span-step-1', 'span-step-2']);
  const imported = parseImportedProgressJson(rawJson);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.deepEqual(imported.aiData.completedSymbolicScenes, ['lin-span', 'calc-partials']);
    assert.deepEqual(imported.aiData.completedCodeLabScenes, ['lin-span']);
    assert.deepEqual(imported.completedStepIds, ['span-step-1', 'span-step-2']);
  }

  // Invalid JSON fails gracefully
  const bad = parseImportedProgressJson('{ invalid json');
  assert.equal(bad.ok, false);
});
