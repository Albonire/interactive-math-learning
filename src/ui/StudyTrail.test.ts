import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendedNext } from './StudyTrail';

test('recommended next station respects prerequisites, not just numbering', () => {
  assert.equal(recommendedNext(new Set()), 'M1');
  assert.equal(recommendedNext(new Set(['M1'])), 'M2');
  // With M1-M3 done, M4 (needs M3) is next; M5 needs only M2, but M4 comes first in the plan.
  assert.equal(recommendedNext(new Set(['M1', 'M2', 'M3'])), 'M4');
});
