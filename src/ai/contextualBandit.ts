import type { BanditArmId } from '../core/types';

export const CONTEXT_DIM = 5;
export const NUM_ARMS = 4;

export interface BanditContext {
  mastery: number;          // P(L_t) in [0, 1]
  normalizedError: number;  // e_t in [0, 1]
  erraticIndex: number;     // [0, 1]
  normalizedTime: number;   // [0, 1]
  layersOpenedRatio: number;// [0, 1]
}

export interface ArmMetadata {
  id: BanditArmId;
  label: string;
  description: string;
}

export const BANDIT_ARMS: Record<BanditArmId, ArmMetadata> = {
  0: {
    id: 0,
    label: 'Refuerzo Anatómico Guiado',
    description: 'Coeficientes enteros simples y encendido automático de la capa clave.',
  },
  1: {
    id: 1,
    label: 'Práctica Estándar Calibrada',
    description: 'Complejidad equilibrada con capas anatómicas disponibles bajo demanda.',
  },
  2: {
    id: 2,
    label: 'Retiro de Andamiaje',
    description: 'Oculta guías auxiliares para consolidar tu intuición geométrica directa.',
  },
  3: {
    id: 3,
    label: 'Desafío de Transferencia',
    description: 'Casos frontera: matrices casi singulares, valles estrechos o puntos de silla.',
  },
};

export interface LinUcbArmState {
  A: number[]; // 5x5 row-major
  b: number[]; // 5
  pulls: number;
}

export interface LinUcbState {
  alpha: number;
  arms: Record<BanditArmId, LinUcbArmState>;
}

function makeIdentity5(): number[] {
  const m = new Array<number>(25).fill(0);
  for (let i = 0; i < 5; i++) m[i * 5 + i] = 1;
  return m;
}

export function createInitialBanditState(alpha = 0.65): LinUcbState {
  // Mild pedagogical priors so cold-start aligns with Zone of Proximal Development
  return {
    alpha,
    arms: {
      0: { A: makeIdentity5(), b: [-0.35, 0.45, 0.3, 0.15, 0.1], pulls: 0 },
      1: { A: makeIdentity5(), b: [0.15, 0.1, 0.0, 0.05, 0.15], pulls: 0 },
      2: { A: makeIdentity5(), b: [0.4, -0.25, -0.2, -0.05, 0.1], pulls: 0 },
      3: { A: makeIdentity5(), b: [0.65, -0.4, -0.35, -0.1, 0.2], pulls: 0 },
    },
  };
}

export function contextToVector(ctx: BanditContext): number[] {
  return [
    Math.max(0, Math.min(1, ctx.mastery)),
    Math.max(0, Math.min(1, ctx.normalizedError)),
    Math.max(0, Math.min(1, ctx.erraticIndex)),
    Math.max(0, Math.min(1, ctx.normalizedTime)),
    Math.max(0, Math.min(1, ctx.layersOpenedRatio)),
  ];
}

/**
 * Solves A * x = rhs for a 5x5 symmetric positive-definite matrix via Gaussian elimination with partial pivoting.
 */
export function solveLinear5(A: number[], rhs: number[]): number[] {
  const n = CONTEXT_DIM;
  const M = Array.from({ length: n }, (_, r) => [
    A[r * n + 0],
    A[r * n + 1],
    A[r * n + 2],
    A[r * n + 3],
    A[r * n + 4],
    rhs[r],
  ]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > maxVal) {
        maxVal = Math.abs(M[r][col]);
        pivotRow = r;
      }
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }
    const diag = Math.abs(M[col][col]) < 1e-9 ? 1e-9 : M[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / diag;
      for (let c = col; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) {
      sum -= M[r][c] * x[c];
    }
    const diag = Math.abs(M[r][r]) < 1e-9 ? 1e-9 : M[r][r];
    x[r] = sum / diag;
  }
  return x;
}

export function selectBanditArm(state: LinUcbState, ctx: BanditContext): {
  arm: BanditArmId;
  scores: Record<BanditArmId, number>;
} {
  const x = contextToVector(ctx);
  const scores = {} as Record<BanditArmId, number>;
  let bestArm: BanditArmId = 0;
  let bestScore = -Infinity;

  const armIds: BanditArmId[] = [0, 1, 2, 3];
  for (const id of armIds) {
    const armState = state.arms[id];
    const theta = solveLinear5(armState.A, armState.b);
    const aInvX = solveLinear5(armState.A, x);

    let mean = 0;
    let variance = 0;
    for (let i = 0; i < CONTEXT_DIM; i++) {
      mean += theta[i] * x[i];
      variance += x[i] * aInvX[i];
    }
    const ucb = mean + state.alpha * Math.sqrt(Math.max(0, variance));
    scores[id] = ucb;
    if (ucb > bestScore) {
      bestScore = ucb;
      bestArm = id;
    }
  }

  return { arm: bestArm, scores };
}

export function updateBanditState(
  state: LinUcbState,
  arm: BanditArmId,
  ctx: BanditContext,
  reward: number
): LinUcbState {
  const x = contextToVector(ctx);
  const prev = state.arms[arm];
  const nextA = [...prev.A];
  const nextB = [...prev.b];

  for (let r = 0; r < CONTEXT_DIM; r++) {
    nextB[r] += reward * x[r];
    for (let c = 0; c < CONTEXT_DIM; c++) {
      nextA[r * CONTEXT_DIM + c] += x[r] * x[c];
    }
  }

  return {
    ...state,
    arms: {
      ...state.arms,
      [arm]: {
        A: nextA,
        b: nextB,
        pulls: prev.pulls + 1,
      },
    },
  };
}

/**
 * Zone of Proximal Development reward in [0, 1]:
 * Rewards low geometric error solved in a productive timeframe without trivial instant guessing or abandonment.
 */
export function computeZdpReward(
  solved: boolean,
  errorMetric: number,
  durationMs: number,
  erraticIndex: number
): number {
  const accuracyTerm = Math.max(0, 1 - errorMetric);
  const seconds = durationMs / 1000;
  // Optimal effort window ~ 8s..65s
  const pacingTerm =
    seconds < 3 ? 0.65 : seconds <= 65 ? 1.0 : Math.max(0.4, 1 - (seconds - 65) / 140);
  const stabilityPenalty = 0.2 * Math.max(0, Math.min(1, erraticIndex));
  const base = solved ? 0.55 + 0.45 * accuracyTerm : 0.35 * accuracyTerm;
  return Math.max(0, Math.min(1, base * pacingTerm - stabilityPenalty));
}
