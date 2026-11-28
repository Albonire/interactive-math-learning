/**
 * Curated, mathematically exact hand-drawn 3D scenes.
 *
 * These replace the generic "escultura geométrica" placeholder that 12 modules used, and fix
 * scenes whose drawing did not match their caption (projection error not perpendicular, one
 * Gaussian reused for three different modules, a fake descent path, a meaningless D₄ cube).
 *
 * Every scene follows the plan rule "cada visualización declara la intuición que desbloquea":
 * the scroll progress `t` (0..1) walks the four narrative beats, and the subtitle states what
 * the reader should see at that moment, using numbers computed from the same geometry.
 */
import type { CrayonToken } from '../core/types';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { Hand3DDot, Hand3DLine, Hand3DPoly, Hand3DSceneSpec, Vec3 } from './hand3dMath';

// ── Small vector helpers ──────────────────────────────────────────────────────

const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const add = (a: Vec3, b: Vec3): Vec3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a: Vec3, b: Vec3): Vec3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const scale = (a: Vec3, s: number): Vec3 => v3(a.x * s, a.y * s, a.z * s);
export const dot3 = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const norm = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
const unit = (a: Vec3): Vec3 => scale(a, 1 / (norm(a) || 1));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
/** Maps global progress t onto a sub-interval [a, b] → 0..1. */
const segment = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
const ease = (t: number): number => t * t * (3 - 2 * t);

const ORIGIN = v3(0, 0, 0);

interface SceneBuilder {
  lines: Hand3DLine[];
  polys: Hand3DPoly[];
  dots: Hand3DDot[];
}

function newScene(): SceneBuilder {
  return { lines: [], polys: [], dots: [] };
}

function axes(s: SceneBuilder, len = 1.3): void {
  for (const d of [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)]) {
    s.lines.push({ a: scale(d, -len), b: scale(d, len), crayon: 'pencil', width: 1.1, dashed: true, opacity: 0.45 });
  }
}

function polyline(
  s: SceneBuilder,
  pts: Vec3[],
  crayon: CrayonToken,
  width = 2,
  opts: { dashed?: boolean; opacity?: number } = {}
): void {
  for (let i = 0; i < pts.length - 1; i++) {
    s.lines.push({ a: pts[i], b: pts[i + 1], crayon, width, ...opts });
  }
}

function sampleCurve(fn: (u: number) => Vec3, from: number, to: number, steps: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) out.push(fn(from + ((to - from) * i) / steps));
  return out;
}

function box(s: SceneBuilder, min: Vec3, max: Vec3, crayon: CrayonToken, width = 1.5, fillAlpha?: number): void {
  const c = [
    v3(min.x, min.y, min.z), v3(max.x, min.y, min.z), v3(max.x, max.y, min.z), v3(min.x, max.y, min.z),
    v3(min.x, min.y, max.z), v3(max.x, min.y, max.z), v3(max.x, max.y, max.z), v3(min.x, max.y, max.z),
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  for (const [i, j] of edges) s.lines.push({ a: c[i], b: c[j], crayon, width });
  if (fillAlpha !== undefined) {
    // Front face and top face tinted so solid columns read as volumes.
    s.polys.push({ points: [c[4], c[5], c[6], c[7]], crayon, fillAlpha, strokeWidth: 0.01 });
    s.polys.push({ points: [c[3], c[2], c[6], c[7]], crayon, fillAlpha, strokeWidth: 0.01 });
  }
}

function surface(
  s: SceneBuilder,
  fn: (x: number, z: number) => number,
  crayon: CrayonToken,
  range = 1.15,
  steps = 8,
  opacity = 0.7
): void {
  const at = (i: number, j: number): Vec3 => {
    const x = -range + (2 * range * i) / steps;
    const z = -range + (2 * range * j) / steps;
    return v3(x, fn(x, z), z);
  };
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j < steps; j++) {
      s.lines.push({ a: at(i, j), b: at(i, j + 1), crayon, width: 1.3, opacity });
      s.lines.push({ a: at(j, i), b: at(j + 1, i), crayon, width: 1.3, opacity });
    }
  }
}

function rightAngleMark(s: SceneBuilder, corner: Vec3, dirA: Vec3, dirB: Vec3, size: number, crayon: CrayonToken): void {
  const a = scale(unit(dirA), size);
  const b = scale(unit(dirB), size);
  s.lines.push(
    { a: add(corner, a), b: add(add(corner, a), b), crayon, width: 1.5 },
    { a: add(add(corner, a), b), b: add(corner, b), crayon, width: 1.5 }
  );
}

function finish(
  s: SceneBuilder,
  title: string,
  subtitle: string,
  camera: { yaw: number; pitch: number } = { yaw: 0.55, pitch: 0.32 }
): Hand3DSceneSpec {
  return { title, subtitle, lines: s.lines, polys: s.polys, dots: s.dots, camera };
}

const fmt = (n: number, digits = 2): string =>
  n.toLocaleString('es', { minimumFractionDigits: digits, maximumFractionDigits: digits });

// ── Exported pure math used by both the scenes and the tests ─────────────────

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

export function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

/** Orthogonal projection of b onto the plane spanned by a1, a2 (through the origin). */
export function projectOntoPlane(b: Vec3, a1: Vec3, a2: Vec3): { p: Vec3; e: Vec3; normal: Vec3 } {
  const n = unit(cross(a1, a2));
  const e = scale(n, dot3(b, n));
  return { p: sub(b, e), e, normal: n };
}

/** Naive recursive Fibonacci call tree for fib(n): nodes in pre-order with depth and argument. */
export function fibCallTree(n: number): Array<{ arg: number; depth: number; parent: number }> {
  const nodes: Array<{ arg: number; depth: number; parent: number }> = [];
  const walk = (k: number, depth: number, parent: number) => {
    const id = nodes.length;
    nodes.push({ arg: k, depth, parent });
    if (k >= 2) {
      walk(k - 1, depth + 1, id);
      walk(k - 2, depth + 1, id);
    }
  };
  walk(n, 0, -1);
  return nodes;
}

/** Gradient descent (optionally heavy-ball momentum) on f(x, z) = ax·x² + az·z². */
export function descentPath(
  start: { x: number; z: number },
  ax: number,
  az: number,
  lr: number,
  beta: number,
  steps: number
): Array<{ x: number; z: number }> {
  const out = [{ ...start }];
  let { x, z } = start;
  let vx = 0;
  let vz = 0;
  for (let i = 0; i < steps; i++) {
    vx = beta * vx + 2 * ax * x;
    vz = beta * vz + 2 * az * z;
    x -= lr * vx;
    z -= lr * vz;
    out.push({ x, z });
  }
  return out;
}

// ── Scenes ───────────────────────────────────────────────────────────────────

