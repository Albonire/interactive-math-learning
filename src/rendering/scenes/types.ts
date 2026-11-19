import * as THREE from 'three';
import type { OptimizerProbeState, SceneId, ThemeMode } from '../../core/types';
import type { ActivationKind, ManifoldDatasetKind } from '../../math/linearAlgebra';

export interface SceneUpdatePayload {
  sceneId: SceneId;
  params: Record<string, number>;
  theme: ThemeMode;
  activation: ActivationKind;
  dataset: ManifoldDatasetKind;
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
  autoDiffPass: 'idle' | 'forward' | 'backward';
  optimizerProbes: OptimizerProbeState[];
  symbolicTargetIdx: number;
  aiSymbolicGrid: Float32Array | null;
}

export interface BibifoldSceneController {
  root: THREE.Group;
  layers: Record<string, THREE.Group>;
  cameraPos: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  update: (payload: SceneUpdatePayload) => void;
  dispose: () => void;
}
