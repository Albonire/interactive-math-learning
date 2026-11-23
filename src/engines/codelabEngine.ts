import type {
  CodeLabEvaluationResult,
  CodeLabSpec,
  CodeLabTestCaseResult,
  SceneId,
} from '../core/types';
import {
  computeSvd3,
  determinant3,
  mat3FromColumns,
} from '../math/linearAlgebra';
import { evaluateAutoDiffDag, evaluatePartialGradients } from '../math/multivariable';

/**
 * CodeLab Engine v1 specifications across all 8 active lessons:
 * - Idiomatic Rust & Java Parsons blocks (order + critical numerical expression slots)
 * - Stack vs. Heap memory layout breakdown
 * - Deterministic numerical & edge-case test harness (executed inside Web Worker)
 */
export const CODELAB_SPECS: Record<SceneId, CodeLabSpec> = {
  'lin-span': {
    sceneId: 'lin-span',
    title: 'Kernel de Volumen 3D (Producto Mixto)',
    objective: 'Ensambla el cálculo del volumen |v1 · (v2 × v3)| sin asignaciones en heap y detecta el colapso de rango.',
    complexity: 'O(1) tiempo · 36 B en Stack (Rust) / float[9] contiguo (Java)',
    blocks: [
      {
        id: 'span-b1',
        rustCode: 'let cross = cross3(v2, v3);',
        javaCode: 'float[] cross = cross3(v2, v3);',
      },
      {
        id: 'span-b2',
        rustCode: 'let signed_vol = {{slot:vol_expr}};',
        javaCode: 'float signedVol = {{slot:vol_expr}};',
        slotId: 'vol_expr',
      },
      {
        id: 'span-b3',
        rustCode: 'let vol = signed_vol.abs();',
        javaCode: 'float vol = Math.abs(signedVol);',
      },
      {
        id: 'span-b4',
        rustCode: 'let collapsed = vol < 1e-4;',
        javaCode: 'boolean collapsed = vol < 1e-4f;',
      },
    ],
    correctOrder: ['span-b1', 'span-b2', 'span-b3', 'span-b4'],
    slots: [
      {
        id: 'vol_expr',
        prompt: 'Completa el producto escalar que proyecta v1 sobre la normal (v2 × v3):',
        correctOptionId: 'dot',
        options: [
          { id: 'dot', rustCode: 'dot3(v1, cross)', javaCode: 'dot3(v1, cross)', label: 'dot3(v1, cross)' },
          { id: 'sum', rustCode: 'v1[0] + cross[0]', javaCode: 'v1[0] + cross[0]', label: 'v1[0] + cross[0]' },
          { id: 'norm', rustCode: 'norm3(v1) + norm3(cross)', javaCode: 'norm3(v1) + norm3(cross)', label: 'norm3(v1) + norm3(cross)' },
        ],
      },
    ],
    memoryCells: [
      { label: 'v1 [f32;3]', rustDetail: 'Stack · 12 B contiguos', javaDetail: 'Heap float[3] · 28 B con cabecera', bytes: 12, crayon: 'cobalt' },
      { label: 'v2 [f32;3]', rustDetail: 'Stack · 12 B contiguos', javaDetail: 'Heap float[3] · 28 B con cabecera', bytes: 12, crayon: 'vermilion' },
      { label: 'v3 [f32;3]', rustDetail: 'Stack · 12 B contiguos', javaDetail: 'Heap float[3] · 28 B con cabecera', bytes: 12, crayon: 'ochre' },
      { label: 'vol (f32)', rustDetail: 'Registro xmm0 · 4 B', javaDetail: 'Slot primitivo stack · 4 B', bytes: 4, crayon: 'sage' },
    ],
    hint: 'Primero calcula v2 × v3, luego proyecta con dot3(v1, cross), toma el valor absoluto y por último comprueba el umbral de colapso.',
  },

  'lin-svd': {
    sceneId: 'lin-svd',
    title: 'Determinante con Signo y Orientación de Malla',
    objective: 'Ensambla el detector de inversión de orientación (winding flip) y singularidad sobre una matriz 3×3 plana.',
    complexity: 'O(1) tiempo · Cero punteros indirectos (localidad L1)',
    blocks: [
      {
        id: 'svd-b1',
        rustCode: 'let minor_xy = {{slot:det2}};',
        javaCode: 'float minorXy = {{slot:det2}};',
        slotId: 'det2',
      },
      {
        id: 'svd-b2',
        rustCode: 'let det = minor_xy * a33;',
        javaCode: 'float det = minorXy * a33;',
      },
      {
        id: 'svd-b3',
        rustCode: 'let singular = det.abs() < 1e-4;',
        javaCode: 'boolean singular = Math.abs(det) < 1e-4f;',
      },
      {
        id: 'svd-b4',
        rustCode: 'let flipped = det < 0.0;',
        javaCode: 'boolean flipped = det < 0.0f;',
      },
    ],
    correctOrder: ['svd-b1', 'svd-b2', 'svd-b3', 'svd-b4'],
    slots: [
      {
        id: 'det2',
        prompt: 'Selecciona el determinante exacto del bloque 2×2 [[a11, a12], [a21, a22]]:',
        correctOptionId: 'ad_bc',
        options: [
          { id: 'ad_bc', rustCode: 'a11 * a22 - a12 * a21', javaCode: 'a11 * a22 - a12 * a21', label: 'a11*a22 - a12*a21' },
          { id: 'ad_plus_bc', rustCode: 'a11 * a22 + a12 * a21', javaCode: 'a11 * a22 + a12 * a21', label: 'a11*a22 + a12*a21' },
          { id: 'trace', rustCode: 'a11 + a22', javaCode: 'a11 + a22', label: 'a11 + a22 (traza)' },
        ],
      },
    ],
    memoryCells: [
      { label: 'Mat3 [f32;9]', rustDetail: '#[repr(C)] · 36 B contiguos', javaDetail: 'float[9] plano · 52 B total', bytes: 36, crayon: 'cobalt' },
      { label: 'σ [f32;3]', rustDetail: 'Stack · 12 B valores singulares', javaDetail: 'float[3] · 28 B total', bytes: 12, crayon: 'ochre' },
      { label: 'det / flags', rustDetail: 'Registros CPU · 6 B', javaDetail: 'Primitivos locales · 6 B', bytes: 6, crayon: 'vermilion' },
    ],
    hint: 'Calcula primero el menor 2×2 (a11*a22 - a12*a21), multiplica por a33, verifica si es singular y finalmente detecta si det < 0.',
  },

  'lin-eigen': {
    sceneId: 'lin-eigen',
    title: 'Iteración de Potencia para Autovector Dominante',
    objective: 'Ensambla el paso iterativo A·v / ||A·v|| y el cociente de Rayleigh para estimar el autovalor dominante λ₁.',
    complexity: 'O(k·n²) · Sin matrices temporales en heap',
    blocks: [
      {
        id: 'eig-b1',
        rustCode: 'let (av_x, av_y) = (a * vx + b * vy, c * vx + d * vy);',
        javaCode: 'double avX = a * vx + b * vy, avY = c * vx + d * vy;',
      },
      {
        id: 'eig-b2',
        rustCode: 'let norm = av_x.hypot(av_y).max(1e-9);',
        javaCode: 'double norm = Math.max(Math.hypot(avX, avY), 1e-9);',
      },
      {
        id: 'eig-b3',
        rustCode: 'let (nx, ny) = {{slot:norm_step}};',
        javaCode: 'double nx = {{slot:norm_step}}; // idem ny',
        slotId: 'norm_step',
      },
      {
        id: 'eig-b4',
        rustCode: 'let lambda = nx * (a * nx + b * ny) + ny * (c * nx + d * ny);',
        javaCode: 'double lambda = nx * (a * nx + b * ny) + ny * (c * nx + d * ny);',
      },
    ],
    correctOrder: ['eig-b1', 'eig-b2', 'eig-b3', 'eig-b4'],
    slots: [
      {
        id: 'norm_step',
        prompt: 'Normaliza A·v para evitar desbordamiento numérico tras muchas iteraciones:',
        correctOptionId: 'divide',
        options: [
          { id: 'divide', rustCode: '(av_x / norm, av_y / norm)', javaCode: 'avX / norm', label: 'Dividir entre norm' },
          { id: 'multiply', rustCode: '(av_x * norm, av_y * norm)', javaCode: 'avX * norm', label: 'Multiplicar por norm' },
          { id: 'raw', rustCode: '(av_x, av_y)', javaCode: 'avX', label: 'Dejar sin normalizar' },
        ],
      },
    ],
    memoryCells: [
      { label: 'A [[f64;2];2]', rustDetail: 'Stack · 32 B alineados', javaDetail: 'double[4] plano · 48 B', bytes: 32, crayon: 'cobalt' },
      { label: 'v [f64;2]', rustDetail: 'Registros xmm · 16 B', javaDetail: '2 doubles locales · 16 B', bytes: 16, crayon: 'ochre' },
      { label: 'λ (Rayleigh)', rustDetail: 'Registro f64 · 8 B', javaDetail: 'double local · 8 B', bytes: 8, crayon: 'sage' },
    ],
    hint: 'Aplica A·v, calcula su norma segura, divide por la norma para mantener ||v||=1 y evalúa el cociente de Rayleigh vᵀAv.',
  },

  'lin-manifold': {
    sceneId: 'lin-manifold',
    title: 'Capa Neuronal de Levantamiento No Lineal',
    objective: 'Ensambla la transformación in-place que dobla un conjunto de anillos concéntricos para volverlos linealmente separables.',
    complexity: 'O(N) pase contiguo · 0 copias en memoria',
    blocks: [
      {
        id: 'man-b1',
        rustCode: 'let r2 = x * x + z * z;',
        javaCode: 'float r2 = x * x + z * z;',
      },
      {
        id: 'man-b2',
        rustCode: 'let pre = weight * r2 + bias;',
        javaCode: 'float pre = weight * r2 + bias;',
      },
      {
        id: 'man-b3',
        rustCode: 'let lifted_y = fold * {{slot:act_fn}};',
        javaCode: 'float liftedY = fold * {{slot:act_fn}};',
        slotId: 'act_fn',
      },
      {
        id: 'man-b4',
        rustCode: 'let class_a = lifted_y < plane_y;',
        javaCode: 'boolean classA = liftedY < planeY;',
      },
    ],
    correctOrder: ['man-b1', 'man-b2', 'man-b3', 'man-b4'],
    slots: [
      {
        id: 'act_fn',
        prompt: 'Elige la activación no lineal acotada que dobla el espacio suavemente:',
        correctOptionId: 'tanh',
        options: [
          { id: 'tanh', rustCode: 'pre.tanh()', javaCode: '(float) Math.tanh(pre)', label: 'tanh(pre)' },
          { id: 'zero', rustCode: '0.0', javaCode: '0.0f', label: '0.0 (colapsa la altura)' },
          { id: 'linear', rustCode: 'pre * 0.0 + 1.0', javaCode: '1.0f', label: 'Constante 1.0' },
        ],
      },
    ],
    memoryCells: [
      { label: 'points [f32;3]×96', rustDetail: 'Vec<[f32;3]> · 1,152 B', javaDetail: 'float[288] SoA/AoS · 1,168 B', bytes: 1152, crayon: 'plum' },
      { label: 'W, b, γ', rustDetail: '3 × f32 en registros · 12 B', javaDetail: '3 floats primitivos · 12 B', bytes: 12, crayon: 'cobalt' },
      { label: 'plane_y', rustDetail: 'Umbral escalar · 4 B', javaDetail: 'float local · 4 B', bytes: 4, crayon: 'sage' },
    ],
    hint: 'Evalúa primero la distancia radial r², proyecta weight*r² + bias, aplica tanh(pre) escalado por fold y clasifica contra plane_y.',
  },

  'calc-partials': {
    sceneId: 'calc-partials',
    title: 'Normal de Superficie desde Derivadas Parciales',
    objective: 'Ensambla el cálculo exacto del vector normal unitario de z = f(x, y) usado en iluminación 3D y planos tangentes.',
    complexity: 'O(1) · 3 registros f64 (24 bytes)',
    blocks: [
      {
        id: 'par-b1',
        rustCode: 'let (nx, ny, nz) = {{slot:normal_vec}};',
        javaCode: 'double nx = {{slot:normal_vec}}; // (-fx, 1, -fy)',
        slotId: 'normal_vec',
      },
      {
        id: 'par-b2',
        rustCode: 'let len = (nx * nx + ny * ny + nz * nz).sqrt();',
        javaCode: 'double len = Math.sqrt(nx * nx + ny * ny + nz * nz);',
      },
      {
        id: 'par-b3',
        rustCode: 'let unit_n = [nx / len, ny / len, nz / len];',
        javaCode: 'double[] unitN = { nx / len, ny / len, nz / len };',
      },
      {
        id: 'par-b4',
        rustCode: 'let z_tan = z0 + fx * dx + fy * dy;',
        javaCode: 'double zTan = z0 + fx * dx + fy * dy;',
      },
    ],
    correctOrder: ['par-b1', 'par-b2', 'par-b3', 'par-b4'],
    slots: [
      {
        id: 'normal_vec',
        prompt: 'Vector normal perpendicular a las tangentes (1, fx, 0) y (0, fy, 1):',
        correctOptionId: 'neg_grad',
        options: [
          { id: 'neg_grad', rustCode: '(-fx, 1.0, -fy)', javaCode: '-fx', label: '(-fx, 1.0, -fy)' },
          { id: 'pos_grad', rustCode: '(fx, 0.0, fy)', javaCode: 'fx', label: '(fx, 0.0, fy) [horizontal]' },
          { id: 'flat', rustCode: '(0.0, 1.0, 0.0)', javaCode: '0.0', label: '(0, 1, 0) [ignora pendiente]' },
        ],
      },
    ],
    memoryCells: [
      { label: 'PartialJet (z,fx,fy)', rustDetail: 'Tuple (f64, f64, f64) · 24 B', javaDetail: 'record PartialJet · 40 B', bytes: 24, crayon: 'vermilion' },
      { label: 'unit_n [f64;3]', rustDetail: 'Stack · 24 B', javaDetail: 'double[3] · 40 B', bytes: 24, crayon: 'sage' },
    ],
    hint: 'La normal ascendente de z = f(x, y) apunta en (-fx, 1, -fy); normalízala dividiendo entre su longitud antes de usarla.',
  },

  'calc-autodiff': {
    sceneId: 'calc-autodiff',
    title: 'Cinta Reversa de AutoDiff (Backpropagation)',
    objective: 'Ensambla el recorrido inverso sobre la cinta del DAG para calcular ∂f/∂x y ∂f/∂y de forma exacta.',
    complexity: 'O(V + E) · Una sola pasada inversa sin derivación numérica',
    blocks: [
      {
        id: 'ad-b1',
        rustCode: 'let (u1, u2) = (x * y, (w * x).sin());',
        javaCode: 'double u1 = x * y, u2 = Math.sin(w * x);',
      },
      {
        id: 'ad-b2',
        rustCode: 'let grad_out = 1.0;',
        javaCode: 'double gradOut = 1.0;',
      },
      {
        id: 'ad-b3',
        rustCode: 'let grad_x = grad_out * ({{slot:chain_x}});',
        javaCode: 'double gradX = gradOut * ({{slot:chain_x}});',
        slotId: 'chain_x',
      },
      {
        id: 'ad-b4',
        rustCode: 'let grad_y = grad_out * (x + 0.8 * y);',
        javaCode: 'double gradY = gradOut * (x + 0.8 * y);',
      },
    ],
    correctOrder: ['ad-b1', 'ad-b2', 'ad-b3', 'ad-b4'],
    slots: [
      {
        id: 'chain_x',
        prompt: 'Acumula ambas ramas del DAG que dependen de x en f = x·y + sin(w·x) + 0.4y²:',
        correctOptionId: 'both_branches',
        options: [
          { id: 'both_branches', rustCode: 'y + w * (w * x).cos()', javaCode: 'y + w * Math.cos(w * x)', label: 'y + w * cos(w*x)' },
          { id: 'only_sin', rustCode: 'w * (w * x).cos()', javaCode: 'w * Math.cos(w * x)', label: 'w * cos(w*x) [falta rama x·y]' },
          { id: 'no_chain', rustCode: 'y + (w * x).cos()', javaCode: 'y + Math.cos(w * x)', label: 'y + cos(w*x) [falta factor w]' },
        ],
      },
    ],
    memoryCells: [
      { label: 'TapeNode[] (8 nodos)', rustDetail: 'Vec<TapeNode> arena · 192 B', javaDetail: 'double[] val + grad · 160 B', bytes: 192, crayon: 'sage' },
      { label: 'grad_x, grad_y', rustDetail: 'Registros f64 · 16 B', javaDetail: '2 doubles locales · 16 B', bytes: 16, crayon: 'vermilion' },
    ],
    hint: 'Evalúa primero las activaciones forward, inicializa grad_out = 1.0 y suma las derivadas locales de ambas ramas que salen de x.',
  },

  'calc-optimizers': {
    sceneId: 'calc-optimizers',
    title: 'Paso Estabilizado del Optimizador Adam',
    objective: 'Ensambla la actualización de momentos m, v y el denominador seguro con ε para evitar divisiones por cero.',
    complexity: 'O(P) tiempo · 3× memoria de parámetros (θ, m, v)',
    blocks: [
      {
        id: 'opt-b1',
        rustCode: 'm = beta1 * m + (1.0 - beta1) * g;',
        javaCode: 'm = beta1 * m + (1.0f - beta1) * g;',
      },
      {
        id: 'opt-b2',
        rustCode: 'v = beta2 * v + (1.0 - beta2) * g * g;',
        javaCode: 'v = beta2 * v + (1.0f - beta2) * g * g;',
      },
      {
        id: 'opt-b3',
        rustCode: 'let step = lr * {{slot:adam_ratio}};',
        javaCode: 'float step = lr * {{slot:adam_ratio}};',
        slotId: 'adam_ratio',
      },
      {
        id: 'opt-b4',
        rustCode: 'theta -= step;',
        javaCode: 'theta -= step;',
      },
    ],
    correctOrder: ['opt-b1', 'opt-b2', 'opt-b3', 'opt-b4'],
    slots: [
      {
        id: 'adam_ratio',
        prompt: 'Selecciona el cociente adaptativo protegido contra v = 0:',
        correctOptionId: 'safe_sqrt',
        options: [
          { id: 'safe_sqrt', rustCode: 'm / (v.sqrt() + 1e-8)', javaCode: 'm / ((float) Math.sqrt(v) + 1e-8f)', label: 'm / (sqrt(v) + 1e-8)' },
          { id: 'no_eps', rustCode: 'm / v.sqrt()', javaCode: 'm / (float) Math.sqrt(v)', label: 'm / sqrt(v) [NaN si g=0]' },
          { id: 'wrong_sign', rustCode: '-m / (v.sqrt() + 1e-8)', javaCode: '-m / ((float) Math.sqrt(v) + 1e-8f)', label: '-m / (sqrt(v)+1e-8) [asciende]' },
        ],
      },
    ],
    memoryCells: [
      { label: 'theta [f32;P]', rustDetail: 'Buffer de pesos · 4P B', javaDetail: 'float[] theta · 4P B', bytes: 4, crayon: 'cobalt' },
      { label: 'm [f32;P]', rustDetail: '1.er momento · 4P B', javaDetail: 'float[] m · 4P B', bytes: 4, crayon: 'ochre' },
      { label: 'v [f32;P]', rustDetail: '2.º momento · 4P B', javaDetail: 'float[] v · 4P B', bytes: 4, crayon: 'sage' },
    ],
    hint: 'Actualiza m y v antes de calcular el paso adaptativo m / (sqrt(v) + 1e-8), y luego resta step a theta.',
  },

  'calc-symbolic': {
    sceneId: 'calc-symbolic',
    title: 'Evaluador de Fitness MSE en Hilo Paralelo',
    objective: 'Ensambla el bucle de evaluación MSE que corre dentro del Web Worker sin bloquear el render a 60 FPS.',
    complexity: 'O(N²) por candidato · 2.5 KB buffer plano transferible',
    blocks: [
      {
        id: 'sym-b1',
        rustCode: 'let mut sum_sq = 0.0_f64;',
        javaCode: 'double sumSq = 0.0;',
      },
      {
        id: 'sym-b2',
        rustCode: 'let err = pred[i] - target[i];',
        javaCode: 'double err = pred[i] - target[i];',
      },
      {
        id: 'sym-b3',
        rustCode: 'sum_sq += {{slot:sq_err}};',
        javaCode: 'sumSq += {{slot:sq_err}};',
        slotId: 'sq_err',
      },
      {
        id: 'sym-b4',
        rustCode: 'let mse = sum_sq / (n as f64);',
        javaCode: 'double mse = sumSq / n;',
      },
    ],
    correctOrder: ['sym-b1', 'sym-b2', 'sym-b3', 'sym-b4'],
    slots: [
      {
        id: 'sq_err',
        prompt: 'Acumula el error cuadrático para penalizar desviaciones grandes sin cancelar signos:',
        correctOptionId: 'square',
        options: [
          { id: 'square', rustCode: 'err * err', javaCode: 'err * err', label: 'err * err' },
          { id: 'raw_err', rustCode: 'err', javaCode: 'err', label: 'err (errores + y - se cancelan)' },
          { id: 'cube', rustCode: 'err * err * err', javaCode: 'err * err * err', label: 'err³ (puede ser negativo)' },
        ],
      },
    ],
    memoryCells: [
      { label: 'grid [f32;625]', rustDetail: 'Box<[f32;625]> move · 2.5 KB', javaDetail: 'float[625] plano · 2.5 KB', bytes: 2500, crayon: 'sage' },
      { label: 'DNA [f32;5]', rustDetail: '5 pesos en Stack · 20 B', javaDetail: 'float[5] · 36 B', bytes: 20, crayon: 'cobalt' },
    ],
    hint: 'Inicializa el acumulador en 0, calcula err = pred - target, suma err * err y divide al final entre n.',
  },
};

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, idx) => v === b[idx]);
}

