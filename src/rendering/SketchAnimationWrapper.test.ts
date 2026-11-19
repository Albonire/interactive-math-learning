import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FirstDrawRegistry } from '../core/firstDrawRegistry';
import {
  Object3DSketchAnimator,
  computeSketchEntranceTransform,
} from './SketchAnimationWrapper';

test('computeSketchEntranceTransform transitions smoothly from 0 opacity and reduced scale to settled 1.0', () => {
  const before = computeSketchEntranceTransform(0, 800, 100);
  assert.equal(before.opacity, 0);
  assert.equal(before.scale, 0.72);
  assert.equal(before.done, false);

  const mid = computeSketchEntranceTransform(420, 800, 100);
  assert.ok(mid.opacity > 0.5 && mid.opacity < 1);
  assert.ok(mid.scale > 0.8 && mid.scale < 1);
  assert.ok(mid.drawProgress > 0.5 && mid.drawProgress < 1);
  assert.equal(mid.done, false);

  const end = computeSketchEntranceTransform(950, 800, 100);
  assert.equal(end.opacity, 1);
  assert.equal(end.scale, 1);
  assert.equal(end.drawProgress, 1);
  assert.equal(end.done, true);
});

test('Object3DSketchAnimator animates initial objects and dynamically revealed 3D objects only on first appearance', () => {
  const reg = new FirstDrawRegistry();
  const animator = new Object3DSketchAnimator(reg);

  const root = new THREE.Group();
  const structure = new THREE.Group();
  structure.userData.anatomyLayerId = 'structure';
  const errorLayer = new THREE.Group();
  errorLayer.userData.anatomyLayerId = 'error';

  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const collapseSheet = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial());
  collapseSheet.visible = false; // Hidden initially!

  structure.add(cube);
  errorLayer.add(collapseSheet);
  root.add(structure, errorLayer);

  // Frame at t=0: cube begins animating, hidden collapseSheet is NOT yet claimed
  const active0 = animator.updateObjectTree('lin-span', root, 1000, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active0, true);
  assert.equal(cube.userData._sketchOpacity, 0);
  assert.equal(collapseSheet.userData._sketchOpacity, undefined);

  // Frame at t=700: cube finished settling at 1.0
  const active1 = animator.updateObjectTree('lin-span', root, 1700, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active1, false);
  assert.equal(cube.userData._sketchOpacity, 1);
  assert.equal(cube.userData._sketchScale, 1);

  // Now collapseSheet becomes visible for the FIRST time at t=2000 -> smooth entrance starts!
  collapseSheet.visible = true;
  const active2 = animator.updateObjectTree('lin-span', root, 2000, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active2, true);
  assert.equal(collapseSheet.userData._sketchOpacity, 0);
  assert.equal(collapseSheet.userData._sketchScale, 0.72);

  // Mid-animation of collapseSheet at t=2300
  const active3 = animator.updateObjectTree('lin-span', root, 2300, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active3, true);
  assert.ok(collapseSheet.userData._sketchOpacity > 0.7);
  assert.ok(collapseSheet.userData._sketchScale > 0.9);

  // Finished at t=2700
  const active4 = animator.updateObjectTree('lin-span', root, 2700, {
    durationMs: 600,
    staggerByLayer: false,
  });
  assert.equal(active4, false);
  assert.equal(collapseSheet.userData._sketchOpacity, 1);
  assert.equal(collapseSheet.userData._sketchScale, 1);
});
