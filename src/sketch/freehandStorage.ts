import type { CrayonToken, SceneId } from '../core/types';

export const FREEHAND_STORAGE_KEY = 'bibifold_freehand_sketches_v1';

export type FreehandTool = 'crayon' | 'eraser';
export type FreehandBrushSize = 'fine' | 'medium' | 'bold';

export interface FreehandPoint {
  /** Normalized X coordinate in [0, 1] relative to the 3D viewport width */
  nx: number;
  /** Normalized Y coordinate in [0, 1] relative to the 3D viewport height */
  ny: number;
  /** Pressure / velocity weight in [0.25, 1.0] */
  p: number;
}

export interface FreehandStroke {
  id: string;
  tool: FreehandTool;
  crayon: CrayonToken;
  size: FreehandBrushSize;
  points: FreehandPoint[];
  createdAt: number;
}

export type FreehandStoreMap = Partial<Record<SceneId, FreehandStroke[]>>;

const VALID_SCENE_IDS: ReadonlySet<string> = new Set<SceneId>([
  'lin-span',
  'lin-svd',
  'lin-eigen',
  'lin-manifold',
  'calc-partials',
  'calc-autodiff',
  'calc-optimizers',
  'calc-symbolic',
]);

const VALID_CRAYONS: ReadonlySet<string> = new Set<CrayonToken>([
  'graphite',
  'cobalt',
  'vermilion',
  'ochre',
  'sage',
  'plum',
  'pencil',
]);

export const MAX_STROKES_PER_SCENE = 90;
export const MAX_POINTS_PER_STROKE = 420;

export function getBrushRadiusPx(size: FreehandBrushSize, tool: FreehandTool): number {
  if (tool === 'eraser') {
    return size === 'fine' ? 12 : size === 'bold' ? 28 : 19;
  }
  return size === 'fine' ? 2.4 : size === 'bold' ? 6.8 : 4.2;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

export function createFreehandStroke(
  tool: FreehandTool,
  crayon: CrayonToken,
  size: FreehandBrushSize,
  firstPoint: FreehandPoint,
  nowMs = Date.now()
): FreehandStroke {
  return {
    id: `fh-${nowMs.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    tool,
    crayon,
    size,
    points: [
      {
        nx: round4(clamp01(firstPoint.nx)),
        ny: round4(clamp01(firstPoint.ny)),
        p: round4(Math.max(0.25, Math.min(1, firstPoint.p || 0.72))),
      },
    ],
    createdAt: nowMs,
  };
}

/**
 * Pure point filter that drops near-duplicate samples (< minDistNorm) and enforces
 * a compact per-stroke point cap so LocalStorage stays fast and well under quota.
 */
export function appendFreehandPoint(
  points: readonly FreehandPoint[],
  next: FreehandPoint,
  minDistNorm = 0.0022
): FreehandPoint[] {
  const sanitized: FreehandPoint = {
    nx: round4(clamp01(next.nx)),
    ny: round4(clamp01(next.ny)),
    p: round4(Math.max(0.25, Math.min(1, Number.isFinite(next.p) ? next.p : 0.72))),
  };

  if (points.length === 0) return [sanitized];
  if (points.length >= MAX_POINTS_PER_STROKE) return [...points];

  const prev = points[points.length - 1];
  const dx = sanitized.nx - prev.nx;
  const dy = sanitized.ny - prev.ny;
  if (dx * dx + dy * dy < minDistNorm * minDistNorm) {
    return [...points];
  }
  return [...points, sanitized];
}

export function appendCompletedStroke(
  strokes: readonly FreehandStroke[],
  stroke: FreehandStroke
): FreehandStroke[] {
  if (stroke.points.length === 0) return [...strokes];
  const next = [...strokes, stroke];
  if (next.length > MAX_STROKES_PER_SCENE) {
    return next.slice(next.length - MAX_STROKES_PER_SCENE);
  }
  return next;
}

export function undoLastFreehandStroke(strokes: readonly FreehandStroke[]): FreehandStroke[] {
  if (strokes.length === 0) return [];
  return strokes.slice(0, strokes.length - 1);
}

/**
 * Validates and sanitizes a serialized freehand sketch store.
 */
export function deserializeFreehandStore(raw: string | null): FreehandStoreMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const obj = parsed as Record<string, unknown>;
    const source =
      obj.version === 1 && obj.scenes && typeof obj.scenes === 'object'
        ? (obj.scenes as Record<string, unknown>)
        : obj;

    const result: FreehandStoreMap = {};
    for (const [key, value] of Object.entries(source)) {
      if (!VALID_SCENE_IDS.has(key) || !Array.isArray(value)) continue;
      const cleanStrokes: FreehandStroke[] = [];
      for (const item of value) {
        if (!item || typeof item !== 'object') continue;
        const s = item as Partial<FreehandStroke>;
        const tool: FreehandTool = s.tool === 'eraser' ? 'eraser' : 'crayon';
        const crayon: CrayonToken =
          typeof s.crayon === 'string' && VALID_CRAYONS.has(s.crayon)
            ? (s.crayon as CrayonToken)
            : 'cobalt';
        const size: FreehandBrushSize =
          s.size === 'fine' || s.size === 'bold' ? s.size : 'medium';

        if (!Array.isArray(s.points) || s.points.length === 0) continue;
        const cleanPoints: FreehandPoint[] = [];
        for (const pt of s.points.slice(0, MAX_POINTS_PER_STROKE)) {
          if (
            pt &&
            typeof pt === 'object' &&
            typeof pt.nx === 'number' &&
            typeof pt.ny === 'number'
          ) {
            cleanPoints.push({
              nx: round4(clamp01(pt.nx)),
              ny: round4(clamp01(pt.ny)),
              p: round4(
                typeof pt.p === 'number' && Number.isFinite(pt.p)
                  ? Math.max(0.25, Math.min(1, pt.p))
                  : 0.72
              ),
            });
          }
        }
        if (cleanPoints.length === 0) continue;
        cleanStrokes.push({
          id: typeof s.id === 'string' ? s.id : `fh-restored-${cleanStrokes.length}`,
          tool,
          crayon,
          size,
          points: cleanPoints,
          createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
        });
      }
      if (cleanStrokes.length > 0) {
        result[key as SceneId] = cleanStrokes.slice(-MAX_STROKES_PER_SCENE);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function serializeFreehandStore(store: FreehandStoreMap): string {
  return JSON.stringify({
    version: 1,
    updatedAt: Date.now(),
    scenes: store,
  });
}

export function loadAllFreehandStrokes(): FreehandStoreMap {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    return deserializeFreehandStore(window.localStorage.getItem(FREEHAND_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function saveSceneFreehandStrokes(
  sceneId: SceneId,
  strokes: readonly FreehandStroke[]
): FreehandStoreMap {
  const current = loadAllFreehandStrokes();
  const next: FreehandStoreMap = { ...current };
  if (strokes.length === 0) {
    delete next[sceneId];
  } else {
    next[sceneId] = strokes.slice(-MAX_STROKES_PER_SCENE);
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(FREEHAND_STORAGE_KEY, serializeFreehandStore(next));
    }
  } catch {
    // Gracefully ignore storage quota errors
  }
  return next;
}

export function clearAllFreehandStrokes(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(FREEHAND_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}
