import type { ThemeMode } from '../core/types';
import {
  computeTempoSyncedIntroDelays,
  type CrayonSyncKind,
  type RhythmSyncAdjustment,
} from './tempoDetector';

export interface RhythmTempoSource {
  getSyncAdjustment(kind: CrayonSyncKind, audioNowSec: number): RhythmSyncAdjustment;
  getTempoMeta(): {
    beatPeriodSec: number | null;
    confidence: number;
    syncStrength: number;
    syncEnabled: boolean;
  };
}

export const AUDIO_STORAGE_KEY = 'bibifold_crayon_audio_v1';

export interface AudioGateInput {
  enabled: boolean;
  ecoMode: boolean;
}

export interface StrokeSoundParams {
  durationSec: number;
  bodyFreqHz: number;
  centerFreqHz: number;
  qFactor: number;
  gain: number;
  highpassHz: number;
}

export interface DustSoundParams {
  durationSec: number;
  bodyFreqHz: number;
  centerFreqHz: number;
  qFactor: number;
  gain: number;
  highpassHz: number;
  grainCount: number;
}

export interface IntroPhraseStroke {
  delaySec: number;
  gainScale: number;
  params: StrokeSoundParams;
}

export interface CrayonAudioStats {
  state: string;
  strokePlays: number;
  dustPlays: number;
  introPlays: number;
  annotationPlays: number;
  syncedPlays: number;
  unlocked: boolean;
}

export const STROKE_THROTTLE_MS = 48;
export const DUST_THROTTLE_MS = 115;
export const INTRO_THROTTLE_MS = 220;
export const CONSTRUCTION_THROTTLE_MS = 380;
export const ANNOTATION_THROTTLE_MS = 140;

/**
 * Pure gating rule: audio is optional and always silenced when Modo Eco is active.
 */
export function shouldPlayCrayonAudio({ enabled, ecoMode }: AudioGateInput): boolean {
  return enabled && !ecoMode;
}

/**
 * Pure throttle helper to avoid harsh overlapping noise bursts during rapid drags.
 */
export function canTriggerAudioAt(
  nowMs: number,
  lastTriggeredMs: number,
  minIntervalMs: number
): boolean {
  if (lastTriggeredMs < 0) return true;
  return nowMs - lastTriggeredMs >= minIntervalMs;
}

/**
 * Computes audible yet gentle acoustic parameters for a wax-crayon stroke on cotton paper
 * or pastel chalk brushing against dark slate (calibrated for real laptop speakers).
 */
export function computeStrokeSoundParams(
  normDelta: number,
  theme: ThemeMode
): StrokeSoundParams {
  const clamped = Math.max(0.005, Math.min(1, Number.isFinite(normDelta) ? normDelta : 0.08));
  const energy = Math.pow(clamped, 0.38);
  const isChalk = theme === 'chalkboard';

  return {
    durationSec: Number((0.095 + energy * 0.07).toFixed(4)),
    bodyFreqHz: Math.round((isChalk ? 960 : 690) + energy * (isChalk ? 400 : 320)),
    centerFreqHz: Math.round((isChalk ? 2320 : 1720) + energy * (isChalk ? 940 : 740)),
    qFactor: Number((isChalk ? 1.08 : 0.86).toFixed(2)),
    gain: Number((0.28 + energy * 0.22).toFixed(4)),
    highpassHz: isChalk ? 420 : 240,
  };
}

/**
 * Computes soft granular paper-rustle / dry-crumb sound parameters when crayon dust emits.
 */
export function computeDustSoundParams(
  intensity: number,
  theme: ThemeMode
): DustSoundParams {
  const clamped = Math.max(0.1, Math.min(1, Number.isFinite(intensity) ? intensity : 0.45));
  const isChalk = theme === 'chalkboard';

  return {
    durationSec: Number((0.14 + clamped * 0.085).toFixed(4)),
    bodyFreqHz: Math.round((isChalk ? 1280 : 940) + clamped * 380),
    centerFreqHz: Math.round((isChalk ? 2980 : 2360) + clamped * 840),
    qFactor: Number((isChalk ? 1.02 : 0.85).toFixed(2)),
    gain: Number((0.3 + clamped * 0.22).toFixed(4)),
    highpassHz: isChalk ? 740 : 500,
    grainCount: clamped > 0.55 ? 3 : 2,
  };
}

