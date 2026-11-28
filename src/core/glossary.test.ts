import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GLOSSARY_ENTRIES,
  getGlossaryEntryById,
  tokenizeGlossaryText,
} from './glossary';

test('glossary catalog has rich coverage and unique ids', () => {
  assert.ok(GLOSSARY_ENTRIES.length >= 25);
  const ids = new Set(GLOSSARY_ENTRIES.map((e) => e.id));
  assert.equal(ids.size, GLOSSARY_ENTRIES.length);
  for (const entry of GLOSSARY_ENTRIES) {
    assert.ok(entry.term.length > 0);
    assert.ok(entry.intuition.length > 20);
    assert.ok(entry.aliases.length > 0);
  }
});

test('tokenizeGlossaryText matches Spanish accented terms with word boundaries', () => {
  const tokens = tokenizeGlossaryText(
    'La notación hexadecimal y el desbordamiento en aritmética modular son clave.'
  );
  const termIds = tokens.filter((t) => t.type === 'term').map((t) => t.entry.id);
  assert.deepEqual(termIds, ['hexadecimal', 'desbordamiento', 'modular']);
  // Reconstructing text yields exact original string
  assert.equal(
    tokens.map((t) => t.value).join(''),
    'La notación hexadecimal y el desbordamiento en aritmética modular son clave.'
  );
});

test('tokenizeGlossaryText does not match substrings inside unrelated words and respects dedupe', () => {
  const tokens = tokenizeGlossaryText(
    'Un rango alto, otro rango repetido, y una palabra como naranja o hábito o ámbito.'
  );
  const terms = tokens.filter((t) => t.type === 'term');
  assert.equal(terms.length, 1);
  assert.equal(terms[0].entry.id, 'subespacio');
  assert.equal(terms[0].value, 'rango');
});

test('longest-match-first prefers multi-word phrases over shorter aliases', () => {
  const tokens = tokenizeGlossaryText('Aplicamos entropía cruzada y regla de la cadena.');
  const termValues = tokens.filter((t) => t.type === 'term').map((t) => [t.entry.id, t.value]);
  assert.deepEqual(termValues, [
    ['entropia', 'entropía cruzada'],
    ['backprop', 'regla de la cadena'],
  ]);
  assert.ok(getGlossaryEntryById('svd'));
});

test('every alias belongs to exactly one entry (no silently shadowed aliases)', () => {
  const owner = new Map<string, string>();
  for (const entry of GLOSSARY_ENTRIES) {
    for (const alias of entry.aliases) {
      const key = alias.toLocaleLowerCase('es');
      const prev = owner.get(key);
      assert.ok(!prev || prev === entry.id, `alias "${alias}" is claimed by ${prev} and ${entry.id}`);
      owner.set(key, entry.id);
    }
  }
});

test('every entry links to an existing study module and its LaTeX compiles', async () => {
  const { STUDY_MODULES } = await import('./studyPlan');
  const katex = (await import('katex')).default;
  for (const entry of GLOSSARY_ENTRIES) {
    assert.ok(STUDY_MODULES[entry.relatedModuleId], `${entry.id} -> ${entry.relatedModuleId}`);
    if (entry.latex) {
      assert.doesNotThrow(
        () => katex.renderToString(entry.latex as string, { throwOnError: true }),
        `${entry.id} latex: ${entry.latex}`
      );
    }
  }
});

test('everyday Spanish words are not hijacked by unrelated math entries', () => {
  const ids = (text: string) =>
    tokenizeGlossaryText(text, { maxHighlights: 20, dedupePerBlock: false })
      .filter((t) => t.type === 'term')
      .map((t) => (t.type === 'term' ? t.entry.id : ''));
  assert.deepEqual(ids('El vector normal al plano y el vector residuo óptimo.'), ['vector', 'vector']);
  assert.deepEqual(ids('El tamaño del grupo sano y cada grupo sin orden.'), []);
  assert.deepEqual(ids('Comprueba reflexividad, simetría y transitividad en este módulo.'), []);
});

test('closely related but distinct concepts resolve to their own entries', () => {
  const first = (text: string) => {
    const tok = tokenizeGlossaryText(text).find((t) => t.type === 'term');
    return tok && tok.type === 'term' ? tok.entry.id : null;
  };
  assert.equal(first('Es inyectiva'), 'inyectiva');
  assert.equal(first('Es sobreyectiva'), 'sobreyectiva');
  assert.equal(first('Prueba por contrapositiva'), 'contrapositiva');
  assert.equal(first('Basta un contraejemplo'), 'contraejemplo');
  assert.equal(first('La ley de los grandes números'), 'lgn');
  assert.equal(first('Una llamada recursiva'), 'recursion');
  assert.equal(first('El radio de convergencia'), 'convergencia');
  assert.equal(first('La matriz de covarianza'), 'covarianza');
});