function sceneM3(t: number): Hand3DSceneSpec {
  // A family a·f(x − h) + k laid out like film frames along z: same shape, shifted.
  const s = newScene();
  axes(s);
  const frames = 6;
  const shown = 1 + Math.round(t * (frames - 1));
  const f = (x: number) => x * x;
  for (let i = 0; i < frames; i++) {
    const u = i / (frames - 1);
    const h = lerp(-0.4, 0.5, u);
    const k = lerp(-0.7, 0.2, u);
    const a = lerp(0.9, 0.55, u);
    const z = lerp(-0.9, 0.9, u);
    const isCurrent = i === shown - 1;
    if (i >= shown) continue;
    const pts = sampleCurve((x) => v3(x, a * f(x - h) + k, z), h - 1.05, h + 1.05, 24).filter((p) => p.y <= 1.3);
    polyline(s, pts, isCurrent ? 'cobalt' : 'pencil', isCurrent ? 2.6 : 1.3, { opacity: isCurrent ? 1 : 0.55 });
    s.dots.push({ p: v3(h, k, z), crayon: isCurrent ? 'vermilion' : 'pencil', radius: isCurrent ? 5.5 : 3, label: isCurrent ? '(h, k)' : undefined });
  }
  return finish(
    s,
    'Familia a·f(x − h) + k como película 3D',
    'Cada fotograma es la misma parábola: h la mueve en x, k la sube y a la estrecha o ensancha. El vértice viaja por (h, k).',
    { yaw: 0.4, pitch: 0.15 }
  );
}

function sceneM5(t: number): Hand3DSceneSpec {
  // Boolean cube {0,1}³: each vertex is one row of the truth table for P, Q, R.
  const s = newScene();
  const formulas: Array<{ name: string; fn: (p: boolean, q: boolean) => boolean; note: string }> = [
    { name: 'P ∧ Q', fn: (p, q) => p && q, note: 'Solo los vértices con P = 1 y Q = 1 se encienden.' },
    { name: 'P ∨ Q', fn: (p, q) => p || q, note: 'Basta que P o Q valga 1: se apagan solo los vértices con P = Q = 0.' },
    { name: '¬(P ∧ Q)', fn: (p, q) => !(p && q), note: 'Es el complemento exacto de P ∧ Q.' },
    { name: '¬P ∨ ¬Q', fn: (p, q) => !p || !q, note: 'De Morgan: el mismo patrón que ¬(P ∧ Q), vértice por vértice.' },
  ];
  const f = formulas[Math.min(3, Math.floor(t * 4))];
  const at = (p: number, q: number, r: number) => v3(p * 1.5 - 0.75, q * 1.5 - 0.75, r * 1.5 - 0.75);
  for (const [a, b] of [
    [[0, 0, 0], [1, 0, 0]], [[0, 1, 0], [1, 1, 0]], [[0, 0, 1], [1, 0, 1]], [[0, 1, 1], [1, 1, 1]],
    [[0, 0, 0], [0, 1, 0]], [[1, 0, 0], [1, 1, 0]], [[0, 0, 1], [0, 1, 1]], [[1, 0, 1], [1, 1, 1]],
    [[0, 0, 0], [0, 0, 1]], [[1, 0, 0], [1, 0, 1]], [[0, 1, 0], [0, 1, 1]], [[1, 1, 0], [1, 1, 1]],
  ] as Array<[number[], number[]]>) {
    s.lines.push({ a: at(a[0], a[1], a[2]), b: at(b[0], b[1], b[2]), crayon: 'pencil', width: 1.3, opacity: 0.6 });
  }
  let trueCount = 0;
  for (let p = 0; p < 2; p++)
    for (let q = 0; q < 2; q++)
      for (let r = 0; r < 2; r++) {
        const v = f.fn(p === 1, q === 1);
        if (v) trueCount++;
        s.dots.push({
          p: at(p, q, r),
          crayon: v ? 'sage' : 'vermilion',
          radius: v ? 6.5 : 4,
          label: `${p}${q}${r}`,
        });
      }
  s.dots.push({ p: v3(0.95, -0.75, -0.75), crayon: 'pencil', radius: 0.01, label: 'P' });
  s.dots.push({ p: v3(-0.75, 0.95, -0.75), crayon: 'pencil', radius: 0.01, label: 'Q' });
  s.dots.push({ p: v3(-0.75, -0.75, 0.95), crayon: 'pencil', radius: 0.01, label: 'R' });
  return finish(
    s,
    `Cubo de verdad {0,1}³: ${f.name}`,
    `Cada vértice PQR es una fila de la tabla de verdad (${trueCount} de 8 verdaderas). ${f.note}`,
    { yaw: 0.6, pitch: 0.4 }
  );
}

function sceneM6(t: number): Hand3DSceneSpec {
  // Counterexample search for "n² + n + 41 is always prime", n = 0..40, along a spiral.
  const s = newScene();
  const last = 6 + Math.round(t * 34);
  const maxVal = 40 * 40 + 40 + 41;
  for (let n = 0; n <= last; n++) {
    const val = n * n + n + 41;
    // Cases sit around a clock face; height ∝ √value so small and large cases stay readable.
    const ang = (n / 41) * Math.PI * 2 - Math.PI / 2;
    const base = v3(Math.cos(ang) * 1.05, -0.85, Math.sin(ang) * 1.05);
    const top = v3(base.x, -0.85 + Math.sqrt(val / maxVal) * 1.9, base.z);
    const prime = isPrime(val);
    s.lines.push({ a: base, b: top, crayon: prime ? 'sage' : 'vermilion', width: prime ? 1.8 : 3.4 });
    if (!prime) s.dots.push({ p: top, crayon: 'vermilion', radius: 6.5, label: `n = ${n}: ${val} = 41²` });
  }
  const done = last >= 40;
  return finish(
    s,
    'Buscador de contraejemplos: n² + n + 41',
    done
      ? 'n = 40 da 1681 = 41 · 41: un solo caso basta para refutar "siempre es primo".'
      : `Casos n = 0…${last}: todos primos (salvia). Muchos ejemplos a favor no demuestran nada.`,
    { yaw: 0.3, pitch: 0.25 }
  );
}

