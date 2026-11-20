import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSON_ORDER } from '../core/lessons';
import { SCENES } from '../core/curriculum';
import {
  ECO_ACTIVE_BASE_OPACITY,
  ECO_RESTING_OPACITY,
  IDLE_GUIDE_DELAY_MS,
  SCENE_ANNOTATIONS,
  computeAnnotationOpacity,
  computeCalloutLayout,
  computeGuideArrowGeometry,
  getWorldAnchorForParam,
  selectPrimaryInteractiveAnnotation,
  type ProjectedAnnotation,
} from './sceneAnnotations';
import type { SceneUpdatePayload } from './scenes/types';

function makePayload(sceneId: (typeof LESSON_ORDER)[number]): SceneUpdatePayload {
  const params: Record<string, number> = {};
  for (const p of SCENES[sceneId].defaultParams) {
    params[p.id] = p.value;
  }
  return {
    sceneId,
    params,
    theme: 'paper',
    activation: 'tanh',
    dataset: 'rings',
    landscape: 'rosenbrock',
    autoDiffPass: 'idle',
    optimizerProbes: [],
    symbolicTargetIdx: 0,
    aiSymbolicGrid: null,
  };
}

test('all 8 scenes define 3 to 4 valid 3D anatomy callouts with finite world anchors', () => {
  for (const id of LESSON_ORDER) {
    const specs = SCENE_ANNOTATIONS[id];
    assert.ok(specs && specs.length >= 3 && specs.length <= 4, `Expected 3-4 annotations for ${id}`);
    const payload = makePayload(id);
    for (const s of specs) {
      const [x, y, z] = s.getWorldAnchor(payload);
      assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
      assert.ok(s.label.length > 2);
      assert.ok(s.note.length > 5);
    }
  }
});

test('getWorldAnchorForParam returns the exact 3D anchor of the manipulated parameter', () => {
  const payload = makePayload('lin-span');
  payload.params.c1 = 1.9;
  const anchor = getWorldAnchorForParam(payload, 'c1');
  assert.equal(anchor[0], 1.9);
});

test('computeCalloutLayout separates stacked callouts cleanly without vertical overlap', () => {
  const crowded: ProjectedAnnotation[] = [
    {
      id: 'a',
      label: 'Parte A',
      note: 'Nota A',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['c1'],
      anchorX: 520,
      anchorY: 340,
      visible: true,
    },
    {
      id: 'b',
      label: 'Parte B',
      note: 'Nota B',
      layerId: 'operator',
      crayon: 'vermilion',
      linkedParamIds: ['c2'],
      anchorX: 540,
      anchorY: 346,
      visible: true,
    },
    {
      id: 'c',
      label: 'Parte C',
      note: 'Nota C',
      layerId: 'structure',
      crayon: 'sage',
      linkedParamIds: ['v3y'],
      anchorX: 880,
      anchorY: 360,
      visible: true,
    },
  ];

  const laid = computeCalloutLayout(crowded, 1440, 720);
  assert.equal(laid.length, 3);
  const left = laid.filter((item) => item.side === 'left').sort((a, b) => a.labelY - b.labelY);
  assert.equal(left.length, 2);
  assert.ok(
    left[1].labelY - left[0].labelY >= 70,
    `Expected non-overlapping vertical gap (>=70px), got ${left[1].labelY - left[0].labelY}`
  );
});

test('dynamic isVisible guards hide annotations when their 3D mesh is absent', () => {
  const symPayload = makePayload('calc-symbolic');
  const symAi = SCENE_ANNOTATIONS['calc-symbolic'].find((s) => s.id === 'sym-ai');
  assert.ok(symAi?.isVisible);
  assert.equal(symAi.isVisible(symPayload), false, 'AI callout hidden before worker runs');
  symPayload.aiSymbolicGrid = new Float32Array(625);
  assert.equal(symAi.isVisible(symPayload), true, 'AI callout shown once AI surface exists');

  const eigPayload = makePayload('lin-eigen');
  const eigLine = SCENE_ANNOTATIONS['lin-eigen'].find((s) => s.id === 'eig-line');
  assert.ok(eigLine?.isVisible);
  assert.equal(eigLine.isVisible(eigPayload), true, 'Default matrix has real eigenvectors');
  // Pure 90-degree rotation has only complex eigenvalues
  eigPayload.params.a = 0;
  eigPayload.params.b = -1;
  eigPayload.params.c = 1;
  eigPayload.params.d = 0;
  assert.equal(eigLine.isVisible(eigPayload), false, 'Rotation matrix hides real eigenvector callout');
});

