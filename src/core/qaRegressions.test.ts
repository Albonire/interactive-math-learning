import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from './curriculum';
import { LESSON_ORDER, evaluateLessonProgress } from './lessons';
import { LESSON_INTROS } from './lessonIntros';
import { evaluateAutoDiffDag } from '../math/multivariable';
import {
  createDefaultPersistedData,
  exportProgressJson,
  migratePersistedAiData,
  parseImportedProgressJson,
} from '../storage/localTelemetry';

describe('QA Regression Guards — Zero False Auto-Completion & Schema v3 Persistence', () => {
  it('completes ZERO steps at default parameters and clean state across all 8 lessons', () => {
    for (const sceneId of LESSON_ORDER) {
      const defaults: Record<string, number> = {};
      for (const p of SCENES[sceneId].defaultParams) {
        defaults[p.id] = p.value;
      }

      const newlyCompleted = evaluateLessonProgress(
        sceneId,
        {
          sceneId,
          params: defaults,
          exploded: false,
          activation: 'tanh',
          dataset: 'rings',
          landscape: 'rosenbrock',
          autoDiffPass: 'idle',
          optimizerSteps: 0,
          optimizerRunning: false,
          symbolicGen: 0,
          symbolicTargetIdx: 0,
          inspectorOpened: false,
          challengeOpened: false,
        },
        new Set()
      );

      assert.deepEqual(
        newlyCompleted,
        [],
        `Lesson ${sceneId} unexpectedly auto-completed steps at defaults: ${newlyCompleted.join(', ')}`
      );
    }
  });

  it('assigns a valid focusedLayerId on Intro Beat 2 for all 8 lessons so Beat 2 re-traces the hero layer', () => {
    for (const sceneId of LESSON_ORDER) {
      const beat2 = LESSON_INTROS[sceneId].beats[1];
      const layerIds = new Set(SCENES[sceneId].defaultLayers.map((l) => l.id));
      assert.ok(
        beat2.stageState.focusedLayerId && layerIds.has(beat2.stageState.focusedLayerId),
        `Lesson ${sceneId} Beat 2 should target a valid anatomy layer for re-tracing`
      );
    }
  });

  it('produces all 8 expected AutoDiff DAG node IDs matching the 2D DAG layout', () => {
    const snap = evaluateAutoDiffDag(0.7, 0.6, 1.6, 'forward');
    const ids = snap.nodes.map((n) => n.id);
    assert.deepEqual(ids, ['x', 'y', 'w', 'v1', 'v2', 'v3', 'v4', 'out']);
    assert.equal(snap.activePass, 'forward');
  });

  it('persists, migrates, exports, and re-imports completed3DChallengeScenes, lastSceneId, and seenIntroScenes', () => {
    const base = createDefaultPersistedData();
    const enriched = {
      ...base,
      completed3DChallengeScenes: ['lin-span' as const, 'lin-eigen' as const],
      lastSceneId: 'calc-autodiff' as const,
      seenIntroScenes: ['lin-span' as const, 'calc-autodiff' as const],
    };

    const json = exportProgressJson(enriched, ['span-stretch']);
    const parsed = parseImportedProgressJson(json);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.deepEqual(parsed.aiData.completed3DChallengeScenes, ['lin-span', 'lin-eigen']);
      assert.equal(parsed.aiData.lastSceneId, 'calc-autodiff');
      assert.deepEqual(parsed.aiData.seenIntroScenes, ['lin-span', 'calc-autodiff']);
    }

    // Legacy v3 object missing the new fields migrates cleanly without losing existing fields
    const legacyV3 = {
      version: 3,
      bkt: base.bkt,
      bandit: base.bandit,
      lastErrorBySkill: {},
      completedSymbolicScenes: ['lin-span'],
      completedCodeLabScenes: ['lin-span'],
      updatedAt: Date.now(),
    };
    const migrated = migratePersistedAiData(legacyV3);
    assert.deepEqual(migrated.completed3DChallengeScenes, []);
    assert.equal(migrated.lastSceneId, undefined);
    assert.deepEqual(migrated.seenIntroScenes, []);
    assert.deepEqual(migrated.completedSymbolicScenes, ['lin-span']);
  });
});