function sceneM7(t: number): Hand3DSceneSpec {
  // fib(5) call tree: naive recursion repeats work; memoization keeps one node per argument.
  const s = newScene();
  const nodes = fibCallTree(5);
  const maxDepth = Math.max(...nodes.map((n) => n.depth));
  // Starts with the first call and its two sub-calls; the full tree is visible by ~75%.
  const visibleDepth = Math.min(maxDepth, 1 + Math.floor(segment(t, 0, 0.72) * maxDepth));
  const memo = t >= 0.75;
  // In-order x layout from leaf counts.
  const xs = new Array<number>(nodes.length).fill(0);
  let leafCursor = 0;
  const children = nodes.map((_, i) => nodes.map((n, j) => (n.parent === i ? j : -1)).filter((j) => j >= 0));
  const place = (i: number): number => {
    if (children[i].length === 0) {
      xs[i] = leafCursor++;
      return xs[i];
    }
    const cx = children[i].map(place);
    xs[i] = (cx[0] + cx[cx.length - 1]) / 2;
    return xs[i];
  };
  place(0);
  const span = Math.max(1, leafCursor - 1);
  const pos = nodes.map((n, i) => v3((xs[i] / span) * 2.4 - 1.2, 0.95 - n.depth * 0.42, (n.arg % 2 === 0 ? 0.25 : -0.25)));
  const firstSeen = new Map<number, number>();
  nodes.forEach((n, i) => {
    if (!firstSeen.has(n.arg)) firstSeen.set(n.arg, i);
  });
  let visibleCalls = 0;
  nodes.forEach((n, i) => {
    if (n.depth > visibleDepth) return;
    const repeated = firstSeen.get(n.arg) !== i;
    if (memo && repeated) {
      // Memoized: the call returns instantly from the cache, its subtree disappears.
      const parentRepeated = n.parent >= 0 && firstSeen.get(nodes[n.parent].arg) !== n.parent;
      if (parentRepeated) return;
    }
    visibleCalls++;
    if (n.parent >= 0) {
      s.lines.push({ a: pos[n.parent], b: pos[i], crayon: repeated ? 'vermilion' : 'cobalt', width: 1.6, dashed: memo && repeated, opacity: 0.85 });
    }
    s.dots.push({ p: pos[i], crayon: repeated ? 'vermilion' : 'cobalt', radius: repeated ? 4.5 : 5.5, label: `F${n.arg}` });
  });
  const distinct = firstSeen.size;
  return finish(
    s,
    'Árbol de llamadas de fib(5)',
    memo
      ? `Con memoización cada F(k) se calcula una vez: ${distinct} cálculos distintos; las ramas bermellón se leen del caché.`
      : `Recursión ingenua: ${visibleCalls} llamadas visibles de ${nodes.length}. Bermellón = trabajo repetido.`,
    { yaw: 0.12, pitch: 0.1 }
  );
}

function sceneM8(t: number): Hand3DSceneSpec {
  // Integers 0..17 wound on a helix with 3 points per turn: residue classes mod 3 line up.
  const s = newScene();
  axes(s, 1.2);
  const n = 3;
  const wind = ease(segment(t, 0.05, 0.7));
  const colors: CrayonToken[] = ['cobalt', 'vermilion', 'sage'];
  const pts: Vec3[] = [];
  for (let k = 0; k < 18; k++) {
    const line = v3(-1.2 + (k / 17) * 2.4, -0.2, 0);
    const ang = (2 * Math.PI * k) / n + Math.PI / 6;
    const helix = v3(Math.cos(ang) * 0.85, -1 + (k / 17) * 2, Math.sin(ang) * 0.85);
    const p = v3(lerp(line.x, helix.x, wind), lerp(line.y, helix.y, wind), lerp(line.z, helix.z, wind));
    pts.push(p);
    s.dots.push({ p, crayon: colors[k % n], radius: 4.5, label: k < 6 || k % 3 === 0 ? String(k) : undefined });
  }
  polyline(s, pts, 'pencil', 1.1, { opacity: 0.45 });
  if (t >= 0.7) {
    for (let r = 0; r < n; r++) {
      const members = pts.filter((_, k) => k % n === r);
      polyline(s, members, colors[r], 2.2, { dashed: true });
    }
  }
  return finish(
    s,
    'Clases de equivalencia mod 3 en una hélice',
    t >= 0.7
      ? 'Enrollando la recta con 3 puntos por vuelta, cada columna es una clase [0], [1], [2]: una partición de ℤ.'
      : 'a ~ b si 3 divide a − b. Desplázate para enrollar la recta de enteros.',
    { yaw: 0.5, pitch: 0.18 }
  );
}

function sceneM9(t: number): Hand3DSceneSpec {
  // Staircase 1 + 2 + ... + n plus a rotated copy fills an n × (n + 1) rectangle.
  const s = newScene();
  const n = 6;
  const u = 0.28;
  const ox = -(n * u) / 2;
  const oy = -((n + 1) * u) / 2;
  const slide = ease(segment(t, 0.35, 0.85));
  for (let k = 1; k <= n; k++) {
    const x0 = ox + (k - 1) * u;
    box(s, v3(x0, oy, -u / 2), v3(x0 + u, oy + k * u, u / 2), 'cobalt', 1.5, 0.12);
  }
  if (t >= 0.3) {
    for (let k = 1; k <= n; k++) {
      // Copy column k has height n + 1 − k and sits on top of column k when slid in.
      const x0 = ox + (k - 1) * u;
      const h = n + 1 - k;
      const zOff = lerp(1.1, 0, slide);
      const yTop = oy + (n + 1) * u;
      box(s, v3(x0, yTop - h * u, -u / 2 + zOff), v3(x0 + u, yTop, u / 2 + zOff), 'ochre', 1.3, 0.1);
    }
  }
  const total = (n * (n + 1)) / 2;
  return finish(
    s,
    '1 + 2 + ⋯ + n = n(n + 1)/2',
    slide >= 0.99
      ? `Dos escaleras forman un rectángulo ${n} × ${n + 1} = ${n * (n + 1)}; una sola vale ${total}.`
      : `La escalera de n = ${n} columnas tiene 1 + 2 + ⋯ + ${n} = ${total} bloques. Desplázate para duplicarla.`,
    { yaw: 0.35, pitch: 0.22 }
  );
}

function sceneM11(t: number): Hand3DSceneSpec {
  // Pascal's triangle as heights over a lattice: C(i + j, i) counts monotone paths to (i, j).
  const s = newScene();
  const N = 4;
  const showDiag = Math.round(t * (2 * N));
  const step = 0.5;
  const maxC = binomial(2 * N, N);
  const at = (i: number, j: number) => v3(i * step - (N * step) / 2, -0.9, j * step - (N * step) / 2);
  for (let i = 0; i <= N; i++) {
    s.lines.push({ a: at(i, 0), b: at(i, N), crayon: 'pencil', width: 1, opacity: 0.45 });
    s.lines.push({ a: at(0, i), b: at(N, i), crayon: 'pencil', width: 1, opacity: 0.45 });
  }
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++) {
      if (i + j > showDiag) continue;
      const c = binomial(i + j, i);
      const base = at(i, j);
      const top = v3(base.x, base.y + (c / maxC) * 1.9, base.z);
      const onFront = i + j === showDiag;
      s.lines.push({ a: base, b: top, crayon: onFront ? 'vermilion' : 'cobalt', width: onFront ? 3 : 2.2 });
      s.dots.push({ p: top, crayon: onFront ? 'vermilion' : 'cobalt', radius: 3.6, label: c > 1 && (onFront || (i === N && j === N)) ? String(c) : undefined });
    }
  return finish(
    s,
    'Pascal como caminos en una rejilla',
    `La altura en (i, j) es C(i + j, i): caminos con pasos → y ↑. Cada valor es la suma de sus dos vecinos previos; a (4, 4) llegan C(8, 4) = ${maxC}.`,
    { yaw: 0.6, pitch: 0.5 }
  );
}

