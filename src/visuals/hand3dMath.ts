import type { StudyModuleId } from '../core/studyPlanTypes';
import type { CrayonToken } from '../core/types';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depth: number;
  scale: number;
}

export interface Hand3DLine {
  a: Vec3;
  b: Vec3;
  crayon: CrayonToken;
  width?: number;
  dashed?: boolean;
  opacity?: number;
}

export interface Hand3DPoly {
  points: Vec3[];
  crayon: CrayonToken;
  fillAlpha?: number;
  strokeWidth?: number;
}

export interface Hand3DDot {
  p: Vec3;
  crayon: CrayonToken;
  radius?: number;
  label?: string;
}

export interface Hand3DSceneSpec {
  title: string;
  subtitle: string;
  lines: Hand3DLine[];
  polys: Hand3DPoly[];
  dots: Hand3DDot[];
}

export function clampNumber(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function rotateVec3(p: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  // Rotate around Y (yaw)
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  const y1 = p.y;

  // Rotate around X (pitch)
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;

  return { x: x1, y: y2, z: z2 };
}

export function projectVec3(
  p: Vec3,
  yaw: number,
  pitch: number,
  width: number,
  height: number,
  fov = 3.6,
  camDist = 4.6
): ProjectedPoint {
  const r = rotateVec3(p, yaw, pitch);
  const denom = Math.max(0.6, camDist - r.z);
  const scale = fov / denom;
  const unit = Math.min(width, height) * 0.24;
  return {
    x: width * 0.5 + r.x * scale * unit,
    y: height * 0.52 - r.y * scale * unit,
    depth: r.z,
    scale,
  };
}

function addAxes(lines: Hand3DLine[], len = 1.45): void {
  lines.push(
    { a: { x: -len, y: 0, z: 0 }, b: { x: len, y: 0, z: 0 }, crayon: 'pencil', width: 1.1, dashed: true, opacity: 0.45 },
    { a: { x: 0, y: -len, z: 0 }, b: { x: 0, y: len, z: 0 }, crayon: 'pencil', width: 1.1, dashed: true, opacity: 0.45 },
    { a: { x: 0, y: 0, z: -len }, b: { x: 0, y: 0, z: len }, crayon: 'pencil', width: 1.1, dashed: true, opacity: 0.45 }
  );
}

function makeWireCube(
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  crayon: CrayonToken,
  width = 1.8
): Hand3DLine[] {
  const hx = sx / 2;
  const hy = sy / 2;
  const hz = sz / 2;
  const v: Vec3[] = [
    { x: cx - hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy - hy, z: cz - hz },
    { x: cx + hx, y: cy + hy, z: cz - hz },
    { x: cx - hx, y: cy + hy, z: cz - hz },
    { x: cx - hx, y: cy - hy, z: cz + hz },
    { x: cx + hx, y: cy - hy, z: cz + hz },
    { x: cx + hx, y: cy + hy, z: cz + hz },
    { x: cx - hx, y: cy + hy, z: cz + hz },
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  return edges.map(([i, j]) => ({ a: v[i], b: v[j], crayon, width }));
}

function addSurfaceGrid(
  lines: Hand3DLine[],
  fn: (x: number, z: number) => number,
  crayon: CrayonToken,
  range = 1.25,
  steps = 7
): void {
  const pts: Vec3[][] = [];
  for (let i = 0; i <= steps; i++) {
    const row: Vec3[] = [];
    const x = -range + (2 * range * i) / steps;
    for (let j = 0; j <= steps; j++) {
      const z = -range + (2 * range * j) / steps;
      row.push({ x, y: fn(x, z), z });
    }
    pts.push(row);
  }
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j < steps; j++) {
      lines.push({ a: pts[i][j], b: pts[i][j + 1], crayon, width: 1.35, opacity: 0.78 });
    }
  }
  for (let j = 0; j <= steps; j++) {
    for (let i = 0; i < steps; i++) {
      lines.push({ a: pts[i][j], b: pts[i + 1][j], crayon, width: 1.35, opacity: 0.78 });
    }
  }
}

/**
 * Generates an authentic, scroll-reactive 3D mathematical sculpture for any module M1..M32.
 * `progress` (0..1) drives smooth morphing, explosion, or algorithmic evolution as the reader scrolls.
 */
