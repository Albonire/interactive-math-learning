/**
 * Game layer of the cartographer's notebook: "trazos" (XP), daily goal, levels and achievements.
 *
 * Design rules (see Sailer & Homner 2020: gamification helps when it is tied to learning and has
 * a narrative frame):
 *  - Trazos are only granted for actions that produce learning (solving a challenge step, finishing
 *    the 3D walkthrough, running the code, sealing, recalling in a spaced review, answering a new
 *    practice question right at first try).
 *  - Every award has a unique key and is granted at most once, so repeating an action cannot farm
 *    points. Reviews are keyed by day, so each due review counts once.
 *  - Achievements, once earned, are kept with their date.
 *
 * Pure functions (dates passed in as YYYY-MM-DD) + a small shared store, like studyRhythm.
 */
import { useCallback, useSyncExternalStore } from 'react';

export const DAILY_GOAL_OPTIONS = [20, 40, 60] as const;
export type DailyGoal = (typeof DAILY_GOAL_OPTIONS)[number];

export const XP = {
  challengeStep: 10,
  story: 5,
  lab: 10,
  seal: 30,
  review: 20,
  practice: 5,
} as const;

export interface AwardEntry {
  xp: number;
  day: string;
}

export interface GameState {
  awards: Record<string, AwardEntry>;
  goal: DailyGoal;
  achievements: Record<string, string>;
}

export const EMPTY_GAME: GameState = { awards: {}, goal: 40, achievements: {} };

export const LEVELS = [
  { name: 'Primer trazo', floor: 0 },
  { name: 'Boceto', floor: 100 },
  { name: 'Plano', floor: 300 },
  { name: 'Mapa', floor: 650 },
  { name: 'Atlas', floor: 1200 },
] as const;

export function grantAward(
  state: GameState,
  key: string,
  xp: number,
  today: string
): { state: GameState; granted: boolean } {
  if (!key || state.awards[key] || !(xp > 0)) return { state, granted: false };
  return { state: { ...state, awards: { ...state.awards, [key]: { xp, day: today } } }, granted: true };
}

export function totalXp(state: GameState): number {
  return Object.values(state.awards).reduce((a, e) => a + e.xp, 0);
}

export function xpOnDay(state: GameState, day: string): number {
  return Object.values(state.awards).reduce((a, e) => a + (e.day === day ? e.xp : 0), 0);
}

export function levelFor(total: number): { index: number; name: string; floor: number; next: number | null; progress: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (total >= LEVELS[i].floor) index = i;
  const floor = LEVELS[index].floor;
  const next = index + 1 < LEVELS.length ? LEVELS[index + 1].floor : null;
  const progress = next === null ? 1 : (total - floor) / (next - floor);
  return { index, name: LEVELS[index].name, floor, next, progress: Math.max(0, Math.min(1, progress)) };
}

/** Days on which the daily goal was met (for the "constancia" achievement). */
export function daysGoalMet(state: GameState): number {
  const per = new Map<string, number>();
  for (const e of Object.values(state.awards)) per.set(e.day, (per.get(e.day) ?? 0) + e.xp);
  let n = 0;
  per.forEach((xp) => {
    if (xp >= state.goal) n++;
  });
  return n;
}

export interface AchievementSpec {
  id: string;
  title: string;
  detail: string;
  earned: (s: GameState, ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  sealedCount: number;
  completedPhases: number;
  streak: number;
}

const countPrefix = (s: GameState, prefix: string) => Object.keys(s.awards).filter((k) => k.startsWith(prefix)).length;

export const ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'first-stroke', title: 'Primer trazo', detail: 'Ganaste tus primeros trazos.', earned: (s) => Object.keys(s.awards).length > 0 },
  { id: 'first-seal', title: 'Sello inaugural', detail: 'Sellaste tu primer módulo.', earned: (_s, c) => c.sealedCount >= 1 },
  { id: 'five-seals', title: 'Cinco regiones', detail: 'Cinco módulos sellados.', earned: (_s, c) => c.sealedCount >= 5 },
  { id: 'phase-done', title: 'Fase cartografiada', detail: 'Completaste una fase entera del plan.', earned: (_s, c) => c.completedPhases >= 1 },
  { id: 'challenge-10', title: 'Ojo de cartógrafo', detail: 'Resolviste 10 pasos de retos de intuición.', earned: (s) => countPrefix(s, 'ch:') >= 10 },
  { id: 'lab-5', title: 'Laboratorio propio', detail: 'Ejecutaste el código de 5 módulos.', earned: (s) => countPrefix(s, 'lab:') >= 5 },
  { id: 'review-5', title: 'Memoria de largo plazo', detail: 'Recordaste 5 repasos espaciados a la primera.', earned: (s) => countPrefix(s, 'review:') >= 5 },
  { id: 'streak-3', title: 'Tres días seguidos', detail: 'Estudiaste 3 días consecutivos.', earned: (_s, c) => c.streak >= 3 },
  { id: 'streak-7', title: 'Una semana entera', detail: 'Estudiaste 7 días consecutivos.', earned: (_s, c) => c.streak >= 7 },
  { id: 'goal-7', title: 'Constancia', detail: 'Cumpliste tu meta diaria en 7 días distintos.', earned: (s) => daysGoalMet(s) >= 7 },
];

