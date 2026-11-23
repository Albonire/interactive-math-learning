import type { SceneId } from '../../core/types';
import { evaluateCodeLabSubmission } from '../codelabEngine';

export interface CodeLabWorkerRequest {
  requestId: number;
  sceneId: SceneId;
  submittedOrder: string[];
  slotChoices: Record<string, string>;
}

self.onmessage = (ev: MessageEvent<CodeLabWorkerRequest>) => {
  const { requestId, sceneId, submittedOrder, slotChoices } = ev.data;
  const result = evaluateCodeLabSubmission(sceneId, submittedOrder, slotChoices);
  self.postMessage({ requestId, result });
};
