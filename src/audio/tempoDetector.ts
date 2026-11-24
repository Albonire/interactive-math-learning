/**
 * Pure DSP & rhythmic quantization math for real-time tempo detection and
 * subtle crayon-stroke synchronization with background study music.
 *
 * Intentionally DOM- and WebAudio-free so every algorithm is deterministic
 * and unit-testable under node:test.
 */

export type CrayonSyncKind = 'stroke' | 'dust' | 'intro' | 'construction' | 'annotation';

export interface RhythmicBandEnergy {
  lowEnergy: number;
  transientEnergy: number;
  composite: number;
}

export interface OnsetFrameResult {
  isOnset: boolean;
  strength: number;
  threshold: number;
  onsetCount: number;
}

export interface TempoEstimate {
  bpm: number | null;
  confidence: number;
  beatPeriodSec: number | null;
  phaseAnchorSec: number | null;
}

export interface RhythmSyncInput {
  nowSec: number;
  beatPeriodSec: number | null;
  phaseAnchorSec: number | null;
  confidence: number;
  syncStrength: number; // 0..1
  syncEnabled: boolean;
  kind: CrayonSyncKind;
}

export interface RhythmSyncAdjustment {
  delaySec: number;
  gainMultiplier: number;
  pitchMultiplier: number;
  beatPhase: number; // 0..1 within current beat
  beatIndex: number; // 0..3 bar beat indicator
  lockedToBeat: boolean;
}

export const MIN_MUSICAL_BPM = 64;
export const MAX_MUSICAL_BPM = 156;
export const MIN_INTER_ONSET_SEC = 0.24; // Prevents double-triggering up to ~250 BPM
export const MAX_INTERACTIVE_DELAY_SEC = 0.038; // <= 38ms keeps slider drags snappy
export const MAX_CONSTRUCTION_DELAY_SEC = 0.105; // <= 105ms lets 3D sketch glides breathe on beat

/**
 * Extracts rhythmic energy from an AnalyserNode byte frequency spectrum:
 * - Low band (45Hz–210Hz): kick drum / warm bass pulse
 * - Percussive transient band (1.4kHz–4.8kHz): brush snare / hi-hat ticks
 */
export function computeRhythmicBandEnergy(
  frequencyBins: Uint8Array,
  sampleRate: number,
  fftSize: number
): RhythmicBandEnergy {
  if (frequencyBins.length === 0 || sampleRate <= 0 || fftSize <= 0) {
    return { lowEnergy: 0, transientEnergy: 0, composite: 0 };
  }

  const binHz = sampleRate / fftSize;
  const maxIdx = frequencyBins.length - 1;

  const lowStart = Math.max(1, Math.floor(45 / binHz));
  const lowEnd = Math.min(maxIdx, Math.max(lowStart, Math.ceil(210 / binHz)));

  const transStart = Math.max(lowEnd + 1, Math.floor(1400 / binHz));
  const transEnd = Math.min(maxIdx, Math.max(transStart, Math.ceil(4800 / binHz)));

  let lowSum = 0;
  let lowCount = 0;
  for (let i = lowStart; i <= lowEnd; i++) {
    const norm = frequencyBins[i] / 255;
    lowSum += norm * norm;
    lowCount++;
  }

  let transSum = 0;
  let transCount = 0;
  for (let i = transStart; i <= transEnd; i++) {
    const norm = frequencyBins[i] / 255;
    transSum += norm * norm;
    transCount++;
  }

  const lowEnergy = lowCount > 0 ? Math.sqrt(lowSum / lowCount) : 0;
  const transientEnergy = transCount > 0 ? Math.sqrt(transSum / transCount) : 0;
  const composite = lowEnergy * 0.72 + transientEnergy * 0.28;

  return { lowEnergy, transientEnergy, composite };
}

/**
 * Streaming adaptive onset detector using positive energy flux and a rolling
 * local mean + deviation threshold with a refractory dead-time window.
 */
