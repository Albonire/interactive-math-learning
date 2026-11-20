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
  unlocked: boolean;
}

export const STROKE_THROTTLE_MS = 46;
export const DUST_THROTTLE_MS = 110;

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
 * or pastel chalk brushing against dark slate.
 */
export function computeStrokeSoundParams(
  normDelta: number,
  theme: ThemeMode
): StrokeSoundParams {
  const clamped = Math.max(0.005, Math.min(1, Number.isFinite(normDelta) ? normDelta : 0.06));
  const energy = Math.pow(clamped, 0.42);
  const isChalk = theme === 'chalkboard';

  return {
    durationSec: Number((0.052 + energy * 0.056).toFixed(4)),
    bodyFreqHz: Math.round((isChalk ? 920 : 680) + energy * (isChalk ? 460 : 380)),
    centerFreqHz: Math.round((isChalk ? 2150 : 1620) + energy * (isChalk ? 1150 : 940)),
    qFactor: Number((isChalk ? 1.65 : 1.28).toFixed(2)),
    gain: Number((0.14 + energy * 0.17).toFixed(4)),
    highpassHz: isChalk ? 520 : 320,
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
    durationSec: Number((0.105 + clamped * 0.075).toFixed(4)),
    bodyFreqHz: Math.round((isChalk ? 1280 : 960) + clamped * 440),
    centerFreqHz: Math.round((isChalk ? 2950 : 2350) + clamped * 950),
    qFactor: Number((isChalk ? 1.35 : 1.15).toFixed(2)),
    gain: Number((0.17 + clamped * 0.19).toFixed(4)),
    highpassHz: isChalk ? 960 : 680,
    grainCount: clamped > 0.55 ? 3 : 2,
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
 * Procedural Web Audio synthesizer for warm wax-crayon strokes & dry paper-rustle sounds.
 * - Unlocks cleanly on user pointer/keyboard gestures and never drops the first stroke
 *   while awaiting AudioContext.resume().
 * - Uses one normalized pink-tinted cotton-paper noise buffer so drags allocate zero buffers.
 * - Immediately suspends and silences whenever muted or when Modo Eco is enabled.
 */
export class CrayonAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;
  private ecoMode = false;
  private lastStrokeMs = -1;
  private lastDustMs = -1;
  private strokePlays = 0;
  private dustPlays = 0;
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

  /**
   * Initializes the audio engine on app load, strictly honoring initial `audioEnabled`
   * and `ecoMode` flags. Binds lightweight passive user-gesture unlock hooks so the
   * Web Audio context unlocks cleanly on the very first interaction and never drops events.
   */
  public initialize(): void {
    if (this.disposed || this.initialized) return;
    this.initialized = true;
    this.bindGestureUnlockListeners();

    if (this.isActive()) {
      // Pre-create AudioContext & cotton-paper grain buffer on mount so first drag has zero latency
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
  }

  private unbindGestureUnlockListeners(): void {
    if (!this.gestureListenersBound || typeof window === 'undefined') return;
    this.gestureListenersBound = false;
    const opts: EventListenerOptions = { capture: true };
    window.removeEventListener('pointerdown', this.handleUserGesture, opts);
    window.removeEventListener('mousedown', this.handleUserGesture, opts);
    window.removeEventListener('touchstart', this.handleUserGesture, opts);
    window.removeEventListener('keydown', this.handleUserGesture, opts);
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
            // Ignore suspend errors on closed/restricted contexts
          });
      } else {
        this.emitStats();
      }
      return;
    }

    // Re-enabled (or Eco Mode disabled): ensure context is ready for the next stroke
    if (this.initialized) {
      this.ensureContext();
    }
    this.emitStats();
  }

  /**
   * Call inside any direct user activation event (pointerdown / keydown / click)
   * so browsers immediately unlock Web Audio playback before range `input` events fire.
   */
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
        // Safely ignore if browser still awaits a direct activation gesture
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
      // Discard stale events older than 600ms so resuming never replays outdated sounds
      const ageMs = now - queued.queuedAtMs;
      if (ageMs <= 600 && !this.disposed && this.isActive() && ctx.state === 'running') {
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
        this.masterGain.gain.value = 0.85;
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
   * Generates a 1.5s normalized pink-tinted noise buffer with cotton-paper fiber tooth.
   * Normalized to ~0.90 peak so gentle filter gains remain cleanly audible without clipping.
   */
  private createPaperGrainBuffer(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate || 44100;
    const length = Math.floor(sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kellet pink-noise filter + subtle organic wax-on-paper tooth modulation
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    let peak = 0.001;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;

      // Subtle paper fiber grain texture (blend pink warmth with fine crisp grit)
      const t = i / sampleRate;
      const tooth =
        0.76 +
        0.15 * Math.sin(t * 740) +
        0.09 * Math.sin(t * 1980);
      const sample = (pink * 0.82 + white * 0.32) * tooth;
      data[i] = sample;
      const absVal = Math.abs(sample);
      if (absVal > peak) peak = absVal;
    }

    // Normalize buffer to 0.90 peak for crisp, predictable gain staging
    const norm = 0.9 / peak;
    for (let i = 0; i < length; i++) {
      data[i] *= norm;
    }

    return buffer;
  }

  private scheduleDualBandGrain(
    ctx: AudioContext,
    params: StrokeSoundParams | DustSoundParams,
    pitchJitter: number,
    delaySec: number,
    gainScale: number,
    kind: 'stroke' | 'dust'
  ): void {
    if (this.disposed || !this.isActive() || !this.noiseBuffer || !this.masterGain) return;

    const now = ctx.currentTime + delaySec;
    const duration = params.durationSec;
    const gainTarget = Math.min(0.45, params.gain * gainScale);

    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    // Shared gentle highpass removes muddy sub-bass rumble
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(params.highpassHz, now);

    // Layer 1: Warm wax-on-cotton friction body
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'bandpass';
    const bodyFreq = Math.max(
      260,
      Math.min(2400, params.bodyFreqHz * (1 + (Math.random() - 0.5) * pitchJitter * 0.7))
    );
    bodyFilter.frequency.setValueAtTime(bodyFreq, now);
    bodyFilter.frequency.exponentialRampToValueAtTime(
      Math.max(220, bodyFreq * 0.88),
      now + duration
    );
    bodyFilter.Q.setValueAtTime(1.05, now);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.65, now);

    // Layer 2: Dry paper-tooth / chalk bristle rasp
    const raspFilter = ctx.createBiquadFilter();
    raspFilter.type = 'bandpass';
    const raspFreq = Math.max(
      600,
      Math.min(6400, params.centerFreqHz * (1 + (Math.random() - 0.5) * pitchJitter))
    );
    raspFilter.frequency.setValueAtTime(raspFreq, now);
    raspFilter.frequency.exponentialRampToValueAtTime(
      Math.max(520, raspFreq * 0.82),
      now + duration
    );
    raspFilter.Q.setValueAtTime(params.qFactor, now);

    const raspGain = ctx.createGain();
    raspGain.gain.setValueAtTime(kind === 'dust' ? 0.92 : 0.78, now);

    // Organic hand-stroke envelope (soft quick attack, natural wax release)
    const envGain = ctx.createGain();
    const attack = Math.min(0.011, duration * 0.2);
    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(gainTarget, now + attack);
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(highpass);
    highpass.connect(bodyFilter);
    highpass.connect(raspFilter);
    bodyFilter.connect(bodyGain);
    raspFilter.connect(raspGain);
    bodyGain.connect(envGain);
    raspGain.connect(envGain);
    envGain.connect(this.masterGain);

    const randomOffset = Math.random() * Math.max(0.05, this.noiseBuffer.duration - 0.25);
    source.start(now, randomOffset, duration + 0.02);
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
      // Queue up to 2 recent events (e.g. stroke + dust) so wake-up never drops audio
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
        const delaySec = g * 0.024 + Math.random() * 0.008;
        const scale = g === 0 ? 1.0 : 0.72 - g * 0.14;
        this.scheduleDualBandGrain(ctx, params, 0.28, delaySec, Math.max(0.35, scale), 'dust');
      }
      this.dustPlays++;
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
