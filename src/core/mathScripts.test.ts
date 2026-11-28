import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMathScripts, splitMathScripts } from './mathScripts';

const render = (t: string) =>
  splitMathScripts(t)
    .map((s) => (s.kind === 'text' ? s.value : s.kind === 'sup' ? `<${s.value}>` : `[${s.value}]`))
    .join('');

test('basic superscripts and subscripts', () => {
  assert.equal(render('Potencia a^n'), 'Potencia a<n>');
  assert.equal(render('N = Σ d_k · b^k'), 'N = Σ d[k] · b<k>');
  assert.equal(render('log_b(x)'), 'log[b](x)');
  assert.equal(render('D_KL(p || q)'), 'D[KL](p || q)');
  assert.equal(render('θ_MAP y λ_max'), 'θ[MAP] y λ[max]');
});

test('groups drop their brackets', () => {
  assert.equal(render('e^(-x) y a^(p−2)'), 'e<-x> y a<p−2>');
  assert.equal(render('√(Σ_{i>k} σᵢ²)'), '√(Σ[i>k] σᵢ²)');
});

test('chained scripts and decimals', () => {
  assert.equal(render('∫_a^b f'), '∫[a]<b> f');
  assert.equal(render('e^0.5 ≈ 1.65'), 'e<0.5> ≈ 1.65');
  assert.equal(render('(1.2)^N crece'), '(1.2)<N> crece');
});

test('never swallows sentence punctuation', () => {
  assert.equal(render('vale base^k.'), 'vale base<k>.');
  assert.equal(render('x^N, luego'), 'x<N>, luego');
});

test('leaves lone or detached symbols alone', () => {
  assert.equal(render('^ solo'), '^ solo');
  assert.equal(render('a ^ b'), 'a ^ b');
  assert.equal(render('termina en x^'), 'termina en x^');
  assert.equal(render('vacío a^() aquí'), 'vacío a^() aquí');
  assert.equal(hasMathScripts('sin nada especial'), false);
  assert.equal(hasMathScripts('2^k'), true);
});

test('text is preserved exactly apart from the converted markers', () => {
  const t = 'Si |λᵢ| < 1, cada λᵢ^k → 0 y A^k·v converge.';
  const flat = splitMathScripts(t).map((s) => s.value).join('');
  assert.equal(flat, t.replace(/\^/g, ''));
});
