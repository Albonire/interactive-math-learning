import type { CrayonToken, SceneId } from '../core/types';
import {
  computeRealEigen2D,
  computeSvd3,
  evaluateSvdStageMatrix,
  generateManifoldPoints,
  mat3MulVec,
  type Mat3,
} from '../math/linearAlgebra';
import {
  SYMBOLIC_TARGETS,
  evaluateAutoDiffDag,
  evaluatePartialGradients,
  evaluatePartialSurface,
  evaluateSymbolicBasis,
} from '../math/multivariable';
import type { SceneUpdatePayload } from './scenes/types';

export interface SceneAnnotationSpec {
  id: string;
  label: string;
  note: string;
  layerId: string;
  crayon: CrayonToken;
  linkedParamIds: string[];
  /** Optional live visibility guard so annotations never point at hidden/absent 3D meshes */
  isVisible?: (payload: SceneUpdatePayload) => boolean;
  getWorldAnchor: (payload: SceneUpdatePayload) => [number, number, number];
}

export interface ProjectedAnnotation {
  id: string;
  label: string;
  note: string;
  layerId: string;
  crayon: CrayonToken;
  linkedParamIds: string[];
  /** Projected 3D target point in viewport pixels */
  anchorX: number;
  anchorY: number;
  visible: boolean;
}

export interface PositionedCallout extends ProjectedAnnotation {
  side: 'left' | 'right';
  /** Callout label anchor in viewport pixels */
  labelX: number;
  labelY: number;
  /** Quadratic curve control point for organic hand-drawn pointer */
  ctrlX: number;
  ctrlY: number;
}

