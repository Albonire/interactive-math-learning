import type { AutoDiffNodeView, AutoDiffSnapshot, OptimizerProbeState } from '../core/types';

export type SurfacePresetId = 'hills' | 'saddle' | 'rosenbrock' | 'rastrigin';

/**
 * Evaluates z = f(x, y) for Scene 2.1 (Partial Derivatives & Tangent Plane)
 */
export function evaluatePartialSurface(x: number, y: number, freq = 1.0, amp = 0.85): number {
  return amp * (Math.sin(freq * x) * Math.cos(freq * y) + 0.14 * (x * x - 0.6 * y * y));
}

export function evaluatePartialGradients(
  x: number,
  y: number,
  freq = 1.0,
  amp = 0.85
): { fx: number; fy: number; z: number } {
  const z = evaluatePartialSurface(x, y, freq, amp);
  const fx = amp * (freq * Math.cos(freq * x) * Math.cos(freq * y) + 0.28 * x);
  const fy = amp * (-freq * Math.sin(freq * x) * Math.sin(freq * y) - 0.168 * y);
  return { fx, fy, z };
}

/**
 * Real reverse-mode AutoDiff DAG for Scene 2.2:
 *   v1 = x * y
 *   v2 = sin(w * x)
 *   v3 = y^2
 *   v4 = v1 + v2
 *   f  = v4 + 0.4 * v3   (equivalently x*y + sin(w*x) + 0.4*y^2)
 */
export function evaluateAutoDiffDag(
  x: number,
  y: number,
  w: number,
  activePass: 'idle' | 'forward' | 'backward' = 'idle'
): AutoDiffSnapshot {
  // Forward pass
  const v1 = x * y;
  const wx = w * x;
  const v2 = Math.sin(wx);
  const v3 = y * y;
  const v4 = v1 + v2;
  const v5 = 0.4 * v3;
  const out = v4 + v5;

  // Reverse pass (chain rule)
  const dOut = 1.0;
  const dV4 = dOut * 1.0;
  const dV5 = dOut * 1.0;
  const dV1 = dV4 * 1.0;
  const dV2 = dV4 * 1.0;
  const dV3 = dV5 * 0.4;
  const dWx = dV2 * Math.cos(wx);

  const gradX = dV1 * y + dWx * w;
  const gradY = dV1 * x + dV3 * (2 * y);
  const gradW = dWx * x;

  const gradMag = Math.hypot(gradX, gradY);
  let gradStatus: 'nominal' | 'vanishing' | 'exploding' = 'nominal';
  if (gradMag < 0.15) gradStatus = 'vanishing';
  else if (gradMag > 5.5) gradStatus = 'exploding';

  const nodes: AutoDiffNodeView[] = [
    {
      id: 'x',
      label: 'x',
      op: 'input',
      value: x,
      grad: gradX,
      localDeriv: 'entrada',
      inputs: [],
      x: 42,
      y: 44,
      crayon: 'cobalt',
    },
    {
      id: 'y',
      label: 'y',
      op: 'input',
      value: y,
      grad: gradY,
      localDeriv: 'entrada',
      inputs: [],
      x: 42,
      y: 162,
      crayon: 'vermilion',
    },
    {
      id: 'w',
      label: 'w',
      op: 'input',
      value: w,
      grad: gradW,
      localDeriv: 'peso',
      inputs: [],
      x: 42,
      y: 103,
      crayon: 'ochre',
    },
    {
      id: 'v1',
      label: 'x · y',
      op: 'mul',
      value: v1,
      grad: dV1,
      localDeriv: '∂/∂x=y, ∂/∂y=x',
      inputs: ['x', 'y'],
      x: 148,
      y: 44,
      crayon: 'graphite',
    },
    {
      id: 'v2',
      label: 'sin(wx)',
      op: 'sin',
      value: v2,
      grad: dV2,
      localDeriv: `cos(${wx.toFixed(2)})=${Math.cos(wx).toFixed(2)}`,
      inputs: ['x', 'w'],
      x: 148,
      y: 103,
      crayon: 'plum',
    },
    {
      id: 'v3',
      label: '0.4y²',
      op: 'pow',
      value: v5,
      grad: dV5,
      localDeriv: `0.8y=${(0.8 * y).toFixed(2)}`,
      inputs: ['y'],
      x: 148,
      y: 162,
      crayon: 'ochre',
    },
    {
      id: 'v4',
      label: 'v₁ + v₂',
      op: 'add',
      value: v4,
      grad: dV4,
      localDeriv: '∂=1',
      inputs: ['v1', 'v2'],
      x: 244,
      y: 74,
      crayon: 'graphite',
    },
    {
      id: 'out',
      label: 'f(x,y)',
      op: 'add',
      value: out,
      grad: dOut,
      localDeriv: 'salida',
      inputs: ['v4', 'v3'],
      x: 322,
      y: 112,
      crayon: 'sage',
    },
  ];

  return {
    nodes,
    outputValue: out,
    gradX,
    gradY,
    gradStatus,
    activePass,
  };
}

