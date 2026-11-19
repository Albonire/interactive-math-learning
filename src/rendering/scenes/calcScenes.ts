import * as THREE from 'three';
import type { ThemeMode } from '../../core/types';
import {
  SYMBOLIC_TARGETS,
  evaluateAutoDiffDag,
  evaluateLossLandscape,
  evaluatePartialGradients,
  evaluatePartialSurface,
  evaluateSymbolicBasis,
} from '../../math/multivariable';
import { createCrayonLineMaterial, createCrayonSurfaceMaterial } from '../CrayonMaterials';
import { createCrayonLabelSprite } from '../PaperGrainGenerator';
import {
  createCrayonVector,
  createFloorContourMesh,
  createHeightfieldMesh,
  createNotebookSubstrate,
  disposeObject3D,
} from '../CrayonPrimitives';
import type { BibifoldSceneController, SceneUpdatePayload } from './types';

function makeLayer(id: string): THREE.Group {
  const g = new THREE.Group();
  g.userData.anatomyLayerId = id;
  return g;
}

/**
 * SCENE 2.1 — Anatomía de la Derivada Parcial y Plano Tangente
 */
export function createPartialsScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const invariant = makeLayer('invariant');
  root.add(substrate, structure, operator, invariant);

  substrate.add(createNotebookSubstrate(theme, 5.2, 10, -1.05));
  const contours = createFloorContourMesh('ochre', theme, 2.2, -1.02);
  substrate.add(contours.lines);

  const surface = createHeightfieldMesh('cobalt', theme, {
    segments: 46,
    domainHalf: 2.2,
    opacity: 0.9,
  });
  structure.add(surface.mesh);

  // Slice plane Y = y0 (vermilion hatched) & X = x0 (ochre hatched)
  const sliceGeoX = new THREE.PlaneGeometry(4.4, 2.5);
  const sliceMatX = createCrayonSurfaceMaterial({
    crayon: 'vermilion',
    theme,
    opacity: 0.24,
    hatchStrength: 0.85,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const slicePlaneYFixed = new THREE.Mesh(sliceGeoX, sliceMatX);

  const sliceGeoY = new THREE.PlaneGeometry(4.4, 2.5);
  sliceGeoY.rotateY(Math.PI / 2);
  const sliceMatY = createCrayonSurfaceMaterial({
    crayon: 'ochre',
    theme,
    opacity: 0.24,
    hatchStrength: 0.85,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const slicePlaneXFixed = new THREE.Mesh(sliceGeoY, sliceMatY);

  // Intersection curves along both slices
  const curveSamples = 56;
  const curveXPos = new Float32Array(curveSamples * 3);
  const curveXGeo = new THREE.BufferGeometry();
  curveXGeo.setAttribute('position', new THREE.BufferAttribute(curveXPos, 3));
  const curveXLine = new THREE.Line(curveXGeo, createCrayonLineMaterial('vermilion', theme, 0.98, 0.004));

  const curveYPos = new Float32Array(curveSamples * 3);
  const curveYGeo = new THREE.BufferGeometry();
  curveYGeo.setAttribute('position', new THREE.BufferAttribute(curveYPos, 3));
  const curveYLine = new THREE.Line(curveYGeo, createCrayonLineMaterial('ochre', theme, 0.98, 0.004));

  operator.add(slicePlaneYFixed, slicePlaneXFixed, curveXLine, curveYLine);

  // Tangent plane + marker point + gradient vector
  const tangentGeo = new THREE.PlaneGeometry(1.5, 1.5, 1, 1);
  tangentGeo.rotateX(-Math.PI / 2);
  const tangentBase = new Float32Array(tangentGeo.attributes.position.array);
  const tangentMat = createCrayonSurfaceMaterial({
    crayon: 'sage',
    theme,
    opacity: 0.56,
    hatchStrength: 0.45,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const tangentMesh = new THREE.Mesh(tangentGeo, tangentMat);

  const markerMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 16, 12),
    createCrayonSurfaceMaterial({ crayon: 'vermilion', theme, outlineStrength: 0.78 })
  );
  const gradVec = createCrayonVector('sage', theme, 0.046, '∇f');
  invariant.add(tangentMesh, markerMesh, gradVec.group);

  const origin = new THREE.Vector3();
  const target = new THREE.Vector3();
  let lastFreq = -1;

  const update = (payload: SceneUpdatePayload) => {
    const x0 = payload.params.x0 ?? 0.6;
    const y0 = payload.params.y0 ?? 0.4;
    const freq = payload.params.freq ?? 1.0;

    if (Math.abs(freq - lastFreq) > 1e-4) {
      lastFreq = freq;
      surface.updateHeights((x, y) => evaluatePartialSurface(x, y, freq, 0.85));
      contours.updateContours(
        (x, y) => evaluatePartialSurface(x, y, freq, 0.85),
        [-0.75, -0.4, -0.1, 0.2, 0.55, 0.9]
      );
    }

    const { fx, fy, z } = evaluatePartialGradients(x0, y0, freq, 0.85);
    slicePlaneYFixed.position.set(0, 0.1, y0);
    slicePlaneXFixed.position.set(x0, 0.1, 0);

    for (let i = 0; i < curveSamples; i++) {
      const t = -2.2 + (4.4 * i) / (curveSamples - 1);
      curveXPos[i * 3 + 0] = t;
      curveXPos[i * 3 + 1] = evaluatePartialSurface(t, y0, freq, 0.85) + 0.03;
      curveXPos[i * 3 + 2] = y0;

      curveYPos[i * 3 + 0] = x0;
      curveYPos[i * 3 + 1] = evaluatePartialSurface(x0, t, freq, 0.85) + 0.03;
      curveYPos[i * 3 + 2] = t;
    }
    (curveXGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (curveYGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Tangent plane z_tan(x,y) = z0 + fx*(x-x0) + fy*(y-y0)
    const tPos = tangentGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < tPos.count; i++) {
      const dx = tangentBase[i * 3];
      const dz = tangentBase[i * 3 + 2];
      tPos.setXYZ(i, x0 + dx, z + fx * dx + fy * dz + 0.035, y0 + dz);
    }
    tPos.needsUpdate = true;
    tangentGeo.computeVertexNormals();

    markerMesh.position.set(x0, z + 0.05, y0);
    const scaleG = 0.65;
    origin.set(x0, z + 0.06, y0);
    target.set(x0 + fx * scaleG, z + 0.06 + (fx * fx + fy * fy) * 0.2, y0 + fy * scaleG);
    gradVec.setEndpoints(origin, target);
  };

  return {
    root,
    layers: { substrate, structure, operator, invariant },
    cameraPos: new THREE.Vector3(4.3, 3.3, 4.3),
    cameraTarget: new THREE.Vector3(0, 0.0, 0),
    update,
    dispose: () => disposeObject3D(root),
  };
}

/**
 * SCENE 2.2 — Grafo Computacional y Diferenciación Automática (AutoDiff)
 */
export function createAutoDiffScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const error = makeLayer('error');
  root.add(substrate, structure, operator, error);

  substrate.add(createNotebookSubstrate(theme, 5.0, 10, -1.1));

  const surface = createHeightfieldMesh('cobalt', theme, {
    segments: 42,
    domainHalf: 2.0,
    opacity: 0.82,
  });
  structure.add(surface.mesh);

  // Forward pass vertical evaluation stalk + glowing wax node
  const nodeSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 18, 14),
    createCrayonSurfaceMaterial({ crayon: 'sage', theme })
  );
  const stalkPos = new Float32Array(6);
  const stalkGeo = new THREE.BufferGeometry();
  stalkGeo.setAttribute('position', new THREE.BufferAttribute(stalkPos, 3));
  const stalkLine = new THREE.Line(stalkGeo, createCrayonLineMaterial('sage', theme, 0.9, 0.005));
  operator.add(nodeSphere, stalkLine);

  // Backward gradient components (dx cobalt, dy vermilion, combined gradient)
  const dxVec = createCrayonVector('cobalt', theme, 0.038, '∂f/∂x');
  const dyVec = createCrayonVector('vermilion', theme, 0.038, '∂f/∂y');
  const totalGradVec = createCrayonVector('vermilion', theme, 0.05, '∇f');
  error.add(dxVec.group, dyVec.group, totalGradVec.group);

  const origin = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  let lastW = -999;

  const update = (payload: SceneUpdatePayload) => {
    const x = payload.params.x ?? 0.7;
    const y = payload.params.y ?? 0.6;
    const w = payload.params.w ?? 1.6;

    if (Math.abs(w - lastW) > 1e-4) {
      lastW = w;
      surface.updateHeights((px, py) => {
        const raw = px * py + Math.sin(w * px) + 0.4 * py * py;
        return Math.max(-1.6, Math.min(2.2, raw * 0.35));
      });
    }

    const snap = evaluateAutoDiffDag(x, y, w, payload.autoDiffPass);
    const visH = Math.max(-1.6, Math.min(2.2, snap.outputValue * 0.35));

    nodeSphere.position.set(x, visH + 0.06, y);
    (nodeSphere.material as THREE.ShaderMaterial).userData.crayonToken =
      payload.autoDiffPass === 'backward' ? 'vermilion' : 'sage';

    stalkPos[0] = x;
    stalkPos[1] = -1.1;
    stalkPos[2] = y;
    stalkPos[3] = x;
    stalkPos[4] = visH + 0.06;
    stalkPos[5] = y;
    (stalkGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const clampVec = (v: number) => Math.max(-1.8, Math.min(1.8, v * 0.38));
    origin.set(x, visH + 0.08, y);
    dxVec.setEndpoints(origin, tgt.set(x + clampVec(snap.gradX), visH + 0.08, y));
    dyVec.setEndpoints(origin, tgt.set(x, visH + 0.08, y + clampVec(snap.gradY)));
    totalGradVec.setEndpoints(
      origin,
      tgt.set(x + clampVec(snap.gradX), visH + 0.24, y + clampVec(snap.gradY))
    );
  };

  return {
    root,
    layers: { substrate, structure, operator, error },
    cameraPos: new THREE.Vector3(4.2, 3.2, 4.2),
    cameraTarget: new THREE.Vector3(0, 0.1, 0),
    update,
    dispose: () => disposeObject3D(root),
  };
}

/**
 * SCENE 2.3 — Carrera de Optimizadores sobre Paisajes de Pérdida
 */
export function createOptimizersScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const invariant = makeLayer('invariant');
  root.add(substrate, structure, operator, invariant);

  substrate.add(createNotebookSubstrate(theme, 5.4, 10, -0.55));
  const contours = createFloorContourMesh('pencil', theme, 2.3, -0.52);
  substrate.add(contours.lines);

  const surface = createHeightfieldMesh('cobalt', theme, {
    segments: 48,
    domainHalf: 2.3,
    opacity: 0.82,
  });
  structure.add(surface.mesh);

  // 3 Optimizer probes (SGD cobalt, Momentum ochre, Adam sage) + trails + 3D crayon labels
  const maxTrailPts = 150;
  const probeDefs: Array<{ name: string; crayon: 'cobalt' | 'ochre' | 'sage' }> = [
    { name: 'SGD', crayon: 'cobalt' },
    { name: 'Mom', crayon: 'ochre' },
    { name: 'Adam', crayon: 'sage' },
  ];

  const probeHandles = probeDefs.map((def) => {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 16, 12),
      createCrayonSurfaceMaterial({ crayon: def.crayon, theme, outlineStrength: 0.8 })
    );
    const label = createCrayonLabelSprite(def.name, def.crayon, theme, 0.48);
    const trailPos = new Float32Array(maxTrailPts * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setDrawRange(0, 0);
    const trailLine = new THREE.Line(
      trailGeo,
      createCrayonLineMaterial(def.crayon, theme, 0.96, 0.004)
    );
    operator.add(sphere, label, trailLine);
    return { sphere, label, trailPos, trailGeo };
  });

  // Step anatomy vectors on Momentum probe: -alpha*grad (vermilion) vs inertia (ochre)
  const negGradVec = createCrayonVector('vermilion', theme, 0.04, '-α∇L');
  const inertiaVec = createCrayonVector('ochre', theme, 0.04, 'βv');
  invariant.add(negGradVec.group, inertiaVec.group);

  const origin = new THREE.Vector3();
  const tgt = new THREE.Vector3();
  let lastLandscape = '';

  const update = (payload: SceneUpdatePayload) => {
    const landscape = payload.landscape;
    if (landscape !== lastLandscape) {
      lastLandscape = landscape;
      surface.updateHeights((x, y) => evaluateLossLandscape(x, y, landscape).visualHeight);
      contours.updateContours(
        (x, y) => evaluateLossLandscape(x, y, landscape).visualHeight,
        [0.15, 0.45, 0.85, 1.35, 1.85]
      );
    }

    const lr = payload.params.lr ?? 0.06;
    const probes = payload.optimizerProbes;

    const startFanOffsets: Array<[number, number, number]> = [
      [-0.38, 0.36, 0.28],
      [0.02, 0.78, 0.0],
      [0.42, 0.42, -0.28],
    ];
    for (let i = 0; i < Math.min(3, probes.length); i++) {
      const p = probes[i];
      const h = probeHandles[i];
      h.sphere.position.set(p.x, p.z + 0.11, p.y);
      const spreadFactor = p.trail.length <= 2 ? 1 : Math.max(0, 1 - (p.trail.length - 2) / 6);
      const [ox, oy, oz] = startFanOffsets[i];
      h.label.position.set(
        p.x + ox * spreadFactor,
        p.z + 0.36 + (oy - 0.36) * spreadFactor,
        p.y + oz * spreadFactor
      );

      const n = Math.min(maxTrailPts, p.trail.length);
      for (let k = 0; k < n; k++) {
        h.trailPos[k * 3 + 0] = p.trail[k][0];
        h.trailPos[k * 3 + 1] = p.trail[k][1] + 0.06;
        h.trailPos[k * 3 + 2] = p.trail[k][2];
      }
      (h.trailGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      h.trailGeo.setDrawRange(0, n);
    }

    const mom = probes[1];
    if (mom) {
      origin.set(mom.x, mom.z + 0.15, mom.y);
      const gxScaled = Math.max(-1.4, Math.min(1.4, -lr * mom.gradX * 3.5));
      const gyScaled = Math.max(-1.4, Math.min(1.4, -lr * mom.gradY * 3.5));
      negGradVec.setEndpoints(origin, tgt.set(mom.x + gxScaled, mom.z + 0.16, mom.y + gyScaled));

      const vxScaled = Math.max(-1.4, Math.min(1.4, mom.velX * 4.5));
      const vyScaled = Math.max(-1.4, Math.min(1.4, mom.velY * 4.5));
      inertiaVec.setEndpoints(origin, tgt.set(mom.x + vxScaled, mom.z + 0.22, mom.y + vyScaled));
    }
  };

  return {
    root,
    layers: { substrate, structure, operator, invariant },
    cameraPos: new THREE.Vector3(4.3, 3.8, 4.3),
    cameraTarget: new THREE.Vector3(0, 0.35, 0),
    update,
    dispose: () => disposeObject3D(root),
  };
}

/**
 * SCENE 2.4 — Laboratorio de Regresión Simbólica Evolutiva (Humano vs. IA)
 */
export function createSymbolicScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const error = makeLayer('error');
  root.add(substrate, structure, operator, error);

  substrate.add(createNotebookSubstrate(theme, 4.8, 10, -1.05));

  // Target ghost pencil wireframe surface
  const targetSurf = createHeightfieldMesh('pencil', theme, {
    segments: 24,
    domainHalf: 2.0,
    opacity: 0.72,
    wireframe: true,
  });
  structure.add(targetSurf.mesh);

  // Human model surface (cobalt crayon)
  const humanSurf = createHeightfieldMesh('cobalt', theme, {
    segments: 34,
    domainHalf: 2.0,
    opacity: 0.68,
  });
  operator.add(humanSurf.mesh);

  // AI Genetic Worker surface (sage hatched translucent)
  const aiGridN = 25;
  const aiSurf = createHeightfieldMesh('sage', theme, {
    segments: aiGridN - 1,
    domainHalf: 2.0,
    opacity: 0.56,
    hatchStrength: 0.75,
  });
  aiSurf.mesh.visible = false;
  error.add(aiSurf.mesh);

  let lastTargetIdx = -1;
  let lastAiGridRef: Float32Array | null = null;

  const update = (payload: SceneUpdatePayload) => {
    const idx = payload.symbolicTargetIdx;
    const tgt = SYMBOLIC_TARGETS[idx] ?? SYMBOLIC_TARGETS[0];

    if (idx !== lastTargetIdx) {
      lastTargetIdx = idx;
      targetSurf.updateHeights((x, y) =>
        evaluateSymbolicBasis(
          x,
          y,
          tgt.weights[0],
          tgt.weights[1],
          tgt.weights[2],
          tgt.weights[3],
          tgt.weights[4]
        )
      );
    }

    humanSurf.updateHeights((x, y) =>
      evaluateSymbolicBasis(
        x,
        y,
        payload.params.wSin ?? 0.2,
        payload.params.wCos ?? 0.2,
        payload.params.wQuad ?? 0.0,
        payload.params.wCross ?? 0.0,
        payload.params.wGauss ?? 0.3
      )
    );

    if (payload.aiSymbolicGrid && payload.aiSymbolicGrid !== lastAiGridRef) {
      lastAiGridRef = payload.aiSymbolicGrid;
      const grid = payload.aiSymbolicGrid;
      const side = Math.round(Math.sqrt(grid.length));
      if (side === aiGridN) {
        aiSurf.mesh.visible = true;
        const pos = aiSurf.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const ix = i % side;
          const iz = Math.floor(i / side);
          const val = grid[ix * side + iz] ?? 0;
          pos.setY(i, val + 0.03);
        }
        pos.needsUpdate = true;
        aiSurf.geometry.computeVertexNormals();
      }
    } else if (!payload.aiSymbolicGrid) {
      aiSurf.mesh.visible = false;
      lastAiGridRef = null;
    }
  };

  return {
    root,
    layers: { substrate, structure, operator, error },
    cameraPos: new THREE.Vector3(4.3, 3.2, 4.3),
    cameraTarget: new THREE.Vector3(0, 0.1, 0),
    update,
    dispose: () => disposeObject3D(root),
  };
}
