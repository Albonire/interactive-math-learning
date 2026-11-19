import test from 'node:test';
import assert from 'node:assert/strict';
import { getEcoRenderProfile, getEcoSvgFilterParams } from './ecoMode';

test('Eco mode lowers WebGL target FPS, DPR, and line-boil cadence cleanly', () => {
  const normalGpu = getEcoRenderProfile(false, false);
  const ecoGpu = getEcoRenderProfile(true, false);

  assert.equal(normalGpu.targetFps, 60);
  assert.equal(ecoGpu.targetFps, 24);
  assert.ok(ecoGpu.minFrameIntervalMs > 40);
  assert.ok(ecoGpu.maxPixelRatio < normalGpu.maxPixelRatio);
  assert.equal(ecoGpu.maxPixelRatio, 1.0);
  assert.ok(ecoGpu.boilFps < normalGpu.boilFps);
  assert.ok(ecoGpu.softwareCooldownMs > normalGpu.softwareCooldownMs);
  assert.ok(ecoGpu.optimizerIntervalMs > normalGpu.optimizerIntervalMs);
});

test('Eco mode reduces SVG filter octaves and displacement intensity while keeping craft non-zero', () => {
  const normalSvg = getEcoSvgFilterParams(false);
  const ecoSvg = getEcoSvgFilterParams(true);

  assert.ok(ecoSvg.surfaceWarpOctaves < normalSvg.surfaceWarpOctaves);
  assert.ok(ecoSvg.surfaceWarpScale < normalSvg.surfaceWarpScale);
  assert.ok(ecoSvg.surfaceWarpScale >= 1.2, 'Eco mode should still show handcrafted crayon edges');

  assert.ok(ecoSvg.surfaceMicroOctaves < normalSvg.surfaceMicroOctaves);
  assert.ok(ecoSvg.surfaceMicroScale < normalSvg.surfaceMicroScale);
  assert.ok(ecoSvg.surfaceMicroScale > 0.4);

  assert.ok(ecoSvg.strokeToothOctaves < normalSvg.strokeToothOctaves);
  assert.ok(ecoSvg.strokeToothScale < normalSvg.strokeToothScale);
  assert.ok(ecoSvg.textToothOctaves < normalSvg.textToothOctaves);
});
