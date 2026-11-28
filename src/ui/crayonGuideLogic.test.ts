import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRAYON_GUIDE_IDLE_MS,
  computeArrowheadPoints,
  computeGuideNibPose,
  computeOrbitGuideLayout,
  isInsideCenterFocalZone,
  sampleQuadBezier,
  sampleQuadBezierTangent,
} from './crayonGuideLogic';

test('Crayón Guía idle delay is exactly 5000ms (5 seconds)', () => {
  assert.equal(CRAYON_GUIDE_IDLE_MS, 5000);
});

test('sampleQuadBezier evaluates endpoints and midpoint accurately', () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 50, y: 40 };
  const p2 = { x: 100, y: 0 };

  assert.deepEqual(sampleQuadBezier(p0, p1, p2, 0), p0);
  assert.deepEqual(sampleQuadBezier(p0, p1, p2, 1), p2);

  const mid = sampleQuadBezier(p0, p1, p2, 0.5);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 20);
});

test('sampleQuadBezierTangent produces unit-length tangent vectors', () => {
  const tan = sampleQuadBezierTangent({ x: 10, y: 20 }, { x: 60, y: 5 }, { x: 120, y: 45 }, 0.7);
  const len = Math.hypot(tan.x, tan.y);
  assert.ok(Math.abs(len - 1) < 1e-6);
});

test('computeGuideNibPose tracks stroke progression and activates ringReady near tip', () => {
  const start = { x: 20, y: 120 };
  const ctrl = { x: 80, y: 145 };
  const tip = { x: 140, y: 120 };

  const early = computeGuideNibPose(start, ctrl, tip, 0.2);
  assert.equal(early.ringReady, false);
  assert.ok(early.x > start.x && early.x < tip.x);

  const end = computeGuideNibPose(start, ctrl, tip, 0.92);
  assert.equal(end.ringReady, true);
  assert.ok(Number.isFinite(end.angleDeg));
});

test('computeArrowheadPoints returns symmetric wings behind tip', () => {
  const { left, right } = computeArrowheadPoints({ x: 100, y: 50 }, { x: 1, y: 0 }, 10, 0.5);
  assert.ok(left.x < 100 && right.x < 100);
  assert.ok(Math.abs(left.x - right.x) < 1e-6);
  assert.ok(Math.abs((left.y + right.y) * 0.5 - 50) < 1e-6);
});

test('computeOrbitGuideLayout stays inside viewport bounds and never obstructs center 3D focal zone', () => {
  const viewports: Array<[number, number]> = [
    [280, 195],
    [420, 330],
    [620, 390],
  ];

  for (const [w, h] of viewports) {
    const layout = computeOrbitGuideLayout(w, h);
    const samples = [
      layout.arcStart,
      sampleQuadBezier(layout.arcStart, layout.arcCtrl, layout.arcEnd, 0.5),
      layout.arcEnd,
      layout.haloCenter,
      { x: layout.labelX, y: layout.labelY },
    ];

    for (const pt of samples) {
      assert.ok(pt.x >= 0 && pt.x <= w, `x=${pt.x} out of [0, ${w}]`);
      assert.ok(pt.y >= 0 && pt.y <= h, `y=${pt.y} out of [0, ${h}]`);
      assert.equal(
        isInsideCenterFocalZone(pt, w, h),
        false,
        `point (${pt.x.toFixed(1)}, ${pt.y.toFixed(1)}) intruded into center focal zone of ${w}x${h}`
      );
    }
  }
});
