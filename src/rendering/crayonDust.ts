import type { CrayonToken } from '../core/types';

export const MAX_DUST_PARTICLES = 96;

export interface DustEmitResult {
  shouldEmit: boolean;
  intensity: number;
  energy: number;
}

/**
 * Tracks parameter manipulation vigor over a rolling short window so subtle,
 * delicate adjustments remain serene while heavy/rapid interaction triggers
 * a tactile puff of artisanal wax-crayon dust crumbs.
 */
export class ParameterEnergyTracker {
  private energy = 0;
  private lastEventMs = 0;
  private lastEmitMs = -10000;
  private readonly decayHalfLifeMs: number;
  private readonly triggerThreshold: number;
  private readonly emitCooldownMs: number;

  constructor(opts?: {
    decayHalfLifeMs?: number;
    triggerThreshold?: number;
    emitCooldownMs?: number;
  }) {
    this.decayHalfLifeMs = opts?.decayHalfLifeMs ?? 240;
    this.triggerThreshold = opts?.triggerThreshold ?? 0.22;
    this.emitCooldownMs = opts?.emitCooldownMs ?? 130;
  }

  public recordDelta(normalizedDelta: number, nowMs: number): DustEmitResult {
    const absDelta = Math.abs(normalizedDelta);
    if (!Number.isFinite(absDelta) || absDelta <= 0) {
      return { shouldEmit: false, intensity: 0, energy: this.energy };
    }

    if (this.lastEventMs > 0 && nowMs > this.lastEventMs) {
      const elapsed = nowMs - this.lastEventMs;
      const decay = Math.pow(0.5, elapsed / Math.max(1, this.decayHalfLifeMs));
      this.energy *= decay;
    }
    this.lastEventMs = nowMs;

    // Accumulate interaction vigor (clamped to keep emission subtle & tasteful)
    this.energy = Math.min(1.6, this.energy + absDelta * 1.45);

    const cooledDown = nowMs - this.lastEmitMs >= this.emitCooldownMs;
    if (this.energy >= this.triggerThreshold && cooledDown) {
      this.lastEmitMs = nowMs;
      const intensity = Math.max(
        0.28,
        Math.min(1.0, (this.energy - this.triggerThreshold) / 0.85 + 0.32)
      );
      // Consume part of the burst energy so continuous dragging breathes organically
      this.energy *= 0.62;
      return { shouldEmit: true, intensity, energy: this.energy };
    }

    return { shouldEmit: false, intensity: 0, energy: this.energy };
  }

  public reset(): void {
    this.energy = 0;
    this.lastEventMs = 0;
    this.lastEmitMs = -10000;
  }
}

export interface DustParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  size: number;
  seed: number;
  crayon: CrayonToken;
}

/**
 * Fixed-size, zero-GC particle pool for dry wax-crayon / pastel-chalk dust crumbs.
 * Particles drift softly outward from the manipulated 3D geometry and settle lightly
 * under gentle paper gravity with organic flake sizes.
 */
export class CrayonDustPool {
  public readonly capacity: number;
  public readonly particles: DustParticle[];
  private cursor = 0;
  private rngState = 0x51a7c3d1;

  constructor(capacity = MAX_DUST_PARTICLES) {
    this.capacity = capacity;
    this.particles = Array.from({ length: capacity }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      maxAge: 1,
      size: 6,
      seed: 0,
      crayon: 'graphite',
    }));
  }

  private rand(): number {
    // Fast deterministic xorshift32 for reproducible artisanal flake scatter
    let x = this.rngState | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.rngState = x;
    return ((x >>> 0) % 10000) / 10000;
  }

  public emitBurst(opts: {
    origin: [number, number, number];
    crayon: CrayonToken;
    intensity: number;
    ecoMode?: boolean;
  }): number {
    const clampedIntensity = Math.max(0.15, Math.min(1, opts.intensity));
    const baseCount = Math.round(5 + clampedIntensity * 11);
    const count = opts.ecoMode ? Math.max(3, Math.round(baseCount * 0.55)) : baseCount;

    for (let i = 0; i < count; i++) {
      const p = this.particles[this.cursor];
      this.cursor = (this.cursor + 1) % this.capacity;

      const theta = this.rand() * Math.PI * 2;
      const phi = (this.rand() - 0.35) * Math.PI * 0.72;
      const radialJitter = 0.06 + this.rand() * 0.24;
      const speed = (0.38 + this.rand() * 0.78) * (0.65 + clampedIntensity * 0.65);

      p.active = true;
      p.x = opts.origin[0] + Math.cos(theta) * radialJitter;
      p.y = opts.origin[1] + (this.rand() - 0.5) * 0.18;
      p.z = opts.origin[2] + Math.sin(theta) * radialJitter;

      p.vx = Math.cos(theta) * Math.cos(phi) * speed;
      p.vy = (0.28 + Math.sin(phi) * 0.55) * speed;
      p.vz = Math.sin(theta) * Math.cos(phi) * speed;

      p.age = 0;
      p.maxAge = 0.62 + this.rand() * 0.58;
      p.size = 4.2 + this.rand() * 5.6;
      p.seed = this.rand();
      p.crayon = opts.crayon;
    }

    return count;
  }

  public step(dtSec: number): boolean {
    const dt = Math.max(0, Math.min(0.08, dtSec));
    const drag = Math.exp(-3.1 * dt);
    const gravity = -0.85;
    let anyActive = false;

    for (let i = 0; i < this.capacity; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        continue;
      }

      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * drag + gravity * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      anyActive = true;
    }

    return anyActive;
  }

  public activeCount(): number {
    let n = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (this.particles[i].active) n++;
    }
    return n;
  }

  public clear(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.particles[i].active = false;
    }
  }
}

/**
 * Computes smooth artisanal dry-wax fade alpha for a dust crumb over its normalized life [0..1].
 */
export function computeDustFlakeAlpha(normalizedAge: number): number {
  const t = Math.max(0, Math.min(1, normalizedAge));
  const fadeIn = Math.min(1, t / 0.14);
  const fadeOut = Math.pow(1 - t, 1.55);
  return fadeIn * fadeOut * 0.78;
}
