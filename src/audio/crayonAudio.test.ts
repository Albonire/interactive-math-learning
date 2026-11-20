import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CrayonAudioEngine,
  DUST_THROTTLE_MS,
  STROKE_THROTTLE_MS,
  canTriggerAudioAt,
  computeAnnotationSketchParams,
  computeConstructionStrokeParams,
  computeDustSoundParams,
  computeIntroPhraseStrokes,
  computeIntroSketchParams,
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

test('stroke, dust, intro phrase, construction, and annotation synthesis params stay warm, audible, and bounded', () => {
  const gentlePaper = computeStrokeSoundParams(0.02, 'paper');
  const briskPaper = computeStrokeSoundParams(0.55, 'paper');
  const briskChalk = computeStrokeSoundParams(0.55, 'chalkboard');

  assert.ok(gentlePaper.gain >= 0.28 && gentlePaper.gain < briskPaper.gain);
  assert.ok(briskPaper.gain <= 0.56, 'stroke audio stays gentle and never clips');
  assert.ok(briskChalk.centerFreqHz > briskPaper.centerFreqHz);
  assert.ok(briskPaper.bodyFreqHz < briskPaper.centerFreqHz);

  const dustPaper = computeDustSoundParams(0.8, 'paper');
  const dustChalk = computeDustSoundParams(0.8, 'chalkboard');
  assert.ok(dustPaper.durationSec > gentlePaper.durationSec);
  assert.ok(dustPaper.gain >= 0.3 && dustPaper.gain <= 0.56);
  assert.equal(dustPaper.grainCount, 3);
  assert.equal(computeDustSoundParams(0.3, 'paper').grainCount, 2);
  assert.ok(dustChalk.centerFreqHz > dustPaper.centerFreqHz);

  const introPaper = computeIntroSketchParams('paper');
  const introChalk = computeIntroSketchParams('chalkboard');
  assert.ok(introPaper.durationSec >= 0.35, 'intro stroke is sustained and warm, never dry');
  assert.ok(introChalk.centerFreqHz > introPaper.centerFreqHz);

  const phrase = computeIntroPhraseStrokes('paper', 1);
  assert.equal(phrase.length, 4);
  assert.ok(phrase[phrase.length - 1].delaySec >= 1.5, 'intro phrase spans smoothly across slow choreography');

  const subStroke = computeConstructionStrokeParams('substrate', 'paper', false);
  const opStroke = computeConstructionStrokeParams('operator', 'paper', false);
  const labelStroke = computeConstructionStrokeParams('operator', 'paper', true);
  assert.ok(opStroke.centerFreqHz > subStroke.centerFreqHz);
  assert.ok(labelStroke.centerFreqHz > opStroke.centerFreqHz);

  const notePaper = computeAnnotationSketchParams('paper');
  const noteChalk = computeAnnotationSketchParams('chalkboard');
  assert.ok(notePaper.durationSec >= 0.12 && notePaper.durationSec < introPaper.durationSec);
  assert.ok(noteChalk.centerFreqHz > notePaper.centerFreqHz);
});

test('CrayonAudioEngine plays multi-stroke intro phrases, construction glides, cancels cleanly, and honors ecoMode', async () => {
  let ctxCreations = 0;
  let suspendCalls = 0;
  let startedSources = 0;
  let stoppedSources = 0;

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
    stop() {
      stoppedSources++;
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
    assert.equal(ctxCreations, 0);
    assert.equal(ecoEngine.playIntroPhrase('paper', 0, 1000), false);
    assert.equal(ecoEngine.playConstructionStroke('substrate', 'paper', false, 1000), false);
    ecoEngine.dispose();

    // 2. Normal startup: flushes queued stroke upon resume
    const engine = new CrayonAudioEngine(true, false);
    engine.initialize();
    assert.equal(ctxCreations, 1);

    assert.equal(engine.playParameterStroke(0.25, 'paper', 2000), true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(engine.getStats().state, 'running');
    assert.equal(engine.getStats().strokePlays, 1);
    assert.equal(startedSources, 1);

    // 3. Intro phrase schedules 4 warm strokes and stopIntroPhrase cancels them cleanly
    assert.equal(engine.playIntroPhrase('paper', 1, 2500), true);
    assert.equal(engine.getStats().introPlays, 1);
    assert.equal(startedSources, 5);

    engine.stopIntroPhrase();
    assert.equal(stoppedSources, 4);

    // 4. Construction stroke glides throttle cleanly and play per layer
    assert.equal(engine.playConstructionStroke('substrate', 'paper', false, 3000), true);
    assert.equal(engine.playConstructionStroke('structure', 'paper', false, 3100), false);
    assert.equal(engine.playConstructionStroke('operator', 'paper', false, 3450), true);
    assert.equal(engine.getStats().introPlays, 3);

    // 5. Activating ecoMode suspends context and silences everything
    engine.syncSettings(true, true);
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(suspendCalls, 1);
    assert.equal(engine.playIntroPhrase('paper', 2, 4000), false);
    assert.equal(engine.playAnnotationSketch('paper', 4100), false);
    engine.dispose();
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});
