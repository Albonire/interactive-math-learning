import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../core/curriculum';
import type { SceneId } from '../core/types';
import { computeExplodedCameraPose, computeExplodeVerticalSpan } from './explodeView';

test('every scene has 4 distinct exploded vertical tiers with generous architectural spacing', () => {
  const sceneIds = Object.keys(SCENES) as SceneId[];
  assert.equal(sceneIds.length, 8);

  for (const id of sceneIds) {
    const layers = SCENES[id].defaultLayers;
    assert.equal(layers.length, 4, `${id} should define 4 anatomy layers`);
    const uniqueY = new Set(layers.map((l) => l.explodeOffsetY));
    assert.equal(uniqueY.size, 4, `${id} layers must separate to 4 distinct vertical tiers`);

    const span = computeExplodeVerticalSpan(layers, true);
    assert.ok(
      span.span >= 3.0,
      `${id} exploded vertical span (${span.span}) should be >= 3.0 for unmistakable layer separation`
    );
  }
});

test('exploded camera pose pulls back and opens top-down angles cleanly', () => {
  const layers = SCENES['lin-eigen'].defaultLayers;
  const basePos = { x: 0.4, y: 4.8, z: 3.6 };
  const baseTarget = { x: 0, y: 0, z: 0 };

  const collapsed = computeExplodedCameraPose(basePos, baseTarget, false, layers);
  assert.deepEqual(collapsed.position, basePos);

  const exploded = computeExplodedCameraPose(basePos, baseTarget, true, layers);
  const baseDist = Math.hypot(basePos.x, basePos.y, basePos.z);
  const expDist = Math.hypot(
    exploded.position.x - exploded.target.x,
    exploded.position.y - exploded.target.y,
    exploded.position.z - exploded.target.z
  );
  assert.ok(expDist > baseDist * 1.18, 'exploded view must pull camera back to avoid clipping');

  // Top-down steep camera should flatten its elevation ratio so vertical layers separate clearly
  const baseSlope = basePos.y / Math.hypot(basePos.x, basePos.z);
  const expSlope =
    (exploded.position.y - exploded.target.y) /
    Math.hypot(exploded.position.x - exploded.target.x, exploded.position.z - exploded.target.z);
  assert.ok(expSlope < baseSlope, 'top-down camera should tilt closer to horizon when exploded');
});
