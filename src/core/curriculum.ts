import type {
  ComputationalBridge,
  ModuleBlockSpec,
  SceneId,
  SceneLiveMetrics,
  SceneMetadata,
} from './types';
import {
  computeRealEigen2D,
  computeRank3,
  computeSvd3,
  determinant3,
  generateManifoldPoints,
  mat3FromColumns,
  mat3ToColumnMajorFloat32,
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

export const CURRICULUM_BLOCKS: ModuleBlockSpec[] = [
  {
    id: 'linear-algebra',
    index: 1,
    title: 'Álgebra Lineal Computacional',
    status: 'active',
    prerequisites: [],
    csTopics: [
      'Vectores y espacio generado (Span)',
      'Transformaciones 3×3 y determinante',
      'Descomposición SVD (U·Σ·Vᵀ)',
      'Autovectores y direcciones invariantes',
      'Plegado de variedades neuronales',
    ],
    anatomyOrgans: [
      'Columnas ligadas a ejes î\', ĵ\', k̂\'',
      'Cubo unitario de volumen y orientación',
      'Ejes invariantes y corona direccional',
      'Hiperplano de separación no lineal',
    ],
    sceneIds: ['lin-span', 'lin-svd', 'lin-eigen', 'lin-manifold'],
  },
  {
    id: 'multivariable-calc',
    index: 2,
    title: 'Cálculo Multivariable y Optimización',
    status: 'active',
    prerequisites: ['linear-algebra'],
    csTopics: [
      'Superficies z = f(x, y) y curvas de nivel',
      'Derivadas parciales y plano tangente',
      'Diferenciación automática en DAG (AutoDiff)',
      'Descenso del gradiente: SGD, Momentum y Adam',
      'Regresión simbólica evolutiva (Web Workers)',
    ],
    anatomyOrgans: [
      'Planos de corte X/Y achurados',
      'Grafo DAG forward / backward pass',
      'Vector -α∇f vs. vector de inercia',
      'Superficie fantasma vs. evolución genética',
    ],
    sceneIds: ['calc-partials', 'calc-autodiff', 'calc-optimizers', 'calc-symbolic'],
  },
  {
    id: 'differential-integral',
    index: 3,
    title: 'Cálculo Diferencial e Integral Aplicado',
    status: 'phase2',
    prerequisites: ['linear-algebra'],
    csTopics: [
      'Límites asintóticos y linealización local',
      'Series de Taylor (cálculo en CPU de sin x, eˣ)',
      'Cuadratura numérica: Riemann, trapecio, Simpson y Monte Carlo',
    ],
    anatomyOrgans: [
      'Secante colapsando en tangente',
      'Capas apiladas de polinomios de Taylor',
      'Cuñas bermellón de error de truncamiento',
    ],
    sceneIds: [],
  },
  {
    id: 'numerical-methods',
    index: 4,
    title: 'Métodos Numéricos y Computación Científica',
    status: 'phase2',
    prerequisites: ['multivariable-calc', 'differential-integral'],
    csTopics: [
      'Punto flotante IEEE 754 y cancelación catastrófica',
      'Raíces: Bisección y Newton-Raphson',
      'Splines, curvas Bézier, FFT y Euler vs. RK4',
    ],
    anatomyOrgans: [
      'Cuencas de atracción fractales',
      'Espectro de armónicos 3D en profundidad',
      'Separación error de truncamiento vs. redondeo',
    ],
    sceneIds: [],
  },
  {
    id: 'discrete-graphs',
    index: 5,
    title: 'Matemáticas Discretas, Grafos y Complejidad',
    status: 'phase2',
    prerequisites: ['linear-algebra'],
    csTopics: [
      'Lógica booleana y árboles de recursión',
      'Aritmética modular ℤₙ aplicada a criptografía',
      'Grafos (Dijkstra, A*, flujo máximo) y crecimiento O, Ω, Θ',
    ],
    anatomyOrgans: [
      'Topología + matriz de adyacencia viva',
      'Frontera de prioridad y árbol mínimo',
      'Pila de llamadas 3D y relojes modulares',
    ],
    sceneIds: [],
  },
  {
    id: 'probability-info',
    index: 6,
    title: 'Probabilidad y Teoría de la Información',
    status: 'phase2',
    prerequisites: ['multivariable-calc', 'discrete-graphs'],
    csTopics: [
      'Teorema de Bayes y covarianza multivariable',
      'Cadenas de Markov y distribución estacionaria',
      'Entropía de Shannon, divergencia KL y entropía cruzada',
    ],
    anatomyOrgans: [
      'Volúmenes priori, verosimilitud y posterior',
      'Elipsoide de covarianza deformable',
      'Barras de sorpresa -log₂(p)',
    ],
    sceneIds: [],
  },
];

export const SCENES: Record<SceneId, SceneMetadata> = {
  'lin-span': {
    id: 'lin-span',
    moduleId: 'linear-algebra',
    code: '01.1',
    shortLabel: 'Span',
    title: 'Span e Independencia Lineal',
    subtitle: 'Combinaciones lineales, volumen alcanzable y colapso de rango',
    skillId: 'lin_span_rank',
    skillLabel: 'Rango y Span 3D',
    intuitionNote:
      'Arrastra los escalares en la ecuación: si v₃y cae a 0, el volumen 3D se aplasta en una lámina achurada y pierdes una dimensión.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Sustrato',
        crayon: 'graphite',
        visible: true,
        explodeOffsetY: -1.4,
        explanation: 'Retícula de cuaderno y ejes coordenados de referencia (X, Y, Z).',
      },
      {
        id: 'structure',
        label: 'Volumen Span',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: -0.15,
        explanation: 'Paralelepípedo generado por v₁, v₂ y v₃; su volumen equivale a |det([v₁ v₂ v₃])|.',
      },
      {
        id: 'operator',
        label: 'Vectores Base',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 1.15,
        explanation: 'Vectores generadores v₁ (cobalto), v₂ (bermellón) y v₃ (ocre) con su resultante p.',
      },
      {
        id: 'error',
        label: 'Hoja de Colapso',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 2.1,
        explanation: 'Cuando los vectores son coplanares, el volumen colapsa sobre un plano achurado en bermellón.',
      },
    ],
    defaultParams: [
      { id: 'c1', label: 'c₁', latexSymbol: 'c_1', crayon: 'cobalt', value: 1.2, min: -2, max: 2, step: 0.1, linkedLayerId: 'operator' },
      { id: 'c2', label: 'c₂', latexSymbol: 'c_2', crayon: 'vermilion', value: 1.1, min: -2, max: 2, step: 0.1, linkedLayerId: 'operator' },
      { id: 'v3y', label: 'v₃y', latexSymbol: 'v_{3y}', crayon: 'ochre', value: 1.0, min: -1.6, max: 1.8, step: 0.05, linkedLayerId: 'structure' },
    ],
  },

  'lin-svd': {
    id: 'lin-svd',
    moduleId: 'linear-algebra',
    code: '01.2',
    shortLabel: 'SVD y Det',
    title: 'Transformaciones, Determinante y SVD',
    subtitle: 'Deformación continua M(t) y anatomía A = U · Σ · Vᵀ en tres actos',
    skillId: 'lin_det_collapse',
    skillLabel: 'Determinante y SVD',
    intuitionNote:
      'Recorre el deslizador SVD de 0 a 3 para separar rotación de entrada (Vᵀ), estiramiento ortogonal (Σ) y rotación de salida (U).',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Retícula Original',
        crayon: 'pencil',
        visible: true,
        explodeOffsetY: -1.45,
        explanation: 'Espacio identidad antes de aplicar la transformación lineal A.',
      },
      {
        id: 'structure',
        label: 'Cubo Unitario',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: -0.2,
        explanation: 'Cubo de volumen 1 que cambia a bermellón si det(A) < 0 por inversión de orientación.',
      },
      {
        id: 'operator',
        label: 'Ejes Transformados',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 1.05,
        explanation: 'Columnas de A: destino de los vectores base î\', ĵ\' y k̂\'.',
      },
      {
        id: 'error',
        label: 'Ejes Singulares Σ',
        crayon: 'ochre',
        visible: true,
        explodeOffsetY: 2.1,
        explanation: 'Semiejes ortogonales del elipsoide SVD proporcionales a σ₁, σ₂ y σ₃.',
      },
    ],
    defaultParams: [
      { id: 'a11', label: 'a₁₁', latexSymbol: 'a_{11}', crayon: 'cobalt', value: 1.3, min: -2, max: 2, step: 0.1, linkedLayerId: 'operator' },
      { id: 'a12', label: 'a₁₂', latexSymbol: 'a_{12}', crayon: 'vermilion', value: 0.5, min: -1.8, max: 1.8, step: 0.1, linkedLayerId: 'operator' },
      { id: 'a21', label: 'a₂₁', latexSymbol: 'a_{21}', crayon: 'cobalt', value: 0.2, min: -1.8, max: 1.8, step: 0.1, linkedLayerId: 'operator' },
      { id: 'a22', label: 'a₂₂', latexSymbol: 'a_{22}', crayon: 'vermilion', value: 1.1, min: -2, max: 2, step: 0.1, linkedLayerId: 'operator' },
      { id: 'a33', label: 'a₃₃', latexSymbol: 'a_{33}', crayon: 'ochre', value: 1.0, min: -1.8, max: 1.8, step: 0.1, linkedLayerId: 'structure' },
      { id: 'svdStage', label: 'SVD t', latexSymbol: 't_{\\text{SVD}}', crayon: 'sage', value: 3.0, min: 0, max: 3, step: 0.05, linkedLayerId: 'error' },
    ],
  },

  'lin-eigen': {
    id: 'lin-eigen',
    moduleId: 'linear-algebra',
    code: '01.3',
    shortLabel: 'Autovectores',
    title: 'Autovectores y Direcciones Invariantes',
    subtitle: 'Corona de rayos bajo transformación A y alineación de A·v = λ·v',
    skillId: 'lin_eigen_dir',
    skillLabel: 'Autovectores y λ',
    intuitionNote:
      'Gira la sonda θ: casi toda dirección rota al aplicar A, salvo los autovectores ocres que solo se estiran o contraen por λ.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Sustrato Polar',
        crayon: 'graphite',
        visible: true,
        explodeOffsetY: -1.35,
        explanation: 'Círculo unitario y plano de referencia para comparar v contra A·v.',
      },
      {
        id: 'structure',
        label: 'Corona de Rayos',
        crayon: 'pencil',
        visible: true,
        explodeOffsetY: -0.15,
        explanation: '24 direcciones instanciadas mostrando cómo A gira y deforma el plano.',
      },
      {
        id: 'operator',
        label: 'Sonda v y A·v',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 1.0,
        explanation: 'Vector sonda controlado por θ (cobalto) junto a su imagen A·v (bermellón).',
      },
      {
        id: 'invariant',
        label: 'Autovectores Reales',
        crayon: 'ochre',
        visible: true,
        explodeOffsetY: 2.05,
        explanation: 'Rectas invariantes en crayón ocre donde el ángulo entre v y A·v es cero.',
      },
    ],
    defaultParams: [
      { id: 'a', label: 'a', latexSymbol: 'a', crayon: 'cobalt', value: 1.5, min: -2, max: 2.2, step: 0.1, linkedLayerId: 'structure' },
      { id: 'b', label: 'b', latexSymbol: 'b', crayon: 'vermilion', value: 0.5, min: -1.5, max: 1.5, step: 0.1, linkedLayerId: 'structure' },
      { id: 'c', label: 'c', latexSymbol: 'c', crayon: 'vermilion', value: 0.3, min: -1.5, max: 1.5, step: 0.1, linkedLayerId: 'structure' },
      { id: 'd', label: 'd', latexSymbol: 'd', crayon: 'cobalt', value: 0.9, min: -2, max: 2.2, step: 0.1, linkedLayerId: 'structure' },
      { id: 'probeAngle', label: 'θ', latexSymbol: '\\theta', crayon: 'ochre', value: 0.4, min: 0, max: 6.28, step: 0.05, linkedLayerId: 'operator', unit: 'rad' },
    ],
  },

  'lin-manifold': {
    id: 'lin-manifold',
    moduleId: 'linear-algebra',
    code: '01.4',
    shortLabel: 'Variedades',
    title: 'Plegado de Variedades Neuronales',
    subtitle: 'Cómo las activaciones no lineales doblan el espacio para separar datos',
    skillId: 'lin_manifold_nonlin',
    skillLabel: 'Variedades y No Linealidad',
    intuitionNote:
      'Con activación lineal ningún plano corta dos anillos concéntricos. Activa tanh, ReLU o σ para doblar la hoja 3D y separar las clases.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Dominio Plano',
        crayon: 'graphite',
        visible: true,
        explodeOffsetY: -1.45,
        explanation: 'Espacio de entrada 2D antes del levantamiento por la capa neuronal.',
      },
      {
        id: 'structure',
        label: 'Hoja Plegada',
        crayon: 'plum',
        visible: true,
        explodeOffsetY: -0.2,
        explanation: 'Superficie continua deformada por φ(W·x + b) en crayón ciruela.',
      },
      {
        id: 'operator',
        label: 'Nubes Clase A / B',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 1.0,
        explanation: 'Muestras instanciadas en cobalto (Clase A) y ciruela (Clase B).',
      },
      {
        id: 'invariant',
        label: 'Plano Separador',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 2.05,
        explanation: 'Frontera lineal de grafito/salvia que clasifica el espacio tras el pliegue.',
      },
    ],
    defaultParams: [
      { id: 'weight', label: 'W', latexSymbol: 'W', crayon: 'cobalt', value: 1.4, min: 0.2, max: 3.0, step: 0.1, linkedLayerId: 'structure' },
      { id: 'bias', label: 'b', latexSymbol: 'b', crayon: 'ochre', value: 0.0, min: -1.5, max: 1.5, step: 0.1, linkedLayerId: 'structure' },
      { id: 'fold', label: 'Pliegue', latexSymbol: '\\gamma', crayon: 'plum', value: 1.0, min: 0, max: 1.4, step: 0.05, linkedLayerId: 'structure' },
    ],
  },

  'calc-partials': {
    id: 'calc-partials',
    moduleId: 'multivariable-calc',
    code: '02.1',
    shortLabel: 'Parciales',
    title: 'Derivadas Parciales y Plano Tangente',
    subtitle: 'Cortes ortogonales X/Y, curvas de nivel y aproximación lineal local',
    skillId: 'calc_partial_slice',
    skillLabel: 'Parciales y Tangente',
    intuitionNote:
      'Desplaza (x₀, y₀): cada lámina achurada fija una variable revelando ∂f/∂x y ∂f/∂y, que sostienen juntas el plano tangente.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Curvas de Nivel',
        crayon: 'ochre',
        visible: true,
        explodeOffsetY: -1.45,
        explanation: 'Proyección topográfica en crayón ocre sobre el piso del cuaderno.',
      },
      {
        id: 'structure',
        label: 'Superficie z=f(x,y)',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: -0.25,
        explanation: 'Campo escalar sombreado con mordida de crayón azul cobalto.',
      },
      {
        id: 'operator',
        label: 'Planos de Corte X/Y',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 1.1,
        explanation: 'Láminas translúcidas achuradas en y = y₀ (bermellón) y x = x₀ (ocre).',
      },
      {
        id: 'invariant',
        label: 'Plano Tangente y ∇f',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 2.25,
        explanation: 'Aproximación lineal local y vector gradiente apuntando al ascenso máximo.',
      },
    ],
    defaultParams: [
      { id: 'x0', label: 'x₀', latexSymbol: 'x_0', crayon: 'vermilion', value: 0.6, min: -2.0, max: 2.0, step: 0.1, linkedLayerId: 'operator' },
      { id: 'y0', label: 'y₀', latexSymbol: 'y_0', crayon: 'ochre', value: 0.4, min: -2.0, max: 2.0, step: 0.1, linkedLayerId: 'operator' },
      { id: 'freq', label: 'ω', latexSymbol: '\\omega', crayon: 'cobalt', value: 1.0, min: 0.5, max: 1.8, step: 0.1, linkedLayerId: 'structure' },
    ],
  },

  'calc-autodiff': {
    id: 'calc-autodiff',
    moduleId: 'multivariable-calc',
    code: '02.2',
    shortLabel: 'AutoDiff',
    title: 'Grafo Computacional y AutoDiff',
    subtitle: 'Regla de la cadena en modo directo (forward) e inverso (backward)',
    skillId: 'calc_chain_autodiff',
    skillLabel: 'AutoDiff y Cadena',
    intuitionNote:
      'Ejecuta Forward (verde) para evaluar nodos y Backward (bermellón) para propagar derivadas locales. Abre el Inspector para ver el grafo DAG interactivo.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Sustrato',
        crayon: 'graphite',
        visible: true,
        explodeOffsetY: -1.35,
        explanation: 'Plano de entradas (x, y) y ejes del espacio de parámetros.',
      },
      {
        id: 'structure',
        label: 'Superficie',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: -0.15,
        explanation: 'Gráfica de f(x,y) = x·y + sin(w·x) + 0.4y² evaluada por el DAG.',
      },
      {
        id: 'operator',
        label: 'Forward',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 1.0,
        explanation: 'Flujo de activaciones desde entradas hacia la salida en verde salvia.',
      },
      {
        id: 'error',
        label: 'Gradiente',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 2.05,
        explanation: 'Vector de sensibilidad inversa ∂f/∂x y ∂f/∂y propagado por la regla de la cadena.',
      },
    ],
    defaultParams: [
      { id: 'x', label: 'x', latexSymbol: 'x', crayon: 'cobalt', value: 0.7, min: -2.0, max: 2.0, step: 0.1, linkedLayerId: 'operator' },
      { id: 'y', label: 'y', latexSymbol: 'y', crayon: 'vermilion', value: 0.6, min: -2.0, max: 2.0, step: 0.1, linkedLayerId: 'operator' },
      { id: 'w', label: 'w', latexSymbol: 'w', crayon: 'ochre', value: 1.6, min: 0.2, max: 4.5, step: 0.1, linkedLayerId: 'error' },
    ],
  },

  'calc-optimizers': {
    id: 'calc-optimizers',
    moduleId: 'multivariable-calc',
    code: '02.3',
    shortLabel: 'Optimizadores',
    title: 'Carrera de Optimizadores',
    subtitle: 'SGD, Momentum y Adam compitiendo sobre paisajes de pérdida',
    skillId: 'calc_lr_stability',
    skillLabel: 'Estabilidad de Optimizadores',
    intuitionNote:
      'Suelta las tres sondas sobre Rosenbrock, Rastrigin o Punto de Silla. Usa Paso a Paso para inspeccionar -α∇f frente a la inercia.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Curvas de Pérdida',
        crayon: 'pencil',
        visible: true,
        explodeOffsetY: -1.45,
        explanation: 'Mapa de contorno proyectado mostrando valles estrechos y mínimos.',
      },
      {
        id: 'structure',
        label: 'Paisaje de Pérdida',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: -0.2,
        explanation: 'Función objetivo L(x, y) a minimizar en escala logarítmica suave.',
      },
      {
        id: 'operator',
        label: 'Estelas SGD/Mom/Adam',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 1.05,
        explanation: 'Trayectorias comparadas: SGD (cobalto), Momentum (ocre) y Adam (salvia).',
      },
      {
        id: 'invariant',
        label: 'Vectores -α∇f e Inercia',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 2.1,
        explanation: 'Descomposición del paso: gradiente instantáneo en bermellón vs. velocidad acumulada en ocre.',
      },
    ],
    defaultParams: [
      { id: 'lr', label: 'α', latexSymbol: '\\alpha', crayon: 'vermilion', value: 0.06, min: 0.01, max: 0.32, step: 0.01, linkedLayerId: 'invariant' },
      { id: 'beta', label: 'β', latexSymbol: '\\beta', crayon: 'ochre', value: 0.82, min: 0.0, max: 0.96, step: 0.02, linkedLayerId: 'operator' },
    ],
  },

  'calc-symbolic': {
    id: 'calc-symbolic',
    moduleId: 'multivariable-calc',
    code: '02.4',
    shortLabel: 'Reg. Simbólica',
    title: 'Regresión Simbólica Evolutiva',
    subtitle: 'Humano vs. Programación Genética en Web Worker paralelo',
    skillId: 'calc_symbolic_fit',
    skillLabel: 'Ajuste Simbólico',
    intuitionNote:
      'Ajusta los pesos de tu ecuación para igualar la superficie fantasma en lápiz mientras el Web Worker evoluciona una población de fórmulas en paralelo.',
    defaultLayers: [
      {
        id: 'substrate',
        label: 'Sustrato de Dominio',
        crayon: 'graphite',
        visible: true,
        explodeOffsetY: -1.45,
        explanation: 'Dominio [-2, 2]² donde se mide el error cuadrático medio (MSE).',
      },
      {
        id: 'structure',
        label: 'Superficie Objetivo',
        crayon: 'pencil',
        visible: true,
        explodeOffsetY: -0.2,
        explanation: 'Trazo fantasma en lápiz gris de la ecuación oculta a descubrir.',
      },
      {
        id: 'operator',
        label: 'Tu Modelo (Humano)',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.95,
        explanation: 'Malla en crayón cobalto construida con tus coeficientes simbólicos.',
      },
      {
        id: 'error',
        label: 'Mejor Fórmula IA',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 2.05,
        explanation: 'Superficie verde salvia evolucionada en tiempo real dentro del Web Worker.',
      },
    ],
    defaultParams: [
      { id: 'wSin', label: 'sin(x)', latexSymbol: 'w_1', crayon: 'cobalt', value: 0.2, min: -1.2, max: 1.2, step: 0.05, linkedLayerId: 'operator' },
      { id: 'wCos', label: 'cos(y)', latexSymbol: 'w_2', crayon: 'vermilion', value: 0.2, min: -1.2, max: 1.2, step: 0.05, linkedLayerId: 'operator' },
      { id: 'wQuad', label: 'x²-y²', latexSymbol: 'w_3', crayon: 'ochre', value: 0.0, min: -1.2, max: 1.2, step: 0.05, linkedLayerId: 'operator' },
      { id: 'wCross', label: 'xy', latexSymbol: 'w_4', crayon: 'plum', value: 0.0, min: -1.2, max: 1.2, step: 0.05, linkedLayerId: 'operator' },
      { id: 'wGauss', label: 'e⁻ʳ²', latexSymbol: 'w_5', crayon: 'sage', value: 0.3, min: -1.2, max: 1.2, step: 0.05, linkedLayerId: 'operator' },
    ],
  },
};

