export type CrayonToken =
  | 'graphite'
  | 'cobalt'
  | 'vermilion'
  | 'ochre'
  | 'sage'
  | 'plum'
  | 'pencil';

export type ThemeMode = 'paper' | 'chalkboard';

export type ModuleId =
  | 'linear-algebra'
  | 'multivariable-calc'
  | 'differential-integral'
  | 'numerical-methods'
  | 'discrete-graphs'
  | 'probability-info';

export type SceneId =
  | 'lin-span'
  | 'lin-svd'
  | 'lin-eigen'
  | 'lin-manifold'
  | 'calc-partials'
  | 'calc-autodiff'
  | 'calc-optimizers'
  | 'calc-symbolic';

export type SkillId =
  | 'lin_span_rank'
  | 'lin_det_collapse'
  | 'lin_eigen_dir'
  | 'lin_manifold_nonlin'
  | 'calc_partial_slice'
  | 'calc_chain_autodiff'
  | 'calc_lr_stability'
  | 'calc_symbolic_fit';

export type BanditArmId = 0 | 1 | 2 | 3;

export interface AnatomyLayerSpec {
  id: string;
  label: string;
  crayon: CrayonToken;
  visible: boolean;
  explodeOffsetY: number;
  explanation: string;
}

export interface SymbolicParameter {
  id: string;
  label: string;
  latexSymbol: string;
  crayon: CrayonToken;
  value: number;
  min: number;
  max: number;
  step: number;
  linkedLayerId: string;
  unit?: string;
}

export type SystemsCodeLanguage = 'rust' | 'java';

export interface CodeImplementation {
  language: SystemsCodeLanguage;
  label: 'Rust' | 'Java';
  memoryLayout: string;
  codeSnippet: string;
}

export interface ComputationalBridge {
  memoryValues: string[];
  complexity: string;
  csApplication: string;
  implementations: Record<SystemsCodeLanguage, CodeImplementation>;
}

export interface SceneMetadata {
  id: SceneId;
  moduleId: 'linear-algebra' | 'multivariable-calc';
  code: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  skillId: SkillId;
  skillLabel: string;
  intuitionNote: string;
  defaultLayers: AnatomyLayerSpec[];
  defaultParams: SymbolicParameter[];
}

export interface ModuleBlockSpec {
  id: ModuleId;
  index: number;
  title: string;
  status: 'active' | 'phase2';
  prerequisites: ModuleId[];
  csTopics: string[];
  anatomyOrgans: string[];
  sceneIds: SceneId[];
}

export interface BktSkillState {
  skillId: SkillId;
  pL: number;
  pL0: number;
  pT: number;
  pG: number;
  pS: number;
  attempts: number;
  correctCount: number;
}

export interface ChallengeSpec {
  id: string;
  seed: number;
  sceneId: SceneId;
  skillId: SkillId;
  arm: BanditArmId;
  armLabel: string;
  armDescription: string;
  prompt: string;
  hint: string;
  targetDescription: string;
  referenceContrast: string;
  recommendedLayers: string[];
  hideGuides: boolean;
  targetParams: Record<string, number>;
  tolerance: number;
  startedAt: number;
}

export interface ChallengeEvaluation {
  errorMetric: number;
  solved: boolean;
  feedback: string;
  contrastNote: string;
  pLBefore: number;
  pLAfter: number;
  reward: number;
}

export interface AutoDiffNodeView {
  id: string;
  label: string;
  op: 'input' | 'mul' | 'add' | 'sin' | 'pow';
  value: number;
  grad: number;
  localDeriv: string;
  inputs: string[];
  x: number;
  y: number;
  crayon: CrayonToken;
}

export interface AutoDiffSnapshot {
  nodes: AutoDiffNodeView[];
  outputValue: number;
  gradX: number;
  gradY: number;
  gradStatus: 'nominal' | 'vanishing' | 'exploding';
  activePass: 'idle' | 'forward' | 'backward';
}

export interface OptimizerProbeState {
  name: 'SGD' | 'Momentum' | 'Adam';
  crayon: CrayonToken;
  x: number;
  y: number;
  z: number;
  gradX: number;
  gradY: number;
  velX: number;
  velY: number;
  mX: number;
  mY: number;
  vX: number;
  vY: number;
  stepCount: number;
  trail: Array<[number, number, number]>;
  diverged: boolean;
}

export interface SymbolicWorkerUpdate {
  generation: number;
  bestFormula: string;
  aiMse: number;
  humanMse: number;
  running: boolean;
  aiGrid?: Float32Array;
}

export interface SceneLiveMetrics {
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  statusText: string;
  statusSeverity: 'nominal' | 'warning' | 'highlight';
}
