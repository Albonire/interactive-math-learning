import type { CrayonToken, SceneId } from './types';
import {
  computeRank3,
  determinant3,
  generateManifoldPoints,
  mat3FromColumns,
  type ActivationKind,
  type ManifoldDatasetKind,
} from '../math/linearAlgebra';
import {
  SYMBOLIC_TARGETS,
  computeSurfaceMse,
  evaluatePartialGradients,
} from '../math/multivariable';

export interface LessonEvalContext {
  sceneId: SceneId;
  params: Record<string, number>;
  exploded: boolean;
  activation: ActivationKind;
  dataset: ManifoldDatasetKind;
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
  autoDiffPass: 'idle' | 'forward' | 'backward';
  optimizerSteps: number;
  optimizerRunning: boolean;
  symbolicGen: number;
  symbolicTargetIdx: number;
  inspectorOpened: boolean;
  challengeOpened: boolean;
}

export interface LessonDemoAction {
  label: string;
  params?: Record<string, number>;
  exploded?: boolean;
  activation?: ActivationKind;
  dataset?: ManifoldDatasetKind;
  landscape?: 'rosenbrock' | 'rastrigin' | 'saddle';
  autoDiffPass?: 'forward' | 'backward';
  startOptimizer?: boolean;
  startSymbolic?: boolean;
  openInspector?: boolean;
}

export interface GuidedLessonStep {
  id: string;
  title: string;
  instruction: string;
  takeaway: string;
  crayon: CrayonToken;
  demo: LessonDemoAction;
  checkCompleted: (ctx: LessonEvalContext) => boolean;
}

export interface GuidedLessonSpec {
  sceneId: SceneId;
  lessonNumber: number;
  totalLessons: number;
  moduleTag: string;
  chapterHook: string;
  prevSceneId: SceneId | null;
  nextSceneId: SceneId | null;
  steps: [GuidedLessonStep, GuidedLessonStep, GuidedLessonStep];
}

export const LESSON_ORDER: SceneId[] = [
  'lin-span',
  'lin-svd',
  'lin-eigen',
  'lin-manifold',
  'calc-partials',
  'calc-autodiff',
  'calc-optimizers',
  'calc-symbolic',
];

