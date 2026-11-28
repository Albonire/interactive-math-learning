import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_MODULES_LIST } from '../core/studyPlan';
import { buildHand3DScene, projectVec3, rotateVec3 } from './hand3dMath';

test('rotateVec3 preserves Euclidean vector length under arbitrary yaw and pitch', () => {
  const v = { x: 1.2, y: -0.7, z: 0.9 };
  const r = rotateVec3(v, 0.85, -0.42);
  const lenBefore = Math.hypot(v.x, v.y, v.z);
  const lenAfter = Math.hypot(r.x, r.y, r.z);
  assert.ok(Math.abs(lenBefore - lenAfter) < 1e-9);
});

test('projectVec3 produces finite screen coordinates with positive perspective scale', () => {
  const pt = projectVec3({ x: 0.5, y: 0.4, z: -0.3 }, 0.6, 0.35, 420, 320);
  assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
  assert.ok(pt.scale > 0);
});

test('buildHand3DScene generates valid non-empty 3D geometry for all 32 modules across scroll 0..1', () => {
  for (const mod of STUDY_MODULES_LIST) {
    for (const p of [0, 0.5, 1]) {
      const scene = buildHand3DScene(mod.id, p);
      assert.ok(scene.title.length > 0, `${mod.id} missing 3D title`);
      assert.ok(
        scene.lines.length + scene.polys.length > 0,
        `${mod.id} should have 3D lines or polygons`
      );
      for (const l of scene.lines) {
        assert.ok(Number.isFinite(l.a.x) && Number.isFinite(l.b.z));
      }
    }
  }
});

test('no study module falls back to the generic placeholder sculpture', () => {
  for (const mod of STUDY_MODULES_LIST) {
    const scene = buildHand3DScene(mod.id, 0.5);
    assert.ok(!scene.title.startsWith('Escultura geométrica'), `${mod.id} still uses the placeholder`);
  }
});

test('modules that share a topic area still get their own scene', () => {
  const titles = (ids: Array<'M20' | 'M21' | 'M22' | 'M23' | 'M25' | 'M26' | 'M27'>) =>
    new Set(ids.map((id) => buildHand3DScene(id, 0.5).title));
  assert.equal(titles(['M20', 'M21']).size, 2);
  assert.equal(titles(['M22', 'M23']).size, 2);
  assert.equal(titles(['M25', 'M26', 'M27']).size, 3);
});
