import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRealEigen2D,
  computeRank3,
  computeSvd3,
  determinant3,
  evaluateSvdStageMatrix,
  generateManifoldPoints,
  mat3FromColumns,
  mat3Multiply,
  type Mat3,
} from './linearAlgebra';

test('determinant3 computes known 3x3 determinant and orientation sign', () => {
  const identity: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  assert.equal(determinant3(identity), 1);

  const flip: Mat3 = [-1, 0, 0, 0, 2, 0, 0, 0, 3];
  assert.equal(determinant3(flip), -6);

  const singular: Mat3 = [1, 2, 3, 2, 4, 6, 0, 1, 1];
  assert.ok(Math.abs(determinant3(singular)) < 1e-10);
});

test('computeRank3 distinguishes rank 3, rank 2 coplanar, and rank 1 collinear', () => {
  assert.equal(computeRank3([1, 0, 0], [0, 1, 0], [0, 0, 1]), 3);
  assert.equal(computeRank3([1, 0, 0], [0, 0, 1], [2, 0, 3]), 2);
  assert.equal(computeRank3([1, 2, 3], [2, 4, 6], [-1, -2, -3]), 1);
});

test('computeSvd3 reconstructs A = U * Sigma * Vt accurately', () => {
  const A: Mat3 = [1.4, 0.6, 0.2, -0.3, 1.1, 0.4, 0.1, -0.5, 0.9];
  const svd = computeSvd3(A);
  const sigma: Mat3 = [svd.S[0], 0, 0, 0, svd.S[1], 0, 0, 0, svd.S[2]];
  const reconstructed = mat3Multiply(svd.U, mat3Multiply(sigma, svd.Vt));

  for (let i = 0; i < 9; i++) {
    assert.ok(
      Math.abs(reconstructed[i] - A[i]) < 1e-5,
      `Mismatch at index ${i}: ${reconstructed[i]} vs ${A[i]}`
    );
  }

  // Stage 3 of SVD animation matches A
  const stage3 = evaluateSvdStageMatrix(svd, 3);
  for (let i = 0; i < 9; i++) {
    assert.ok(Math.abs(stage3[i] - A[i]) < 1e-5);
  }
});

test('computeRealEigen2D satisfies A*v = lambda*v for real eigenvalues', () => {
  const a = 2.0;
  const b = 1.0;
  const c = 1.0;
  const d = 2.0;
  const pairs = computeRealEigen2D(a, b, c, d);
  assert.equal(pairs.length, 2);
  for (const { lambda, vector } of pairs) {
    const [vx, vy] = vector;
    const avx = a * vx + b * vy;
    const avy = c * vx + d * vy;
    assert.ok(Math.abs(avx - lambda * vx) < 1e-6);
    assert.ok(Math.abs(avy - lambda * vy) < 1e-6);
  }
});

test('nonlinear manifold folding dramatically improves separability over linear activation', () => {
  const lin = generateManifoldPoints('rings', 1.6, 0, 1.0, 'linear');
  const nonlin = generateManifoldPoints('rings', 1.6, 0, 1.0, 'tanh');
  assert.ok(lin.accuracy < 0.7, `Expected linear accuracy < 0.7, got ${lin.accuracy}`);
  assert.ok(nonlin.accuracy > 0.95, `Expected nonlinear accuracy > 0.95, got ${nonlin.accuracy}`);
});