function runSceneNumericTests(
  sceneId: SceneId,
  orderCorrect: boolean,
  slotChoices: Record<string, string>
): CodeLabTestCaseResult[] {
  switch (sceneId) {
    case 'lin-span': {
      const expr = slotChoices.vol_expr ?? 'dot';
      const evalVol = (v1: [number, number, number], v2: [number, number, number], v3: [number, number, number]) => {
        if (!orderCorrect) return NaN;
        const cx = v2[1] * v3[2] - v2[2] * v3[1];
        const cy = v2[2] * v3[0] - v2[0] * v3[2];
        const cz = v2[0] * v3[1] - v2[1] * v3[0];
        if (expr === 'dot') return Math.abs(v1[0] * cx + v1[1] * cy + v1[2] * cz);
        if (expr === 'sum') return Math.abs(v1[0] + cx);
        return Math.hypot(...v1) + Math.hypot(cx, cy, cz);
      };

      const vA = evalVol([2, 0, 0], [0, 3, 0], [0, 0, 1.5]);
      const vB = evalVol([1, 0, 0], [0, 1, 0], [2, 3, 0]);
      const expectedRef = Math.abs(determinant3(mat3FromColumns([1.2, 0.2, 0.1], [0.2, 0.3, 1.1], [0.4, 1.0, 0.35])));
      const vC = evalVol([1.2, 0.2, 0.1], [0.2, 0.3, 1.1], [0.4, 1.0, 0.35]);

      return [
        {
          id: 't1',
          name: 'Base ortogonal (2, 3, 1.5)',
          passed: Number.isFinite(vA) && Math.abs(vA - 9.0) < 1e-3,
          expected: '9.000',
          actual: Number.isFinite(vA) ? vA.toFixed(3) : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Caso borde: vectores coplanares (rango 2)',
          edgeCase: true,
          passed: Number.isFinite(vB) && Math.abs(vB) < 1e-4,
          expected: '0.000 (colapso)',
          actual: Number.isFinite(vB) ? vB.toFixed(3) : 'Error de orden',
        },
        {
          id: 't3',
          name: 'Escena actual (vectores inclinados)',
          passed: Number.isFinite(vC) && Math.abs(vC - expectedRef) < 1e-3,
          expected: expectedRef.toFixed(3),
          actual: Number.isFinite(vC) ? vC.toFixed(3) : 'Error de orden',
        },
      ];
    }

    case 'lin-svd': {
      const expr = slotChoices.det2 ?? 'ad_bc';
      const evalDet = (a11: number, a12: number, a21: number, a22: number, a33: number) => {
        if (!orderCorrect) return NaN;
        const m = expr === 'ad_bc' ? a11 * a22 - a12 * a21 : expr === 'ad_plus_bc' ? a11 * a22 + a12 * a21 : a11 + a22;
        return m * a33;
      };
      const d1 = evalDet(2, 0.5, 0.2, 1.5, 1.0);
      const d2 = evalDet(1, 2, 2, 1, 1);
      const d3 = evalDet(1, 2, 0.5, 1, 1.5);
      const svdProd = computeSvd3([2, 0.5, 0, 0.2, 1.5, 0, 0, 0, 1]).S.reduce((a, b) => a * b, 1);

      return [
        {
          id: 't1',
          name: 'Volumen = σ₁·σ₂·σ₃ (orientación positiva)',
          passed: Number.isFinite(d1) && Math.abs(d1 - svdProd) < 1e-2,
          expected: svdProd.toFixed(3),
          actual: Number.isFinite(d1) ? d1.toFixed(3) : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Caso borde: inversión de orientación (det < 0)',
          edgeCase: true,
          passed: Number.isFinite(d2) && Math.abs(d2 - -3.0) < 1e-3,
          expected: '-3.000 (flip)',
          actual: Number.isFinite(d2) ? d2.toFixed(3) : 'Error de orden',
        },
        {
          id: 't3',
          name: 'Caso borde: matriz singular (det = 0)',
          edgeCase: true,
          passed: Number.isFinite(d3) && Math.abs(d3) < 1e-4,
          expected: '0.000 (singular)',
          actual: Number.isFinite(d3) ? d3.toFixed(3) : 'Error de orden',
        },
      ];
    }

    case 'lin-eigen': {
      const mode = slotChoices.norm_step ?? 'divide';
      const iterate = (a: number, b: number, c: number, d: number, steps: number) => {
        if (!orderCorrect) return { norm: NaN, lambda: NaN };
        let vx = 1;
        let vy = 0;
        for (let i = 0; i < steps; i++) {
          const avx = a * vx + b * vy;
          const avy = c * vx + d * vy;
          const n = Math.max(Math.hypot(avx, avy), 1e-9);
          if (mode === 'divide') {
            vx = avx / n;
            vy = avy / n;
          } else if (mode === 'multiply') {
            vx = avx * n;
            vy = avy * n;
          } else {
            vx = avx;
            vy = avy;
          }
        }
        const lambda = vx * (a * vx + b * vy) + vy * (c * vx + d * vy);
        return { norm: Math.hypot(vx, vy), lambda };
      };

      const r1 = iterate(2, 0, 0, 1, 18);
      const r2 = iterate(1.5, 0.5, 0.3, 0.9, 25);
      const r3 = iterate(3, 0, 0, 0.5, 30);

      return [
        {
          id: 't1',
          name: 'Matriz diagonal diag(2, 1) converge a λ₁ = 2',
          passed: Number.isFinite(r1.lambda) && Math.abs(r1.lambda - 2.0) < 1e-2,
          expected: 'λ₁ = 2.000',
          actual: Number.isFinite(r1.lambda) ? `λ₁ = ${r1.lambda.toFixed(3)}` : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Estabilidad numérica tras 30 pasos (||v|| = 1)',
          edgeCase: true,
          passed: Number.isFinite(r3.norm) && Math.abs(r3.norm - 1.0) < 1e-3,
          expected: '||v|| = 1.000',
          actual: Number.isFinite(r3.norm) ? `||v|| = ${r3.norm.toExponential(2)}` : 'Overflow / orden',
        },
        {
          id: 't3',
          name: 'Matriz de la escena [[1.5,0.5],[0.3,0.9]]',
          passed: Number.isFinite(r2.lambda) && Math.abs(r2.lambda - 1.6899) < 0.03,
          expected: 'λ₁ ≈ 1.690',
          actual: Number.isFinite(r2.lambda) ? `λ₁ = ${r2.lambda.toFixed(3)}` : 'Error de orden',
        },
      ];
    }

    case 'lin-manifold': {
      const act = slotChoices.act_fn ?? 'tanh';
      const lift = (r2: number) => {
        if (!orderCorrect) return NaN;
        const pre = 1.4 * r2 - 1.0;
        const phi = act === 'tanh' ? Math.tanh(pre) : act === 'zero' ? 0 : 1;
        return 1.2 * phi;
      };
      const inner = lift(0.25);
      const outer = lift(1.69);
      const sep = outer - inner;

      return [
        {
          id: 't1',
          name: 'Anillo interior levantado por debajo del plano',
          passed: Number.isFinite(inner) && inner < 0,
          expected: '< 0.000',
          actual: Number.isFinite(inner) ? inner.toFixed(3) : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Anillo exterior levantado por encima del plano',
          passed: Number.isFinite(outer) && outer > 0.5,
          expected: '> 0.500',
          actual: Number.isFinite(outer) ? outer.toFixed(3) : 'Error de orden',
        },
        {
          id: 't3',
          name: 'Caso borde: brecha de separación no lineal Δy > 1.0',
          edgeCase: true,
          passed: Number.isFinite(sep) && sep > 1.0,
          expected: 'Δy > 1.000',
          actual: Number.isFinite(sep) ? `Δy = ${sep.toFixed(3)}` : 'Error de orden',
        },
      ];
    }

    case 'calc-partials': {
      const vec = slotChoices.normal_vec ?? 'neg_grad';
      const evalNormal = (fx: number, fy: number) => {
        if (!orderCorrect) return null;
        const [nx, ny, nz] =
          vec === 'neg_grad' ? [-fx, 1, -fy] : vec === 'pos_grad' ? [fx, 0, fy] : [0, 1, 0];
        const len = Math.hypot(nx, ny, nz);
        if (len < 1e-9) return null;
        return [nx / len, ny / len, nz / len] as const;
      };

      const { fx, fy } = evaluatePartialGradients(0.6, 0.4, 1.0, 0.85);
      const nScene = evalNormal(fx, fy);
      const orthoCheck = nScene ? Math.abs(nScene[0] * 1 + nScene[1] * fx) + Math.abs(nScene[2] * 1 + nScene[1] * fy) : NaN;
      const nFlat = evalNormal(0, 0);

      return [
        {
          id: 't1',
          name: 'Ortogonalidad con las tangentes tx y tz (n·t = 0)',
          passed: Number.isFinite(orthoCheck) && orthoCheck < 1e-3,
          expected: '|n·tx| + |n·tz| = 0.000',
          actual: Number.isFinite(orthoCheck) ? orthoCheck.toFixed(4) : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Vector normal unitario (||n|| = 1)',
          passed: Boolean(nScene && Math.abs(Math.hypot(...nScene) - 1) < 1e-4),
          expected: '1.000',
          actual: nScene ? Math.hypot(...nScene).toFixed(4) : 'Error de orden',
        },
        {
          id: 't3',
          name: 'Caso borde: punto crítico plano (fx=0, fy=0)',
          edgeCase: true,
          passed: Boolean(nFlat && Math.abs(nFlat[1] - 1) < 1e-4),
          expected: '[0, 1, 0]',
          actual: nFlat ? `[${nFlat.map((v) => v.toFixed(2)).join(', ')}]` : 'División por 0',
        },
      ];
    }

    case 'calc-autodiff': {
      const expr = slotChoices.chain_x ?? 'both_branches';
      const evalGradX = (x: number, y: number, w: number) => {
        if (!orderCorrect) return NaN;
        if (expr === 'both_branches') return y + w * Math.cos(w * x);
        if (expr === 'only_sin') return w * Math.cos(w * x);
        return y + Math.cos(w * x);
      };

      const ref1 = evaluateAutoDiffDag(0.7, 0.6, 1.6);
      const g1 = evalGradX(0.7, 0.6, 1.6);
      const ref2 = evaluateAutoDiffDag(0.0, 2.0, 3.0);
      const g2 = evalGradX(0.0, 2.0, 3.0);
      const ref3 = evaluateAutoDiffDag(1.2, -1.5, 0.5);
      const g3 = evalGradX(1.2, -1.5, 0.5);

      return [
        {
          id: 't1',
          name: 'Escena por defecto (x=0.7, y=0.6, w=1.6)',
          passed: Number.isFinite(g1) && Math.abs(g1 - ref1.gradX) < 1e-3,
          expected: ref1.gradX.toFixed(4),
          actual: Number.isFinite(g1) ? g1.toFixed(4) : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Caso borde: x=0 donde cos(wx)=1 (prueba factor w)',
          edgeCase: true,
          passed: Number.isFinite(g2) && Math.abs(g2 - ref2.gradX) < 1e-3,
          expected: ref2.gradX.toFixed(4),
          actual: Number.isFinite(g2) ? g2.toFixed(4) : 'Error de orden',
        },
        {
          id: 't3',
          name: 'Rama y negativa (prueba suma de ambas rutas)',
          passed: Number.isFinite(g3) && Math.abs(g3 - ref3.gradX) < 1e-3,
          expected: ref3.gradX.toFixed(4),
          actual: Number.isFinite(g3) ? g3.toFixed(4) : 'Error de orden',
        },
      ];
    }

    case 'calc-optimizers': {
      const ratio = slotChoices.adam_ratio ?? 'safe_sqrt';
      const stepAdam = (theta: number, g: number, lr: number) => {
        if (!orderCorrect) return NaN;
        const m = 0.2 * g;
        const v = 0.001 * g * g;
        let delta: number;
        if (ratio === 'safe_sqrt') delta = (lr * m) / (Math.sqrt(v) + 1e-8);
        else if (ratio === 'no_eps') delta = (lr * m) / Math.sqrt(v);
        else delta = (-lr * m) / (Math.sqrt(v) + 1e-8);
        return theta - delta;
      };

      const s1 = stepAdam(1.0, 2.0, 0.1);
      const s2 = stepAdam(1.0, 0.0, 0.1);
      const s3 = stepAdam(-1.0, -2.0, 0.1);

      return [
        {
          id: 't1',
          name: 'Desciende cuando g > 0 (θ₁ < θ₀)',
          passed: Number.isFinite(s1) && s1 < 1.0 && Math.abs(s1 - (1 - 0.1 * (0.4 / (Math.sqrt(0.004) + 1e-8)))) < 1e-3,
          expected: (1 - 0.1 * (0.4 / (Math.sqrt(0.004) + 1e-8))).toFixed(4),
          actual: Number.isFinite(s1) ? s1.toFixed(4) : 'NaN / orden',
        },
        {
          id: 't2',
          name: 'Caso borde: gradiente cero g = 0 (sin NaN)',
          edgeCase: true,
          passed: Number.isFinite(s2) && Math.abs(s2 - 1.0) < 1e-6,
          expected: '1.0000 (estable)',
          actual: Number.isFinite(s2) ? s2.toFixed(4) : 'NaN (división por 0)',
        },
        {
          id: 't3',
          name: 'Dirección correcta con gradiente negativo (θ₁ > θ₀)',
          passed: Number.isFinite(s3) && s3 > -1.0,
          expected: '> -1.0000',
          actual: Number.isFinite(s3) ? s3.toFixed(4) : 'NaN / orden',
        },
      ];
    }

    case 'calc-symbolic': {
      const sq = slotChoices.sq_err ?? 'square';
      const evalMse = (pred: number[], target: number[]) => {
        if (!orderCorrect) return NaN;
        let sum = 0;
        for (let i = 0; i < pred.length; i++) {
          const e = pred[i] - target[i];
          sum += sq === 'square' ? e * e : sq === 'raw_err' ? e : e * e * e;
        }
        return sum / pred.length;
      };

      const m1 = evalMse([1, 2, 3], [1, 2, 3]);
      const m2 = evalMse([2, 0], [1, 1]);
      const m3 = evalMse([0, 0], [2, 1]);

      return [
        {
          id: 't1',
          name: 'Ajuste exacto produce MSE = 0',
          passed: Number.isFinite(m1) && Math.abs(m1) < 1e-6,
          expected: '0.0000',
          actual: Number.isFinite(m1) ? m1.toFixed(4) : 'Error de orden',
        },
        {
          id: 't2',
          name: 'Caso borde: residuos opuestos (+1 y -1) no se cancelan',
          edgeCase: true,
          passed: Number.isFinite(m2) && Math.abs(m2 - 1.0) < 1e-4,
          expected: '1.0000',
          actual: Number.isFinite(m2) ? m2.toFixed(4) : 'Error de orden',
        },
        {
          id: 't3',
          name: 'Residuos negativos (-2, -1) producen MSE positivo (2.5)',
          edgeCase: true,
          passed: Number.isFinite(m3) && Math.abs(m3 - 2.5) < 1e-4,
          expected: '2.5000',
          actual: Number.isFinite(m3) ? m3.toFixed(4) : 'Error de orden',
        },
      ];
    }
  }
}

