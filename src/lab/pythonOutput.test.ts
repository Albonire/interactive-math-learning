import test from 'node:test';
import assert from 'node:assert/strict';
import { capOutput, cleanTraceback, errorHint, insertIndent, preRunWarnings } from './pythonOutput';

test('capOutput leaves short output alone and reports how much was cut', () => {
  assert.equal(capOutput('hola'), 'hola');
  const long = 'x'.repeat(50);
  const capped = capOutput(long, 10);
  assert.ok(capped.startsWith('x'.repeat(10)));
  assert.match(capped, /40 caracteres más se omitieron/);
});

test('cleanTraceback keeps only the learner frames and the final error', () => {
  const raw = [
    'Traceback (most recent call last):',
    '  File "/lib/python312.zip/_pyodide/_base.py", line 523, in eval_code',
    '    .run(globals, locals)',
    '     ^^^^^^^^^^^^^^^^^^^^',
    '  File "<exec>", line 3, in <module>',
    '  File "<exec>", line 2, in f',
    'ZeroDivisionError: division by zero',
  ].join('\n');
  const cleaned = cleanTraceback(raw);
  assert.ok(!cleaned.includes('_pyodide'));
  assert.ok(!cleaned.includes('.run(globals'));
  assert.match(cleaned, /File "tu código", line 3/);
  assert.match(cleaned, /ZeroDivisionError: division by zero$/);
});

test('errorHint explains common errors and stays quiet on unknown ones', () => {
  assert.match(errorHint('SyntaxError: invalid syntax') ?? '', /paréntesis/);
  assert.match(errorHint('x\nRecursionError: maximum recursion depth exceeded') ?? '', /caso base/);
  assert.equal(errorHint('ValueError: boom'), null);
  assert.equal(errorHint(''), null);
});

test('preRunWarnings flags input() and unsupported scientific packages', () => {
  assert.equal(preRunWarnings('print(1)').length, 0);
  assert.equal(preRunWarnings('n = int(input("n: "))').length, 1);
  assert.equal(preRunWarnings('import numpy as np\nprint(np.pi)').length, 1);
  assert.equal(preRunWarnings('# import numpy no\nprint(1)').length, 0);
  // "input" as part of another identifier is fine.
  assert.equal(preRunWarnings('user_input = 3').length, 0);
});

test('insertIndent replaces the selection with four spaces', () => {
  assert.deepEqual(insertIndent('ab', 1, 1), { text: 'a    b', caret: 5 });
  assert.deepEqual(insertIndent('abcd', 1, 3), { text: 'a    d', caret: 5 });
});

test('worker output cap stays in sync and the worker file has no imports', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('./pyodide.worker.ts', import.meta.url), 'utf8');
  assert.ok(!/^\s*(import|export)\s/m.test(src), 'classic worker must not use import or export');
  const { MAX_OUTPUT_CHARS } = await import('./pythonOutput');
  assert.ok(src.includes(`WORKER_MAX_OUTPUT_CHARS = ${MAX_OUTPUT_CHARS.toLocaleString('en').replace(',', '_')}`));
});
