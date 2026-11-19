import test from 'node:test';
import assert from 'node:assert/strict';
import { generateChallengeForScene } from './challengeGenerator';
import { computeChallengeParamProximity } from './challengeProximity';

test('returns zero proximity when no Reto is active', () => {
  const res = computeChallengeParamProximity(null, { c1: 1.2, c2: 1.1, v3y: 1.0 }, {});
  assert.equal(res.overallProximity, 0);
  assert.equal(res.isOptimal, false);
  assert.deepEqual(res.paramIntensities, {});
  assert.equal(res.cueLabel, null);
});

test('lin-span collapse Reto warms up and reaches 1.0 optimal glow strictly on v3y', () => {
  const challenge = generateChallengeForScene('lin-span', 'lin_span_rank', 0, 101);
  // Far from collapse (v3y = 1.4)
  const far = computeChallengeParamProximity(challenge, { c1: 1.2, c2: 1.1, v3y: 1.4 }, {});
  assert.equal(far.isOptimal, false);
  assert.equal(far.overallProximity, 0);
  assert.equal(far.paramIntensities.v3y, 0);
  assert.equal(far.paramIntensities.c1, undefined);

  // Approaching coplanar collapse (v3y = 0.35 -> |det| ≈ 0.27)
  const close = computeChallengeParamProximity(challenge, { c1: 1.2, c2: 1.1, v3y: 0.35 }, {});
  assert.equal(close.isOptimal, false);
  assert.ok(close.overallProximity > 0.1 && close.overallProximity < 0.9);
  assert.equal(close.paramIntensities.v3y, close.overallProximity);

  // Optimal hit (v3y = 0.15 -> coplanar with v1 & v2, rank 2 collapse)
  const hit = computeChallengeParamProximity(challenge, { c1: 1.2, c2: 1.1, v3y: 0.15 }, {});
  assert.equal(hit.isOptimal, true);
  assert.equal(hit.overallProximity, 1.0);
  assert.equal(hit.paramIntensities.v3y, 1.0);
  assert.equal(hit.cueLabel, '✓ En zona óptima');
});

test('lin-svd Reto intensifies glow across matrix entries as det(A) approaches target', () => {
  const challenge = generateChallengeForScene('lin-svd', 'lin_det_collapse', 3, 202); // targetDet = -1.0
  const far = computeChallengeParamProximity(
    challenge,
    { a11: 1.5, a12: 0, a21: 0, a22: 1.0, a33: 1.0, svdStage: 3 },
    {}
  );
  assert.equal(far.overallProximity, 0);

  const warm = computeChallengeParamProximity(
    challenge,
    { a11: -0.6, a12: 0, a21: 0, a22: 1.0, a33: 1.0, svdStage: 3 },
    {}
  );
  assert.ok(warm.overallProximity > 0.3 && warm.overallProximity < 0.9);
  assert.equal(warm.paramIntensities.svdStage, undefined);

  const optimal = computeChallengeParamProximity(
    challenge,
    { a11: -1.0, a12: 0, a21: 0, a22: 1.0, a33: 1.0, svdStage: 3 },
    {}
  );
  assert.equal(optimal.isOptimal, true);
  assert.equal(optimal.overallProximity, 1.0);
  assert.equal(optimal.paramIntensities.a11, 1.0);
});

test('lin-manifold caps glow when activation is still linear', () => {
  const challenge = generateChallengeForScene('lin-manifold', 'lin_manifold_nonlin', 1, 303);
  const linearAttempt = computeChallengeParamProximity(
    challenge,
    { weight: 1.8, bias: 0, fold: 1.2 },
    { activation: 'linear', dataset: 'rings' }
  );
  assert.equal(linearAttempt.isOptimal, false);
  assert.ok(linearAttempt.overallProximity <= 0.2);

  const foldedAttempt = computeChallengeParamProximity(
    challenge,
    { weight: 2.0, bias: 0, fold: 1.2 },
    { activation: 'relu', dataset: 'rings' }
  );
  assert.equal(foldedAttempt.isOptimal, true);
  assert.equal(foldedAttempt.overallProximity, 1.0);
});
