import test from 'node:test';
import assert from 'node:assert/strict';
import { LESSON_ORDER } from '../core/lessons';
import { SCENES } from '../core/curriculum';
import {
  SCENE_ANNOTATIONS,
  computeCalloutLayout,
  getWorldAnchorForParam,
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

