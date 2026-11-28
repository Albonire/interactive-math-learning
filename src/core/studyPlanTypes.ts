import type { CrayonToken, SceneId } from './types';

export type StudyPhaseId =
  | 'phase-0'
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4'
  | 'phase-5'
  | 'phase-6';

export type StudyModuleId =
  | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6'
  | 'M7' | 'M8' | 'M9' | 'M10' | 'M11' | 'M12'
  | 'M13' | 'M14' | 'M15' | 'M16' | 'M17'
  | 'M18' | 'M19' | 'M20' | 'M21' | 'M22' | 'M23'
  | 'M24' | 'M25' | 'M26' | 'M27'
  | 'M28' | 'M29' | 'M30' | 'M31' | 'M32';

export type VisualFormatCode = 'W' | 'A' | 'E' | 'R';

export interface ModuleVisualSpec {
  concept: string;
  visualization: string;
  format: VisualFormatCode;
  params: string;
  intuition: string;
}

export interface ModuleConcreteExample {
  title: string;
  problem: string;
  steps: string[];
  latex: string;
  formalDefinition: string;
}

export interface ModulePythonLab {
  title: string;
  task: string;
  code: string;
  mlApplication: string;
}

/**
 * Strictly follows Regla fija R-OM:
 * All four options share balanced length, detail, and grammatical structure,
 * with distractors grounded in real conceptual errors.
 */
