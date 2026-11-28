/**
 * Study rhythm: daily streak + spaced retrieval of mastered modules.
 *
 * Why: retrieving something you learned, at growing intervals, is one of the most reliable ways to
 * make it stick (the spacing and testing effects). A sealed module therefore comes back for a quick
 * re-check of its R-OM question after 1, 3, 7, 14 and 30 days. A miss sends it back to 1 day.
 *
 * Stored under its own localStorage key so it never collides with the main progress state.
 * All logic is pure (dates are passed in as YYYY-MM-DD strings) so it is unit-testable.
 */
import { useCallback, useEffect, useState } from 'react';
import type { StudyModuleId } from '../core/studyPlanTypes';

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
const STORAGE_KEY = 'bibifold_study_rhythm_v1';
const MAX_DAYS_KEPT = 120;

export interface ReviewEntry {
  /** Index into REVIEW_INTERVALS_DAYS of the interval that is currently running. */
  stage: number;
  /** Day (YYYY-MM-DD) on which the module is due again. */
  due: string;
}

export interface StudyRhythmState {
  /** Distinct days (YYYY-MM-DD, ascending) with at least one real study action. */
  activeDays: string[];
  reviews: Partial<Record<StudyModuleId, ReviewEntry>>;
}

export const EMPTY_RHYTHM: StudyRhythmState = { activeDays: [], reviews: {} };

/** Local calendar day as YYYY-MM-DD (not UTC: a streak follows the learner's own midnight). */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return localDay(dt);
}

export function recordActivity(state: StudyRhythmState, today: string): StudyRhythmState {
  if (state.activeDays.includes(today)) return state;
  const activeDays = [...state.activeDays, today].sort().slice(-MAX_DAYS_KEPT);
  return { ...state, activeDays };
}

/**
 * Consecutive active days ending today, or ending yesterday if today has no activity yet
 * (the streak is still alive until the day is over).
 */
export function currentStreak(state: StudyRhythmState, today: string): number {
  const set = new Set(state.activeDays);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

/** A module was just sealed: first re-check tomorrow. */
export function scheduleFirstReview(state: StudyRhythmState, id: StudyModuleId, today: string): StudyRhythmState {
  return { ...state, reviews: { ...state.reviews, [id]: { stage: 0, due: addDays(today, REVIEW_INTERVALS_DAYS[0]) } } };
}

/** Result of a due review. Correct at first try → next, longer interval. Miss → back to 1 day. */
export function applyReviewResult(
  state: StudyRhythmState,
  id: StudyModuleId,
  today: string,
  correctFirstTry: boolean
): StudyRhythmState {
  const prev = state.reviews[id];
  const stage = correctFirstTry
    ? Math.min(REVIEW_INTERVALS_DAYS.length - 1, (prev?.stage ?? -1) + 1)
    : 0;
  return { ...state, reviews: { ...state.reviews, [id]: { stage, due: addDays(today, REVIEW_INTERVALS_DAYS[stage]) } } };
}

/** Sealed modules without a schedule (e.g. sealed before this feature existed) get one. */
export function ensureScheduled(
  state: StudyRhythmState,
  sealed: Iterable<StudyModuleId>,
  today: string
): StudyRhythmState {
  let next = state;
  for (const id of sealed) {
    if (!next.reviews[id]) next = scheduleFirstReview(next, id, today);
  }
  return next;
}

export function isDue(state: StudyRhythmState, id: StudyModuleId, today: string): boolean {
  const r = state.reviews[id];
  return Boolean(r && r.due <= today);
}

/** Due modules, most overdue first. */
export function dueReviews(state: StudyRhythmState, today: string): StudyModuleId[] {
  return (Object.entries(state.reviews) as Array<[StudyModuleId, ReviewEntry]>)
    .filter(([, r]) => r.due <= today)
    .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : 0))
    .map(([id]) => id);
}

function load(): StudyRhythmState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_RHYTHM;
    const parsed = JSON.parse(raw) as Partial<StudyRhythmState>;
    const activeDays = Array.isArray(parsed.activeDays)
      ? parsed.activeDays.filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];
    const reviews: StudyRhythmState['reviews'] = {};
    if (parsed.reviews && typeof parsed.reviews === 'object') {
      for (const [k, v] of Object.entries(parsed.reviews)) {
        const e = v as Partial<ReviewEntry>;
        if (/^M([1-9]|[12]\d|3[0-2])$/.test(k) && typeof e?.stage === 'number' && typeof e.due === 'string') {
          reviews[k as StudyModuleId] = { stage: e.stage, due: e.due };
        }
      }
    }
    return { activeDays, reviews };
  } catch {
    return EMPTY_RHYTHM;
  }
}

function save(state: StudyRhythmState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota: the rhythm simply is not remembered.
  }
}

/** React binding. `today` is recomputed per render so a session crossing midnight stays correct. */
export function useStudyRhythm(sealed: ReadonlySet<StudyModuleId>) {
  const [state, setState] = useState<StudyRhythmState>(load);
  const today = localDay();

  useEffect(() => {
    setState((s) => ensureScheduled(s, sealed, localDay()));
  }, [sealed]);

  useEffect(() => {
    save(state);
  }, [state]);

  const markActive = useCallback(() => setState((s) => recordActivity(s, localDay())), []);
  const onSealed = useCallback(
    (id: StudyModuleId) => setState((s) => scheduleFirstReview(recordActivity(s, localDay()), id, localDay())),
    []
  );
  const onReviewed = useCallback(
    (id: StudyModuleId, correctFirstTry: boolean) =>
      setState((s) => applyReviewResult(recordActivity(s, localDay()), id, localDay(), correctFirstTry)),
    []
  );

  return {
    streak: currentStreak(state, today),
    activeToday: state.activeDays.includes(today),
    due: dueReviews(state, today),
    isDue: (id: StudyModuleId) => isDue(state, id, today),
    stageOf: (id: StudyModuleId) => state.reviews[id]?.stage ?? null,
    markActive,
    onSealed,
    onReviewed,
  };
}
