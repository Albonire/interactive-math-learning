import {
  OnlineOnsetDetector,
  computeRhythmSyncAdjustment,
  computeRhythmicBandEnergy,
  computeVisualBeatPulse,
  estimateBpmFromOnsets,
  smoothBpmEstimate,
  type CrayonSyncKind,
  type RhythmSyncAdjustment,
} from './tempoDetector';
import { shouldPlayCrayonAudio, type RhythmTempoSource } from './crayonAudio';

export type StudyTrackId = 'cuaderno-78' | 'estudio-96' | 'pulso-114' | 'custom';

export interface StudyTrackPreset {
  id: Exclude<StudyTrackId, 'custom'>;
  label: string;
  subtitle: string;
  nominalBpm: number;
  chordRootsHz: number[];
  scaleOffsetSemitones: number[];
}

export const STUDY_TRACK_PRESETS: readonly StudyTrackPreset[] = [
  {
    id: 'cuaderno-78',
    label: 'Cuaderno Lento',
    subtitle: 'Lo-fi cálido · ~78 BPM',
    nominalBpm: 78,
    chordRootsHz: [174.61, 146.83, 196.0, 130.81], // F3, D3, G3, C3
    scaleOffsetSemitones: [0, 4, 7, 11],
  },
  {
    id: 'estudio-96',
    label: 'Estudio Suave',
    subtitle: 'Piano fieltro · ~96 BPM',
    nominalBpm: 96,
    chordRootsHz: [146.83, 174.61, 130.81, 164.81], // D3, F3, C3, E3
    scaleOffsetSemitones: [0, 3, 7, 10],
  },
  {
    id: 'pulso-114',
    label: 'Pulso Analítico',
    subtitle: 'Minimal rítmico · ~114 BPM',
    nominalBpm: 114,
    chordRootsHz: [164.81, 196.0, 146.83, 185.0], // E3, G3, D3, F#3
    scaleOffsetSemitones: [0, 7, 12, 14],
  },
] as const;

export interface RhythmAudioSnapshot {
  isPlaying: boolean;
  trackId: StudyTrackId;
  customTrackName: string | null;
  detectedBpm: number | null;
  confidence: number;
  beatPeriodSec: number | null;
  phaseAnchorSec: number | null;
  beatIndex: number;
  beatPulse: number;
  syncEnabled: boolean;
  syncStrength: number; // 0..1
  musicVolume: number; // 0..1
  sourceMode: 'procedural' | 'custom-file' | 'tap-tempo';
  audioBlockedReason: 'eco' | 'muted' | null;
  errorMessage: string | null;
}

export const RHYTHM_STORAGE_KEY = 'bibifold_rhythm_audio_v1';

interface StoredRhythmPrefs {
  trackId: StudyTrackId;
  syncEnabled: boolean;
  syncStrength: number;
  musicVolume: number;
}

export function loadRhythmPrefs(): StoredRhythmPrefs {
  const defaults: StoredRhythmPrefs = {
    trackId: 'estudio-96',
    syncEnabled: true,
    syncStrength: 0.58,
    musicVolume: 0.34,
  };
  try {
    if (typeof localStorage === 'undefined') return defaults;
    const raw = localStorage.getItem(RHYTHM_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoredRhythmPrefs>;
    const validTrack =
      parsed.trackId === 'cuaderno-78' ||
      parsed.trackId === 'estudio-96' ||
      parsed.trackId === 'pulso-114'
        ? parsed.trackId
        : defaults.trackId;
    return {
      trackId: validTrack,
      syncEnabled: typeof parsed.syncEnabled === 'boolean' ? parsed.syncEnabled : defaults.syncEnabled,
      syncStrength:
        typeof parsed.syncStrength === 'number' && Number.isFinite(parsed.syncStrength)
          ? Math.max(0, Math.min(1, parsed.syncStrength))
          : defaults.syncStrength,
      musicVolume:
        typeof parsed.musicVolume === 'number' && Number.isFinite(parsed.musicVolume)
          ? Math.max(0, Math.min(1, parsed.musicVolume))
          : defaults.musicVolume,
    };
  } catch {
    return defaults;
  }
}

export function saveRhythmPrefs(prefs: StoredRhythmPrefs): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const storableTrack: StudyTrackId = prefs.trackId === 'custom' ? 'estudio-96' : prefs.trackId;
    localStorage.setItem(
      RHYTHM_STORAGE_KEY,
      JSON.stringify({
        trackId: storableTrack,
        syncEnabled: prefs.syncEnabled,
        syncStrength: prefs.syncStrength,
        musicVolume: prefs.musicVolume,
      })
    );
  } catch {
    // Ignore private-mode storage errors
  }
}