export class OnlineOnsetDetector {
  private readonly historySize: number;
  private readonly maxOnsets: number;
  private readonly minInterOnsetSec: number;
  private readonly sensitivity: number;
  private readonly minFluxFloor: number;

  private fluxHistory: number[] = [];
  private prevEnergy = 0;
  private hasPrev = false;
  private lastOnsetSec = -Infinity;
  private onsets: number[] = [];

  constructor(options?: {
    historySize?: number;
    maxOnsets?: number;
    minInterOnsetSec?: number;
    sensitivity?: number;
    minFluxFloor?: number;
  }) {
    this.historySize = options?.historySize ?? 32;
    this.maxOnsets = options?.maxOnsets ?? 24;
    this.minInterOnsetSec = options?.minInterOnsetSec ?? MIN_INTER_ONSET_SEC;
    this.sensitivity = options?.sensitivity ?? 1.48;
    this.minFluxFloor = options?.minFluxFloor ?? 0.032;
  }

  public reset(): void {
    this.fluxHistory = [];
    this.prevEnergy = 0;
    this.hasPrev = false;
    this.lastOnsetSec = -Infinity;
    this.onsets = [];
  }

  public getOnsets(): readonly number[] {
    return this.onsets;
  }

  public pushManualOnset(timeSec: number): void {
    if (!Number.isFinite(timeSec)) return;
    if (this.onsets.length > 0 && timeSec - this.onsets[this.onsets.length - 1] > 2.5) {
      this.onsets = [];
    }
    this.onsets.push(timeSec);
    if (this.onsets.length > this.maxOnsets) {
      this.onsets.shift();
    }
    this.lastOnsetSec = timeSec;
  }

  public pushFrame(energy: number, timeSec: number): OnsetFrameResult {
    const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;
    const flux = this.hasPrev ? Math.max(0, safeEnergy - this.prevEnergy) : 0;
    this.prevEnergy = safeEnergy;
    this.hasPrev = true;

    // Compute adaptive threshold from prior rolling flux before appending current sample
    let mean = 0;
    if (this.fluxHistory.length > 0) {
      for (let i = 0; i < this.fluxHistory.length; i++) {
        mean += this.fluxHistory[i];
      }
      mean /= this.fluxHistory.length;
    }

    let variance = 0;
    if (this.fluxHistory.length > 1) {
      for (let i = 0; i < this.fluxHistory.length; i++) {
        const diff = this.fluxHistory[i] - mean;
        variance += diff * diff;
      }
      variance /= this.fluxHistory.length;
    }
    const stdDev = Math.sqrt(variance);
    const threshold = Math.max(this.minFluxFloor, mean * this.sensitivity + stdDev * 0.45);

    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > this.historySize) {
      this.fluxHistory.shift();
    }

    const canFire = timeSec - this.lastOnsetSec >= this.minInterOnsetSec;
    const isOnset = this.fluxHistory.length >= 4 && canFire && flux > threshold;

    if (isOnset) {
      this.lastOnsetSec = timeSec;
      this.onsets.push(timeSec);
      if (this.onsets.length > this.maxOnsets) {
        this.onsets.shift();
      }
    }

    const strength = threshold > 0 ? Math.min(1, flux / (threshold * 2.1)) : 0;
    return {
      isOnset,
      strength,
      threshold,
      onsetCount: this.onsets.length,
    };
  }
}

/**
 * Folds an arbitrary tempo candidate into the comfortable musical range [minBpm, maxBpm]
 * by halving or doubling octaves.
 */
export function foldBpmToMusicalRange(
  rawBpm: number,
  minBpm = MIN_MUSICAL_BPM,
  maxBpm = MAX_MUSICAL_BPM
): number | null {
  if (!Number.isFinite(rawBpm) || rawBpm <= 10) return null;
  let bpm = rawBpm;
  let guard = 0;
  while (bpm < minBpm && guard < 6) {
    bpm *= 2;
    guard++;
  }
  while (bpm > maxBpm && guard < 12) {
    bpm /= 2;
    guard++;
  }
  if (bpm < minBpm || bpm > maxBpm) return null;
  return bpm;
}