export function buildHand3DScene(
  moduleId: StudyModuleId,
  progress: number
): Hand3DSceneSpec {
  const t = clampNumber(progress, 0, 1);
  const lines: Hand3DLine[] = [];
  const polys: Hand3DPoly[] = [];
  const dots: Hand3DDot[] = [];

  switch (moduleId) {
    case 'M1': {
      // 3D Binary Hypercube Q_3 (8 vertices representing 3-bit words)
      const s = 1.5;
      lines.push(...makeWireCube(0, 0, 0, s, s, s, 'cobalt', 1.9));
      const bits: Array<[number, number, number, string]> = [
        [-1, -1, -1, '000'], [1, -1, -1, '001'], [-1, 1, -1, '010'], [1, 1, -1, '011'],
        [-1, -1, 1, '100'], [1, -1, 1, '101'], [-1, 1, 1, '110'], [1, 1, 1, '111'],
      ];
      const activeIdx = Math.min(7, Math.floor(t * 7.99));
      bits.forEach(([bx, by, bz, label], idx) => {
        dots.push({
          p: { x: bx * 0.75, y: by * 0.75, z: bz * 0.75 },
          crayon: idx <= activeIdx ? 'vermilion' : 'cobalt',
          radius: idx === activeIdx ? 6.5 : 4,
          label,
        });
      });
      return {
        title: 'Hipercubo binario Q₃ en 3D',
        subtitle: 'Cada arista voltea exactamente 1 bit (distancia de Hamming = 1).',
        lines,
        polys,
        dots,
      };
    }

    case 'M2': {
      // 3D (a+b)^3 binomial cube exploding cleanly into its 8 algebraic blocks as you scroll
      const gap = 0.08 + t * 0.34;
      const a = 0.86;
      const b = 0.44;
      const xs = [-(b / 2 + gap), a / 2 + gap];
      const sizes = [a, b];
      for (let ix = 0; ix < 2; ix++) {
        for (let iy = 0; iy < 2; iy++) {
          for (let iz = 0; iz < 2; iz++) {
            const countB = ix + iy + iz;
            const crayon: CrayonToken =
              countB === 0 ? 'cobalt' : countB === 1 ? 'sage' : countB === 2 ? 'ochre' : 'vermilion';
            lines.push(
              ...makeWireCube(
                xs[ix] * 0.72,
                xs[iy] * 0.72,
                xs[iz] * 0.72,
                sizes[ix] * 0.75,
                sizes[iy] * 0.75,
                sizes[iz] * 0.75,
                crayon,
                countB === 0 || countB === 3 ? 2.2 : 1.4
              )
            );
          }
        }
      }
      dots.push(
        { p: { x: -0.75, y: -0.75, z: -0.75 }, crayon: 'cobalt', radius: 4.5, label: 'a³' },
        { p: { x: 0.75, y: 0.75, z: 0.75 }, crayon: 'vermilion', radius: 4.5, label: 'b³' }
      );
      return {
        title: 'Expansión geométrica (a + b)³',
        subtitle: 'Desplaza el cuaderno para separar los 8 bloques: a³ + 3a²b + 3ab² + b³.',
        lines,
        polys,
        dots,
      };
    }

    case 'M4': {
      // 3D Trigonometric Helix projecting sin(t) and cos(t) onto orthogonal notebook walls
      addAxes(lines, 1.35);
      const turns = 26;
      let prev: Vec3 | null = null;
      let prevSin: Vec3 | null = null;
      let prevCos: Vec3 | null = null;
      const maxSteps = Math.max(8, Math.round(10 + t * turns));
      for (let i = 0; i <= maxSteps; i++) {
        const ang = (i / turns) * Math.PI * 3.2;
        const z = -1.25 + (i / turns) * 2.5;
        const x = Math.cos(ang) * 0.78;
        const y = Math.sin(ang) * 0.78;
        const cur = { x, y, z };
        const sinProj = { x: -1.32, y, z };
        const cosProj = { x, y: -1.18, z };
        if (prev) lines.push({ a: prev, b: cur, crayon: 'cobalt', width: 2.5 });
        if (prevSin) lines.push({ a: prevSin, b: sinProj, crayon: 'vermilion', width: 1.5, opacity: 0.85 });
        if (prevCos) lines.push({ a: prevCos, b: cosProj, crayon: 'sage', width: 1.5, opacity: 0.85 });
        prev = cur;
        prevSin = sinProj;
        prevCos = cosProj;
      }
      if (prev) {
        lines.push({ a: prev, b: { x: -1.32, y: prev.y, z: prev.z }, crayon: 'vermilion', width: 1.2, dashed: true });
        lines.push({ a: prev, b: { x: prev.x, y: -1.18, z: prev.z }, crayon: 'sage', width: 1.2, dashed: true });
        dots.push({ p: prev, crayon: 'ochre', radius: 6, label: 'e^(iθ)' });
      }
      return {
        title: 'Hélice compleja e^(iθ) en 3D',
        subtitle: 'Sus dos sombras ortogonales dibujan sin(θ) (bermellón) y cos(θ) (salvia).',
        lines,
        polys,
        dots,
      };
    }

    case 'M10': {
      // 3D Modular Torus Knot (3, 5) wrapping around Z_n
      const segs = 72;
      const p = 3;
      const q = 5;
      const drawn = Math.max(18, Math.round(24 + t * (segs - 24)));
      let prev: Vec3 | null = null;
      for (let i = 0; i <= drawn; i++) {
        const u = (i / segs) * Math.PI * 2;
        const r = 0.86 + 0.34 * Math.cos(q * u);
        const cur: Vec3 = {
          x: r * Math.cos(p * u),
          y: 0.45 * Math.sin(q * u),
          z: r * Math.sin(p * u),
        };
        if (prev) {
          lines.push({ a: prev, b: cur, crayon: i % 2 === 0 ? 'ochre' : 'cobalt', width: 2.2 });
        }
        prev = cur;
      }
      if (prev) dots.push({ p: prev, crayon: 'vermilion', radius: 5.5, label: 'mod n' });
      return {
        title: 'Nudo toroidal modular ℤₙ',
        subtitle: 'Cuando mcd(a, n) = 1, la órbita recorre todos los residuos antes de cerrarse.',
        lines,
        polys,
        dots,
      };
    }

    case 'M12': {
      // 3D Octahedral Graph & Minimum Spanning Tree
      const pts: Vec3[] = [
        { x: 0, y: 1.15, z: 0 },
        { x: 1.05, y: 0.1, z: 0.35 },
        { x: -0.2, y: 0.1, z: 1.05 },
        { x: -1.05, y: -0.05, z: -0.25 },
        { x: 0.25, y: -0.05, z: -1.05 },
        { x: 0, y: -1.15, z: 0 },
      ];
      const allEdges: Array<[number, number]> = [
        [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 2], [2, 3], [3, 4], [4, 1],
        [5, 1], [5, 2], [5, 3], [5, 4],
      ];
      const mstCount = Math.max(1, Math.round(1 + t * 4));
      const mstEdges: Array<[number, number]> = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
      const mstSet = new Set(mstEdges.slice(0, mstCount).map(([a, b]) => `${a}-${b}`));
      allEdges.forEach(([a, b]) => {
        const inMst = mstSet.has(`${a}-${b}`) || mstSet.has(`${b}-${a}`);
        lines.push({
          a: pts[a],
          b: pts[b],
          crayon: inMst ? 'sage' : 'pencil',
          width: inMst ? 2.8 : 1.15,
          dashed: !inMst,
          opacity: inMst ? 0.98 : 0.45,
        });
      });
      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
      pts.forEach((pt, idx) => {
        dots.push({ p: pt, crayon: idx <= mstCount ? 'cobalt' : 'graphite', radius: 5.5, label: labels[idx] });
      });
      return {
        title: 'Grafo espacial y árbol de expansión',
        subtitle: 'Arrastra para girar la red 3D; el árbol salvia conecta V vértices con V−1 aristas.',
        lines,
        polys,
        dots,
      };
    }

    case 'M15': {
      // 3D Solid of Revolution (stacked hand-sketched Riemann disks)
      addAxes(lines, 1.35);
      const rings = Math.max(4, Math.round(4 + t * 8));
      for (let k = 0; k < rings; k++) {
        const y = -1.05 + (k / (rings - 1 || 1)) * 2.1;
        const r = 0.35 + 0.58 * Math.sin(((y + 1.1) / 2.2) * Math.PI);
        const segs = 18;
        for (let s = 0; s < segs; s++) {
          const a1 = (s / segs) * Math.PI * 2;
          const a2 = ((s + 1) / segs) * Math.PI * 2;
          lines.push({
            a: { x: Math.cos(a1) * r, y, z: Math.sin(a1) * r },
            b: { x: Math.cos(a2) * r, y, z: Math.sin(a2) * r },
            crayon: k % 2 === 0 ? 'sage' : 'cobalt',
            width: 1.75,
          });
        }
      }
      dots.push({ p: { x: 0, y: 1.1, z: 0 }, crayon: 'vermilion', radius: 4.5, label: '∫ πr² dy' });
      return {
        title: 'Sólido de revolución por discos',
        subtitle: 'Al avanzar el cuaderno se refinan los discos: más rebanadas, volumen exacto.',
        lines,
        polys,
        dots,
      };
    }

    case 'M17':
    case 'M29': {
      // 3D Saddle / Optimization Canyon Surface + Gradient Descent Trail
      addAxes(lines, 1.35);
      const isOpt = moduleId === 'M29';
      const fn = isOpt
        ? (x: number, z: number) => 0.35 * x * x + 0.72 * z * z - 0.65
        : (x: number, z: number) => 0.48 * (x * x - z * z);
      addSurfaceGrid(lines, fn, 'cobalt', 1.18, 7);

      // Trajectory descending the surface
      const steps = 16;
      const visible = Math.max(3, Math.round(3 + t * (steps - 3)));
      let prev: Vec3 | null = null;
      for (let i = 0; i <= visible; i++) {
        const frac = i / steps;
        const x = -1.05 * (1 - frac);
        const z = isOpt ? Math.cos(i * 1.1) * 0.75 * Math.pow(0.84, i) : 0.75 * (1 - frac);
        const cur = { x, y: fn(x, z) + 0.05, z };
        if (prev) lines.push({ a: prev, b: cur, crayon: 'vermilion', width: 2.8 });
        prev = cur;
      }
      if (prev) {
        dots.push({ p: prev, crayon: 'sage', radius: 6, label: isOpt ? '−η∇L' : '∇f' });
      }
      return {
        title: isOpt ? 'Valle de pérdida 3D y descenso' : 'Superficie z = f(x, y) y silla',
        subtitle: isOpt
          ? 'Observa la trayectoria cayendo hacia el mínimo global del valle convexo.'
          : 'Arrastra para rotar el punto silla donde ∇f = 0 pero la Hessiana cambia de signo.',
        lines,
        polys,
        dots,
      };
    }

    case 'M18': {
      // 3D Unit Cube morphing continuously into a sheared parallelepiped via matrix A(t)
      addAxes(lines, 1.4);
      const shear = 0.15 + t * 0.75;
      const sx = 1.0 + t * 0.32;
      const sy = 1.0 - t * 0.15;
      const sz = 1.0 + t * 0.2;
      const mapPt = (x: number, y: number, z: number): Vec3 => ({
        x: x * sx + y * shear,
        y: y * sy + z * 0.25 * t,
        z: z * sz,
      });
      const baseVerts: Array<[number, number, number]> = [
        [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
        [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
      ];
      const tv = baseVerts.map(([x, y, z]) => mapPt(x - 0.35, y - 0.35, z - 0.35));
      const edges: Array<[number, number]> = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      edges.forEach(([i, j]) => lines.push({ a: tv[i], b: tv[j], crayon: 'ochre', width: 1.85 }));
      // Basis vectors i, j, k
      const origin = tv[0];
      lines.push(
        { a: origin, b: tv[1], crayon: 'cobalt', width: 3.1 },
        { a: origin, b: tv[3], crayon: 'sage', width: 3.1 },
        { a: origin, b: tv[4], crayon: 'vermilion', width: 3.1 }
      );
      polys.push({ points: [tv[0], tv[1], tv[2], tv[3]], crayon: 'ochre', fillAlpha: 0.16 });
      dots.push(
        { p: tv[1], crayon: 'cobalt', radius: 5, label: 'î' },
        { p: tv[3], crayon: 'sage', radius: 5, label: 'ĵ' },
        { p: tv[4], crayon: 'vermilion', radius: 5, label: 'k̂' }
      );
      return {
        title: 'Paralelepípedo transformado A·[î, ĵ, k̂]',
        subtitle: 'El volumen de la caja deformada es exactamente |det(A)|.',
        lines,
        polys,
        dots,
      };
    }

    case 'M19': {
      // Three planes intersecting at a single solution point x*
      addAxes(lines, 1.35);
      const spread = 0.95;
      polys.push(
        {
          points: [
            { x: -spread, y: 0.25, z: -spread },
            { x: spread, y: 0.25, z: -spread },
            { x: spread, y: 0.25, z: spread },
            { x: -spread, y: 0.25, z: spread },
          ],
          crayon: 'cobalt',
          fillAlpha: 0.16,
        },
        {
          points: [
            { x: 0.2, y: -spread, z: -spread },
            { x: 0.2, y: spread, z: -spread },
            { x: 0.2, y: spread, z: spread },
            { x: 0.2, y: -spread, z: spread },
          ],
          crayon: 'sage',
          fillAlpha: 0.16,
        },
        {
          points: [
            { x: -spread, y: -spread * 0.7, z: 0.15 },
            { x: spread, y: spread * 0.7, z: 0.15 },
            { x: spread, y: spread * 0.7, z: 0.15 + 0.01 },
            { x: -spread, y: -spread * 0.7, z: 0.15 + 0.01 },
          ],
          crayon: 'ochre',
          fillAlpha: 0.15,
        }
      );
      // Intersection lines
      lines.push(
        { a: { x: 0.2, y: 0.25, z: -1.1 }, b: { x: 0.2, y: 0.25, z: 1.1 }, crayon: 'graphite', width: 2.0 },
        { a: { x: -1.0, y: 0.25, z: 0.15 }, b: { x: 1.0, y: 0.25, z: 0.15 }, crayon: 'ochre', width: 2.0 }
      );
      dots.push({ p: { x: 0.2, y: 0.25, z: 0.15 }, crayon: 'vermilion', radius: 6.5, label: 'x*' });
      return {
        title: 'Intersección de 3 planos en ℝ³',
        subtitle: 'La solución única x* es el punto donde coinciden las tres ecuaciones.',
        lines,
        polys,
        dots,
      };
    }

    case 'M20':
    case 'M21': {
      // 3D Subspace plane C(A) + Orthogonal Projection p = A x_hat + Residual e perpendicular to plane
      addAxes(lines, 1.3);
      polys.push({
        points: [
          { x: -1.15, y: -0.22, z: -1.0 },
          { x: 1.15, y: 0.18, z: -1.0 },
          { x: 1.15, y: 0.22, z: 1.0 },
          { x: -1.15, y: -0.18, z: 1.0 },
        ],
        crayon: 'sage',
        fillAlpha: 0.18,
      });
      const bTip: Vec3 = { x: 0.55, y: 0.95 + (t - 0.5) * 0.2, z: 0.35 };
      const pTip: Vec3 = { x: 0.55, y: 0.12, z: 0.35 };
      lines.push(
        { a: { x: 0, y: 0, z: 0 }, b: bTip, crayon: 'cobalt', width: 2.8 },
        { a: { x: 0, y: 0, z: 0 }, b: pTip, crayon: 'sage', width: 2.8 },
        { a: pTip, b: bTip, crayon: 'vermilion', width: 2.4, dashed: true },
        // Orthogonal right-angle corner mark
        { a: { x: pTip.x - 0.14, y: pTip.y - 0.02, z: pTip.z }, b: { x: pTip.x - 0.14, y: pTip.y + 0.14, z: pTip.z }, crayon: 'vermilion', width: 1.6 },
        { a: { x: pTip.x - 0.14, y: pTip.y + 0.14, z: pTip.z }, b: { x: pTip.x, y: pTip.y + 0.16, z: pTip.z }, crayon: 'vermilion', width: 1.6 }
      );
      dots.push(
        { p: bTip, crayon: 'cobalt', radius: 5.5, label: 'b' },
        { p: pTip, crayon: 'sage', radius: 5.5, label: 'p = Âx' }
      );
      return {
        title: moduleId === 'M20' ? 'Subespacio C(A) ⊥ N(Aᵀ) en ℝ³' : 'Proyección ortogonal en 3D',
        subtitle: 'El vector de error e = b − p cae estrictamente a 90° sobre el plano.',
        lines,
        polys,
        dots,
      };
    }

    case 'M22':
    case 'M23': {
      // 3D Unit Sphere morphing into an SVD Ellipsoid with principal axes (sigma_1, sigma_2, sigma_3)
      addAxes(lines, 1.38);
      const sx = 1.0 + t * 0.55;
      const sy = 1.0 - t * 0.28;
      const sz = 1.0 - t * 0.48;
      const rings = 5;
      const segs = 22;
      for (let r = 1; r <= rings; r++) {
        const phi = (r / (rings + 1)) * Math.PI - Math.PI / 2;
        const cp = Math.cos(phi);
        const sp = Math.sin(phi);
        for (let s = 0; s < segs; s++) {
          const a1 = (s / segs) * Math.PI * 2;
          const a2 = ((s + 1) / segs) * Math.PI * 2;
          lines.push({
            a: { x: Math.cos(a1) * cp * sx, y: sp * sy, z: Math.sin(a1) * cp * sz },
            b: { x: Math.cos(a2) * cp * sx, y: sp * sy, z: Math.sin(a2) * cp * sz },
            crayon: 'cobalt',
            width: 1.35,
            opacity: 0.72,
          });
        }
      }
      // Principal axes
      lines.push(
        { a: { x: -sx, y: 0, z: 0 }, b: { x: sx, y: 0, z: 0 }, crayon: 'vermilion', width: 3.0 },
        { a: { x: 0, y: -sy, z: 0 }, b: { x: 0, y: sy, z: 0 }, crayon: 'sage', width: 2.6 },
        { a: { x: 0, y: 0, z: -sz }, b: { x: 0, y: 0, z: sz }, crayon: 'ochre', width: 2.3 }
      );
      dots.push(
        { p: { x: sx, y: 0, z: 0 }, crayon: 'vermilion', radius: 5.5, label: moduleId === 'M23' ? 'σ₁u₁' : 'λ₁v₁' },
        { p: { x: 0, y: sy, z: 0 }, crayon: 'sage', radius: 5, label: moduleId === 'M23' ? 'σ₂u₂' : 'λ₂v₂' }
      );
      return {
        title: moduleId === 'M23' ? 'Esfera unitaria → Elipsoide SVD' : 'Ejes propios invariantes en 3D',
        subtitle: 'Al hacer scroll la esfera se estira a lo largo de sus semiejes principales.',
        lines,
        polys,
        dots,
      };
    }

    case 'M25':
    case 'M26':
    case 'M27': {
      // 3D Bivariate Gaussian Bell Surface
      addAxes(lines, 1.3);
      const sigma = 0.85 - t * 0.32;
      const amp = 0.95 + t * 0.4;
      addSurfaceGrid(
        lines,
        (x, z) => amp * Math.exp(-(x * x + z * z) / (2 * sigma * sigma)) - 0.48,
        'cobalt',
        1.25,
        8
      );
      dots.push({ p: { x: 0, y: amp - 0.48, z: 0 }, crayon: 'vermilion', radius: 6, label: 'μ (pico)' });
      return {
        title: 'Campana Gaussiana bivariada 3D',
        subtitle: 'Cuanto mayor la muestra n, más se concentra la masa en torno a la media μ.',
        lines,
        polys,
        dots,
      };
    }

    case 'M28': {
      // 3D Layered Neural Network Computational DAG
      const layersX = [-1.15, 0, 1.15];
      const layerPts: Vec3[][] = [
        [
          { x: layersX[0], y: 0.72, z: -0.4 },
          { x: layersX[0], y: 0, z: 0.45 },
          { x: layersX[0], y: -0.72, z: -0.3 },
        ],
        [
          { x: layersX[1], y: 0.8, z: 0.35 },
          { x: layersX[1], y: 0.15, z: -0.5 },
          { x: layersX[1], y: -0.55, z: 0.45 },
        ],
        [
          { x: layersX[2], y: 0.3, z: 0.2 },
          { x: layersX[2], y: -0.35, z: -0.25 },
        ],
      ];
      const backward = t > 0.52;
      for (let l = 0; l < layerPts.length - 1; l++) {
        for (const a of layerPts[l]) {
          for (const b of layerPts[l + 1]) {
            lines.push({
              a,
              b,
              crayon: backward ? 'vermilion' : 'sage',
              width: 1.55,
              dashed: backward,
              opacity: 0.78,
            });
          }
        }
      }
      layerPts.forEach((col, li) =>
        col.forEach((p, ni) =>
          dots.push({
            p,
            crayon: li === 0 ? 'cobalt' : li === 1 ? 'sage' : 'vermilion',
            radius: 5.5,
            label: li === 2 && ni === 0 ? (backward ? '∂L/∂w' : 'ŷ') : undefined,
          })
        )
      );
      return {
        title: 'Red neuronal y DAG en 3D',
        subtitle: backward
          ? 'Paso Backward activo: los gradientes bermellón fluyen hacia atrás por la red.'
          : 'Paso Forward activo: las activaciones salvia avanzan capa por capa.',
        lines,
        polys,
        dots,
      };
    }

    case 'M31': {
      // 3D Probability Simplex Triangle inside ℝ³ (p1 + p2 + p3 = 1)
      addAxes(lines, 1.3);
      const v1: Vec3 = { x: 1.1, y: -0.45, z: -0.3 };
      const v2: Vec3 = { x: -0.3, y: 1.05, z: -0.3 };
      const v3: Vec3 = { x: -0.3, y: -0.45, z: 1.1 };
      polys.push({ points: [v1, v2, v3], crayon: 'plum', fillAlpha: 0.18 });
      lines.push(
        { a: v1, b: v2, crayon: 'plum', width: 2.2 },
        { a: v2, b: v3, crayon: 'plum', width: 2.2 },
        { a: v3, b: v1, crayon: 'plum', width: 2.2 }
      );
      const center: Vec3 = {
        x: (v1.x + v2.x + v3.x) / 3,
        y: (v1.y + v2.y + v3.y) / 3,
        z: (v1.z + v2.z + v3.z) / 3,
      };
      const qPt: Vec3 = {
        x: center.x + (v1.x - center.x) * (0.2 + 0.55 * t),
        y: center.y + (v1.y - center.y) * (0.2 + 0.55 * t),
        z: center.z + (v1.z - center.z) * (0.2 + 0.55 * t),
      };
      lines.push({ a: center, b: qPt, crayon: 'vermilion', width: 2.4, dashed: true });
      dots.push(
        { p: center, crayon: 'sage', radius: 6, label: 'H máx (P)' },
        { p: qPt, crayon: 'vermilion', radius: 5.5, label: 'Q (KL)' }
      );
      return {
        title: 'Símplex de probabilidad Δ² en 3D',
        subtitle: 'El centro maximiza la entropía H(P); alejarse incrementa la divergencia KL.',
        lines,
        polys,
        dots,
      };
    }

    case 'M32': {
      // 3D Conformal Complex Surface Re(z^2) = x^2 - y^2 + symmetry axes
      addAxes(lines, 1.3);
      addSurfaceGrid(lines, (x, z) => 0.45 * (x * x - z * z), 'plum', 1.15, 7);
      const s = 0.85;
      lines.push(...makeWireCube(0, 0, 0, s, s, s, 'ochre', 1.4));
      dots.push(
        { p: { x: 0.85, y: 0.32, z: 0 }, crayon: 'cobalt', radius: 5.5, label: 'f(z)=z²' },
        { p: { x: 0, y: 0, z: 0 }, crayon: 'vermilion', radius: 5, label: 'D₄' }
      );
      return {
        title: 'Superficie compleja Re(z²) y simetría',
        subtitle: 'Mapeo conforme que conserva ángulos locales y estructura de grupo en 3D.',
        lines,
        polys,
        dots,
      };
    }

    default: {
      // Bespoke hand-drawn 3D geometric ribbon / prism sculpture tailored per remaining module
      addAxes(lines, 1.3);
      const modNum = Number(moduleId.replace('M', '')) || 1;
      const freq = 1.2 + (modNum % 4) * 0.45;
      const accent: CrayonToken =
        modNum <= 6 ? 'cobalt' : modNum <= 12 ? 'vermilion' : modNum <= 17 ? 'sage' : 'ochre';
      addSurfaceGrid(
        lines,
        (x, z) => 0.42 * Math.sin(x * freq + t * 2.4) * Math.cos(z * 1.4),
        accent,
        1.15,
        6
      );
      const tip: Vec3 = {
        x: Math.cos(t * Math.PI * 1.5) * 0.72,
        y: 0.42 * Math.sin(Math.cos(t * Math.PI * 1.5) * 0.72 * freq + t * 2.4),
        z: Math.sin(t * Math.PI * 1.5) * 0.72,
      };
      lines.push({ a: { x: 0, y: 0, z: 0 }, b: tip, crayon: 'vermilion', width: 2.6 });
      dots.push({ p: tip, crayon: 'vermilion', radius: 5.5, label: moduleId });
      return {
        title: `Escultura geométrica ${moduleId} en 3D`,
        subtitle: 'Arrastra con el dedo o ratón para rotar libremente el espacio tridimensional.',
        lines,
        polys,
        dots,
      };
    }
  }
}