export const SCENE_ANNOTATIONS: Record<SceneId, SceneAnnotationSpec[]> = {
  'lin-span': [
    {
      id: 'span-v1',
      label: 'Vector base v₁',
      note: 'Dirección escalada por c₁',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['c1'],
      getWorldAnchor: (p) => [p.params.c1 ?? 1.2, 0.2, 0.1],
    },
    {
      id: 'span-v2',
      label: 'Vector base v₂',
      note: 'Dirección escalada por c₂',
      layerId: 'operator',
      crayon: 'vermilion',
      linkedParamIds: ['c2'],
      getWorldAnchor: (p) => [0.2, 0.3, p.params.c2 ?? 1.1],
    },
    {
      id: 'span-v3',
      label: 'Altura v₃',
      note: 'Aplasta a 0 para ver colapso de rango',
      layerId: 'operator',
      crayon: 'ochre',
      linkedParamIds: ['v3y'],
      getWorldAnchor: (p) => [0.4, p.params.v3y ?? 1.0, 0.35],
    },
    {
      id: 'span-vol',
      label: 'Volumen |det|',
      note: 'Espacio 3D alcanzable (Span)',
      layerId: 'structure',
      crayon: 'sage',
      linkedParamIds: ['c1', 'c2', 'v3y'],
      getWorldAnchor: (p) => {
        const c1 = p.params.c1 ?? 1.2;
        const c2 = p.params.c2 ?? 1.1;
        const v3y = p.params.v3y ?? 1.0;
        return [(c1 + 0.6) * 0.55, (0.5 + v3y) * 0.55, (c2 + 0.45) * 0.55];
      },
    },
  ],

  'lin-svd': [
    {
      id: 'svd-cube',
      label: 'Cubo deformado',
      note: 'Su volumen es |det(A)|; rojo si se invierte',
      layerId: 'structure',
      crayon: 'sage',
      linkedParamIds: ['a11', 'a22', 'a33'],
      getWorldAnchor: (p) => {
        const A: Mat3 = [
          p.params.a11 ?? 1.3,
          0,
          p.params.a12 ?? 0.5,
          0,
          p.params.a33 ?? 1.0,
          0,
          p.params.a21 ?? 0.2,
          0,
          p.params.a22 ?? 1.1,
        ];
        const M = evaluateSvdStageMatrix(computeSvd3(A), p.params.svdStage ?? 3);
        return mat3MulVec(M, [0.55, 0.75, 0.55]);
      },
    },
    {
      id: 'svd-i',
      label: "Eje transformado î'",
      note: 'Primera columna de la matriz A',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['a11', 'a21'],
      getWorldAnchor: (p) => {
        const A: Mat3 = [
          p.params.a11 ?? 1.3,
          0,
          p.params.a12 ?? 0.5,
          0,
          p.params.a33 ?? 1.0,
          0,
          p.params.a21 ?? 0.2,
          0,
          p.params.a22 ?? 1.1,
        ];
        const M = evaluateSvdStageMatrix(computeSvd3(A), p.params.svdStage ?? 3);
        return mat3MulVec(M, [1, 0, 0]);
      },
    },
    {
      id: 'svd-ellipsoid',
      label: 'Elipsoide SVD (σ₁, σ₂)',
      note: 'Estiramiento principal en tres actos',
      layerId: 'error',
      crayon: 'ochre',
      linkedParamIds: ['svdStage', 'a12'],
      getWorldAnchor: (p) => {
        const A: Mat3 = [
          p.params.a11 ?? 1.3,
          0,
          p.params.a12 ?? 0.5,
          0,
          p.params.a33 ?? 1.0,
          0,
          p.params.a21 ?? 0.2,
          0,
          p.params.a22 ?? 1.1,
        ];
        const svd = computeSvd3(A);
        return [svd.U[0] * svd.S[0], svd.U[3] * svd.S[0], svd.U[6] * svd.S[0]];
      },
    },
  ],

  'lin-eigen': [
    {
      id: 'eig-v',
      label: 'Sonda v',
      note: 'Gírala con θ para buscar alineación',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['probeAngle'],
      getWorldAnchor: (p) => {
        const th = p.params.probeAngle ?? 0.4;
        return [Math.cos(th) * 1.15, 0.08, Math.sin(th) * 1.15];
      },
    },
    {
      id: 'eig-av',
      label: 'Imagen A·v',
      note: 'Se alinea con v sobre un autovector',
      layerId: 'operator',
      crayon: 'vermilion',
      linkedParamIds: ['a', 'b', 'c', 'd', 'probeAngle'],
      getWorldAnchor: (p) => {
        const th = p.params.probeAngle ?? 0.4;
        const vx = Math.cos(th);
        const vz = Math.sin(th);
        return [
          (p.params.a ?? 1.5) * vx + (p.params.b ?? 0.5) * vz,
          0.14,
          (p.params.c ?? 0.3) * vx + (p.params.d ?? 0.9) * vz,
        ];
      },
    },
    {
      id: 'eig-line',
      label: 'Eje propio (λ)',
      note: 'Dirección invariante bajo A',
      layerId: 'invariant',
      crayon: 'ochre',
      linkedParamIds: ['a', 'b', 'c', 'd'],
      isVisible: (p) =>
        computeRealEigen2D(
          p.params.a ?? 1.5,
          p.params.b ?? 0.5,
          p.params.c ?? 0.3,
          p.params.d ?? 0.9
        ).length > 0,
      getWorldAnchor: (p) => {
        const pairs = computeRealEigen2D(
          p.params.a ?? 1.5,
          p.params.b ?? 0.5,
          p.params.c ?? 0.3,
          p.params.d ?? 0.9
        );
        if (pairs[0]) {
          const l = Math.max(0.8, Math.min(2.6, Math.abs(pairs[0].lambda) * 1.25));
          return [pairs[0].vector[0] * l, 0.08, pairs[0].vector[1] * l];
        }
        return [1.2, 0.08, 0.2];
      },
    },
  ],

  'lin-manifold': [
    {
      id: 'man-sheet',
      label: 'Variedad doblada',
      note: 'La activación φ eleva el espacio en 3D',
      layerId: 'structure',
      crayon: 'plum',
      linkedParamIds: ['weight', 'fold'],
      getWorldAnchor: (p) => {
        const x = 1.25;
        const z = -0.9;
        const w = p.params.weight ?? 1.4;
        const b = p.params.bias ?? 0.0;
        const fold = p.params.fold ?? 1.0;
        const r2 = x * x + z * z;
        const feat =
          p.dataset === 'rings'
            ? w * (r2 - 1.35) + b
            : w * Math.sin(Math.atan2(z, x) - Math.hypot(x, z) * 2.8) + b;
        let y = 0;
        if (p.activation === 'linear') y = fold * 0.35 * (w * x + b * 0.6);
        else if (p.activation === 'tanh') y = fold * 1.45 * Math.tanh(feat);
        else if (p.activation === 'relu') y = fold * 1.45 * Math.max(0, feat);
        else y = fold * 1.45 * (1 / (1 + Math.exp(-feat)));
        return [x, y, z];
      },
    },
    {
      id: 'man-points',
      label: 'Clases A y B',
      note: 'Datos que se desenredan al doblar',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['weight', 'bias'],
      getWorldAnchor: (p) => {
        const { points } = generateManifoldPoints(
          p.dataset,
          p.params.weight ?? 1.4,
          p.params.bias ?? 0.0,
          p.params.fold ?? 1.0,
          p.activation,
          24
        );
        const sample = points[0];
        return sample ? [sample.x, sample.y, sample.z] : [-0.85, 0.35, 0.85];
      },
    },
    {
      id: 'man-plane',
      label: 'Frontera lineal',
      note: 'Un solo corte plano tras el pliegue',
      layerId: 'invariant',
      crayon: 'sage',
      linkedParamIds: ['bias', 'fold'],
      getWorldAnchor: (p) => {
        const { planeY } = generateManifoldPoints(
          p.dataset,
          p.params.weight ?? 1.4,
          p.params.bias ?? 0.0,
          p.params.fold ?? 1.0,
          p.activation,
          16
        );
        return [1.55, planeY, 1.35];
      },
    },
  ],

  'calc-partials': [
    {
      id: 'part-slice-x',
      label: 'Corte ∂f/∂x',
      note: 'Pendiente congelando y = y₀',
      layerId: 'operator',
      crayon: 'vermilion',
      linkedParamIds: ['x0'],
      getWorldAnchor: (p) => {
        const y0 = p.params.y0 ?? 0.4;
        const freq = p.params.freq ?? 1.0;
        const z = evaluatePartialSurface(-1.35, y0, freq, 0.85) + 0.03;
        return [-1.35, z, y0];
      },
    },
    {
      id: 'part-slice-y',
      label: 'Corte ∂f/∂y',
      note: 'Pendiente congelando x = x₀',
      layerId: 'operator',
      crayon: 'ochre',
      linkedParamIds: ['y0'],
      getWorldAnchor: (p) => {
        const x0 = p.params.x0 ?? 0.6;
        const freq = p.params.freq ?? 1.0;
        const z = evaluatePartialSurface(x0, -1.35, freq, 0.85) + 0.03;
        return [x0, z, -1.35];
      },
    },
    {
      id: 'part-grad',
      label: 'Gradiente ∇f y tangente',
      note: 'Apunta hacia el ascenso más rápido',
      layerId: 'invariant',
      crayon: 'sage',
      linkedParamIds: ['x0', 'y0', 'freq'],
      getWorldAnchor: (p) => {
        const x0 = p.params.x0 ?? 0.6;
        const y0 = p.params.y0 ?? 0.4;
        const freq = p.params.freq ?? 1.0;
        const { z } = evaluatePartialGradients(x0, y0, freq, 0.85);
        return [x0, z + 0.16, y0];
      },
    },
  ],

  'calc-autodiff': [
    {
      id: 'ad-node',
      label: 'Punto evaluado (Forward)',
      note: 'Salida f(x, y, w) sobre la superficie',
      layerId: 'operator',
      crayon: 'sage',
      linkedParamIds: ['x', 'y'],
      getWorldAnchor: (p) => {
        const x = p.params.x ?? 0.7;
        const y = p.params.y ?? 0.6;
        const w = p.params.w ?? 1.6;
        const snap = evaluateAutoDiffDag(x, y, w, p.autoDiffPass);
        const visH = Math.max(-1.6, Math.min(2.2, snap.outputValue * 0.35));
        return [x, visH + 0.1, y];
      },
    },
    {
      id: 'ad-grad',
      label: 'Gradiente (Backward)',
      note: 'Sensibilidad propagada por regla de cadena',
      layerId: 'error',
      crayon: 'vermilion',
      linkedParamIds: ['w', 'x', 'y'],
      getWorldAnchor: (p) => {
        const x = p.params.x ?? 0.7;
        const y = p.params.y ?? 0.6;
        const w = p.params.w ?? 1.6;
        const snap = evaluateAutoDiffDag(x, y, w, p.autoDiffPass);
        const visH = Math.max(-1.6, Math.min(2.2, snap.outputValue * 0.35));
        const clampV = (v: number) => Math.max(-1.6, Math.min(1.6, v * 0.36));
        return [x + clampV(snap.gradX), visH + 0.25, y + clampV(snap.gradY)];
      },
    },
    {
      id: 'ad-surf',
      label: 'Relieve f(x, y)',
      note: 'Se ondula al variar el peso w',
      layerId: 'structure',
      crayon: 'cobalt',
      linkedParamIds: ['w'],
      getWorldAnchor: () => [-1.3, 0.15, -1.1],
    },
  ],

  'calc-optimizers': [
    {
      id: 'opt-probes',
      label: 'SGD · Mom · Adam',
      note: 'Tres estrategias bajando la pérdida',
      layerId: 'operator',
      crayon: 'sage',
      linkedParamIds: ['lr', 'beta'],
      getWorldAnchor: (p) => {
        const adam = p.optimizerProbes[2] ?? p.optimizerProbes[0];
        return adam ? [adam.x, adam.z + 0.18, adam.y] : [0, 0.6, 0];
      },
    },
    {
      id: 'opt-mom',
      label: 'Inercia βv vs. −α∇L',
      note: 'Momentum amortigua el zigzagueo',
      layerId: 'invariant',
      crayon: 'ochre',
      linkedParamIds: ['beta', 'lr'],
      getWorldAnchor: (p) => {
        const mom = p.optimizerProbes[1];
        return mom ? [mom.x, mom.z + 0.28, mom.y] : [-0.6, 0.5, 0.4];
      },
    },
    {
      id: 'opt-terrain',
      label: 'Paisaje de pérdida',
      note: 'El fondo más bajo minimiza el error',
      layerId: 'structure',
      crayon: 'cobalt',
      linkedParamIds: ['lr'],
      getWorldAnchor: () => [1.35, 0.45, -1.2],
    },
  ],

  'calc-symbolic': [
    {
      id: 'sym-target',
      label: 'Objetivo oculto',
      note: 'Malla a reconstruir con pesos w₁…w₅',
      layerId: 'structure',
      crayon: 'pencil',
      linkedParamIds: ['wSin', 'wCos', 'wQuad', 'wCross', 'wGauss'],
      getWorldAnchor: (p) => {
        const tgt = SYMBOLIC_TARGETS[p.symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
        const y = evaluateSymbolicBasis(
          -1.2,
          -1.0,
          tgt.weights[0],
          tgt.weights[1],
          tgt.weights[2],
          tgt.weights[3],
          tgt.weights[4]
        );
        return [-1.2, y, -1.0];
      },
    },
    {
      id: 'sym-human',
      label: 'Tu fórmula ƒ̂(x, y)',
      note: 'Superficie moldeada por tus deslizadores',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['wSin', 'wCos', 'wQuad', 'wCross', 'wGauss'],
      getWorldAnchor: (p) => {
        const y = evaluateSymbolicBasis(
          1.15,
          0.9,
          p.params.wSin ?? 0.2,
          p.params.wCos ?? 0.2,
          p.params.wQuad ?? 0,
          p.params.wCross ?? 0,
          p.params.wGauss ?? 0.3
        );
        return [1.15, y, 0.9];
      },
    },
    {
      id: 'sym-ai',
      label: 'Hipótesis IA',
      note: 'Evoluciona en paralelo buscando MSE → 0',
      layerId: 'error',
      crayon: 'sage',
      linkedParamIds: [],
      isVisible: (p) => Boolean(p.aiSymbolicGrid),
      getWorldAnchor: (p) => {
        if (p.aiSymbolicGrid && p.aiSymbolicGrid.length >= 625) {
          // Sample grid point near (x ≈ 0.16, z ≈ -1.33) -> ix=13, iz=4 on 25x25 grid
          const val = p.aiSymbolicGrid[13 * 25 + 4] ?? 0.5;
          return [0.16, val + 0.05, -1.33];
        }
        return [0.2, 0.65, -1.35];
      },
    },
  ],
};

/**
 * Resolves the active 3D world anchor for a parameter being manipulated (used to spawn Crayon Dust
 * right at the 3D vector/surface responding to the user's slider drag).
 */
export function getWorldAnchorForParam(
  payload: SceneUpdatePayload,
  paramId: string
): [number, number, number] {
  const specs = SCENE_ANNOTATIONS[payload.sceneId] ?? [];
  const exact = specs.find((s) => s.linkedParamIds[0] === paramId);
  if (exact) return exact.getWorldAnchor(payload);
  const matching = specs.find((s) => s.linkedParamIds.includes(paramId));
  if (matching) return matching.getWorldAnchor(payload);
  return [0.3, 0.4, 0.3];
}

/**
 * Arranges hand-drawn viewport callout notes cleanly into the open left/right margins
 * so they never overlap each other, never collide with the top-left title or bottom dock,
 * and connect to their live 3D anatomy point with a graceful curved leader line.
 */
export function computeCalloutLayout(
  projected: ProjectedAnnotation[],
  viewportWidth: number,
  viewportHeight: number
): PositionedCallout[] {
  const visible = projected.filter(
    (p) =>
      p.visible &&
      Number.isFinite(p.anchorX) &&
      Number.isFinite(p.anchorY) &&
      p.anchorX > 20 &&
      p.anchorX < viewportWidth - 20 &&
      p.anchorY > 20 &&
      p.anchorY < viewportHeight - 20
  );

  if (visible.length === 0 || viewportWidth < 420 || viewportHeight < 260) {
    return [];
  }

  const centerX = viewportWidth * 0.5;
  const sideInset = Math.max(24, Math.min(168, viewportWidth * 0.115));
  const leftMarginX = sideInset;
  const rightMarginX = viewportWidth - sideInset;
  const topBoundLeft = Math.min(144, viewportHeight * 0.25);
  const topBoundRight = Math.min(104, viewportHeight * 0.18);
  const bottomBound = viewportHeight - 66;
  const minGapY = 76;

  const leftBucket: ProjectedAnnotation[] = [];
  const rightBucket: ProjectedAnnotation[] = [];

  for (const item of visible) {
    if (item.anchorX < centerX) {
      leftBucket.push(item);
    } else {
      rightBucket.push(item);
    }
  }

  const layoutSide = (
    items: ProjectedAnnotation[],
    side: 'left' | 'right',
    topBound: number
  ): PositionedCallout[] => {
    const sorted = [...items].sort((a, b) => a.anchorY - b.anchorY);
    const ys: number[] = sorted.map((it) =>
      Math.max(topBound, Math.min(bottomBound, it.anchorY))
    );

    // Forward pass: push downward to prevent overlap
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] - ys[i - 1] < minGapY) {
        ys[i] = ys[i - 1] + minGapY;
      }
    }
    // Backward pass: clamp to bottomBound and nudge upward cleanly
    if (ys.length > 0 && ys[ys.length - 1] > bottomBound) {
      ys[ys.length - 1] = bottomBound;
      for (let i = ys.length - 2; i >= 0; i--) {
        if (ys[i + 1] - ys[i] < minGapY) {
          ys[i] = Math.max(topBound, ys[i + 1] - minGapY);
        }
      }
    }

    const labelX = side === 'left' ? leftMarginX : rightMarginX;
    return sorted.map((it, idx) => {
      const labelY = ys[idx];
      const lineStartX = side === 'left' ? labelX + 150 : labelX - 150;
      const midX = (lineStartX + it.anchorX) * 0.5;
      const archLift = side === 'left' ? -20 : -18;
      return {
        ...it,
        side,
        labelX,
        labelY,
        ctrlX: midX,
        ctrlY: (labelY + it.anchorY) * 0.5 + archLift,
      };
    });
  };

  return [
    ...layoutSide(leftBucket, 'left', topBoundLeft),
    ...layoutSide(rightBucket, 'right', topBoundRight),
  ];
}