/**
 * Computes parameters for a warm, sustained artisanal crayon glide during lesson intro animations.
 */
export function computeIntroSketchParams(theme: ThemeMode): StrokeSoundParams {
  const isChalk = theme === 'chalkboard';
  return {
    durationSec: 0.42,
    bodyFreqHz: isChalk ? 980 : 700,
    centerFreqHz: isChalk ? 2360 : 1740,
    qFactor: isChalk ? 0.96 : 0.78,
    gain: 0.36,
    highpassHz: isChalk ? 380 : 210,
  };
}

/**
 * Computes an organic multi-stroke drawing phrase (~2.2s span) that accompanies
 * slow procedural intro animations so the audio feels warm, continuous, and alive.
 */
export function computeIntroPhraseStrokes(
  theme: ThemeMode,
  beatIndex: number
): IntroPhraseStroke[] {
  const base = computeIntroSketchParams(theme);
  const beatShift = 1 + ((beatIndex % 4) - 1.5) * 0.04;

  return [
    {
      delaySec: 0.0,
      gainScale: 0.88,
      params: {
        ...base,
        durationSec: 0.46,
        bodyFreqHz: Math.round(base.bodyFreqHz * 0.92 * beatShift),
        centerFreqHz: Math.round(base.centerFreqHz * 0.94 * beatShift),
      },
    },
    {
      delaySec: 0.54,
      gainScale: 0.96,
      params: {
        ...base,
        durationSec: 0.52,
        bodyFreqHz: Math.round(base.bodyFreqHz * 1.02 * beatShift),
        centerFreqHz: Math.round(base.centerFreqHz * 1.04 * beatShift),
      },
    },
    {
      delaySec: 1.14,
      gainScale: 0.84,
      params: {
        ...base,
        durationSec: 0.44,
        bodyFreqHz: Math.round(base.bodyFreqHz * 1.08 * beatShift),
        centerFreqHz: Math.round(base.centerFreqHz * 1.1 * beatShift),
      },
    },
    {
      delaySec: 1.7,
      gainScale: 0.68,
      params: {
        ...base,
        durationSec: 0.38,
        bodyFreqHz: Math.round(base.bodyFreqHz * 1.14 * beatShift),
        centerFreqHz: Math.round(base.centerFreqHz * 1.16 * beatShift),
      },
    },
  ];
}

/**
 * Computes warm, layer-calibrated stroke parameters synced to real-time procedural
 * 3D geometry construction (substrate -> structure -> operator -> invariant -> label).
 */
export function computeConstructionStrokeParams(
  layerId: string,
  theme: ThemeMode,
  isSprite = false
): StrokeSoundParams {
  const base = computeIntroSketchParams(theme);
  if (isSprite) {
    return {
      ...base,
      durationSec: 0.22,
      bodyFreqHz: Math.round(base.bodyFreqHz * 1.24),
      centerFreqHz: Math.round(base.centerFreqHz * 1.26),
      gain: 0.28,
    };
  }
  const layerScale =
    layerId === 'substrate'
      ? 0.88
      : layerId === 'structure'
        ? 0.98
        : layerId === 'operator'
          ? 1.1
          : 1.18;
  const durationSec =
    layerId === 'substrate'
      ? 0.46
      : layerId === 'structure'
        ? 0.48
        : layerId === 'operator'
          ? 0.38
          : 0.34;
  return {
    ...base,
    durationSec,
    bodyFreqHz: Math.round(base.bodyFreqHz * layerScale),
    centerFreqHz: Math.round(base.centerFreqHz * layerScale),
    gain: 0.32,
  };
}

/**
 * Computes parameters for a delicate short pencil/crayon flick when Legends or Crayón Guía appear.
 */
export function computeAnnotationSketchParams(theme: ThemeMode): StrokeSoundParams {
  const isChalk = theme === 'chalkboard';
  return {
    durationSec: 0.16,
    bodyFreqHz: isChalk ? 1180 : 840,
    centerFreqHz: isChalk ? 2740 : 2100,
    qFactor: isChalk ? 1.08 : 0.9,
    gain: 0.34,
    highpassHz: isChalk ? 520 : 300,
  };
}

