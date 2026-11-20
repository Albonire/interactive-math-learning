import type { CSSProperties } from 'react';
import type { ChallengeProximityState } from '../ai/challengeProximity';
import type { GuidedLessonSpec } from '../core/lessons';
import type { ChallengeSpec, SceneId, SymbolicParameter, ThemeMode } from '../core/types';
import type { ActivationKind, ManifoldDatasetKind } from '../math/linearAlgebra';
import { SYMBOLIC_TARGETS } from '../math/multivariable';
import {
  CrayonArrowLeft,
  CrayonArrowRight,
  CrayonCheck,
  CrayonChevron,
  CrayonLayers,
  CrayonPause,
  CrayonPlay,
  CrayonReset,
} from './CrayonIcons';
import { KatexInline } from './KatexFormula';
import { CrayonButton, CrayonSlider, CrayonStepMarker, RoughDivider } from './RoughElements';

interface CoursePipelineDockProps {
  lesson: GuidedLessonSpec;
  sceneId: SceneId;
  activeStepIdx: number;
  completedStepIds: ReadonlySet<string>;
  challengeActive: boolean;
  activeChallenge: ChallengeSpec | null;
  challengeProximity: ChallengeProximityState;
  paramsMeta: SymbolicParameter[];
  paramValues: Record<string, number>;
  exploded: boolean;
  collapsed: boolean;
  focusedParamId: string | null;
  theme: ThemeMode;
  activation: ActivationKind;
  dataset: ManifoldDatasetKind;
  landscape: 'rosenbrock' | 'rastrigin' | 'saddle';
  autoDiffPass: 'idle' | 'forward' | 'backward';
  optimizerRunning: boolean;
  symbolicRunning: boolean;
  symbolicTargetIdx: number;
  onSelectStep: (idx: number) => void;
  onRunStepDemo: (idx: number) => void;
  onLaunchChallenge: () => void;
  onVerifyChallenge: () => void;
  onSelectScene: (id: SceneId) => void;
  onChangeParam: (id: string, val: number) => void;
  onFocusToken: (param: SymbolicParameter | null) => void;
  onToggleExploded: () => void;
  onToggleCollapsed: () => void;
  onResetScene: () => void;
  onChangeActivation: (act: ActivationKind) => void;
  onChangeDataset: (ds: ManifoldDatasetKind) => void;
  onChangeLandscape: (ls: 'rosenbrock' | 'rastrigin' | 'saddle') => void;
  onTriggerAutoDiffPass: (pass: 'forward' | 'backward') => void;
  onToggleOptimizerRun: () => void;
  onStepOptimizer: () => void;
  onResetOptimizers: () => void;
  onToggleSymbolicWorker: () => void;
  onCycleSymbolicTarget: () => void;
}

function getFormulaLeadLatex(sceneId: SceneId): string {
  switch (sceneId) {
    case 'lin-span':
      return '\\vec{p} = c_1\\vec{v}_1 + c_2\\vec{v}_2 + \\vec{v}_3';
    case 'lin-svd':
      return 'A = U \\Sigma V^T';
    case 'lin-eigen':
      return 'A\\vec{v}(\\theta) = \\lambda\\vec{v}';
    case 'lin-manifold':
      return 'h = \\gamma\\,\\phi(W x + b)';
    case 'calc-partials':
      return 'z = f(x_0, y_0; \\omega)';
    case 'calc-autodiff':
      return 'f = xy + \\sin(wx) + 0.4y^2';
    case 'calc-optimizers':
      return 'v_{t} = \\beta v_{t-1} - \\alpha\\nabla L';
    case 'calc-symbolic':
      return '\\hat{f}(x,y) = \\sum w_i\\,\\psi_i(x,y)';
  }
}

/**
 * Calm, Intuitive Sequential Practice Dock:
 * Converges UI chrome to Graphite + Cobalt (Primary) + Sage (Completed)
 * while keeping each slider stroke color-matched to its 3D geometric object.
 */
