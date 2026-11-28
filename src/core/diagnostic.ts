import type { StudyModuleId } from './studyPlanTypes';

export type MisconceptionId =
  | 'precedence'
  | 'power-distribution'
  | 'inverse-vs-reciprocal'
  | 'trig-radian-unit'
  | 'quantifier-negation'
  | 'implication-converse'
  | 'calculus-limit-hole'
  | 'linear-matrix-columns'
  | 'bayes-base-rate';

export type DiagnosticItemKind = 'r-om' | 'visual' | 'python';

export interface DiagnosticQuestion {
  id: string;
  blockModuleId: StudyModuleId;
  blockLabel: string;
  level: 1 | 2 | 3;
  kind: DiagnosticItemKind;
  visualPreset?: 'parabola-shift' | 'unit-circle-q2' | 'venn-demorgan' | 'bayes-grid';
  codeSnippet?: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  misconceptionId: MisconceptionId;
  misconceptionLabel: string;
  explanation: string;
}

export type BlockRecommendation = 'repaso-rapido' | 'cursar-completo';

export interface DiagnosticBlockResult {
  moduleId: StudyModuleId;
  blockLabel: string;
  level: 1 | 2 | 3;
  correct: number;
  total: number;
  scorePercent: number;
  recommendation: BlockRecommendation;
}

export interface DiagnosticReport {
  completedAt: number;
  totalCorrect: number;
  totalQuestions: number;
  overallPercent: number;
  blocks: DiagnosticBlockResult[];
  detectedMisconceptions: Array<{
    id: MisconceptionId;
    label: string;
    moduleId: StudyModuleId;
  }>;
  fastTrackModules: StudyModuleId[];
  fullStudyModules: StudyModuleId[];
  recommendedEntryModule: StudyModuleId;
}

export const FAST_TRACK_THRESHOLD_PERCENT = 80;

/**
 * Phase 0 Diagnostic Bank mapped directly to PLAN_ESTUDIO.md:
 * Covers M1–M6 core blocks + entry placement for M13, M18, M24.
 * Strictly obeys Regla fija R-OM (balanced option length & real misconceptions).
 */
