import { STUDY_MODULES_A } from './studyPlanDataA';
import { STUDY_MODULES_B } from './studyPlanDataB';
import type {
  StudyModuleId,
  StudyModuleSpec,
  StudyPhaseId,
  StudyPhaseSpec,
} from './studyPlanTypes';

export * from './studyPlanTypes';

export const STUDY_PHASES: StudyPhaseSpec[] = [
  {
    id: 'phase-0',
    index: 0,
    title: 'Diagnóstico de vacíos',
    shortTitle: 'Diagnóstico',
    levelRange: 'Entrada',
    weeksLabel: '1 sem',
    summary:
      'Prueba adaptativa por bloques (M1–M6 y entrada en M13, M18, M24) con umbral del 80 % para distinguir repaso rápido de cursado completo.',
    crayon: 'ochre',
    moduleIds: [],
  },
  {
    id: 'phase-1',
    index: 1,
    title: 'Fundamentos',
    shortTitle: 'Fundamentos',
    levelRange: 'Nivel 1–2',
    weeksLabel: '8–10 sem',
    summary:
      'Aritmética y bases, álgebra elemental, funciones, trigonometría 2D, lógica y técnicas de demostración.',
    crayon: 'cobalt',
    moduleIds: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  },
  {
    id: 'phase-2',
    index: 2,
    title: 'Matemáticas discretas',
    shortTitle: 'Discretas',
    levelRange: 'Nivel 2–3',
    weeksLabel: '10–12 sem',
    summary:
      'Inducción y recursión, relaciones y cardinalidad, sumatorias y asintótica, teoría de números y RSA, combinatoria y grafos (MIT 6.1200J / CS2023).',
    crayon: 'vermilion',
    moduleIds: ['M7', 'M8', 'M9', 'M10', 'M11', 'M12'],
  },
  {
    id: 'phase-3',
    index: 3,
    title: 'Cálculo',
    shortTitle: 'Cálculo',
    levelRange: 'Nivel 3–4',
    weeksLabel: '12–14 sem',
    summary:
      'Límites y ε–δ, derivadas y Newton, integral y TFC, series de Taylor y cálculo multivariable/vectorial.',
    parallelNote: 'En paralelo parcial con Fase 4 (Álgebra lineal)',
    crayon: 'sage',
    moduleIds: ['M13', 'M14', 'M15', 'M16', 'M17'],
  },
  {
    id: 'phase-4',
    index: 4,
    title: 'Álgebra lineal',
    shortTitle: 'Álgebra Lineal',
    levelRange: 'Nivel 3–5',
    weeksLabel: '10–12 sem',
    summary:
      'Transformaciones lineales, sistemas Ax=b y LU, los cuatro subespacios, mínimos cuadrados, eigenvalores y SVD/PCA (MIT 18.06SC / 18.065).',
    parallelNote: 'Sin esperar al cálculo completo (tras M4 y M6)',
    crayon: 'cobalt',
    moduleIds: ['M18', 'M19', 'M20', 'M21', 'M22', 'M23'],
  },
  {
    id: 'phase-5',
    index: 5,
    title: 'Probabilidad y estadística',
    shortTitle: 'Probabilidad',
    levelRange: 'Nivel 3–4',
    weeksLabel: '10–12 sem',
    summary:
      'Axiomas y Bayes, variables aleatorias y distribuciones, covarianza y TCL, inferencia frecuentista (MLE, bootstrap) y bayesiana (MAP).',
    crayon: 'ochre',
    moduleIds: ['M24', 'M25', 'M26', 'M27'],
  },
  {
    id: 'phase-6',
    index: 6,
    title: 'Matemáticas avanzadas para ML',
    shortTitle: 'ML Avanzado',
    levelRange: 'Nivel 4–5',
    weeksLabel: '10–14 sem',
    summary:
      'Cálculo matricial y backpropagation, optimización y convexidad, métodos numéricos IEEE-754, teoría de la información y puentes al rigor.',
    crayon: 'plum',
    moduleIds: ['M28', 'M29', 'M30', 'M31', 'M32'],
  },
];