export function buildComputationalBridge(
  sceneId: SceneId,
  params: Record<string, number>,
  extras: {
    activation: ActivationKind;
    dataset: ManifoldDatasetKind;
    landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
    symbolicTargetIdx: number;
    aiFormula: string;
    aiMse: number;
    generation: number;
  }
): ComputationalBridge {
  switch (sceneId) {
    case 'lin-span': {
      const c1 = params.c1 ?? 1.2;
      const c2 = params.c2 ?? 1.1;
      const v3y = params.v3y ?? 1.0;
      const m = mat3FromColumns([c1, 0.2, 0.1], [0.2, 0.3, c2], [0.4, v3y, 0.35]);
      const buf = mat3ToColumnMajorFloat32(m);
      return {
        memoryValues: Array.from(buf).map((v) => v.toFixed(2)),
        complexity: 'O(n³) eliminación gaussiana · O(n) combinación lineal',
        csApplication:
          'Bases ortonormales de cámaras 3D, mezcla de canales RGB y detección de columnas redundantes en matrices de características (ML).',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: '[f32; 9] en Stack (36 bytes, Column-Major, #[repr(C)])',
            codeSnippet: `let v1: [f32; 3] = [${c1.toFixed(2)}, 0.20, 0.10];
let v2: [f32; 3] = [0.20, 0.30, ${c2.toFixed(2)}];
let v3: [f32; 3] = [0.40, ${v3y.toFixed(2)}, 0.35];

// Volumen = |v1 · (v2 × v3)| sin asignaciones en heap
let vol = dot3(v1, cross3(v2, v3)).abs();`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: 'float[9] contiguo en Heap (16 B cabecera JVM + 36 B datos)',
            codeSnippet: `float[] m = {
  ${c1.toFixed(2)}f, 0.20f, 0.10f, // col v1
  0.20f, 0.30f, ${c2.toFixed(2)}f, // col v2
  0.40f, ${v3y.toFixed(2)}f, 0.35f  // col v3
};
// Evita float[][] para mantener localidad en caché L1
float vol = Math.abs(det3ColumnMajor(m));`,
          },
        },
      };
    }

    case 'lin-svd': {
      const a11 = params.a11 ?? 1.3;
      const a12 = params.a12 ?? 0.5;
      const a21 = params.a21 ?? 0.2;
      const a22 = params.a22 ?? 1.1;
      const a33 = params.a33 ?? 1.0;
      const m: [number, number, number, number, number, number, number, number, number] = [
        a11, a12, 0,
        a21, a22, 0,
        0, 0, a33,
      ];
      const svd = computeSvd3(m);
      const buf = mat3ToColumnMajorFloat32(m);
      return {
        memoryValues: [
          ...Array.from(buf).map((v) => v.toFixed(2)),
          `σ=[${svd.S.map((s) => s.toFixed(2)).join(', ')}]`,
        ],
        complexity: 'O(min(mn², m²n)) descomposición SVD · O(1) determinante 3×3',
        csApplication:
          'Matrices Model-View-Projection en motores gráficos, compresión de imágenes por truncamiento de valores singulares y estabilidad numérica.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: 'struct Svd3 { u: [f32; 9], s: [f32; 3], vt: [f32; 9] } (84 B)',
            codeSnippet: `#[repr(C)]
struct Mat3([f32; 9]); // A = U * Σ * Vᵀ

let sigma = [${svd.S.map((s) => s.toFixed(2)).join(', ')}];
let p = transform_mat3(&a, pos);
// Si det(A) < 0 se invierte la orientación (winding)`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: 'record Svd3(float[] u, float[] s, float[] vt) · 3 arreglos planos',
            codeSnippet: `record Svd3(float[] u, float[] s, float[] vt) {}

float[] sigma = { ${svd.S.map((s) => `${s.toFixed(2)}f`).join(', ')} };
// Aplica Vᵀ -> Σ -> U sobre buffer plano de vértices
float det = a[0] * (a[4] * a[8] - a[5] * a[7]);`,
          },
        },
      };
    }

    case 'lin-eigen': {
      const a = params.a ?? 1.5;
      const b = params.b ?? 0.5;
      const c = params.c ?? 0.3;
      const d = params.d ?? 0.9;
      const pairs = computeRealEigen2D(a, b, c, d);
      return {
        memoryValues: [
          a.toFixed(2),
          b.toFixed(2),
          c.toFixed(2),
          d.toFixed(2),
          ...pairs.map((p, idx) => `λ${idx + 1}=${p.lambda.toFixed(2)}`),
        ],
        complexity: 'O(k·n²) iteración de potencia · O(n³) espectro completo',
        csApplication:
          'Análisis de Componentes Principales (PCA), algoritmo PageRank en grafos web y análisis de estabilidad en sistemas dinámicos.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: '[[f64; 2]; 2] en Stack (32 bytes) + espectro λ',
            codeSnippet: `let a = [[${a.toFixed(2)}, ${b.toFixed(2)}], [${c.toFixed(2)}, ${d.toFixed(2)}]];
let mut v = [1.0_f64, 0.0];
for _ in 0..20 {
    let av = [a[0][0]*v[0] + a[0][1]*v[1],
              a[1][0]*v[0] + a[1][1]*v[1]];
    let n = av[0].hypot(av[1]);
    v = [av[0] / n, av[1] / n];
}`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: 'double[4] plano en Heap (32 B payload) + cociente de Rayleigh',
            codeSnippet: `double[] a = { ${a.toFixed(2)}, ${b.toFixed(2)}, ${c.toFixed(2)}, ${d.toFixed(2)} };
double vx = 1.0, vy = 0.0;
for (int k = 0; k < 20; k++) {
    double nx = a[0] * vx + a[1] * vy;
    double ny = a[2] * vx + a[3] * vy;
    double norm = Math.hypot(nx, ny);
    vx = nx / norm; vy = ny / norm;
}`,
          },
        },
      };
    }

    case 'lin-manifold': {
      const w = params.weight ?? 1.4;
      const b = params.bias ?? 0.0;
      const fold = params.fold ?? 1.0;
      const res = generateManifoldPoints(extras.dataset, w, b, fold, extras.activation);
      const rustAct =
        extras.activation === 'relu'
          ? 'z.max(0.0)'
          : extras.activation === 'tanh'
            ? 'z.tanh()'
            : extras.activation === 'sigmoid'
              ? '1.0 / (1.0 + (-z).exp())'
              : 'z';
      const javaAct =
        extras.activation === 'relu'
          ? 'Math.max(0.0f, z)'
          : extras.activation === 'tanh'
            ? '(float) Math.tanh(z)'
            : extras.activation === 'sigmoid'
              ? '(float) (1.0 / (1.0 + Math.exp(-z)))'
              : 'z';
      return {
        memoryValues: [
          `W=${w.toFixed(2)}`,
          `b=${b.toFixed(2)}`,
          `γ=${fold.toFixed(2)}`,
          `plano y=${res.planeY.toFixed(2)}`,
          `acc=${(res.accuracy * 100).toFixed(0)}%`,
        ],
        complexity: 'O(B·d_in·d_out) capa lineal + O(B·d_out) activación',
        csApplication:
          'Capa oculta de una red neuronal: sin una función no lineal φ, apilar capas lineales colapsa en una única transformación afín.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: `Vec<[f32; 3]> contiguo (96×12 B = 1,152 B) · φ = ${extras.activation}`,
            codeSnippet: `// Transformación in-place sin copia (acc ${(res.accuracy * 100).toFixed(0)}%)
for p in points.iter_mut() {
    let z = ${w.toFixed(2)} * feat(p[0], p[2]) + ${b.toFixed(2)};
    p[1] = ${fold.toFixed(2)} * (${rustAct});
}`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: `float[288] intercalado (SoA/AoS sin boxing) · φ = ${extras.activation}`,
            codeSnippet: `// Evita List<Point> para eliminar sobrecarga de objetos
for (int i = 0; i < pts.length; i += 3) {
    float z = ${w.toFixed(2)}f * feat(pts[i], pts[i + 2]) + ${b.toFixed(2)}f;
    pts[i + 1] = ${fold.toFixed(2)}f * (${javaAct});
} // Precisión lineal: ${(res.accuracy * 100).toFixed(0)}%`,
          },
        },
      };
    }

    case 'calc-partials': {
      const x0 = params.x0 ?? 0.6;
      const y0 = params.y0 ?? 0.4;
      const freq = params.freq ?? 1.0;
      const { fx, fy, z } = evaluatePartialGradients(x0, y0, freq, 0.85);
      return {
        memoryValues: [`z₀=${z.toFixed(3)}`, `fx=${fx.toFixed(3)}`, `fy=${fy.toFixed(3)}`],
        complexity: 'O(1) evaluación analítica · O(d) gradiente numérico',
        csApplication:
          'Cálculo de normales de superficies en motores 3D (bump/normal mapping) y linealización local en métodos de Newton.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: '(f64, [f64; 2]) en registros CPU (24 bytes, cero heap)',
            codeSnippet: `// Normal exacta desde derivadas parciales
let tx = [1.0, ${fx.toFixed(2)}, 0.0];
let tz = [0.0, ${fy.toFixed(2)}, 1.0];
let n = normalize3(cross3(tz, tx));
// Plano tangente: z0 + fx*(x - x0) + fy*(y - y0)`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: 'record PartialJet(double z, double fx, double fy) · 3×double',
            codeSnippet: `record PartialJet(double z, double fx, double fy) {}

// Normal unitaria desde tangentes parciales
double nx = -${fx.toFixed(2)}, ny = 1.0, nz = -${fy.toFixed(2)};
double inv = 1.0 / Math.sqrt(nx*nx + ny*ny + nz*nz);`,
          },
        },
      };
    }

    case 'calc-autodiff': {
      const snap = evaluateAutoDiffDag(params.x ?? 0.7, params.y ?? 0.6, params.w ?? 1.6);
      return {
        memoryValues: [
          `f=${snap.outputValue.toFixed(3)}`,
          `∂f/∂x=${snap.gradX.toFixed(3)}`,
          `∂f/∂y=${snap.gradY.toFixed(3)}`,
        ],
        complexity: 'O(V + E) forward + O(V + E) backward (independiente de #parámetros)',
        csApplication:
          'Motor de retropropagación (Autograd en PyTorch / Burn / DJL): calcula derivadas exactas sin error de truncamiento.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: 'Vec<TapeNode> arena plana (8 nodos · val, grad: f64)',
            codeSnippet: `// Regla de la cadena en orden topológico inverso
for id in (0..tape.len()).rev() {
    let g = tape[id].grad;
    tape[id].backprop(g, &mut grads);
}
// ∂f/∂x = ${snap.gradX.toFixed(3)}, ∂f/∂y = ${snap.gradY.toFixed(3)}`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: 'double[] val + double[] grad (Structure of Arrays, 8 nodos)',
            codeSnippet: `// Cinta reversa en arreglos paralelos (cache-friendly)
grad[OUT] = 1.0;
for (int i = nodes - 1; i >= 0; i--) {
    propagateLocal(i, val, grad);
}
// ∂f/∂x = ${snap.gradX.toFixed(3)}, ∂f/∂y = ${snap.gradY.toFixed(3)}`,
          },
        },
      };
    }

    case 'calc-optimizers': {
      const lr = params.lr ?? 0.06;
      const beta = params.beta ?? 0.82;
      const sample = evaluateLossLandscape(0.4, 0.4, extras.landscape);
      return {
        memoryValues: [
          `α=${lr.toFixed(2)}`,
          `β=${beta.toFixed(2)}`,
          `L(0.4,0.4)=${sample.loss.toFixed(2)}`,
        ],
        complexity: 'O(P) tiempo por paso · Adam requiere 3× memoria de pesos (θ, m, v)',
        csApplication:
          'Entrenamiento de redes neuronales y LLMs: Adam adapta el paso por parámetro manteniendo primer y segundo momento.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: `struct AdamState { theta: f32, m: f32, v: f32 } (12 B/param) · ${extras.landscape}`,
            codeSnippet: `for ((th, m), (v, &g)) in theta.iter_mut()
    .zip(&mut m_buf).zip(v_buf.iter_mut().zip(grad)) {
    *m = ${beta.toFixed(2)} * *m + (1.0 - ${beta.toFixed(2)}) * g;
    *v = 0.999 * *v + 0.001 * g * g;
    *th -= ${lr.toFixed(2)} * (*m / (v.sqrt() + 1e-8));
}`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: `3 × float[P] (theta, m, v) contiguos · ${extras.landscape}`,
            codeSnippet: `for (int i = 0; i < theta.length; i++) {
    float g = grad[i];
    m[i] = ${beta.toFixed(2)}f * m[i] + (1f - ${beta.toFixed(2)}f) * g;
    v[i] = 0.999f * v[i] + 0.001f * g * g;
    theta[i] -= ${lr.toFixed(2)}f * (m[i] / ((float) Math.sqrt(v[i]) + 1e-8f));
}`,
          },
        },
      };
    }

    case 'calc-symbolic': {
      const target = SYMBOLIC_TARGETS[extras.symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
      const humanMse = computeSurfaceMse(
        params.wSin ?? 0.2,
        params.wCos ?? 0.2,
        params.wQuad ?? 0,
        params.wCross ?? 0,
        params.wGauss ?? 0.3,
        target.weights
      );
      return {
        memoryValues: [
          `MSE Humano=${humanMse.toFixed(4)}`,
          `MSE IA=${extras.aiMse < 90 ? extras.aiMse.toFixed(4) : '—'}`,
          `Fórmula IA: ${extras.aiFormula}`,
        ],
        complexity: 'O(G · P · N²) en hilo paralelo (cero bloqueo del render 60 FPS)',
        csApplication:
          'Descubrimiento científico asistido por IA y programación genética concurrente transfiriendo buffers planos entre hilos.',
        implementations: {
          rust: {
            language: 'rust',
            label: 'Rust',
            memoryLayout: `Box<[f32; 625]> (2.5 KB) transferido por mpsc::Sender · Gen ${extras.generation}`,
            codeSnippet: `// Propiedad transferida entre hilos sin copia (Send)
let grid: Box<[f32; 625]> = eval_surface(&best_dna);
tx.send(EvolutionMsg {
    gen: ${extras.generation},
    mse: best_mse,
    grid, // move ownership: 0 copias de memoria
})?;`,
          },
          java: {
            language: 'java',
            label: 'Java',
            memoryLayout: `float[625] (2.5 KB) en ExecutorService / ForkJoinPool · Gen ${extras.generation}`,
            codeSnippet: `// Evolución asíncrona fuera del hilo de renderizado
CompletableFuture.supplyAsync(() -> {
    float[] grid = evalSurface(bestDna); // 25x25 plano
    return new EvolutionMsg(${extras.generation}, bestMse, grid);
}, pool);`,
          },
        },
      };
    }
  }
}

