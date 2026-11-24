import type { CrayonToken, SceneId } from './types';
import type { ActivationKind, ManifoldDatasetKind } from '../math/linearAlgebra';

export interface IntroGraphPart {
  label: string;
  crayon: CrayonToken;
  meaning: string;
}

export interface IntroFormulaPiece {
  symbol: string;
  meaning: string;
}

export interface IntroStageChoreography {
  params?: Record<string, number>;
  exploded?: boolean;
  focusedLayerId?: string | null;
  activation?: ActivationKind;
  dataset?: ManifoldDatasetKind;
  landscape?: 'rosenbrock' | 'rastrigin' | 'saddle';
  autoDiffPass?: 'idle' | 'forward' | 'backward';
  startOptimizer?: boolean;
}

export interface LessonIntroBeat {
  id: string;
  tag: string;
  headline: string;
  narration: string;
  durationMs: number;
  parts?: IntroGraphPart[];
  formula?: {
    latex: string;
    breakdown: IntroFormulaPiece[];
  };
  realWorldNote?: string;
  stageState: IntroStageChoreography;
}

export interface LessonIntroSpec {
  sceneId: SceneId;
  lessonNumber: number;
  moduleName: string;
  title: string;
  subtitle: string;
  beats: [LessonIntroBeat, LessonIntroBeat, LessonIntroBeat, LessonIntroBeat];
}