test('selectPrimaryInteractiveAnnotation picks highest interaction-weight 3D component and computes bounded arrow', () => {
  assert.equal(IDLE_GUIDE_DELAY_MS, 5000);

  const projected: ProjectedAnnotation[] = [
    {
      id: 'low-weight',
      label: 'Vector v₁',
      note: '1 parámetro',
      layerId: 'operator',
      crayon: 'cobalt',
      linkedParamIds: ['c1'],
      anchorX: 600,
      anchorY: 360,
      visible: true,
    },
    {
      id: 'high-weight',
      label: 'Volumen |det|',
      note: '3 parámetros',
      layerId: 'structure',
      crayon: 'sage',
      linkedParamIds: ['c1', 'c2', 'v3y'],
      anchorX: 720,
      anchorY: 320,
      visible: true,
    },
    {
      id: 'offscreen-high',
      label: 'Fuera',
      note: 'Oculto',
      layerId: 'operator',
      crayon: 'vermilion',
      linkedParamIds: ['a', 'b', 'c', 'd', 'e'],
      anchorX: -50,
      anchorY: 300,
      visible: true,
    },
  ];

  const primary = selectPrimaryInteractiveAnnotation(projected, 1440, 720);
  assert.equal(primary?.id, 'high-weight');

  const arrow = computeGuideArrowGeometry(primary!, 1440, 720);
  assert.ok(arrow.startX >= 40 && arrow.startX <= 1400);
  assert.ok(arrow.startY >= 80 && arrow.startY <= 680);
  const distToAnchor = Math.hypot(arrow.tipX - primary!.anchorX, arrow.tipY - primary!.anchorY);
  assert.ok(distToAnchor > 8 && distToAnchor < 18, 'arrow tip sits neatly beside anchor ring');
});

test('computeAnnotationOpacity switches from fixed in normal mode to mouse-linked dynamic opacity in Eco Mode', () => {
  const normalSteady = computeAnnotationOpacity({
    ecoMode: false,
    isLinked: false,
    isDimmed: false,
    pointer: null,
    anchorX: 700,
    anchorY: 340,
    labelX: 160,
    labelY: 340,
  });
  assert.equal(normalSteady, 0.88);

  const ecoResting = computeAnnotationOpacity({
    ecoMode: true,
    isLinked: false,
    isDimmed: false,
    pointer: { x: 700, y: 340, active: false },
    anchorX: 700,
    anchorY: 340,
    labelX: 160,
    labelY: 340,
  });
  assert.equal(ecoResting, ECO_RESTING_OPACITY);

  const ecoFarMoving = computeAnnotationOpacity({
    ecoMode: true,
    isLinked: false,
    isDimmed: false,
    pointer: { x: 1380, y: 680, active: true },
    anchorX: 700,
    anchorY: 340,
    labelX: 160,
    labelY: 340,
  });
  const ecoNearMoving = computeAnnotationOpacity({
    ecoMode: true,
    isLinked: false,
    isDimmed: false,
    pointer: { x: 710, y: 345, active: true },
    anchorX: 700,
    anchorY: 340,
    labelX: 160,
    labelY: 340,
  });

  assert.ok(ecoFarMoving >= ECO_ACTIVE_BASE_OPACITY && ecoFarMoving < ecoNearMoving);
  assert.ok(ecoNearMoving > 0.9 && ecoNearMoving <= 0.98);
});

