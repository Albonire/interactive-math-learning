import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FirstDrawRegistry } from '../core/firstDrawRegistry';
import {
  Object3DSketchAnimator,
  computeContourFillPhases,
  computeLineDrawRangeCount,
  computeProceduralStrokeTiming,
  computeSegmentedStrokeTip,
  computeSketchEntranceTransform,
} from './SketchAnimationWrapper';

test('computeSketchEntranceTransform transitions smoothly from 0 opacity and reduced scale to settled 1.0', () => {
  const before = computeSketchEntranceTransform(0, 800, 100);
  assert.equal(before.opacity, 0);
  assert.equal(before.scale, 0.72);
  assert.equal(before.done, false);

  const mid = computeSketchEntranceTransform(500, 800, 100);
  assert.ok(mid.opacity > 0.5 && mid.opacity < 1);
  assert.ok(mid.scale > 0.8 && mid.scale < 1);
  assert.ok(mid.drawProgress >= 0.45 && mid.drawProgress <= 0.55);
  assert.equal(mid.done, false);

  const end = computeSketchEntranceTransform(950, 800, 100);
  assert.equal(end.opacity, 1);
  assert.equal(end.scale, 1);
  assert.equal(end.drawProgress, 1);
  assert.equal(end.done, true);
});

test('computeContourFillPhases traces perimeter contour before sweeping wax interior fill', () => {
  const start = computeContourFillPhases(0);
  assert.equal(start.contourPhase, 0);
  assert.equal(start.fillPhase, 0);

  const early = computeContourFillPhases(0.22);
  assert.ok(early.contourPhase > 0.5, 'contour leads early');
  assert.equal(early.fillPhase, 0, 'interior fill waits until contour establishes');

  const mid = computeContourFillPhases(0.6);
  assert.equal(mid.contourPhase, 1);
  assert.ok(mid.fillPhase > 0.25 && mid.fillPhase < 0.75);

  const end = computeContourFillPhases(1);
  assert.equal(end.contourPhase, 1);
  assert.equal(end.fillPhase, 1);
});

test('computeSegmentedStrokeTip smoothly interpolates the moving crayon nib tip across segments', () => {
  // Single segment from (0,0,0) -> (10,0,0)
  const single = new Float32Array([0, 0, 0, 10, 0, 0]);
  const mid = computeSegmentedStrokeTip(single, 0.5, false);
  assert.equal(mid.drawVertexCount, 2);
  assert.ok(mid.tipLocalPos);
  assert.ok(Math.abs(mid.tipLocalPos[0] - 5) < 1e-4);
  assert.equal(mid.activeSegmentIndex, 0);

  // Two disjoint LineSegments: (0,0,0)->(4,0,0) and (0,2,0)->(4,2,0)
  const segs = new Float32Array([0, 0, 0, 4, 0, 0, 0, 2, 0, 4, 2, 0]);
  const q1 = computeSegmentedStrokeTip(segs, 0.25, true);
  assert.equal(q1.drawVertexCount, 2);
  assert.equal(q1.activeSegmentIndex, 0);
  assert.ok(q1.tipLocalPos && Math.abs(q1.tipLocalPos[0] - 2) < 1e-4);

  const q3 = computeSegmentedStrokeTip(segs, 0.75, true);
  assert.equal(q3.drawVertexCount, 4);
  assert.equal(q3.activeSegmentIndex, 1);
  assert.ok(q3.tipLocalPos && Math.abs(q3.tipLocalPos[0] - 2) < 1e-4 && Math.abs(q3.tipLocalPos[1] - 2) < 1e-4);
});

test('computeProceduralStrokeTiming stages layers and individual elements sequentially', () => {
  const sub0 = computeProceduralStrokeTiming({
    layerId: 'substrate',
    indexInLayer: 0,
    isSprite: false,
    isLine: true,
    baseDurationMs: 1160,
    staggerByLayer: true,
    isDynamicReveal: false,
  });
  const struct0 = computeProceduralStrokeTiming({
    layerId: 'structure',
    indexInLayer: 0,
    isSprite: false,
    isLine: false,
    baseDurationMs: 1160,
    staggerByLayer: true,
    isDynamicReveal: false,
  });
  const op0 = computeProceduralStrokeTiming({
    layerId: 'operator',
    indexInLayer: 0,
    isSprite: false,
    isLine: true,
    baseDurationMs: 1160,
    staggerByLayer: true,
    isDynamicReveal: false,
  });
  const op1 = computeProceduralStrokeTiming({
    layerId: 'operator',
    indexInLayer: 1,
    isSprite: false,
    isLine: true,
    baseDurationMs: 1160,
    staggerByLayer: true,
    isDynamicReveal: false,
  });
  const label0 = computeProceduralStrokeTiming({
    layerId: 'operator',
    indexInLayer: 0,
    isSprite: true,
    isLine: false,
    baseDurationMs: 1160,
    staggerByLayer: true,
    isDynamicReveal: false,
  });

  assert.equal(sub0.delayMs, 0);
  assert.ok(struct0.delayMs > sub0.delayMs);
  assert.ok(op0.delayMs > struct0.delayMs);
  assert.ok(op1.delayMs > op0.delayMs, 'individual elements inside the same layer stagger stroke by stroke');
  assert.ok(label0.delayMs > op0.delayMs, '3D labels appear after geometry');
});

test('computeLineDrawRangeCount advances vertex-by-vertex for Line and pair-by-pair for LineSegments', () => {
  assert.equal(computeLineDrawRangeCount(20, 0, false), 0);
  assert.equal(computeLineDrawRangeCount(20, 0.5, false), 10);
  assert.equal(computeLineDrawRangeCount(20, 1, false), 20);

  // LineSegments always returns an even vertex count so segments never break mid-pair
  const midSegs = computeLineDrawRangeCount(20, 0.35, true);
  assert.equal(midSegs % 2, 0);
  assert.ok(midSegs >= 6 && midSegs <= 10);
  assert.equal(computeLineDrawRangeCount(20, 1, true), 20);
});

