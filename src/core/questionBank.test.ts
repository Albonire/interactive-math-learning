import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_MODULES_LIST } from './studyPlan';
import { getModuleQuestions, pickQuestionIndex } from './questionBank';

test('every module has at least three questions with feedback for each wrong option', () => {
  for (const m of STUDY_MODULES_LIST) {
    const qs = getModuleQuestions(m.id);
    assert.ok(qs.length >= 3, `${m.id} has ${qs.length} questions`);
    for (const q of qs) {
      assert.equal(q.options.length, 4, `${q.id} options`);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
      for (let i = 0; i < 4; i++) {
        if (i === q.correctIndex) continue;
        assert.ok(q.feedback[i] && q.feedback[i].length > 25, `${q.id} missing feedback for option ${i}`);
      }
      assert.ok(q.explanation.length > 20, `${q.id} explanation`);
    }
  }
});

test('R-OM: the correct option is not given away by its length', () => {
  for (const m of STUDY_MODULES_LIST) {
    for (const q of getModuleQuestions(m.id)) {
      const lens = q.options.map((o) => o.length);
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      const ratio = lens[q.correctIndex] / mean;
      assert.ok(ratio < 1.3 && ratio > 0.7, `${q.id}: correct option is ${ratio.toFixed(2)}× the mean length`);
    }
  }
});

test('no duplicated prompts or options across the whole bank', () => {
  const prompts = new Set<string>();
  for (const m of STUDY_MODULES_LIST) {
    for (const q of getModuleQuestions(m.id)) {
      assert.ok(!prompts.has(q.prompt), `duplicated prompt: ${q.prompt}`);
      prompts.add(q.prompt);
      assert.equal(new Set(q.options).size, 4, `${q.id} repeats an option`);
    }
  }
});

test('feedback never quotes the correct option verbatim', () => {
  for (const m of STUDY_MODULES_LIST) {
    for (const q of getModuleQuestions(m.id)) {
      const correct = q.options[q.correctIndex].toLowerCase();
      for (const f of Object.values(q.feedback)) {
        assert.ok(!f.toLowerCase().includes(correct.slice(0, 40)), `${q.id} feedback reveals the answer`);
      }
    }
  }
});

test('question rotation visits every question before repeating', () => {
  const seen = new Set<number>();
  for (let r = 0; r < 3; r++) seen.add(pickQuestionIndex(3, r, 7));
  assert.equal(seen.size, 3);
  assert.equal(pickQuestionIndex(3, 3, 7), pickQuestionIndex(3, 0, 7));
});

test('R-OM across the bank: the correct option is the longest about as often as chance', () => {
  let longest = 0;
  let total = 0;
  for (const m of STUDY_MODULES_LIST) {
    for (const q of getModuleQuestions(m.id)) {
      const lens = q.options.map((o) => o.length);
      total++;
      if (lens[q.correctIndex] === Math.max(...lens)) longest++;
    }
  }
  // Chance is 25 %; a learner must not be able to win by always picking the longest option.
  assert.ok(longest / total < 0.35, `correct is longest in ${longest}/${total}`);
});