/**
 * Real-time Background Music & Tempo Detection Engine.
 *
 * - Plays either a handcrafted procedural Web Audio study groove (offline-ready, zero broken URLs)
 *   OR any local audio file uploaded by the user (MP3/WAV/OGG/M4A).
 * - Routes all background music through a real Web Audio `AnalyserNode` and runs online spectral-flux
 *   onset detection + IOI tempo estimation (~25 Hz while playing, 0% CPU when paused or in Eco Mode).
 * - Supplies subtle rhythmic micro-quantization and beat-pulse envelopes to `CrayonAudioEngine`
 *   and the 3D `CrayonNibMarker` so crayon strokes subtly lock to the music's groove.
 */
export class RhythmAudioEngine implements RhythmTempoSource {
  private readonly getSharedContext: () => AudioContext | null;
  private readonly onBeatPulse?: (pulse: number, beatIndex: number) => void;

  private ctx: AudioContext | null = null;
  private musicBusGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private freqBins: Uint8Array<ArrayBuffer> | null = null;
  private brushNoiseBuffer: AudioBuffer | null = null;

  private customAudioEl: HTMLAudioElement | null = null;
  private customMediaSource: MediaElementAudioSourceNode | null = null;
  private customObjectUrl: string | null = null;
  private customTrackName: string | null = null;

  private enabled = true;
  private ecoMode = false;
  private disposed = false;

  private isPlaying = false;
  private trackId: StudyTrackId = 'estudio-96';
  private syncEnabled = true;
  private syncStrength = 0.58;
  private musicVolume = 0.34;
  private sourceMode: 'procedural' | 'custom-file' | 'tap-tempo' = 'procedural';
  private errorMessage: string | null = null;

  private readonly detector = new OnlineOnsetDetector({
    historySize: 30,
    maxOnsets: 24,
    minInterOnsetSec: 0.24,
    sensitivity: 1.42,
    minFluxFloor: 0.024,
  });

  private detectedBpm: number | null = null;
  private confidence = 0;
  private beatPeriodSec: number | null = null;
  private phaseAnchorSec: number | null = null;
  private beatIndex = 0;
  private beatPulse = 0;

  // Procedural groove lookahead scheduler state
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private analysisTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTimeSec = 0;
  private stepCounter = 0;

  private listeners = new Set<(snapshot: RhythmAudioSnapshot) => void>();

  constructor(
    getSharedContext: () => AudioContext | null,
    initialEnabled = true,
    initialEcoMode = false,
    onBeatPulse?: (pulse: number, beatIndex: number) => void
  ) {
    this.getSharedContext = getSharedContext;
    this.enabled = initialEnabled;
    this.ecoMode = initialEcoMode;
    this.onBeatPulse = onBeatPulse;

    const prefs = loadRhythmPrefs();
    this.trackId = prefs.trackId;
    this.syncEnabled = prefs.syncEnabled;
    this.syncStrength = prefs.syncStrength;
    this.musicVolume = prefs.musicVolume;
  }

  public subscribe(listener: (snapshot: RhythmAudioSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) {
      fn(snap);
    }
  }

  private isAudioAllowed(): boolean {
    return !this.disposed && shouldPlayCrayonAudio({ enabled: this.enabled, ecoMode: this.ecoMode });
  }

  public getSnapshot(): RhythmAudioSnapshot {
    const blocked: 'eco' | 'muted' | null = this.ecoMode
      ? 'eco'
      : !this.enabled
        ? 'muted'
        : null;
    return {
      isPlaying: this.isPlaying && blocked === null,
      trackId: this.trackId,
      customTrackName: this.customTrackName,
      detectedBpm: this.detectedBpm,
      confidence: this.confidence,
      beatPeriodSec: this.beatPeriodSec,
      phaseAnchorSec: this.phaseAnchorSec,
      beatIndex: this.beatIndex,
      beatPulse: this.beatPulse,
      syncEnabled: this.syncEnabled,
      syncStrength: this.syncStrength,
      musicVolume: this.musicVolume,
      sourceMode: this.sourceMode,
      audioBlockedReason: blocked,
      errorMessage: this.errorMessage,
    };
  }