/** Achievements earned now that were not stored yet (stable order). */
export function newAchievements(state: GameState, ctx: AchievementContext): AchievementSpec[] {
  return ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && a.earned(state, ctx));
}

export function recordAchievements(state: GameState, ids: string[], today: string): GameState {
  if (ids.length === 0) return state;
  const achievements = { ...state.achievements };
  for (const id of ids) achievements[id] ??= today;
  return { ...state, achievements };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates untrusted data (storage or an imported backup). */
export function sanitizeGame(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return EMPTY_GAME;
  const r = raw as Partial<GameState>;
  const awards: Record<string, AwardEntry> = {};
  if (r.awards && typeof r.awards === 'object') {
    for (const [k, v] of Object.entries(r.awards)) {
      const e = v as Partial<AwardEntry>;
      if (k.length <= 80 && typeof e?.xp === 'number' && e.xp > 0 && e.xp <= 100 && typeof e.day === 'string' && DAY_RE.test(e.day)) {
        awards[k] = { xp: e.xp, day: e.day };
      }
    }
  }
  const goal = (DAILY_GOAL_OPTIONS as readonly number[]).includes(r.goal as number) ? (r.goal as DailyGoal) : 40;
  const achievements: Record<string, string> = {};
  if (r.achievements && typeof r.achievements === 'object') {
    const known = new Set(ACHIEVEMENTS.map((a) => a.id));
    for (const [k, v] of Object.entries(r.achievements)) {
      if (known.has(k) && typeof v === 'string' && DAY_RE.test(v)) achievements[k] = v;
    }
  }
  return { awards, goal, achievements };
}

// ── Shared store ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'bibifold_game_v1';
let current: GameState | null = null;
const listeners = new Set<() => void>();

function load(): GameState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeGame(JSON.parse(raw)) : EMPTY_GAME;
  } catch {
    return EMPTY_GAME;
  }
}

function getGame(): GameState {
  if (current === null) current = typeof window === 'undefined' ? EMPTY_GAME : load();
  return current;
}

function setGame(next: GameState): void {
  if (next === getGame()) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked: progress lives for this session only.
  }
  listeners.forEach((l) => l());
}

export function getGameSnapshot(): GameState {
  return getGame();
}

export function replaceGame(next: GameState): void {
  setGame(sanitizeGame(next));
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Local calendar day (same convention as studyRhythm). */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useGameProgress() {
  const state = useSyncExternalStore(subscribe, getGame, () => EMPTY_GAME);
  const award = useCallback((key: string, xp: number): boolean => {
    const res = grantAward(getGame(), key, xp, today());
    if (res.granted) setGame(res.state);
    return res.granted;
  }, []);
  const setGoal = useCallback((goal: DailyGoal) => setGame({ ...getGame(), goal }), []);
  /** Stores newly earned achievements and returns them (for the celebration toast). */
  const syncAchievements = useCallback((ctx: AchievementContext): AchievementSpec[] => {
    const fresh = newAchievements(getGame(), ctx);
    if (fresh.length) setGame(recordAchievements(getGame(), fresh.map((a) => a.id), today()));
    return fresh;
  }, []);
  const total = totalXp(state);
  return {
    state,
    total,
    todayXp: xpOnDay(state, today()),
    level: levelFor(total),
    has: (key: string) => Boolean(state.awards[key]),
    award,
    setGoal,
    syncAchievements,
  };
}