/**
 * Estimates tempo (BPM), confidence (0..1), beat period, and phase anchor from
 * recent onset timestamps via Gaussian kernel voting over 1st- and 2nd-order IOIs.
 */
export function estimateBpmFromOnsets(
  onsetsSec: readonly number[],
  options?: { minBpm?: number; maxBpm?: number }
): TempoEstimate {
  const minBpm = options?.minBpm ?? MIN_MUSICAL_BPM;
  const maxBpm = options?.maxBpm ?? MAX_MUSICAL_BPM;

  if (onsetsSec.length < 3) {
    return { bpm: null, confidence: 0, beatPeriodSec: null, phaseAnchorSec: null };
  }

  const samples: Array<{ bpm: number; weight: number }> = [];

  for (let i = 1; i < onsetsSec.length; i++) {
    const dt1 = onsetsSec[i] - onsetsSec[i - 1];
    // Recency weighting favors current musical phrase
    const recency = 0.55 + 0.45 * (i / (onsetsSec.length - 1));

    if (dt1 >= 0.22 && dt1 <= 2.2) {
      const folded = foldBpmToMusicalRange(60 / dt1, minBpm, maxBpm);
      if (folded !== null) {
        samples.push({ bpm: folded, weight: 1.0 * recency });
      }
    }

    if (i >= 2) {
      const dt2 = onsetsSec[i] - onsetsSec[i - 2];
      if (dt2 >= 0.44 && dt2 <= 3.6) {
        const folded2 = foldBpmToMusicalRange(120 / dt2, minBpm, maxBpm);
        if (folded2 !== null) {
          samples.push({ bpm: folded2, weight: 0.45 * recency });
        }
      }
    }
  }

  if (samples.length < 2) {
    return { bpm: null, confidence: 0, beatPeriodSec: null, phaseAnchorSec: null };
  }

  const totalWeight = samples.reduce((acc, s) => acc + s.weight, 0);
  // Scale-invariant relative kernel (~4.8% tolerance) handles constant frame-quantization
  // jitter uniformly across slow (70 BPM) and brisk (130+ BPM) tempos.
  const sigmaRel = 0.048;
  const twoSigmaRelSq = 2 * sigmaRel * sigmaRel;

  let bestBpm = minBpm;
  let bestScore = -1;

  for (let cand = minBpm; cand <= maxBpm; cand += 0.5) {
    let score = 0;
    for (let j = 0; j < samples.length; j++) {
      const relDiff = (samples[j].bpm - cand) / cand;
      score += samples[j].weight * Math.exp(-(relDiff * relDiff) / twoSigmaRelSq);
    }
    if (score > bestScore) {
      bestScore = score;
      bestBpm = cand;
    }
  }

  // Refine estimate with symmetric Gaussian-weighted mean around bestBpm
  let refinedSum = 0;
  let refinedWeight = 0;
  for (const s of samples) {
    const relDiff = (s.bpm - bestBpm) / bestBpm;
    if (Math.abs(relDiff) <= 0.085) {
      const w = s.weight * Math.exp(-(relDiff * relDiff) / twoSigmaRelSq);
      refinedSum += s.bpm * w;
      refinedWeight += w;
    }
  }

  const finalBpm = refinedWeight > 0 ? Number((refinedSum / refinedWeight).toFixed(1)) : bestBpm;
  const coherence = totalWeight > 0 ? bestScore / totalWeight : 0;
  const sampleReadiness = Math.min(1, (onsetsSec.length - 2) / 5);
  const confidence = Number(Math.max(0, Math.min(1, coherence * sampleReadiness)).toFixed(3));
  const beatPeriodSec = 60 / finalBpm;

  // Estimate phase anchor modulo beatPeriodSec via circular mean of recent onsets
  let sinSum = 0;
  let cosSum = 0;
  const recentStart = Math.max(0, onsetsSec.length - 8);
  for (let i = recentStart; i < onsetsSec.length; i++) {
    const phase = ((onsetsSec[i] % beatPeriodSec) + beatPeriodSec) % beatPeriodSec;
    const angle = (phase / beatPeriodSec) * Math.PI * 2;
    sinSum += Math.sin(angle);
    cosSum += Math.cos(angle);
  }
  const meanAngle = Math.atan2(sinSum, cosSum);
  const normPhase = ((meanAngle / (Math.PI * 2)) + 1) % 1;
  const latest = onsetsSec[onsetsSec.length - 1];
  const latestBarStart = Math.floor(latest / beatPeriodSec) * beatPeriodSec;
  const phaseAnchorSec = latestBarStart + normPhase * beatPeriodSec;

  return {
    bpm: finalBpm,
    confidence,
    beatPeriodSec,
    phaseAnchorSec,
  };
}

