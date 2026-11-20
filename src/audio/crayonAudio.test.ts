import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CrayonAudioEngine,
  DUST_THROTTLE_MS,
  STROKE_THROTTLE_MS,
  canTriggerAudioAt,
  computeDustSoundParams,
  computeStrokeSoundParams,
  shouldPlayCrayonAudio,
} from './crayonAudio';

test('audio gate respects optional toggle and always silences under ecoMode', () => {
  assert.equal(shouldPlayCrayonAudio({ enabled: true, ecoMode: false }), true);
  assert.equal(shouldPlayCrayonAudio({ enabled: false, ecoMode: false }), false);
  assert.equal(shouldPlayCrayonAudio({ enabled: true, ecoMode: true }), false);
  assert.equal(shouldPlayCrayonAudio({ enabled: false, ecoMode: true }), false);
});

test('audio throttle prevents overlapping burst distortion during rapid drags', () => {
  assert.equal(canTriggerAudioAt(100, -1, STROKE_THROTTLE_MS), true);
  assert.equal(canTriggerAudioAt(120, 100, STROKE_THROTTLE_MS), false);
  assert.equal(canTriggerAudioAt(100 + STROKE_THROTTLE_MS, 100, STROKE_THROTTLE_MS), true);
  assert.equal(canTriggerAudioAt(200, 150, DUST_THROTTLE_MS), false);
  assert.equal(canTriggerAudioAt(150 + DUST_THROTTLE_MS, 150, DUST_THROTTLE_MS), true);
});

test('stroke and dust synthesis parameters stay audible, bounded, and theme-calibrated', () => {
  const gentlePaper = computeStrokeSoundParams(0.02, 'paper');
  const briskPaper = computeStrokeSoundParams(0.55, 'paper');
  const briskChalk = computeStrokeSoundParams(0.55, 'chalkboard');

  assert.ok(gentlePaper.gain >= 0.14 && gentlePaper.gain < briskPaper.gain);
  assert.ok(briskPaper.gain <= 0.36, 'stroke audio stays gentle and never harsh');
  assert.ok(
    briskChalk.centerFreqHz > briskPaper.centerFreqHz,
    'chalkboard stroke has crisper high-mid resonance'
  );
  assert.ok(briskPaper.bodyFreqHz < briskPaper.centerFreqHz);

  const dustPaper = computeDustSoundParams(0.8, 'paper');
  const dustChalk = computeDustSoundParams(0.8, 'chalkboard');
  assert.ok(dustPaper.durationSec > gentlePaper.durationSec);
  assert.ok(dustPaper.gain >= 0.17 && dustPaper.gain <= 0.4, 'dust rustle stays audible yet soft');
  assert.equal(dustPaper.grainCount, 3);
  assert.equal(computeDustSoundParams(0.3, 'paper').grainCount, 2);
  assert.ok(dustChalk.centerFreqHz > dustPaper.centerFreqHz);
});

test('CrayonAudioEngine initializes cleanly, flushes queued strokes on resume, and honors ecoMode on startup', async () => {
  let ctxCreations = 0;
  let suspendCalls = 0;
  let startedSources = 0;

  class FakeAudioParam {
    value = 0;
    setValueAtTime() {}
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
    onended: (() => void) | null = null;
    connect() {}
    disconnect() {}
    start() {
      startedSources++;
    }
  }

  class FakeAudioContext {
    state: 'suspended' | 'running' | 'closed' = 'suspended';
    sampleRate = 44100;
    currentTime = 0;
    destination = {};
    listeners = new Map<string, Set<() => void>>();

    constructor() {
      ctxCreations++;
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

    createBuffer(_ch: number, len: number, sr: number) {
      const data = new Float32Array(len);
      return {
        duration: len / sr,
        getChannelData: () => data,
      };
    }

    async resume() {
      this.state = 'running';
      for (const cb of this.listeners.get('statechange') ?? []) cb();
    }

    async suspend() {
      suspendCalls++;
      this.state = 'suspended';
      for (const cb of this.listeners.get('statechange') ?? []) cb();
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

  try {
    // 1. Eco Mode active at startup: must NOT initialize AudioContext or play audio
    const ecoEngine = new CrayonAudioEngine(true, true);
    ecoEngine.initialize();
    assert.equal(ctxCreations, 0, 'ecoMode on startup avoids creating AudioContext');
    assert.equal(ecoEngine.playParameterStroke(0.2, 'paper', 1000), false);
    ecoEngine.dispose();

    // 2. Normal startup: creates context, queues stroke while suspended, flushes upon resume without dropping
    const engine = new CrayonAudioEngine(true, false);
    engine.initialize();
    assert.equal(ctxCreations, 1, 'initializes AudioContext eagerly when active');
    assert.equal(engine.getStats().state, 'suspended');

    const accepted = engine.playParameterStroke(0.25, 'paper', 2000);
    assert.equal(accepted, true);
    // Allow microtask resume() promise to settle
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(engine.getStats().state, 'running');
    assert.equal(engine.getStats().strokePlays, 1, 'queued stroke flushed without being dropped');
    assert.equal(startedSources, 1);

    // 3. Activating ecoMode suspends context and silences further triggers
    engine.syncSettings(true, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(suspendCalls, 1);
    assert.equal(engine.playParameterStroke(0.3, 'paper', 3000), false);
    assert.equal(engine.getStats().strokePlays, 1);
    engine.dispose();
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});