function sceneM13(t: number): Hand3DSceneSpec {
  // f(x) = (x² − 1)/(x − 1) has a hole at x = 1 but its limit is 2. Shrinking ε-band and δ-slab.
  const s = newScene();
  axes(s, 1.3);
  const X = (x: number) => (x - 1) * 0.9;
  const Y = (y: number) => (y - 2) * 0.9;
  const left = sampleCurve((x) => v3(X(x), Y(x + 1), 0), -0.3, 0.97, 20);
  const right = sampleCurve((x) => v3(X(x), Y(x + 1), 0), 1.03, 2.3, 20);
  polyline(s, left, 'cobalt', 2.6);
  polyline(s, right, 'cobalt', 2.6);
  const eps = lerp(0.8, 0.12, ease(t));
  const delta = eps; // near x = 1, f(x) = x + 1 so |f(x) − 2| = |x − 1|: δ = ε works exactly.
  // ε band: a thin horizontal slab y ∈ (L − ε, L + ε); δ window: a vertical slab x ∈ (1 − δ, 1 + δ).
  box(s, v3(X(-0.3), Y(2 - eps), -0.3), v3(X(2.3), Y(2 + eps), 0.3), 'ochre', 1, 0.08);
  box(s, v3(X(1 - delta), Y(0.7), -0.3), v3(X(1 + delta), Y(3.3), 0.3), 'sage', 1, 0.08);
  s.dots.push({ p: v3(X(1), Y(2), 0), crayon: 'vermilion', radius: 5.5, label: 'hueco: f(1) no existe, el límite es 2' });
  return finish(
    s,
    'ε–δ alrededor de un hueco',
    `Banda ε = ${fmt(eps)} (ocre) alrededor de L = 2; la ventana δ = ${fmt(delta)} (salvia) la cumple. El valor en x = 1 nunca importa.`,
    { yaw: 0.3, pitch: 0.15 }
  );
}

function sceneM14(t: number): Hand3DSceneSpec {
  // Secant through x0 and x0 + h converging to the tangent; f' drawn on a parallel back plane.
  const s = newScene();
  axes(s, 1.3);
  const f = (x: number) => (x * x * x) / 3 - x * 0.6;
  const fp = (x: number) => x * x - 0.6;
  const x0 = 0.55;
  const h = lerp(0.9, 0.02, ease(t));
  polyline(s, sampleCurve((x) => v3(x, f(x), 0), -1.25, 1.25, 30), 'cobalt', 2.6);
  polyline(s, sampleCurve((x) => v3(x, fp(x), -0.8), -1.25, 1.25, 30), 'sage', 1.8, { opacity: 0.85 });
  const m = (f(x0 + h) - f(x0)) / h;
  const line = (slope: number, crayon: CrayonToken, dashed: boolean) =>
    s.lines.push({ a: v3(x0 - 0.8, f(x0) - 0.8 * slope, 0), b: v3(x0 + 1, f(x0) + 1 * slope, 0), crayon, width: 2, dashed });
  line(m, 'vermilion', false);
  line(fp(x0), 'pencil', true);
  s.dots.push({ p: v3(x0, f(x0), 0), crayon: 'vermilion', radius: 5.5, label: 'x₀' });
  s.dots.push({ p: v3(x0 + h, f(x0 + h), 0), crayon: 'ochre', radius: 4.5, label: 'x₀ + h' });
  s.dots.push({ p: v3(x0, fp(x0), -0.8), crayon: 'sage', radius: 5, label: "f′(x₀)" });
  s.lines.push({ a: v3(x0, f(x0), 0), b: v3(x0, fp(x0), -0.8), crayon: 'sage', width: 1.2, dashed: true, opacity: 0.7 });
  return finish(
    s,
    'De la secante a la tangente',
    `h = ${fmt(h)}: pendiente secante ${fmt(m, 3)} → f′(x₀) = ${fmt(fp(x0), 3)}. Atrás, en salvia, la curva f′ registra cada pendiente.`,
    { yaw: 0.35, pitch: 0.12 }
  );
}

function sceneM16(t: number): Hand3DSceneSpec {
  // Taylor polynomials of sin x (degrees 1, 3, 5, 7) stacked on depth layers.
  const s = newScene();
  const degrees = [1, 3, 5, 7];
  const shown = 1 + Math.min(3, Math.floor(t * 4));
  const taylor = (x: number, d: number) => {
    let sum = 0;
    let term = x;
    for (let k = 1; k <= d; k += 2) {
      sum += term;
      term *= (-x * x) / ((k + 1) * (k + 2));
    }
    return sum;
  };
  const sx = 0.36;
  for (let i = 0; i < shown; i++) {
    const d = degrees[i];
    const z = lerp(-0.9, 0.9, i / 3);
    const current = i === shown - 1;
    polyline(s, sampleCurve((x) => v3(x * sx, Math.sin(x) * 0.55, z), -3.4, 3.4, 40), 'pencil', 1.2, { opacity: 0.55 });
    const pts = sampleCurve((x) => v3(x * sx, taylor(x, d) * 0.55, z), -3.4, 3.4, 40).filter((p) => Math.abs(p.y) < 1.2);
    polyline(s, pts, current ? 'vermilion' : 'cobalt', current ? 2.6 : 1.6, { opacity: current ? 1 : 0.7 });
    s.dots.push({ p: v3(3.4 * sx, 1.05 - i * 0.17, z), crayon: current ? 'vermilion' : 'cobalt', radius: 0.01, label: `grado ${d}` });
  }
  const d = degrees[shown - 1];
  const err = Math.abs(Math.sin(2) - taylor(2, d));
  return finish(
    s,
    'Polinomios de Taylor de sen x, capa por capa',
    `Grado ${d}: en x = 2 el error es ${fmt(err, 4)}. Cada capa abraza la curva gris en un intervalo más ancho alrededor de 0.`,
    { yaw: 0.3, pitch: 0.12 }
  );
}