/**
 * Loss landscapes for Scene 2.3 (Optimizers Race)
 * Scaled cleanly into [-2.2, 2.2] domain so surfaces stay crisp in 3D.
 */
export function evaluateLossLandscape(
  x: number,
  y: number,
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle'
): { loss: number; gx: number; gy: number; visualHeight: number } {
  if (landscape === 'rosenbrock') {
    // Scaled Rosenbrock: min at (1, 1) -> f = 0
    const a = 1;
    const b = 4.5;
    const t1 = a - x;
    const t2 = y - x * x;
    const loss = t1 * t1 + b * t2 * t2;
    const gx = -2 * t1 - 4 * b * x * t2;
    const gy = 2 * b * t2;
    const visualHeight = Math.min(2.4, Math.log1p(loss) * 0.55);
    return { loss, gx, gy, visualHeight };
  }

  if (landscape === 'rastrigin') {
    // Scaled Rastrigin: global min at (0, 0) -> f = 0
    const A = 0.7;
    const k = Math.PI * 1.1;
    const loss =
      0.35 * (x * x + y * y) +
      A * (2 - Math.cos(k * x) - Math.cos(k * y));
    const gx = 0.7 * x + A * k * Math.sin(k * x);
    const gy = 0.7 * y + A * k * Math.sin(k * y);
    const visualHeight = Math.min(2.4, loss * 0.52);
    return { loss, gx, gy, visualHeight };
  }

  // Saddle landscape: z = 0.45*(x^2 - y^2) + 0.08*(x^4 + y^4) (bounded minima at y = +-1.68, saddle at 0,0)
  const loss = 0.45 * (x * x - y * y) + 0.08 * (x * x * x * x + y * y * y * y) + 0.9;
  const gx = 0.9 * x + 0.32 * x * x * x;
  const gy = -0.9 * y + 0.32 * y * y * y;
  const visualHeight = Math.max(-1.2, Math.min(2.2, loss * 0.75 - 0.35));
  return { loss, gx, gy, visualHeight };
}

export function createInitialOptimizerProbes(
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle'
): OptimizerProbeState[] {
  const startPos: Record<'rosenbrock' | 'rastrigin' | 'saddle', [number, number]> = {
    rosenbrock: [-1.25, 1.45],
    rastrigin: [-1.55, 1.35],
    saddle: [0.65, 0.14],
  };
  const [sx, sy] = startPos[landscape];
  const initEval = evaluateLossLandscape(sx, sy, landscape);

  const make = (
    name: 'SGD' | 'Momentum' | 'Adam',
    crayon: 'cobalt' | 'ochre' | 'sage'
  ): OptimizerProbeState => ({
    name,
    crayon,
    x: sx,
    y: sy,
    z: initEval.visualHeight,
    gradX: initEval.gx,
    gradY: initEval.gy,
    velX: 0,
    velY: 0,
    mX: 0,
    mY: 0,
    vX: 0,
    vY: 0,
    stepCount: 0,
    trail: [[sx, initEval.visualHeight, sy]],
    diverged: false,
  });

  return [make('SGD', 'cobalt'), make('Momentum', 'ochre'), make('Adam', 'sage')];
}

