import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, buildComputationalBridge } from './curriculum';
import { LESSON_ORDER } from './lessons';

test('all 8 lessons provide idiomatic Rust and Java memory layouts and code snippets with zero TypeScript leftovers', () => {
  for (const sceneId of LESSON_ORDER) {
    const defaults: Record<string, number> = {};
    for (const p of SCENES[sceneId].defaultParams) {
      defaults[p.id] = p.value;
    }
    const bridge = buildComputationalBridge(sceneId, defaults, {
      activation: 'relu',
      dataset: 'rings',
      landscape: 'rosenbrock',
      symbolicTargetIdx: 0,
      aiFormula: '0.80·sin(x)',
      aiMse: 0.04,
      generation: 12,
    });

    assert.ok(bridge.memoryValues.length > 0, `${sceneId} exposes live memory values`);
    assert.equal(bridge.implementations.rust.label, 'Rust');
    assert.equal(bridge.implementations.java.label, 'Java');
    assert.ok(bridge.implementations.rust.memoryLayout.length > 10);
    assert.ok(bridge.implementations.java.memoryLayout.length > 10);
    assert.ok(bridge.implementations.rust.codeSnippet.length > 20);
    assert.ok(bridge.implementations.java.codeSnippet.length > 20);

    // Ensure neither snippet accidentally falls back to JS/TS syntax
    assert.ok(!bridge.implementations.rust.codeSnippet.includes('const '));
    assert.ok(!bridge.implementations.java.codeSnippet.includes('const '));
  }
});
