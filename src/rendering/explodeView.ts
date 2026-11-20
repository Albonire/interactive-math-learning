import type { AnatomyLayerSpec } from '../core/types';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface ExplodedCameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
}

export interface ExplodeVerticalSpan {
  minY: number;
  maxY: number;
  span: number;
  visibleCount: number;
}

/**
 * Computes the vertical min/max span of currently visible anatomy layers under exploded mode.
 */
export function computeExplodeVerticalSpan(
  layers: readonly AnatomyLayerSpec[],
  exploded: boolean
): ExplodeVerticalSpan {
  const visible = layers.filter((l) => l.visible);
  if (!exploded || visible.length === 0) {
    return { minY: 0, maxY: 0, span: 0, visibleCount: visible.length };
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (const layer of visible) {
    if (layer.explodeOffsetY < minY) minY = layer.explodeOffsetY;
    if (layer.explodeOffsetY > maxY) maxY = layer.explodeOffsetY;
  }

  return {
    minY,
    maxY,
    span: Number((maxY - minY).toFixed(3)),
    visibleCount: visible.length,
  };
}

/**
 * Computes a clean, unclipped architectural framing pose when "Separar vista" is toggled.
 * - Pulls the camera smoothly back so all 4 vertical layers remain comfortably inside the viewport.
 * - On nearly top-down scenes (e.g. Autovectores), lowers polar pitch slightly so vertical
 *   separation reads dramatically in 3D perspective instead of being foreshortened.
 */
export function computeExplodedCameraPose(
  basePos: Vec3Tuple,
  baseTarget: Vec3Tuple,
  exploded: boolean,
  layers: readonly AnatomyLayerSpec[]
): ExplodedCameraPose {
  if (!exploded) {
    return {
      position: { ...basePos },
      target: { ...baseTarget },
    };
  }

  const spanInfo = computeExplodeVerticalSpan(layers, true);
  const centerShiftY = (spanInfo.minY + spanInfo.maxY) * 0.4;
  const target: Vec3Tuple = {
    x: baseTarget.x,
    y: Number((baseTarget.y + centerShiftY).toFixed(3)),
    z: baseTarget.z,
  };

  const dx = basePos.x - baseTarget.x;
  const dy = basePos.y - baseTarget.y;
  const dz = basePos.z - baseTarget.z;
  const horiz = Math.hypot(dx, dz);

  // Pull back 1.48x for generous architectural margin around all 4 separated tiers
  const pullback = 1.48;
  let nextDx = dx * pullback;
  let nextDz = dz * pullback;
  let nextDy = dy * 1.18;

  // If camera was very steep / top-down (like Eigen), open the horizontal angle so layers separate clearly
  if (horiz > 0.001 && dy / horiz > 1.05) {
    const boostHoriz = 1.32;
    nextDx *= boostHoriz;
    nextDz *= boostHoriz;
    nextDy *= 0.84;
  }

  return {
    position: {
      x: Number((target.x + nextDx).toFixed(3)),
      y: Number((target.y + nextDy).toFixed(3)),
      z: Number((target.z + nextDz).toFixed(3)),
    },
    target,
  };
}
