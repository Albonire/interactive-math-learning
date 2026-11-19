import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FirstDrawRegistry,
  computeLabelRevealFactor,
  computeLayerDrawProgress,
  getAnatomyLayerDrawOrder,
} from './firstDrawRegistry';

test('FirstDrawRegistry claims each visual key exactly once until cleared', () => {
  const reg = new FirstDrawRegistry();
  assert.equal(reg.hasBeenDrawn('scene:lin-span'), false);
  assert.equal(reg.claimFirstDraw('scene:lin-span'), true);
  assert.equal(reg.hasBeenDrawn('scene:lin-span'), true);
  assert.equal(reg.claimFirstDraw('scene:lin-span'), false);

  // Distinct visuals animate independently
  assert.equal(reg.claimFirstDraw('graph:autodiff-dag'), true);
  assert.equal(reg.claimFirstDraw('graph:curriculum-dag'), true);
  assert.equal(reg.count(), 3);

  reg.clear('scene:lin-span');
  assert.equal(reg.claimFirstDraw('scene:lin-span'), true);
});

test('Anatomy layer draw ordering stages substrate before structure, operator, and invariants', () => {
  const oSub = getAnatomyLayerDrawOrder('substrate');
  const oStruct = getAnatomyLayerDrawOrder('structure');
  const oOp = getAnatomyLayerDrawOrder('operator');
  const oInv = getAnatomyLayerDrawOrder('invariant');

  assert.ok(oSub < oStruct);
  assert.ok(oStruct < oOp);
  assert.ok(oOp < oInv);

  // At global progress 0.25, substrate is well underway while invariant hasn't started yet
  const pSub = computeLayerDrawProgress(0.25, oSub);
  const pInv = computeLayerDrawProgress(0.25, oInv);
  assert.ok(pSub > 0.35);
  assert.equal(pInv, 0);

  // At global progress 1.0, every layer reaches exactly 1.0
  assert.equal(computeLayerDrawProgress(1.0, oSub), 1);
  assert.equal(computeLayerDrawProgress(1.0, oStruct), 1);
  assert.equal(computeLayerDrawProgress(1.0, oOp), 1);
  assert.equal(computeLayerDrawProgress(1.0, oInv), 1);
});

test('3D crayon labels stay hidden early and reveal smoothly during the final sketch phase', () => {
  assert.equal(computeLabelRevealFactor(0.0), 0);
  assert.equal(computeLabelRevealFactor(0.5), 0);
  const mid = computeLabelRevealFactor(0.81);
  assert.ok(mid > 0.3 && mid < 0.7);
  assert.equal(computeLabelRevealFactor(1.0), 1);
});