/**
 * Smooths BPM changes exponentially so the live readout and rhythmic grid
 * glide naturally without jittering.
 */
export function smoothBpmEstimate(
  prevBpm: number | null,
  nextBpm: number | null,
  confidence: number
): number | null {
  if (nextBpm === null || !Number.isFinite(nextBpm)) return prevBpm;
  if (prevBpm === null || !Number.isFinite(prevBpm)) return Number(nextBpm.toFixed(1));

  // Reject sudden octave/noise outliers unless confidence is strong
  const delta = Math.abs(nextBpm - prevBpm);
  if (delta > 16 && confidence < 0.72) {
    return prevBpm;
  }

  const alpha = Math.max(0.12, Math.min(0.42, confidence * 0.45));
  return Number((prevBpm + (nextBpm - prevBpm) * alpha).toFixed(1));
}

/**
 * Computes subtle timing, volume, and timbre sync adjustments for a crayon stroke
 * against the active musical beat grid.
 *
 * Design principle: NEVER make interactive controls feel laggy.
 * - Interactive strokes ('stroke', 'dust', 'annotation') cap lookahead delay to <= 38ms.
 * - Procedural 3D construction & intro glides cap lookahead delay to <= 105ms.
 * - Downbeat proximity imparts a warm tactile swell (+6–10%) and crisp paper-tooth lift.
 */
export function computeRhythmSyncAdjustment(input: RhythmSyncInput): RhythmSyncAdjustment {
  const neutral: RhythmSyncAdjustment = {
    delaySec: 0,
    gainMultiplier: 1,
    pitchMultiplier: 1,
    beatPhase: 0,
    beatIndex: 0,
    lockedToBeat: false,
  };

  if (
    !input.syncEnabled ||
    input.syncStrength <= 0.01 ||
    input.beatPeriodSec === null ||
    input.phaseAnchorSec === null ||
    !Number.isFinite(input.beatPeriodSec) ||
    input.beatPeriodSec <= 0.2 ||
    input.confidence < 0.35
  ) {
    return neutral;
  }

  const strength = Math.max(0, Math.min(1, input.syncStrength)) * Math.min(1, input.confidence * 1.18);
  const elapsedBeats = (input.nowSec - input.phaseAnchorSec) / input.beatPeriodSec;
  const beatPhase = ((elapsedBeats % 1) + 1) % 1;
  const beatIndex = ((Math.floor(elapsedBeats) % 4) + 4) % 4;

  // Interactive drags snap gently to a fine 1/4-beat (sixteenth) or 1/2-beat (eighth) micro-grid;
  // construction & intro strokes align gently to 1/2-beat (eighth-note) pulses.
  const isInteractive =
    input.kind === 'stroke' || input.kind === 'dust' || input.kind === 'annotation';
  const subdivisions = isInteractive ? 4 : 2;
  const subPeriodSec = input.beatPeriodSec / subdivisions;
  const subPhase = ((elapsedBeats * subdivisions) % 1 + 1) % 1;

  // Time remaining until next subdivision boundary
  const timeToNextGridSec = (1 - subPhase) * subPeriodSec;
  const maxDelay = isInteractive ? MAX_INTERACTIVE_DELAY_SEC : MAX_CONSTRUCTION_DELAY_SEC;

  // Pull lightly toward the next subdivision only if it falls comfortably within the lookahead window
  let delaySec = 0;
  if (timeToNextGridSec <= maxDelay * 1.35 && subPhase > 0.14) {
    delaySec = Math.min(maxDelay, timeToNextGridSec * (0.45 + 0.55 * strength));
  }

  // Compute effective landing phase after micro-quantization
  const landedBeats = (input.nowSec + delaySec - input.phaseAnchorSec) / input.beatPeriodSec;
  const landedPhase = ((landedBeats % 1) + 1) % 1;
  const distToBeat = Math.min(landedPhase, 1 - landedPhase); // 0 at exact beat, 0.5 at off-beat
  const pulseCos = Math.cos(distToBeat * Math.PI * 2); // +1 on beat, -1 on off-beat
  const downbeatBoost = beatIndex === 0 ? 0.03 : 0;

  // Warm tactile breathing: subtle gain accent on beats + soft harmonic paper-tooth lift
  const gainMultiplier = Number(
    Math.max(0.92, Math.min(1.12, 1 + (pulseCos * 0.065 + downbeatBoost) * strength)).toFixed(4)
  );
  const pitchMultiplier = Number(
    Math.max(0.96, Math.min(1.06, 1 + pulseCos * 0.035 * strength)).toFixed(4)
  );

  return {
    delaySec: Number(delaySec.toFixed(4)),
    gainMultiplier,
    pitchMultiplier,
    beatPhase: Number(landedPhase.toFixed(4)),
    beatIndex,
    lockedToBeat: true,
  };
}

