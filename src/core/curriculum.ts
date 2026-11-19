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
        explodeOffsetY: -0.9,
        explanation: 'Retícula de cuaderno y ejes coordenados de referencia (X, Y, Z).',
      },
      {
        id: 'structure',
        label: 'Volumen Span',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Paralelepípedo generado por v₁, v₂ y v₃; su volumen equivale a |det([v₁ v₂ v₃])|.',
      },
      {
        id: 'operator',
        label: 'Vectores Base',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Vectores generadores v₁ (cobalto), v₂ (bermellón) y v₃ (ocre) con su resultante p.',
      },
      {
        id: 'error',
        label: 'Hoja de Colapso',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.95,
        explanation: 'Espacio identidad antes de aplicar la transformación lineal A.',
      },
      {
        id: 'structure',
        label: 'Cubo Unitario',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Cubo de volumen 1 que cambia a bermellón si det(A) < 0 por inversión de orientación.',
      },
      {
        id: 'operator',
        label: 'Ejes Transformados',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Columnas de A: destino de los vectores base î\', ĵ\' y k̂\'.',
      },
      {
        id: 'error',
        label: 'Ejes Singulares Σ',
        crayon: 'ochre',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.85,
        explanation: 'Círculo unitario y plano de referencia para comparar v contra A·v.',
      },
      {
        id: 'structure',
        label: 'Corona de Rayos',
        crayon: 'pencil',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: '24 direcciones instanciadas mostrando cómo A gira y deforma el plano.',
      },
      {
        id: 'operator',
        label: 'Sonda v y A·v',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Vector sonda controlado por θ (cobalto) junto a su imagen A·v (bermellón).',
      },
      {
        id: 'invariant',
        label: 'Autovectores Reales',
        crayon: 'ochre',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.95,
        explanation: 'Espacio de entrada 2D antes del levantamiento por la capa neuronal.',
      },
      {
        id: 'structure',
        label: 'Hoja Plegada',
        crayon: 'plum',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Superficie continua deformada por φ(W·x + b) en crayón ciruela.',
      },
      {
        id: 'operator',
        label: 'Nubes Clase A / B',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Muestras instanciadas en cobalto (Clase A) y ciruela (Clase B).',
      },
      {
        id: 'invariant',
        label: 'Plano Separador',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.95,
        explanation: 'Proyección topográfica en crayón ocre sobre el piso del cuaderno.',
      },
      {
        id: 'structure',
        label: 'Superficie z=f(x,y)',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Campo escalar sombreado con mordida de crayón azul cobalto.',
      },
      {
        id: 'operator',
        label: 'Planos de Corte X/Y',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Láminas translúcidas achuradas en y = y₀ (bermellón) y x = x₀ (ocre).',
      },
      {
        id: 'invariant',
        label: 'Plano Tangente y ∇f',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.9,
        explanation: 'Plano de entradas (x, y) y ejes del espacio de parámetros.',
      },
      {
        id: 'structure',
        label: 'Superficie',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Gráfica de f(x,y) = x·y + sin(w·x) + 0.4y² evaluada por el DAG.',
      },
      {
        id: 'operator',
        label: 'Forward',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Flujo de activaciones desde entradas hacia la salida en verde salvia.',
      },
      {
        id: 'error',
        label: 'Gradiente',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.95,
        explanation: 'Mapa de contorno proyectado mostrando valles estrechos y mínimos.',
      },
      {
        id: 'structure',
        label: 'Paisaje de Pérdida',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Función objetivo L(x, y) a minimizar en escala logarítmica suave.',
      },
      {
        id: 'operator',
        label: 'Estelas SGD/Mom/Adam',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 0.55,
        explanation: 'Trayectorias comparadas: SGD (cobalto), Momentum (ocre) y Adam (salvia).',
      },
      {
        id: 'invariant',
        label: 'Vectores -α∇f e Inercia',
        crayon: 'vermilion',
        visible: true,
        explodeOffsetY: 1.05,
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
        explodeOffsetY: -0.95,
        explanation: 'Dominio [-2, 2]² donde se mide el error cuadrático medio (MSE).',
      },
      {
        id: 'structure',
        label: 'Superficie Objetivo',
        crayon: 'pencil',
        visible: true,
        explodeOffsetY: 0.0,
        explanation: 'Trazo fantasma en lápiz gris de la ecuación oculta a descubrir.',
      },
      {
        id: 'operator',
        label: 'Tu Modelo (Humano)',
        crayon: 'cobalt',
        visible: true,
        explodeOffsetY: 0.45,
        explanation: 'Malla en crayón cobalto construida con tus coeficientes simbólicos.',
      },
      {
        id: 'error',
        label: 'Mejor Fórmula IA',
        crayon: 'sage',
        visible: true,
        explodeOffsetY: 0.95,
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
        memoryLayout: 'Float32Array(9) — Column-Major (36 bytes)',
        memoryValues: Array.from(buf).map((v) => v.toFixed(2)),
        complexity: 'O(n³) eliminación gaussiana · O(n) combinación lineal',
        csApplication:
          'Bases ortonormales de cámaras 3D, mezcla de canales RGB y detección de columnas redundantes en matrices de características (ML).',
        codeLanguage: 'TypeScript',
        codeSnippet: `const v1 = [${c1.toFixed(2)}, 0.20, 0.10];
const v2 = [0.20, 0.30, ${c2.toFixed(2)}];
const v3 = [0.40, ${v3y.toFixed(2)}, 0.35];
// Volumen = |det([v1, v2, v3])|`,
      };
    }

    case 'lin-svd': {
      const m: [number, number, number, number, number, number, number, number, number] = [
        params.a11 ?? 1.3, params.a12 ?? 0.5, 0,
        params.a21 ?? 0.2, params.a22 ?? 1.1, 0,
        0, 0, params.a33 ?? 1.0,
      ];
      const svd = computeSvd3(m);
      const buf = mat3ToColumnMajorFloat32(m);
      return {
        memoryLayout: 'Float32Array(9) + Σ = [σ₁, σ₂, σ₃]',
        memoryValues: [
          ...Array.from(buf).map((v) => v.toFixed(2)),
          `σ=[${svd.S.map((s) => s.toFixed(2)).join(', ')}]`,
        ],
        complexity: 'O(min(mn², m²n)) descomposición SVD · O(1) determinante 3×3',
        csApplication:
          'Matrices Model-View-Projection en WebGL, compresión de imágenes por truncamiento de valores singulares y estabilidad de inversas.',
        codeLanguage: 'GLSL',
        codeSnippet: `uniform mat3 uTransform; // A = U * Sigma * Vt
vec3 p = uTransform * position;
// Si det(uTransform) < 0 se invierte el winding`,
      };
    }

    case 'lin-eigen': {
      const a = params.a ?? 1.5;
      const b = params.b ?? 0.5;
      const c = params.c ?? 0.3;
      const d = params.d ?? 0.9;
      const pairs = computeRealEigen2D(a, b, c, d);
      return {
        memoryLayout: 'Float32Array(4) — Matriz 2×2 + espectro λ',
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
        codeLanguage: 'TypeScript',
        codeSnippet: `// Iteración de potencia (autovector dominante)
for (let k = 0; k < 20; k++) {
  v = normalize(matMulVec(A, v));
}
const lambda = dot(v, matMulVec(A, v));`,
      };
    }

    case 'lin-manifold': {
      const w = params.weight ?? 1.4;
      const b = params.bias ?? 0.0;
      const fold = params.fold ?? 1.0;
      const res = generateManifoldPoints(extras.dataset, w, b, fold, extras.activation);
      return {
        memoryLayout: `Tensor [96 × 3] Float32Array · φ = ${extras.activation}`,
        memoryValues: [
          `W=${w.toFixed(2)}`,
          `b=${b.toFixed(2)}`,
          `γ=${fold.toFixed(2)}`,
          `plano y=${res.planeY.toFixed(2)}`,
          `acc=${(res.accuracy * 100).toFixed(0)}%`,
        ],
        complexity: 'O(B·d_in·d_out) capa lineal + O(B·d_out) activación',
        csApplication:
          'Capa oculta de una red neuronal en PyTorch: sin una función no lineal φ, componer capas lineales colapsa en una única matriz.',
        codeLanguage: 'TypeScript',
        codeSnippet: `// Capa densa + activación no lineal
const h = points.map((x) =>
  ${extras.activation}(W * feature(x) + b) * ${fold.toFixed(2)}
); // Precisión lineal: ${(res.accuracy * 100).toFixed(0)}%`,
      };
    }

    case 'calc-partials': {
      const x0 = params.x0 ?? 0.6;
      const y0 = params.y0 ?? 0.4;
      const freq = params.freq ?? 1.0;
      const { fx, fy, z } = evaluatePartialGradients(x0, y0, freq, 0.85);
      return {
        memoryLayout: 'Float32Array(3) — [z₀, ∂f/∂x, ∂f/∂y]',
        memoryValues: [`z₀=${z.toFixed(3)}`, `fx=${fx.toFixed(3)}`, `fy=${fy.toFixed(3)}`],
        complexity: 'O(1) evaluación analítica · O(d) gradiente numérico',
        csApplication:
          'Cálculo de normales de superficies en shaders 3D (bump/normal mapping) y linealización local en métodos de Newton.',
        codeLanguage: 'GLSL',
        codeSnippet: `// Normal exacta desde derivadas parciales
vec3 tangentX = vec3(1.0, ${fx.toFixed(2)}, 0.0);
vec3 tangentZ = vec3(0.0, ${fy.toFixed(2)}, 1.0);
vec3 N = normalize(cross(tangentZ, tangentX));`,
      };
    }

    case 'calc-autodiff': {
      const snap = evaluateAutoDiffDag(params.x ?? 0.7, params.y ?? 0.6, params.w ?? 1.6);
      return {
        memoryLayout: 'DAG 8 nodos · Cinta reversa (value, grad)',
        memoryValues: [
          `f=${snap.outputValue.toFixed(3)}`,
          `∂f/∂x=${snap.gradX.toFixed(3)}`,
          `∂f/∂y=${snap.gradY.toFixed(3)}`,
        ],
        complexity: 'O(V + E) forward + O(V + E) backward (independiente de #parámetros)',
        csApplication:
          'Motor de retropropagación (Autograd en PyTorch / JAX): calcula gradientes exactos sin errores de truncamiento de diferencias finitas.',
        codeLanguage: 'TypeScript',
        codeSnippet: `// Regla de la cadena en orden topológico inverso
grad_v4 += 1.0 * grad_out;
grad_wx += Math.cos(w * x) * grad_v2;
grad_x  += y * grad_v1 + w * grad_wx; // ${snap.gradX.toFixed(3)}`,
      };
    }

    case 'calc-optimizers': {
      const lr = params.lr ?? 0.06;
      const beta = params.beta ?? 0.82;
      const sample = evaluateLossLandscape(0.4, 0.4, extras.landscape);
      return {
        memoryLayout: `Estado por parámetro: θ, m, v (3×Float32) · ${extras.landscape}`,
        memoryValues: [
          `α=${lr.toFixed(2)}`,
          `β=${beta.toFixed(2)}`,
          `L(0.4,0.4)=${sample.loss.toFixed(2)}`,
        ],
        complexity: 'O(P) tiempo por paso · Adam requiere 3× memoria de pesos (θ, m, v)',
        csApplication:
          'Entrenamiento de redes neuronales y modelos de lenguaje: Adam adapta el paso por coordenada usando el primer y segundo momento.',
        codeLanguage: 'TypeScript',
        codeSnippet: `m = beta1 * m + (1 - beta1) * g;
v = beta2 * v + (1 - beta2) * (g * g);
theta -= alpha * (mHat / (Math.sqrt(vHat) + 1e-8));`,
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
        memoryLayout: `Web Worker + Float32Array(625) transferible · Gen ${extras.generation}`,
        memoryValues: [
          `MSE Humano=${humanMse.toFixed(4)}`,
          `MSE IA=${extras.aiMse < 90 ? extras.aiMse.toFixed(4) : '—'}`,
          `Fórmula IA: ${extras.aiFormula}`,
        ],
        complexity: 'O(G · P · N²) en hilo paralelo (cero bloqueo del render 60 FPS)',
        csApplication:
          'Descubrimiento científico asistido por IA y programación genética distribuida en Web Workers usando buffers transferibles.',
        codeLanguage: 'TypeScript',
        codeSnippet: `// Transferencia sin copia desde Web Worker
self.postMessage({ generation, bestFormula, aiGrid }, [
  aiGrid.buffer
]);`,
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
