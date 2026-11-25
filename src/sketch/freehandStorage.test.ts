import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_STROKES_PER_SCENE,
  appendCompletedStroke,
  appendFreehandPoint,
  createFreehandStroke,
  deserializeFreehandStore,
  getBrushRadiusPx,
  serializeFreehandStore,
  undoLastFreehandStroke,
  type FreehandStoreMap,
  type FreehandStroke,
} from './freehandStorage';

test('appendFreehandPoint filters micro-jitter duplicates and clamps coordinates to [0, 1]', () => {
  const s = createFreehandStroke('crayon', 'cobalt', 'medium', { nx: 0.25, ny: 0.4, p: 0.8 }, 1000);
  // Almost identical point should be dropped
  const afterTiny = appendFreehandPoint(s.points, { nx: 0.2505, ny: 0.4004, p: 0.8 });
  assert.equal(afterTiny.length, 1);

  // Distinct point gets appended and out-of-bounds values clamp cleanly
  const afterMove = appendFreehandPoint(afterTiny, { nx: 1.4, ny: -0.2, p: 2.0 });
  assert.equal(afterMove.length, 2);
  assert.equal(afterMove[1].nx, 1);
  assert.equal(afterMove[1].ny, 0);
  assert.equal(afterMove[1].p, 1);
});

test('serializeFreehandStore and deserializeFreehandStore round-trip strokes and discard invalid data', () => {
  const stroke1 = createFreehandStroke('crayon', 'vermilion', 'bold', { nx: 0.1, ny: 0.2, p: 0.7 }, 100);
  stroke1.points = appendFreehandPoint(stroke1.points, { nx: 0.45, ny: 0.55, p: 0.9 });
  const eraser = createFreehandStroke('eraser', 'graphite', 'medium', { nx: 0.3, ny: 0.3, p: 0.6 }, 200);

  const store: FreehandStoreMap = {
    'lin-span': [stroke1, eraser],
  };

  const json = serializeFreehandStore(store);
  const restored = deserializeFreehandStore(json);

  assert.equal(restored['lin-span']?.length, 2);
  assert.equal(restored['lin-span']?.[0].crayon, 'vermilion');
  assert.equal(restored['lin-span']?.[0].points.length, 2);
  assert.equal(restored['lin-span']?.[1].tool, 'eraser');

  // Corrupt JSON degrades safely to empty store
  assert.deepEqual(deserializeFreehandStore('{bad-json'), {});
  assert.deepEqual(deserializeFreehandStore(null), {});
});

test('undoLastFreehandStroke and MAX_STROKES_PER_SCENE cap behave predictably', () => {
  let strokes: FreehandStroke[] = [];
  for (let i = 0; i < MAX_STROKES_PER_SCENE + 15; i++) {
    strokes = appendCompletedStroke(
      strokes,
      createFreehandStroke('crayon', 'sage', 'fine', { nx: 0.2, ny: 0.2, p: 0.6 }, i)
    );
  }
  assert.equal(strokes.length, MAX_STROKES_PER_SCENE);
  const undone = undoLastFreehandStroke(strokes);
  assert.equal(undone.length, MAX_STROKES_PER_SCENE - 1);
  assert.ok(getBrushRadiusPx('bold', 'eraser') > getBrushRadiusPx('bold', 'crayon'));
});
