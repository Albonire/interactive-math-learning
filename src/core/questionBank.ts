/**
 * Question bank for the R-OM checkpoint of every module.
 *
 * Each module has its original checkpoint (studyPlanData, untouched) plus extra items here, so a
 * new round asks a different question instead of reshuffling the same one. Every wrong option
 * carries its own feedback: it names the misconception behind that option and nudges, without
 * revealing the right answer.
 *
 * Authoring format (BankItem): the correct option first, then three [option, feedback] pairs.
 * Display order is shuffled by the UI (core/optionShuffle), so writing the correct one first is
 * safe. Rules checked by tests: four options, similar lengths (R-OM), feedback for every wrong
 * option, no duplicated prompts.
 */
import { STUDY_MODULES } from './studyPlan';
import type { StudyModuleId } from './studyPlanTypes';
import { BANK_A, CHECKPOINT_FEEDBACK_A } from './questionBankA';
import { BANK_B, CHECKPOINT_FEEDBACK_B } from './questionBankB';

export interface BankItem {
  prompt: string;
  correct: string;
  wrong: [[string, string], [string, string], [string, string]];
  explanation: string;
}

/** Feedback for the three wrong options of each module's original checkpoint, in option order. */
export type CheckpointFeedback = Partial<Record<StudyModuleId, [string, string, string]>>;

export interface CheckpointQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** Feedback by option index, for every wrong option. */
  feedback: Record<number, string>;
}

const FEEDBACK: CheckpointFeedback = { ...CHECKPOINT_FEEDBACK_A, ...CHECKPOINT_FEEDBACK_B };
const EXTRA: Record<string, BankItem[]> = { ...BANK_A, ...BANK_B };

function fromCheckpoint(id: StudyModuleId): CheckpointQuestion {
  const c = STUDY_MODULES[id].checkpoint;
  const lines = FEEDBACK[id] ?? [];
  const feedback: Record<number, string> = {};
  let k = 0;
  c.options.forEach((_, i) => {
    if (i === c.correctIndex) return;
    if (lines[k]) feedback[i] = lines[k];
    k++;
  });
  return {
    id: `${id}-q0`,
    prompt: c.question,
    options: [...c.options],
    correctIndex: c.correctIndex,
    explanation: c.explanation,
    feedback,
  };
}

function fromItem(id: StudyModuleId, n: number, item: BankItem): CheckpointQuestion {
  return {
    id: `${id}-q${n}`,
    prompt: item.prompt,
    options: [item.correct, ...item.wrong.map(([o]) => o)],
    correctIndex: 0,
    explanation: item.explanation,
    feedback: { 1: item.wrong[0][1], 2: item.wrong[1][1], 3: item.wrong[2][1] },
  };
}

/** All questions for a module: the original checkpoint first, then the bank items. */
export function getModuleQuestions(id: StudyModuleId): CheckpointQuestion[] {
  return [fromCheckpoint(id), ...(EXTRA[id] ?? []).map((item, i) => fromItem(id, i + 1, item))];
}

/**
 * Which question a round shows: rotates through the bank so consecutive rounds differ,
 * starting from a per-session offset so the first question is not always the same.
 */
export function pickQuestionIndex(total: number, round: number, sessionOffset: number): number {
  if (total <= 0) return 0;
  return (((sessionOffset + round) % total) + total) % total;
}
