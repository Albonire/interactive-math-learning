import type { BktSkillState, SkillId } from '../core/types';

export const SKILL_IDS: SkillId[] = [
  'lin_span_rank',
  'lin_det_collapse',
  'lin_eigen_dir',
  'lin_manifold_nonlin',
  'calc_partial_slice',
  'calc_chain_autodiff',
  'calc_lr_stability',
  'calc_symbolic_fit',
];

const MS_PER_DAY = 86_400_000;
export const DEFAULT_HALF_LIFE_DAYS = 21;

export function createInitialBktMap(): Record<SkillId, BktSkillState> {
  const map = {} as Record<SkillId, BktSkillState>;
  for (const skillId of SKILL_IDS) {
    map[skillId] = {
      skillId,
      pL: 0.25,
      pL0: 0.25,
      pT: 0.18,
      pG: 0.15,
      pS: 0.1,
      attempts: 0,
      correctCount: 0,
      halfLifeDays: DEFAULT_HALF_LIFE_DAYS,
    };
  }
  return map;
}

/**
 * Exact Bayesian Knowledge Tracing update with FSRS-lite half-life memory tracking:
 *   P(L_t | O_t = 1) = [P(L_t)(1 - P(S))] / [P(L_t)(1 - P(S)) + (1 - P(L_t))P(G)]
 *   P(L_t | O_t = 0) = [P(L_t)P(S)]       / [P(L_t)P(S) + (1 - P(L_t))(1 - P(G))]
 *   P(L_{t+1})       = P(L_t | O_t) + (1 - P(L_t | O_t)) * P(T)
 */
export function updateBktSkill(
  state: BktSkillState,
  observedCorrect: boolean,
  nowMs: number = Date.now()
): BktSkillState {
  const { pT, pG, pS } = state;
  const effectivePL = computeDecayedMastery(state, nowMs);

  let posterior: number;
  if (observedCorrect) {
    const num = effectivePL * (1 - pS);
    const den = num + (1 - effectivePL) * pG;
    posterior = den > 1e-12 ? num / den : effectivePL;
  } else {
    const num = effectivePL * pS;
    const den = num + (1 - effectivePL) * (1 - pG);
    posterior = den > 1e-12 ? num / den : effectivePL;
  }

  const nextPL = Math.max(0.02, Math.min(0.99, posterior + (1 - posterior) * pT));
  const prevHalfLife = state.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  const nextHalfLife = observedCorrect
    ? Math.min(90, Math.round(prevHalfLife * 1.25))
    : Math.max(7, Math.round(prevHalfLife * 0.72));

  return {
    ...state,
    pL: nextPL,
    attempts: state.attempts + 1,
    correctCount: state.correctCount + (observedCorrect ? 1 : 0),
    lastPracticedAt: nowMs,
    halfLifeDays: nextHalfLife,
  };
}

/**
 * FSRS-lite exponential mastery decay toward baseline prior pL0 as days pass without practice.
 * Returns raw pL when practiced recently or when no timestamp is present.
 */
export function computeDecayedMastery(
  state: BktSkillState,
  nowMs: number = Date.now()
): number {
  if (!state.lastPracticedAt || state.attempts === 0) {
    return state.pL;
  }
  const elapsedDays = Math.max(0, (nowMs - state.lastPracticedAt) / MS_PER_DAY);
  if (elapsedDays <= 1) return state.pL;

  const halfLife = Math.max(5, state.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS);
  const retention = Math.pow(0.5, elapsedDays / halfLife);
  const floor = Math.min(state.pL, state.pL0);
  return Math.max(0.02, Math.min(0.99, floor + (state.pL - floor) * retention));
}

/**
 * Flags a previously practiced skill for gentle spaced repetition review once retention drops
 * or 21+ days have elapsed since the last practice session.
 */
export function needsSpacedReview(
  state: BktSkillState,
  nowMs: number = Date.now(),
  reviewWindowDays: number = DEFAULT_HALF_LIFE_DAYS
): boolean {
  if (!state.lastPracticedAt || state.attempts === 0) return false;
  const elapsedDays = (nowMs - state.lastPracticedAt) / MS_PER_DAY;
  if (elapsedDays >= reviewWindowDays) return true;
  const decayed = computeDecayedMastery(state, nowMs);
  return state.pL >= 0.65 && decayed < 0.55;
}

export function getMasteryDescriptor(pL: number): string {
  if (pL >= 0.85) return 'Consolidado';
  if (pL >= 0.6) return 'En progreso sólido';
  if (pL >= 0.35) return 'En formación';
  return 'Exploración inicial';
}