export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'diag-m1-prec',
    blockModuleId: 'M1',
    blockLabel: 'Aritmética y bases',
    level: 1,
    kind: 'python',
    codeSnippet: 'res = 2 + 3 * 2 ** 3\nhex_val = hex(res)',
    prompt: '¿Qué valor decimal produce la expresión 2 + 3 * 2 ** 3 en Python respetando la precedencia estándar?',
    options: [
      'Produce 26 porque primero se evalúa la potencia 2**3, luego el producto y al final la suma.',
      'Produce 40 porque se suman 2 y 3 primero y luego se multiplica el resultado por 2 al cubo.',
      'Produce 218 porque se multiplica 3 por 2 antes de elevar ese producto parcial a la potencia 3.',
      'Produce 125 porque la suma 2 + 3 se eleva directamente al cubo ignorando el factor intermedio.',
    ],
    correctIndex: 0,
    misconceptionId: 'precedence',
    misconceptionLabel: 'Precedencia de operaciones (potencias antes que productos y sumas)',
    explanation: '2**3 = 8, luego 3*8 = 24, y finalmente 2 + 24 = 26 (0x1a).',
  },
  {
    id: 'diag-m2-pow',
    blockModuleId: 'M2',
    blockLabel: 'Álgebra e inecuaciones',
    level: 1,
    kind: 'r-om',
    prompt: 'Al expandir el binomio (x − 3)² y resolver la inecuación −2x > 6, ¿qué resultado combinado es correcto?',
    options: [
      'La expansión vale x² − 6x + 9 y la inecuación da x < −3 al invertir el signo por dividir entre −2.',
      'La expansión vale x² − 9 y la inecuación da x > −3 manteniendo el sentido original de desigualdad.',
      'La expansión vale x² + 9 y la inecuación da x < −3 al conservar únicamente los términos cuadrados.',
      'La expansión vale x² − 6x + 9 y la inecuación da x > −3 porque dividir no altera el signo mayor.',
    ],
    correctIndex: 0,
    misconceptionId: 'power-distribution',
    misconceptionLabel: 'Distribución incorrecta de potencias y cambio de signo en inecuaciones',
    explanation: '(x−3)² = x² − 6x + 9 (no x²−9) y dividir por un negativo invierte > a <.',
  },
  {
    id: 'diag-m3-inv',
    blockModuleId: 'M3',
    blockLabel: 'Funciones y gráficas',
    level: 1,
    kind: 'visual',
    visualPreset: 'parabola-shift',
    prompt: 'Observa la parábola desplazada g(x) = (x − 2)² + 1 respecto a f(x) = x². ¿Qué describe bien la traslación y el concepto de función inversa?',
    options: [
      'El vértice se mueve a (2, 1) a la derecha y arriba, y la inversa f⁻¹ deshace la regla reflejando en y = x.',
      'El vértice se mueve a (−2, 1) a la izquierda y arriba, y la inversa f⁻¹ equivale siempre al recíproco 1/f(x).',
      'El vértice se mueve a (2, −1) a la derecha y abajo, y la inversa f⁻¹ duplica todas las coordenadas de x.',
      'El vértice permanece en el origen (0, 0) y la inversa f⁻¹ se obtiene multiplicando la gráfica por menos uno.',
    ],
    correctIndex: 0,
    misconceptionId: 'inverse-vs-reciprocal',
    misconceptionLabel: 'Confusión entre traslación horizontal (x−h) e inversa f⁻¹ frente a recíproca 1/f',
    explanation: 'Restar h dentro del argumento desplaza hacia +h, y f⁻¹(f(x)) = x es distinto de 1/f(x).',
  },
  {
    id: 'diag-m4-trig',
    blockModuleId: 'M4',
    blockLabel: 'Trigonometría y vectores',
    level: 2,
    kind: 'visual',
    visualPreset: 'unit-circle-q2',
    prompt: 'Para el punto en el círculo unitario con ángulo θ = 2π/3 (segundo cuadrante), ¿qué signos tienen cos(θ) y sin(θ)?',
    options: [
      'cos(θ) es negativo (−0.5) por estar a la izquierda y sin(θ) es positivo (+√3/2) por estar arriba.',
      'cos(θ) es positivo (+0.5) por medirse en radianes y sin(θ) es negativo (−√3/2) al pasar de π/2.',
      'Ambos valores cos(θ) y sin(θ) son positivos porque el radio del círculo unitario siempre vale uno.',
      'Ambos valores cos(θ) y sin(θ) son negativos porque cualquier ángulo mayor que π/2 invierte los ejes.',
    ],
    correctIndex: 0,
    misconceptionId: 'trig-radian-unit',
    misconceptionLabel: 'Lectura geométrica de coseno (x) y seno (y) en el círculo unitario',
    explanation: 'En el cuadrante II la coordenada horizontal x = cos(θ) es negativa y la vertical y = sin(θ) es positiva.',
  },
  {
    id: 'diag-m5-quant',
    blockModuleId: 'M5',
    blockLabel: 'Lógica y conjuntos',
    level: 2,
    kind: 'visual',
    visualPreset: 'venn-demorgan',
    prompt: '¿Qué expresión equivale a negar "Todos los nodos activos tienen latencia menor a 50 ms"?',
    options: [
      'Existe al menos un nodo activo cuya latencia es mayor o igual a 50 ms.',
      'Todos los nodos activos presentan una latencia estrictamente mayor a 50 ms.',
      'Ningún nodo inactivo del sistema logra tener una latencia inferior a 50 ms.',
      'Exactamente la mitad de los nodos activos supera el umbral de los 50 ms.',
    ],
    correctIndex: 0,
    misconceptionId: 'quantifier-negation',
    misconceptionLabel: 'Negación de cuantificadores (¬∀x P(x) ≡ ∃x ¬P(x))',
    explanation: 'Negar ∀ cambia a ∃ y niega la desigualdad estricta (< pasa a ≥).',
  },
  {
    id: 'diag-m6-imp',
    blockModuleId: 'M6',
    blockLabel: 'Demostraciones',
    level: 2,
    kind: 'r-om',
    prompt: 'Sabiendo que la proposición "Si un grafo es árbol, entonces es conexo" es verdadera, ¿qué afirmación se deduce con certeza lógica?',
    options: [
      'Si un grafo no es conexo, entonces con seguridad no puede ser un árbol (contrapositiva).',
      'Si un grafo es conexo, entonces obligatoriamente tiene que ser un árbol (recíproca).',
      'Si un grafo no es un árbol, entonces nunca podrá ser un grafo conexo (inversa lógica).',
      'Si un grafo posee ciclos cerrados, entonces deja de ser conexo en todos sus vértices.',
    ],
    correctIndex: 0,
    misconceptionId: 'implication-converse',
    misconceptionLabel: 'Confusión entre implicación P→Q, recíproca Q→P y contrapositiva ¬Q→¬P',
    explanation: 'Solo la contrapositiva (¬Q → ¬P) es equivalente a P → Q; un grafo conexo con ciclos no es árbol.',
  },
  {
    id: 'diag-m13-calc',
    blockModuleId: 'M13',
    blockLabel: 'Entrada: Cálculo',
    level: 3,
    kind: 'r-om',
    prompt: 'Si una función tiene un hueco removible en x = 2 pero se acerca a 5 por ambos lados, ¿qué ocurre con el límite y la continuidad en x = 2?',
    options: [
      'El límite cuando x tiende a 2 existe y vale 5, pero la función no es continua en x = 2.',
      'El límite cuando x tiende a 2 no existe, pero la función sigue siendo derivable en ese punto.',
      'Tanto el límite como la continuidad valen 5 porque ambos lados coinciden en la gráfica.',
      'El límite vale cero al faltar el punto y la derivada se vuelve infinita en toda la recta.',
    ],
    correctIndex: 0,
    misconceptionId: 'calculus-limit-hole',
    misconceptionLabel: 'Distinción entre existencia del límite y continuidad puntual',
    explanation: 'El límite depende del entorno cercano (0 < |x−2| < δ); la continuidad exige además que f(2) exista e iguale a 5.',
  },
  {
    id: 'diag-m18-la',
    blockModuleId: 'M18',
    blockLabel: 'Entrada: Álgebra lineal',
    level: 3,
    kind: 'python',
    codeSnippet: '# A = [[2, 0], [0, 3]], x = [1, 2]\ny = [A[0][0]*x[0] + A[0][1]*x[1], A[1][0]*x[0] + A[1][1]*x[1]]',
    prompt: '¿Qué transformación geométrica ejecuta la matriz diagonal A = [[2, 0], [0, 3]] sobre cualquier cuadrado del plano?',
    options: [
      'Estira el eje horizontal por factor 2 y el eje vertical por factor 3, multiplicando el área por 6.',
      'Rota el plano en sentido antihorario y conserva intacta el área original igual a uno.',
      'Desplaza todo el cuadrado dos unidades a la derecha y tres unidades hacia arriba sin escalarlo.',
      'Colapsa el plano completo sobre una sola recta diagonal porque los elementos fuera son cero.',
    ],
    correctIndex: 0,
    misconceptionId: 'linear-matrix-columns',
    misconceptionLabel: 'Interpretación de matrices como transformaciones lineales',
    explanation: 'î va a (2,0) y ĵ va a (0,3); el área se multiplica por det(A) = 2×3 = 6.',
  },
  {
    id: 'diag-m24-prob',
    blockModuleId: 'M24',
    blockLabel: 'Entrada: Probabilidad',
    level: 3,
    kind: 'visual',
    visualPreset: 'bayes-grid',
    prompt: 'Si una alarma falla en 5 % de días normales (99 % de días) y detecta 95 % de fallos reales (1 % de días), al sonar la alarma ¿qué es más probable?',
    options: [
      'Es más probable que sea falsa alarma porque el 5 % de los 99 días normales supera a los fallos reales.',
      'Es seguro al 95 % que exista un fallo real porque la sensibilidad define la probabilidad posterior.',
      'Ambas causas tienen exactamente la misma probabilidad del 50 % sin importar la frecuencia previa.',
      'La probabilidad de fallo real es exactamente 1 % porque la alarma no aporta información nueva.',
    ],
    correctIndex: 0,
    misconceptionId: 'bayes-base-rate',
    misconceptionLabel: 'Falacia de la tasa base al invertir P(+|H) por P(H|+)',
    explanation: 'P(Fallo|+) ≈ (0.95·0.01)/(0.95·0.01 + 0.05·0.99) ≈ 16.1%, luego ~83.9% son falsas alarmas.',
  },
];

