import * as THREE from 'three';
import type { CrayonToken, ThemeMode } from '../core/types';
import { createCrayonLineMaterial, createCrayonSurfaceMaterial } from './CrayonMaterials';
import { createCrayonLabelSprite } from './PaperGrainGenerator';

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

export interface CrayonVectorHandle {
  group: THREE.Group;
  shaft: THREE.Mesh;
  tip: THREE.Mesh;
  collar: THREE.Mesh;
  labelSprite?: THREE.Sprite;
  setEndpoints: (origin: THREE.Vector3, target: THREE.Vector3) => void;
  setCrayon: (crayon: CrayonToken, theme: ThemeMode) => void;
}

/**
 * Composite wax crayon vector arrow (wrapped base collar + tapered wax stick + sharpened tip + optional 3D hand-lettered label)
 */
export function createCrayonVector(
  crayon: CrayonToken,
  theme: ThemeMode,
  radius = 0.048,
  label?: string
): CrayonVectorHandle {
  const group = new THREE.Group();
  const mat = createCrayonSurfaceMaterial({
    crayon,
    theme,
    boilAmplitude: 0.006,
    outlineStrength: 0.72,
  });
  const collarMat = createCrayonSurfaceMaterial({
    crayon: 'graphite',
    theme,
    boilAmplitude: 0.004,
    outlineStrength: 0.55,
  });

  // Slightly faceted 9-sided shaft looks more like a sculpted hand-held wax stick than sterile smooth cylinder
  const shaftGeo = new THREE.CylinderGeometry(radius * 0.86, radius * 1.04, 1, 9, 4);
  shaftGeo.translate(0, 0.5, 0);
  const shaft = new THREE.Mesh(shaftGeo, mat);

  const tipGeo = new THREE.ConeGeometry(radius * 2.35, 0.27, 10);
  tipGeo.translate(0, 0.135, 0);
  const tip = new THREE.Mesh(tipGeo, mat);

  const collarGeo = new THREE.CylinderGeometry(radius * 1.48, radius * 1.48, 0.065, 10);
  const collar = new THREE.Mesh(collarGeo, collarMat);

  group.add(collar, shaft, tip);

  let labelSprite: THREE.Sprite | undefined;
  if (label) {
    labelSprite = createCrayonLabelSprite(label, crayon, theme, 0.54);
    group.add(labelSprite);
  }

  const setEndpoints = (origin: THREE.Vector3, target: THREE.Vector3) => {
    _dir.subVectors(target, origin);
    const len = _dir.length();
    if (len < 0.02) {
      group.visible = false;
      return;
    }
    group.visible = true;
    group.position.copy(origin);
    _dir.divideScalar(len);
    _quat.setFromUnitVectors(_up, _dir);
    group.quaternion.copy(_quat);

    const headLen = Math.min(0.27, len * 0.42);
    const shaftLen = Math.max(0.01, len - headLen);
    shaft.scale.set(1, shaftLen, 1);
    tip.position.set(0, shaftLen, 0);
    tip.scale.set(1, headLen / 0.27, 1);

    if (labelSprite) {
      labelSprite.position.set(0, len + 0.26, 0);
    }
  };

  const setCrayon = (next: CrayonToken, activeTheme: ThemeMode) => {
    mat.userData.crayonToken = next;
    void activeTheme;
  };

  return { group, shaft, tip, collar, labelSprite, setEndpoints, setCrayon };
}

/**
 * Hand-sketched engineering notebook substrate:
 * - Double-pass organic pencil grid lines (looks drawn by hand with a ruler + graphite)
 * - Soft wax-shaded radial grounding pad
 * - Bold graphite coordinate axes + hand-lettered 3D X, Y, Z crayon labels
 */