export const IDLE_GUIDE_DELAY_MS = 5000;
export const ECO_RESTING_OPACITY = 0.36;
export const ECO_ACTIVE_BASE_OPACITY = 0.78;
export const ECO_PROXIMITY_RADIUS_PX = 340;

export interface EcoPointerState {
  x: number;
  y: number;
  active: boolean;
}

export interface GuideArrowGeometry {
  startX: number;
  startY: number;
  ctrlX: number;
  ctrlY: number;
  tipX: number;
  tipY: number;
  labelX: number;
  labelY: number;
  labelAlign: 'left' | 'right';
}

/**
 * Selects the visible 3D component with the highest interaction weight
 * (driven by the most parameters, breaking ties in favor of direct operator elements)
 * for the subtle idle 'Crayón Guía' arrow.
 */
export function selectPrimaryInteractiveAnnotation(
  projected: readonly ProjectedAnnotation[],
  viewportWidth: number,
  viewportHeight: number
): ProjectedAnnotation | null {
  const candidates = projected.filter(
    (p) =>
      p.visible &&
      Number.isFinite(p.anchorX) &&
      Number.isFinite(p.anchorY) &&
      p.anchorX > 28 &&
      p.anchorX < viewportWidth - 28 &&
      p.anchorY > 28 &&
      p.anchorY < viewportHeight - 28
  );
  if (candidates.length === 0) return null;

  const weightOf = (item: ProjectedAnnotation): number => {
    const paramWeight = item.linkedParamIds.length * 10;
    const layerBonus =
      item.layerId === 'operator' ? 2 : item.layerId === 'invariant' ? 1 : 0;
    return paramWeight + layerBonus;
  };

  let best = candidates[0];
  let bestScore = weightOf(best);
  for (let i = 1; i < candidates.length; i++) {
    const score = weightOf(candidates[i]);
    if (score > bestScore) {
      best = candidates[i];
      bestScore = score;
    }
  }
  return best;
}