  /**
   * Implements RhythmTempoSource for CrayonAudioEngine.
   */
  public getSyncAdjustment(kind: CrayonSyncKind, audioNowSec: number): RhythmSyncAdjustment {
    const active = this.isAudioAllowed() && (this.isPlaying || this.sourceMode === 'tap-tempo');
    return computeRhythmSyncAdjustment({
      nowSec: audioNowSec,
      beatPeriodSec: active ? this.beatPeriodSec : null,
      phaseAnchorSec: active ? this.phaseAnchorSec : null,
      confidence: active ? this.confidence : 0,
      syncStrength: this.syncStrength,
      syncEnabled: this.syncEnabled && active,
      kind,
    });
  }

  public getTempoMeta(): {
    beatPeriodSec: number | null;
    confidence: number;
    syncStrength: number;
    syncEnabled: boolean;
  } {
    const active = this.isAudioAllowed() && (this.isPlaying || this.sourceMode === 'tap-tempo');
    return {
      beatPeriodSec: active ? this.beatPeriodSec : null,
      confidence: active ? this.confidence : 0,
      syncStrength: this.syncStrength,
      syncEnabled: this.syncEnabled && active,
    };
  }

  public syncSettings(enabled: boolean, ecoMode: boolean): void {
    this.enabled = enabled;
    this.ecoMode = ecoMode;

    if (!this.isAudioAllowed()) {
      this.pauseInternal(false);
      this.beatPulse = 0;
      this.onBeatPulse?.(0, 0);
      this.emit();
      return;
    }

    this.applyVolume();
    this.emit();
  }

