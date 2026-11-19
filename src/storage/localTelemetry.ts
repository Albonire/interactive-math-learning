import type { BktSkillState, SkillId } from '../core/types';
import { createInitialBktMap } from '../ai/bktEngine';
import { createInitialBanditState, type LinUcbState } from '../ai/contextualBandit';

const STORAGE_KEY = 'bibifold_progress_state_v2';

export interface PersistedAiData {
  version: 2;
  bkt: Record<SkillId, BktSkillState>;
  bandit: LinUcbState;
  lastErrorBySkill: Partial<Record<SkillId, number>>;
}

export function createDefaultPersistedData(): PersistedAiData {
  return {
    version: 2,
    bkt: createInitialBktMap(),
    bandit: createInitialBanditState(),
    lastErrorBySkill: {},
  };
}

export function loadPersistedAiData(): PersistedAiData {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultPersistedData();
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultPersistedData();
    const parsed = JSON.parse(raw) as Partial<PersistedAiData>;
    if (parsed.version !== 2 || !parsed.bkt || !parsed.bandit) {
      return createDefaultPersistedData();
    }
    return {
      version: 2,
      bkt: { ...createInitialBktMap(), ...parsed.bkt },
      bandit: parsed.bandit,
      lastErrorBySkill: parsed.lastErrorBySkill ?? {},
    };
  } catch {
    return createDefaultPersistedData();
  }
}

export function savePersistedAiData(data: PersistedAiData): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or restricted storage; fail gracefully
  }
}