function sceneM20(t: number): Hand3DSceneSpec {
  // A_t = I − t·(n e₂ᵀ)/n_y projects along n onto the floor y = 0 at t = 1: det = 1 − t, N(A) = span(n).
  const s = newScene();
  axes(s, 1.3);
  const nv = v3(0.35, 1, 0.25);
  const A = (p: Vec3): Vec3 => sub(p, scale(nv, (t * p.y) / nv.y));
  const c = [-0.6, 0.6];
  const corners: Vec3[] = [];
  for (const x of c) for (const y of c) for (const z of c) corners.push(A(v3(x, y, z)));
  const edge = (i: number, j: number) => s.lines.push({ a: corners[i], b: corners[j], crayon: 'cobalt', width: 1.9 });
  [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([i, j]) => edge(i, j));
  s.polys.push({ points: [v3(-1.2, 0, -1.2), v3(1.2, 0, -1.2), v3(1.2, 0, 1.2), v3(-1.2, 0, 1.2)], crayon: 'sage', fillAlpha: 0.08, strokeWidth: 0.6 });
  // The null-space direction before and after: a vector along n shrinks to the origin.
  const nTip = scale(unit(nv), 1.1);
  s.lines.push({ a: scale(nTip, -1), b: nTip, crayon: 'vermilion', width: 1.2, dashed: true, opacity: 0.7 });
  s.lines.push({ a: ORIGIN, b: A(nTip), crayon: 'vermilion', width: 3 });
  s.dots.push({ p: A(nTip), crayon: 'vermilion', radius: 5, label: t > 0.97 ? 'A·n = 0' : 'A·n' });
  const det = 1 - t;
  return finish(
    s,
    'Rango y espacio nulo: el cubo se aplasta',
    t > 0.97
      ? 'Rango 2: todo el espacio cae sobre el suelo salvia y la recta N(A) = span(n) se aplasta al origen. dim C(A) + dim N(A) = 2 + 1 = 3.'
      : det > 0.995
        ? 'det(A) = 1: el cubo conserva su volumen. Desplázate para empujarlo a lo largo de n.'
        : `det(A) = ${fmt(det)}: el volumen se reduce. Cuando llegue a 0 se pierde una dimensión.`,
    { yaw: 0.6, pitch: 0.42 }
  );
}

function sceneM21(t: number): Hand3DSceneSpec {
  // Exact orthogonal projection of b onto C(A) = span(a1, a2); e = b − p is normal to the plane.
  const s = newScene();
  axes(s, 1.3);
  const a1 = v3(1, 0.18, 0.05);
  const a2 = v3(0.1, 0.12, 1);
  s.polys.push({
    points: [add(scale(a1, -1.1), scale(a2, -1)), add(scale(a1, 1.1), scale(a2, -1)), add(scale(a1, 1.1), scale(a2, 1)), add(scale(a1, -1.1), scale(a2, 1))],
    crayon: 'sage',
    fillAlpha: 0.16,
  });
  s.lines.push({ a: ORIGIN, b: a1, crayon: 'sage', width: 1.6 }, { a: ORIGIN, b: a2, crayon: 'sage', width: 1.6 });
  const ang = t * Math.PI * 0.9;
  const b = v3(0.55 + 0.25 * Math.cos(ang), 1.0, 0.3 + 0.3 * Math.sin(ang));
  const { p, e } = projectOntoPlane(b, a1, a2);
  s.lines.push(
    { a: ORIGIN, b, crayon: 'cobalt', width: 2.8 },
    { a: ORIGIN, b: p, crayon: 'ochre', width: 2.8 },
    { a: p, b, crayon: 'vermilion', width: 2.4, dashed: true }
  );
  rightAngleMark(s, p, e, scale(p, -1), 0.12, 'vermilion');
  s.dots.push({ p: b, crayon: 'cobalt', radius: 5.5, label: 'b' }, { p, crayon: 'ochre', radius: 5.5, label: 'p = A x̂' });
  return finish(
    s,
    'Proyección ortogonal sobre C(A)',
    `e = b − p es perpendicular a ambas columnas: e·a₁ = ${fmt(Math.abs(dot3(e, a1)), 3)}, e·a₂ = ${fmt(Math.abs(dot3(e, a2)), 3)}. |e| = ${fmt(norm(e))} es la menor distancia posible.`,
    { yaw: 0.6, pitch: 0.32 }
  );
}

function ellipsoidRings(s: SceneBuilder, map: (p: Vec3) => Vec3, crayon: CrayonToken): void {
  const rings = 5;
  const segs = 22;
  for (let r = 1; r <= rings; r++) {
    const phi = (r / (rings + 1)) * Math.PI - Math.PI / 2;
    const ring = sampleCurve((a) => map(v3(Math.cos(a) * Math.cos(phi), Math.sin(phi), Math.sin(a) * Math.cos(phi))), 0, Math.PI * 2, segs);
    polyline(s, ring, crayon, 1.3, { opacity: 0.7 });
  }
  for (let m = 0; m < 4; m++) {
    const th = (m / 4) * Math.PI;
    const meridian = sampleCurve((a) => map(v3(Math.cos(a) * Math.cos(th), Math.sin(a), Math.cos(a) * Math.sin(th))), 0, Math.PI * 2, segs);
    polyline(s, meridian, crayon, 1, { opacity: 0.45 });
  }
}

function sceneM22(t: number): Hand3DSceneSpec {
  // Diagonal A in the eigenbasis: axes only stretch, a generic vector w changes direction.
  const s = newScene();
  axes(s, 1.4);
  const lam = [1.55, 0.72, 0.52];
  const k = ease(t);
  const L = lam.map((l) => lerp(1, l, k));
  const A = (p: Vec3) => v3(p.x * L[0], p.y * L[1], p.z * L[2]);
  ellipsoidRings(s, A, 'cobalt');
  const eig: Array<[Vec3, CrayonToken, string]> = [
    [v3(1, 0, 0), 'vermilion', 'v₁'],
    [v3(0, 1, 0), 'sage', 'v₂'],
    [v3(0, 0, 1), 'ochre', 'v₃'],
  ];
  eig.forEach(([v, c, name], i) => {
    s.lines.push({ a: ORIGIN, b: A(v), crayon: c, width: 2.8 });
    s.dots.push({ p: A(v), crayon: c, radius: 5, label: `${name}: λ = ${fmt(L[i])}` });
  });
  const w = unit(v3(1, 1, 1));
  const Aw = A(w);
  s.lines.push({ a: ORIGIN, b: w, crayon: 'pencil', width: 1.4, dashed: true }, { a: ORIGIN, b: Aw, crayon: 'plum', width: 2.4 });
  const turn = (Math.acos(Math.max(-1, Math.min(1, dot3(w, unit(Aw))))) * 180) / Math.PI;
  s.dots.push({ p: Aw, crayon: 'plum', radius: 4.5, label: 'A·w' });
  return finish(
    s,
    'Ejes propios: estirar sin girar',
    turn < 0.5
      ? 'Aún A = I. Desplázate: los vectores propios solo se escalarán por λ, mientras w cambiará de dirección.'
      : `Los vectores propios siguen en su recta (solo se escalan por λ); el vector w ya giró ${fmt(turn, 0)}°.`,
    { yaw: 0.55, pitch: 0.3 }
  );
}