  public setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled;
    this.persistPrefs();
    this.emit();
  }

  public setSyncStrength(strength: number): void {
    this.syncStrength = Math.max(0, Math.min(1, Number.isFinite(strength) ? strength : 0.58));
    this.persistPrefs();
    this.emit();
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.34));
    this.applyVolume();
    this.persistPrefs();
    this.emit();
  }

  public selectTrack(trackId: StudyTrackId): void {
    if (trackId === 'custom' && !this.customAudioEl) return;
    const wasPlaying = this.isPlaying;
    this.trackId = trackId;
    this.sourceMode = trackId === 'custom' ? 'custom-file' : 'procedural';
    this.errorMessage = null;
    this.resetTempoEstimation();
    this.persistPrefs();

    if (wasPlaying) {
      this.pauseInternal(false);
      void this.play();
    } else {
      this.emit();
    }
  }

  /**
   * Loads a user-provided local audio file (MP3/WAV/OGG/M4A) into the real-time
   * AnalyserNode tempo pipeline and begins playback.
   */
  public async loadCustomAudioFile(file: File): Promise<boolean> {
    if (this.disposed || typeof URL === 'undefined' || typeof Audio === 'undefined') {
      return false;
    }

    const ctx = this.ensureNodes();
    if (!ctx) {
      this.errorMessage = 'El contexto de audio no está disponible.';
      this.emit();
      return false;
    }

    this.pauseInternal(false);
    this.cleanupCustomAudio();

    try {
      const url = URL.createObjectURL(file);
      const audioEl = new Audio();
      audioEl.src = url;
      audioEl.loop = true;
      audioEl.preload = 'auto';
      audioEl.crossOrigin = 'anonymous';

      const sourceNode = ctx.createMediaElementSource(audioEl);
      if (this.musicBusGain) {
        sourceNode.connect(this.musicBusGain);
      }

      this.customObjectUrl = url;
      this.customAudioEl = audioEl;
      this.customMediaSource = sourceNode;
      this.customTrackName = file.name.replace(/\.[^/.]+$/, '');
      this.trackId = 'custom';
      this.sourceMode = 'custom-file';
      this.errorMessage = null;
      this.resetTempoEstimation();

      await this.play();
      return true;
    } catch {
      this.errorMessage = 'No se pudo cargar este archivo de audio.';
      this.emit();
      return false;
    }
  }

  /**
   * Lets users tap along to external music (or refine tempo manually) so stroke sync
   * works even with music playing outside the browser.
   */
  public tapTempo(nowSec?: number): void {
    const ctx = this.ensureNodes();
    const t = nowSec ?? (ctx ? ctx.currentTime : performance.now() / 1000);

    if (!this.isPlaying && this.sourceMode !== 'tap-tempo') {
      this.sourceMode = 'tap-tempo';
      this.detector.reset();
      this.detectedBpm = null;
    }

    this.detector.pushManualOnset(t);
    const est = estimateBpmFromOnsets(this.detector.getOnsets());
    if (est.bpm !== null) {
      this.detectedBpm = est.bpm;
      this.confidence = Math.max(0.8, est.confidence);
      this.beatPeriodSec = 60 / est.bpm;
      this.phaseAnchorSec = t;
    }

    this.beatPulse = 1;
    this.beatIndex = (this.beatIndex + 1) % 4;
    this.onBeatPulse?.(1, this.beatIndex);
    this.startAnalysisLoop();
    this.emit();
  }

  public async togglePlayback(): Promise<void> {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  public async play(): Promise<boolean> {
    if (!this.isAudioAllowed()) {
      this.emit();
      return false;
    }

    const ctx = this.ensureNodes();
    if (!ctx) return false;

    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        // Ignore browser autoplay rejection until user gesture
      }
    }

    this.errorMessage = null;
    this.applyVolume();

    if (this.trackId === 'custom' && this.customAudioEl) {
      this.stopProceduralScheduler();
      this.sourceMode = 'custom-file';
      try {
        await this.customAudioEl.play();
        this.isPlaying = true;
        this.startAnalysisLoop();
        this.emit();
        return true;
      } catch {
        this.errorMessage = 'Pulsa de nuevo para iniciar la reproducción de tu audio.';
        this.isPlaying = false;
        this.emit();
        return false;
      }
    }

    // Start handcrafted procedural study groove routed into the exact same AnalyserNode
    this.sourceMode = 'procedural';
    this.isPlaying = true;
    this.stepCounter = 0;
    this.nextStepTimeSec = ctx.currentTime + 0.06;
    this.startProceduralScheduler(ctx);
    this.startAnalysisLoop();
    this.emit();
    return true;
  }

  public pause(): void {
    this.pauseInternal(true);
  }

  private pauseInternal(notify: boolean): void {
    this.isPlaying = false;
    this.stopProceduralScheduler();
    if (this.customAudioEl && !this.customAudioEl.paused) {
      try {
        this.customAudioEl.pause();
      } catch {
        // Ignore pause errors
      }
    }
    if (this.sourceMode !== 'tap-tempo') {
      this.stopAnalysisLoop();
      this.beatPulse = 0;
      this.onBeatPulse?.(0, 0);
    }
    if (notify) {
      this.emit();
    }
  }

  private resetTempoEstimation(): void {
    this.detector.reset();
    this.detectedBpm = null;
    this.confidence = 0;
    this.beatPeriodSec = null;
    this.phaseAnchorSec = null;
    this.beatIndex = 0;
    this.beatPulse = 0;
  }

  private ensureNodes(): AudioContext | null {
    if (this.disposed) return null;
    const shared = this.getSharedContext();
    if (!shared) return null;

    if (this.ctx !== shared) {
      this.ctx = shared;
      this.musicBusGain = shared.createGain();
      this.analyser = shared.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.55;
      this.freqBins = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.musicBusGain.gain.value = this.effectiveMusicGain();
      this.musicBusGain.connect(this.analyser);
      this.analyser.connect(shared.destination);

      this.brushNoiseBuffer = this.createBrushNoiseBuffer(shared);
    }

    return this.ctx;
  }

  private effectiveMusicGain(): number {
    // Keep background study music calm and seated softly behind the tactile crayon strokes
    return Number((this.musicVolume * 0.42).toFixed(4));
  }

  private applyVolume(): void {
    if (!this.musicBusGain || !this.ctx) return;
    const target = this.isAudioAllowed() ? this.effectiveMusicGain() : 0.0001;
    try {
      this.musicBusGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
    } catch {
      this.musicBusGain.gain.value = target;
    }
  }

  private createBrushNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const sr = ctx.sampleRate || 44100;
    const len = Math.floor(sr * 0.25);
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      lp = lp * 0.65 + w * 0.35;
      data[i] = (w - lp * 0.45) * 0.65;
    }
    return buf;
  }

  private getCurrentPreset(): StudyTrackPreset {
    return (
      STUDY_TRACK_PRESETS.find((p) => p.id === this.trackId) ?? STUDY_TRACK_PRESETS[1]
    );
  }

  private startProceduralScheduler(ctx: AudioContext): void {
    this.stopProceduralScheduler();
    const lookaheadMs = 45;
    const scheduleAheadSec = 0.14;

    const tick = () => {
      if (this.disposed || !this.isPlaying || !this.isAudioAllowed() || !this.musicBusGain) {
        return;
      }
      const preset = this.getCurrentPreset();
      const beatSec = 60 / preset.nominalBpm;
      const eighthSec = beatSec / 2;

      while (this.nextStepTimeSec < ctx.currentTime + scheduleAheadSec) {
        this.scheduleProceduralEighthStep(ctx, preset, this.stepCounter, this.nextStepTimeSec, beatSec);
        this.nextStepTimeSec += eighthSec;
        this.stepCounter = (this.stepCounter + 1) % 32;
      }
    };

    tick();
    this.schedulerTimer = setInterval(tick, lookaheadMs);
  }

  private stopProceduralScheduler(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /**
   * Synthesizes a warm, low-CPU acoustic study groove (soft felt-kick, wooden brush tick,
   * and warm electric-piano chords) routed straight through the AnalyserNode so the real
   * onset/tempo detector measures its pulse organically.
   */
  private scheduleProceduralEighthStep(
    ctx: AudioContext,
    preset: StudyTrackPreset,
    step: number,
    when: number,
    beatSec: number
  ): void {
    if (!this.musicBusGain) return;
    const stepInBar = step % 8; // 8 eighth-notes per 4/4 bar
    const barIdx = Math.floor(step / 8) % preset.chordRootsHz.length;

    // 1. Soft felt kick pulse on beats 1, 2, 3, 4 (emphasized on 1 & 3 so onset detector locks crisply)
    if (stepInBar % 2 === 0) {
      const isDownbeat = stepInBar === 0 || stepInBar === 4;
      this.scheduleSoftKick(ctx, when, isDownbeat ? 0.56 : 0.34);
    }

    // 2. Delicate wooden brush / shaker whisper on off-beats and beats 2 & 4
    if (stepInBar === 2 || stepInBar === 6) {
      this.scheduleBrushTick(ctx, when, 0.16, 2600);
    } else if (stepInBar % 2 === 1) {
      this.scheduleBrushTick(ctx, when, 0.065, 4100);
    }

    // 3. Warm felt-piano chord pad on bar downbeat (stepInBar === 0)
    if (stepInBar === 0) {
      const rootHz = preset.chordRootsHz[barIdx];
      this.scheduleFeltChord(ctx, rootHz, preset.scaleOffsetSemitones, when, beatSec * 3.7);
    }
  }

  private scheduleSoftKick(ctx: AudioContext, when: number, level: number): void {
    if (!this.musicBusGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(118, when);
    osc.frequency.exponentialRampToValueAtTime(46, when + 0.11);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(level, when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);

    osc.connect(gain);
    gain.connect(this.musicBusGain);
    osc.start(when);
    osc.stop(when + 0.2);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private scheduleBrushTick(ctx: AudioContext, when: number, level: number, freqHz: number): void {
    if (!this.musicBusGain || !this.brushNoiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.brushNoiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freqHz, when);
    filter.Q.setValueAtTime(1.4, when);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(level, when + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.075);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBusGain);
    src.start(when, 0, 0.09);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  private scheduleFeltChord(
    ctx: AudioContext,
    rootHz: number,
    semitones: number[],
    when: number,
    durationSec: number
  ): void {
    if (!this.musicBusGain) return;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(980, when);
    filter.frequency.exponentialRampToValueAtTime(520, when + durationSec);

    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0.0001, when);
    chordGain.gain.linearRampToValueAtTime(0.11, when + 0.09);
    chordGain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

    filter.connect(chordGain);
    chordGain.connect(this.musicBusGain);

    const voices: OscillatorNode[] = [];
    for (let i = 0; i < semitones.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sine';
      const freq = rootHz * Math.pow(2, semitones[i] / 12);
      osc.frequency.setValueAtTime(freq, when);
      osc.connect(filter);
      osc.start(when);
      osc.stop(when + durationSec + 0.04);
      voices.push(osc);
    }

    const lastVoice = voices[voices.length - 1];
    if (lastVoice) {
      lastVoice.onended = () => {
        for (const v of voices) v.disconnect();
        filter.disconnect();
        chordGain.disconnect();
      };
    }
  }

  private startAnalysisLoop(): void {
    if (this.analysisTimer !== null) return;
    // Lightweight ~25 Hz real-time spectral flux analysis & visual pulse tick
    this.analysisTimer = setInterval(() => {
      this.stepAnalysisFrame();
    }, 40);
  }

  private stopAnalysisLoop(): void {
    if (this.analysisTimer !== null) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }

  /**
   * Executes one real-time analysis frame (also callable deterministically in tests).
   */
  public stepAnalysisFrame(explicitNowSec?: number): void {
    if (this.disposed || !this.isAudioAllowed()) return;
    const nowSec = explicitNowSec ?? (this.ctx ? this.ctx.currentTime : performance.now() / 1000);

    if (this.isPlaying && this.analyser && this.freqBins && this.ctx) {
      this.analyser.getByteFrequencyData(this.freqBins);
      const energy = computeRhythmicBandEnergy(
        this.freqBins,
        this.ctx.sampleRate || 44100,
        this.analyser.fftSize || 1024
      );
      const frame = this.detector.pushFrame(energy.composite, nowSec);
      if (frame.isOnset) {
        const est = estimateBpmFromOnsets(this.detector.getOnsets());
        if (est.bpm !== null) {
          this.detectedBpm = smoothBpmEstimate(this.detectedBpm, est.bpm, est.confidence);
          this.confidence = est.confidence;
          this.beatPeriodSec = this.detectedBpm ? 60 / this.detectedBpm : est.beatPeriodSec;
          this.phaseAnchorSec = est.phaseAnchorSec;
        }
      }
    }

    const visual = computeVisualBeatPulse(
      nowSec,
      this.beatPeriodSec,
      this.phaseAnchorSec,
      this.confidence
    );
    const pulseChanged =
      Math.abs(visual.pulse - this.beatPulse) > 0.04 || visual.beatIndex !== this.beatIndex;
    this.beatPulse = visual.pulse;
    this.beatIndex = visual.beatIndex;
    this.onBeatPulse?.(visual.pulse, visual.beatIndex);

    if (pulseChanged) {
      this.emit();
    }
  }

  private persistPrefs(): void {
    saveRhythmPrefs({
      trackId: this.trackId,
      syncEnabled: this.syncEnabled,
      syncStrength: this.syncStrength,
      musicVolume: this.musicVolume,
    });
  }

  private cleanupCustomAudio(): void {
    if (this.customAudioEl) {
      try {
        this.customAudioEl.pause();
        this.customAudioEl.src = '';
      } catch {
        // Ignore cleanup errors
      }
      this.customAudioEl = null;
    }
    if (this.customMediaSource) {
      try {
        this.customMediaSource.disconnect();
      } catch {
        // Ignore
      }
      this.customMediaSource = null;
    }
    if (this.customObjectUrl && typeof URL !== 'undefined') {
      URL.revokeObjectURL(this.customObjectUrl);
      this.customObjectUrl = null;
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.pauseInternal(false);
    this.stopAnalysisLoop();
    this.cleanupCustomAudio();
    this.listeners.clear();
    if (this.musicBusGain) {
      try {
        this.musicBusGain.disconnect();
      } catch {
        // Ignore
      }
      this.musicBusGain = null;
    }
    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {
        // Ignore
      }
      this.analyser = null;
    }
    this.ctx = null;
  }
}
