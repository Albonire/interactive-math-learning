import type { ThemeMode } from '../core/types';

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

export interface CrayonAudioStats {
  state: string;
  strokePlays: number;
  dustPlays: number;
  introPlays: number;
  annotationPlays: number;
  unlocked: boolean;
}

export const STROKE_THROTTLE_MS = 48;
export const DUST_THROTTLE_MS = 115;
export const INTRO_THROTTLE_MS = 220;
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
    durationSec: Number((0.085 + energy * 0.06).toFixed(4)),
    bodyFreqHz: Math.round((isChalk ? 980 : 720) + energy * (isChalk ? 420 : 340)),
    centerFreqHz: Math.round((isChalk ? 2350 : 1780) + energy * (isChalk ? 980 : 780)),
    qFactor: Number((isChalk ? 1.15 : 0.92).toFixed(2)),
    gain: Number((0.28 + energy * 0.22).toFixed(4)),
    highpassHz: isChalk ? 460 : 280,
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
    durationSec: Number((0.125 + clamped * 0.075).toFixed(4)),
    bodyFreqHz: Math.round((isChalk ? 1320 : 980) + clamped * 400),
    centerFreqHz: Math.round((isChalk ? 3050 : 2420) + clamped * 860),
    qFactor: Number((isChalk ? 1.05 : 0.88).toFixed(2)),
    gain: Number((0.3 + clamped * 0.22).toFixed(4)),
    highpassHz: isChalk ? 780 : 540,
    grainCount: clamped > 0.55 ? 3 : 2,
  };
}

/**
 * Computes parameters for a sweeping artisanal crayon sketch stroke during lesson intro animations.
 */
export function computeIntroSketchParams(theme: ThemeMode): StrokeSoundParams {
  const isChalk = theme === 'chalkboard';
  return {
    durationSec: 0.21,
    bodyFreqHz: isChalk ? 1040 : 760,
    centerFreqHz: isChalk ? 2450 : 1860,
    qFactor: isChalk ? 1.05 : 0.85,
    gain: 0.36,
    highpassHz: isChalk ? 440 : 260,
  };
}

/**
 * Computes parameters for a delicate short pencil/crayon flick when Legends or Crayón Guía appear.
 */