function sceneM23(t: number): Hand3DSceneSpec {
  // A = U Σ Vᵀ as three gestures: rotate (Vᵀ), stretch (Σ), rotate (U).
  const s = newScene();
  axes(s, 1.45);
  const sig = [1.5, 0.8, 0.4];
  const rotY = (a: number) => (p: Vec3) => v3(p.x * Math.cos(a) + p.z * Math.sin(a), p.y, -p.x * Math.sin(a) + p.z * Math.cos(a));
  const rotZ = (a: number) => (p: Vec3) => v3(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a), p.z);
  const r1 = ease(segment(t, 0, 0.3));
  const r2 = ease(segment(t, 0.33, 0.63));
  const r3 = ease(segment(t, 0.66, 0.96));
  const Vt = rotY(-0.7 * r1);
  const S = (p: Vec3) => v3(p.x * lerp(1, sig[0], r2), p.y * lerp(1, sig[1], r2), p.z * lerp(1, sig[2], r2));
  const U = rotZ(0.6 * r3);
  const A = (p: Vec3) => U(S(Vt(p)));
  ellipsoidRings(s, A, 'cobalt');
  // Right singular vectors v_i are the directions that Vᵀ sends to the coordinate axes.
  const vInv = rotY(0.7);
  const axesCol: CrayonToken[] = ['vermilion', 'sage', 'ochre'];
  [v3(1, 0, 0), v3(0, 1, 0), v3(0, 0, 1)].forEach((e, i) => {
    const tip = A(vInv(e));
    s.lines.push({ a: ORIGIN, b: tip, crayon: axesCol[i], width: 2.6 });
    if (i < 2) s.dots.push({ p: tip, crayon: axesCol[i], radius: 5, label: r2 > 0.5 ? `σ${i === 0 ? '₁' : '₂'}u${i === 0 ? '₁' : '₂'}` : `v${i === 0 ? '₁' : '₂'}` });
  });
  const stage = t < 0.33 ? 'Vᵀ gira la esfera (sin cambiarla)' : t < 0.66 ? 'Σ la estira en ejes ortogonales' : 'U gira el elipsoide a su lugar';
  return finish(
    s,
    'SVD: girar, estirar, girar',
    `${stage}. Semiejes σ₁ = ${fmt(sig[0], 1)} ≥ σ₂ = ${fmt(sig[1], 1)} ≥ σ₃ = ${fmt(sig[2], 1)}.`,
    { yaw: 0.55, pitch: 0.3 }
  );
}

function sceneM24(t: number): Hand3DSceneSpec {
  // Bayes on a unit square of frequencies: prevalence 20%, sensitivity 90%, specificity 80%.
  const s = newScene();
  const prev = 0.2;
  const sens = 0.9;
  const spec = 0.8;
  const W = 2.2;
  const D = 1.4;
  const x0 = -W / 2;
  const z0 = -D / 2;
  const split = x0 + prev * W;
  const rise = ease(segment(t, 0.3, 0.6));
  const condition = t >= 0.66;
  const H = 0.9;
  const floor = -0.6;
  // Sick column (width prev): sens fraction tests positive.
  const tp = prev * sens;
  const fp = (1 - prev) * (1 - spec);
  const cells: Array<{ x: [number, number]; z: [number, number]; pos: boolean; sick: boolean }> = [
    { x: [x0, split], z: [z0, z0 + sens * D], pos: true, sick: true },
    { x: [x0, split], z: [z0 + sens * D, z0 + D], pos: false, sick: true },
    { x: [split, x0 + W], z: [z0, z0 + (1 - spec) * D], pos: true, sick: false },
    { x: [split, x0 + W], z: [z0 + (1 - spec) * D, z0 + D], pos: false, sick: false },
  ];
  for (const c of cells) {
    const h = c.pos ? H * rise : 0.02;
    const faded = condition && !c.pos;
    box(s, v3(c.x[0], floor, c.z[0]), v3(c.x[1], floor + h, c.z[1]), c.sick ? 'vermilion' : 'cobalt', faded ? 0.7 : 1.5, faded ? 0.02 : 0.14);
  }
  s.dots.push({ p: v3((x0 + split) / 2, floor + H * rise + 0.12, z0), crayon: 'vermilion', radius: 0.01, label: 'enfermos +' });
  s.dots.push({ p: v3((split + x0 + W) / 2, floor + H * rise + 0.12, z0), crayon: 'cobalt', radius: 0.01, label: 'sanos +' });
  const post = tp / (tp + fp);
  return finish(
    s,
    'Bayes como áreas de frecuencia',
    condition
      ? `Condicionar a "positivo" es quedarse con los bloques altos: P(E | +) = ${fmt(tp)} / (${fmt(tp)} + ${fmt(fp)}) ≈ ${fmt(post * 100, 0)}%.`
      : `Prevalencia 20%, sensibilidad 90%, especificidad 80%. Los bloques que suben son los que dan positivo.`,
    { yaw: 0.45, pitch: 0.55 }
  );
}

function sceneM25(t: number): Hand3DSceneSpec {
  // Binomial(n, 0.5) PMF as bars that approach the normal density as n grows (de Moivre–Laplace).
  const s = newScene();
  const ns = [4, 10, 20, 40];
  const n = ns[Math.min(3, Math.floor(t * 4))];
  const mu = n / 2;
  const sd = Math.sqrt(n * 0.25);
  const xOf = (k: number) => ((k - mu) / sd) * 0.42;
  const yScale = 1.7 * sd; // standardize so bar heights stay comparable across n
  const floor = -0.8;
  s.lines.push({ a: v3(-1.4, floor, 0), b: v3(1.4, floor, 0), crayon: 'pencil', width: 1.1, dashed: true, opacity: 0.5 });
  const w = Math.min(0.09, 0.42 / sd);
  for (let k = 0; k <= n; k++) {
    const x = xOf(k);
    if (Math.abs(x) > 1.35) continue;
    const pk = binomial(n, k) / 2 ** n;
    box(s, v3(x - w, floor, -0.08), v3(x + w, floor + pk * yScale, 0.08), 'cobalt', 1.1, 0.14);
  }
  const normal = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  polyline(s, sampleCurve((zz) => v3(zz * 0.42, floor + normal(zz) * 1.7, 0.12), -3.2, 3.2, 40), 'vermilion', 2.4);
  return finish(
    s,
    'De histograma a densidad',
    `Binomial(n = ${n}, p = 0,5) estandarizada (cobalto) frente a la densidad normal (bermellón): con n grande las barras se pegan a la curva.`,
    { yaw: 0.15, pitch: 0.12 }
  );
}

