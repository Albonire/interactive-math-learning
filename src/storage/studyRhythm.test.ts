import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_RHYTHM,
  addDays,
  applyReviewResult,
  currentStreak,
  dueReviews,
  ensureScheduled,
  recordActivity,
  scheduleFirstReview,
} from './studyRhythm';

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

test('streak counts consecutive days and survives until the day ends', () => {
  let s = EMPTY_RHYTHM;
  for (const d of ['2026-11-25', '2026-11-26', '2026-11-27']) s = recordActivity(s, d);
  assert.equal(currentStreak(s, '2026-11-27'), 3);
  // Not studied yet today: yesterday's streak is still alive.
  assert.equal(currentStreak(s, '2026-11-28'), 3);
  // A full missed day breaks it.
  assert.equal(currentStreak(s, '2026-11-29'), 0);
  assert.equal(recordActivity(s, '2026-11-27'), s, 'recording the same day twice is a no-op');
});

test('reviews follow 1, 3, 7, 14, 30 days and a miss resets to 1 day', () => {
  let s = scheduleFirstReview(EMPTY_RHYTHM, 'M3', '2026-11-01');
  assert.equal(s.reviews.M3?.due, '2026-11-02');
  s = applyReviewResult(s, 'M3', '2026-11-02', true);
  assert.equal(s.reviews.M3?.due, '2026-11-05');
  s = applyReviewResult(s, 'M3', '2026-11-05', true);
  assert.equal(s.reviews.M3?.due, '2026-11-12');
  s = applyReviewResult(s, 'M3', '2026-11-12', false);
  assert.deepEqual(s.reviews.M3, { stage: 0, due: '2026-11-13' });
  for (let i = 0; i < 8; i++) s = applyReviewResult(s, 'M3', '2026-12-01', true);
  assert.equal(s.reviews.M3?.stage, 4, 'stage caps at the longest interval');
});

test('due reviews are listed most overdue first, and old seals get scheduled', () => {
  let s = ensureScheduled(EMPTY_RHYTHM, ['M5', 'M2'], '2026-11-01');
  s = scheduleFirstReview(s, 'M9', '2026-11-05');
  assert.deepEqual(new Set(dueReviews(s, '2026-11-02')), new Set(['M5', 'M2']));
  assert.deepEqual(dueReviews(s, '2026-11-06').slice(-1), ['M9']);
  assert.deepEqual(dueReviews(s, '2026-11-01'), []);
});

test('backups carry the study rhythm and import it sanitized', async () => {
  const { exportProgressJson, parseImportedProgressJson, createDefaultPersistedData } = await import('./localTelemetry');
  const rhythm = { activeDays: ['2026-11-26', '2026-11-27'], reviews: { M3: { stage: 2, due: '2026-12-04' } } };
  const json = exportProgressJson(createDefaultPersistedData(), ['a'], rhythm);
  const back = parseImportedProgressJson(json);
  assert.ok(back.ok);
  if (back.ok) assert.deepEqual(back.studyRhythm, rhythm);

  // Older backups have no rhythm: null means "keep the local one".
  const legacy = JSON.parse(json);
  delete legacy.studyRhythm;
  const old = parseImportedProgressJson(JSON.stringify(legacy));
  assert.ok(old.ok && old.studyRhythm === null);

  // Hostile or broken values are dropped, not trusted.
  legacy.studyRhythm = {
    activeDays: ['2026-11-27', 'not-a-date', 42],
    reviews: { M3: { stage: 99, due: '2026-12-04' }, M99: { stage: 0, due: '2026-12-01' }, M5: { stage: 1, due: '2026-12-01' } },
  };
  const bad = parseImportedProgressJson(JSON.stringify(legacy));
  assert.ok(bad.ok);
  if (bad.ok) assert.deepEqual(bad.studyRhythm, { activeDays: ['2026-11-27'], reviews: { M5: { stage: 1, due: '2026-12-01' } } });
});
