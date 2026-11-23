import type { BktSkillState, SceneId, SkillId } from '../core/types';
import { createInitialBktMap, DEFAULT_HALF_LIFE_DAYS } from '../ai/bktEngine';
import { createInitialBanditState, type LinUcbState } from '../ai/contextualBandit';

const STORAGE_KEY_V3 = 'bibifold_progress_state_v3';
const STORAGE_KEY_V2 = 'bibifold_progress_state_v2';

export interface PersistedAiData {
  version: 3;
  bkt: Record<SkillId, BktSkillState>;
  bandit: LinUcbState;
  lastErrorBySkill: Partial<Record<SkillId, number>>;
  completedSymbolicScenes: SceneId[];
  completedCodeLabScenes: SceneId[];
  updatedAt: number;
}

export interface PortableProgressBundle {
  schema: 'bibifold-progress';
  version: 3;
  exportedAt: string;
  aiData: PersistedAiData;
  completedStepIds: string[];
}

export function createDefaultPersistedData(): PersistedAiData {
  return {
    version: 3,
    bkt: createInitialBktMap(),
    bandit: createInitialBanditState(),
    lastErrorBySkill: {},
    completedSymbolicScenes: [],
    completedCodeLabScenes: [],
    updatedAt: Date.now(),
  };
}

/**
 * Pure schema migration helper upgrading v2 or partial v3 objects safely to v3
 * without losing learner BKT mastery or contextual bandit weights.
 */
export function migratePersistedAiData(raw: unknown): PersistedAiData {
  const defaults = createDefaultPersistedData();
  if (!raw || typeof raw !== 'object') return defaults;

  const obj = raw as Record<string, unknown>;
  const ver = obj.version;
  if (ver !== 2 && ver !== 3) return defaults;

  const rawBkt = obj.bkt && typeof obj.bkt === 'object' ? (obj.bkt as Partial<Record<SkillId, Partial<BktSkillState>>>) : null;
  const rawBandit = obj.bandit && typeof obj.bandit === 'object' ? (obj.bandit as LinUcbState) : null;
  if (!rawBkt || !rawBandit) return defaults;

  const mergedBkt = createInitialBktMap();
  for (const skillId of Object.keys(mergedBkt) as SkillId[]) {
    const incoming = rawBkt[skillId];
    if (incoming && typeof incoming.pL === 'number') {
      mergedBkt[skillId] = {
        ...mergedBkt[skillId],
        ...incoming,
        skillId,
        halfLifeDays: incoming.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS,
      };
    }
  }

  const validScenes = (val: unknown): SceneId[] =>
    Array.isArray(val) ? (val.filter((x) => typeof x === 'string') as SceneId[]) : [];

  return {
    version: 3,
    bkt: mergedBkt,
    bandit: rawBandit,
    lastErrorBySkill:
      obj.lastErrorBySkill && typeof obj.lastErrorBySkill === 'object'
        ? (obj.lastErrorBySkill as Partial<Record<SkillId, number>>)
        : {},
    completedSymbolicScenes: validScenes(obj.completedSymbolicScenes),
    completedCodeLabScenes: validScenes(obj.completedCodeLabScenes),
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
  };
}

export function loadPersistedAiData(): PersistedAiData {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return createDefaultPersistedData();
    }
    const rawV3 = window.localStorage.getItem(STORAGE_KEY_V3);
    if (rawV3) {
      return migratePersistedAiData(JSON.parse(rawV3));
    }
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const migrated = migratePersistedAiData(JSON.parse(rawV2));
      savePersistedAiData(migrated);
      return migrated;
    }
    return createDefaultPersistedData();
  } catch {
    return createDefaultPersistedData();
  }
}

export function savePersistedAiData(data: PersistedAiData): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const payload: PersistedAiData = {
      ...data,
      version: 3,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(payload));
  } catch {
    // Quota exceeded or restricted storage; fail gracefully
  }
}

export function exportProgressJson(
  aiData: PersistedAiData,
  completedStepIds: Iterable<string>
): string {
  const bundle: PortableProgressBundle = {
    schema: 'bibifold-progress',
    version: 3,
    exportedAt: new Date().toISOString(),
    aiData,
    completedStepIds: Array.from(completedStepIds),
  };
  return JSON.stringify(bundle, null, 2);
}

export function parseImportedProgressJson(rawJson: string): {
  ok: true;
  aiData: PersistedAiData;
  completedStepIds: string[];
} | {
  ok: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(rawJson) as Partial<PortableProgressBundle>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'El archivo no contiene un objeto JSON válido.' };
    }
    if (parsed.schema !== 'bibifold-progress' || !parsed.aiData) {
      return { ok: false, error: 'Formato incompatible: se esperaba un respaldo de BIBIFOLD.' };
    }
    const migrated = migratePersistedAiData(parsed.aiData);
    const steps = Array.isArray(parsed.completedStepIds)
      ? parsed.completedStepIds.filter((s): s is string => typeof s === 'string')
      : [];
    return { ok: true, aiData: migrated, completedStepIds: steps };
  } catch {
    return { ok: false, error: 'No se pudo leer el JSON. Verifica que no esté dañado.' };
  }
}
