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