function sceneM26(t: number): Hand3DSceneSpec {
  // Bivariate normal with correlation ρ: covariance is the shape of the cloud.
  const s = newScene();
  axes(s, 1.3);
  const rho = lerp(0, 0.85, ease(t));
  const pdf = (x: number, z: number) => {
    const q = (x * x - 2 * rho * x * z + z * z) / (1 - rho * rho);
    return Math.exp(-q / (2 * 0.36)) / Math.sqrt(1 - rho * rho);
  };
  const peak = 1 / Math.sqrt(1 - rho * rho);
  surface(s, (x, z) => -0.75 + (pdf(x, z) / peak) * 1.35, 'cobalt', 1.15, 13, 0.5);
  // Level ellipses on the floor: eigen-directions (1,1) and (1,−1) with variances 1 ± ρ.
  for (const c of [0.5, 1, 1.5]) {
    const a = Math.sqrt(0.36 * (1 + rho)) * c;
    const b = Math.sqrt(0.36 * (1 - rho)) * c;
    const ring = sampleCurve((u) => {
      const ex = a * Math.cos(u);
      const ez = b * Math.sin(u);
      return v3((ex - ez) / Math.SQRT2, -0.78, (ex + ez) / Math.SQRT2);
    }, 0, Math.PI * 2, 32);
    polyline(s, ring, 'ochre', 1.6);
  }
  return finish(
    s,
    'Normal bivariada: la covarianza es la forma',
    rho < 0.02
      ? 'ρ = 0: las curvas de nivel son círculos; conocer una variable no dice nada lineal de la otra. Desplázate para correlacionarlas.'
      : `ρ = ${fmt(rho)}: las elipses de nivel se alargan sobre la diagonal; las varianzas en sus ejes propios son proporcionales a 1 + ρ y 1 − ρ. Con ρ = 0 son círculos.`,
    { yaw: 0.6, pitch: 0.5 }
  );
}

function sceneM27(t: number): Hand3DSceneSpec {
  // Likelihood of θ after 7 heads in 10 flips; a climber walks up to the MLE θ̂ = 0.7.
  const s = newScene();
  const heads = 7;
  const n = 10;
  const L = (th: number) => th ** heads * (1 - th) ** (n - heads);
  const Lmax = L(heads / n);
  const X = (th: number) => (th - 0.5) * 2.4;
  const Y = (l: number) => -0.8 + (l / Lmax) * 1.7;
  s.lines.push({ a: v3(X(0), -0.8, 0), b: v3(X(1), -0.8, 0), crayon: 'pencil', width: 1.1, dashed: true, opacity: 0.5 });
  polyline(s, sampleCurve((th) => v3(X(th), Y(L(th)), 0), 0, 1, 50), 'cobalt', 2.6);
  // Data as coins on a back row.
  for (let i = 0; i < n; i++) {
    s.dots.push({ p: v3(-1 + i * 0.22, -0.8, -0.7), crayon: i < heads ? 'ochre' : 'pencil', radius: 4.5, label: i === 0 ? '7 caras de 10' : undefined });
  }
  const th = lerp(0.2, 0.7, ease(segment(t, 0.1, 0.85)));
  s.lines.push({ a: v3(X(th), -0.8, 0), b: v3(X(th), Y(L(th)), 0), crayon: 'vermilion', width: 1.6, dashed: true });
  s.dots.push({ p: v3(X(th), Y(L(th)), 0), crayon: 'vermilion', radius: 6, label: `θ = ${fmt(th)}` });
  return finish(
    s,
    'Verosimilitud L(θ) y su cima',
    th > 0.695
      ? 'El MLE es la cima: θ̂ = 7/10 = 0,70, la proporción observada.'
      : `L(θ) = θ⁷(1 − θ)³ mide qué tan bien explica θ los datos. Con θ = ${fmt(th)} aún se puede subir.`,
    { yaw: 0.2, pitch: 0.12 }
  );
}

function sceneM29(t: number): Hand3DSceneSpec {
  // Real gradient descent on an elongated bowl, then heavy-ball momentum on the same bowl.
  const s = newScene();
  axes(s, 1.35);
  const ax = 0.06;
  const az = 0.72;
  const f = (x: number, z: number) => ax * x * x + az * z * z - 0.7;
  surface(s, f, 'cobalt', 1.2, 8, 0.55);
  const start = { x: -1.1, z: 0.55 };
  const lr = 1.2;
  const gd = descentPath(start, ax, az, lr, 0, 18);
  const visible = Math.max(2, Math.round(2 + segment(t, 0, 0.6) * 16));
  polyline(s, gd.slice(0, visible).map((p) => v3(p.x, f(p.x, p.z) + 0.04, p.z)), 'vermilion', 2.4);
  let note = `Descenso simple (α = ${fmt(lr)}): zigzaguea a lo ancho del valle y avanza lento a lo largo.`;
  if (t >= 0.66) {
    const mom = descentPath(start, ax, az, 0.5, 0.6, 18);
    polyline(s, mom.map((p) => v3(p.x, f(p.x, p.z) + 0.06, p.z)), 'sage', 2.4);
    const last = gd[gd.length - 1];
    const lastM = mom[mom.length - 1];
    note = `Tras 18 pasos: sin momentum queda a ${fmt(Math.hypot(last.x, last.z))} del mínimo; con momentum (α = 0,5, β = 0,6, salvia) a ${fmt(Math.hypot(lastM.x, lastM.z))}.`;
  }
  s.dots.push({ p: v3(0, f(0, 0), 0), crayon: 'sage', radius: 5, label: 'mínimo' });
  return finish(s, 'Valle alargado: descenso y momentum', note, { yaw: 0.5, pitch: 0.55 });
}

function sceneM17(t: number): Hand3DSceneSpec {
  // Saddle f = 0.48(x² − z²); level curves on the floor and ∇f perpendicular to them.
  const s = newScene();
  axes(s, 1.35);
  const k = 0.48;
  const f = (x: number, z: number) => k * (x * x - z * z);
  surface(s, f, 'cobalt', 1.15, 8, 0.55);
  const floor = -1.05;
  for (const c of [-0.3, -0.12, 0.12, 0.3]) {
    // x² − z² = c/k: hyperbola branches parametrized with cosh/sinh.
    const r = Math.sqrt(Math.abs(c) / k);
    for (const sign of [1, -1]) {
      const pts = sampleCurve((u) => (c > 0 ? v3(sign * r * Math.cosh(u), floor, r * Math.sinh(u)) : v3(r * Math.sinh(u), floor, sign * r * Math.cosh(u))), -1.3, 1.3, 24).filter((p) => Math.abs(p.x) < 1.2 && Math.abs(p.z) < 1.2);
      polyline(s, pts, c > 0 ? 'ochre' : 'plum', 1.4, { opacity: 0.85 });
    }
  }
  const ang = lerp(0.3, 2.6, t);
  const P = { x: 0.75 * Math.cos(ang), z: 0.75 * Math.sin(ang) };
  const g = { x: 2 * k * P.x, z: -2 * k * P.z };
  const base = v3(P.x, floor, P.z);
  s.lines.push({ a: base, b: v3(P.x + g.x * 0.8, floor, P.z + g.z * 0.8), crayon: 'vermilion', width: 2.8 });
  s.lines.push({ a: base, b: v3(P.x, f(P.x, P.z), P.z), crayon: 'pencil', width: 1, dashed: true });
  s.dots.push({ p: v3(P.x, f(P.x, P.z), P.z), crayon: 'vermilion', radius: 5, label: 'f(P)' });
  s.dots.push({ p: base, crayon: 'vermilion', radius: 4, label: '∇f' });
  s.dots.push({ p: v3(0, 0, 0), crayon: 'sage', radius: 5, label: 'silla: ∇f = 0' });
  return finish(
    s,
    'Superficie, curvas de nivel y gradiente',
    `En el suelo, ∇f(P) = (${fmt(g.x)}, ${fmt(g.z)}) cruza la curva de nivel a 90° y apunta a la máxima subida. En el origen ∇f = 0 pero no hay extremo: es una silla.`,
    { yaw: 0.6, pitch: 0.42 }
  );
}

