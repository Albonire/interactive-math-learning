import type { ChallengeSpec, OptimizerProbeState, SceneId } from '../core/types';
import {
  computeRealEigen2D,
  computeRank3,
  determinant3,
  mat3FromColumns,
  type ActivationKind,
  type ManifoldDatasetKind,
} from '../math/linearAlgebra';
import {
  SYMBOLIC_TARGETS,
  computeSurfaceMse,
  evaluateAutoDiffDag,
  evaluateLossLandscape,
  evaluatePartialGradients,
} from '../math/multivariable';
import { evaluateChallengeAttempt } from './challengeGenerator';

export type AiHintKind = 'divergence' | 'stagnation' | 'guidance';

export interface ParamInteractionSample {
  timestampMs: number;
  paramId: string;
  value: number;
  errorMetric: number;
}

export interface AiHintAnalysisInput {
  sceneId: SceneId;
  params: Record<string, number>;
  history: readonly ParamInteractionSample[];
  activeChallenge: ChallengeSpec | null;
  activation: ActivationKind;
  dataset: ManifoldDatasetKind;
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
  optimizerProbes: readonly OptimizerProbeState[];
  optimizerRunning: boolean;
  autoDiffPass: 'idle' | 'forward' | 'backward';
  symbolicTargetIdx: number;
  /** When true (user explicitly pressed "Pista IA"), return an actionable coaching hint even before stagnation triggers */
  forceAdvice?: boolean;
}

export interface AiHintSuggestion {
  id: string;
  kind: AiHintKind;
  title: string;
  diagnosis: string;
  suggestion: string;
  recommendedParams?: Record<string, number>;
  recommendedActivation?: ActivationKind;
  recommendedAutoDiffPass?: 'forward' | 'backward';
  recommendedStartOptimizer?: boolean;
  confidence: number;
}

/**
 * Computes a scene-normalized objective error scalar (lower = better / closer to
 * convergence or active Reto target) used to detect stagnation or divergence over time.
 */
