export type Vec3 = [number, number, number];
export type Mat3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export type ActivationKind = 'linear' | 'tanh' | 'relu' | 'sigmoid';
export type ManifoldDatasetKind = 'rings' | 'spiral';

export interface SvdResult {
  U: Mat3;
  S: Vec3;
  Vt: Mat3;
}

export interface EigenPair2D {
  lambda: number;
  vector: [number, number];
}

export interface ManifoldPoint {
  x: number;
  y: number;
  z: number;
  label: 0 | 1;
}

export function dot3(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross3(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function norm3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function normalize3(v: Vec3): Vec3 {
  const n = norm3(v);
  if (n < 1e-10) return [0, 0, 0];
  return [v[0] / n, v[1] / n, v[2] / n];
}

export function mat3FromColumns(c1: Vec3, c2: Vec3, c3: Vec3): Mat3 {
  // Row-major storage for clarity; column-major exported explicitly for WebGL view
  return [
    c1[0], c2[0], c3[0],
    c1[1], c2[1], c3[1],
    c1[2], c2[2], c3[2],
  ];
}

export function mat3ToColumnMajorFloat32(m: Mat3): Float32Array {
  return new Float32Array([
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ]);
}

export function mat3Identity(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function mat3Transpose(m: Mat3): Mat3 {
  return [
    m[0], m[3], m[6],
    m[1], m[4], m[7],
    m[2], m[5], m[8],
  ];
}

export function mat3Multiply(a: Mat3, b: Mat3): Mat3 {
  const out: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] =
        a[r * 3 + 0] * b[0 * 3 + c] +
        a[r * 3 + 1] * b[1 * 3 + c] +
        a[r * 3 + 2] * b[2 * 3 + c];
    }
  }
  return out;
}

export function mat3MulVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function mat3LerpIdentity(a: Mat3, t: number): Mat3 {
  const id = mat3Identity();
  const out: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 9; i++) {
    out[i] = (1 - t) * id[i] + t * a[i];
  }
  return out;
}

export function determinant3(m: Mat3): number {
  const [a, b, c, d, e, f, g, h, i] = m;
  return a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
}

export function computeRank3(v1: Vec3, v2: Vec3, v3: Vec3, eps = 0.045): number {
  const n1 = norm3(v1);
  const n2 = norm3(v2);
  const n3 = norm3(v3);
  if (n1 < eps && n2 < eps && n3 < eps) return 0;

  const det = Math.abs(determinant3(mat3FromColumns(v1, v2, v3)));
  if (det > eps) return 3;

  const c12 = norm3(cross3(v1, v2));
  const c13 = norm3(cross3(v1, v3));
  const c23 = norm3(cross3(v2, v3));
  if (Math.max(c12, c13, c23) > eps) return 2;
  return 1;
}

/**
 * Symmetric 3x3 eigendecomposition via Jacobi rotations.
 * Returns eigenvalues sorted descending and orthogonal eigenvectors as columns of V.
 */
export function jacobiEigenSymmetric3(sym: Mat3, maxIter = 40): { values: Vec3; V: Mat3 } {
  const A: Mat3 = [...sym];
  let V: Mat3 = mat3Identity();

  const pairs: Array<[number, number]> = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];

  for (let iter = 0; iter < maxIter; iter++) {
    let maxOff = 0;
    let p = 0;
    let q = 1;
    for (const [i, j] of pairs) {
      const val = Math.abs(A[i * 3 + j]);
      if (val > maxOff) {
        maxOff = val;
        p = i;
        q = j;
      }
    }
    if (maxOff < 1e-11) break;

    const app = A[p * 3 + p];
    const aqq = A[q * 3 + q];
    const apq = A[p * 3 + q];

    const tau = (aqq - app) / (2 * apq);
    const t = tau >= 0 ? 1 / (tau + Math.hypot(1, tau)) : -1 / (-tau + Math.hypot(1, tau));
    const c = 1 / Math.hypot(1, t);
    const s = t * c;

    // Update symmetric matrix A = J^T A J
    const newApp = app - t * apq;
    const newAqq = aqq + t * apq;
    A[p * 3 + p] = newApp;
    A[q * 3 + q] = newAqq;
    A[p * 3 + q] = 0;
    A[q * 3 + p] = 0;

    for (let r = 0; r < 3; r++) {
      if (r !== p && r !== q) {
        const arp = A[r * 3 + p];
        const arq = A[r * 3 + q];
        A[r * 3 + p] = c * arp - s * arq;
        A[p * 3 + r] = A[r * 3 + p];
        A[r * 3 + q] = s * arp + c * arq;
        A[q * 3 + r] = A[r * 3 + q];
      }
    }

    // Accumulate eigenvectors V = V J
    const nextV: Mat3 = [...V];
    for (let r = 0; r < 3; r++) {
      const vrp = V[r * 3 + p];
      const vrq = V[r * 3 + q];
      nextV[r * 3 + p] = c * vrp - s * vrq;
      nextV[r * 3 + q] = s * vrp + c * vrq;
    }
    V = nextV;
  }

  const rawVals = [A[0], A[4], A[8]];
  const order = [0, 1, 2].sort((i, j) => rawVals[j] - rawVals[i]);
  const values: Vec3 = [rawVals[order[0]], rawVals[order[1]], rawVals[order[2]]];
  const cols: Vec3[] = order.map((idx) => [V[idx], V[3 + idx], V[6 + idx]]);

  // Ensure right-handed orthonormal V
  const detV = determinant3(mat3FromColumns(cols[0], cols[1], cols[2]));
  if (detV < 0) {
    cols[2] = [-cols[2][0], -cols[2][1], -cols[2][2]];
  }
  return { values, V: mat3FromColumns(cols[0], cols[1], cols[2]) };
}