export function createNotebookSubstrate(
  theme: ThemeMode,
  size = 5,
  divisions = 10,
  yOffset = 0
): THREE.Group {
  const group = new THREE.Group();
  const half = size / 2;
  const step = size / divisions;

  // Soft hand-shaded crayon grounding wash disc beneath the 3D diagram
  const washGeo = new THREE.CircleGeometry(half * 1.12, 32);
  washGeo.rotateX(-Math.PI / 2);
  const washMat = createCrayonSurfaceMaterial({
    crayon: 'pencil',
    theme,
    opacity: 0.11,
    hatchStrength: 0.42,
    hatchScale: 3.4,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
    boilAmplitude: 0.0,
    outlineStrength: 0.0,
  });
  const washMesh = new THREE.Mesh(washGeo, washMat);
  washMesh.position.y = yOffset - 0.025;
  group.add(washMesh);

  // Multi-segment hand-drawn wobbly pencil grid lines (never ruler-straight CAD lines)
  const gridVerts: number[] = [];
  const segs = 10;
  const pushWobbledSegment = (
    verts: number[],
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    seed: number,
    amp: number
  ) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dz = z1 - z0;
    const horizLen = Math.hypot(dx, dz) || 1;
    const perpX = -dz / horizLen;
    const perpZ = dx / horizLen;

    let px = x0;
    let py = y0;
    let pz = z0;

    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const taper = Math.sin(t * Math.PI);
      const wave =
        (Math.sin(t * Math.PI * 2.4 + seed * 3.17) * 0.62 +
          Math.cos(t * Math.PI * 5.2 + seed * 1.91) * 0.38) *
        amp *
        (0.35 + 0.65 * taper);
      const lift = Math.sin(t * Math.PI * 3.3 + seed * 2.3) * amp * 0.16;

      const nx = x0 + dx * t + perpX * wave;
      const ny = y0 + dy * t + lift;
      const nz = z0 + dz * t + perpZ * wave;
      verts.push(px, py, pz, nx, ny, nz);
      px = nx;
      py = ny;
      pz = nz;
    }
  };

  for (let i = 0; i <= divisions; i++) {
    const p = -half + i * step;
    // Slight organic start/end overshoot like a quick freehand sketchbook grid
    const overA = Math.sin(i * 2.9) * 0.05;
    const overB = Math.cos(i * 4.1) * 0.05;
    pushWobbledSegment(
      gridVerts,
      -half - overA,
      yOffset,
      p,
      half + overB,
      yOffset,
      p,
      i + 1.3,
      0.024
    );
    pushWobbledSegment(
      gridVerts,
      p,
      yOffset,
      -half - overB,
      p,
      yOffset,
      half + overA,
      i + 17.7,
      0.024
    );
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridVerts, 3));
  const gridMat = createCrayonLineMaterial('pencil', theme, 0.44, 0.003);
  group.add(new THREE.LineSegments(gridGeo, gridMat));

  // Main X, Y, Z axes drawn with double hand-wobbled graphite crayon passes
  const axisLen = half + 0.38;
  const zAxisLen = Math.min(2.05, axisLen * 0.68);
  const axisVerts: number[] = [];
  pushWobbledSegment(axisVerts, -axisLen, yOffset + 0.008, 0, axisLen, yOffset + 0.008, 0, 101, 0.018);
  pushWobbledSegment(axisVerts, -axisLen, yOffset + 0.015, 0.012, axisLen, yOffset + 0.005, -0.012, 109, 0.022);
  pushWobbledSegment(axisVerts, 0, yOffset, 0, 0, yOffset + zAxisLen, 0, 127, 0.016);
  pushWobbledSegment(axisVerts, 0.012, yOffset, 0.008, -0.01, yOffset + zAxisLen, -0.008, 139, 0.020);
  pushWobbledSegment(axisVerts, 0, yOffset + 0.008, -axisLen, 0, yOffset + 0.008, axisLen, 151, 0.018);
  pushWobbledSegment(axisVerts, 0.012, yOffset + 0.015, -axisLen, -0.012, yOffset + 0.005, axisLen, 163, 0.022);

  const axisGeo = new THREE.BufferGeometry();
  axisGeo.setAttribute('position', new THREE.Float32BufferAttribute(axisVerts, 3));
  const axisMat = createCrayonLineMaterial('graphite', theme, 0.84, 0.0045);
  group.add(new THREE.LineSegments(axisGeo, axisMat));

  // Hand-lettered 3D crayon axis labels
  const xLabel = createCrayonLabelSprite('x', 'graphite', theme, 0.44);
  xLabel.position.set(axisLen + 0.22, yOffset + 0.12, 0);
  const yLabel = createCrayonLabelSprite('z', 'graphite', theme, 0.44);
  yLabel.position.set(0, yOffset + zAxisLen + 0.22, 0);
  const zLabel = createCrayonLabelSprite('y', 'graphite', theme, 0.44);
  zLabel.position.set(0, yOffset + 0.12, axisLen + 0.22);
  group.add(xLabel, yLabel, zLabel);

  return group;
}

/**
 * Parametric heightfield mesh with crayon surface shading + subtle hand-drawn contour outline
 */
