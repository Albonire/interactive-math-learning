import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  EMPTY_GAME,
  LEVELS,
  daysGoalMet,
  grantAward,
  levelFor,
  newAchievements,
  recordAchievements,
  sanitizeGame,
  totalXp,
  xpOnDay,
  type GameState,
} from './gameProgress';

test('awards are idempotent: repeating an action never farms trazos', () => {
  let s = EMPTY_GAME;
  let r = grantAward(s, 'lab:M1', 10, '2026-11-28');
  assert.ok(r.granted);
  s = r.state;
  r = grantAward(s, 'lab:M1', 10, '2026-11-29');
  assert.equal(r.granted, false);
  assert.equal(r.state, s, 'state is returned untouched');
  assert.equal(totalXp(s), 10);
  // Invalid awards are ignored.
  assert.equal(grantAward(s, '', 10, '2026-11-28').granted, false);
  assert.equal(grantAward(s, 'x', 0, '2026-11-28').granted, false);
  assert.equal(grantAward(s, 'x', Number.NaN, '2026-11-28').granted, false);
});

test('daily totals and goal days', () => {
  let s: GameState = { ...EMPTY_GAME, goal: 20 };
  s = grantAward(s, 'a', 10, '2026-11-27').state;
  s = grantAward(s, 'b', 15, '2026-11-27').state;
  s = grantAward(s, 'c', 5, '2026-11-28').state;
  assert.equal(xpOnDay(s, '2026-11-27'), 25);
  assert.equal(xpOnDay(s, '2026-11-28'), 5);
  assert.equal(daysGoalMet(s), 1);
});

test('levels have increasing floors and progress stays within [0, 1]', () => {
  for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i].floor > LEVELS[i - 1].floor);
  assert.equal(levelFor(0).index, 0);
  assert.equal(levelFor(99).index, 0);
  assert.equal(levelFor(100).index, 1);
  const top = levelFor(99999);
  assert.equal(top.index, LEVELS.length - 1);
  assert.equal(top.next, null);
  assert.equal(top.progress, 1);
  assert.ok(Math.abs(levelFor(200).progress - 0.5) < 1e-9);
});

test('achievements unlock once and are remembered with their date', () => {
  let s = grantAward(EMPTY_GAME, 'ch:M3:0', 10, '2026-11-28').state;
  const ctx = { sealedCount: 1, completedPhases: 0, streak: 3 };
  const fresh = newAchievements(s, ctx).map((a) => a.id);
  assert.deepEqual(fresh, ['first-stroke', 'first-seal', 'streak-3']);
  s = recordAchievements(s, fresh, '2026-11-28');
  assert.deepEqual(newAchievements(s, ctx), []);
  // A streak that later breaks does not take the achievement away.
  assert.deepEqual(newAchievements(s, { ...ctx, streak: 0 }), []);
  assert.equal(s.achievements['streak-3'], '2026-11-28');
});

test('sanitizeGame drops hostile or broken data', () => {
  const clean = sanitizeGame({
    awards: {
      'lab:M1': { xp: 10, day: '2026-11-28' },
      huge: { xp: 1e9, day: '2026-11-28' },
      neg: { xp: -5, day: '2026-11-28' },
      badDay: { xp: 5, day: 'ayer' },
      ['x'.repeat(200)]: { xp: 5, day: '2026-11-28' },
    },
    goal: 999,
    achievements: { 'first-seal': '2026-11-28', invented: '2026-11-28', 'streak-3': 42 },
  });
  assert.deepEqual(Object.keys(clean.awards), ['lab:M1']);
  assert.equal(clean.goal, 40);
  assert.deepEqual(clean.achievements, { 'first-seal': '2026-11-28' });
  assert.deepEqual(sanitizeGame(null), EMPTY_GAME);
  assert.deepEqual(sanitizeGame('nope'), EMPTY_GAME);
});

test('every achievement has a unique id and readable text', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) assert.ok(a.title.length > 3 && a.detail.length > 10);
});

test('backups carry the game layer; older backups keep the local one', async () => {
  const { exportProgressJson, parseImportedProgressJson, createDefaultPersistedData } = await import('./localTelemetry');
  const game = { ...EMPTY_GAME, awards: { 'seal:M1': { xp: 30, day: '2026-11-28' } }, achievements: { 'first-seal': '2026-11-28' } };
  const json = exportProgressJson(createDefaultPersistedData(), [], { activeDays: [], reviews: {} }, game);
  const back = parseImportedProgressJson(json);
  assert.ok(back.ok && back.game && back.game.awards['seal:M1'].xp === 30);
  const legacy = JSON.parse(json);
  delete legacy.game;
  const old = parseImportedProgressJson(JSON.stringify(legacy));
  assert.ok(old.ok && old.game === null);
});

test('formatDay shows a short Spanish date without shifting the day', async () => {
  const { formatDay } = await import('../ui/GameHud');
  assert.match(formatDay('2026-11-28'), /^28 nov/);
  assert.match(formatDay('2026-01-01'), /^1 ene/);
  assert.equal(formatDay('roto'), 'roto');
});
