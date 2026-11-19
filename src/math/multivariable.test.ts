import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYMBOLIC_TARGETS,
  computeSurfaceMse,
  createInitialOptimizerProbes,
  evaluateAutoDiffDag,
  evaluateLossLandscape,
  evaluatePartialGradients,
  evaluatePartialSurface,
  stepOptimizerProbe,
} from './multivariable';

test('AutoDiff reverse pass gradients match central finite differences (< 1e-6 error)', () => {
  const eps = 1e-6;
  const testCases = [
    { x: 0.7, y: 0.5, w: 1.4 },
    { x: -1.1, y: 0.9, w: 2.3 },
    { x: 1.4, y: -0.6, w: 0.8 },
  ];

  for (const { x, y, w } of testCases) {
    const snap = evaluateAutoDiffDag(x, y, w, 'backward');
    const fxPlus = evaluateAutoDiffDag(x + eps, y, w).outputValue;
    const fxMinus = evaluateAutoDiffDag(x - eps, y, w).outputValue;
    const fyPlus = evaluateAutoDiffDag(x, y + eps, w).outputValue;
    const fyMinus = evaluateAutoDiffDag(x, y - eps, w).outputValue;

    const numDx = (fxPlus - fxMinus) / (2 * eps);
    const numDy = (fyPlus - fyMinus) / (2 * eps);

    assert.ok(Math.abs(snap.gradX - numDx) < 1e-6, `gradX mismatch: ${snap.gradX} vs ${numDx}`);
    assert.ok(Math.abs(snap.gradY - numDy) < 1e-6, `gradY mismatch: ${snap.gradY} vs ${numDy}`);
  }
});

test('partial surface analytic gradients match central finite differences (< 1e-6 error)', () => {
  const eps = 1e-6;
  const x = 0.65;
  const y = -0.45;
  const freq = 1.25;
  const { fx, fy } = evaluatePartialGradients(x, y, freq, 0.85);
  const numFx = (evaluatePartialSurface(x + eps, y, freq, 0.85) - evaluatePartialSurface(x - eps, y, freq, 0.85)) / (2 * eps);
  const numFy = (evaluatePartialSurface(x, y + eps, freq, 0.85) - evaluatePartialSurface(x, y - eps, freq, 0.85)) / (2 * eps);
  assert.ok(Math.abs(fx - numFx) < 1e-6);
  assert.ok(Math.abs(fy - numFy) < 1e-6);
});

test('SGD, Momentum, and Adam reduce loss on Rosenbrock landscape', () => {
  let probes = createInitialOptimizerProbes('rosenbrock');
  const initialLoss = evaluateLossLandscape(probes[2].x, probes[2].y, 'rosenbrock').loss;

  for (let i = 0; i < 60; i++) {
    probes = probes.map((p) => stepOptimizerProbe(p, 'rosenbrock', 0.05, 0.82));
  }

  const adamFinalLoss = evaluateLossLandscape(probes[2].x, probes[2].y, 'rosenbrock').loss;
  assert.equal(probes[2].diverged, false);
  assert.ok(adamFinalLoss < initialLoss * 0.25, `Expected Adam loss to drop: ${adamFinalLoss} vs ${initialLoss}`);
});

test('symbolic regression MSE equals zero when human weights match target exactly', () => {
  const tgt = SYMBOLIC_TARGETS[0].weights;
  const mseExact = computeSurfaceMse(tgt[0], tgt[1], tgt[2], tgt[3], tgt[4], tgt);
  assert.ok(mseExact < 1e-12);

  const mseOff = computeSurfaceMse(0, 0, 0, 0, 0, tgt);
  assert.ok(mseOff > 0.1);
});