export function createHeightfieldMesh(
  crayon: CrayonToken,
  theme: ThemeMode,
  options?: {
    segments?: number;
    domainHalf?: number;
    opacity?: number;
    hatchStrength?: number;
    wireframe?: boolean;
  }
): {
  mesh: THREE.Mesh;
  geometry: THREE.PlaneGeometry;
  material: THREE.ShaderMaterial;
  updateHeights: (fn: (x: number, y: number) => number) => void;
} {
  const segs = options?.segments ?? 44;
  const half = options?.domainHalf ?? 2.2;
  const geo = new THREE.PlaneGeometry(half * 2, half * 2, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const mat = createCrayonSurfaceMaterial({
    crayon,
    theme,
    opacity: options?.opacity ?? 0.94,
    hatchStrength: options?.hatchStrength ?? 0.16,
    hatchScale: 4.2,
    doubleSide: true,
    transparent: (options?.opacity ?? 0.94) < 0.99,
    depthWrite: (options?.opacity ?? 0.94) >= 0.9,
    boilAmplitude: 0.005,
    outlineStrength: 0.58,
  });
  if (options?.wireframe) {
    mat.wireframe = true;
  }

  const mesh = new THREE.Mesh(geo, mat);

  const updateHeights = (fn: (x: number, y: number) => number) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = fn(x, z);
      pos.setY(i, Number.isFinite(h) ? h : 0);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };

  return { mesh, geometry: geo, material: mat, updateHeights };
}

/**
 * Projects hand-sketched contour isoline cross-sections onto the floor plane (y = floorY)
 */
export function createFloorContourMesh(
  crayon: CrayonToken,
  theme: ThemeMode,
  domainHalf = 2.2,
  floorY = -0.78
): {
  lines: THREE.LineSegments;
  updateContours: (fn: (x: number, y: number) => number, levels: number[]) => void;
} {
  const maxSegs = 2200;
  const positions = new Float32Array(maxSegs * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setDrawRange(0, 0);

  const mat = createCrayonLineMaterial(crayon, theme, 0.82, 0.0035);
  const lines = new THREE.LineSegments(geo, mat);

  const updateContours = (fn: (x: number, y: number) => number, levels: number[]) => {
    const gridN = 24;
    const step = (domainHalf * 2) / gridN;
    const values = new Float32Array((gridN + 1) * (gridN + 1));

    for (let i = 0; i <= gridN; i++) {
      const x = -domainHalf + i * step;
      for (let j = 0; j <= gridN; j++) {
        const z = -domainHalf + j * step;
        values[i * (gridN + 1) + j] = fn(x, z);
      }
    }

    let segCount = 0;
    const interp = (a: number, b: number, va: number, vb: number, lvl: number): number => {
      const denom = vb - va;
      if (Math.abs(denom) < 1e-6) return (a + b) * 0.5;
      return a + ((lvl - va) / denom) * (b - a);
    };

    const pts: Array<[number, number]> = [];
    for (const lvl of levels) {
      for (let i = 0; i < gridN; i++) {
        const x0 = -domainHalf + i * step;
        const x1 = x0 + step;
        for (let j = 0; j < gridN; j++) {
          const z0 = -domainHalf + j * step;
          const z1 = z0 + step;
          const v00 = values[i * (gridN + 1) + j];
          const v10 = values[(i + 1) * (gridN + 1) + j];
          const v11 = values[(i + 1) * (gridN + 1) + (j + 1)];
          const v01 = values[i * (gridN + 1) + (j + 1)];

          pts.length = 0;
          if ((v00 < lvl) !== (v10 < lvl)) pts.push([interp(x0, x1, v00, v10, lvl), z0]);
          if ((v10 < lvl) !== (v11 < lvl)) pts.push([x1, interp(z0, z1, v10, v11, lvl)]);
          if ((v11 < lvl) !== (v01 < lvl)) pts.push([interp(x1, x0, v11, v01, lvl), z1]);
          if ((v01 < lvl) !== (v00 < lvl)) pts.push([x0, interp(z1, z0, v01, v00, lvl)]);

          if (pts.length >= 2 && segCount < maxSegs) {
            const o = segCount * 6;
            positions[o] = pts[0][0];
            positions[o + 1] = floorY;
            positions[o + 2] = pts[0][1];
            positions[o + 3] = pts[1][0];
            positions[o + 4] = floorY;
            positions[o + 5] = pts[1][1];
            segCount++;
          }
        }
      }
    }

    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    geo.setDrawRange(0, segCount * 2);
  };

  return { lines, updateContours };
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      if ((mat as THREE.SpriteMaterial).map) {
        (mat as THREE.SpriteMaterial).map?.dispose();
      }
      mat.dispose();
    }
  });
}
