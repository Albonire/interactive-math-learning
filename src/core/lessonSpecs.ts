import { SCENES } from './curriculum';
import type { LessonSpec, LessonTier, SceneId, WorkspaceEngineMode } from './types';

const ALL_ENGINES: WorkspaceEngineMode[] = ['webgl3d', 'symbolic', 'codelab'];

/**
 * Declarative LessonSpec registry unifying metadata, curriculum tier, prerequisite DAG,
 * sub-skill ID, and available interactive engines for all 8 active lessons.
 */
export const LESSON_SPECS: Record<SceneId, LessonSpec> = {
  'lin-span': {
    id: 'lin-span',
    tier: 2,
    tierLabel: 'Tier 2 · Núcleo Universitario',
    prerequisites: [],
    engines: ALL_ENGINES,
    skillId: SCENES['lin-span'].skillId,
    metadata: SCENES['lin-span'],
  },
  'lin-svd': {
    id: 'lin-svd',
    tier: 2,
    tierLabel: 'Tier 2 · Núcleo Universitario',
    prerequisites: ['lin-span'],
    engines: ALL_ENGINES,
    skillId: SCENES['lin-svd'].skillId,
    metadata: SCENES['lin-svd'],
  },
  'lin-eigen': {
    id: 'lin-eigen',
    tier: 2,
    tierLabel: 'Tier 2 · Núcleo Universitario',
    prerequisites: ['lin-svd'],
    engines: ALL_ENGINES,
    skillId: SCENES['lin-eigen'].skillId,
    metadata: SCENES['lin-eigen'],
  },
  'lin-manifold': {
    id: 'lin-manifold',
    tier: 2,
    tierLabel: 'Tier 2 · Núcleo Universitario',
    prerequisites: ['lin-eigen'],
    engines: ALL_ENGINES,
    skillId: SCENES['lin-manifold'].skillId,
    metadata: SCENES['lin-manifold'],
  },
  'calc-partials': {
    id: 'calc-partials',
    tier: 3,
    tierLabel: 'Tier 3 · Avanzado y ML',
    prerequisites: ['lin-span'],
    engines: ALL_ENGINES,
    skillId: SCENES['calc-partials'].skillId,
    metadata: SCENES['calc-partials'],
  },
  'calc-autodiff': {
    id: 'calc-autodiff',
    tier: 3,
    tierLabel: 'Tier 3 · Avanzado y ML',
    prerequisites: ['calc-partials'],
    engines: ALL_ENGINES,
    skillId: SCENES['calc-autodiff'].skillId,
    metadata: SCENES['calc-autodiff'],
  },
  'calc-optimizers': {
    id: 'calc-optimizers',
    tier: 3,
    tierLabel: 'Tier 3 · Avanzado y ML',
    prerequisites: ['calc-autodiff'],
    engines: ALL_ENGINES,
    skillId: SCENES['calc-optimizers'].skillId,
    metadata: SCENES['calc-optimizers'],
  },
  'calc-symbolic': {
    id: 'calc-symbolic',
    tier: 3,
    tierLabel: 'Tier 3 · Avanzado y ML',
    prerequisites: ['calc-optimizers'],
    engines: ALL_ENGINES,
    skillId: SCENES['calc-symbolic'].skillId,
    metadata: SCENES['calc-symbolic'],
  },
};

export interface RoadmapTierSummary {
  tier: LessonTier;
  code: string;
  title: string;
  lessonCount: number;
  activeCount: number;
  engineFocus: string;
  highlights: string[];
  waveLabel: string;
}

/**
 * Upgraded BIBIFOLD 0→100 roadmap summary (40 planned lessons across 6 tiers)
 * surfaced cleanly inside the Curriculum Map.
 */
export const ROADMAP_TIERS: RoadmapTierSummary[] = [
  {
    tier: 0,
    code: 'Tier 0',
    title: 'Cimientos Matemáticos',
    lessonCount: 6,
    activeCount: 0,
    engineFocus: 'Simbólico + 3D',
    highlights: ['Recta numérica y errores', 'Funciones lineales y cuadráticas', 'Logaritmos y Big-O', 'Trigonometría y vectores 2D'],
    waveLabel: 'Ola 3',
  },
  {
    tier: 1,
    code: 'Tier 1',
    title: 'CS Esencial y Discretas',
    lessonCount: 9,
    activeCount: 0,
    engineFocus: 'Motor Discreto + CodeLab',
    highlights: ['Binario, complemento a 2 e IEEE-754', 'Compuertas lógicas y sumador', 'Mapas de Karnaugh', 'Autómatas DFA/Turing y grafos (Dijkstra/A*)'],
    waveLabel: 'Siguiente · Ola 2',
  },
  {
    tier: 2,
    code: 'Tier 2',
    title: 'Núcleo Universitario (Álgebra Lineal, Cálculo I y Prob.)',
    lessonCount: 10,
    activeCount: 4,
    engineFocus: '3D + Simbólico + CodeLab',
    highlights: ['Span, SVD, Autovectores y Variedades (Activas)', 'Límites, Taylor y cuadratura', 'Bayes, entropía y aritmética modular RSA'],
    waveLabel: '4 activas · Ola 1',
  },
  {
    tier: 3,
    code: 'Tier 3',
    title: 'Avanzado, Optimización y Métodos Numéricos',
    lessonCount: 8,
    activeCount: 4,
    engineFocus: '3D + Simbólico + CodeLab',
    highlights: ['Parciales, AutoDiff, Optimizadores y Reg. Simbólica (Activas)', 'Newton-Raphson, RK4 y complejos/FFT'],
    waveLabel: '4 activas · Ola 1',
  },
  {
    tier: 4,
    code: 'Tier 4',
    title: 'Jefes Integradores',
    lessonCount: 3,
    activeCount: 0,
    engineFocus: '4 motores combinados',
    highlights: ['Mini-MLP de extremo a extremo', 'Pipeline de cámara 3D', 'Heurística admisible en A*'],
    waveLabel: 'Ola 4',
  },
  {
    tier: 5,
    code: 'Tier 5',
    title: 'Rutas Nicho de Ingeniería',
    lessonCount: 4,
    activeCount: 0,
    engineFocus: 'Especialización',
    highlights: ['Gráficos y shaders', 'Sistemas y memoria caché', 'Machine Learning', 'Criptografía aplicada'],
    waveLabel: 'Ola 4',
  },
];

export function getLessonSpec(sceneId: SceneId): LessonSpec {
  return LESSON_SPECS[sceneId];
}