export interface StudyModuleCheckpoint {
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface StudyModuleSpec {
  id: StudyModuleId;
  number: number;
  phaseId: StudyPhaseId;
  level: string;
  optional?: boolean;
  crayon: CrayonToken;
  title: string;
  shortLabel: string;
  prerequisites: StudyModuleId[];
  syllabus: string[];
  pureMathFocus: string;
  appliedCsMlFocus: string;
  visualSpecs: ModuleVisualSpec[];
  concreteExample: ModuleConcreteExample;
  pythonLab: ModulePythonLab;
  checkpoint: StudyModuleCheckpoint;
  references: RefCode[];
  linked3DSceneId?: SceneId;
  secondary3DSceneId?: SceneId;
}

export interface StudyPhaseSpec {
  id: StudyPhaseId;
  index: number;
  title: string;
  shortTitle: string;
  levelRange: string;
  weeksLabel: string;
  summary: string;
  parallelNote?: string;
  crayon: CrayonToken;
  moduleIds: StudyModuleId[];
}

export type RefCode =
  | 'MCS' | 'HAM' | 'VEL' | 'ROS-ES' | 'STR-ILA' | 'STR-LALD' | 'STR-CALC'
  | 'VMLS' | 'CVX' | 'LADR' | 'MML' | 'DL' | 'BH' | 'CS109R' | 'STW-ES'
  | 'NEED' | 'JUD'
  | 'OCW-1801' | 'OCW-1806' | 'OCW-18065' | 'OCW-61200' | 'OCW-1805'
  | 'CS103' | 'CS109' | 'CS229-LA' | 'STAT110' | 'IMP' | 'CS2023'
  | '3B1B' | 'ST' | 'ILA' | 'DIS-MOM';

export interface VerifiedReference {
  code: RefCode;
  category: 'text' | 'course' | 'visual';
  citation: string;
  note?: string;
}

export const VERIFIED_REFERENCES: Record<RefCode, VerifiedReference> = {
  MCS: {
    code: 'MCS',
    category: 'text',
    citation: 'Lehman, Leighton y Meyer, Mathematics for Computer Science (MIT 6.1200J, CC BY-SA).',
  },
  HAM: {
    code: 'HAM',
    category: 'text',
    citation: 'Hammack, Book of Proof, 3.ª ed. (2018), PDF abierto (CC BY-NC-ND 4.0).',
  },
  VEL: {
    code: 'VEL',
    category: 'text',
    citation: 'Velleman, How to Prove It: A Structured Approach, 3.ª ed., Cambridge University Press (2019).',
  },
  'ROS-ES': {
    code: 'ROS-ES',
    category: 'text',
    citation: 'Rosen, Matemática discreta y sus aplicaciones, 5.ª ed. en español, McGraw-Hill (2004).',
  },
  'STR-ILA': {
    code: 'STR-ILA',
    category: 'text',
    citation: 'Strang, Introduction to Linear Algebra, Wellesley-Cambridge Press (5.ª ed. 2016 / 6.ª ed. 2023).',
  },
  'STR-LALD': {
    code: 'STR-LALD',
    category: 'text',
    citation: 'Strang, Linear Algebra and Learning from Data, Wellesley-Cambridge Press.',
  },
  'STR-CALC': {
    code: 'STR-CALC',
    category: 'text',
    citation: 'Strang, Calculus, texto abierto en MIT OCW (RES.18-001).',
  },
  VMLS: {
    code: 'VMLS',
    category: 'text',
    citation: 'Boyd y Vandenberghe, Introduction to Applied Linear Algebra: Vectors, Matrices, and Least Squares, Cambridge (2018).',
  },
  CVX: {
    code: 'CVX',
    category: 'text',
    citation: 'Boyd y Vandenberghe, Convex Optimization, Cambridge University Press (2004).',
  },
  LADR: {
    code: 'LADR',
    category: 'text',
    citation: 'Axler, Linear Algebra Done Right, 4.ª ed., Springer UTM (2024), acceso abierto.',
  },
  MML: {
    code: 'MML',
    category: 'text',
    citation: 'Deisenroth, Faisal y Ong, Mathematics for Machine Learning, Cambridge University Press (2020).',
  },
  DL: {
    code: 'DL',
    category: 'text',
    citation: 'Goodfellow, Bengio y Courville, Deep Learning, MIT Press (2016), caps. 2, 3, 4 y 6.',
  },
  BH: {
    code: 'BH',
    category: 'text',
    citation: 'Blitzstein y Hwang, Introduction to Probability, 2.ª ed., CRC Press (2019), versión abierta.',
  },
  CS109R: {
    code: 'CS109R',
    category: 'text',
    citation: 'Piech, Probability for Computer Scientists (lector oficial de Stanford CS109).',
  },
  'STW-ES': {
    code: 'STW-ES',
    category: 'text',
    citation: 'Stewart, Clegg y Watson, Cálculo de una variable / Early Transcendentals, 9.ª ed., Cengage (2021).',
  },
  NEED: {
    code: 'NEED',
    category: 'text',
    citation: 'Needham, Visual Complex Analysis, edición 25.º aniversario, Oxford University Press (2023).',
  },
  JUD: {
    code: 'JUD',
    category: 'text',
    citation: 'Judson, Abstract Algebra: Theory and Applications, libro abierto (GNU FDL).',
  },
  'OCW-1801': {
    code: 'OCW-1801',
    category: 'course',
    citation: 'MIT 18.01SC Single Variable Calculus (David Jerison), OCW Scholar.',
  },
  'OCW-1806': {
    code: 'OCW-1806',
    category: 'course',
    citation: 'MIT 18.06SC Linear Algebra (Gilbert Strang), OCW Scholar.',
  },
  'OCW-18065': {
    code: 'OCW-18065',
    category: 'course',
    citation: 'MIT 18.065 Matrix Methods in Data Analysis, Signal Processing, and Machine Learning (Strang).',
  },
  'OCW-61200': {
    code: 'OCW-61200',
    category: 'course',
    citation: 'MIT 6.1200J Mathematics for Computer Science (Spring 2024, Demaine, Abel y Chapman).',
  },
  'OCW-1805': {
    code: 'OCW-1805',
    category: 'course',
    citation: 'MIT 18.05 Introduction to Probability and Statistics (Orloff, Bloom y French Kamrin).',
  },
  CS103: {
    code: 'CS103',
    category: 'course',
    citation: 'Stanford CS103 Mathematical Foundations of Computing.',
  },
  CS109: {
    code: 'CS109',
    category: 'course',
    citation: 'Stanford CS109 Probability for Computer Scientists.',
  },
  'CS229-LA': {
    code: 'CS229-LA',
    category: 'course',
    citation: 'Kolter, Do y Ma, Linear Algebra Review and Reference (Stanford CS229).',
  },
  STAT110: {
    code: 'STAT110',
    category: 'course',
    citation: 'Harvard Statistics 110 (Joe Blitzstein).',
  },
  IMP: {
    code: 'IMP',
    category: 'course',
    citation: 'Imperial College London, Mathematics for Machine Learning (Linear Algebra, Multivariate Calculus, PCA).',
  },
  CS2023: {
    code: 'CS2023',
    category: 'course',
    citation: 'ACM / IEEE-CS / AAAI, Computer Science Curricula 2023, área MSF (55 h CS Core).',
  },
  '3B1B': {
    code: '3B1B',
    category: 'visual',
    citation: '3Blue1Brown (Grant Sanderson): Essence of linear algebra, Essence of calculus y Neural networks.',
    note: 'Recurso de intuición visual, complementado con evaluación formal.',
  },
  ST: {
    code: 'ST',
    category: 'visual',
    citation: 'Seeing Theory, Daniel Kunin et al., Brown University (6 capítulos visuales de probabilidad).',
    note: 'Alojado en Brown University; código congelado sin mantenimiento activo.',
  },
  ILA: {
    code: 'ILA',
    category: 'visual',
    citation: 'Ström, Åström y Akenine-Möller, Immersive Linear Algebra.',
  },
  'DIS-MOM': {
    code: 'DIS-MOM',
    category: 'visual',
    citation: 'Goh, "Why Momentum Really Works", Distill (2017), DOI 10.23915/distill.00006.',
  },
};

export const METHODOLOGY_NOTES: readonly string[] = [
  'Escalera de cinco peldaños en cada módulo: (a) representación visual interactiva, (b) cálculo con números pequeños, (c) definición formal, (d) código Python y (e) aplicación en computación o ML.',
  'Las Fases 3 (Cálculo) y 4 (Álgebra Lineal) pueden cursarse en paralelo parcial tras M14: MIT 18.06SC confirma que el cálculo no es prerrequisito para aprender álgebra lineal.',
  'Las duraciones (60–75 semanas a 8–10 h/semana) son estimaciones orientativas de diseño pedagógico; contrastar siempre con el pensum oficial local.',
  'Todos los cuestionarios cumplen la regla R-OM: opciones equilibradas en extensión y estructura gramatical con distractores basados en errores conceptuales reales.',
];
