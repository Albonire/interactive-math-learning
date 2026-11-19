import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GUIDED_LESSONS,
  LESSON_ORDER,
  evaluateLessonProgress,
  getCoursePipelineStatus,
  type LessonEvalContext,
} from './lessons';

function baseCtx(overrides: Partial<LessonEvalContext> = {}): LessonEvalContext {
  return {
    sceneId: 'lin-span',
    params: { c1: 1.2, c2: 1.1, v3y: 1.0 },
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
    ...overrides,
  };
}

test('all 8 lessons are ordered continuously with 3 guided steps each', () => {
  assert.equal(LESSON_ORDER.length, 8);
  LESSON_ORDER.forEach((id, idx) => {
    const lesson = GUIDED_LESSONS[id];
    assert.equal(lesson.lessonNumber, idx + 1);
    assert.equal(lesson.steps.length, 3);
    assert.equal(lesson.prevSceneId, idx === 0 ? null : LESSON_ORDER[idx - 1]);
    assert.equal(lesson.nextSceneId, idx === 7 ? null : LESSON_ORDER[idx + 1]);
  });
});

test('Lesson 01.1 Span detects stretch, rank collapse, and exploded view', () => {
  const done = new Set<string>();
  const initial = evaluateLessonProgress('lin-span', baseCtx(), done);
  assert.deepEqual(initial, []);

  const afterStretch = evaluateLessonProgress(
    'lin-span',
    baseCtx({ params: { c1: 1.8, c2: 1.1, v3y: 1.0 } }),
    done
  );
  assert.ok(afterStretch.includes('span-stretch'));
  afterStretch.forEach((id) => done.add(id));

  const afterCollapse = evaluateLessonProgress(
    'lin-span',
    baseCtx({ params: { c1: 1.2, c2: 1.1, v3y: 0.1 } }),
    done
  );
  assert.ok(afterCollapse.includes('span-collapse'));

  const afterExplode = evaluateLessonProgress(
    'lin-span',
    baseCtx({ exploded: true }),
    done
  );
  assert.ok(afterExplode.includes('span-explode'));
});

test('Lesson 01.2 SVD detects stage pause and negative determinant orientation flip', () => {
  const done = new Set<string>();
  const res = evaluateLessonProgress(
    'lin-svd',
    baseCtx({
      sceneId: 'lin-svd',
      params: { a11: -1.1, a12: 0.2, a21: 0.1, a22: 1.0, a33: 1.0, svdStage: 1.4 },
    }),
    done
  );
  assert.ok(res.includes('svd-acts'));
  assert.ok(res.includes('svd-invert'));
});

test('Lesson 02.1 Partials detects critical point where gradient norm approaches zero', () => {
  const done = new Set<string>();
  const res = evaluateLessonProgress(
    'calc-partials',
    baseCtx({
      sceneId: 'calc-partials',
      params: { x0: -1.2, y0: 0.0, freq: 1.0 },
    }),
    done
  );
  assert.ok(res.includes('partials-critical'));
});

test('getCoursePipelineStatus tracks partial and full lesson completion across all 8 stages', () => {
  const done = new Set<string>(['span-stretch', 'span-collapse', 'span-explode', 'svd-acts']);
  const status = getCoursePipelineStatus(done);
  assert.equal(status.length, 8);
  assert.equal(status[0].completedSteps, 3);
  assert.equal(status[0].isComplete, true);
  assert.equal(status[1].completedSteps, 1);
  assert.equal(status[1].isComplete, false);
  assert.equal(status[2].completedSteps, 0);
});