export const GUIDED_LESSONS: Record<SceneId, GuidedLessonSpec> = {
  'lin-span': {
    sceneId: 'lin-span',
    lessonNumber: 1,
    totalLessons: 8,
    moduleTag: 'Módulo 01 · Álgebra Lineal',
    chapterHook: 'Cada columna de una matriz empuja el espacio hacia una dirección: juntas construyen volumen.',
    prevSceneId: null,
    nextSceneId: 'lin-svd',
    steps: [
      {
        id: 'span-stretch',
        title: 'Estira la base en 3D',
        instruction: 'Desliza c₁ o c₂ abajo para estirar los vectores cobalto y bermellón.',
        takeaway: 'Al escalar v₁ y v₂, el paralelepípedo verde crece en proporción exacta al determinante.',
        crayon: 'cobalt',
        demo: {
          label: 'Probar en vivo',
          params: { c1: 1.8, c2: 1.6, v3y: 1.2 },
          exploded: false,
        },
        checkCompleted: (ctx) =>
          Math.abs((ctx.params.c1 ?? 1.2) - 1.2) >= 0.25 ||
          Math.abs((ctx.params.c2 ?? 1.1) - 1.1) >= 0.25,
      },
      {
        id: 'span-collapse',
        title: 'Aplasta una dimensión',
        instruction: 'Baja v₃y hacia 0.1 para volver coplanares a los tres vectores y colapsar el volumen.',
        takeaway: '¡Colapso de rango! El volumen cae casi a cero y aparece la hoja achurada bermellón: perdiste 3D.',
        crayon: 'vermilion',
        demo: {
          label: 'Colapsar rango',
          params: { c1: 1.2, c2: 1.1, v3y: 0.1 },
        },
        checkCompleted: (ctx) => {
          const v1: [number, number, number] = [ctx.params.c1 ?? 1.2, 0.2, 0.1];
          const v2: [number, number, number] = [0.2, 0.3, ctx.params.c2 ?? 1.1];
          const v3: [number, number, number] = [0.4, ctx.params.v3y ?? 1.0, 0.35];
          const det = Math.abs(determinant3(mat3FromColumns(v1, v2, v3)));
          return computeRank3(v1, v2, v3) < 3 || det < 0.16;
        },
      },
      {
        id: 'span-explode',
        title: 'Separa el dibujo en planos',
        instruction: 'Pulsa «Separar vista» abajo para abrir el sustrato, el volumen y la hoja de colapso.',
        takeaway: 'Ahora ves cada parte del modelo matemático separada como láminas pintadas de tu cuaderno.',
        crayon: 'sage',
        demo: {
          label: 'Separar vista',
          exploded: true,
        },
        checkCompleted: (ctx) => ctx.exploded,
      },
    ],
  },

  'lin-svd': {
    sceneId: 'lin-svd',
    lessonNumber: 2,
    totalLessons: 8,
    moduleTag: 'Módulo 01 · Álgebra Lineal',
    chapterHook: 'Toda transformación lineal se descompone en tres pasos limpios: rotar (Vᵀ), estirar (Σ) y rotar (U).',
    prevSceneId: 'lin-span',
    nextSceneId: 'lin-eigen',
    steps: [
      {
        id: 'svd-acts',
        title: 'Recorre los 3 actos de SVD',
        instruction: 'Mueve t_SVD por debajo de 2.0 para pausar entre la rotación Vᵀ y el estiramiento Σ.',
        takeaway: 'La matriz A ya no es una caja negra: es una rotación pura, escalado ortogonal y rotación final.',
        crayon: 'sage',
        demo: {
          label: 'Pausar en Σ',
          params: { svdStage: 1.5, a11: 1.5, a12: 0.6, a21: 0.2, a22: 1.1, a33: 1.0 },
        },
        checkCompleted: (ctx) => (ctx.params.svdStage ?? 3.0) <= 2.1,
      },
      {
        id: 'svd-invert',
        title: 'Invierte la orientación (det < 0)',
        instruction: 'Lleva a₁₁ o a₃₃ a un valor negativo para voltear el cubo unitario como un guante.',
        takeaway: 'Un determinante negativo pinta el cubo en bermellón: en motores 3D invierte las normales.',
        crayon: 'vermilion',
        demo: {
          label: 'Voltear cubo',
          params: { a11: -1.2, a12: 0.3, a21: 0.1, a22: 1.1, a33: 1.0, svdStage: 3.0 },
        },
        checkCompleted: (ctx) => {
          const m: [number, number, number, number, number, number, number, number, number] = [
            ctx.params.a11 ?? 1.3, 0, ctx.params.a12 ?? 0.5,
            0, ctx.params.a33 ?? 1.0, 0,
            ctx.params.a21 ?? 0.2, 0, ctx.params.a22 ?? 1.1,
          ];
          return determinant3(m) < -0.05;
        },
      },
      {
        id: 'svd-inspector',
        title: 'Mira la matriz en memoria GPU',
        instruction: 'Pulsa «Código» arriba para leer los 9 floats en memoria y los valores singulares σ.',
        takeaway: 'En motores de sistemas, esta matriz vive en 36 bytes contiguos (Rust [f32; 9] / Java float[9]) para maximizar caché.',
        crayon: 'ochre',
        demo: {
          label: 'Abrir Código',
          openInspector: true,
        },
        checkCompleted: (ctx) => ctx.inspectorOpened,
      },
    ],
  },

  'lin-eigen': {
    sceneId: 'lin-eigen',
    lessonNumber: 3,
    totalLessons: 8,
    moduleTag: 'Módulo 01 · Álgebra Lineal',
    chapterHook: 'Entre infinitas direcciones que giran al aplicar A, solo los autovectores mantienen su recta intacta.',
    prevSceneId: 'lin-svd',
    nextSceneId: 'lin-manifold',
    steps: [
      {
        id: 'eigen-hunt',
        title: 'Caza una dirección invariante',
        instruction: 'Gira el ángulo θ hasta que la flecha cobalto v y su imagen bermellón A·v queden alineadas (< 7°).',
        takeaway: '¡Alineado! En esa dirección, aplicar la matriz A equivale a multiplicar por el escalar λ.',
        crayon: 'ochre',
        demo: {
          label: 'Alinear sonda',
          params: { a: 1.5, b: 0.5, c: 0.3, d: 0.9, probeAngle: 0.38 },
        },
        checkCompleted: (ctx) => {
          const a = ctx.params.a ?? 1.5;
          const b = ctx.params.b ?? 0.5;
          const c = ctx.params.c ?? 0.3;
          const d = ctx.params.d ?? 0.9;
          const theta = ctx.params.probeAngle ?? 0.4;
          const vx = Math.cos(theta);
          const vy = Math.sin(theta);
          const avx = a * vx + b * vy;
          const avy = c * vx + d * vy;
          const norm = Math.hypot(avx, avy);
          if (norm < 1e-6) return false;
          const cosAng = Math.abs((vx * avx + vy * avy) / norm);
          const deg = (Math.acos(Math.min(1, cosAng)) * 180) / Math.PI;
          return deg < 7.0 && Math.abs(theta - 0.4) > 0.01;
        },
      },
      {
        id: 'eigen-deform',
        title: 'Deforma el espectro',
        instruction: 'Cambia el parámetro b o c en la matriz para observar cómo se abren o cierran los ejes ocres.',
        takeaway: 'Si la matriz se vuelve una rotación pura (b = -c), desaparecen los autovectores reales.',
        crayon: 'cobalt',
        demo: {
          label: 'Rotación pura',
          params: { a: 0.5, b: -1.0, c: 1.0, d: 0.5 },
        },
        checkCompleted: (ctx) =>
          Math.abs((ctx.params.b ?? 0.5) - 0.5) >= 0.3 ||
          Math.abs((ctx.params.c ?? 0.3) - 0.3) >= 0.3,
      },
      {
        id: 'eigen-explode',
        title: 'Separa la corona de rayos',
        instruction: 'Pulsa «Separar vista» abajo para ver los 24 rayos deformados bajo las rectas invariantes.',
        takeaway: 'PCA y PageRank buscan justo el autovector dominante donde el estiramiento λ es máximo.',
        crayon: 'sage',
        demo: {
          label: 'Separar vista',
          exploded: true,
        },
        checkCompleted: (ctx) => ctx.exploded,
      },
    ],
  },

  'lin-manifold': {
    sceneId: 'lin-manifold',
    lessonNumber: 4,
    totalLessons: 8,
    moduleTag: 'Módulo 01 · Álgebra Lineal',
    chapterHook: 'Sin activaciones no lineales, una red neuronal solo gira y estira papel plano sin poder separar anillos.',
    prevSceneId: 'lin-eigen',
    nextSceneId: 'calc-partials',
    steps: [
      {
        id: 'manifold-linear-fail',
        title: 'Comprueba el límite lineal',
        instruction: 'Cambia la activación φ abajo a Lineal y observa cómo las dos clases siguen mezcladas.',
        takeaway: 'Con φ lineal, ningún plano horizontal puede cortar el anillo cobalto del ciruela.',
        crayon: 'vermilion',
        demo: {
          label: 'Probar Lineal',
          activation: 'linear',
          params: { weight: 1.4, bias: 0.0, fold: 1.0 },
        },
        checkCompleted: (ctx) => ctx.activation === 'linear',
      },
      {
        id: 'manifold-fold',
        title: 'Dobla el espacio con no linealidad',
        instruction: 'Activa ReLU o σ (o ajusta W y γ) hasta superar 88% de separabilidad lineal.',
        takeaway: '¡Magia del Deep Learning! Doblar la variedad en 3D permite que un plano simple separe las clases.',
        crayon: 'plum',
        demo: {
          label: 'Doblar con ReLU',
          activation: 'relu',
          params: { weight: 1.8, bias: 0.0, fold: 1.15 },
        },
        checkCompleted: (ctx) => {
          if (ctx.activation === 'linear') return false;
          const res = generateManifoldPoints(
            ctx.dataset,
            ctx.params.weight ?? 1.4,
            ctx.params.bias ?? 0,
            ctx.params.fold ?? 1,
            ctx.activation
          );
          return res.accuracy >= 0.88 && (ctx.activation === 'relu' || ctx.activation === 'sigmoid' || Math.abs((ctx.params.weight ?? 1.4) - 1.4) >= 0.25);
        },
      },
      {
        id: 'manifold-spiral',
        title: 'Prueba una topología más dura',
        instruction: 'Cambia el conjunto de datos a Espiral abajo para ver cómo el pliegue persigue brazos curvos.',
        takeaway: 'Las capas profundas apilan múltiples pliegues sucesivos para desenredar espirales complejas.',
        crayon: 'cobalt',
        demo: {
          label: 'Cambiar a Espiral',
          dataset: 'spiral',
          activation: 'tanh',
          params: { weight: 1.9, bias: 0.0, fold: 1.1 },
        },
        checkCompleted: (ctx) => ctx.dataset === 'spiral',
      },
    ],
  },

  'calc-partials': {
    sceneId: 'calc-partials',
    lessonNumber: 5,
    totalLessons: 8,
    moduleTag: 'Módulo 02 · Cálculo Multivariable',
    chapterHook: 'Una derivada parcial congela el mundo en una dirección para medir la pendiente de un solo corte.',
    prevSceneId: 'lin-manifold',
    nextSceneId: 'calc-autodiff',
    steps: [
      {
        id: 'partials-slice',
        title: 'Desliza las cuchillas de corte',
        instruction: 'Arrastra x₀ o y₀ en la ecuación para mover las láminas achuradas sobre el relieve azul.',
        takeaway: 'La curva bermellón traza f(x, y₀) y la ocre traza f(x₀, y); sus pendientes definen el plano tangente.',
        crayon: 'vermilion',
        demo: {
          label: 'Mover corte',
          params: { x0: -0.7, y0: 0.8, freq: 1.0 },
        },
        checkCompleted: (ctx) =>
          Math.abs((ctx.params.x0 ?? 0.6) - 0.6) >= 0.3 ||
          Math.abs((ctx.params.y0 ?? 0.4) - 0.4) >= 0.3,
      },
      {
        id: 'partials-critical',
        title: 'Encuentra un punto crítico (∇f ≈ 0)',
        instruction: 'Desliza (x₀, y₀) hacia (-1.2, 0.0) hasta que el plano tangente verde quede casi horizontal (||∇f|| < 0.25).',
        takeaway: 'Cuando el gradiente se anula, estás en un mínimo, un máximo o un punto de silla.',
        crayon: 'sage',
        demo: {
          label: 'Ir al mínimo',
          params: { x0: -1.2, y0: 0.0, freq: 1.0 },
        },
        checkCompleted: (ctx) => {
          const { fx, fy } = evaluatePartialGradients(
            ctx.params.x0 ?? 0.6,
            ctx.params.y0 ?? 0.4,
            ctx.params.freq ?? 1.0,
            0.85
          );
          return Math.hypot(fx, fy) < 0.25;
        },
      },
      {
        id: 'partials-explode',
        title: 'Separa el mapa topográfico',
        instruction: 'Pulsa «Separar vista» abajo para ver cómo las curvas de nivel nacen de la superficie 3D.',
        takeaway: 'El vector gradiente ∇f siempre apunta perpendicular a las curvas de nivel del suelo.',
        crayon: 'ochre',
        demo: {
          label: 'Separar vista',
          exploded: true,
        },
        checkCompleted: (ctx) => ctx.exploded,
      },
    ],
  },

  'calc-autodiff': {
    sceneId: 'calc-autodiff',
    lessonNumber: 6,
    totalLessons: 8,
    moduleTag: 'Módulo 02 · Cálculo Multivariable',
    chapterHook: 'PyTorch y JAX no derivan fórmulas a mano: recorren un grafo DAG hacia adelante y propagan sensibilidades hacia atrás.',
    prevSceneId: 'calc-partials',
    nextSceneId: 'calc-optimizers',
    steps: [
      {
        id: 'autodiff-forward',
        title: 'Dispara el Pulso Forward',
        instruction: 'Pulsa «Pulso Forward →» en la barra inferior para evaluar cada nodo del grafo desde x, y, w.',
        takeaway: 'El pase directo calcula y guarda los valores intermedios en verde salvia sobre la cinta.',
        crayon: 'sage',
        demo: {
          label: 'Ejecutar Forward',
          autoDiffPass: 'forward',
          openInspector: true,
        },
        checkCompleted: (ctx) => ctx.autoDiffPass === 'forward' || ctx.autoDiffPass === 'backward',
      },
      {
        id: 'autodiff-backward',
        title: 'Propaga el Pulso Backward',
        instruction: 'Ahora pulsa «← Pulso Backward» para multiplicar derivadas locales por la regla de la cadena.',
        takeaway: 'En un solo recorrido inverso obtienes ∂f/∂x y ∂f/∂y exactos sin importar cuántos parámetros tengas.',
        crayon: 'vermilion',
        demo: {
          label: 'Ejecutar Backward',
          autoDiffPass: 'backward',
          openInspector: true,
        },
        checkCompleted: (ctx) => ctx.autoDiffPass === 'backward',
      },
      {
        id: 'autodiff-weight',
        title: 'Aumenta la sensibilidad con w',
        instruction: 'Sube el peso w por encima de 2.8 y observa cómo se dispara la flecha ∂f/∂x en 3D y en el DAG.',
        takeaway: 'Multiplicar por un peso alto en la regla de la cadena amplifica (o explota) el gradiente.',
        crayon: 'ochre',
        demo: {
          label: 'Subir peso w',
          params: { x: 0.7, y: 0.6, w: 3.6 },
          autoDiffPass: 'backward',
        },
        checkCompleted: (ctx) => (ctx.params.w ?? 1.6) >= 2.8,
      },
    ],
  },

  'calc-optimizers': {
    sceneId: 'calc-optimizers',
    lessonNumber: 7,
    totalLessons: 8,
    moduleTag: 'Módulo 02 · Cálculo Multivariable',
    chapterHook: 'Entrenar una red es bajar una montaña a ciegas guiado solo por la inclinación local bajo tus pies.',
    prevSceneId: 'calc-autodiff',
    nextSceneId: 'calc-symbolic',
    steps: [
      {
        id: 'opt-race',
        title: 'Lanza la carrera en Rosenbrock',
        instruction: 'Pulsa «Correr» (o «+1 Paso») abajo para soltar a SGD, Momentum y Adam por el valle estrecho.',
        takeaway: 'SGD zigzaguea en las paredes mientras Momentum y Adam aprovechan la inercia a lo largo del cañón.',
        crayon: 'sage',
        demo: {
          label: 'Lanzar carrera',
          startOptimizer: true,
        },
        checkCompleted: (ctx) => ctx.optimizerSteps >= 4 || ctx.optimizerRunning,
      },
      {
        id: 'opt-saddle',
        title: 'Enfrenta un Punto de Silla',
        instruction: 'Cambia el terreno a «Punto de Silla» o «Rastrigin» para ver qué optimizador escapa mejor.',
        takeaway: 'En alta dimensión los puntos de silla atrapan al descenso ingenuo; la inercia ayuda a escapar.',
        crayon: 'cobalt',
        demo: {
          label: 'Ir a Punto de Silla',
          landscape: 'saddle',
          startOptimizer: true,
        },
        checkCompleted: (ctx) => ctx.landscape === 'saddle' || ctx.landscape === 'rastrigin',
      },
      {
        id: 'opt-lr',
        title: 'Sube α hasta la inestabilidad',
        instruction: 'Arrastra la tasa de aprendizaje α por encima de 0.16 para observar el riesgo de rebote.',
        takeaway: 'Una tasa α demasiado alta salta por encima del valle mínimo y provoca divergencia numérica.',
        crayon: 'vermilion',
        demo: {
          label: 'Probar α alta',
          params: { lr: 0.24, beta: 0.85 },
        },
        checkCompleted: (ctx) => (ctx.params.lr ?? 0.06) >= 0.16,
      },
    ],
  },

  'calc-symbolic': {
    sceneId: 'calc-symbolic',
    lessonNumber: 8,
    totalLessons: 8,
    moduleTag: 'Módulo 02 · Cálculo Multivariable',
    chapterHook: '¿Puedes descubrir la ecuación oculta de una superficie antes que un algoritmo genético paralelo?',
    prevSceneId: 'calc-optimizers',
    nextSceneId: null,
    steps: [
      {
        id: 'sym-manual',
        title: 'Moldea tu hipótesis a mano',
        instruction: 'Ajusta w₁, w₂ o w₅ en la ecuación para acercar tu superficie cobalto a la malla fantasma.',
        takeaway: 'Cada término de la base agrega ondas, sillas o campanas que reducen el error cuadrático MSE.',
        crayon: 'cobalt',
        demo: {
          label: 'Aproximar pesos',
          params: { wSin: 0.75, wCos: 0.5, wQuad: 0.0, wCross: 0.0, wGauss: 0.3 },
        },
        checkCompleted: (ctx) => {
          const target = SYMBOLIC_TARGETS[ctx.symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
          const mse = computeSurfaceMse(
            ctx.params.wSin ?? 0.2,
            ctx.params.wCos ?? 0.2,
            ctx.params.wQuad ?? 0,
            ctx.params.wCross ?? 0,
            ctx.params.wGauss ?? 0.3,
            target.weights
          );
          return mse < 0.22;
        },
      },
      {
        id: 'sym-worker',
        title: 'Despierta al Web Worker genético',
        instruction: 'Pulsa «Evolucionar IA» para competir contra programación genética en un hilo paralelo.',
        takeaway: 'La IA muta fórmulas en segundo plano y transfiere la malla por Float32Array sin frenar el 3D.',
        crayon: 'sage',
        demo: {
          label: 'Evolucionar IA',
          startSymbolic: true,
        },
        checkCompleted: (ctx) => ctx.symbolicGen >= 1,
      },
      {
        id: 'sym-explode',
        title: 'Compara las 3 superficies',
        instruction: 'Pulsa «Separar vista» abajo para apilar objetivo (lápiz), tu modelo (cobalto) e IA (salvia).',
        takeaway: '¡Completaste las 8 lecciones del cuaderno BIBIFOLD! Puedes repasar cualquier tema desde el Índice.',
        crayon: 'ochre',
        demo: {
          label: 'Separar vista',
          exploded: true,
        },
        checkCompleted: (ctx) => ctx.exploded,
      },
    ],
  },
};

export function evaluateLessonProgress(
  sceneId: SceneId,
  ctx: LessonEvalContext,
  alreadyCompletedIds: ReadonlySet<string>
): string[] {
  const lesson = GUIDED_LESSONS[sceneId];
  const newlyCompleted: string[] = [];
  for (const step of lesson.steps) {
    if (!alreadyCompletedIds.has(step.id) && step.checkCompleted(ctx)) {
      newlyCompleted.push(step.id);
    }
  }
  return newlyCompleted;
}

export interface PipelineLessonNodeStatus {
  sceneId: SceneId;
  lessonNumber: number;
  completedSteps: number;
  totalSteps: number;
  isComplete: boolean;
}

export function getCoursePipelineStatus(
  completedStepIds: ReadonlySet<string>
): PipelineLessonNodeStatus[] {
  return LESSON_ORDER.map((id) => {
    const spec = GUIDED_LESSONS[id];
    const done = spec.steps.filter((s) => completedStepIds.has(s.id)).length;
    return {
      sceneId: id,
      lessonNumber: spec.lessonNumber,
      completedSteps: done,
      totalSteps: spec.steps.length,
      isComplete: done === spec.steps.length,
    };
  });
}
