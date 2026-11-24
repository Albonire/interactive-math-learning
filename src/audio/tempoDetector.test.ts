import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_CONSTRUCTION_DELAY_SEC,
  MAX_INTERACTIVE_DELAY_SEC,
  OnlineOnsetDetector,
  computeRhythmSyncAdjustment,
  computeRhythmicBandEnergy,
  computeTempoSyncedIntroDelays,
  computeVisualBeatPulse,
  estimateBpmFromOnsets,
  foldBpmToMusicalRange,
  smoothBpmEstimate,
} from './tempoDetector';

test('computeRhythmicBandEnergy isolates low kick band and transient band from FFT bins', () => {
  const sampleRate = 44100;
  const fftSize = 1024;
  const bins = new Uint8Array(fftSize / 2);

  // Silent buffer produces zero energy
  const silent = computeRhythmicBandEnergy(bins, sampleRate, fftSize);
  assert.equal(silent.composite, 0);

  // Inject strong ~100Hz kick pulse (bin ~2-3)
  bins[2] = 220;
  bins[3] = 200;
  const kick = computeRhythmicBandEnergy(bins, sampleRate, fftSize);
  assert.ok(kick.lowEnergy > 0.3, 'lowEnergy captures kick bins');
  assert.equal(kick.transientEnergy, 0);
  assert.ok(kick.composite > 0.2);
});

test('OnlineOnsetDetector + estimateBpmFromOnsets accurately detects 78, 96, and 120 BPM streams', () => {
  for (const targetBpm of [78, 96, 120]) {
    const detector = new OnlineOnsetDetector();
    const beatPeriod = 60 / targetBpm;
    const frameDt = 0.04; // 25 Hz analysis polling

    for (let step = 0; step < 200; step++) {
      const t = step * frameDt;
      const phase = (t % beatPeriod) / beatPeriod;
      // Sharp rhythmic pulse every beat with quiet floor in between
      const energy = phase < 0.09 ? 0.82 : 0.08 + Math.sin(step * 0.7) * 0.015;
      detector.pushFrame(energy, t);
    }

    const est = estimateBpmFromOnsets(detector.getOnsets());
    assert.ok(est.bpm !== null, `expected BPM estimate for ${targetBpm} BPM`);
    assert.ok(
      Math.abs(est.bpm - targetBpm) <= 1.8,
      `expected ${est.bpm} to be within 1.8 BPM of ${targetBpm}`
    );
    assert.ok(est.confidence >= 0.75, `expected high confidence (${est.confidence}) for steady pulse`);
    assert.ok(est.beatPeriodSec !== null && Math.abs(est.beatPeriodSec - beatPeriod) < 0.02);
  }
});

test('octave folding maps sub-harmonic and double-time tempos into 64-156 BPM range', () => {
  assert.equal(foldBpmToMusicalRange(48), 96);
  assert.equal(foldBpmToMusicalRange(192), 96);
  assert.equal(foldBpmToMusicalRange(114), 114);
  assert.equal(foldBpmToMusicalRange(0), null);
});

test('irregular / non-periodic onsets yield low confidence and smoothBpmEstimate resists sudden outliers', () => {
  const erratic = [0.1, 0.41, 1.18, 1.49, 2.62, 2.95, 3.81];
  const est = estimateBpmFromOnsets(erratic);
  assert.ok(est.confidence < 0.65, `erratic timing should have modest confidence (${est.confidence})`);

  // Outlier jump rejected when confidence is low
  assert.equal(smoothBpmEstimate(96, 132, 0.45), 96);
  // Smooth gradual tracking when close
  const tracked = smoothBpmEstimate(96, 98, 0.85);
  assert.ok(tracked !== null && tracked > 96 && tracked < 98);
});

test('computeRhythmSyncAdjustment stays neutral when disabled and keeps interactive delays snappy', () => {
  const off = computeRhythmSyncAdjustment({
    nowSec: 1.2,
    beatPeriodSec: 0.625,
    phaseAnchorSec: 0,
    confidence: 0.9,
    syncStrength: 0.6,
    syncEnabled: false,
    kind: 'stroke',
  });
  assert.equal(off.lockedToBeat, false);
  assert.equal(off.delaySec, 0);
  assert.equal(off.gainMultiplier, 1);

  // Interactive stroke right before a 16th-note boundary gets a tiny bounded micro-nudge <= 38ms
  const beatPeriod = 0.625; // 96 BPM -> 16th note = 0.15625s
  const nearSubBeat = computeRhythmSyncAdjustment({
    nowSec: 0.135, // 21.25ms before next 16th-note grid
    beatPeriodSec: beatPeriod,
    phaseAnchorSec: 0,
    confidence: 0.92,
    syncStrength: 0.75,
    syncEnabled: true,
    kind: 'stroke',
  });
  assert.equal(nearSubBeat.lockedToBeat, true);
  assert.ok(nearSubBeat.delaySec > 0 && nearSubBeat.delaySec <= MAX_INTERACTIVE_DELAY_SEC);

  // Construction stroke near half-beat allows slightly broader gentle nudge <= 105ms
  const construction = computeRhythmSyncAdjustment({
    nowSec: 0.25, // 62.5ms before half-beat at 0.3125s
    beatPeriodSec: beatPeriod,
    phaseAnchorSec: 0,
    confidence: 0.92,
    syncStrength: 0.8,
    syncEnabled: true,
    kind: 'construction',
  });
  assert.equal(construction.lockedToBeat, true);
  assert.ok(construction.delaySec > 0 && construction.delaySec <= MAX_CONSTRUCTION_DELAY_SEC);

  // Downbeat stroke receives warm tactile swell > offbeat stroke
  const onBeat = computeRhythmSyncAdjustment({
    nowSec: 0.625,
    beatPeriodSec: beatPeriod,
    phaseAnchorSec: 0,
    confidence: 0.95,
    syncStrength: 0.8,
    syncEnabled: true,
    kind: 'stroke',
  });
  const offBeat = computeRhythmSyncAdjustment({
    nowSec: 0.3125,
    beatPeriodSec: beatPeriod,
    phaseAnchorSec: 0,
    confidence: 0.95,
    syncStrength: 0.8,
    syncEnabled: true,
    kind: 'stroke',
  });
  assert.ok(onBeat.gainMultiplier > offBeat.gainMultiplier);
  assert.ok(onBeat.pitchMultiplier > offBeat.pitchMultiplier);
});

test('computeTempoSyncedIntroDelays aligns phrase cadence smoothly with detected BPM', () => {
  const base = [0, 0.54, 1.14, 1.7];
  const unchanged = computeTempoSyncedIntroDelays(base, null, 0, 0.7);
  assert.deepEqual(unchanged, base);

  // At 120 BPM (0.5s per beat), delays pull subtly closer to [0, 0.5, 1.0, 1.5]
  const syncedFast = computeTempoSyncedIntroDelays(base, 0.5, 0.95, 0.85);
  assert.equal(syncedFast[0], 0);
  assert.ok(syncedFast[1] < base[1] && syncedFast[1] >= 0.49);
  assert.ok(syncedFast[3] < base[3] && syncedFast[3] >= 1.48);

  // Visual beat pulse peaks sharply at downbeat and decays smoothly
  const atBeat = computeVisualBeatPulse(1.0, 0.5, 0.0, 0.9);
  const midBeat = computeVisualBeatPulse(1.25, 0.5, 0.0, 0.9);
  assert.ok(atBeat.pulse > 0.85);
  assert.ok(midBeat.pulse < 0.15);
});