export function computeAnnotationSketchParams(theme: ThemeMode): StrokeSoundParams {
  const isChalk = theme === 'chalkboard';
  return {
    durationSec: 0.135,
    bodyFreqHz: isChalk ? 1220 : 880,
    centerFreqHz: isChalk ? 2800 : 2180,
    qFactor: isChalk ? 1.15 : 0.95,
    gain: 0.34,
    highpassHz: isChalk ? 560 : 340,
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
 *   crayon dust, intro sketch sweeps, and legend/guide callout flicks).
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
  private lastAnnotationMs = -1;
  private strokePlays = 0;
  private dustPlays = 0;
  private introPlays = 0;
  private annotationPlays = 0;
  private initialized = false;
  private disposed = false;
  private resumePromise: Promise<void> | null = null;
  private pendingTasks: Array<{ run: (ctx: AudioContext) => void; queuedAtMs: number }> = [];
  private gestureListenersBound = false;
  private onStatsChange?: (stats: CrayonAudioStats) => void;

  private readonly handleUserGesture = () => {
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

  public getStats(): CrayonAudioStats {
    const state = this.ctx ? this.ctx.state : 'uninitialized';
    return {
      state,
      strokePlays: this.strokePlays,
      dustPlays: this.dustPlays,
      introPlays: this.introPlays,
      annotationPlays: this.annotationPlays,
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

  public syncSettings(enabled: boolean, ecoMode: boolean): void {
    this.enabled = enabled;
    this.ecoMode = ecoMode;

    if (!this.isActive()) {
      this.pendingTasks = [];
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
   * Generates a 1.6s cotton-paper & dry-wax friction noise buffer normalized by RMS (~0.32 RMS)
   * with rich mid/high-mid grain so gentle filter gains sound genuinely tactile on laptop speakers.
   */
  private createPaperGrainBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * 1.6);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let prevWhite = 0;
    let sumSq = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Warm mid-focused pink component + crisp differentiated paper-tooth grit
      b0 = 0.96 * b0 + white * 0.14;
      b1 = 0.84 * b1 + white * 0.28;
      b2 = 0.52 * b2 + white * 0.48;
      const grit = white - prevWhite * 0.65;
      prevWhite = white;

      // Subtle paper fiber weave modulation so sustained strokes feel organic, not static hiss
      const t = i / sampleRate;
      const weave = 0.78 + 0.14 * Math.sin(t * 210) + 0.08 * Math.sin(t * 890);
      const sample = (b0 * 0.55 + b1 * 0.72 + b2 * 0.65 + grit * 0.42) * weave;
      data[i] = sample;
      sumSq += sample * sample;
    }

    // RMS-normalize to 0.34 RMS with soft limiting at +-0.96 for crisp, warm audibility
    const rms = Math.sqrt(sumSq / Math.max(1, length)) || 0.001;
    const scale = 0.34 / rms;
    for (let i = 0; i < length; i++) {
      const v = data[i] * scale;
      data[i] = Math.tanh(v * 0.92);
    }

    return buffer;
  }

  private scheduleDualBandGrain(
    ctx: AudioContext,
    params: StrokeSoundParams | DustSoundParams,
    pitchJitter: number,
    delaySec: number,
    gainScale: number,
    kind: 'stroke' | 'dust' | 'intro' | 'annotation'
  ): void {
    if (this.disposed || !this.isActive() || !this.noiseBuffer || !this.masterGain) return;

    const now = ctx.currentTime + delaySec;
    const duration = params.durationSec;
    const gainTarget = Math.min(0.62, params.gain * gainScale);

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(params.highpassHz, now);

    // Layer 1: Warm wax-on-paper friction body
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    const bodyFreq = Math.max(
      260,
      Math.min(2600, params.bodyFreqHz * (1 + (Math.random() - 0.5) * pitchJitter * 0.6))
    );
    bodyFilter.frequency.setValueAtTime(bodyFreq, now);
    bodyFilter.frequency.exponentialRampToValueAtTime(
      Math.max(220, bodyFreq * (kind === 'annotation' ? 1.12 : 0.86)),
      now + duration
    );
    bodyFilter.Q.setValueAtTime(0.85, now);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.95, now);

    // Layer 2: Dry cotton-paper / chalk bristle tooth
    const raspFilter = ctx.createBiquadFilter();
    raspFilter.type = 'bandpass';
    const raspFreq = Math.max(
      620,
      Math.min(6200, params.centerFreqHz * (1 + (Math.random() - 0.5) * pitchJitter))
    );
    raspFilter.frequency.setValueAtTime(raspFreq, now);
    raspFilter.frequency.exponentialRampToValueAtTime(
      Math.max(520, raspFreq * (kind === 'annotation' ? 1.18 : 0.82)),
      now + duration
    );
    raspFilter.Q.setValueAtTime(params.qFactor, now);

    const raspGain = ctx.createGain();
    raspGain.gain.setValueAtTime(kind === 'dust' ? 1.15 : 0.98, now);

    // Organic hand-stroke envelope (smooth swell, warm dry release)
    const envGain = ctx.createGain();
    const attack = Math.min(0.018, duration * 0.22);
    const holdEnd = now + Math.max(attack + 0.008, duration * 0.42);
    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(gainTarget, now + attack);
    envGain.gain.setValueAtTime(gainTarget * 0.82, holdEnd);
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(highpass);
    highpass.connect(bodyFilter);
    highpass.connect(raspFilter);
    bodyFilter.connect(bodyGain);
    raspFilter.connect(raspGain);
    bodyGain.connect(envGain);
    raspGain.connect(envGain);
    envGain.connect(this.masterGain);

    const randomOffset = Math.random() * Math.max(0.05, this.noiseBuffer.duration - 0.3);
    source.start(now, randomOffset, duration + 0.025);
    source.onended = () => {
      source.disconnect();
      highpass.disconnect();
      bodyFilter.disconnect();
      raspFilter.disconnect();
      bodyGain.disconnect();
      raspGain.disconnect();
      envGain.disconnect();
    };
  }

  private playOrResumeThen(task: (ctx: AudioContext) => void): void {
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
      this.triggerResume(ctx);
    }
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
      this.scheduleDualBandGrain(ctx, params, 0.2, 0, 1.0, 'stroke');
      this.strokePlays++;
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
      for (let g = 0; g < params.grainCount; g++) {
        const delaySec = g * 0.028 + Math.random() * 0.008;
        const scale = g === 0 ? 1.0 : 0.78 - g * 0.14;
        this.scheduleDualBandGrain(ctx, params, 0.28, delaySec, Math.max(0.4, scale), 'dust');
      }
      this.dustPlays++;
      this.emitStats();
    });
    return true;
  }

  /**
   * Gentle two-pass wax-crayon sweep played when an animated lesson intro beat choreographs the 3D graph.
   */
  public playIntroSketch(theme: ThemeMode, nowMs = performance.now()): boolean {
    if (!this.isActive()) return false;
    if (!canTriggerAudioAt(nowMs, this.lastIntroMs, INTRO_THROTTLE_MS)) return false;
    this.lastIntroMs = nowMs;

    const params = computeIntroSketchParams(theme);
    this.playOrResumeThen((ctx) => {
      this.scheduleDualBandGrain(ctx, params, 0.16, 0, 0.95, 'intro');
      this.scheduleDualBandGrain(
        ctx,
        { ...params, durationSec: 0.145, centerFreqHz: Math.round(params.centerFreqHz * 1.12) },
        0.18,
        0.13,
        0.72,
        'intro'
      );
      this.introPlays++;
      this.emitStats();
    });
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
      this.scheduleDualBandGrain(ctx, params, 0.14, 0, 0.92, 'annotation');
      this.annotationPlays++;
      this.emitStats();
    });
    return true;
  }

  public dispose(): void {
    this.disposed = true;
    this.pendingTasks = [];
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