export function buildSceneLiveMetrics(
  sceneId: SceneId,
  params: Record<string, number>,
  extras: {
    activation: ActivationKind;
    dataset: ManifoldDatasetKind;
    landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
    symbolicTargetIdx: number;
    adamLoss: number;
    adamSteps: number;
    aiMse: number;
    generation: number;
  }
): SceneLiveMetrics {
  switch (sceneId) {
    case 'lin-span': {
      const v1: [number, number, number] = [params.c1 ?? 1.2, 0.2, 0.1];
      const v2: [number, number, number] = [0.2, 0.3, params.c2 ?? 1.1];
      const v3: [number, number, number] = [0.4, params.v3y ?? 1.0, 0.35];
      const det = determinant3(mat3FromColumns(v1, v2, v3));
      const rank = computeRank3(v1, v2, v3);
      const nearCollapse = rank < 3 || Math.abs(det) < 0.14;
      return {
        primaryLabel: 'Rango',
        primaryValue: rank < 3 ? `${rank} / 3` : nearCollapse ? '≈ 2 / 3' : `${rank} / 3`,
        secondaryLabel: 'Volumen |det|',
        secondaryValue: Math.abs(det).toFixed(2),
        statusText:
          rank < 3
            ? 'Colapso dimensional: vectores dependientes'
            : nearCollapse
              ? 'Colapso dimensional: vectores casi coplanares'
              : 'Base linealmente independiente',
        statusSeverity: nearCollapse ? 'warning' : 'nominal',
      };
    }

    case 'lin-svd': {
      const m: [number, number, number, number, number, number, number, number, number] = [
        params.a11 ?? 1.3, params.a12 ?? 0.5, 0,
        params.a21 ?? 0.2, params.a22 ?? 1.1, 0,
        0, 0, params.a33 ?? 1.0,
      ];
      const det = determinant3(m);
      const svd = computeSvd3(m);
      const stage = params.svdStage ?? 3;
      const stageLabel = stage < 1 ? 'Acto 1: Vᵀ' : stage < 2 ? 'Acto 2: Σ' : 'Acto 3: U';
      return {
        primaryLabel: 'det(A)',
        primaryValue: det.toFixed(2),
        secondaryLabel: stageLabel,
        secondaryValue: `σ₁=${svd.S[0].toFixed(2)}`,
        statusText:
          Math.abs(det) < 0.08
            ? 'Matriz singular (det ≈ 0): colapso de volumen'
            : det < 0
              ? 'Orientación invertida (reverso bermellón)'
              : 'Orientación positiva conservada',
        statusSeverity: Math.abs(det) < 0.08 || det < 0 ? 'warning' : 'nominal',
      };
    }

    case 'lin-eigen': {
      const a = params.a ?? 1.5;
      const b = params.b ?? 0.5;
      const c = params.c ?? 0.3;
      const d = params.d ?? 0.9;
      const theta = params.probeAngle ?? 0.4;
      const vx = Math.cos(theta);
      const vy = Math.sin(theta);
      const avx = a * vx + b * vy;
      const avy = c * vx + d * vy;
      const normAv = Math.hypot(avx, avy);
      const cosAng = normAv > 1e-6 ? Math.abs((vx * avx + vy * avy) / normAv) : 0;
      const deg = (Math.acos(Math.min(1, Math.max(-1, cosAng))) * 180) / Math.PI;
      const lambdaEst = vx * avx + vy * avy;
      return {
        primaryLabel: 'Desviación ∠',
        primaryValue: `${deg.toFixed(1)}°`,
        secondaryLabel: 'Factor λ est.',
        secondaryValue: lambdaEst.toFixed(2),
        statusText:
          deg < 5.5 ? '¡Autovector alineado! A·v paralelo a v' : 'Gira θ hasta alinear v y A·v',
        statusSeverity: deg < 5.5 ? 'highlight' : 'nominal',
      };
    }

    case 'lin-manifold': {
      const res = generateManifoldPoints(
        extras.dataset,
        params.weight ?? 1.4,
        params.bias ?? 0,
        params.fold ?? 1,
        extras.activation
      );
      return {
        primaryLabel: 'Separabilidad',
        primaryValue: `${(res.accuracy * 100).toFixed(0)}%`,
        secondaryLabel: 'Activación φ',
        secondaryValue: extras.activation,
        statusText:
          res.accuracy >= 0.88
            ? 'Clases linealmente separables tras el pliegue'
            : 'Clases entrelazadas: requiere mayor pliegue no lineal',
        statusSeverity: res.accuracy >= 0.88 ? 'highlight' : 'warning',
      };
    }

    case 'calc-partials': {
      const { fx, fy } = evaluatePartialGradients(
        params.x0 ?? 0.6,
        params.y0 ?? 0.4,
        params.freq ?? 1.0,
        0.85
      );
      const mag = Math.hypot(fx, fy);
      return {
        primaryLabel: '∂f/∂x · ∂f/∂y',
        primaryValue: `${fx.toFixed(2)} · ${fy.toFixed(2)}`,
        secondaryLabel: '||∇f||',
        secondaryValue: mag.toFixed(2),
        statusText: mag < 0.22 ? 'Cerca de punto crítico (∇f ≈ 0)' : 'Pendiente activa en plano tangente',
        statusSeverity: mag < 0.22 ? 'highlight' : 'nominal',
      };
    }

    case 'calc-autodiff': {
      const snap = evaluateAutoDiffDag(params.x ?? 0.7, params.y ?? 0.6, params.w ?? 1.6);
      return {
        primaryLabel: 'f(x,y)',
        primaryValue: snap.outputValue.toFixed(2),
        secondaryLabel: '∂f/∂x · ∂f/∂y',
        secondaryValue: `${snap.gradX.toFixed(2)} · ${snap.gradY.toFixed(2)}`,
        statusText:
          snap.gradStatus === 'vanishing'
            ? 'Alerta: gradiente desvanecido (||∇|| < 0.15)'
            : snap.gradStatus === 'exploding'
              ? 'Alerta: gradiente elevado (||∇|| > 5.5)'
              : 'Flujo de gradiente estable en el DAG',
        statusSeverity: snap.gradStatus === 'nominal' ? 'nominal' : 'warning',
      };
    }

    case 'calc-optimizers': {
      return {
        primaryLabel: 'Pasos',
        primaryValue: String(extras.adamSteps),
        secondaryLabel: 'Pérdida Adam',
        secondaryValue: extras.adamLoss.toFixed(3),
        statusText:
          (params.lr ?? 0.06) > 0.22
            ? 'Tasa α alta: riesgo de rebote y divergencia'
            : 'Comparando SGD, Momentum y Adam en vivo',
        statusSeverity: (params.lr ?? 0.06) > 0.22 ? 'warning' : 'nominal',
      };
    }

    case 'calc-symbolic': {
      const target = SYMBOLIC_TARGETS[extras.symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
      const humanMse = computeSurfaceMse(
        params.wSin ?? 0.2,
        params.wCos ?? 0.2,
        params.wQuad ?? 0,
        params.wCross ?? 0,
        params.wGauss ?? 0.3,
        target.weights
      );
      return {
        primaryLabel: 'MSE Humano',
        primaryValue: humanMse.toFixed(4),
        secondaryLabel: `MSE IA (Gen ${extras.generation})`,
        secondaryValue: extras.aiMse < 90 ? extras.aiMse.toFixed(4) : 'En espera',
        statusText:
          humanMse < 0.08
            ? 'Excelente ajuste simbólico sobre el objetivo'
            : 'Ajusta pesos o lanza la evolución paralela de la IA',
        statusSeverity: humanMse < 0.08 ? 'highlight' : 'nominal',
      };
    }
  }
}