export function evaluateCodeLabSubmission(
  sceneId: SceneId,
  submittedOrder: string[],
  slotChoices: Record<string, string>
): CodeLabEvaluationResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const spec = CODELAB_SPECS[sceneId];
  const orderCorrect = arraysEqual(submittedOrder, spec.correctOrder);
  const slotsCorrect = spec.slots.every(
    (slot) => slotChoices[slot.id] === slot.correctOptionId
  );

  const tests = runSceneNumericTests(sceneId, orderCorrect, slotChoices);
  const passedCount = tests.filter((t) => t.passed).length;
  const passedAll = orderCorrect && slotsCorrect && passedCount === tests.length;
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();

  let summary: string;
  if (passedAll) {
    summary = `¡Todas las pruebas (${passedCount}/${tests.length}) pasaron en el Worker, incluyendo casos borde!`;
  } else if (!orderCorrect) {
    summary = `Orden de ejecución incorrecto: ${passedCount}/${tests.length} pruebas pasaron. Revisa el flujo de datos antes de calcular el resultado.`;
  } else {
    summary = `Orden correcto, pero ${tests.length - passedCount} prueba(s) fallaron por la expresión seleccionada en el hueco.`;
  }

  return {
    passedAll,
    orderCorrect,
    slotsCorrect,
    tests,
    summary,
    executionMs: Math.max(0.1, Number((t1 - t0).toFixed(2))),
  };
}
