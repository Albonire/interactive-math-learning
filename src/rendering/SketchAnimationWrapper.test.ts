import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FirstDrawRegistry } from '../core/firstDrawRegistry';
import {
  Object3DSketchAnimator,
  computeLineDrawRangeCount,
  computeProceduralStrokeTiming,
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

  // Mid-frame at t=1320: line has partially drawn vertices
  animator.updateObjectTree('lin-span', root, 1320, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.ok(line.geometry.drawRange.count >= 2 && line.geometry.drawRange.count < 6);

  // Frame at t=1900: settled cleanly at 1.0 and drawRange restored to Infinity
  const active1 = animator.updateObjectTree('lin-span', root, 1900, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active1, false);
  assert.equal(cube.userData._sketchOpacity, 1);
  assert.equal(cube.userData._sketchScale, 1);
  assert.equal(line.geometry.drawRange.count, Infinity);

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
