import type { BanditArmId, ChallengeSpec, SceneId, SkillId } from '../core/types';
import { BANDIT_ARMS } from './contextualBandit';
import {
  computeRealEigen2D,
  computeRank3,
  determinant3,
  generateManifoldPoints,
  mat3FromColumns,
  type ActivationKind,
} from '../math/linearAlgebra';
import {
  SYMBOLIC_TARGETS,
  computeSurfaceMse,
  evaluateAutoDiffDag,
  evaluatePartialGradients,
} from '../math/multivariable';

/**
 * Deterministic PRNG (Mulberry32) for reproducible procedural challenges
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundTo(val: number, step: number): number {
  return Math.round(val / step) * step;
}

export function generateChallengeForScene(
  sceneId: SceneId,
  skillId: SkillId,
  arm: BanditArmId,
  seed: number
): ChallengeSpec {
  const rng = mulberry32(seed);
  const armMeta = BANDIT_ARMS[arm];
  const hideGuides = arm === 2;
  const now = Date.now();
  const base = {
    id: `${sceneId}-${seed}`,
    seed,
    sceneId,
    skillId,
    arm,
    armLabel: armMeta.label,
    armDescription: armMeta.description,
    hideGuides,
    startedAt: now,
  };

  switch (sceneId) {
    case 'lin-span': {
      const wantCollapse = arm === 0 || arm === 3;
      if (wantCollapse) {
        return {
          ...base,
          prompt:
            arm === 3
              ? 'Induce una pérdida exacta de rango (rango 2) manteniendo los tres vectores distintos de cero.'
              : 'Colapsa el volumen del paralelepípedo haciendo que el tercer vector quede coplanar (rango 2).',
          hint: 'Ajusta el componente vertical v₃y cerca de 0.15 (hasta que el deslizador brille) para que v₃ quede coplanar con v₁ y v₂.',
          targetDescription: 'Objetivo: Rango = 2 y |det| < 0.12',
          referenceContrast:
            'En gráficos 3D y ML, detectar columnas linealmente dependientes evita matrices no invertibles y elimina características redundantes.',
          recommendedLayers: ['substrate', 'structure', 'error'],
          targetParams: { v3y: 0 },
          tolerance: 0.12,
        };
      }
      const targetVol = roundTo(1.5 + rng() * 1.4, 0.25);
      return {
        ...base,
        prompt: `Ajusta las escalas c₁, c₂ y v₃y hasta lograr un volumen espacial cercano a ${targetVol.toFixed(2)} unidades³ sin colapsar el rango.`,
        hint: 'Aumenta v₃y para despegar el tercer vector del plano horizontal y conservar rango 3.',
        targetDescription: `Objetivo: Rango = 3 y volumen ≈ ${targetVol.toFixed(2)}`,
        referenceContrast:
          'El volumen generado por tres vectores base coincide con |det([v₁ v₂ v₃])|, base del cálculo de volumen en mallas 3D.',
        recommendedLayers: ['substrate', 'structure', 'operator'],
        targetParams: { targetVol },
        tolerance: 0.35,
      };
    }

    case 'lin-svd': {
      const targetDet = arm === 3 ? -1.0 : arm === 0 ? 0.0 : roundTo(1.5 + rng() * 1.2, 0.5);
      const prompt =
        targetDet === 0
          ? 'Ajusta la matriz A para generar una singularidad exacta (det(A) ≈ 0) y observar el colapso del cubo unitario.'
          : targetDet < 0
            ? 'Invierte la orientación del espacio logrando det(A) ≈ -1.0 (el cubo mostrará su reverso bermellón).'
            : `Calibra la matriz A hasta alcanzar un factor de volumen det(A) ≈ ${targetDet.toFixed(1)} y recorre la etapa SVD.`;
      return {
        ...base,
        prompt,
        hint:
          targetDet === 0
            ? 'Haz que las columnas sean proporcionales (por ejemplo, a₁₁·a₂₂ = a₁₂·a₂₁).'
            : targetDet < 0
              ? 'Cambia el signo de a₁₁ o aumenta el cizallamiento cruzado a₁₂ y a₂₁ para invertir el determinante.'
              : 'Recuerda que en una matriz 2×2 extendida a 3D, det(A) = (a₁₁·a₂₂ - a₁₂·a₂₁)·a₃₃.',
        targetDescription: `Objetivo: det(A) ≈ ${targetDet.toFixed(2)} (±0.22)`,
        referenceContrast:
          'Las matrices Model-View en WebGL exigen det > 0 para no invertir el culling de normales; en SVD, los valores singulares cercanos a cero permiten comprimir matrices.',
        recommendedLayers: ['substrate', 'structure', 'error'],
        targetParams: { targetDet },
        tolerance: 0.22,
      };
    }

    case 'lin-eigen': {
      const a = arm === 0 ? 1.5 : roundTo(1.2 + rng() * 0.8, 0.2);
      const b = arm === 0 ? 0.4 : roundTo(0.2 + rng() * 0.6, 0.2);
      const d = arm === 0 ? 0.8 : roundTo(0.6 + rng() * 0.7, 0.2);
      return {
        ...base,
        prompt:
          'Orienta el ángulo θ de la sonda direccional hasta alinearla exactamente con un autovector real (donde A·v no rota respecto a v).',
        hint: 'Observa cuándo el vector transformado bermellón se superpone con la dirección ocre de la sonda.',
        targetDescription: 'Objetivo: Error angular entre v y A·v < 5°',
        referenceContrast:
          'En PCA y PageRank, el autovector dominante se encuentra por iteración de potencia (v_{k+1} = Av_k / ||Av_k||), convergiendo a esta misma dirección invariante.',
        recommendedLayers: ['substrate', 'operator', 'invariant'],
        targetParams: { a, b, d },
        tolerance: 0.1,
      };
    }

    case 'lin-manifold': {
      return {
        ...base,
        prompt:
          arm === 3
            ? 'Logra al menos 92 % de separabilidad lineal en la variedad sin depender de una transformación lineal pura.'
            : 'Activa una no linealidad (tanh, ReLU o σ) y calibra el pliegue hasta separar limpiamente las clases Cobalto y Ciruela (> 88 %).',
        hint: 'Con activación lineal el plano nunca separa anillos concéntricos; cambia a tanh o σ y sube la fuerza de pliegue.',
        targetDescription: 'Objetivo: Precisión de separación lineal ≥ 88 %',
        referenceContrast:
          'Una red neuronal profunda encadena capas Wx+b seguidas de activaciones no lineales para desplegar variedades entrelazadas en un espacio linealmente separable.',
        recommendedLayers: ['structure', 'invariant', 'error'],
        targetParams: { minAcc: arm === 3 ? 0.92 : 0.88 },
        tolerance: 0.04,
      };
    }

    case 'calc-partials': {
      const targetSlope = arm === 0 ? 0.0 : roundTo((rng() - 0.5) * 1.4, 0.2);
      return {
        ...base,
        prompt:
          targetSlope === 0
            ? 'Desplaza el punto (x₀, y₀) sobre la superficie hasta ubicar un punto crítico donde el gradiente ||∇f|| sea casi nulo.'
            : `Posiciona (x₀, y₀) en una ladera donde la derivada parcial ∂f/∂x sea aproximadamente ${targetSlope.toFixed(2)}.`,
        hint: 'Activa los planos de corte X/Y para leer directamente la pendiente tangente de cada rebanada.',
        targetDescription:
          targetSlope === 0
            ? 'Objetivo: ||∇f(x₀, y₀)|| < 0.20'
            : `Objetivo: ∂f/∂x ≈ ${targetSlope.toFixed(2)} (±0.18)`,
        referenceContrast:
          'En optimización, encontrar ∇f = 0 identifica candidatos a mínimo, máximo o punto de silla; la Hessiana distingue su curvatura.',
        recommendedLayers: ['structure', 'operator', 'invariant'],
        targetParams: { targetSlope },
        tolerance: 0.18,
      };
    }

    case 'calc-autodiff': {
      const wantExplode = arm === 3;
      return {
        ...base,
        prompt: wantExplode
          ? 'Ajusta el peso w y la entrada x para provocar un gradiente grande (|∂f/∂x| > 3.5) y verifica el backward pass.'
          : 'Calibra (x, y, w) para lograr una derivada parcial ∂f/∂x cercana a 1.0 y ejecuta el Backward Pass.',
        hint: 'Recuerda que ∂f/∂x = y + w·cos(w·x). Observa cómo cos(w·x) modula el flujo inverso en el grafo DAG.',
        targetDescription: wantExplode
          ? 'Objetivo: |∂f/∂x| > 3.5 (zona de gradiente alto)'
          : 'Objetivo: ∂f/∂x ≈ 1.00 (±0.22)',
        referenceContrast:
          'PyTorch y JAX construyen exactamente este grafo DAG dinámico durante el forward pass y aplican la regla de la cadena en orden inverso en O(V+E).',
        recommendedLayers: ['structure', 'operator', 'error'],
        targetParams: { targetGradX: wantExplode ? 3.8 : 1.0, mode: wantExplode ? 1 : 0 },
        tolerance: 0.22,
      };
    }

    case 'calc-optimizers': {
      return {
        ...base,
        prompt:
          arm === 3
            ? 'Calibra la tasa de aprendizaje α e inercia β para que Adam y Momentum desciendan hacia el mínimo sin divergir.'
            : 'Ajusta α entre 0.03 y 0.16, corre la simulación al menos 15 pasos y consigue que Adam alcance pérdida baja sin rebotar.',
        hint: 'Un α demasiado alto hace divergir a SGD; Momentum y Adam amortiguan las oscilaciones en valles estrechos.',
        targetDescription: 'Objetivo: Pérdida de Adam < 0.35 tras ≥ 12 pasos sin divergencia',
        referenceContrast:
          'Adam normaliza el paso por la varianza móvil del gradiente (segundo momento), estabilizando el entrenamiento de redes profundas frente a SGD puro.',
        recommendedLayers: ['structure', 'operator', 'invariant', 'error'],
        targetParams: { maxLoss: 0.35 },
        tolerance: 0.1,
      };
    }

    case 'calc-symbolic': {
      const targetThreshold = arm === 3 ? 0.05 : arm === 0 ? 0.14 : 0.09;
      return {
        ...base,
        prompt: `Ajusta los pesos de los bloques simbólicos (sin, cos, x²-y², xy, gaussiana) hasta reducir tu error MSE por debajo de ${targetThreshold.toFixed(2)}.`,
        hint: 'Compara visualmente tu malla cobalto con la superficie fantasma en lápiz gris y observa qué términos domina la IA en paralelo.',
        targetDescription: `Objetivo: MSE Humano < ${targetThreshold.toFixed(2)}`,
        referenceContrast:
          'La programación genética explora miles de árboles simbólicos en hilos paralelos (Web Workers), balanceando precisión (MSE) con parsimonia de la expresión.',
        recommendedLayers: ['structure', 'error'],
        targetParams: { targetThreshold },
        tolerance: 0.02,
      };
    }
  }
}

export function evaluateChallengeAttempt(
  challenge: ChallengeSpec,
  params: Record<string, number>,
  extraState: {
    activation?: ActivationKind;
    dataset?: 'rings' | 'spiral';
    adamLoss?: number;
    adamSteps?: number;
    adamDiverged?: boolean;
    symbolicTargetIdx?: number;
  }
): { errorMetric: number; solved: boolean; feedback: string } {
  switch (challenge.sceneId) {
    case 'lin-span': {
      const v1: [number, number, number] = [params.c1 ?? 1, 0.2, 0.1];
      const v2: [number, number, number] = [0.2, 0.3, params.c2 ?? 1];
      const v3: [number, number, number] = [0.4, params.v3y ?? 1, 0.35];
      const detAbs = Math.abs(determinant3(mat3FromColumns(v1, v2, v3)));
      const rank = computeRank3(v1, v2, v3);

      if ('v3y' in challenge.targetParams) {
        const err = Math.min(1, detAbs / 0.8);
        const solved = rank <= 2 || detAbs < 0.12;
        return {
          errorMetric: err,
          solved,
          feedback: solved
            ? `Correcto: el espacio colapsó a rango 2 (|det| = ${detAbs.toFixed(3)}).`
            : `El volumen aún es ${detAbs.toFixed(2)} (rango ${rank}). Ajusta v₃y cerca de 0.15 para volver coplanares los vectores.`,
        };
      }
      const targetVol = challenge.targetParams.targetVol ?? 2.0;
      const diff = Math.abs(detAbs - targetVol);
      const err = Math.min(1, diff / Math.max(1, targetVol));
      const solved = rank === 3 && diff <= challenge.tolerance;
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `Volumen calibrado: ${detAbs.toFixed(2)} unidades³ con rango completo 3.`
          : `Volumen actual: ${detAbs.toFixed(2)} (objetivo ${targetVol.toFixed(2)}). Ajusta c₁, c₂ o v₃y.`,
      };
    }

    case 'lin-svd': {
      const a11 = params.a11 ?? 1.2;
      const a12 = params.a12 ?? 0.4;
      const a21 = params.a21 ?? 0.1;
      const a22 = params.a22 ?? 1.0;
      const a33 = params.a33 ?? 1.0;
      const det = (a11 * a22 - a12 * a21) * a33;
      const target = challenge.targetParams.targetDet ?? 0;
      const diff = Math.abs(det - target);
      const err = Math.min(1, diff / 2.2);
      const solved = diff <= challenge.tolerance;
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `Determinante logrado: det(A) = ${det.toFixed(2)}.`
          : `det(A) actual = ${det.toFixed(2)} (objetivo ${target.toFixed(2)}).`,
      };
    }

    case 'lin-eigen': {
      const a = params.a ?? 1.5;
      const b = params.b ?? 0.4;
      const c = params.c ?? 0.2;
      const d = params.d ?? 0.8;
      const theta = params.probeAngle ?? 0;
      const vx = Math.cos(theta);
      const vy = Math.sin(theta);
      const avx = a * vx + b * vy;
      const avy = c * vx + d * vy;
      const normAv = Math.hypot(avx, avy);
      if (normAv < 1e-6) {
        return { errorMetric: 1, solved: false, feedback: 'A·v es nulo en esta dirección.' };
      }
      const cosAng = Math.abs((vx * avx + vy * avy) / normAv);
      const angleRad = Math.acos(Math.min(1, Math.max(-1, cosAng)));
      const deg = (angleRad * 180) / Math.PI;
      const eigens = computeRealEigen2D(a, b, c, d);
      const err = Math.min(1, deg / 45);
      const solved = eigens.length > 0 && deg <= 5.5;
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `¡Dirección invariante alineada! Desviación angular de solo ${deg.toFixed(1)}°.`
          : `Desviación actual entre v y A·v: ${deg.toFixed(1)}°. Sigue ajustando θ hasta que coincidan.`,
      };
    }

    case 'lin-manifold': {
      const activation = extraState.activation ?? 'tanh';
      const dataset = extraState.dataset ?? 'rings';
      const { accuracy } = generateManifoldPoints(
        dataset,
        params.weight ?? 1.2,
        params.bias ?? 0,
        params.fold ?? 1,
        activation
      );
      const minAcc = challenge.targetParams.minAcc ?? 0.88;
      const err = Math.min(1, Math.max(0, (minAcc - accuracy) / 0.4));
      const solved = activation !== 'linear' && accuracy >= minAcc;
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `Separación lineal alcanzada: ${(accuracy * 100).toFixed(0)}% con activación ${activation}.`
          : `Precisión actual: ${(accuracy * 100).toFixed(0)}% (activación: ${activation}). Usa una activación no lineal y aumenta el pliegue.`,
      };
    }

    case 'calc-partials': {
      const x0 = params.x0 ?? 0.4;
      const y0 = params.y0 ?? 0.3;
      const freq = params.freq ?? 1.0;
      const { fx, fy } = evaluatePartialGradients(x0, y0, freq, 0.85);
      const targetSlope = challenge.targetParams.targetSlope ?? 0;
      if (targetSlope === 0) {
        const mag = Math.hypot(fx, fy);
        const err = Math.min(1, mag / 1.5);
        const solved = mag < 0.22;
        return {
          errorMetric: err,
          solved,
          feedback: solved
            ? `Punto crítico localizado con ||∇f|| = ${mag.toFixed(3)}.`
            : `Gradiente actual ||∇f|| = ${mag.toFixed(2)}. Desplaza x₀ e y₀ hacia una cima, valle o silla.`,
        };
      }
      const diff = Math.abs(fx - targetSlope);
      const err = Math.min(1, diff / 1.4);
      const solved = diff <= challenge.tolerance;
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `Pendiente lograda: ∂f/∂x = ${fx.toFixed(2)}.`
          : `∂f/∂x actual = ${fx.toFixed(2)} (objetivo ${targetSlope.toFixed(2)}).`,
      };
    }

    case 'calc-autodiff': {
      const snap = evaluateAutoDiffDag(params.x ?? 0.7, params.y ?? 0.5, params.w ?? 1.4);
      const mode = challenge.targetParams.mode ?? 0;
      if (mode === 1) {
        const mag = Math.abs(snap.gradX);
        const solved = mag > 3.5;
        const err = solved ? 0 : Math.min(1, (3.5 - mag) / 3.5);
        return {
          errorMetric: err,
          solved,
          feedback: solved
            ? `Gradiente alto verificado: |∂f/∂x| = ${mag.toFixed(2)}.`
            : `|∂f/∂x| actual = ${mag.toFixed(2)}. Aumenta w para amplificar el término w·cos(w·x).`,
        };
      }
      const target = challenge.targetParams.targetGradX ?? 1.0;
      const diff = Math.abs(snap.gradX - target);
      const err = Math.min(1, diff / 2.2);
      const solved = diff <= challenge.tolerance;
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `Gradiente calibrado en DAG: ∂f/∂x = ${snap.gradX.toFixed(2)}.`
          : `∂f/∂x actual = ${snap.gradX.toFixed(2)} (objetivo ${target.toFixed(2)}).`,
      };
    }

    case 'calc-optimizers': {
      const loss = extraState.adamLoss ?? 2.0;
      const steps = extraState.adamSteps ?? 0;
      const diverged = extraState.adamDiverged ?? false;
      const maxLoss = challenge.targetParams.maxLoss ?? 0.35;
      const solved = !diverged && steps >= 12 && loss <= maxLoss;
      const err = diverged ? 1 : Math.min(1, Math.max(0, (loss - maxLoss) / 1.5) + (steps < 12 ? 0.3 : 0));
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `Convergencia verificada: Adam alcanzó pérdida ${loss.toFixed(3)} en ${steps} pasos.`
          : steps < 12
            ? `Ejecuta al menos 12 pasos de carrera (actual: ${steps}) para evaluar la estabilidad.`
            : `Pérdida actual de Adam: ${loss.toFixed(3)}. Ajusta α e intenta nuevamente.`,
      };
    }

    case 'calc-symbolic': {
      const target = SYMBOLIC_TARGETS[extraState.symbolicTargetIdx ?? 0] ?? SYMBOLIC_TARGETS[0];
      const mse = computeSurfaceMse(
        params.wSin ?? 0,
        params.wCos ?? 0,
        params.wQuad ?? 0,
        params.wCross ?? 0,
        params.wGauss ?? 0,
        target.weights
      );
      const threshold = challenge.targetParams.targetThreshold ?? 0.09;
      const solved = mse <= threshold;
      const err = Math.min(1, mse / Math.max(0.2, threshold * 4));
      return {
        errorMetric: err,
        solved,
        feedback: solved
          ? `¡Ajuste simbólico logrado! Tu MSE es ${mse.toFixed(4)} (meta < ${threshold.toFixed(2)}).`
          : `MSE actual: ${mse.toFixed(4)} (meta < ${threshold.toFixed(2)}). Sigue afinando los pesos simbólicos.`,
      };
    }
  }
}
