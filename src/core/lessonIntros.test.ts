import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSON_INTROS } from './lessonIntros';
import { LESSON_ORDER } from './lessons';

test('all 8 lessons have a 4-beat beginner-friendly theory intro with live 3D choreography', () => {
  for (let i = 0; i < LESSON_ORDER.length; i++) {
    const id = LESSON_ORDER[i];
    const intro = LESSON_INTROS[id];
    assert.ok(intro, `Missing intro spec for ${id}`);
    assert.equal(intro.lessonNumber, i + 1);
    assert.equal(intro.beats.length, 4, `Expected 4 beats for ${id}`);

    // Beat 2 explains the parts of the 3D graphic
    assert.ok(
      intro.beats[1].parts && intro.beats[1].parts.length >= 3,
      `Beat 2 of ${id} should explain at least 3 visual parts of the graphic`
    );

    // Beat 4 demystifies the formula and real-world engineering intuition
    assert.ok(intro.beats[3].formula?.latex, `Beat 4 of ${id} should include KaTeX formula`);
    assert.ok(
      intro.beats[3].formula && intro.beats[3].formula.breakdown.length >= 3,
      `Beat 4 of ${id} should break down the formula symbols`
    );
    assert.ok(intro.beats[3].realWorldNote, `Beat 4 of ${id} should include a real-world note`);

    for (const beat of intro.beats) {
      assert.ok(beat.headline.length > 5);
      assert.ok(beat.narration.length > 40);
      assert.ok(beat.durationMs >= 13000, `Expected calmer reading duration (>= 13000ms) for ${beat.id}`);
      assert.ok(beat.stageState !== undefined);
    }
  }
});