/**
 * Gently aligns the 4-stroke Lesson Intro phrase timing toward musical half-beat / beat
 * steps of the detected background tempo so slow sketching flows naturally with the groove.
 */
export function computeTempoSyncedIntroDelays(
  baseDelaysSec: readonly number[],
  beatPeriodSec: number | null,
  confidence: number,
  syncStrength: number
): number[] {
  if (
    baseDelaysSec.length === 0 ||
    beatPeriodSec === null ||
    !Number.isFinite(beatPeriodSec) ||
    beatPeriodSec <= 0.25 ||
    confidence < 0.35 ||
    syncStrength <= 0.01
  ) {
    return [...baseDelaysSec];
  }

  const blend = Math.max(0, Math.min(1, syncStrength)) * Math.min(1, confidence * 1.1);
  // Target 1 beat per stroke (clamped to keep intro phrase duration pleasant ~1.4s..2.5s)
  const clampedBeat = Math.max(0.42, Math.min(0.78, beatPeriodSec));

  return baseDelaysSec.map((baseDelay, idx) => {
    if (idx === 0) return 0;
    const musicalTarget = idx * clampedBeat;
    const blended = baseDelay + (musicalTarget - baseDelay) * (0.65 * blend);
    return Number(Math.max(0, blended).toFixed(3));
  });
}

/**
 * Computes a smooth decaying 0..1 visual beat pulse scalar for the 3D crayon nib
 * contact ring and the subtle sketchbook beat dots.
 */
export function computeVisualBeatPulse(
  nowSec: number,
  beatPeriodSec: number | null,
  phaseAnchorSec: number | null,
  confidence: number
): { pulse: number; beatIndex: number; beatPhase: number } {
  if (
    beatPeriodSec === null ||
    phaseAnchorSec === null ||
    !Number.isFinite(beatPeriodSec) ||
    beatPeriodSec <= 0.2 ||
    confidence < 0.35
  ) {
    return { pulse: 0, beatIndex: 0, beatPhase: 0 };
  }

  const elapsedBeats = (nowSec - phaseAnchorSec) / beatPeriodSec;
  const beatPhase = ((elapsedBeats % 1) + 1) % 1;
  const beatIndex = ((Math.floor(elapsedBeats) % 4) + 4) % 4;
  // Crisp attack at beatPhase=0, silky exponential decay across the beat
  const decay = Math.exp(-beatPhase * 5.2);
  const pulse = Number((decay * Math.min(1, confidence * 1.15)).toFixed(4));

  return { pulse, beatIndex, beatPhase };
}