/**
 * Computes a compact, non-intrusive curved crayon arrow pointing onto the top-weighted 3D component,
 * automatically choosing an open quadrant inside the viewport margins.
 */
export function computeGuideArrowGeometry(
  target: ProjectedAnnotation,
  viewportWidth: number,
  viewportHeight: number
): GuideArrowGeometry {
  // Prefer pointing from the side with more open paper space
  const placeOnRight = target.anchorX < viewportWidth * 0.62;
  const placeAbove = target.anchorY > viewportHeight * 0.38;

  const offsetX = placeOnRight ? 96 : -96;
  const offsetY = placeAbove ? -72 : 72;

  const startX = Math.max(48, Math.min(viewportWidth - 48, target.anchorX + offsetX));
  const startY = Math.max(96, Math.min(viewportHeight - 68, target.anchorY + offsetY));

  const dx = target.anchorX - startX;
  const dy = target.anchorY - startY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  // Stop arrowhead gently just outside the 3D anchor ring
  const tipX = target.anchorX - ux * 15;
  const tipY = target.anchorY - uy * 15;

  // Gentle organic bow perpendicular to the vector
  const bow = placeOnRight ? -20 : 20;
  const ctrlX = (startX + tipX) * 0.5 - uy * bow;
  const ctrlY = (startY + tipY) * 0.5 + ux * bow;

  return {
    startX,
    startY,
    ctrlX,
    ctrlY,
    tipX,
    tipY,
    labelX: placeOnRight ? startX + 8 : startX - 8,
    labelY: startY,
    labelAlign: placeOnRight ? 'left' : 'right',
  };
}

