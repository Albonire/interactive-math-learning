/**
 * Pure geometry & timing helpers for the floating 'Crayón Guía' hint overlay
 * across both 3D viewports (embedded HandCrafted3DStage and Three.js WebGL Lab 3D).
 *
 * Kept pure (no DOM/React) so layout bounds, non-obstruction guarantees, and
 * stroke-tracing nib trajectories are covered by fast node:test unit tests.
 */

export const CRAYON_GUIDE_IDLE_MS = 5000;

export interface Point2D {
  x: number;
  y: number;
}

export interface NibPose {
  x: number;
  y: number;
  /** Orientation angle in degrees for rotating the little crayon icon along the stroke */
  angleDeg: number;
  /** True once the stroke has reached the arrowhead / target halo */
  ringReady: boolean;
}

export interface OrbitGuideLayout {
  /** Primary curved swipe arc indicating 3D rotation without blocking the center figure */
  arcStart: Point2D;
  arcCtrl: Point2D;
  arcEnd: Point2D;
  /** Secondary tiny curved return gesture echo for organic handmade feel */
  echoStart: Point2D;
  echoCtrl: Point2D;
  echoEnd: Point2D;
  /** Soft hand-sketched dotted anchor loop at the end of the swipe */
  haloCenter: Point2D;
  haloRadius: number;
  /** Unboxed caption anchor kept safely inside viewport bounds */
  labelX: number;
  labelY: number;
  compact: boolean;
}

export function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/**
 * Evaluates a quadratic Bézier curve B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2.
 */
export function sampleQuadBezier(p0: Point2D, p1: Point2D, p2: Point2D, tRaw: number): Point2D {
  const t = clamp01(tRaw);
  const inv = 1 - t;
  return {
    x: inv * inv * p0.x + 2 * inv * t * p1.x + t * t * p2.x,
    y: inv * inv * p0.y + 2 * inv * t * p1.y + t * t * p2.y,
  };
}

/**
 * Unit tangent vector of a quadratic Bézier curve at parameter t in [0, 1].
 */
export function sampleQuadBezierTangent(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  tRaw: number
): Point2D {
  const t = clamp01(tRaw);
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: dx / len, y: dy / len };
}

/**
 * Computes two arrowhead wing tips pointing into `tip` along tangent `(ux, uy)`.
 */
export function computeArrowheadPoints(
  tip: Point2D,
  tangent: Point2D,
  headLen = 10,
  spreadRad = 0.46
): { left: Point2D; right: Point2D } {
  const len = Math.hypot(tangent.x, tangent.y) || 1;
  const ux = tangent.x / len;
  const uy = tangent.y / len;
  const cosS = Math.cos(spreadRad);
  const sinS = Math.sin(spreadRad);
  return {
    left: {
      x: tip.x - (ux * cosS - uy * sinS) * headLen,
      y: tip.y - (ux * sinS + uy * cosS) * headLen,
    },
    right: {
      x: tip.x - (ux * cosS + uy * sinS) * headLen,
      y: tip.y - (-ux * sinS + uy * cosS) * headLen,
    },
  };
}

/**
 * Computes the moving crayon nib pose at progress t in [0, 1] along a curved guide stroke.
 */
export function computeGuideNibPose(
  start: Point2D,
  ctrl: Point2D,
  tip: Point2D,
  tRaw: number
): NibPose {
  const t = clamp01(tRaw);
  const pos = sampleQuadBezier(start, ctrl, tip, t);
  const tan = sampleQuadBezierTangent(start, ctrl, tip, t);
  const angleDeg = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
  return {
    x: pos.x,
    y: pos.y,
    angleDeg,
    ringReady: t >= 0.82,
  };
}

/**
 * Checks whether a point intrudes into the protected central focal zone of the 3D sculpture
 * (central 44% width x 44% height). Used to guarantee 'Crayón Guía' never obscures the model.
 */
export function isInsideCenterFocalZone(
  pt: Point2D,
  viewportWidth: number,
  viewportHeight: number
): boolean {
  const halfW = viewportWidth * 0.22;
  const halfH = viewportHeight * 0.22;
  const cx = viewportWidth * 0.5;
  const cy = viewportHeight * 0.5;
  return (
    pt.x > cx - halfW &&
    pt.x < cx + halfW &&
    pt.y > cy - halfH &&
    pt.y < cy + halfH
  );
}

/**
 * Computes an unobtrusive, margin-hugging hand-drawn orbit cue in the lower-left / outer rim
 * of the embedded 3D stage (leaves center sculpture completely clear and avoids overlapping
 * the subtle bottom-right caption).
 */
export function computeOrbitGuideLayout(
  viewportWidth: number,
  viewportHeight: number
): OrbitGuideLayout {
  const w = Math.max(220, viewportWidth);
  const h = Math.max(160, viewportHeight);
  const compact = w < 360 || h < 210;

  const marginX = compact ? 18 : 26;
  const marginBottom = compact ? 22 : 28;
  const spanX = compact ? Math.min(72, w * 0.28) : Math.min(96, w * 0.24);
  const arcDip = compact ? 15 : 20;

  // Placed in the quiet lower-left apron of the 3D stage, well outside the center focal zone
  const baseY = h - marginBottom;
  const arcStart: Point2D = { x: marginX + 4, y: baseY - (compact ? 14 : 18) };
  const arcEnd: Point2D = { x: marginX + spanX, y: baseY - (compact ? 6 : 8) };
  const arcCtrl: Point2D = {
    x: (arcStart.x + arcEnd.x) * 0.5 + 4,
    y: baseY + arcDip * 0.42,
  };

  // Delicate upper curved orbit-echo tick above the swipe arc
  const echoStart: Point2D = { x: arcStart.x + spanX * 0.24, y: arcStart.y - (compact ? 12 : 16) };
  const echoEnd: Point2D = { x: arcEnd.x - spanX * 0.14, y: arcEnd.y - (compact ? 14 : 18) };
  const echoCtrl: Point2D = {
    x: (echoStart.x + echoEnd.x) * 0.5,
    y: Math.min(echoStart.y, echoEnd.y) - (compact ? 8 : 11),
  };

  return {
    arcStart,
    arcCtrl,
    arcEnd,
    echoStart,
    echoCtrl,
    echoEnd,
    haloCenter: { x: arcEnd.x + 2, y: arcEnd.y },
    haloRadius: compact ? 7 : 8.5,
    labelX: marginX + 2,
    labelY: Math.max(18, echoCtrl.y - (compact ? 14 : 16)),
    compact,
  };
}
