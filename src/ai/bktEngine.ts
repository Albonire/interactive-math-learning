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
    };
  }
  return map;
}

/**
 * Exact Bayesian Knowledge Tracing update:
 *   P(L_t | O_t = 1) = [P(L_t)(1 - P(S))] / [P(L_t)(1 - P(S)) + (1 - P(L_t))P(G)]
 *   P(L_t | O_t = 0) = [P(L_t)P(S)]       / [P(L_t)P(S) + (1 - P(L_t))(1 - P(G))]
 *   P(L_{t+1})       = P(L_t | O_t) + (1 - P(L_t | O_t)) * P(T)
 */
export function updateBktSkill(state: BktSkillState, observedCorrect: boolean): BktSkillState {
  const { pL, pT, pG, pS } = state;

  let posterior: number;
  if (observedCorrect) {
    const num = pL * (1 - pS);
    const den = num + (1 - pL) * pG;
    posterior = den > 1e-12 ? num / den : pL;
  } else {
    const num = pL * pS;
    const den = num + (1 - pL) * (1 - pG);
    posterior = den > 1e-12 ? num / den : pL;
  }

  const nextPL = Math.max(0.02, Math.min(0.99, posterior + (1 - posterior) * pT));

  return {
    ...state,
    pL: nextPL,
    attempts: state.attempts + 1,
    correctCount: state.correctCount + (observedCorrect ? 1 : 0),
  };
}

export function getMasteryDescriptor(pL: number): string {
  if (pL >= 0.85) return 'Consolidado';
  if (pL >= 0.6) return 'En progreso sólido';
  if (pL >= 0.35) return 'En formación';
  return 'Exploración inicial';
}