/**
 * Exact 3x3 SVD: A = U * diag(S) * Vt
 * Supports singular and negative-determinant matrices gracefully.
 */
export function computeSvd3(A: Mat3): SvdResult {
  const At = mat3Transpose(A);
  const AtA = mat3Multiply(At, A);
  const { values, V } = jacobiEigenSymmetric3(AtA);

  const s0 = Math.sqrt(Math.max(0, values[0]));
  const s1 = Math.sqrt(Math.max(0, values[1]));
  const s2 = Math.sqrt(Math.max(0, values[2]));
  const S: Vec3 = [s0, s1, s2];

  const vCols: Vec3[] = [
    [V[0], V[3], V[6]],
    [V[1], V[4], V[7]],
    [V[2], V[5], V[8]],
  ];

  const uCols: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  const eps = 1e-7;
  if (s0 > eps) {
    const av0 = mat3MulVec(A, vCols[0]);
    uCols[0] = normalize3([av0[0] / s0, av0[1] / s0, av0[2] / s0]);
  }
  if (s1 > eps) {
    const av1 = mat3MulVec(A, vCols[1]);
    // Gram-Schmidt orthogonalization against u0
    const proj = dot3(av1, uCols[0]);
    uCols[1] = normalize3([
      av1[0] - proj * uCols[0][0],
      av1[1] - proj * uCols[0][1],
      av1[2] - proj * uCols[0][2],
    ]);
  } else {
    const ref: Vec3 = Math.abs(uCols[0][0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    uCols[1] = normalize3(cross3(uCols[0], ref));
  }

  if (s2 > eps) {
    const av2 = mat3MulVec(A, vCols[2]);
    uCols[2] = normalize3([av2[0] / s2, av2[1] / s2, av2[2] / s2]);
  } else {
    uCols[2] = normalize3(cross3(uCols[0], uCols[1]));
  }

  // Keep orientation aligned with sign(det(A)) in U (so S stays non-negative)
  const detA = determinant3(A);
  const detU = determinant3(mat3FromColumns(uCols[0], uCols[1], uCols[2]));
  if (s2 <= eps && detA * detU < 0) {
    uCols[2] = [-uCols[2][0], -uCols[2][1], -uCols[2][2]];
  }

  const U = mat3FromColumns(uCols[0], uCols[1], uCols[2]);
  const Vt = mat3Transpose(V);
  return { U, S, Vt };
}

/**
 * Interpolates a 3-act SVD transformation for stage in [0, 3]:
 *   0..1 -> Rotate by Vt
 *   1..2 -> Scale by Sigma
 *   2..3 -> Rotate by U
 */
export function evaluateSvdStageMatrix(svd: SvdResult, stage: number): Mat3 {
  const clamped = Math.max(0, Math.min(3, stage));
  const t1 = Math.min(1, clamped);
  const t2 = Math.max(0, Math.min(1, clamped - 1));
  const t3 = Math.max(0, Math.min(1, clamped - 2));

  const mVt = mat3LerpIdentity(svd.Vt, t1);
  const mSigma: Mat3 = [
    1 + (svd.S[0] - 1) * t2, 0, 0,
    0, 1 + (svd.S[1] - 1) * t2, 0,
    0, 0, 1 + (svd.S[2] - 1) * t2,
  ];
  const mU = mat3LerpIdentity(svd.U, t3);
  return mat3Multiply(mU, mat3Multiply(mSigma, mVt));
}

/**
 * Exact real eigenvalues & unit eigenvectors for a 2x2 matrix [[a, b], [c, d]].
 */
export function computeRealEigen2D(a: number, b: number, c: number, d: number): EigenPair2D[] {
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;
  if (disc < -1e-6) return [];

  const sqrtDisc = Math.sqrt(Math.max(0, disc));
  const l1 = 0.5 * (trace + sqrtDisc);
  const l2 = 0.5 * (trace - sqrtDisc);

  const findVec = (lambda: number): [number, number] => {
    const r1x = a - lambda;
    const r1y = b;
    const r2x = c;
    const r2y = d - lambda;
    let vx = 0;
    let vy = 0;
    if (Math.hypot(r1x, r1y) >= Math.hypot(r2x, r2y) && Math.hypot(r1x, r1y) > 1e-8) {
      vx = -r1y;
      vy = r1x;
    } else if (Math.hypot(r2x, r2y) > 1e-8) {
      vx = -r2y;
      vy = r2x;
    } else {
      return [1, 0];
    }
    const len = Math.hypot(vx, vy);
    return len > 1e-8 ? [vx / len, vy / len] : [1, 0];
  };

  if (Math.abs(l1 - l2) < 1e-5) {
    return [{ lambda: l1, vector: findVec(l1) }];
  }
  return [
    { lambda: l1, vector: findVec(l1) },
    { lambda: l2, vector: findVec(l2) },
  ];
}

export function applyActivation(val: number, kind: ActivationKind): number {
  switch (kind) {
    case 'linear':
      return val;
    case 'tanh':
      return Math.tanh(val);
    case 'relu':
      return Math.max(0, val);
    case 'sigmoid':
      return 1 / (1 + Math.exp(-val));
  }
}

export function generateManifoldPoints(
  dataset: ManifoldDatasetKind,
  weight: number,
  bias: number,
  foldStrength: number,
  activation: ActivationKind,
  countPerClass = 48
): { points: ManifoldPoint[]; accuracy: number; planeY: number } {
  const points: ManifoldPoint[] = [];

  for (let i = 0; i < countPerClass; i++) {
    const t = (i / countPerClass) * Math.PI * 2;
    let ax = 0;
    let az = 0;
    let bx = 0;
    let bz = 0;

    if (dataset === 'rings') {
      const rA = 0.65 + 0.14 * Math.sin(i * 3.7);
      const rB = 1.65 + 0.18 * Math.cos(i * 2.9);
      ax = Math.cos(t) * rA;
      az = Math.sin(t) * rA;
      bx = Math.cos(t + 0.25) * rB;
      bz = Math.sin(t + 0.25) * rB;
    } else {
      const u = (i / countPerClass) * 2.45;
      const angleA = u * 2.2;
      const angleB = angleA + Math.PI;
      const r = 0.25 + u * 0.72;
      ax = Math.cos(angleA) * r;
      az = Math.sin(angleA) * r;
      bx = Math.cos(angleB) * r;
      bz = Math.sin(angleB) * r;
    }

    const foldPoint = (x: number, z: number, label: 0 | 1): ManifoldPoint => {
      const r2 = x * x + z * z;
      const feature =
        dataset === 'rings'
          ? weight * (r2 - 1.35) + bias
          : weight * (Math.sin(Math.atan2(z, x) - Math.hypot(x, z) * 2.8)) + bias;

      const lifted =
        activation === 'linear'
          ? foldStrength * 0.35 * (weight * x + bias * 0.6)
          : foldStrength * 1.45 * applyActivation(feature, activation);

      return { x, y: lifted, z, label };
    };

    points.push(foldPoint(ax, az, 0));
    points.push(foldPoint(bx, bz, 1));
  }

  // Optimal horizontal separator plane y = planeY
  let mean0 = 0;
  let mean1 = 0;
  let n0 = 0;
  let n1 = 0;
  for (const p of points) {
    if (p.label === 0) {
      mean0 += p.y;
      n0++;
    } else {
      mean1 += p.y;
      n1++;
    }
  }
  mean0 /= Math.max(1, n0);
  mean1 /= Math.max(1, n1);
  const planeY = 0.5 * (mean0 + mean1);

  let correctDirect = 0;
  let correctFlipped = 0;
  for (const p of points) {
    const pred0 = p.y < planeY ? 0 : 1;
    if (pred0 === p.label) correctDirect++;
    else correctFlipped++;
  }
  const accuracy = Math.max(correctDirect, correctFlipped) / Math.max(1, points.length);

  return { points, accuracy, planeY };
}
