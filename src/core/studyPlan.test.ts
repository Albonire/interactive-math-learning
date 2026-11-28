import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STUDY_MODULES,
  STUDY_MODULES_LIST,
  STUDY_PHASES,
  VERIFIED_REFERENCES,
  computePhaseCompletion,
  getAdjacentModuleIds,
  getRecommendedNextModule,
  verifyStudyPlanDag,
  type StudyModuleId,
} from './studyPlan';
import { DIAGNOSTIC_QUESTIONS, evaluateDiagnostic } from './diagnostic';

test('study plan contains all 7 phases (0–6) and all 32 modules (M1–M32) with exact numbering', () => {
  assert.equal(STUDY_PHASES.length, 7);
  assert.equal(STUDY_MODULES_LIST.length, 32);

  for (let i = 1; i <= 32; i++) {
    const id = `M${i}` as StudyModuleId;
    const mod = STUDY_MODULES[id];
    assert.ok(mod, `Missing module ${id}`);
    assert.equal(mod.number, i);
    assert.ok(mod.syllabus.length >= 3, `${id} should have syllabus items`);
    assert.ok(mod.visualSpecs.length >= 2, `${id} should have visual specs`);
    assert.ok(mod.pythonLab.code.length > 30, `${id} should include concrete Python code`);
    assert.ok(mod.references.length >= 2, `${id} should cite verified references`);
    for (const ref of mod.references) {
      assert.ok(VERIFIED_REFERENCES[ref], `${id} references unknown code ${ref}`);
    }
  }
});

test('32-module prerequisite graph is a valid acyclic DAG matching PLAN_ESTUDIO.md', () => {
  const result = verifyStudyPlanDag();
  assert.equal(result.acyclic, true);
  assert.equal(result.visitedCount, 32);

  // Spot-check key cross-phase dependencies from PLAN_ESTUDIO.md
  assert.deepEqual(STUDY_MODULES.M1.prerequisites, []);
  assert.deepEqual(STUDY_MODULES.M17.prerequisites, ['M14', 'M18']);
  assert.deepEqual(STUDY_MODULES.M18.prerequisites, ['M4', 'M6']);
  assert.deepEqual(STUDY_MODULES.M28.prerequisites, ['M12', 'M17', 'M19', 'M23']);
  assert.deepEqual(STUDY_MODULES.M32.prerequisites, ['M6', 'M10', 'M16']);
  assert.equal(STUDY_MODULES.M32.optional, true);
});

test('all 32 module checkpoints and Phase 0 diagnostic questions respect Regla fija R-OM length balance', () => {
  const checkBalance = (label: string, options: readonly string[], correctIndex: number) => {
    assert.equal(options.length, 4, `${label} must have 4 options`);
    assert.ok(correctIndex >= 0 && correctIndex < 4);
    const lengths = options.map((o) => o.trim().length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    // Strict R-OM guard: longest option must not exceed 1.75x shortest option
    assert.ok(
      maxLen / minLen <= 1.75,
      `${label} violates R-OM length balance (min=${minLen}, max=${maxLen})`
    );
  };

  for (const mod of STUDY_MODULES_LIST) {
    checkBalance(`Checkpoint ${mod.id}`, mod.checkpoint.options, mod.checkpoint.correctIndex);
  }
  for (const q of DIAGNOSTIC_QUESTIONS) {
    checkBalance(`Diagnostic ${q.id}`, q.options, q.correctIndex);
  }
});

test('navigation, phase progress, and recommendation helpers behave predictably', () => {
  assert.deepEqual(getAdjacentModuleIds('M1'), { prev: null, next: 'M2' });
  assert.deepEqual(getAdjacentModuleIds('M32'), { prev: 'M31', next: null });

  const done = new Set<StudyModuleId>(['M1', 'M2', 'M3']);
  assert.deepEqual(computePhaseCompletion('phase-1', done), {
    done: 3,
    total: 6,
    percent: 50,
  });
  assert.equal(getRecommendedNextModule(done), 'M4');
});

test('Phase 0 diagnostic applies 80% threshold, isolates misconceptions, and recommends entry point', () => {
  // All correct -> all blocks fast-track, recommend M7 (Phase 2)
  const allRight: Record<string, number> = {};
  for (const q of DIAGNOSTIC_QUESTIONS) allRight[q.id] = q.correctIndex;
  const perfect = evaluateDiagnostic(allRight);
  assert.equal(perfect.overallPercent, 100);
  assert.equal(perfect.detectedMisconceptions.length, 0);
  assert.equal(perfect.fastTrackModules.length, 9);
  assert.equal(perfect.recommendedEntryModule, 'M7');

  // Miss M2 and M5 -> both flagged cursar-completo, M2 recommended as entry
  const partial = { ...allRight, 'diag-m2-pow': 1, 'diag-m5-quant': 1 };
  const report = evaluateDiagnostic(partial);
  assert.deepEqual(report.fullStudyModules, ['M2', 'M5']);
  assert.equal(report.recommendedEntryModule, 'M2');
  assert.ok(report.detectedMisconceptions.some((m) => m.id === 'power-distribution'));
  assert.ok(report.detectedMisconceptions.some((m) => m.id === 'quantifier-negation'));
});
