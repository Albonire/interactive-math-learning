import * as THREE from 'three';
import type { ThemeMode } from '../../core/types';
import {
  computeRealEigen2D,
  computeRank3,
  computeSvd3,
  determinant3,
  evaluateSvdStageMatrix,
  generateManifoldPoints,
  mat3FromColumns,
  mat3MulVec,
  type Mat3,
  type Vec3,
} from '../../math/linearAlgebra';
import { createCrayonLineMaterial, createCrayonSurfaceMaterial } from '../CrayonMaterials';
import {
  createCrayonVector,
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
 * SCENE 1.1 — Span e Independencia Lineal
 */
export function createSpanScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const error = makeLayer('error');
  root.add(substrate, structure, operator, error);

  substrate.add(createNotebookSubstrate(theme, 5.2, 10, 0));

  // Parallelepiped (8 vertices deformed dynamically)
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  // Shift unit cube corners from [-0.5, 0.5] to [0, 1]
  boxGeo.translate(0.5, 0.5, 0.5);
  const baseBoxPositions = new Float32Array(boxGeo.attributes.position.array);
  const boxMat = createCrayonSurfaceMaterial({
    crayon: 'sage',
    theme,
    opacity: 0.42,
    hatchStrength: 0.55,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const boxMesh = new THREE.Mesh(boxGeo, boxMat);

  // Wireframe edges of parallelepiped (12 edges = 24 vertices)
  const edgePairs: Array<[Vec3, Vec3]> = [
    [[0, 0, 0], [1, 0, 0]], [[0, 0, 0], [0, 1, 0]], [[0, 0, 0], [0, 0, 1]],
    [[1, 0, 0], [1, 1, 0]], [[1, 0, 0], [1, 0, 1]],
    [[0, 1, 0], [1, 1, 0]], [[0, 1, 0], [0, 1, 1]],
    [[0, 0, 1], [1, 0, 1]], [[0, 0, 1], [0, 1, 1]],
    [[1, 1, 0], [1, 1, 1]], [[1, 0, 1], [1, 1, 1]], [[0, 1, 1], [1, 1, 1]],
  ];
  const edgePos = new Float32Array(edgePairs.length * 6);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
  const edgeLines = new THREE.LineSegments(edgeGeo, createCrayonLineMaterial('sage', theme, 0.85, 0.006));
  structure.add(boxMesh, edgeLines);

  // Vectors v1 (cobalt), v2 (vermilion), v3 (ochre), resultant p (graphite) with 3D hand-lettered labels
  const vec1 = createCrayonVector('cobalt', theme, 0.052, 'v₁');
  const vec2 = createCrayonVector('vermilion', theme, 0.052, 'v₂');
  const vec3 = createCrayonVector('ochre', theme, 0.052, 'v₃');
  const vecP = createCrayonVector('graphite', theme, 0.038, 'p');
  operator.add(vec1.group, vec2.group, vec3.group, vecP.group);

  // Collapse hatched sheet (visible when rank < 3)
  const sheetGeo = new THREE.PlaneGeometry(3.8, 3.8);
  sheetGeo.rotateX(-Math.PI / 2);
  const sheetMat = createCrayonSurfaceMaterial({
    crayon: 'vermilion',
    theme,
    opacity: 0.48,
    hatchStrength: 0.95,
    hatchScale: 6.5,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const collapseSheet = new THREE.Mesh(sheetGeo, sheetMat);
  collapseSheet.position.y = 0.03;
  error.add(collapseSheet);

  const origin = new THREE.Vector3(0, 0, 0);
  const tmpTarget = new THREE.Vector3();

  const update = (payload: SceneUpdatePayload) => {
    const c1 = payload.params.c1 ?? 1.2;
    const c2 = payload.params.c2 ?? 1.1;
    const v3y = payload.params.v3y ?? 1.0;

    const v1: Vec3 = [c1, 0.2, 0.1];
    const v2: Vec3 = [0.2, 0.3, c2];
    const v3: Vec3 = [0.4, v3y, 0.35];
    const p: Vec3 = [v1[0] + v2[0] + v3[0], v1[1] + v2[1] + v3[1], v1[2] + v2[2] + v3[2]];

    vec1.setEndpoints(origin, tmpTarget.set(v1[0], v1[1], v1[2]));
    vec2.setEndpoints(origin, tmpTarget.set(v2[0], v2[1], v2[2]));
    vec3.setEndpoints(origin, tmpTarget.set(v3[0], v3[1], v3[2]));
    vecP.setEndpoints(origin, tmpTarget.set(p[0] * 0.65, p[1] * 0.65, p[2] * 0.65));

    const posAttr = boxGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const bx = baseBoxPositions[i * 3];
      const by = baseBoxPositions[i * 3 + 1];
      const bz = baseBoxPositions[i * 3 + 2];
      posAttr.setXYZ(
        i,
        bx * v1[0] + by * v3[0] + bz * v2[0],
        bx * v1[1] + by * v3[1] + bz * v2[1],
        bx * v1[2] + by * v3[2] + bz * v2[2]
      );
    }
    posAttr.needsUpdate = true;
    boxGeo.computeVertexNormals();

    const mapPt = (u: Vec3): Vec3 => [
      u[0] * v1[0] + u[1] * v3[0] + u[2] * v2[0],
      u[0] * v1[1] + u[1] * v3[1] + u[2] * v2[1],
      u[0] * v1[2] + u[1] * v3[2] + u[2] * v2[2],
    ];
    for (let e = 0; e < edgePairs.length; e++) {
      const a = mapPt(edgePairs[e][0]);
      const b = mapPt(edgePairs[e][1]);
      edgePos[e * 6 + 0] = a[0];
      edgePos[e * 6 + 1] = a[1];
      edgePos[e * 6 + 2] = a[2];
      edgePos[e * 6 + 3] = b[0];
      edgePos[e * 6 + 4] = b[1];
      edgePos[e * 6 + 5] = b[2];
    }
    (edgeGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const rank = computeRank3(v1, v2, v3);
    const detAbs = Math.abs(determinant3(mat3FromColumns(v1, v2, v3)));
    const collapsed = rank < 3 || detAbs < 0.14;
    collapseSheet.visible = collapsed;
    boxMat.userData.crayonToken = collapsed ? 'vermilion' : 'sage';
    (edgeLines.material as THREE.ShaderMaterial).userData.crayonToken = collapsed ? 'vermilion' : 'sage';
  };

  return {
    root,
    layers: { substrate, structure, operator, error },
    cameraPos: new THREE.Vector3(4.1, 3.1, 4.4),
    cameraTarget: new THREE.Vector3(0.5, 0.55, 0.4),
    update,
    dispose: () => disposeObject3D(root),
  };
}

/**
 * SCENE 1.2 — Transformaciones, Determinante y Descomposición SVD
 */
export function createSvdScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const error = makeLayer('error');
  root.add(substrate, structure, operator, error);

  substrate.add(createNotebookSubstrate(theme, 5.2, 10, -0.02));

  // Deformable unit cube centered at [0..1]
  const cubeGeo = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
  cubeGeo.translate(0.5, 0.5, 0.5);
  const cubeBase = new Float32Array(cubeGeo.attributes.position.array);
  const cubeMat = createCrayonSurfaceMaterial({
    crayon: 'sage',
    theme,
    opacity: 0.62,
    hatchStrength: 0.6,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);

  // Deformed grid lines in XZ plane
  const gridSegs: Array<[Vec3, Vec3]> = [];
  for (let i = -2; i <= 2; i++) {
    gridSegs.push([[i * 0.75, 0, -1.5], [i * 0.75, 0, 1.5]]);
    gridSegs.push([[-1.5, 0, i * 0.75], [1.5, 0, i * 0.75]]);
  }
  const deformedGridPos = new Float32Array(gridSegs.length * 6);
  const deformedGridGeo = new THREE.BufferGeometry();
  deformedGridGeo.setAttribute('position', new THREE.BufferAttribute(deformedGridPos, 3));
  const deformedGrid = new THREE.LineSegments(
    deformedGridGeo,
    createCrayonLineMaterial('cobalt', theme, 0.45, 0.005)
  );
  structure.add(cubeMesh, deformedGrid);

  // Basis arrows i', j', k' with 3D crayon labels
  const iVec = createCrayonVector('cobalt', theme, 0.048, "î'");
  const jVec = createCrayonVector('vermilion', theme, 0.048, "ĵ'");
  const kVec = createCrayonVector('ochre', theme, 0.048, "k̂'");
  operator.add(iVec.group, jVec.group, kVec.group);

  // SVD singular semi-axes + wireframe ellipsoid
  const sphereGeo = new THREE.SphereGeometry(1, 18, 12);
  const sphereBase = new Float32Array(sphereGeo.attributes.position.array);
  const sphereMat = createCrayonSurfaceMaterial({
    crayon: 'ochre',
    theme,
    opacity: 0.3,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  sphereMat.wireframe = true;
  const svdEllipsoid = new THREE.Mesh(sphereGeo, sphereMat);
  const s1Vec = createCrayonVector('ochre', theme, 0.034, 'σ₁');
  const s2Vec = createCrayonVector('ochre', theme, 0.034, 'σ₂');
  error.add(svdEllipsoid, s1Vec.group, s2Vec.group);

  const origin = new THREE.Vector3(0, 0, 0);
  const tmp = new THREE.Vector3();

  const update = (payload: SceneUpdatePayload) => {
    const a11 = payload.params.a11 ?? 1.3;
    const a12 = payload.params.a12 ?? 0.5;
    const a21 = payload.params.a21 ?? 0.2;
    const a22 = payload.params.a22 ?? 1.1;
    const a33 = payload.params.a33 ?? 1.0;
    const stage = payload.params.svdStage ?? 3.0;

    // Mathematical 3x3 matrix (X, Z horizontal plane, Y vertical = a33)
    const A: Mat3 = [a11, 0, a12, 0, a33, 0, a21, 0, a22];
    const svd = computeSvd3(A);
    const M = evaluateSvdStageMatrix(svd, stage);
    const det = determinant3(M);

    // Deform cube
    const pos = cubeGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const r = mat3MulVec(M, [cubeBase[i * 3], cubeBase[i * 3 + 1], cubeBase[i * 3 + 2]]);
      pos.setXYZ(i, r[0], r[1], r[2]);
    }
    pos.needsUpdate = true;
    cubeGeo.computeVertexNormals();

    // Flip to vermilion if orientation reversed or singular
    cubeMat.userData.crayonToken = det < 0 || Math.abs(det) < 0.08 ? 'vermilion' : 'sage';
    cubeMat.uniforms.uHatchStrength.value = det < 0 ? 0.95 : 0.45;

    // Deform grid
    for (let s = 0; s < gridSegs.length; s++) {
      const p0 = mat3MulVec(M, gridSegs[s][0]);
      const p1 = mat3MulVec(M, gridSegs[s][1]);
      deformedGridPos[s * 6 + 0] = p0[0];
      deformedGridPos[s * 6 + 1] = p0[1] + 0.01;
      deformedGridPos[s * 6 + 2] = p0[2];
      deformedGridPos[s * 6 + 3] = p1[0];
      deformedGridPos[s * 6 + 4] = p1[1] + 0.01;
      deformedGridPos[s * 6 + 5] = p1[2];
    }
    (deformedGridGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // Basis vectors
    const col1 = mat3MulVec(M, [1, 0, 0]);
    const col2 = mat3MulVec(M, [0, 0, 1]);
    const col3 = mat3MulVec(M, [0, 1, 0]);
    iVec.setEndpoints(origin, tmp.set(col1[0], col1[1], col1[2]));
    jVec.setEndpoints(origin, tmp.set(col2[0], col2[1], col2[2]));
    kVec.setEndpoints(origin, tmp.set(col3[0], col3[1], col3[2]));

    // Ellipsoid from unit sphere under M
    const spPos = sphereGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < spPos.count; i++) {
      const r = mat3MulVec(M, [sphereBase[i * 3], sphereBase[i * 3 + 1], sphereBase[i * 3 + 2]]);
      spPos.setXYZ(i, r[0], r[1], r[2]);
    }
    spPos.needsUpdate = true;
    sphereGeo.computeVertexNormals();

    // Principal singular axes
    const u0: Vec3 = [svd.U[0] * svd.S[0], svd.U[3] * svd.S[0], svd.U[6] * svd.S[0]];
    const u1: Vec3 = [svd.U[1] * svd.S[1], svd.U[4] * svd.S[1], svd.U[7] * svd.S[1]];
    s1Vec.setEndpoints(origin, tmp.set(u0[0], u0[1], u0[2]));
    s2Vec.setEndpoints(origin, tmp.set(u1[0], u1[1], u1[2]));
  };

  return {
    root,
    layers: { substrate, structure, operator, error },
    cameraPos: new THREE.Vector3(4.2, 3.2, 4.2),
    cameraTarget: new THREE.Vector3(0.35, 0.35, 0.35),
    update,
    dispose: () => disposeObject3D(root),
  };
}

/**
 * SCENE 1.3 — Autovectores y Direcciones Invariantes
 */
export function createEigenScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const invariant = makeLayer('invariant');
  root.add(substrate, structure, operator, invariant);

  substrate.add(createNotebookSubstrate(theme, 5.2, 10, 0));

  // Unit circle on XZ plane
  const circlePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    circlePts.push(new THREE.Vector3(Math.cos(a), 0.02, Math.sin(a)));
  }
  const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePts);
  substrate.add(new THREE.Line(circleGeo, createCrayonLineMaterial('graphite', theme, 0.55, 0.004)));

  // Instanced crown of 24 transformed rays (1 draw call!)
  const rayCount = 24;
  const rayGeo = new THREE.CylinderGeometry(0.014, 0.014, 1, 6);
  rayGeo.translate(0, 0.5, 0);
  const rayMat = createCrayonSurfaceMaterial({ crayon: 'pencil', theme, opacity: 0.72, transparent: true });
  const crownInst = new THREE.InstancedMesh(rayGeo, rayMat, rayCount);
  crownInst.frustumCulled = false;
  structure.add(crownInst);

  // User probe v (cobalt) and transformed A*v (vermilion) with 3D crayon labels
  const probeV = createCrayonVector('cobalt', theme, 0.054, 'v');
  const probeAv = createCrayonVector('vermilion', theme, 0.046, 'A·v');
  operator.add(probeV.group, probeAv.group);

  // Invariant eigenvector lines (ochre)
  const eigenLine1 = createCrayonVector('ochre', theme, 0.038, 'λ₁');
  const eigenLine1Neg = createCrayonVector('ochre', theme, 0.038);
  const eigenLine2 = createCrayonVector('ochre', theme, 0.038, 'λ₂');
  const eigenLine2Neg = createCrayonVector('ochre', theme, 0.038);
  invariant.add(eigenLine1.group, eigenLine1Neg.group, eigenLine2.group, eigenLine2Neg.group);

  const origin = new THREE.Vector3(0, 0.05, 0);
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const dir = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const mat4 = new THREE.Matrix4();

  const update = (payload: SceneUpdatePayload) => {
    const a = payload.params.a ?? 1.5;
    const b = payload.params.b ?? 0.5;
    const c = payload.params.c ?? 0.3;
    const d = payload.params.d ?? 0.9;
    const theta = payload.params.probeAngle ?? 0.4;

    // Update instanced crown
    for (let i = 0; i < rayCount; i++) {
      const ang = (i / rayCount) * Math.PI * 2;
      const vx = Math.cos(ang);
      const vz = Math.sin(ang);
      const ax = a * vx + b * vz;
      const az = c * vx + d * vz;
      const len = Math.max(0.05, Math.hypot(ax, az));
      dir.set(ax / len, 0, az / len);
      quat.setFromUnitVectors(up, dir);
      scale.set(1, len, 1);
      mat4.compose(origin, quat, scale);
      crownInst.setMatrixAt(i, mat4);
    }
    crownInst.instanceMatrix.needsUpdate = true;

    // Probe v and A*v
    const pvx = Math.cos(theta);
    const pvz = Math.sin(theta);
    const pavx = a * pvx + b * pvz;
    const pavz = c * pvx + d * pvz;
    probeV.setEndpoints(origin, tmp.set(pvx * 1.15, 0.05, pvz * 1.15));
    probeAv.setEndpoints(origin, tmp.set(pavx, 0.12, pavz));

    // Real eigenvectors
    const pairs = computeRealEigen2D(a, b, c, d);
    if (pairs[0]) {
      const l = Math.max(0.8, Math.min(2.6, Math.abs(pairs[0].lambda) * 1.25));
      const [ex, ez] = pairs[0].vector;
      eigenLine1.setEndpoints(origin, tmp.set(ex * l, 0.08, ez * l));
      eigenLine1Neg.setEndpoints(origin, tmp.set(-ex * l, 0.08, -ez * l));
    } else {
      eigenLine1.group.visible = false;
      eigenLine1Neg.group.visible = false;
    }

    if (pairs[1]) {
      const l = Math.max(0.8, Math.min(2.6, Math.abs(pairs[1].lambda) * 1.25));
      const [ex, ez] = pairs[1].vector;
      eigenLine2.setEndpoints(origin, tmp.set(ex * l, 0.08, ez * l));
      eigenLine2Neg.setEndpoints(origin, tmp.set(-ex * l, 0.08, -ez * l));
    } else {
      eigenLine2.group.visible = false;
      eigenLine2Neg.group.visible = false;
    }
  };

  return {
    root,
    layers: { substrate, structure, operator, invariant },
    cameraPos: new THREE.Vector3(0.4, 4.8, 3.6),
    cameraTarget: new THREE.Vector3(0, 0, 0),
    update,
    dispose: () => disposeObject3D(root),
  };
}

/**
 * SCENE 1.4 — Plegado de Variedades Neuronales (Neural Manifold Folding)
 */
export function createManifoldScene(theme: ThemeMode): BibifoldSceneController {
  const root = new THREE.Group();
  const substrate = makeLayer('substrate');
  const structure = makeLayer('structure');
  const operator = makeLayer('operator');
  const invariant = makeLayer('invariant');
  root.add(substrate, structure, operator, invariant);

  substrate.add(createNotebookSubstrate(theme, 5.0, 10, -0.6));

  // Folded continuous sheet (plum crayon)
  const sheet = createHeightfieldMesh('plum', theme, {
    segments: 38,
    domainHalf: 2.1,
    opacity: 0.45,
    hatchStrength: 0.25,
  });
  structure.add(sheet.mesh);

  // Instanced class A (cobalt) and class B (plum) markers (2 draw calls total!)
  const countPerClass = 48;
  const markerGeo = new THREE.OctahedronGeometry(0.085, 1);
  const matA = createCrayonSurfaceMaterial({ crayon: 'cobalt', theme });
  const matB = createCrayonSurfaceMaterial({ crayon: 'plum', theme });
  const instA = new THREE.InstancedMesh(markerGeo, matA, countPerClass);
  const instB = new THREE.InstancedMesh(markerGeo, matB, countPerClass);
  instA.frustumCulled = false;
  instB.frustumCulled = false;
  operator.add(instA, instB);

  // Linear separator plane (sage/graphite)
  const sepGeo = new THREE.PlaneGeometry(4.4, 4.4);
  sepGeo.rotateX(-Math.PI / 2);
  const sepMat = createCrayonSurfaceMaterial({
    crayon: 'sage',
    theme,
    opacity: 0.34,
    hatchStrength: 0.7,
    doubleSide: true,
    transparent: true,
    depthWrite: false,
  });
  const sepPlane = new THREE.Mesh(sepGeo, sepMat);
  invariant.add(sepPlane);

  const dummy = new THREE.Object3D();

  const update = (payload: SceneUpdatePayload) => {
    const w = payload.params.weight ?? 1.4;
    const b = payload.params.bias ?? 0.0;
    const fold = payload.params.fold ?? 1.0;
    const act = payload.activation;
    const dataset = payload.dataset;

    const { points, planeY } = generateManifoldPoints(dataset, w, b, fold, act, countPerClass);

    let idxA = 0;
    let idxB = 0;
    for (const pt of points) {
      dummy.position.set(pt.x, pt.y, pt.z);
      dummy.rotation.set(0.3, pt.x * 0.5, 0.2);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      if (pt.label === 0 && idxA < countPerClass) {
        instA.setMatrixAt(idxA++, dummy.matrix);
      } else if (pt.label === 1 && idxB < countPerClass) {
        instB.setMatrixAt(idxB++, dummy.matrix);
      }
    }
    instA.instanceMatrix.needsUpdate = true;
    instB.instanceMatrix.needsUpdate = true;

    sheet.updateHeights((x, z) => {
      const r2 = x * x + z * z;
      const feat =
        dataset === 'rings'
          ? w * (r2 - 1.35) + b
          : w * Math.sin(Math.atan2(z, x) - Math.hypot(x, z) * 2.8) + b;
      if (act === 'linear') return fold * 0.35 * (w * x + b * 0.6);
      if (act === 'tanh') return fold * 1.45 * Math.tanh(feat);
      if (act === 'relu') return fold * 1.45 * Math.max(0, feat);
      return fold * 1.45 * (1 / (1 + Math.exp(-feat)));
    });

    sepPlane.position.y = planeY;
  };

  return {
    root,
    layers: { substrate, structure, operator, invariant },
    cameraPos: new THREE.Vector3(4.3, 3.1, 4.3),
    cameraTarget: new THREE.Vector3(0, 0.35, 0),
    update,
    dispose: () => disposeObject3D(root),
  };
}