export function stepOptimizerProbe(
  probe: OptimizerProbeState,
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle',
  lr: number,
  beta: number
): OptimizerProbeState {
  if (probe.diverged) return probe;

  const { gx, gy } = evaluateLossLandscape(probe.x, probe.y, landscape);
  const clampedGx = Math.max(-25, Math.min(25, gx));
  const clampedGy = Math.max(-25, Math.min(25, gy));

  let nx = probe.x;
  let ny = probe.y;
  let velX = probe.velX;
  let velY = probe.velY;
  let mX = probe.mX;
  let mY = probe.mY;
  let vX = probe.vX;
  let vY = probe.vY;
  const stepCount = probe.stepCount + 1;

  if (probe.name === 'SGD') {
    nx = probe.x - lr * clampedGx;
    ny = probe.y - lr * clampedGy;
    velX = -lr * clampedGx;
    velY = -lr * clampedGy;
  } else if (probe.name === 'Momentum') {
    velX = beta * probe.velX - lr * clampedGx;
    velY = beta * probe.velY - lr * clampedGy;
    nx = probe.x + velX;
    ny = probe.y + velY;
  } else {
    // Adam with bias correction
    const b1 = Math.min(0.95, Math.max(0.5, beta));
    const b2 = 0.99;
    const eps = 1e-8;
    mX = b1 * probe.mX + (1 - b1) * clampedGx;
    mY = b1 * probe.mY + (1 - b1) * clampedGy;
    vX = b2 * probe.vX + (1 - b2) * clampedGx * clampedGx;
    vY = b2 * probe.vY + (1 - b2) * clampedGy * clampedGy;
    const mHatX = mX / (1 - Math.pow(b1, stepCount));
    const mHatY = mY / (1 - Math.pow(b1, stepCount));
    const vHatX = vX / (1 - Math.pow(b2, stepCount));
    const vHatY = vY / (1 - Math.pow(b2, stepCount));
    const adamStepX = -lr * 1.65 * (mHatX / (Math.sqrt(vHatX) + eps));
    const adamStepY = -lr * 1.65 * (mHatY / (Math.sqrt(vHatY) + eps));
    nx = probe.x + adamStepX;
    ny = probe.y + adamStepY;
    velX = adamStepX;
    velY = adamStepY;
  }

  const diverged = !Number.isFinite(nx) || !Number.isFinite(ny) || Math.hypot(nx, ny) > 4.2;
  const safeX = Math.max(-2.6, Math.min(2.6, Number.isFinite(nx) ? nx : probe.x));
  const safeY = Math.max(-2.6, Math.min(2.6, Number.isFinite(ny) ? ny : probe.y));
  const nextEval = evaluateLossLandscape(safeX, safeY, landscape);

  const nextTrail =
    probe.trail.length > 140
      ? [...probe.trail.slice(1), [safeX, nextEval.visualHeight, safeY] as [number, number, number]]
      : [...probe.trail, [safeX, nextEval.visualHeight, safeY] as [number, number, number]];

  return {
    ...probe,
    x: safeX,
    y: safeY,
    z: nextEval.visualHeight,
    gradX: nextEval.gx,
    gradY: nextEval.gy,
    velX,
    velY,
    mX,
    mY,
    vX,
    vY,
    stepCount,
    trail: nextTrail,
    diverged,
  };
}

/**
 * Symbolic Regression target & basis evaluator for Scene 2.4
 * Human combines weights over [sin(x), cos(y), x^2-y^2, x*y, exp(-r^2)]
 */
export interface SymbolicTargetSpec {
  id: number;
  name: string;
  weights: [number, number, number, number, number];
  formulaLatex: string;
}

export const SYMBOLIC_TARGETS: SymbolicTargetSpec[] = [
  {
    id: 0,
    name: 'Onda Gaussiana Compuesta',
    weights: [0.65, 0.45, 0.0, 0.25, 0.8],
    formulaLatex: '0.65\\sin(x) + 0.45\\cos(y) + 0.25xy + 0.80e^{-r^2}',
  },
  {
    id: 1,
    name: 'Silla Armónica',
    weights: [0.5, -0.4, 0.35, 0.0, 0.6],
    formulaLatex: '0.50\\sin(x) - 0.40\\cos(y) + 0.35(x^2-y^2) + 0.60e^{-r^2}',
  },
  {
    id: 2,
    name: 'Interferencia Cruzada',
    weights: [-0.55, 0.55, 0.2, -0.45, 0.5],
    formulaLatex: '-0.55\\sin(x) + 0.55\\cos(y) + 0.20(x^2-y^2) - 0.45xy + 0.50e^{-r^2}',
  },
];

export function evaluateSymbolicBasis(
  x: number,
  y: number,
  wSin: number,
  wCos: number,
  wQuad: number,
  wCross: number,
  wGauss: number
): number {
  const r2 = x * x + y * y;
  return (
    wSin * Math.sin(x) +
    wCos * Math.cos(y) +
    wQuad * 0.25 * (x * x - y * y) +
    wCross * 0.35 * (x * y) +
    wGauss * Math.exp(-0.55 * r2)
  );
}

export function computeSurfaceMse(
  wSin: number,
  wCos: number,
  wQuad: number,
  wCross: number,
  wGauss: number,
  targetWeights: [number, number, number, number, number],
  gridN = 11
): number {
  let sumSq = 0;
  let count = 0;
  for (let i = 0; i < gridN; i++) {
    const x = -2 + (4 * i) / (gridN - 1);
    for (let j = 0; j < gridN; j++) {
      const y = -2 + (4 * j) / (gridN - 1);
      const pred = evaluateSymbolicBasis(x, y, wSin, wCos, wQuad, wCross, wGauss);
      const tgt = evaluateSymbolicBasis(
        x,
        y,
        targetWeights[0],
        targetWeights[1],
        targetWeights[2],
        targetWeights[3],
        targetWeights[4]
      );
      const diff = pred - tgt;
      sumSq += diff * diff;
      count++;
    }
  }
  return sumSq / Math.max(1, count);
}