export function CoursePipelineDock(props: CoursePipelineDockProps) {
  const {
    lesson,
    sceneId,
    activeStepIdx,
    completedStepIds,
    challengeActive,
    activeChallenge,
    challengeProximity,
    paramsMeta,
    paramValues,
    exploded,
    collapsed,
    focusedParamId,
    theme,
    onSelectStep,
    onRunStepDemo,
    onLaunchChallenge,
    onVerifyChallenge,
    onSelectScene,
    onChangeParam,
    onFocusToken,
    onToggleExploded,
    onToggleCollapsed,
    onResetScene,
  } = props;

  const step = lesson.steps[activeStepIdx] ?? lesson.steps[0];
  const stepDone = completedStepIds.has(step.id);
  const allStepsDone = lesson.steps.every((s) => completedStepIds.has(s.id));

  return (
    <section
      aria-label="Guía práctica y controles de la lección"
      className="relative z-20 w-full shrink-0 crayon-surface crayon-ink-dock"
    >
      {/* Whisper-quiet collapse tab */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-[27px]">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          className="relative inline-flex items-center gap-1.5 px-3.5 py-0.5 text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] crayon-surface cursor-pointer whitespace-nowrap"
          style={{ borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }}
        >
          <CrayonChevron direction={collapsed ? 'up' : 'down'} size={14} />
          <span>{collapsed ? 'Abrir controles' : 'Ocultar controles'}</span>
        </button>
      </div>

      <RoughDivider theme={theme} seed={211} />

      {!collapsed && (
        <div className="px-6 py-2.5 flex flex-col gap-2.5">
          {/* ROW 1: Compact Step Progress + Clear Single-Sentence Prompt + Single Primary CTA */}
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-6 gap-y-2 min-h-[42px]">
            {/* Calm converged step markers (1 · 2 · 3 · Reto) */}
            <div
              className="flex items-center gap-1.5 shrink-0"
              role="tablist"
              aria-label="Pasos de la lección"
            >
              {lesson.steps.map((s, idx) => {
                const isDone = completedStepIds.has(s.id);
                const isActive = !challengeActive && idx === activeStepIdx;
                return (
                  <div key={s.id} className="inline-flex items-center gap-1.5">
                    {idx > 0 && (
                      <span
                        className="w-4 border-t border-dashed border-[var(--hairline-strong)] inline-block"
                        aria-hidden="true"
                      />
                    )}
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => onSelectStep(idx)}
                      title={`Paso ${idx + 1}: ${s.title}`}
                      className="inline-flex items-center gap-1.5 cursor-pointer group"
                    >
                      <CrayonStepMarker
                        index={idx}
                        active={isActive}
                        completed={isDone}
                        crayon="cobalt"
                        theme={theme}
                        size={25}
                      />
                      <span
                        className={`hidden md:inline text-[14.5px] whitespace-nowrap transition-colors ${
                          isActive
                            ? 'font-display text-[16.5px] text-[var(--text-primary)]'
                            : isDone
                              ? 'text-[var(--ui-success)]'
                              : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {idx === 0 ? 'Explorar' : idx === 1 ? 'Probar' : 'Integrar'}
                      </span>
                    </button>
                  </div>
                );
              })}

              <span
                className="w-4 border-t border-dashed border-[var(--hairline-strong)] inline-block"
                aria-hidden="true"
              />

              <button
                type="button"
                role="tab"
                aria-selected={challengeActive}
                onClick={onLaunchChallenge}
                title="Reto práctico de esta lección"
                className="inline-flex items-center gap-1.5 cursor-pointer group"
              >
                <CrayonStepMarker
                  index={3}
                  active={challengeActive}
                  completed={false}
                  crayon="cobalt"
                  theme={theme}
                  label="★"
                  size={25}
                />
                <span
                  className={`hidden md:inline text-[14.5px] whitespace-nowrap transition-colors ${
                    challengeActive || allStepsDone
                      ? 'font-display text-[16.5px] text-[var(--ui-accent)]'
                      : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                  }`}
                >
                  Reto
                </span>
              </button>
            </div>

            {/* Clean Step Prompt OR Active Reto Target (never contradicts the open Reto drawer) */}
            <div className="flex-1 min-w-[220px] flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              {challengeActive && activeChallenge ? (
                <>
                  <span className="font-display text-[19px] leading-tight text-[var(--text-primary)] whitespace-nowrap">
                    Reto práctico
                  </span>
                  {challengeProximity.cueLabel && (
                    <span
                      data-testid="dock-optimal-cue"
                      className="font-display text-[16.5px] whitespace-nowrap crayon-ink transition-colors duration-200"
                      style={{
                        color: challengeProximity.isOptimal
                          ? 'var(--ui-success)'
                          : 'var(--ui-accent)',
                      }}
                    >
                      {challengeProximity.cueLabel}
                    </span>
                  )}
                  <span className="text-[14.5px] leading-snug text-[var(--text-secondary)]">
                    {activeChallenge.targetDescription}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-display text-[19px] leading-tight text-[var(--text-primary)] whitespace-nowrap">
                    {step.title}
                  </span>
                  {stepDone && (
                    <span className="font-display text-[16px] text-[var(--ui-success)] whitespace-nowrap crayon-ink">
                      ✓ ¡Listo!
                    </span>
                  )}
                  <span className="text-[15px] leading-snug text-[var(--text-secondary)]">
                    {stepDone ? step.takeaway : step.instruction}
                  </span>
                </>
              )}
            </div>

            {/* Single Predictable Primary Crayon Button (converged cobalt, shifts to sage when optimal in Reto) */}
            <div className="flex items-center gap-3 shrink-0">
              {challengeActive && activeChallenge ? (
                <CrayonButton
                  crayon={challengeProximity.isOptimal ? 'sage' : 'cobalt'}
                  theme={theme}
                  seed={289}
                  variant="filled"
                  onClick={onVerifyChallenge}
                >
                  <CrayonCheck size={15} />
                  <span>Verificar reto</span>
                </CrayonButton>
              ) : !stepDone ? (
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={130 + activeStepIdx * 19}
                  variant="filled"
                  onClick={() => onRunStepDemo(activeStepIdx)}
                >
                  <span>{step.demo.label}</span>
                  <CrayonArrowRight size={15} />
                </CrayonButton>
              ) : activeStepIdx < lesson.steps.length - 1 ? (
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={240 + activeStepIdx * 11}
                  variant="filled"
                  onClick={() => onSelectStep(activeStepIdx + 1)}
                >
                  <span>Siguiente paso</span>
                  <CrayonArrowRight size={15} />
                </CrayonButton>
              ) : (
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={275}
                  variant="filled"
                  onClick={onLaunchChallenge}
                >
                  <span>Hacer Reto</span>
                  <CrayonArrowRight size={15} />
                </CrayonButton>
              )}

              <div className="flex items-center gap-1.5 text-[14.5px] text-[var(--text-secondary)]">
                {lesson.prevSceneId && (
                  <button
                    type="button"
                    onClick={() => onSelectScene(lesson.prevSceneId!)}
                    aria-label="Lección anterior"
                    title="Lección anterior"
                    className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <CrayonArrowLeft size={16} />
                  </button>
                )}
                {lesson.nextSceneId && (
                  <button
                    type="button"
                    onClick={() => onSelectScene(lesson.nextSceneId!)}
                    aria-label="Siguiente lección"
                    title="Siguiente lección"
                    className={`inline-flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors ${
                      allStepsDone
                        ? 'font-display text-[17px] text-[var(--ui-accent)] underline decoration-2 underline-offset-4'
                        : 'hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="hidden xl:inline">Siguiente</span>
                    <CrayonArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full border-t border-dashed border-[var(--hairline)]" />

          {/* ROW 2: Live Equation + 3D-Linked Hand-Drawn Sliders + Essential Scene Controls */}
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span
                className={`text-[15px] text-[var(--text-primary)] shrink-0 transition-opacity duration-150 ${
                  focusedParamId ? 'opacity-35' : 'opacity-95'
                }`}
              >
                <KatexInline latex={getFormulaLeadLatex(sceneId)} />
              </span>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {paramsMeta.map((p, idx) => {
                  const val = paramValues[p.id] ?? p.value;
                  const dimmed = focusedParamId !== null && focusedParamId !== p.id;
                  const paramGlow = challengeActive
                    ? (challengeProximity.paramIntensities[p.id] ?? 0)
                    : 0;
                  const paramOptimal =
                    challengeActive && challengeProximity.isOptimal && paramGlow >= 0.99;
                  return (
                    <div
                      key={p.id}
                      data-param-id={p.id}
                      data-param-optimal={paramOptimal ? 'true' : 'false'}
                      style={{ '--optimal-wash': paramGlow } as CSSProperties}
                      className={`crayon-param-optimal-wash w-[108px] sm:w-[120px] flex flex-col transition-opacity duration-150 ${
                        dimmed ? 'opacity-35' : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-1 text-[14px] leading-none mb-0.5">
                        <span className="text-[var(--text-secondary)]">
                          <KatexInline latex={p.latexSymbol} />
                        </span>
                        {/* Dual-coded readout: graphite normally, sage + check when optimal inside a Reto */}
                        <span
                          className="font-display text-[17px] tabular-nums inline-flex items-baseline gap-0.5 transition-colors duration-200"
                          style={{
                            color: paramOptimal ? 'var(--ui-success)' : 'var(--text-primary)',
                          }}
                        >
                          {paramOptimal && (
                            <span aria-hidden="true" className="text-[13px] leading-none">
                              ✓
                            </span>
                          )}
                          <span>{val.toFixed(p.step <= 0.05 ? 2 : 1)}</span>
                        </span>
                      </div>
                      <CrayonSlider
                        value={val}
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        crayon={p.crayon}
                        theme={theme}
                        seed={41 + idx * 19}
                        ariaLabel={`Ajustar ${p.label}`}
                        optimalGlow={paramGlow}
                        isOptimal={paramOptimal}
                        onChange={(next) => onChangeParam(p.id, next)}
                        onFocusStart={() => onFocusToken(p)}
                        onFocusEnd={() => onFocusToken(null)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strictly Functional Scene Controls (converged cobalt active state) */}
            <div className="flex flex-wrap items-center gap-4 text-[15px]">
              {sceneId === 'lin-manifold' && (
                <>
                  <div className="flex items-center gap-2.5" role="group" aria-label="Activación no lineal">
                    <span className="text-[var(--text-muted)]">φ:</span>
                    {(['linear', 'tanh', 'relu', 'sigmoid'] as ActivationKind[]).map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => props.onChangeActivation(act)}
                        className={`cursor-pointer whitespace-nowrap transition-colors ${
                          props.activation === act
                            ? 'font-display text-[18px] text-[var(--ui-accent)] underline decoration-2 underline-offset-4'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {act === 'linear' ? 'Lineal' : act === 'sigmoid' ? 'σ' : act}
                      </button>
                    ))}
                  </div>
                  <span className="text-[var(--hairline-strong)]" aria-hidden="true">·</span>
                  <div className="flex items-center gap-2.5" role="group" aria-label="Conjunto de datos">
                    {(['rings', 'spiral'] as ManifoldDatasetKind[]).map((ds) => (
                      <button
                        key={ds}
                        type="button"
                        onClick={() => props.onChangeDataset(ds)}
                        className={`cursor-pointer whitespace-nowrap ${
                          props.dataset === ds
                            ? 'font-display text-[18px] text-[var(--ui-accent)] underline decoration-2 underline-offset-4'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {ds === 'rings' ? 'Anillos' : 'Espiral'}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {sceneId === 'calc-autodiff' && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => props.onTriggerAutoDiffPass('forward')}
                    className={`cursor-pointer whitespace-nowrap font-display text-[18px] transition-colors ${
                      props.autoDiffPass === 'forward'
                        ? 'text-[var(--ui-success)] underline decoration-2 underline-offset-4'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Pulso Forward →
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onTriggerAutoDiffPass('backward')}
                    className={`cursor-pointer whitespace-nowrap font-display text-[18px] transition-colors ${
                      props.autoDiffPass === 'backward'
                        ? 'text-[var(--ui-warning)] underline decoration-2 underline-offset-4'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    ← Pulso Backward
                  </button>
                </div>
              )}

              {sceneId === 'calc-optimizers' && (
                <div className="flex flex-wrap items-center gap-3.5">
                  <div className="flex items-center gap-2.5" role="group" aria-label="Terreno de pérdida">
                    {(
                      [
                        ['rosenbrock', 'Rosenbrock'],
                        ['rastrigin', 'Rastrigin'],
                        ['saddle', 'Punto de Silla'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => props.onChangeLandscape(id)}
                        className={`cursor-pointer whitespace-nowrap ${
                          props.landscape === id
                            ? 'font-display text-[18px] text-[var(--ui-accent)] underline decoration-2 underline-offset-4'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[var(--hairline-strong)]" aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={props.onToggleOptimizerRun}
                    className="inline-flex items-center gap-1 font-display text-[18px] text-[var(--ui-accent)] hover:opacity-80 cursor-pointer whitespace-nowrap"
                  >
                    {props.optimizerRunning ? (
                      <>
                        <CrayonPause size={15} />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <CrayonPlay size={15} />
                        <span>Correr</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={props.onStepOptimizer}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                  >
                    +1 Paso
                  </button>
                  <button
                    type="button"
                    onClick={props.onResetOptimizers}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                  >
                    Soltar
                  </button>
                </div>
              )}

              {sceneId === 'calc-symbolic' && (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={props.onToggleSymbolicWorker}
                    className="inline-flex items-center gap-1.5 font-display text-[18px] cursor-pointer whitespace-nowrap text-[var(--ui-accent)] hover:opacity-80"
                  >
                    {props.symbolicRunning ? (
                      <>
                        <CrayonPause size={15} />
                        <span>Detener IA</span>
                      </>
                    ) : (
                      <>
                        <CrayonPlay size={15} />
                        <span>Evolucionar IA</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={props.onCycleSymbolicTarget}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                  >
                    Objetivo: {SYMBOLIC_TARGETS[props.symbolicTargetIdx]?.name}
                  </button>
                </div>
              )}

              <button
                type="button"
                data-testid="toggle-exploded-btn"
                onClick={onToggleExploded}
                aria-pressed={exploded}
                title="Separa verticalmente las 4 capas anatómicas de la gráfica 3D"
                className={`inline-flex items-center gap-1.5 font-display text-[17px] cursor-pointer whitespace-nowrap transition-colors ${
                  exploded
                    ? 'text-[var(--ui-accent)] underline decoration-2 underline-offset-4'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CrayonLayers size={15} />
                <span>{exploded ? 'Unir vista' : 'Separar vista'}</span>
              </button>

              <button
                type="button"
                onClick={onResetScene}
                aria-label="Reiniciar escena y cámara"
                title="Reiniciar escena y cámara"
                className="inline-flex items-center gap-1 text-[14.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
              >
                <CrayonReset size={15} />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