test('Object3DSketchAnimator drives progressive line drawRange, stroke callbacks, dynamic reveals, and replayScene', () => {
  const reg = new FirstDrawRegistry();
  const animator = new Object3DSketchAnimator(reg);

  const root = new THREE.Group();
  const structure = new THREE.Group();
  structure.userData.anatomyLayerId = 'structure';
  const errorLayer = new THREE.Group();
  errorLayer.userData.anatomyLayerId = 'error';

  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(2, 1, 0),
    new THREE.Vector3(2, 2, 0),
    new THREE.Vector3(3, 2, 0),
  ]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial());
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const collapseSheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
  collapseSheet.visible = false;

  structure.add(line, cube);
  errorLayer.add(collapseSheet);
  root.add(structure, errorLayer);

  const milestones: string[] = [];

  // Frame at t=1000: line + cube begin animating, hidden collapseSheet is NOT yet claimed
  const active0 = animator.updateObjectTree('lin-span', root, 1000, {
    durationMs: 600,
    staggerByLayer: false,
    onStrokeStart: (ev) => milestones.push(`${ev.layerId}:${ev.isLine ? 'line' : 'mesh'}`),
  });
  assert.equal(active0, true);
  assert.equal(cube.userData._sketchOpacity, 0);
  assert.equal(line.geometry.drawRange.count, 0);
  assert.equal(collapseSheet.userData._sketchOpacity, undefined);
  assert.equal(milestones.length, 2);

  // Mid-frame at t=1320: line has partially drawn vertices and reports an active 3D stroke tip
  animator.updateObjectTree('lin-span', root, 1320, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.ok(line.geometry.drawRange.count >= 2 && line.geometry.drawRange.count < 6);
  const tip = animator.getActiveStrokeTip();
  assert.ok(tip && tip.active, 'active stroke tip tracks moving crayon nib mid-draw');

  // Frame at t=1900: settled cleanly at 1.0 and drawRange restored to Infinity
  const active1 = animator.updateObjectTree('lin-span', root, 1900, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active1, false);
  assert.equal(cube.userData._sketchOpacity, 1);
  assert.equal(cube.userData._sketchScale, 1);
  assert.equal(line.geometry.drawRange.count, Infinity);
  assert.equal(animator.getActiveStrokeTip(), null);

  // Dynamic reveal of collapseSheet at t=2000
  collapseSheet.visible = true;
  const active2 = animator.updateObjectTree('lin-span', root, 2000, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active2, true);
  assert.equal(collapseSheet.userData._sketchOpacity, 0);

  // Replay clears claims and starts procedural sketch over from 0
  animator.replayScene('lin-span', root);
  const replayed = animator.updateObjectTree('lin-span', root, 3000, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(replayed, true);
  assert.equal(cube.userData._sketchOpacity, 0);
  assert.equal(line.geometry.drawRange.count, 0);
});

test('Object3DSketchAnimator setPaused freezes progress without jump on resume, completeScene settles, replayLayer isolates one layer', () => {
  const reg = new FirstDrawRegistry();
  const animator = new Object3DSketchAnimator(reg);

  const root = new THREE.Group();
  const substrate = new THREE.Group();
  substrate.userData.anatomyLayerId = 'substrate';
  const operator = new THREE.Group();
  operator.userData.anatomyLayerId = 'operator';

  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4, 0, 0),
    ]),
    new THREE.LineBasicMaterial()
  );
  const vec = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 3, 0),
    ]),
    new THREE.LineBasicMaterial()
  );
  substrate.add(axis);
  operator.add(vec);
  root.add(substrate, operator);

  animator.updateObjectTree('lin-span', root, 1000, { durationMs: 1000, staggerByLayer: false });
  animator.updateObjectTree('lin-span', root, 1400, { durationMs: 1000, staggerByLayer: false });
  const drawBeforePause = vec.userData._sketchDraw as number;
  assert.ok(drawBeforePause > 0.1 && drawBeforePause < 0.9);

  // Pause at t=1400, advance wall clock by 5000ms while paused -> progress stays frozen
  animator.setPaused(true, 1400);
  assert.equal(animator.isPaused(), true);
  animator.updateObjectTree('lin-span', root, 6400, { durationMs: 1000, staggerByLayer: false });
  assert.equal(vec.userData._sketchDraw, drawBeforePause);

  // Resume at t=6400 -> at t=6400 progress has not jumped forward
  animator.setPaused(false, 6400);
  assert.equal(animator.isPaused(), false);
  animator.updateObjectTree('lin-span', root, 6400, { durationMs: 1000, staggerByLayer: false });
  assert.ok(Math.abs((vec.userData._sketchDraw as number) - drawBeforePause) < 0.02);

  // completeScene immediately settles everything to 1.0
  animator.completeScene('lin-span', root);
  assert.equal(axis.userData._sketchDraw, 1);
  assert.equal(vec.userData._sketchDraw, 1);
  assert.equal(animator.getActiveStrokeTip(), null);

  // replayLayer only resets 'operator', keeping 'substrate' settled
  animator.replayLayer('lin-span', root, 'operator');
  animator.updateObjectTree('lin-span', root, 7000, { durationMs: 600, staggerByLayer: false });
  assert.equal(axis.userData._sketchDraw, 1, 'substrate remains untouched');
  assert.ok((vec.userData._sketchDraw as number) < 0.1, 'operator restarts trace from beginning');
});
