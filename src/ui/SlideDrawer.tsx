import { useState } from 'react';
import { CrayonCheck, CrayonClose, CrayonReset } from './CrayonIcons';
import type { ChallengeProximityState } from '../ai/challengeProximity';
import type {
  AutoDiffSnapshot,
  BktSkillState,
  ChallengeEvaluation,
  ChallengeSpec,
  ComputationalBridge,
  SceneId,
  SystemsCodeLanguage,
  ThemeMode,
} from '../core/types';
import { getMasteryDescriptor } from '../ai/bktEngine';
import { CrayonStamp } from './CrayonStamp';
import {
  AutoDiffRoughGraph,
  CrayonButton,
  CrayonProgressStroke,
  RoughDivider,
  RoughUnderline,
} from './RoughElements';

interface SlideDrawerProps {
  mode: 'closed' | 'computational' | 'challenge';
  sceneId: SceneId;
  theme: ThemeMode;
  bridge: ComputationalBridge;
  autoDiffSnapshot: AutoDiffSnapshot | null;
  challenge: ChallengeSpec | null;
  challengeProximity?: ChallengeProximityState;
  evaluation: ChallengeEvaluation | null;
  skillState: BktSkillState;
  showHint: boolean;
  onChangeMode: (mode: 'closed' | 'computational' | 'challenge') => void;
  onVerifyChallenge: () => void;
  onNewChallenge: () => void;
  onToggleHint: () => void;
}

const CODE_LANG_STORAGE_KEY = 'bibifold_code_lang_v1';

function loadInitialCodeLang(): SystemsCodeLanguage {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(CODE_LANG_STORAGE_KEY);
      if (v === 'java' || v === 'rust') return v;
    }
  } catch {
    // Ignore storage errors
  }
  return 'rust';
}