function sceneM30(t: number): Hand3DSceneSpec {
  // Ill-conditioned 2×2 system as two nearly parallel vertical planes; a tiny change in b moves x a lot.
  const s = newScene();
  axes(s, 1.3);
  const a = [1, 1];
  const c = [1, 1.05];
  const delta = 0.05 * ease(t);
  const b1 = 2;
  const b2 = 2.05 + delta;
  // Solve x + y = b1, x + 1.05y = b2.
  const y = (b2 - b1) / (c[1] - a[1]);
  const x = b1 - y;
  const S = 0.45;
  const plane = (p: number[], rhs: number, crayon: CrayonToken) => {
    // Points (u, v) with p0 u + p1 v = rhs, extruded along the vertical axis (screen y).
    // Scene x = (u − 1)·S, scene z = (v − 1)·S, extruded along the vertical axis.
    const u0 = 1 - 2.6;
    const u1 = 1 + 2.6;
    const vAt = (u: number) => (rhs - p[0] * u) / p[1];
    const A = v3((u0 - 1) * S, -0.6, (vAt(u0) - 1) * S);
    const B = v3((u1 - 1) * S, -0.6, (vAt(u1) - 1) * S);
    s.polys.push({ points: [A, B, v3(B.x, 0.6, B.z), v3(A.x, 0.6, A.z)], crayon, fillAlpha: 0.14 });
  };
  plane(a, b1, 'cobalt');
  plane(c, b2, 'ochre');
  const sol = v3((x - 1) * S, 0, (y - 1) * S);
  const orig = v3(0, 0, 0);
  s.dots.push({ p: orig, crayon: 'sage', radius: 4.5, label: 'x = (1, 1)' });
  if (delta > 0.001) {
    s.lines.push({ a: orig, b: sol, crayon: 'vermilion', width: 2, dashed: true });
    s.dots.push({ p: sol, crayon: 'vermilion', radius: 5.5, label: `x̃ = (${fmt(x)}, ${fmt(y)})` });
  }
  // κ₂(A) from the singular values of [[1, 1], [1, 1.05]].
  const m = [[1, 1], [1, 1.05]];
  const ata = [
    [m[0][0] ** 2 + m[1][0] ** 2, m[0][0] * m[0][1] + m[1][0] * m[1][1]],
    [0, m[0][1] ** 2 + m[1][1] ** 2],
  ];
  const tr = ata[0][0] + ata[1][1];
  const det = ata[0][0] * ata[1][1] - ata[0][1] ** 2;
  const l1 = tr / 2 + Math.sqrt((tr * tr) / 4 - det);
  const l2 = tr / 2 - Math.sqrt((tr * tr) / 4 - det);
  const kappa = Math.sqrt(l1 / l2);
  const relB = delta / Math.hypot(b1, 2.05);
  const relX = Math.hypot(x - 1, y - 1) / Math.SQRT2;
  return finish(
    s,
    'Condicionamiento: planos casi paralelos',
    delta > 0.001
      ? `Cambiar b en ${fmt(relB * 100, 1)}% mueve la solución un ${fmt(relX * 100, 0)}%. κ(A) ≈ ${fmt(kappa, 0)} acota esa amplificación.`
      : `Dos ecuaciones casi iguales (κ(A) ≈ ${fmt(kappa, 0)}): su intersección está mal definida. Desplázate para perturbar b.`,
    { yaw: 0.2, pitch: 1.15 }
  );
}

function sceneM32(t: number): Hand3DSceneSpec {
  // Re(z²) = x² − y² as a saddle, and a small square grid mapped by f(z) = z²: right angles survive.
  const s = newScene();
  axes(s, 1.3);
  surface(s, (x, z) => 0.42 * (x * x - z * z) - 0.2, 'plum', 1.1, 7, 0.45);
  const floor = -0.95;
  const k = ease(t);
  const map = (x: number, y: number) => {
    const ux = lerp(x, x * x - y * y, k);
    const uy = lerp(y, 2 * x * y, k);
    return v3(ux * 1.25 - 0.55, floor, uy * 1.25 - 0.3);
  };
  const g = [0.55, 0.7, 0.85, 1.0];
  for (const x of g) polyline(s, sampleCurve((y) => map(x, y), 0.2, 0.65, 10), 'cobalt', 1.6);
  for (const y of [0.2, 0.35, 0.5, 0.65]) polyline(s, sampleCurve((x) => map(x, y), 0.55, 1.0, 10), 'ochre', 1.6);
  s.dots.push({ p: map(0.85, 0.5), crayon: 'vermilion', radius: 4.5, label: k > 0.5 ? 'f(z) = z²' : 'z' });
  return finish(
    s,
    'z ↦ z²: la silla Re(z²) y una malla que conserva ángulos',
    'La superficie es Re(z²) = x² − y². Abajo, la malla se curva al aplicar z², pero sus líneas siguen cruzándose a 90°: f es conforme donde f′(z) = 2z ≠ 0.',
    { yaw: 0.5, pitch: 0.5 }
  );
}

const CURATED: Partial<Record<StudyModuleId, (t: number) => Hand3DSceneSpec>> = {
  M3: sceneM3,
  M5: sceneM5,
  M6: sceneM6,
  M7: sceneM7,
  M8: sceneM8,
  M9: sceneM9,
  M11: sceneM11,
  M13: sceneM13,
  M14: sceneM14,
  M16: sceneM16,
  M17: sceneM17,
  M20: sceneM20,
  M21: sceneM21,
  M22: sceneM22,
  M23: sceneM23,
  M24: sceneM24,
  M25: sceneM25,
  M26: sceneM26,
  M27: sceneM27,
  M29: sceneM29,
  M30: sceneM30,
  M32: sceneM32,
};

/** Returns the curated scene for a module, or null to use the original builder. */
export function buildCuratedScene(moduleId: StudyModuleId, progress: number): Hand3DSceneSpec | null {
  const builder = CURATED[moduleId];
  return builder ? builder(clamp01(progress)) : null;
}

export const CURATED_SCENE_IDS = Object.keys(CURATED) as StudyModuleId[];