export const LESSON_INTROS: Record<SceneId, LessonIntroSpec> = {
  'lin-span': {
    sceneId: 'lin-span',
    lessonNumber: 1,
    moduleName: 'Álgebra Lineal',
    title: 'Span e Independencia Lineal',
    subtitle: 'Cómo unas pocas flechas pueden construir todo un espacio en 3D.',
    beats: [
      {
        id: 'span-b1',
        tag: '1 · La idea',
        headline: 'Construir espacio combinando flechas',
        narration:
          'Imagina que solo puedes caminar siguiendo tres flechas dibujadas desde el origen. Si puedes estirarlas, encogerlas o invertirlas y sumar sus pasos, todo el territorio al que logras llegar se llama el Span.',
        durationMs: 13500,
        stageState: {
          params: { c1: 1.25, c2: 1.15, v3y: 1.05 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'span-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Qué representa cada trazo en el lienzo',
        narration:
          'Cada color del dibujo tiene un papel preciso. Las tres flechas forman tu caja de herramientas y la figura translúcida muestra el volumen real que logran abarcar juntas.',
        durationMs: 15500,
        parts: [
          { label: 'v₁, v₂, v₃', crayon: 'cobalt', meaning: 'Vectores base que definen tus direcciones permitidas.' },
          { label: 'Caja verde', crayon: 'sage', meaning: 'El volumen 3D generado (su tamaño es el determinante).' },
          { label: 'Flecha p', crayon: 'graphite', meaning: 'El punto destino que obtienes al combinarlas.' },
        ],
        stageState: {
          params: { c1: 1.65, c2: 1.45, v3y: 1.15 },
          exploded: false,
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'span-b3',
        tag: '3 · Míralo en acción',
        headline: 'Cuando una flecha sobra: el colapso de rango',
        narration:
          'Observa la gráfica ahora: al aplastar v₃ sobre el mismo suelo que v₁ y v₂, la caja 3D pierde su altura y se vuelve una hoja plana roja. Cuando un vector se puede fabricar con los otros, ya no son independientes y pierdes una dimensión.',
        durationMs: 14500,
        stageState: {
          params: { c1: 1.3, c2: 1.2, v3y: 0.08 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'span-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'La combinación lineal sin misterio',
        narration:
          'Escribir una combinación lineal solo significa elegir cuánto estirar cada flecha base y sumar los resultados. Es la base de los gráficos 3D, las cámaras de videojuegos y los datos en inteligencia artificial.',
        durationMs: 16500,
        formula: {
          latex: '\\vec{p} = c_1\\vec{v}_1 + c_2\\vec{v}_2 + \\vec{v}_3',
          breakdown: [
            { symbol: 'c₁, c₂', meaning: 'cuánto estiras o inviertes cada flecha' },
            { symbol: 'v₁, v₂, v₃', meaning: 'las direcciones base (columnas de la matriz)' },
            { symbol: 'p', meaning: 'la posición final alcanzada en el espacio' },
          ],
        },
        realWorldNote: 'Si una cámara 3D o un conjunto de datos tiene columnas repetidas (colapso de rango), el sistema pierde información y las ecuaciones dejan de tener solución única.',
        stageState: {
          params: { c1: 1.2, c2: 1.1, v3y: 1.0 },
          exploded: false,
          focusedLayerId: null,
        },
      },
    ],
  },

  'lin-svd': {
    sceneId: 'lin-svd',
    lessonNumber: 2,
    moduleName: 'Álgebra Lineal',
    title: 'Transformaciones, Determinante y SVD',
    subtitle: 'Toda matriz es, en el fondo, tres movimientos simples: rotar, estirar y volver a rotar.',
    beats: [
      {
        id: 'svd-b1',
        tag: '1 · La idea',
        headline: 'Una matriz es una máquina que deforma el espacio',
        narration:
          'En lugar de ver una matriz como una tabla fría de números, mírala como una acción: toma un cubo y una esfera perfectos y los gira, inclina o aplasta de manera uniforme.',
        durationMs: 13500,
        stageState: {
          params: { a11: 1.4, a12: 0.5, a21: 0.2, a22: 1.1, a33: 1.0, svdStage: 3.0 },
          focusedLayerId: null,
        },
      },
      {
        id: 'svd-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Cómo leer la anatomía de la deformación',
        narration:
          'El cubo deformado muestra cómo cambió el volumen, mientras que la malla elipsoidal ocre revela hacia qué ejes principales se estiró el espacio.',
        durationMs: 15500,
        parts: [
          { label: 'Cubo verde / rojo', crayon: 'sage', meaning: 'Verde si conserva orientación; rojo si se voltea (det < 0).' },
          { label: 'Elipsoide ocre', crayon: 'ochre', meaning: 'Muestra los valores singulares σ₁, σ₂, σ₃ (estiramiento máximo).' },
          { label: 'Flechas î\', ĵ\'', crayon: 'cobalt', meaning: 'Adónde aterrizaron los ejes originales tras aplicar A.' },
        ],
        stageState: {
          params: { a11: 1.5, a12: 0.6, a21: 0.2, a22: 1.1, a33: 1.0, svdStage: 1.7 },
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'svd-b3',
        tag: '3 · Míralo en acción',
        headline: 'Determinante negativo: voltear el espacio al revés',
        narration:
          'Mira cómo el cubo cambia a rojo bermellón cuando una entrada se vuelve negativa: el determinante mide cuánto creció el volumen y su signo avisa si el espacio se reflejó como un guante dado vuelta.',
        durationMs: 14500,
        stageState: {
          params: { a11: -1.25, a12: 0.3, a21: 0.1, a22: 1.1, a33: 1.0, svdStage: 3.0 },
          focusedLayerId: null,
        },
      },
      {
        id: 'svd-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'SVD: los tres actos de cualquier matriz',
        narration:
          'La Descomposición en Valores Singulares (SVD) parte cualquier transformación compleja en tres pasos limpios y fáciles de entender.',
        durationMs: 16500,
        formula: {
          latex: 'A = U \\Sigma V^T',
          breakdown: [
            { symbol: 'Vᵀ', meaning: 'primera rotación para alinear con los ejes principales' },
            { symbol: 'Σ', meaning: 'estiramiento puro a lo largo de cada eje (σ₁, σ₂, σ₃)' },
            { symbol: 'U', meaning: 'rotación final hacia su posición definitiva' },
          ],
        },
        realWorldNote: 'SVD se usa todos los días para comprimir imágenes, recomendar películas y reducir el tamaño de modelos de IA eliminando los valores σ más pequeños.',
        stageState: {
          params: { a11: 1.3, a12: 0.5, a21: 0.2, a22: 1.1, a33: 1.0, svdStage: 3.0 },
          focusedLayerId: null,
        },
      },
    ],
  },

  'lin-eigen': {
    sceneId: 'lin-eigen',
    lessonNumber: 3,
    moduleName: 'Álgebra Lineal',
    title: 'Autovectores y Direcciones Invariantes',
    subtitle: 'Entre todas las flechas que cambian de rumbo, algunas se niegan a girar.',
    beats: [
      {
        id: 'eigen-b1',
        tag: '1 · La idea',
        headline: 'Direcciones que resisten el giro',
        narration:
          'Cuando aplicas una matriz a muchas flechas a la vez, casi todas se desvían hacia otro ángulo. Sin embargo, existen direcciones especiales llamadas autovectores que permanecen exactamente sobre su misma recta.',
        durationMs: 13500,
        stageState: {
          params: { a: 1.5, b: 0.5, c: 0.3, d: 0.9, probeAngle: 1.05 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'eigen-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'La brújula para cazar autovectores',
        narration:
          'En el lienzo ves una sonda que puedes girar en círculo y su flecha transformada. Tu misión intuitiva es notar dónde ambas apuntan en la misma línea.',
        durationMs: 15500,
        parts: [
          { label: 'Flecha azul v', crayon: 'cobalt', meaning: 'Tu dirección de prueba antes de aplicar la matriz.' },
          { label: 'Flecha roja A·v', crayon: 'vermilion', meaning: 'Hacia dónde empuja la matriz a tu flecha azul.' },
          { label: 'Rectas ocres', crayon: 'ochre', meaning: 'Los ejes propios: las únicas rectas que nunca giran.' },
        ],
        stageState: {
          params: { a: 1.5, b: 0.5, c: 0.3, d: 0.9, probeAngle: 0.85 },
          exploded: false,
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'eigen-b3',
        tag: '3 · Míralo en acción',
        headline: 'El instante exacto de alineación',
        narration:
          'Observa ahora: cuando la flecha azul se posa sobre la recta ocre, la flecha roja A·v queda perfectamente alineada con ella. La matriz solo la estiró (o encogió) por un factor λ llamado autovalor.',
        durationMs: 14500,
        stageState: {
          params: { a: 1.5, b: 0.5, c: 0.3, d: 0.9, probeAngle: 0.38 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'eigen-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'Una multiplicación complicada reducida a un solo número',
        narration:
          'Para un autovector, multiplicar por toda una matriz tiene exactamente el mismo efecto que multiplicar por un número simple λ.',
        durationMs: 16500,
        formula: {
          latex: 'A\\vec{v} = \\lambda\\vec{v}',
          breakdown: [
            { symbol: 'A', meaning: 'la matriz que transforma el plano' },
            { symbol: 'v', meaning: 'el autovector (su dirección no cambia)' },
            { symbol: 'λ', meaning: 'el autovalor (cuánto se estira o encoge v)' },
          ],
        },
        realWorldNote: 'Google PageRank, la compresión facial (PCA) y el análisis de vibraciones en puentes buscan los autovectores más fuertes de una matriz.',
        stageState: {
          params: { a: 1.5, b: 0.5, c: 0.3, d: 0.9, probeAngle: 0.4 },
          exploded: false,
          focusedLayerId: null,
        },
      },
    ],
  },

  'lin-manifold': {
    sceneId: 'lin-manifold',
    lessonNumber: 4,
    moduleName: 'Álgebra Lineal',
    title: 'Plegado de Variedades Neuronales',
    subtitle: 'Por qué las redes neuronales necesitan doblar el espacio para separar datos mezclados.',
    beats: [
      {
        id: 'man-b1',
        tag: '1 · La idea',
        headline: 'Un problema imposible en línea recta',
        narration:
          'Imagina dos grupos de puntos dibujados sobre una hoja plana: uno azul en el centro y otro morado rodeándolo como un anillo. Ninguna regla recta sobre esa hoja puede separarlos de un solo corte.',
        durationMs: 13500,
        stageState: {
          activation: 'linear',
          dataset: 'rings',
          params: { weight: 1.4, bias: 0.0, fold: 1.0 },
          focusedLayerId: null,
        },
      },
      {
        id: 'man-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Los datos y la cuchilla clasificadora',
        narration:
          'El lienzo muestra los dos grupos de puntos y un plano verde que actúa como la frontera de decisión de una neurona.',
        durationMs: 15500,
        parts: [
          { label: 'Puntos azules y morados', crayon: 'plum', meaning: 'Las dos categorías que la red intenta distinguir.' },
          { label: 'Malla de papel', crayon: 'cobalt', meaning: 'El espacio de entrada siendo deformado por la capa.' },
          { label: 'Plano verde', crayon: 'sage', meaning: 'El corte lineal simple que separa arriba vs. abajo.' },
        ],
        stageState: {
          activation: 'linear',
          dataset: 'rings',
          params: { weight: 1.4, bias: 0.0, fold: 1.0 },
          focusedLayerId: 'structure',
        },
      },
      {
        id: 'man-b3',
        tag: '3 · Míralo en acción',
        headline: 'Doblar la hoja hacia la tercera dimensión',
        narration:
          'Mira lo que ocurre al activar una función no lineal (ReLU): la capa levanta el centro de la hoja hacia arriba como una carpa. Ahora el plano verde corta en limpio y separa casi el 100 % de los puntos.',
        durationMs: 14500,
        stageState: {
          activation: 'relu',
          dataset: 'rings',
          params: { weight: 1.85, bias: 0.0, fold: 1.15 },
          focusedLayerId: null,
        },
      },
      {
        id: 'man-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'La receta de una capa neuronal',
        narration:
          'Cada capa de una red neuronal hace dos cosas en cadena: primero estira y mueve con W y b, y luego dobla el espacio con la activación φ.',
        durationMs: 16500,
        formula: {
          latex: 'h = \\gamma\\,\\phi(Wx + b)',
          breakdown: [
            { symbol: 'W, b', meaning: 'pesos y sesgo que rotan, estiran y desplazan los datos' },
            { symbol: 'φ', meaning: 'función no lineal (ReLU, tanh, σ) que introduce el pliegue' },
            { symbol: 'γ', meaning: 'intensidad con la que se eleva el pliegue en 3D' },
          ],
        },
        realWorldNote: 'Reconocer rostros, traducir idiomas o detectar fraude funciona apilando muchas capas que doblan y desenredan los datos hasta que separar clases sea trivial.',
        stageState: {
          activation: 'tanh',
          dataset: 'rings',
          params: { weight: 1.4, bias: 0.0, fold: 1.0 },
          focusedLayerId: null,
        },
      },
    ],
  },

  'calc-partials': {
    sceneId: 'calc-partials',
    lessonNumber: 5,
    moduleName: 'Cálculo Multivariable',
    title: 'Derivadas Parciales y Plano Tangente',
    subtitle: 'Cómo medir la inclinación de una montaña cortándola en dos direcciones.',
    beats: [
      {
        id: 'part-b1',
        tag: '1 · La idea',
        headline: 'Congelar una dirección para entender una montaña',
        narration:
          'En una curva 2D solo hay una pendiente, pero si estás parado sobre una montaña 3D la inclinación depende de hacia dónde camines. Una derivada parcial congela una coordenada para medir la pendiente en un solo sentido.',
        durationMs: 13500,
        stageState: {
          params: { x0: 0.6, y0: 0.4, freq: 1.0 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'part-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Cortes, plano tangente y brújula de subida',
        narration:
          'Fíjate en las láminas que rebanan la superficie azul y en el pequeño plano verde apoyado justo en el punto que estás explorando.',
        durationMs: 15500,
        parts: [
          { label: 'Superficie azul', crayon: 'cobalt', meaning: 'El relieve de la función z = f(x, y).' },
          { label: 'Cortes rojo y ocre', crayon: 'vermilion', meaning: 'Las rebanadas a lo largo de X (∂f/∂x) y de Y (∂f/∂y).' },
          { label: 'Plano y flecha verde', crayon: 'sage', meaning: 'El plano tangente y el gradiente ∇f (hacia donde más sube).' },
        ],
        stageState: {
          params: { x0: 0.75, y0: 0.45, freq: 1.0 },
          exploded: false,
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'part-b3',
        tag: '3 · Míralo en acción',
        headline: 'Cuando el plano queda horizontal: un punto crítico',
        narration:
          'Mira cómo el plano verde se nivela por completo al llegar al fondo del valle: allí ambas pendientes parciales valen cero y el gradiente desaparece. Así es como las matemáticas encuentran mínimos y máximos.',
        durationMs: 14500,
        stageState: {
          params: { x0: -1.2, y0: 0.0, freq: 1.0 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'part-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'El vector gradiente reúne ambas pendientes',
        narration:
          'Juntar las dos derivadas parciales en un solo vector te da una brújula infalible: siempre apunta en la dirección de máxima subida, y su opuesto te lleva cuesta abajo.',
        durationMs: 16500,
        formula: {
          latex: '\\nabla f(x_0, y_0) = \\left(\\frac{\\partial f}{\\partial x},\\;\\frac{\\partial f}{\\partial y}\\right)',
          breakdown: [
            { symbol: '∂f/∂x', meaning: 'pendiente si caminas solo en dirección X' },
            { symbol: '∂f/∂y', meaning: 'pendiente si caminas solo en dirección Y' },
            { symbol: '∇f', meaning: 'flecha de mayor ascenso (perpendicular a las curvas de nivel)' },
          ],
        },
        realWorldNote: 'Desde optimizar costos logísticos hasta entrenar inteligencia artificial, casi todo algoritmo moderno sigue el gradiente para encontrar el punto de menor error.',
        stageState: {
          params: { x0: 0.6, y0: 0.4, freq: 1.0 },
          exploded: false,
          focusedLayerId: null,
        },
      },
    ],
  },

  'calc-autodiff': {
    sceneId: 'calc-autodiff',
    lessonNumber: 6,
    moduleName: 'Cálculo Multivariable',
    title: 'Grafo Computacional y AutoDiff',
    subtitle: 'El truco con el que las computadoras calculan millones de derivadas en milisegundos.',
    beats: [
      {
        id: 'ad-b1',
        tag: '1 · La idea',
        headline: 'Desarmar una fórmula en operaciones pequeñitas',
        narration:
          'Cuando una fórmula tiene miles de variables, derivarla a mano es imposible. La Diferenciación Automática (AutoDiff) parte la fórmula en pasos simples —sumar, multiplicar, seno— conectados como un circuito.',
        durationMs: 13500,
        stageState: {
          params: { x: 0.7, y: 0.6, w: 1.6 },
          autoDiffPass: 'idle',
          focusedLayerId: null,
        },
      },
      {
        id: 'ad-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Superficie 3D y pulso de sensibilidad',
        narration:
          'Cada nodo del circuito guarda su valor en el viaje de ida y luego recibe cuánto influye en el resultado final durante el viaje de vuelta.',
        durationMs: 15500,
        parts: [
          { label: 'Pase Forward (verde)', crayon: 'sage', meaning: 'Calcula los resultados de izquierda a derecha.' },
          { label: 'Pase Backward (rojo)', crayon: 'vermilion', meaning: 'Devuelve las derivadas multiplicando por la regla de la cadena.' },
          { label: 'Flechas en 3D', crayon: 'ochre', meaning: 'Muestran la sensibilidad exacta ∂f/∂x y ∂f/∂y en el punto (x, y).' },
        ],
        stageState: {
          params: { x: 0.7, y: 0.6, w: 1.6 },
          autoDiffPass: 'forward',
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'ad-b3',
        tag: '3 · Míralo en acción',
        headline: 'Regla de la cadena: propagar sensibilidad hacia atrás',
        narration:
          'Observa cómo al subir el peso w y lanzar el pulso inverso (Backward), la flecha de gradiente crece de golpe: cada operación multiplica su derivada local por la que llega desde la salida.',
        durationMs: 14500,
        stageState: {
          params: { x: 0.7, y: 0.6, w: 3.4 },
          autoDiffPass: 'backward',
          focusedLayerId: null,
        },
      },
      {
        id: 'ad-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'Un solo recorrido inverso para todas las variables',
        narration:
          'La maravilla del modo inverso (backpropagation) es que con un único viaje de regreso obtiene la derivada respecto a cada parámetro a la vez.',
        durationMs: 16500,
        formula: {
          latex: '\\frac{\\partial f}{\\partial x} = y + w\\cos(wx)',
          breakdown: [
            { symbol: 'Forward', meaning: 'evalúa x·y, sin(w·x) y 0.4y² y los suma' },
            { symbol: 'Backward', meaning: 'propaga ∂f desde la salida hasta x, y, w' },
            { symbol: 'w', meaning: 'amplifica la pendiente al multiplicar en la regla de la cadena' },
          ],
        },
        realWorldNote: 'Así funciona exactamente loss.backward() en PyTorch, TensorFlow y JAX para entrenar redes con miles de millones de pesos.',
        stageState: {
          params: { x: 0.7, y: 0.6, w: 1.6 },
          autoDiffPass: 'idle',
          focusedLayerId: null,
        },
      },
    ],
  },

  'calc-optimizers': {
    sceneId: 'calc-optimizers',
    lessonNumber: 7,
    moduleName: 'Cálculo Multivariable',
    title: 'Carrera de Optimizadores',
    subtitle: 'Cómo bajan una montaña de error SGD, Momentum y Adam sin quedarse atrapados.',
    beats: [
      {
        id: 'opt-b1',
        tag: '1 · La idea',
        headline: 'Bajar una montaña con niebla mirando solo tus pies',
        narration:
          'Entrenar un modelo es buscar el punto más bajo de una montaña de error. Como no ves el mapa entero, das pasos repetidos en contra de la pendiente: a eso se le llama descenso por gradiente.',
        durationMs: 13500,
        stageState: {
          landscape: 'rosenbrock',
          params: { lr: 0.06, beta: 0.82 },
          startOptimizer: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'opt-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Tres corredores con estrategias distintas',
        narration:
          'En el valle 3D compiten tres esferas al mismo tiempo sobre el mismo terreno de pérdida.',
        durationMs: 15500,
        parts: [
          { label: 'SGD (rojo)', crayon: 'vermilion', meaning: 'Da pasos simples siguiendo solo la pendiente actual; rebota en valles estrechos.' },
          { label: 'Momentum (ocre)', crayon: 'ochre', meaning: 'Acumula velocidad como una bola pesada para no zigzaguear.' },
          { label: 'Adam (verde)', crayon: 'sage', meaning: 'Combina inercia y ajusta automáticamente el tamaño del paso.' },
        ],
        stageState: {
          landscape: 'rosenbrock',
          params: { lr: 0.06, beta: 0.82 },
          startOptimizer: false,
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'opt-b3',
        tag: '3 · Míralo en acción',
        headline: 'Inercia vs. zigzagueo en el cañón de Rosenbrock',
        narration:
          'Mira a los tres optimizadores en movimiento: mientras SGD se frena rebotando entre las paredes del valle, Momentum y Adam conservan el impulso a lo largo del camino y bajan mucho más rápido.',
        durationMs: 14500,
        stageState: {
          landscape: 'rosenbrock',
          params: { lr: 0.07, beta: 0.85 },
          startOptimizer: true,
          focusedLayerId: null,
        },
      },
      {
        id: 'opt-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'El equilibrio clave de la tasa de aprendizaje α',
        narration:
          'Si el paso α es muy pequeño, tardas una eternidad; si es demasiado grande, saltas por encima del mínimo y la pérdida explota.',
        durationMs: 16500,
        formula: {
          latex: 'v_t = \\beta v_{t-1} - \\alpha\\nabla L',
          breakdown: [
            { symbol: 'α', meaning: 'tasa de aprendizaje (tamaño de cada paso)' },
            { symbol: 'β', meaning: 'memoria o inercia que suaviza el recorrido' },
            { symbol: '∇L', meaning: 'pendiente actual de la superficie de error' },
          ],
        },
        realWorldNote: 'Adam es el optimizador estándar detrás de casi todos los modelos modernos de visión y lenguaje porque se adapta bien a terrenos irregulares.',
        stageState: {
          landscape: 'rosenbrock',
          params: { lr: 0.06, beta: 0.82 },
          startOptimizer: false,
          focusedLayerId: null,
        },
      },
    ],
  },

  'calc-symbolic': {
    sceneId: 'calc-symbolic',
    lessonNumber: 8,
    moduleName: 'Cálculo Multivariable',
    title: 'Regresión Simbólica Evolutiva',
    subtitle: 'Descubrir la ecuación secreta detrás de los datos combinando piezas matemáticas.',
    beats: [
      {
        id: 'sym-b1',
        tag: '1 · La idea',
        headline: 'De los datos crudos a la fórmula exacta',
        narration:
          'Muchas veces observamos un fenómeno en la naturaleza pero desconocemos su ecuación. La regresión simbólica busca qué combinación de funciones (ondas, parábolas, campanas) reconstruye la superficie real.',
        durationMs: 13500,
        stageState: {
          params: { wSin: 0.2, wCos: 0.2, wQuad: 0.0, wCross: 0.0, wGauss: 0.3 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'sym-b2',
        tag: '2 · Partes de la gráfica',
        headline: 'Tu hipótesis frente a la superficie oculta',
        narration:
          'Superponemos tu fórmula sobre la superficie objetivo para que puedas ver directamente dónde sobra o falta altura.',
        durationMs: 15500,
        parts: [
          { label: 'Malla gris (objetivo)', crayon: 'pencil', meaning: 'La superficie misteriosa que intentas descubrir.' },
          { label: 'Superficie azul', crayon: 'cobalt', meaning: 'Tu propia ecuación construida moviendo los pesos w₁…w₅.' },
          { label: 'Superficie verde (IA)', crayon: 'sage', meaning: 'La ecuación que un algoritmo evolutivo va mutando en vivo.' },
        ],
        stageState: {
          params: { wSin: 0.45, wCos: 0.35, wQuad: 0.0, wCross: 0.0, wGauss: 0.3 },
          exploded: false,
          focusedLayerId: 'operator',
        },
      },
      {
        id: 'sym-b3',
        tag: '3 · Míralo en acción',
        headline: 'Ajustar piezas hasta reducir el error a casi cero',
        narration:
          'Observa cómo al encajar los pesos correctos, la superficie azul abraza la malla objetivo y el Error Cuadrático Medio (MSE) cae drásticamente. Luego podrás competir contra la IA evolutiva.',
        durationMs: 14500,
        stageState: {
          params: { wSin: 0.8, wCos: 0.5, wQuad: 0.0, wCross: 0.0, wGauss: 0.35 },
          exploded: false,
          focusedLayerId: null,
        },
      },
      {
        id: 'sym-b4',
        tag: '4 · Fórmula y uso real',
        headline: 'Construir modelos interpretables con bloques base',
        narration:
          'Cada deslizador controla el peso de una función base sencilla. Juntas pueden describir relieves muy ricos sin perder claridad matemática.',
        durationMs: 16500,
        formula: {
          latex: '\\hat{f}(x,y) = \\sum_{i=1}^{5} w_i\\,\\psi_i(x,y)',
          breakdown: [
            { symbol: 'ψᵢ(x, y)', meaning: 'bloques base: sen(x), cos(y), x²−y², xy y campana gaussiana' },
            { symbol: 'wᵢ', meaning: 'cuánto aporta cada bloque a la forma final' },
            { symbol: 'MSE', meaning: 'promedio del error al cuadrado entre tu superficie y la real' },
          ],
        },
        realWorldNote: 'La regresión simbólica se emplea en física computacional e ingeniería para redescubrir leyes científicas legibles por humanos a partir de mediciones.',
        stageState: {
          params: { wSin: 0.2, wCos: 0.2, wQuad: 0.0, wCross: 0.0, wGauss: 0.3 },
          exploded: false,
          focusedLayerId: null,
        },
      },
    ],
  },
};