export function SlideDrawer({
  mode,
  sceneId,
  theme,
  bridge,
  autoDiffSnapshot,
  challenge,
  challengeProximity,
  evaluation,
  skillState,
  showHint,
  onChangeMode,
  onVerifyChallenge,
  onNewChallenge,
  onToggleHint,
}: SlideDrawerProps) {
  const [codeLang, setCodeLang] = useState<SystemsCodeLanguage>(() => loadInitialCodeLang());

  if (mode === 'closed') return null;

  const handleSelectLang = (next: SystemsCodeLanguage) => {
    setCodeLang(next);
    try {
      localStorage.setItem(CODE_LANG_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
  };

  const activeImpl = bridge.implementations[codeLang];
  const pct = Math.round(skillState.pL * 100);

  return (
    <aside
      aria-label={mode === 'computational' ? 'Plano Computacional' : 'Reto Adaptativo'}
      className="absolute top-0 right-0 bottom-0 z-[25] w-full max-w-[400px] crayon-surface crayon-ink-drawer flex flex-col"
    >
      {/* Clean unboxed crayon tab header */}
      <div className="px-6 pt-4 pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'computational'}
            onClick={() => onChangeMode('computational')}
            className={`relative font-display text-[19px] leading-none cursor-pointer whitespace-nowrap pb-1.5 transition-colors ${
              mode === 'computational'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Código y Memoria
            {mode === 'computational' && (
              <span className="absolute left-0 right-0 -bottom-0.5">
                <RoughUnderline crayon="cobalt" theme={theme} seed={61} />
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'challenge'}
            onClick={() => onChangeMode('challenge')}
            className={`relative font-display text-[19px] leading-none cursor-pointer whitespace-nowrap pb-1.5 transition-colors ${
              mode === 'challenge'
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Reto Práctico
            {mode === 'challenge' && (
              <span className="absolute left-0 right-0 -bottom-0.5">
                <RoughUnderline crayon="cobalt" theme={theme} seed={71} />
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => onChangeMode('closed')}
          aria-label="Cerrar panel lateral"
          className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <CrayonClose size={19} />
        </button>
      </div>

      <RoughDivider theme={theme} seed={313} />

      <div className="flex-1 overflow-y-auto notebook-scroll px-5 py-4 space-y-4">
        {mode === 'computational' ? (
          <>
            {sceneId === 'calc-autodiff' && autoDiffSnapshot && (
              <section className="crayon-ink-panel p-3.5 space-y-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display crayon-ink text-[20px] text-[var(--text-primary)]">
                    Grafo Computacional (DAG)
                  </h3>
                  <span className="text-[12px] font-mono-math text-[var(--text-muted)]">
                    val / ∂f
                  </span>
                </div>
                <AutoDiffRoughGraph snapshot={autoDiffSnapshot} theme={theme} />
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Verde salvia indica el valor hacia adelante; bermellón indica la derivada propagada
                  por la regla de la cadena.
                </p>
              </section>
            )}

            <section className="crayon-ink-panel p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display crayon-ink text-[20px] text-[var(--text-primary)]">
                  Representación en Memoria
                </h3>
                <div
                  role="radiogroup"
                  aria-label="Lenguaje de sistemas"
                  className="inline-flex items-center gap-3"
                >
                  {(['rust', 'java'] as const).map((lang) => {
                    const active = codeLang === lang;
                    const label = lang === 'rust' ? 'Rust' : 'Java';
                    return (
                      <button
                        key={lang}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        data-testid={`code-lang-${lang}`}
                        onClick={() => handleSelectLang(lang)}
                        className={`relative font-display text-[16px] leading-none pb-1 cursor-pointer transition-colors ${
                          active
                            ? 'text-[var(--ui-accent)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {label}
                        {active && (
                          <span className="absolute left-0 right-0 -bottom-0.5">
                            <RoughUnderline
                              crayon="cobalt"
                              theme={theme}
                              seed={lang === 'rust' ? 91 : 97}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p
                data-testid="memory-layout-text"
                className="text-[12.5px] font-mono-math text-[var(--ui-accent)]"
              >
                {activeImpl.memoryLayout}
              </p>
              <div className="font-mono-math text-[12.5px] text-[var(--text-primary)] leading-relaxed break-words tabular-nums">
                [ {bridge.memoryValues.join(' , ')} ]
              </div>
            </section>

            <section className="crayon-ink-panel p-3.5 space-y-2.5">
              <div className="space-y-1">
                <h3 className="font-display crayon-ink text-[20px] text-[var(--text-primary)]">
                  Costo Computacional
                </h3>
                <p className="text-[13px] font-mono-math text-[var(--text-secondary)]">
                  {bridge.complexity}
                </p>
              </div>

              <div className="border-t border-dashed border-[var(--hairline)]" />

              <div className="space-y-1">
                <h3 className="font-display crayon-ink text-[20px] text-[var(--text-primary)]">
                  Aplicación en Ingeniería de Sistemas
                </h3>
                <p className="text-[15px] leading-snug text-[var(--text-secondary)]">
                  {bridge.csApplication}
                </p>
              </div>
            </section>

            <section className="crayon-ink-panel p-3.5 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display crayon-ink text-[20px] text-[var(--text-primary)]">
                  Equivalente en Código
                </h3>
                <span
                  data-testid="active-code-lang"
                  className="text-[13px] font-mono-math text-[var(--ui-accent)]"
                >
                  {activeImpl.label}
                </span>
              </div>
              <pre
                data-testid="code-snippet-block"
                className="font-mono-math text-[12px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap pt-2 border-t border-dashed border-[var(--hairline-strong)] overflow-x-auto"
              >
                {activeImpl.codeSnippet}
              </pre>
            </section>
          </>
        ) : (
          <>
            {/* Adaptive Challenge Mode (LinUCB + BKT) */}
            <section className="crayon-ink-panel p-3.5 space-y-1.5">
              <div className="flex items-baseline justify-between text-[14.5px] text-[var(--text-muted)]">
                <span>Tu dominio · {getMasteryDescriptor(skillState.pL)}</span>
                <span className="font-mono-math text-[13px] tabular-nums text-[var(--text-primary)]">
                  {pct}%
                </span>
              </div>
              <CrayonProgressStroke
                percent={pct}
                crayon="sage"
                theme={theme}
                seed={333}
                className="w-full h-[12px]"
              />
            </section>

            {challenge ? (
              <>
                <section className="crayon-ink-panel p-3.5 space-y-2">
                  <p className="font-display text-[17px] text-[var(--ui-accent)]">
                    Nivel adaptado · {challenge.armLabel}
                  </p>
                  <p className="text-[14.5px] text-[var(--text-muted)]">
                    {challenge.armDescription}
                  </p>
                  <h3 className="font-display crayon-ink text-[22px] leading-snug text-[var(--text-primary)] pt-1">
                    {challenge.prompt}
                  </h3>
                  <p className="text-[12.5px] font-mono-math text-[var(--text-secondary)] pt-0.5">
                    {challenge.targetDescription}
                  </p>

                  {challengeProximity && challengeProximity.overallProximity > 0.08 && (
                    <div
                      data-testid="challenge-proximity-cue"
                      className="pt-2 space-y-1 transition-opacity duration-200"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className="font-display text-[17px] leading-none"
                          style={{
                            color: challengeProximity.isOptimal
                              ? 'var(--ui-success)'
                              : 'var(--ui-accent)',
                          }}
                        >
                          {challengeProximity.cueLabel ?? 'Ajustando parámetros…'}
                        </span>
                        <span className="text-[12px] font-mono-math tabular-nums text-[var(--text-muted)]">
                          {Math.round(challengeProximity.overallProximity * 100)}%
                        </span>
                      </div>
                      <CrayonProgressStroke
                        percent={Math.round(challengeProximity.overallProximity * 100)}
                        crayon={challengeProximity.isOptimal ? 'sage' : 'cobalt'}
                        theme={theme}
                        seed={389}
                        className="w-full h-[9px]"
                      />
                    </div>
                  )}
                </section>

                {/* Hint toggle */}
                <section className="space-y-1.5">
                  <button
                    type="button"
                    onClick={onToggleHint}
                    className="text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline decoration-dashed underline-offset-4 cursor-pointer"
                  >
                    {showHint ? 'Ocultar pista' : 'Ver pista geométrica'}
                  </button>
                  {showHint && (
                    <p className="text-[15.5px] text-[var(--text-secondary)] leading-snug">
                      {challenge.hint}
                    </p>
                  )}
                </section>

                {/* Single converged primary action */}
                <div className="flex items-center gap-4 pt-1">
                  <CrayonButton
                    crayon={challengeProximity?.isOptimal ? 'sage' : 'cobalt'}
                    theme={theme}
                    seed={505}
                    variant="filled"
                    onClick={onVerifyChallenge}
                  >
                    <CrayonCheck size={16} />
                    <span>Verificar solución</span>
                  </CrayonButton>

                  <button
                    type="button"
                    onClick={onNewChallenge}
                    className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                  >
                    <CrayonReset size={15} />
                    <span>Nuevo reto</span>
                  </button>
                </div>

                {/* Phase 4: Contrast & Evaluation Result */}
                {evaluation && (
                  <section className="crayon-ink-panel p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-baseline gap-2.5 flex-wrap">
                          <span
                            className="font-display text-[21px] crayon-ink"
                            style={{
                              color: evaluation.solved
                                ? 'var(--ui-success)'
                                : 'var(--ui-warning)',
                            }}
                          >
                            {evaluation.solved ? '✓ ¡Reto superado!' : 'Aún fuera de tolerancia'}
                          </span>
                          <span className="text-[12.5px] font-mono-math tabular-nums text-[var(--text-muted)]">
                            Error: {(evaluation.errorMetric * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[15.5px] leading-snug text-[var(--text-primary)]">
                          {evaluation.feedback}
                        </p>
                      </div>

                      {evaluation.solved && (
                        <CrayonStamp
                          key={`drawer-stamp-${challenge.id}-${evaluation.pLAfter}`}
                          title="¡Logrado!"
                          subtitle={`BKT ${(evaluation.pLAfter * 100).toFixed(0)}%`}
                          badge="RETO OK"
                          crayon="sage"
                          theme={theme}
                          compact
                          seed={701}
                          className="shrink-0"
                        />
                      )}
                    </div>

                    <div className="text-[12.5px] font-mono-math tabular-nums text-[var(--text-secondary)]">
                      BKT: {(evaluation.pLBefore * 100).toFixed(0)}% →{' '}
                      {(evaluation.pLAfter * 100).toFixed(0)}% · Recompensa ZDP:{' '}
                      {evaluation.reward.toFixed(2)}
                    </div>

                    <div className="pt-2 border-t border-dashed border-[var(--hairline)] space-y-1">
                      <p className="font-display text-[17px] text-[var(--text-primary)]">
                        Espejo de Sistemas
                      </p>
                      <p className="text-[14.5px] leading-snug text-[var(--text-secondary)]">
                        {evaluation.contrastNote}
                      </p>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-[15.5px] text-[var(--text-secondary)]">
                  Genera un reto calibrado automáticamente según tu dominio actual en esta escena.
                </p>
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={515}
                  variant="filled"
                  onClick={onNewChallenge}
                >
                  <span>Generar reto práctico</span>
                </CrayonButton>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