export function computeSceneObjectiveError(
  sceneId: SceneId,
  params: Record<string, number>,
  opts: {
    activeChallenge: ChallengeSpec | null;
    activation: ActivationKind;
    dataset: ManifoldDatasetKind;
    landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
    optimizerProbes: readonly OptimizerProbeState[];
    symbolicTargetIdx: number;
  }
): number {
  const adam = opts.optimizerProbes[2];
  const adamLoss = adam
    ? evaluateLossLandscape(adam.x, adam.y, opts.landscape).loss
    : 1.5;

  if (opts.activeChallenge && opts.activeChallenge.sceneId === sceneId) {
    const res = evaluateChallengeAttempt(opts.activeChallenge, params, {
      activation: opts.activation,
      dataset: opts.dataset,
      adamLoss,
      adamSteps: adam?.stepCount ?? 0,
      adamDiverged: adam?.diverged ?? false,
      symbolicTargetIdx: opts.symbolicTargetIdx,
    });
    return Number(Math.max(0, res.errorMetric).toFixed(4));
  }

  switch (sceneId) {
    case 'lin-span': {
      const c1 = params.c1 ?? 1.2;
      const c2 = params.c2 ?? 1.1;
      const v3y = params.v3y ?? 1.0;
      const det = Math.abs(
        determinant3(mat3FromColumns([c1 * 1.4, 0, 0.25], [0.25, 0, c2 * 1.35], [0.45, v3y, 0.45]))
      );
      return Number(Math.min(1.5, Math.abs(det - 1.5) / 2.2).toFixed(4));
    }
    case 'lin-svd': {
      const a11 = params.a11 ?? 1.3;
      const a12 = params.a12 ?? 0.5;
      const a21 = params.a21 ?? 0.2;
      const a22 = params.a22 ?? 1.1;
      const a33 = params.a33 ?? 1.0;
      const det = determinant3(mat3FromColumns([a11, a21, 0], [a12, a22, 0], [0, 0, a33]));
      return Number(Math.min(1.5, Math.abs(det)).toFixed(4));
    }
    case 'lin-eigen': {
      const eigPairs = computeRealEigen2D(
        params.a ?? 1.5,
        params.b ?? 0.5,
        params.c ?? 0.3,
        params.d ?? 0.9
      );
      if (eigPairs.length > 0) {
        const theta = ((params.probeAngle ?? 0.4) % Math.PI + Math.PI) % Math.PI;
        let best = Math.PI;
        for (const pair of eigPairs) {
          const a = ((Math.atan2(pair.vector[1], pair.vector[0]) % Math.PI) + Math.PI) % Math.PI;
          const d = Math.min(Math.abs(theta - a), Math.PI - Math.abs(theta - a));
          if (d < best) best = d;
        }
        return Number((best / (Math.PI / 2)).toFixed(4));
      }
      return 0.7;
    }
    case 'lin-manifold': {
      if (opts.activation === 'linear') return 0.92;
      const fold = params.fold ?? 1.0;
      const weight = params.weight ?? 1.4;
      return Number(
        Math.max(0, 1 - Math.min(1, (Math.abs(fold) / 1.35) * 0.65 + (Math.abs(weight) / 2.0) * 0.35)).toFixed(4)
      );
    }
    case 'calc-partials': {
      const g = evaluatePartialGradients(params.x0 ?? 0.6, params.y0 ?? 0.4, params.freq ?? 1.0);
      const gradMag = Math.hypot(g.fx, g.fy);
      return Number(Math.min(1.5, gradMag / 2.4).toFixed(4));
    }
    case 'calc-autodiff': {
      const snap = evaluateAutoDiffDag(params.x ?? 0.7, params.y ?? 0.6, params.w ?? 1.6);
      return Number(Math.min(1.5, Math.hypot(snap.gradX, snap.gradY) / 4).toFixed(4));
    }
    case 'calc-optimizers': {
      if (!adam) return 0.8;
      if (adam.diverged || !Number.isFinite(adamLoss)) return 2.5;
      return Number(Math.min(2.0, Math.log10(1 + Math.max(0, adamLoss))).toFixed(4));
    }
    case 'calc-symbolic': {
      const target = SYMBOLIC_TARGETS[opts.symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
      const mse = computeSurfaceMse(
        params.wSin ?? 0.2,
        params.wCos ?? 0.2,
        params.wQuad ?? 0,
        params.wCross ?? 0,
        params.wGauss ?? 0.3,
        target.weights
      );
      return Number(Math.min(2.0, mse).toFixed(4));
    }
  }
}

function countSignReversals(samples: readonly ParamInteractionSample[]): number {
  let reversals = 0;
  const lastSignByParam = new Map<string, number>();
  const lastValByParam = new Map<string, number>();

  for (const s of samples) {
    const prevVal = lastValByParam.get(s.paramId);
    if (prevVal !== undefined) {
      const sign = Math.sign(s.value - prevVal);
      if (sign !== 0) {
        const prevSign = lastSignByParam.get(s.paramId) ?? 0;
        if (prevSign !== 0 && sign !== prevSign) {
          reversals++;
        }
        lastSignByParam.set(s.paramId, sign);
      }
    }
    lastValByParam.set(s.paramId, s.value);
  }
  return reversals;
}

function buildSceneSpecificAdjustment(
  input: AiHintAnalysisInput,
  kind: AiHintKind
): Omit<AiHintSuggestion, 'id' | 'kind' | 'confidence'> {
  const { sceneId, params, activeChallenge, activation, optimizerProbes, symbolicTargetIdx } = input;

  switch (sceneId) {
    case 'calc-optimizers': {
      const lr = params.lr ?? 0.06;
      const beta = params.beta ?? 0.82;
      const adam = optimizerProbes[2];
      const sgd = optimizerProbes[0];
      const anyDiverged = Boolean(adam?.diverged || sgd?.diverged || lr > 0.24);

      if (kind === 'divergence' || anyDiverged) {
        return {
          title: 'Divergencia por tasa de aprendizaje alta',
          diagnosis: `Con α = ${lr.toFixed(3)}, los pasos saltan de pared a pared en el valle y el error explota en lugar de descender.`,
          suggestion: 'Reduce α hacia 0.055 y mantén β cerca de 0.86 para estabilizar el descenso de Adam.',
          recommendedParams: { lr: 0.055, beta: 0.86 },
          recommendedStartOptimizer: true,
        };
      }
      if (lr < 0.025) {
        return {
          title: 'Estancamiento por pasos demasiado pequeños',
          diagnosis: `Con α = ${lr.toFixed(3)}, el optimizador avanza muy lento y queda atrapado en la meseta del valle.`,
          suggestion: 'Sube α a 0.065 y β a 0.88 para ganar inercia sin perder estabilidad.',
          recommendedParams: { lr: 0.065, beta: 0.88 },
          recommendedStartOptimizer: true,
        };
      }
      return {
        title: 'Ajuste sugerido para el valle',
        diagnosis: `El momento actual (β = ${beta.toFixed(2)}) y paso (α = ${lr.toFixed(3)}) están oscilando sin converger al mínimo.`,
        suggestion: 'Prueba α = 0.055 y β = 0.88 para suavizar las oscilaciones laterales.',
        recommendedParams: { lr: 0.055, beta: 0.88 },
        recommendedStartOptimizer: true,
      };
    }

    case 'lin-manifold': {
      if (activation === 'linear') {
        return {
          title: 'Estancamiento lineal detectado',
          diagnosis:
            'Sigues ajustando pesos y sesgo con activación Lineal: una transformación lineal nunca puede doblar anillos o espirales.',
          suggestion: 'Cambia a activación Tanh y sube el pliegue a 1.25 para separar las clases.',
          recommendedActivation: 'tanh',
          recommendedParams: { weight: 1.6, bias: 0.1, fold: 1.25 },
        };
      }
      return {
        title: 'Pliegue insuficiente del espacio',
        diagnosis: 'Los parámetros actuales deforman poco la superficie y las dos clases siguen mezcladas.',
        suggestion: 'Aumenta peso W = 1.8 y pliegue = 1.3 para abrir la brecha de separación.',
        recommendedParams: { weight: 1.8, bias: 0.1, fold: 1.3 },
      };
    }

    case 'lin-span': {
      const wantCollapse = Boolean(activeChallenge && 'v3y' in activeChallenge.targetParams);
      if (wantCollapse) {
        return {
          title: kind === 'divergence' ? 'Te estás alejando del colapso de rango' : 'Estancamiento al buscar rango 2',
          diagnosis: `Con v₃y = ${(params.v3y ?? 1).toFixed(2)}, el tercer vector sigue elevado fuera del plano de v₁ y v₂.`,
          suggestion: 'Acerca v₃y a 0.05 para volver coplanar el tercer vector y colapsar el volumen a ~0.',
          recommendedParams: { v3y: 0.05 },
        };
      }
      const targetVol = activeChallenge?.targetParams.targetVol ?? 2.0;
      const suggestedV3y = Number(Math.max(0.4, Math.min(1.65, targetVol / 1.85)).toFixed(2));
      return {
        title: kind === 'divergence' ? 'El volumen se desvía del objetivo' : 'Ajuste fino del volumen 3D',
        diagnosis: `El paralelepípedo aún no alcanza la estabilidad de rango 3 / volumen ≈ ${targetVol.toFixed(2)}.`,
        suggestion: `Prueba c₁ = 1.1, c₂ = 1.1 y v₃y = ${suggestedV3y.toFixed(2)} para equilibrar la base.`,
        recommendedParams: { c1: 1.1, c2: 1.1, v3y: suggestedV3y },
      };
    }

    case 'lin-svd': {
      const targetDet = activeChallenge?.targetParams.targetDet;
      if (targetDet === 0) {
        return {
          title: 'Matriz aún invertible (det ≠ 0)',
          diagnosis: 'Las columnas siguen siendo linealmente independientes y el cubo unitario no colapsa.',
          suggestion: 'Iguala la razón entre filas con a₁₁ = 1.0, a₁₂ = 1.0, a₂₁ = 0.8, a₂₂ = 0.8 para llevar det(A) → 0.',
          recommendedParams: { a11: 1.0, a12: 1.0, a21: 0.8, a22: 0.8, svdStage: 3.0 },
        };
      }
      if (targetDet !== undefined && targetDet < 0) {
        return {
          title: 'Orientación sin inversión detectada',
          diagnosis: 'El determinante sigue positivo; necesitas reflejar uno de los ejes principales.',
          suggestion: 'Invierte el signo de a₁₁ a -1.0 manteniendo a₂₂ = 1.0 y a₃₃ = 1.0 para obtener det(A) ≈ -1.',
          recommendedParams: { a11: -1.0, a12: 0.0, a21: 0.0, a22: 1.0, a33: 1.0 },
        };
      }
      return {
        title: 'Descomposición SVD en pausa o estancada',
        diagnosis: 'Puedes ver con mayor claridad el estiramiento de los ejes singulares pausando en la etapa intermedia Σ.',
        suggestion: 'Ajusta t_SVD = 1.50 para inspeccionar el escalado puro antes de la rotación U.',
        recommendedParams: { svdStage: 1.5 },
      };
    }

    case 'lin-eigen': {
      const eigPairs = computeRealEigen2D(
        params.a ?? 1.5,
        params.b ?? 0.5,
        params.c ?? 0.3,
        params.d ?? 0.9
      );
      if (eigPairs.length > 0) {
        const v = eigPairs[0].vector;
        const targetAngle = Number(
          (((Math.atan2(v[1], v[0]) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)).toFixed(2)
        );
        return {
          title: kind === 'divergence' ? 'El vector sonda gira fuera del eje invariante' : 'Estancamiento buscando la dirección propia',
          diagnosis: 'A·v todavía presenta rotación respecto al vector sonda v.',
          suggestion: `Gira el ángulo θ cerca de ${targetAngle.toFixed(2)} rad para alinear v con el eigenvector principal.`,
          recommendedParams: { probeAngle: targetAngle },
        };
      }
      return {
        title: 'Eigenvalores complejos (rotación pura)',
        diagnosis: 'Con los valores actuales de la matriz no existen direcciones reales invariantes.',
        suggestion: 'Restaura a = 1.5, b = 0.5, c = 0.3, d = 0.9 para recuperar eigenvalores reales.',
        recommendedParams: { a: 1.5, b: 0.5, c: 0.3, d: 0.9 },
      };
    }

    case 'calc-partials': {
      return {
        title: kind === 'divergence' ? 'Pendiente creciente en la superficie' : 'Estancamiento en la búsqueda del punto estacionario',
        diagnosis: 'La magnitud del gradiente ‖∇f‖ sigue alejada de cero en el punto de corte actual.',
        suggestion: 'Mueve el punto de evaluación cerca de x₀ = 0.0, y₀ = 0.0 con frecuencia = 1.1 para equilibrar ambas pendientes.',
        recommendedParams: { x0: 0.0, y0: 0.0, freq: 1.1 },
      };
    }

    case 'calc-autodiff': {
      return {
        title: 'Explora la propagación de gradientes',
        diagnosis: 'Modificar x, y, w sin ejecutar el pase inverso impide ver cómo la regla de la cadena acumula ∂f/∂x.',
        suggestion: 'Ajusta x = 1.4, w = 0.9 y activa el pase Backward para observar el flujo de derivadas en el DAG.',
        recommendedParams: { x: 1.4, w: 0.9 },
        recommendedAutoDiffPass: 'backward',
      };
    }

    case 'calc-symbolic': {
      const target = SYMBOLIC_TARGETS[symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
      const keys = ['wSin', 'wCos', 'wQuad', 'wCross', 'wGauss'] as const;
      let worstKey: (typeof keys)[number] = 'wSin';
      let worstDiff = -1;
      let worstTarget = 0;

      keys.forEach((k, idx) => {
        const cur = params[k] ?? 0;
        const tgt = target.weights[idx] ?? 0;
        const diff = Math.abs(cur - tgt);
        if (diff > worstDiff) {
          worstDiff = diff;
          worstKey = k;
          worstTarget = tgt;
        }
      });

      const currentVal = params[worstKey] ?? 0;
      // Nudge 75% of the way toward the target weight so the user still feels discovery + immediate error drop
      const nudgeVal = Number((currentVal + (worstTarget - currentVal) * 0.75).toFixed(2));
      const direction = worstTarget > currentVal ? 'aumenta' : 'reduce';

      return {
        title:
          kind === 'divergence'
            ? 'El error MSE está subiendo'
            : 'Estancamiento en el ajuste simbólico',
        diagnosis: `El término ${worstKey} es el que más contribuye al error residual contra la superficie objetivo.`,
        suggestion: `Como ajuste principal, ${direction} ${worstKey} hacia ${nudgeVal.toFixed(2)} para bajar el MSE rápidamente.`,
        recommendedParams: { [worstKey]: nudgeVal },
      };
    }
  }
}

/**
 * Analyzes recent parameter interactions and live lesson physics to detect:
 * 1. Optimization divergence (exploding loss / moving monotonically away from goal)
 * 2. Stagnation (repeated adjustments or oscillation with flat/non-improving objective error)
 *
 * Returns null when the learner is making healthy progress (unless `forceAdvice` is requested).
 */
export function analyzeUserInteractionsForAiHint(
  input: AiHintAnalysisInput
): AiHintSuggestion | null {
  const { sceneId, history, params, optimizerProbes, activation, forceAdvice } = input;
  const recent = history.slice(-10);

  // 1. High-priority real-time divergence in Lesson 7 (Optimizers)
  if (sceneId === 'calc-optimizers') {
    const lr = params.lr ?? 0.06;
    const adam = optimizerProbes[2];
    const sgd = optimizerProbes[0];
    if (adam?.diverged || sgd?.diverged || (input.optimizerRunning && lr >= 0.24)) {
      const body = buildSceneSpecificAdjustment(input, 'divergence');
      return {
        id: `hint-div-opt-${Math.round(lr * 1000)}`,
        kind: 'divergence',
        ...body,
        confidence: 0.96,
      };
    }
    const adamLoss = adam
      ? evaluateLossLandscape(adam.x, adam.y, input.landscape).loss
      : 1.5;
    if (adam && adam.stepCount >= 32 && adamLoss > 0.4 && lr <= 0.02) {
      const body = buildSceneSpecificAdjustment(input, 'stagnation');
      return {
        id: `hint-stag-opt-${adam.stepCount}`,
        kind: 'stagnation',
        ...body,
        confidence: 0.88,
      };
    }
  }

  // 2. Linear activation trap in Lesson 4 (Manifold Folding) after >= 3 slider adjustments
  if (sceneId === 'lin-manifold' && activation === 'linear' && recent.length >= 3) {
    const body = buildSceneSpecificAdjustment(input, 'stagnation');
    return {
      id: `hint-stag-manifold-linear`,
      kind: 'stagnation',
      ...body,
      confidence: 0.94,
    };
  }

  // 3. Trajectory divergence across recent parameter interactions (error strictly worsening)
  if (recent.length >= 4) {
    const window4 = recent.slice(-4);
    const errStart = window4[0].errorMetric;
    const errEnd = window4[window4.length - 1].errorMetric;
    const delta = errEnd - errStart;

    let worseningSteps = 0;
    for (let i = 1; i < window4.length; i++) {
      if (window4[i].errorMetric > window4[i - 1].errorMetric + 0.015) {
        worseningSteps++;
      }
    }

    if (delta >= 0.16 && worseningSteps >= 2 && errEnd > 0.25) {
      const body = buildSceneSpecificAdjustment(input, 'divergence');
      return {
        id: `hint-div-${sceneId}-${Math.round(errEnd * 100)}`,
        kind: 'divergence',
        ...body,
        confidence: 0.86,
      };
    }
  }

  // 4. Optimization stagnation: >= 5 recent adjustments with flat improvement or back-and-forth oscillation
  if (recent.length >= 5) {
    const window6 = recent.slice(-6);
    const firstErr = window6[0].errorMetric;
    const lastErr = window6[window6.length - 1].errorMetric;
    const minErr = Math.min(...window6.map((s) => s.errorMetric));
    const maxErr = Math.max(...window6.map((s) => s.errorMetric));
    const improvement = firstErr - lastErr;
    const spread = maxErr - minErr;
    const reversals = countSignReversals(window6);

    // Check if user is still far from convergence/optimal
    const stillUnsolved = lastErr > 0.18;
    const flatPlateau = improvement < 0.035 && spread < 0.12;
    const oscillating = reversals >= 3 && improvement < 0.06;

    // Also guard against Lesson 1 normal free exploration if rank is 3 and user hasn't opened challenge
    const spanRank =
      sceneId === 'lin-span'
        ? computeRank3(
            [(params.c1 ?? 1.2) * 1.4, 0, 0.25],
            [0.25, 0, (params.c2 ?? 1.1) * 1.35],
            [0.45, params.v3y ?? 1.0, 0.45]
          )
        : 3;

    if (stillUnsolved && (oscillating || (flatPlateau && (input.activeChallenge !== null || recent.length >= 6 || spanRank < 3)))) {
      const body = buildSceneSpecificAdjustment(input, 'stagnation');
      return {
        id: `hint-stag-${sceneId}-${reversals}-${Math.round(lastErr * 100)}`,
        kind: 'stagnation',
        ...body,
        confidence: oscillating ? 0.89 : 0.81,
      };
    }
  }

  // 5. On-demand coaching when user explicitly clicks "Pista IA"
  if (forceAdvice) {
    const body = buildSceneSpecificAdjustment(input, 'guidance');
    return {
      id: `hint-guide-${sceneId}-${Date.now()}`,
      kind: 'guidance',
      ...body,
      confidence: 0.78,
    };
  }

  return null;
}