export const STUDY_MODULES_LIST: StudyModuleSpec[] = [
  ...STUDY_MODULES_A,
  ...STUDY_MODULES_B,
];

export const STUDY_MODULES: Record<StudyModuleId, StudyModuleSpec> = Object.fromEntries(
  STUDY_MODULES_LIST.map((m) => [m.id, m])
) as Record<StudyModuleId, StudyModuleSpec>;

export const STUDY_PHASES_MAP: Record<StudyPhaseId, StudyPhaseSpec> = Object.fromEntries(
  STUDY_PHASES.map((p) => [p.id, p])
) as Record<StudyPhaseId, StudyPhaseSpec>;

export function isValidStudyModuleId(val: unknown): val is StudyModuleId {
  return typeof val === 'string' && val in STUDY_MODULES;
}

export function getAdjacentModuleIds(id: StudyModuleId): {
  prev: StudyModuleId | null;
  next: StudyModuleId | null;
} {
  const idx = STUDY_MODULES_LIST.findIndex((m) => m.id === id);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? STUDY_MODULES_LIST[idx - 1].id : null,
    next: idx < STUDY_MODULES_LIST.length - 1 ? STUDY_MODULES_LIST[idx + 1].id : null,
  };
}

export function getDependentsOf(id: StudyModuleId): StudyModuleId[] {
  return STUDY_MODULES_LIST.filter((m) => m.prerequisites.includes(id)).map((m) => m.id);
}

/**
 * Verifies the 32-module prerequisite graph is strictly a DAG (no cycles, all refs valid).
 */
export function verifyStudyPlanDag(): { acyclic: boolean; visitedCount: number } {
  const inDegree = new Map<StudyModuleId, number>();
  const children = new Map<StudyModuleId, StudyModuleId[]>();

  for (const mod of STUDY_MODULES_LIST) {
    inDegree.set(mod.id, mod.prerequisites.length);
    children.set(mod.id, []);
  }
  for (const mod of STUDY_MODULES_LIST) {
    for (const pre of mod.prerequisites) {
      children.get(pre)?.push(mod.id);
    }
  }

  const queue: StudyModuleId[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    visited++;
    for (const next of children.get(curr) ?? []) {
      const nextDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nextDeg);
      if (nextDeg === 0) queue.push(next);
    }
  }

  return { acyclic: visited === STUDY_MODULES_LIST.length, visitedCount: visited };
}

export function computePhaseCompletion(
  phaseId: StudyPhaseId,
  completedModules: ReadonlySet<StudyModuleId>
): { done: number; total: number; percent: number } {
  const phase = STUDY_PHASES_MAP[phaseId];
  const total = phase.moduleIds.length;
  if (total === 0) return { done: 0, total: 0, percent: 0 };
  const done = phase.moduleIds.filter((id) => completedModules.has(id)).length;
  return { done, total, percent: Math.round((done / total) * 100) };
}

export function arePrerequisitesMet(
  id: StudyModuleId,
  completedModules: ReadonlySet<StudyModuleId>
): boolean {
  const mod = STUDY_MODULES[id];
  return mod.prerequisites.every((p) => completedModules.has(p));
}

export function getRecommendedNextModule(
  completedModules: ReadonlySet<StudyModuleId>,
  fastTrackModules: ReadonlySet<StudyModuleId> = new Set()
): StudyModuleId {
  for (const mod of STUDY_MODULES_LIST) {
    if (!completedModules.has(mod.id) && !fastTrackModules.has(mod.id)) {
      if (arePrerequisitesMet(mod.id, completedModules)) {
        return mod.id;
      }
    }
  }
  const firstIncomplete = STUDY_MODULES_LIST.find((m) => !completedModules.has(m.id));
  return firstIncomplete ? firstIncomplete.id : 'M32';
}
