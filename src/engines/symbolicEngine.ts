import type { SceneId, SymbolicExerciseSpec } from '../core/types';

export interface SymbolicEvalResult {
  ok: true;
  value: number;
}

export interface SymbolicEvalError {
  ok: false;
  error: string;
}

export interface SymbolicEquivalenceResult {
  equivalent: boolean;
  parseError?: string;
  counterexample?: {
    inputs: Record<string, number>;
    expected: number;
    actual: number;
  };
  feedback: string;
}

export interface DerivationCheckResult {
  orderCorrect: boolean;
  firstMismatchIndex: number | null;
  matchedCount: number;
  totalCount: number;
  feedback: string;
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: '+' | '-' | '*' | '/' | '^' }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'comma' };

const ALLOWED_FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  abs: (x) => Math.abs(x),
  sqrt: (x) => Math.sqrt(Math.max(0, x)),
  exp: (x) => Math.exp(x),
  tanh: (x) => Math.tanh(x),
  max: (a, b) => Math.max(a, b),
  min: (a, b) => Math.min(a, b),
};

function tokenizeExpression(input: string): Token[] | { error: string } {
  const s = input.trim();
  if (!s) return { error: 'Escribe una expresión matemática para comprobarla.' };

  const tokens: Token[] = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      let dots = 0;
      while (j < s.length && /[0-9.]/.test(s[j])) {
        if (s[j] === '.') dots++;
        j++;
      }
      if (dots > 1) return { error: `Número inválido cerca de "${s.slice(i, j)}".` };
      const val = Number(s.slice(i, j));
      if (!Number.isFinite(val)) return { error: `Número fuera de rango: "${s.slice(i, j)}".` };
      tokens.push({ kind: 'num', value: val });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j++;
      tokens.push({ kind: 'ident', name: s.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      tokens.push({ kind: 'op', op: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma' });
      i++;
      continue;
    }

    return { error: `Símbolo no reconocido "${ch}". Usa operadores + - * / ^ y paréntesis.` };
  }

  return tokens;
}

/**
 * Pure, safe recursive-descent mathematical expression evaluator (zero eval/Function).
 * Supports +, -, *, /, ^, unary +/-, parentheses, variables, and standard functions.
 */
export function evaluateSymbolicExpression(
  expression: string,
  env: Record<string, number>
): SymbolicEvalResult | SymbolicEvalError {
  const tokenized = tokenizeExpression(expression);
  if ('error' in tokenized) {
    return { ok: false, error: tokenized.error };
  }
  const tokens = tokenized;
  let pos = 0;

  const peek = (): Token | undefined => tokens[pos];
  const consume = (): Token => tokens[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (true) {
      const t = peek();
      if (t?.kind === 'op' && (t.op === '+' || t.op === '-')) {
        consume();
        const right = parseTerm();
        left = t.op === '+' ? left + right : left - right;
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseUnary();
    while (true) {
      const t = peek();
      if (t?.kind === 'op' && (t.op === '*' || t.op === '/')) {
        consume();
        const right = parseUnary();
        if (t.op === '/') {
          if (Math.abs(right) < 1e-12) {
            throw new Error('División por cero detectada al evaluar la expresión.');
          }
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary(): number {
    const t = peek();
    if (t?.kind === 'op' && t.op === '-') {
      consume();
      return -parseUnary();
    }
    if (t?.kind === 'op' && t.op === '+') {
      consume();
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): number {
    let base = parsePrimary();
    const t = peek();
    if (t?.kind === 'op' && t.op === '^') {
      consume();
      const exp = parseUnary();
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new Error('Expresión incompleta.');

    if (t.kind === 'num') {
      consume();
      return t.value;
    }

    if (t.kind === 'ident') {
      consume();
      const next = peek();
      if (next?.kind === 'lparen') {
        const fn = ALLOWED_FUNCTIONS[t.name];
        if (!fn) throw new Error(`Función desconocida "${t.name}".`);
        consume();
        const args: number[] = [];
        if (peek()?.kind !== 'rparen') {
          args.push(parseExpression());
          while (peek()?.kind === 'comma') {
            consume();
            args.push(parseExpression());
          }
        }
        if (peek()?.kind !== 'rparen') {
          throw new Error(`Falta ")" al cerrar ${t.name}(...).`);
        }
        consume();
        return fn(...args);
      }
      if (t.name in env) {
        return env[t.name];
      }
      throw new Error(`Variable desconocida "${t.name}". Variables válidas: ${Object.keys(env).join(', ')}.`);
    }

    if (t.kind === 'lparen') {
      consume();
      const val = parseExpression();
      if (peek()?.kind !== 'rparen') {
        throw new Error('Paréntesis sin cerrar.');
      }
      consume();
      return val;
    }

    throw new Error('Sintaxis matemática inesperada.');
  }

  try {
    const value = parseExpression();
    if (pos < tokens.length) {
      return { ok: false, error: 'Sobran símbolos al final de la expresión (¿olvidaste un operador *?).' };
    }
    if (!Number.isFinite(value)) {
      return { ok: false, error: 'La expresión produce un valor no finito (NaN o ∞).' };
    }
    return { ok: true, value };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de sintaxis matemática.',
    };
  }
}

/**
 * Checks whether a student's symbolic expression is algebraically equivalent to the target
 * across deterministic sample inputs, returning a concrete numeric counterexample on mismatch.
 */
export function checkSymbolicEquivalence(
  userExpression: string,
  targetExpression: string,
  sampleInputs: Array<Record<string, number>>,
  tolerance = 1e-3
): SymbolicEquivalenceResult {
  for (const inputs of sampleInputs) {
    const expectedRes = evaluateSymbolicExpression(targetExpression, inputs);
    if (!expectedRes.ok) {
      return {
        equivalent: false,
        parseError: 'Error interno en la fórmula de referencia.',
        feedback: 'No se pudo evaluar la referencia.',
      };
    }

    const userRes = evaluateSymbolicExpression(userExpression, inputs);
    if (!userRes.ok) {
      return {
        equivalent: false,
        parseError: userRes.error,
        feedback: userRes.error,
      };
    }

    const diff = Math.abs(userRes.value - expectedRes.value);
    if (diff > tolerance * Math.max(1, Math.abs(expectedRes.value))) {
      const pairs = Object.entries(inputs)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      return {
        equivalent: false,
        counterexample: {
          inputs,
          expected: Number(expectedRes.value.toFixed(4)),
          actual: Number(userRes.value.toFixed(4)),
        },
        feedback: `Contraejemplo en (${pairs}): tu expresión da ${userRes.value.toFixed(3)}, pero la forma equivalente produce ${expectedRes.value.toFixed(3)}.`,
      };
    }
  }

  return {
    equivalent: true,
    feedback: '¡Equivalencia verificada! Tu fórmula coincide en todos los puntos de prueba.',
  };
}

export function checkDerivationOrder(
  submittedOrder: string[],
  correctOrder: string[]
): DerivationCheckResult {
  let matchedCount = 0;
  let firstMismatchIndex: number | null = null;

  for (let i = 0; i < correctOrder.length; i++) {
    if (submittedOrder[i] === correctOrder[i]) {
      matchedCount++;
    } else if (firstMismatchIndex === null) {
      firstMismatchIndex = i;
    }
  }

  const orderCorrect =
    submittedOrder.length === correctOrder.length && firstMismatchIndex === null;

  return {
    orderCorrect,
    firstMismatchIndex,
    matchedCount,
    totalCount: correctOrder.length,
    feedback: orderCorrect
      ? '¡Derivación ordenada con precisión lógica de principio a fin!'
      : `Paso ${firstMismatchIndex! + 1} fuera de orden (${matchedCount}/${correctOrder.length} en su sitio). Revisa qué identidad precede a la siguiente.`,
  };
}

/**
 * Deterministic initial shuffle for Parsons/derivation cards (never starts already solved).
 */
export function buildInitialShuffledOrder(correctOrder: string[], seed = 7): string[] {
  if (correctOrder.length <= 1) return [...correctOrder];
  const arr = [...correctOrder];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  if (arr.every((id, idx) => id === correctOrder[idx])) {
    const first = arr[0];
    arr[0] = arr[1];
    arr[1] = first;
  }
  return arr;
}

export const SYMBOLIC_EXERCISES: Record<SceneId, SymbolicExerciseSpec> = {
  'lin-span': {
    sceneId: 'lin-span',
    title: 'Derivación del Volumen y Colapso de Rango',
    prompt: 'Ordena los 4 pasos que conectan una combinación lineal 3D con la pérdida de volumen cuando los vectores son coplanares.',
    derivationGoal: 'Demostrar por qué det([v₁ v₂ v₃]) = 0 aplasta el volumen en un plano.',
    blocks: [
      { id: 'span-1', latex: '\\mathbf{p} = c_1\\mathbf{v}_1 + c_2\\mathbf{v}_2 + c_3\\mathbf{v}_3', caption: 'Combinación lineal de vectores generadores', crayon: 'cobalt' },
      { id: 'span-2', latex: 'V = |\\mathbf{v}_1 \\cdot (\\mathbf{v}_2 \\times \\mathbf{v}_3)| = |\\det([\\mathbf{v}_1\\;\\mathbf{v}_2\\;\\mathbf{v}_3])|', caption: 'Producto mixto = volumen del paralelepípedo', crayon: 'sage' },
      { id: 'span-3', latex: '\\mathbf{v}_3 = \\alpha \\mathbf{v}_1 + \\beta \\mathbf{v}_2 \\implies \\mathbf{v}_3 \\in \\text{Span}(\\mathbf{v}_1,\\mathbf{v}_2)', caption: 'Dependencia lineal: v₃ cae sobre el plano de v₁ y v₂', crayon: 'ochre' },
      { id: 'span-4', latex: 'V = 0 \\implies \\text{rango}(A) \\le 2', caption: 'Colapso dimensional a una lámina 2D', crayon: 'vermilion' },
    ],
    correctOrder: ['span-1', 'span-2', 'span-3', 'span-4'],
    equivalencePrompt: 'Escribe el volumen absoluto |det| de la matriz diagonal-base con ejes c1, c2 y altura h (usa abs):',
    variables: ['c1', 'c2', 'h'],
    targetExpression: 'abs(c1 * c2 * h)',
    placeholderExpression: 'abs(c1 * c2 * h)',
    sampleInputs: [
      { c1: 2, c2: 3, h: 1.5 },
      { c1: -2, c2: 1.5, h: 4 },
      { c1: 1.2, c2: 0, h: 3 },
    ],
    hint: 'El volumen de un paralelepípedo ortogonal de aristas c1, c2 y altura h es el valor absoluto del producto: abs(c1 * c2 * h).',
  },

  'lin-svd': {
    sceneId: 'lin-svd',
    title: 'Anatomía Algebraica de A = U · Σ · Vᵀ',
    prompt: 'Ordena la secuencia exacta con la que una matriz 3×3 transforma un vector x mediante su descomposición SVD.',
    derivationGoal: 'Separar rotación de entrada, estiramiento ortogonal y rotación de salida.',
    blocks: [
      { id: 'svd-1', latex: '\\mathbf{y}_1 = V^T \\mathbf{x}', caption: 'Acto 1: rotación ortogonal al sistema de ejes principales', crayon: 'cobalt' },
      { id: 'svd-2', latex: '\\mathbf{y}_2 = \\Sigma \\mathbf{y}_1 = (\\sigma_1 y_{1x},\\; \\sigma_2 y_{1y},\\; \\sigma_3 y_{1z})', caption: 'Acto 2: estiramiento puro a lo largo de los ejes singulares', crayon: 'ochre' },
      { id: 'svd-3', latex: 'A\\mathbf{x} = U \\mathbf{y}_2 = U\\Sigma V^T \\mathbf{x}', caption: 'Acto 3: rotación final al espacio de salida', crayon: 'sage' },
      { id: 'svd-4', latex: '|\\det(A)| = |\\det(U)|\\,|\\det(\\Sigma)|\\,|\\det(V^T)| = \\sigma_1\\sigma_2\\sigma_3', caption: 'El factor de volumen depende solo de los valores singulares', crayon: 'vermilion' },
    ],
    correctOrder: ['svd-1', 'svd-2', 'svd-3', 'svd-4'],
    equivalencePrompt: 'Escribe el determinante de la submatriz 2×2 [[a, b], [c, d]] multiplicado por la escala vertical s:',
    variables: ['a', 'b', 'c', 'd', 's'],
    targetExpression: '(a * d - b * c) * s',
    placeholderExpression: '(a * d - b * c) * s',
    sampleInputs: [
      { a: 2, b: 1, c: 0.5, d: 3, s: 2 },
      { a: 1, b: 2, c: 2, d: 1, s: -1 },
      { a: 0, b: -1, c: 2, d: 4, s: 1.5 },
    ],
    hint: 'Para una matriz 3×3 por bloques, det(A) = (a*d - b*c) * s.',
  },

  'lin-eigen': {
    sceneId: 'lin-eigen',
    title: 'Ecuación Característica y Direcciones Invariantes',
    prompt: 'Ordena los 4 pasos algebraicos para hallar los autovalores λ de una matriz 2×2.',
    derivationGoal: 'Pasar de la invariancia geométrica A·v = λ·v al polinomio característico.',
    blocks: [
      { id: 'eig-1', latex: 'A\\mathbf{v} = \\lambda\\mathbf{v}, \\quad \\mathbf{v} \\neq \\mathbf{0}', caption: 'Definición: v conserva su dirección y solo escala por λ', crayon: 'cobalt' },
      { id: 'eig-2', latex: '(A - \\lambda I)\\mathbf{v} = \\mathbf{0}', caption: 'Reescritura como núcleo no trivial de (A - λI)', crayon: 'ochre' },
      { id: 'eig-3', latex: '\\det(A - \\lambda I) = 0', caption: 'Condición de singularidad para que exista v ≠ 0', crayon: 'vermilion' },
      { id: 'eig-4', latex: '\\lambda^2 - (a+d)\\lambda + (ad - bc) = 0', caption: 'Polinomio característico en función de traza y determinante', crayon: 'sage' },
    ],
    correctOrder: ['eig-1', 'eig-2', 'eig-3', 'eig-4'],
    equivalencePrompt: 'Escribe el discriminante Δ = (a - d)^2 + 4*b*c que decide si existen autovectores reales:',
    variables: ['a', 'b', 'c', 'd'],
    targetExpression: '(a - d)^2 + 4 * b * c',
    placeholderExpression: '(a - d)^2 + 4 * b * c',
    sampleInputs: [
      { a: 3, b: 1, c: 2, d: 1 },
      { a: 1, b: -2, c: 2, d: 1 },
      { a: 2.5, b: 0.5, c: 0.5, d: -0.5 },
    ],
    hint: 'Al expandir traza² - 4·det = (a+d)² - 4(ad-bc), se simplifica exactamente a (a - d)^2 + 4*b*c.',
  },

  'lin-manifold': {
    sceneId: 'lin-manifold',
    title: 'Por Qué la No Linealidad Dobla Variedades',
    prompt: 'Ordena la prueba que muestra por qué apilar capas lineales colapsa, mientras φ(W·x + b) logra separar anillos.',
    derivationGoal: 'Contrastar colapso afín con levantamiento no lineal de características.',
    blocks: [
      { id: 'man-1', latex: 'W_2(W_1 \\mathbf{x} + \\mathbf{b}_1) + \\mathbf{b}_2 = (W_2 W_1)\\mathbf{x} + \\mathbf{b}_{\\text{eq}}', caption: 'Sin activación φ, dos capas lineales colapsan en una sola', crayon: 'vermilion' },
      { id: 'man-2', latex: 'z = W\\,r(\\mathbf{x}) + b', caption: 'Proyección lineal previa a la no linealidad', crayon: 'cobalt' },
      { id: 'man-3', latex: 'h = \\gamma\\,\\phi(z) = \\gamma\\,\\tanh(z)', caption: 'Curvatura controlada: levanta la hoja en la 3.ª dimensión', crayon: 'plum' },
      { id: 'man-4', latex: '\\hat{y} = \\mathbb{I}(h > y_{\\text{plano}})', caption: 'Un hiperplano plano ahora separa ambas clases', crayon: 'sage' },
    ],
    correctOrder: ['man-1', 'man-2', 'man-3', 'man-4'],
    equivalencePrompt: 'Escribe la activación ReLU escalada por gamma sobre z = w*r + b usando max(0, ...):',
    variables: ['g', 'w', 'r', 'b'],
    targetExpression: 'g * max(0, w * r + b)',
    placeholderExpression: 'g * max(0, w * r + b)',
    sampleInputs: [
      { g: 1.2, w: 2, r: 0.5, b: -0.2 },
      { g: 1.0, w: 1.5, r: -1, b: 0.2 },
      { g: 0.8, w: 2.5, r: 0.3, b: 0.4 },
    ],
    hint: 'Aplica max(0, w * r + b) y multiplica el resultado por el factor de pliegue g.',
  },

  'calc-partials': {
    sceneId: 'calc-partials',
    title: 'Plano Tangente desde Derivadas Parciales',
    prompt: 'Ordena los 4 pasos que construyen la aproximación lineal local (plano tangente) de z = f(x, y).',
    derivationGoal: 'Combinar las dos pendientes de corte en la ecuación del plano tangente y su gradiente.',
    blocks: [
      { id: 'par-1', latex: 'f_x(x_0, y_0) = \\left.\\frac{\\partial f}{\\partial x}\\right|_{(x_0,y_0)}', caption: 'Fija y = y₀ para medir la pendiente del corte bermellón', crayon: 'vermilion' },
      { id: 'par-2', latex: 'f_y(x_0, y_0) = \\left.\\frac{\\partial f}{\\partial y}\\right|_{(x_0,y_0)}', caption: 'Fija x = x₀ para medir la pendiente del corte ocre', crayon: 'ochre' },
      { id: 'par-3', latex: '\\nabla f(x_0, y_0) = (f_x,\\; f_y)', caption: 'Ensambla el vector gradiente de máximo ascenso', crayon: 'sage' },
      { id: 'par-4', latex: 'L(x,y) = f(x_0,y_0) + f_x(x - x_0) + f_y(y - y_0)', caption: 'Ecuación exacta del plano tangente en (x₀, y₀)', crayon: 'cobalt' },
    ],
    correctOrder: ['par-1', 'par-2', 'par-3', 'par-4'],
    equivalencePrompt: 'Escribe la altura del plano tangente L en función de z0, fx, fy, dx y dy:',
    variables: ['z0', 'fx', 'fy', 'dx', 'dy'],
    targetExpression: 'z0 + fx * dx + fy * dy',
    placeholderExpression: 'z0 + fx * dx + fy * dy',
    sampleInputs: [
      { z0: 1.2, fx: -0.5, fy: 0.8, dx: 0.4, dy: -0.2 },
      { z0: -0.5, fx: 2, fy: 1.5, dx: 1, dy: 2 },
      { z0: 0, fx: 0, fy: -1.2, dx: 3, dy: 0.5 },
    ],
    hint: 'La variación lineal suma el valor base z0 más cada derivada parcial por su desplazamiento: z0 + fx * dx + fy * dy.',
  },

  'calc-autodiff': {
    sceneId: 'calc-autodiff',
    title: 'Regla de la Cadena en Modo Inverso (Backprop)',
    prompt: 'Ordena el recorrido completo de evaluación Forward y propagación Backward para f(x, y) = x·y + sin(w·x).',
    derivationGoal: 'Sumar las dos rutas del grafo DAG que influyen sobre ∂f/∂x.',
    blocks: [
      { id: 'ad-1', latex: 'u_1 = x \\cdot y, \\quad u_2 = \\sin(w \\cdot x)', caption: 'Forward pass: guarda activaciones intermedias en la cinta', crayon: 'sage' },
      { id: 'ad-2', latex: '\\bar{f} = \\frac{\\partial f}{\\partial f} = 1', caption: 'Semilla inversa en el nodo de salida', crayon: 'vermilion' },
      { id: 'ad-3', latex: '\\bar{u}_1 = 1, \\quad \\bar{u}_2 = 1 \\implies \\frac{\\partial u_2}{\\partial x} = w\\cos(wx)', caption: 'Derivadas locales en orden topológico inverso', crayon: 'ochre' },
      { id: 'ad-4', latex: '\\frac{\\partial f}{\\partial x} = y + w\\cos(w\\,x)', caption: 'Acumulación de ambas ramas que salen de x', crayon: 'cobalt' },
    ],
    correctOrder: ['ad-1', 'ad-2', 'ad-3', 'ad-4'],
    equivalencePrompt: 'Escribe la derivada exacta ∂f/∂x de f(x, y) = x*y + sin(w*x):',
    variables: ['x', 'y', 'w'],
    targetExpression: 'y + w * cos(w * x)',
    placeholderExpression: 'y + w * cos(w * x)',
    sampleInputs: [
      { x: 0.7, y: 0.6, w: 1.6 },
      { x: -1.1, y: 2.0, w: 0.8 },
      { x: 0.0, y: -0.5, w: 2.5 },
    ],
    hint: 'Deriva x*y respecto a x (= y) y suma la regla de la cadena sobre sin(w*x) (= w * cos(w * x)).',
  },

  'calc-optimizers': {
    sceneId: 'calc-optimizers',
    title: 'Actualización de Momentos en Adam vs. SGD',
    prompt: 'Ordena los 4 pasos de un ciclo de actualización de Adam sobre un parámetro θ.',
    derivationGoal: 'Entender cómo el primer momento (inercia) y el segundo momento (escala adaptativa) estabilizan el paso.',
    blocks: [
      { id: 'opt-1', latex: 'g_t = \\nabla_\\theta L(\\theta_{t-1})', caption: 'Calcula el gradiente instantáneo en la posición actual', crayon: 'vermilion' },
      { id: 'opt-2', latex: 'm_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t', caption: 'Media móvil exponencial de la dirección (primer momento)', crayon: 'ochre' },
      { id: 'opt-3', latex: 'v_t = \\beta_2 v_{t-1} + (1 - \\beta_2) g_t^2', caption: 'Media móvil de la magnitud al cuadrado (segundo momento)', crayon: 'cobalt' },
      { id: 'opt-4', latex: '\\theta_t = \\theta_{t-1} - \\alpha \\frac{m_t}{\\sqrt{v_t} + \\epsilon}', caption: 'Paso normalizado por curvatura para evitar explosiones', crayon: 'sage' },
    ],
    correctOrder: ['opt-1', 'opt-2', 'opt-3', 'opt-4'],
    equivalencePrompt: 'Escribe la actualización de un paso de descenso con inercia: th - a * (b * vel + g):',
    variables: ['th', 'a', 'b', 'vel', 'g'],
    targetExpression: 'th - a * (b * vel + g)',
    placeholderExpression: 'th - a * (b * vel + g)',
    sampleInputs: [
      { th: 1.5, a: 0.1, b: 0.8, vel: 0.5, g: 1.2 },
      { th: -0.4, a: 0.05, b: 0.9, vel: -0.3, g: 0.7 },
      { th: 2.0, a: 0.2, b: 0.0, vel: 1.0, g: -0.5 },
    ],
    hint: 'Resta al parámetro th la tasa de aprendizaje a multiplicada por la velocidad combinada (b * vel + g).',
  },

  'calc-symbolic': {
    sceneId: 'calc-symbolic',
    title: 'Función de Pérdida MSE y Selección Evolutiva',
    prompt: 'Ordena las 4 etapas de una generación en regresión simbólica evolutiva.',
    derivationGoal: 'Conectar la representación en árbol/pesos con el error cuadrático medio y la mutación.',
    blocks: [
      { id: 'sym-1', latex: '\\hat{f}(x,y) = w_1\\sin(x) + w_2\\cos(y) + w_3(x^2-y^2) + w_5 e^{-r^2}', caption: 'Candidato simbólico parametrizado', crayon: 'cobalt' },
      { id: 'sym-2', latex: '\\text{MSE} = \\frac{1}{N}\\sum_{i=1}^{N} (\\hat{f}(x_i,y_i) - f^*(x_i,y_i))^2', caption: 'Evaluación de aptitud sobre la rejilla 25×25 en Web Worker', crayon: 'vermilion' },
      { id: 'sym-3', latex: '\\text{Élite} = \\arg\\min_{k} \\text{MSE}_k', caption: 'Selección por torneo conservando la mejor fórmula', crayon: 'sage' },
      { id: 'sym-4', latex: 'w_j^{\\text{nuevo}} = w_j + \\delta_j', caption: 'Cruce y mutación estocástica hacia la siguiente generación', crayon: 'ochre' },
    ],
    correctOrder: ['sym-1', 'sym-2', 'sym-3', 'sym-4'],
    equivalencePrompt: 'Escribe el error cuadrático medio (MSE) para dos predicciones (p1, p2) frente a objetivos (t1, t2):',
    variables: ['p1', 't1', 'p2', 't2'],
    targetExpression: '((p1 - t1)^2 + (p2 - t2)^2) / 2',
    placeholderExpression: '((p1 - t1)^2 + (p2 - t2)^2) / 2',
    sampleInputs: [
      { p1: 2, t1: 1, p2: 4, t2: 2 },
      { p1: -1, t1: 0.5, p2: 0.5, t2: 0.5 },
      { p1: 3, t1: 3, p2: -2, t2: -1 },
    ],
    hint: 'Eleva al cuadrado cada residuo (p1 - t1)^2 y (p2 - t2)^2, súmalos y divide entre 2.',
  },
};
