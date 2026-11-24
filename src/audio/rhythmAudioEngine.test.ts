import test from 'node:test';
import assert from 'node:assert/strict';
import { CrayonAudioEngine } from './crayonAudio';
import { RhythmAudioEngine } from './rhythmAudioEngine';

test('RhythmAudioEngine detects tempo from AnalyserNode frames, syncs CrayonAudioEngine strokes, and pauses in ecoMode', async () => {
  let activeTimeSec = 0;
  let scheduledStarts: number[] = [];

  class FakeAudioParam {
    value = 0;
    setValueAtTime() {}
    setTargetAtTime(v: number) {
      this.value = v;
    }
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }

  class FakeAudioNode {
    gain = new FakeAudioParam();
    frequency = new FakeAudioParam();
    Q = new FakeAudioParam();
    type = 'bandpass';
    buffer: unknown = null;
    loop = false;
    fftSize = 1024;
    frequencyBinCount = 512;
    smoothingTimeConstant = 0.5;
    onended: (() => void) | null = null;
    connect() {}
    disconnect() {}
    start(when = 0) {
      scheduledStarts.push(when);
    }
    stop() {}
    getByteFrequencyData(arr: Uint8Array) {
      arr.fill(10);
      // Emit crisp 100 BPM kick pulse every 0.6s into low kick bins
      const period = 0.6;
      const phase = (activeTimeSec % period) / period;
      if (phase < 0.09) {
        arr[2] = 235;
        arr[3] = 225;
        arr[4] = 200;
      }
    }
  }

  class FakeAudioContext {
    state: 'suspended' | 'running' | 'closed' = 'running';
    sampleRate = 44100;
    destination = {};
    listeners = new Map<string, Set<() => void>>();

    get currentTime() {
      return activeTimeSec;
    }

    addEventListener(type: string, cb: () => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(cb);
    }
    removeEventListener(type: string, cb: () => void) {
      this.listeners.get(type)?.delete(cb);
    }
    createGain() {
      return new FakeAudioNode();
    }
    createBiquadFilter() {
      return new FakeAudioNode();
    }
    createBufferSource() {
      return new FakeAudioNode();
    }
    createOscillator() {
      return new FakeAudioNode();
    }
    createAnalyser() {
      return new FakeAudioNode();
    }
    createBuffer(_ch: number, len: number, sr: number) {
      const data = new Float32Array(len);
      return { duration: len / sr, getChannelData: () => data };
    }
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    async close() {
      this.state = 'closed';
    }
  }

  const prevWindow = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = {
    AudioContext: FakeAudioContext,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  let crayon: CrayonAudioEngine | null = null;
  let rhythm: RhythmAudioEngine | null = null;

  try {
    crayon = new CrayonAudioEngine(true, false);
    crayon.initialize();

    let lastPulse = 0;
    rhythm = new RhythmAudioEngine(
      () => crayon?.ensureSharedContext() ?? null,
      true,
      false,
      (pulse) => {
        lastPulse = pulse;
      }
    );
    crayon.setRhythmSource(rhythm);

    // Start playback and pump deterministic 25Hz analyser frames over 4.8s at 100 BPM
    const started = await rhythm.play();
    assert.equal(started, true);

    for (let i = 0; i < 120; i++) {
      activeTimeSec = i * 0.04;
      rhythm.stepAnalysisFrame(activeTimeSec);
    }

    const snap = rhythm.getSnapshot();
    assert.equal(snap.isPlaying, true);
    assert.ok(snap.detectedBpm !== null, 'expected live BPM detection from AnalyserNode');
    assert.ok(
      Math.abs(snap.detectedBpm - 100) <= 3.0,
      `expected detected BPM (${snap.detectedBpm}) near 100 BPM`
    );
    assert.ok(snap.confidence >= 0.65);

    // Trigger crayon parameter stroke right before a subdivision and verify subtle beat-locked sync
    scheduledStarts = [];
    activeTimeSec = 5.0;
    const played = crayon.playParameterStroke(0.3, 'paper', 5000);
    assert.equal(played, true);
    assert.equal(crayon.getStats().syncedPlays, 1);
    assert.ok(scheduledStarts.length >= 1);
    assert.ok(scheduledStarts[0] >= activeTimeSec && scheduledStarts[0] <= activeTimeSec + 0.04);

    // Trigger intro phrase and verify synced play increments
    assert.equal(crayon.playIntroPhrase('paper', 0, 5600), true);
    assert.equal(crayon.getStats().syncedPlays, 2);

    // Activating ecoMode immediately pauses background music & zeroes beat pulse
    rhythm.syncSettings(true, true);
    assert.equal(rhythm.getSnapshot().isPlaying, false);
    assert.equal(rhythm.getSnapshot().audioBlockedReason, 'eco');
    assert.equal(lastPulse, 0);

    // Tap tempo works independently when audio is allowed again
    rhythm.syncSettings(true, false);
    rhythm.tapTempo(10.0);
    rhythm.tapTempo(10.5);
    rhythm.tapTempo(11.0);
    rhythm.tapTempo(11.5);
    const tappedSnap = rhythm.getSnapshot();
    assert.ok(
      tappedSnap.detectedBpm !== null && Math.abs(tappedSnap.detectedBpm - 120) <= 2,
      `expected tapped BPM (${tappedSnap.detectedBpm}) near 120`
    );
  } finally {
    rhythm?.dispose();
    crayon?.dispose();
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});
