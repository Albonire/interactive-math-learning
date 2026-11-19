/**
 * Session-scoped tracker ensuring every 3D figure, 2D graph, diagram, or visual
 * element plays its handcrafted "being drawn by crayon" animation the FIRST time
 * it is seen, without repeating tediously on subsequent re-renders or revisits.
 */
export class FirstDrawRegistry {
  private seen = new Set<string>();

  /**
   * Claims a visual key for its first-time draw-on animation.
   * Returns true ONLY on the first encounter of `key`; false on all subsequent calls.
   */
  public claimFirstDraw(key: string): boolean {
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }

  public hasBeenDrawn(key: string): boolean {
    return this.seen.has(key);
  }

  public markDrawn(key: string): void {
    this.seen.add(key);
  }

  public clear(key?: string): void {
    if (key) {
      this.seen.delete(key);
    } else {
      this.seen.clear();
    }
  }

  public count(): number {
    return this.seen.size;
  }
}

/** Singleton registry used across 3D scenes, 2D Rough.js graphs, and UI visuals */
export const globalFirstDrawRegistry = new FirstDrawRegistry();

/**
 * Semantic layer draw ordering for all 8 3D scenes:
 * 1. Notebook grid & axes draw first (0.0)
 * 2. Primary surface / structure draws second (0.24)
 * 3. Operators / vectors / probes draw third (0.48)
 * 4. Invariants / error sheets & annotations finish the sketch (0.66)
 */
export function getAnatomyLayerDrawOrder(layerId: string | undefined): number {
  switch (layerId) {
    case 'substrate':
      return 0.0;
    case 'structure':
      return 0.24;
    case 'operator':
      return 0.48;
    case 'invariant':
    case 'error':
      return 0.66;
    default:
      return 0.35;
  }
}

/**
 * Maps global scene draw progress [0..1] into a smooth eased reveal [0..1]
 * for a specific layer order offset [0..0.75].
 */
export function computeLayerDrawProgress(globalProgress: number, layerOrder: number): number {
  const clampedGlobal = Math.max(0, Math.min(1, globalProgress));
  if (clampedGlobal >= 1) return 1;
  const start = Math.max(0, Math.min(0.65, layerOrder * 0.55));
  const span = Math.max(0.2, 1 - start);
  const raw = Math.max(0, Math.min(1, (clampedGlobal - start) / span));
  // Smooth ease-out quadratic so each layer lands gently like lifting a crayon off paper
  return 1 - (1 - raw) * (1 - raw);
}

/**
 * Maps global 3D scene draw progress [0..1] into the reveal opacity & scale
 * for 3D hand-lettered label sprites (appear right as the geometry finishes sketching).
 */
export function computeLabelRevealFactor(globalProgress: number): number {
  const clamped = Math.max(0, Math.min(1, globalProgress));
  if (clamped <= 0.62) return 0;
  if (clamped >= 1) return 1;
  const t = (clamped - 0.62) / 0.38;
  return t * t * (3 - 2 * t);
}