export function evaluateDiagnostic(
  answers: Readonly<Record<string, number>>
): DiagnosticReport {
  const byBlock = new Map<StudyModuleId, DiagnosticQuestion[]>();
  for (const q of DIAGNOSTIC_QUESTIONS) {
    const list = byBlock.get(q.blockModuleId) ?? [];
    list.push(q);
    byBlock.set(q.blockModuleId, list);
  }

  const blocks: DiagnosticBlockResult[] = [];
  const detectedMisconceptions: DiagnosticReport['detectedMisconceptions'] = [];
  let totalCorrect = 0;

  for (const [moduleId, qs] of byBlock.entries()) {
    let correct = 0;
    for (const q of qs) {
      if (answers[q.id] === q.correctIndex) {
        correct++;
      } else {
        detectedMisconceptions.push({
          id: q.misconceptionId,
          label: q.misconceptionLabel,
          moduleId: q.blockModuleId,
        });
      }
    }
    totalCorrect += correct;
    const scorePercent = Math.round((correct / qs.length) * 100);
    blocks.push({
      moduleId,
      blockLabel: qs[0].blockLabel,
      level: qs[0].level,
      correct,
      total: qs.length,
      scorePercent,
      recommendation:
        scorePercent >= FAST_TRACK_THRESHOLD_PERCENT ? 'repaso-rapido' : 'cursar-completo',
    });
  }

  const fastTrackModules = blocks
    .filter((b) => b.recommendation === 'repaso-rapido')
    .map((b) => b.moduleId);
  const fullStudyModules = blocks
    .filter((b) => b.recommendation === 'cursar-completo')
    .map((b) => b.moduleId);

  // Recommend starting at the earliest full-study block, or M7 if all M1–M6 passed >= 80%
  const recommendedEntryModule: StudyModuleId =
    fullStudyModules[0] ?? 'M7';

  return {
    completedAt: Date.now(),
    totalCorrect,
    totalQuestions: DIAGNOSTIC_QUESTIONS.length,
    overallPercent: Math.round((totalCorrect / DIAGNOSTIC_QUESTIONS.length) * 100),
    blocks,
    detectedMisconceptions,
    fastTrackModules,
    fullStudyModules,
    recommendedEntryModule,
  };
}