/**
 * Computes annotation opacity:
 * - Normal mode: steady legible opacity (dimming unrelated callouts during active parameter drag).
 * - Eco Mode: dynamic opacity tied to pointer movement & proximity, settling softly at rest
 *   to lower visual/compositing load while preserving clear readability.
 */
export function computeAnnotationOpacity(opts: {
  ecoMode: boolean;
  isLinked: boolean;
  isDimmed: boolean;
  pointer: EcoPointerState | null;
  anchorX: number;
  anchorY: number;
  labelX: number;
  labelY: number;
}): number {
  const { ecoMode, isLinked, isDimmed, pointer, anchorX, anchorY, labelX, labelY } = opts;

  if (!ecoMode) {
    if (isDimmed) return 0.26;
    return isLinked ? 0.98 : 0.88;
  }

  if (isLinked) return 0.94;
  if (isDimmed) return 0.18;

  if (!pointer || !pointer.active) {
    return ECO_RESTING_OPACITY;
  }

  const distAnchor = Math.hypot(pointer.x - anchorX, pointer.y - anchorY);
  const distLabel = Math.hypot(pointer.x - labelX, pointer.y - labelY);
  const minDist = Math.min(distAnchor, distLabel);
  const proximity = Math.max(0, 1 - minDist / ECO_PROXIMITY_RADIUS_PX);

  return Number((ECO_ACTIVE_BASE_OPACITY + proximity * 0.18).toFixed(2));
}