export function loadInitialAudioEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (stored === '0' || stored === 'false') return false;
    if (stored === '1' || stored === 'true') return true;
    return true;
  } catch {
    return true;
  }
}

export function saveAudioEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? '1' : '0');
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
}

/**
 * Lightweight procedural Web Audio synthesizer for warm wax-crayon strokes & paper-rustle sounds.
 * - Uses one RMS-calibrated cotton-paper grain buffer shared across all cues (slider drags,
 *   crayon dust, procedural 3D construction glides, intro sketching phrases, and legend callouts).
 * - Adds a subtle warm paper-desk resonance band so sustained strokes feel plush, never dry.
 * - Unlocks cleanly on the first user gesture and queues wake-up events without dropping them.
 * - Strictly respects `audioEnabled` and silences/suspends immediately under `ecoMode`.
 */
export class CrayonAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;
  private ecoMode = false;
  private lastStrokeMs = -1;
  private lastDustMs = -1;
  private lastIntroMs = -1;
  private lastConstructionMs = -1;
  private lastAnnotationMs = -1;
  private strokePlays = 0;
  private dustPlays = 0;
  private introPlays = 0;
  private annotationPlays = 0;
  private syncedPlays = 0;
  private initialized = false;
  private disposed = false;
  private hasUserGesture = false;
  private resumePromise: Promise<void> | null = null;
  private pendingTasks: Array<{ run: (ctx: AudioContext) => void; queuedAtMs: number }> = [];
  private activePhraseSources = new Set<AudioBufferSourceNode>();
  private gestureListenersBound = false;
  private onStatsChange?: (stats: CrayonAudioStats) => void;
  private rhythmSource: RhythmTempoSource | null = null;

  private readonly handleUserGesture = () => {
    this.hasUserGesture = true;
    this.unlock();
  };

  private readonly handleContextStateChange = () => {
    if (this.disposed || !this.ctx) return;
    if (this.ctx.state === 'running') {
      this.flushPendingTasks(this.ctx);
    }
    this.emitStats();
  };

  constructor(
    initialEnabled = true,
    initialEcoMode = false,
    onStatsChange?: (stats: CrayonAudioStats) => void
  ) {
    this.enabled = initialEnabled;
    this.ecoMode = initialEcoMode;
    this.onStatsChange = onStatsChange;
  }

  public initialize(): void {
    if (this.disposed || this.initialized) return;
    this.initialized = true;
    this.bindGestureUnlockListeners();

    if (this.isActive()) {
      this.ensureContext();
    }
    this.emitStats();
  }

  private bindGestureUnlockListeners(): void {
    if (this.gestureListenersBound || typeof window === 'undefined') return;
    this.gestureListenersBound = true;
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', this.handleUserGesture, opts);
    window.addEventListener('mousedown', this.handleUserGesture, opts);
    window.addEventListener('touchstart', this.handleUserGesture, opts);
    window.addEventListener('keydown', this.handleUserGesture, opts);
    window.addEventListener('click', this.handleUserGesture, opts);
  }

  private unbindGestureUnlockListeners(): void {
    if (!this.gestureListenersBound || typeof window === 'undefined') return;
    this.gestureListenersBound = false;
    const opts: EventListenerOptions = { capture: true };
    window.removeEventListener('pointerdown', this.handleUserGesture, opts);
    window.removeEventListener('mousedown', this.handleUserGesture, opts);
    window.removeEventListener('touchstart', this.handleUserGesture, opts);
    window.removeEventListener('keydown', this.handleUserGesture, opts);
    window.removeEventListener('click', this.handleUserGesture, opts);
  }

  public isActive(): boolean {
    return !this.disposed && shouldPlayCrayonAudio({ enabled: this.enabled, ecoMode: this.ecoMode });
  }

  public setRhythmSource(source: RhythmTempoSource | null): void {
    this.rhythmSource = source;
  }

  public ensureSharedContext(): AudioContext | null {
    return this.ensureContext();
  }

  public getStats(): CrayonAudioStats {
    const state = this.ctx ? this.ctx.state : 'uninitialized';
    return {
      state,
      strokePlays: this.strokePlays,
      dustPlays: this.dustPlays,
      introPlays: this.introPlays,
      annotationPlays: this.annotationPlays,
      syncedPlays: this.syncedPlays,
      unlocked: state === 'running',
    };
  }

  private emitStats(): void {
    this.onStatsChange?.(this.getStats());
  }

  private isContextSuspended(ctx: AudioContext): boolean {
    const st = ctx.state as string;
    return st === 'suspended' || st === 'interrupted';
  }

  public stopIntroPhrase(): void {
    for (const src of this.activePhraseSources) {
      try {
        src.stop();
      } catch {
        // Ignore already stopped sources
      }
      try {
        src.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    this.activePhraseSources.clear();
  }

  public syncSettings(enabled: boolean, ecoMode: boolean): void {
    this.enabled = enabled;
    this.ecoMode = ecoMode;

    if (!this.isActive()) {
      this.pendingTasks = [];
      this.stopIntroPhrase();
      if (this.ctx && this.ctx.state === 'running') {
        void this.ctx
          .suspend()
          .then(() => this.emitStats())
          .catch(() => {
            // Ignore suspend errors on restricted contexts
          });
      } else {
        this.emitStats();
      }
      return;
    }

    if (this.initialized) {
      this.ensureContext();
    }
    this.emitStats();
  }

  public unlock(): void {
    this.hasUserGesture = true;
    if (!this.isActive()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state === 'running') {
      this.flushPendingTasks(ctx);
      this.emitStats();
      return;
    }

    if (this.isContextSuspended(ctx)) {
      this.triggerResume(ctx);
    }
  }

  private triggerResume(ctx: AudioContext): void {
    if (this.resumePromise) return;
    this.resumePromise = ctx
      .resume()
      .then(() => {
        if (!this.disposed && this.isActive() && this.ctx === ctx && ctx.state === 'running') {
          this.flushPendingTasks(ctx);
        }
        this.emitStats();
      })
      .catch(() => {
        // Safely ignore if browser still awaits direct user activation
      })
      .finally(() => {
        this.resumePromise = null;
      });
  }

  private flushPendingTasks(ctx: AudioContext): void {
    if (this.pendingTasks.length === 0) return;
    const queue = this.pendingTasks;
    this.pendingTasks = [];
    const now = performance.now();
    for (const queued of queue) {
      const ageMs = now - queued.queuedAtMs;
      if (ageMs <= 650 && !this.disposed && this.isActive() && ctx.state === 'running') {
        queued.run(ctx);
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.disposed || typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxCtor) return null;
      try {
        this.ctx = new AudioCtxCtor();
        this.ctx.addEventListener('statechange', this.handleContextStateChange);
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }

    if (!this.noiseBuffer && this.ctx) {
      this.noiseBuffer = this.createPaperGrainBuffer(this.ctx);
    }

    return this.ctx;
  }

  /**
   * Generates a 1.8s warm cotton-paper & dry-wax friction noise buffer normalized by RMS (~0.34 RMS)
   * with rich mid/low-mid weave modulation so sustained drawing glides feel plush and tactile.
   */
  private createPaperGrainBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * 1.8);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let prevWhite = 0;
    let sumSq = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Warm low-mid paper body + organic mid friction + subtle cotton tooth grit
      b0 = 0.972 * b0 + white * 0.14;
      b1 = 0.86 * b1 + white * 0.27;
      b2 = 0.54 * b2 + white * 0.45;
      const grit = white - prevWhite * 0.62;
      prevWhite = white;

      // Gentle multi-rate paper fiber weave modulation so longer glides breathe naturally
      const t = i / sampleRate;
      const weave =
        0.76 +
        0.13 * Math.sin(t * 175) +
        0.07 * Math.sin(t * 620) +
        0.04 * Math.sin(t * 24);
      const sample = (b0 * 0.68 + b1 * 0.76 + b2 * 0.58 + grit * 0.34) * weave;
      data[i] = sample;
      sumSq += sample * sample;
    }

    // RMS-normalize to 0.34 RMS with soft limiting at +-0.96 for warm, clear audibility
    const rms = Math.sqrt(sumSq / Math.max(1, length)) || 0.001;
    const scale = 0.34 / rms;
    for (let i = 0; i < length; i++) {
      const v = data[i] * scale;
      data[i] = Math.tanh(v * 0.92);
    }

    return buffer;
  }

  private scheduleWarmCrayonGrain(
    ctx: AudioContext,
    params: StrokeSoundParams | DustSoundParams,
    pitchJitter: number,
    delaySec: number,
    gainScale: number,
    kind: 'stroke' | 'dust' | 'intro' | 'annotation',
    trackInPhrase = false,
    pitchMultiplier = 1
  ): void {
    if (this.disposed || !this.isActive() || !this.noiseBuffer || !this.masterGain) return;

    const now = ctx.currentTime + delaySec;
    const duration = params.durationSec;
    const gainTarget = Math.min(0.6, params.gain * gainScale);

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(params.highpassHz, now);

    // Layer 0: Warm paper-desk resonance (eliminates dry/thin high-frequency hiss)
    const warmthFilter = ctx.createBiquadFilter();
    warmthFilter.type = 'bandpass';
    warmthFilter.frequency.setValueAtTime(
      kind === 'dust' ? 520 : Math.max(260, params.bodyFreqHz * 0.52 * pitchMultiplier),
      now
    );
    warmthFilter.Q.setValueAtTime(0.68, now);
    const warmthGain = ctx.createGain();
    warmthGain.gain.setValueAtTime(kind === 'intro' ? 0.56 : 0.4, now);

    // Layer 1: Warm wax-on-paper friction body
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    const bodyFreq = Math.max(
      260,
      Math.min(
        2600,
        params.bodyFreqHz * pitchMultiplier * (1 + (Math.random() - 0.5) * pitchJitter * 0.6)
      )
    );
    bodyFilter.frequency.setValueAtTime(bodyFreq, now);
    bodyFilter.frequency.exponentialRampToValueAtTime(
      Math.max(220, bodyFreq * (kind === 'annotation' ? 1.12 : 0.88)),
      now + duration
    );
    bodyFilter.Q.setValueAtTime(0.82, now);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.95, now);

    // Layer 2: Dry cotton-paper / chalk bristle tooth
    const raspFilter = ctx.createBiquadFilter();
    raspFilter.type = 'bandpass';
    const raspFreq = Math.max(
      620,
      Math.min(
        6200,
        params.centerFreqHz * pitchMultiplier * (1 + (Math.random() - 0.5) * pitchJitter)
      )
    );
    raspFilter.frequency.setValueAtTime(raspFreq, now);
    raspFilter.frequency.exponentialRampToValueAtTime(
      Math.max(520, raspFreq * (kind === 'annotation' ? 1.16 : 0.84)),
      now + duration
    );
    raspFilter.Q.setValueAtTime(params.qFactor, now);

    const raspGain = ctx.createGain();
    raspGain.gain.setValueAtTime(kind === 'dust' ? 1.1 : kind === 'intro' ? 0.86 : 0.92, now);

    // Plush hand-stroke envelope: rounded swell -> steady wax glide -> silky decay tail
    const envGain = ctx.createGain();
    const attack = Math.min(kind === 'intro' ? 0.075 : 0.024, duration * 0.24);
    const holdEnd = now + Math.max(attack + 0.015, duration * (kind === 'intro' ? 0.58 : 0.45));
    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(gainTarget, now + attack);
    envGain.gain.linearRampToValueAtTime(gainTarget * 0.78, holdEnd);
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(highpass);
    highpass.connect(warmthFilter);
    highpass.connect(bodyFilter);
    highpass.connect(raspFilter);
    warmthFilter.connect(warmthGain);
    bodyFilter.connect(bodyGain);
    raspFilter.connect(raspGain);
    warmthGain.connect(envGain);
    bodyGain.connect(envGain);
    raspGain.connect(envGain);
    envGain.connect(this.masterGain);

    if (trackInPhrase) {
      this.activePhraseSources.add(source);
    }

    const randomOffset = Math.random() * Math.max(0.05, this.noiseBuffer.duration - 0.5);
    source.start(now, randomOffset, duration + 0.03);
    source.onended = () => {
      if (trackInPhrase) {
        this.activePhraseSources.delete(source);
      }
      source.disconnect();
      highpass.disconnect();
      warmthFilter.disconnect();
      warmthGain.disconnect();
      bodyFilter.disconnect();
      raspFilter.disconnect();
      bodyGain.disconnect();
      raspGain.disconnect();
      envGain.disconnect();
    };
  }

  private playOrResumeThen(task: (ctx: AudioContext) => void, fromUserGesture = true): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    if (ctx.state === 'running') {
      task(ctx);
      return;
    }

    if (this.isContextSuspended(ctx)) {
      if (this.pendingTasks.length >= 2) {
        this.pendingTasks.shift();
      }
      this.pendingTasks.push({ run: task, queuedAtMs: performance.now() });
      if (fromUserGesture || this.hasUserGesture) {
        this.triggerResume(ctx);
      }
    }
  }

  private resolveRhythmSync(kind: CrayonSyncKind, ctx: AudioContext): RhythmSyncAdjustment {
    if (!this.rhythmSource) {
      return {
        delaySec: 0,
        gainMultiplier: 1,
        pitchMultiplier: 1,
        beatPhase: 0,
        beatIndex: 0,
        lockedToBeat: false,
      };
    }
    return this.rhythmSource.getSyncAdjustment(kind, ctx.currentTime);
  }

  /**
   * Tactile wax-crayon stroke sound when the user nudges or drags a parameter control.
   */
  public playParameterStroke(normDelta: number, theme: ThemeMode, nowMs = performance.now()): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastStrokeMs, STROKE_THROTTLE_MS)) return false;
    this.lastStrokeMs = nowMs;

    const params = computeStrokeSoundParams(normDelta, theme);
    this.playOrResumeThen((ctx) => {
      const sync = this.resolveRhythmSync('stroke', ctx);
      this.scheduleWarmCrayonGrain(
        ctx,
        params,
        0.2,
        sync.delaySec,
        sync.gainMultiplier,
        'stroke',
        false,
        sync.pitchMultiplier
      );
      this.strokePlays++;
      if (sync.lockedToBeat) this.syncedPlays++;
      this.emitStats();
    });
    return true;
  }

  /**
   * Multi-grain dry paper-rustle sound when intense parameter interaction emits crayon dust.
   */
  public playCrayonDust(intensity: number, theme: ThemeMode, nowMs = performance.now()): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastDustMs, DUST_THROTTLE_MS)) return false;
    this.lastDustMs = nowMs;

    const params = computeDustSoundParams(intensity, theme);
    this.playOrResumeThen((ctx) => {
      const sync = this.resolveRhythmSync('dust', ctx);
      for (let g = 0; g < params.grainCount; g++) {
        const delaySec = sync.delaySec + g * 0.028 + Math.random() * 0.008;
        const scale = (g === 0 ? 1.0 : 0.78 - g * 0.14) * sync.gainMultiplier;
        this.scheduleWarmCrayonGrain(
          ctx,
          params,
          0.28,
          delaySec,
          Math.max(0.4, scale),
          'dust',
          false,
          sync.pitchMultiplier
        );
      }
      this.dustPlays++;
      if (sync.lockedToBeat) this.syncedPlays++;
      this.emitStats();
    });
    return true;
  }

  /**
   * Warm two-pass wax-crayon sweep (retained for quick beat transitions & compatibility).
   */
  public playIntroSketch(theme: ThemeMode, nowMs = performance.now()): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastIntroMs, INTRO_THROTTLE_MS)) return false;
    this.lastIntroMs = nowMs;

    const params = computeIntroSketchParams(theme);
    this.playOrResumeThen((ctx) => {
      const sync = this.resolveRhythmSync('intro', ctx);
      this.scheduleWarmCrayonGrain(
        ctx,
        params,
        0.14,
        sync.delaySec,
        0.92 * sync.gainMultiplier,
        'intro',
        true,
        sync.pitchMultiplier
      );
      this.scheduleWarmCrayonGrain(
        ctx,
        { ...params, durationSec: 0.34, centerFreqHz: Math.round(params.centerFreqHz * 1.1) },
        0.16,
        sync.delaySec + 0.34,
        0.74 * sync.gainMultiplier,
        'intro',
        true,
        sync.pitchMultiplier
      );
      this.introPlays++;
      if (sync.lockedToBeat) this.syncedPlays++;
      this.emitStats();
    });
    return true;
  }

  /**
   * Warm, continuous 4-stroke crayon sketching phrase spanning ~2.2s across slow intro choreography.
   * Gently adapts its cadence to the active background music tempo when rhythm sync is enabled.
   */
  public playIntroPhrase(
    theme: ThemeMode,
    beatIndex: number,
    nowMs = performance.now()
  ): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastIntroMs, INTRO_THROTTLE_MS)) return false;
    this.lastIntroMs = nowMs;

    const strokes = computeIntroPhraseStrokes(theme, beatIndex);
    this.stopIntroPhrase();
    this.playOrResumeThen((ctx) => {
      const sync = this.resolveRhythmSync('intro', ctx);
      const tempoMeta = this.rhythmSource?.getTempoMeta();
      const syncedDelays =
        tempoMeta && tempoMeta.syncEnabled
          ? computeTempoSyncedIntroDelays(
              strokes.map((s) => s.delaySec),
              tempoMeta.beatPeriodSec,
              tempoMeta.confidence,
              tempoMeta.syncStrength
            )
          : strokes.map((s) => s.delaySec);

      strokes.forEach((s, idx) => {
        this.scheduleWarmCrayonGrain(
          ctx,
          s.params,
          0.14,
          sync.delaySec + syncedDelays[idx],
          s.gainScale * sync.gainMultiplier,
          'intro',
          true,
          sync.pitchMultiplier
        );
      });
      this.introPlays++;
      if (sync.lockedToBeat) this.syncedPlays++;
      this.emitStats();
    }, false);
    return true;
  }

  /**
   * Rhythmic layer-by-layer crayon glide fired directly by the procedural 3D sketch animator
   * as each visual stage (grid, volume, vector, label) begins drawing in real time.
   */
  public playConstructionStroke(
    layerId: string,
    theme: ThemeMode,
    isSprite = false,
    nowMs = performance.now()
  ): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastConstructionMs, CONSTRUCTION_THROTTLE_MS)) return false;
    this.lastConstructionMs = nowMs;

    const params = computeConstructionStrokeParams(layerId, theme, isSprite);
    this.playOrResumeThen((ctx) => {
      const sync = this.resolveRhythmSync('construction', ctx);
      this.scheduleWarmCrayonGrain(
        ctx,
        params,
        0.15,
        sync.delaySec,
        0.88 * sync.gainMultiplier,
        'intro',
        true,
        sync.pitchMultiplier
      );
      this.introPlays++;
      if (sync.lockedToBeat) this.syncedPlays++;
      this.emitStats();
    }, false);
    return true;
  }

  /**
   * Light upward pencil/crayon flick played when Legends or the idle Crayón Guía callout appear.
   */
  public playAnnotationSketch(theme: ThemeMode, nowMs = performance.now()): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastAnnotationMs, ANNOTATION_THROTTLE_MS)) return false;
    this.lastAnnotationMs = nowMs;

    const params = computeAnnotationSketchParams(theme);
    this.playOrResumeThen((ctx) => {
      const sync = this.resolveRhythmSync('annotation', ctx);
      this.scheduleWarmCrayonGrain(
        ctx,
        params,
        0.14,
        sync.delaySec,
        0.92 * sync.gainMultiplier,
        'annotation',
        false,
        sync.pitchMultiplier
      );
      this.annotationPlays++;
      if (sync.lockedToBeat) this.syncedPlays++;
      this.emitStats();
    });
    return true;
  }

  public dispose(): void {
    this.disposed = true;
    this.pendingTasks = [];
    this.stopIntroPhrase();
    this.unbindGestureUnlockListeners();
    if (this.ctx) {
      this.ctx.removeEventListener('statechange', this.handleContextStateChange);
      void this.ctx.close().catch(() => {
        // Ignore close errors
      });
      this.ctx = null;
      this.masterGain = null;
      this.noiseBuffer = null;
    }
  }
}
