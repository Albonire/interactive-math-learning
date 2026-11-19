import type { ChallengeSpec } from '../core/types';
import type { ActivationKind } from '../math/linearAlgebra';
import { SYMBOLIC_TARGETS } from '../math/multivariable';
import { evaluateChallengeAttempt } from './challengeGenerator';

export interface ChallengeExtraState {
  activation?: ActivationKind;
  dataset?: 'rings' | 'spiral';
  adamLoss?: number;
  adamSteps?: number;
  adamDiverged?: boolean;
  symbolicTargetIdx?: number;
}

export interface ChallengeProximityState {
  /** Normalized optimality proximity in [0, 1]. 0 = far, 0.1..0.86 = warming up, 1.0 = optimal */
  overallProximity: number;
  /** True when the live parameters satisfy the Reto's exact solved condition */
  isOptimal: boolean;
  /** Per-parameter artisanal crayon glow intensity in [0, 1] */
  paramIntensities: Record<string, number>;
  /** Short dual-coded status text when warming up or optimal (null when far) */
  cueLabel: string | null;
}

const EMPTY_PROXIMITY: ChallengeProximityState = {
  overallProximity: 0,
  isOptimal: false,
  paramIntensities: {},
  cueLabel: null,
};

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Resolves which parameter sliders directly govern a given Reto's objective.
 */
function getActiveChallengeParamIds(challenge: ChallengeSpec): string[] {
  switch (challenge.sceneId) {
    case 'lin-span':
      return 'v3y' in challenge.targetParams ? ['v3y'] : ['c1', 'c2', 'v3y'];
    case 'lin-svd':
      return ['a11', 'a12', 'a21', 'a22', 'a33'];
    case 'lin-eigen':
      return ['probeAngle'];
    case 'lin-manifold':
      return ['weight', 'bias', 'fold'];
    case 'calc-partials':
      return ['x0', 'y0', 'freq'];
    case 'calc-autodiff':
      return ['x', 'y', 'w'];
    case 'calc-optimizers':
      return ['lr', 'beta'];
    case 'calc-symbolic':
      return ['wSin', 'wCos', 'wQuad', 'wCross', 'wGauss'];
  }
}

/**
 * Pure computation of how close the student's live parameters are to the active Reto's
 * optimal zone. Reuses `evaluateChallengeAttempt` so visual feedback is 100% consistent
 * with official Reto verification.
 */
export function computeChallengeParamProximity(
  challenge: ChallengeSpec | null,
  params: Record<string, number>,
  extraState: ChallengeExtraState
): ChallengeProximityState {
  if (!challenge) return EMPTY_PROXIMITY;

  const evalResult = evaluateChallengeAttempt(challenge, params, extraState);
  const activeParamIds = getActiveChallengeParamIds(challenge);

  // Smooth artisanal warm-up curve: quiet while far (errorMetric >= 0.48),
  // blooms softly as the user approaches, and intensifies cleanly to 1.0 when optimal.
  let overallProximity = 0;
  if (evalResult.solved) {
    overallProximity = 1.0;
  } else {
    const startThreshold = 0.48;
    if (evalResult.errorMetric < startThreshold) {
      const norm = clamp01((startThreshold - evalResult.errorMetric) / startThreshold);
      overallProximity = Number((Math.pow(norm, 1.35) * 0.84).toFixed(3));
    }
  }

  // Never falsely suggest optimal on linear activation when challenge requires nonlinear folding
  if (challenge.sceneId === 'lin-manifold' && extraState.activation === 'linear') {
    overallProximity = Math.min(overallProximity, 0.2);
  }

  const paramIntensities: Record<string, number> = {};

  if (challenge.sceneId === 'calc-symbolic') {
    const target = SYMBOLIC_TARGETS[extraState.symbolicTargetIdx ?? 0] ?? SYMBOLIC_TARGETS[0];
    const keys = ['wSin', 'wCos', 'wQuad', 'wCross', 'wGauss'] as const;
    keys.forEach((key, idx) => {
      const current = params[key] ?? 0;
      const targetVal = target.weights[idx] ?? 0;
      const diff = Math.abs(current - targetVal);
      // Individual slider softly warms up when its weight is close to the hidden target weight
      const localProx = diff < 0.35 ? Math.pow(clamp01((0.35 - diff) / 0.35), 1.4) * 0.72 : 0;
      paramIntensities[key] = evalResult.solved
        ? 1.0
        : Number(Math.max(overallProximity, localProx * 0.85).toFixed(3));
    });
  } else {
    for (const id of activeParamIds) {
      paramIntensities[id] = overallProximity;
    }
  }

  let cueLabel: string | null = null;
  if (evalResult.solved) {
    cueLabel = '✓ En zona óptima';
  } else if (overallProximity >= 0.55) {
    cueLabel = 'Muy cerca del objetivo';
  } else if (overallProximity >= 0.22) {
    cueLabel = 'Acercándote al objetivo';
  }

  return {
    overallProximity,
    isOptimal: evalResult.solved,
    paramIntensities,
    cueLabel,
  };
}
