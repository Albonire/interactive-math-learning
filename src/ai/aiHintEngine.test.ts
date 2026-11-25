import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeUserInteractionsForAiHint,
  computeSceneObjectiveError,
  type ParamInteractionSample,
} from './aiHintEngine';
import { createInitialOptimizerProbes } from '../math/multivariable';

test('aiHintEngine detects optimizer divergence when learning rate is high or probe diverges', () => {
  const probes = createInitialOptimizerProbes('rosenbrock');
  probes[2] = { ...probes[2], diverged: true, stepCount: 12 };

  const hint = analyzeUserInteractionsForAiHint({
    sceneId: 'calc-optimizers',
    params: { lr: 0.3, beta: 0.9 },
    history: [],
    activeChallenge: null,
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: probes,
    optimizerRunning: true,
    autoDiffPass: 'idle',
    symbolicTargetIdx: 0,
  });

  assert.ok(hint !== null);
  assert.equal(hint.kind, 'divergence');
  assert.ok(hint.recommendedParams && hint.recommendedParams.lr < 0.1);
});

test('aiHintEngine detects stagnation on linear activation trap in lin-manifold', () => {
  const history: ParamInteractionSample[] = [
    { timestampMs: 1000, paramId: 'weight', value: 1.3, errorMetric: 0.92 },
    { timestampMs: 1200, paramId: 'fold', value: 1.5, errorMetric: 0.92 },
    { timestampMs: 1400, paramId: 'bias', value: 0.4, errorMetric: 0.92 },
  ];

  const hint = analyzeUserInteractionsForAiHint({
    sceneId: 'lin-manifold',
    params: { weight: 1.3, bias: 0.4, fold: 1.5 },
    history,
    activeChallenge: null,
    activation: 'linear',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: [],
    optimizerRunning: false,
    autoDiffPass: 'idle',
    symbolicTargetIdx: 0,
  });

  assert.ok(hint !== null);
  assert.equal(hint.kind, 'stagnation');
  assert.equal(hint.recommendedActivation, 'tanh');
});

test('aiHintEngine detects oscillating stagnation and trajectory divergence in calc-symbolic', () => {
  // Oscillating back and forth without reducing error -> stagnation
  const stagnantHistory: ParamInteractionSample[] = [
    { timestampMs: 100, paramId: 'wSin', value: 0.2, errorMetric: 0.62 },
    { timestampMs: 200, paramId: 'wSin', value: 0.3, errorMetric: 0.61 },
    { timestampMs: 300, paramId: 'wSin', value: 0.15, errorMetric: 0.63 },
    { timestampMs: 400, paramId: 'wSin', value: 0.28, errorMetric: 0.61 },
    { timestampMs: 500, paramId: 'wSin', value: 0.18, errorMetric: 0.62 },
    { timestampMs: 600, paramId: 'wSin', value: 0.25, errorMetric: 0.61 },
  ];

  const stag = analyzeUserInteractionsForAiHint({
    sceneId: 'calc-symbolic',
    params: { wSin: 0.25, wCos: 0, wQuad: 0, wCross: 0, wGauss: 0 },
    history: stagnantHistory,
    activeChallenge: null,
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: [],
    optimizerRunning: false,
    autoDiffPass: 'idle',
    symbolicTargetIdx: 0,
  });

  assert.ok(stag !== null);
  assert.equal(stag.kind, 'stagnation');
  assert.ok(stag.recommendedParams && Object.keys(stag.recommendedParams).length >= 1);

  // Monotonically worsening error -> divergence
  const divHistory: ParamInteractionSample[] = [
    { timestampMs: 100, paramId: 'wQuad', value: 0.1, errorMetric: 0.22 },
    { timestampMs: 200, paramId: 'wQuad', value: 0.5, errorMetric: 0.36 },
    { timestampMs: 300, paramId: 'wQuad', value: 0.9, errorMetric: 0.55 },
    { timestampMs: 400, paramId: 'wQuad', value: 1.3, errorMetric: 0.81 },
  ];

  const div = analyzeUserInteractionsForAiHint({
    sceneId: 'calc-symbolic',
    params: { wSin: 0.8, wCos: 0, wQuad: 1.3, wCross: 0, wGauss: 0 },
    history: divHistory,
    activeChallenge: null,
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: [],
    optimizerRunning: false,
    autoDiffPass: 'idle',
    symbolicTargetIdx: 0,
  });

  assert.ok(div !== null);
  assert.equal(div.kind, 'divergence');
});

test('aiHintEngine stays silent during healthy converging progress unless forceAdvice is requested', () => {
  const improvingHistory: ParamInteractionSample[] = [
    { timestampMs: 100, paramId: 'wSin', value: 0.2, errorMetric: 0.72 },
    { timestampMs: 200, paramId: 'wSin', value: 0.5, errorMetric: 0.45 },
    { timestampMs: 300, paramId: 'wSin', value: 0.75, errorMetric: 0.22 },
    { timestampMs: 400, paramId: 'wSin', value: 0.95, errorMetric: 0.08 },
    { timestampMs: 500, paramId: 'wSin', value: 1.0, errorMetric: 0.02 },
  ];

  const silent = analyzeUserInteractionsForAiHint({
    sceneId: 'calc-symbolic',
    params: { wSin: 1.0, wCos: 0, wQuad: 0, wCross: 0, wGauss: 0 },
    history: improvingHistory,
    activeChallenge: null,
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: [],
    optimizerRunning: false,
    autoDiffPass: 'idle',
    symbolicTargetIdx: 0,
  });
  assert.equal(silent, null);

  const onDemand = analyzeUserInteractionsForAiHint({
    sceneId: 'calc-symbolic',
    params: { wSin: 0.5, wCos: 0, wQuad: 0, wCross: 0, wGauss: 0 },
    history: [],
    activeChallenge: null,
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: [],
    optimizerRunning: false,
    autoDiffPass: 'idle',
    symbolicTargetIdx: 0,
    forceAdvice: true,
  });
  assert.ok(onDemand !== null && onDemand.kind === 'guidance');

  const err = computeSceneObjectiveError('lin-span', { c1: 1.2, c2: 1.1, v3y: 1.0 }, {
    activeChallenge: null,
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    optimizerProbes: [],
    symbolicTargetIdx: 0,
  });
  assert.ok(Number.isFinite(err) && err >= 0);
});
