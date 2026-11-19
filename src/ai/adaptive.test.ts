import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialBktMap, updateBktSkill } from './bktEngine';
import {
  computeZdpReward,
  createInitialBanditState,
  selectBanditArm,
  updateBanditState,
} from './contextualBandit';
import { generateChallengeForScene, mulberry32 } from './challengeGenerator';
import { createDefaultPersistedData } from '../storage/localTelemetry';

test('BKT mastery updates monotonically on correct vs incorrect observations', () => {
  const initial = createInitialBktMap().lin_span_rank;
  const afterCorrect = updateBktSkill(initial, true);
  assert.ok(afterCorrect.pL > initial.pL, 'Correct attempt should increase P(L)');

  const highSkill = { ...initial, pL: 0.78 };
  const afterWrong = updateBktSkill(highSkill, false);
  assert.ok(afterWrong.pL < highSkill.pL, 'Incorrect attempt on high mastery should lower P(L)');
  assert.ok(afterWrong.pL > 0 && afterWrong.pL < 1);
});

test('LinUCB selects valid arms and updates pulls and preference after rewards', () => {
  let state = createInitialBanditState();
  const beginnerCtx = {
    mastery: 0.2,
    normalizedError: 0.8,
    erraticIndex: 0.6,
    normalizedTime: 0.5,
    layersOpenedRatio: 0.25,
  };
  const { arm } = selectBanditArm(state, beginnerCtx);
  assert.ok([0, 1, 2, 3].includes(arm));

  const reward = computeZdpReward(true, 0.08, 22000, 0.1);
  assert.ok(reward > 0.7 && reward <= 1.0);

  state = updateBanditState(state, arm, beginnerCtx, reward);
  assert.equal(state.arms[arm].pulls, 1);
});

test('mulberry32 PRNG and procedural challenge generation are deterministic', () => {
  const r1 = mulberry32(4242);
  const r2 = mulberry32(4242);
  for (let i = 0; i < 10; i++) {
    assert.equal(r1(), r2());
  }

  const c1 = generateChallengeForScene('lin-svd', 'lin_det_collapse', 1, 777);
  const c2 = generateChallengeForScene('lin-svd', 'lin_det_collapse', 1, 777);
  assert.equal(c1.prompt, c2.prompt);
  assert.deepEqual(c1.targetParams, c2.targetParams);
});

test('default local progress data initializes all 8 skills cleanly without external report bloat', () => {
  const data = createDefaultPersistedData();
  assert.equal(data.version, 2);
  assert.equal(Object.keys(data.bkt).length, 8);
  assert.equal(Object.keys(data.bandit.arms).length, 4);
  assert.deepEqual(data.lastErrorBySkill, {});
});
