import { useEffect, useMemo, useState } from 'react';
import {
  buildInitialShuffledOrder,
  checkDerivationOrder,
  checkSymbolicEquivalence,
  SYMBOLIC_EXERCISES,
  type DerivationCheckResult,
  type SymbolicEquivalenceResult,
} from '../engines/symbolicEngine';
import type { SceneId, ThemeMode } from '../core/types';
import { CrayonCheck, CrayonReset } from './CrayonIcons';
import { KatexInline } from './KatexFormula';
import { CrayonButton, CrayonSwatch, RoughDivider } from './RoughElements';

interface SymbolicWorkspaceProps {
  sceneId: SceneId;
  theme: ThemeMode;
  alreadyCompleted: boolean;
  onAttemptResult: (passed: boolean) => void;
  onPlayStroke?: () => void;
}

/**
 * Symbolic Engine v1 — Artisanal Notebook Derivation & Equivalence Board.
 * Combines:
 * 1. Interactive step-by-step KaTeX derivation ordering (accessible buttons + drag/drop)
 * 2. Safe deterministic algebraic equivalence verifier with concrete numeric counterexamples
 */
export function SymbolicWorkspace({
  sceneId,
  theme,
  alreadyCompleted,
  onAttemptResult,
  onPlayStroke,
}: SymbolicWorkspaceProps) {
  const spec = SYMBOLIC_EXERCISES[sceneId];

  const [order, setOrder] = useState<string[]>(() =>
    buildInitialShuffledOrder(spec.correctOrder, sceneId.length * 13 + 7)
  );
  const [expression, setExpression] = useState<string>('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [derivationResult, setDerivationResult] = useState<DerivationCheckResult | null>(null);
  const [equivResult, setEquivResult] = useState<SymbolicEquivalenceResult | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  useEffect(() => {
    setOrder(buildInitialShuffledOrder(spec.correctOrder, sceneId.length * 13 + 7));
    setExpression('');
    setDragIdx(null);
    setDerivationResult(null);
    setEquivResult(null);
    setShowHint(false);
  }, [sceneId, spec.correctOrder]);

  const blockMap = useMemo(() => {
    const map = new Map(spec.blocks.map((b) => [b.id, b]));
    return map;
  }, [spec.blocks]);

  const moveBlock = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= order.length || fromIdx === toIdx) return;
    onPlayStroke?.();
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDerivationResult(null);
  };

  const handleVerifyDerivation = () => {
    onPlayStroke?.();
    const res = checkDerivationOrder(order, spec.correctOrder);
    setDerivationResult(res);
    if (res.orderCorrect && equivResult?.equivalent) {
      onAttemptResult(true);
    } else if (!res.orderCorrect) {
      onAttemptResult(false);
    }
  };

  const handleVerifyEquivalence = () => {
    onPlayStroke?.();
    const res = checkSymbolicEquivalence(
      expression,
      spec.targetExpression,
      spec.sampleInputs
    );
    setEquivResult(res);
    const derivCheck = checkDerivationOrder(order, spec.correctOrder);
    setDerivationResult(derivCheck);
    onAttemptResult(res.equivalent && derivCheck.orderCorrect);
  };

  const handleReset = () => {
    onPlayStroke?.();
    setOrder(buildInitialShuffledOrder(spec.correctOrder, sceneId.length * 13 + 19));
    setExpression('');
    setDerivationResult(null);
    setEquivResult(null);
  };

  const appendToken = (token: string) => {
    onPlayStroke?.();
    setExpression((prev) => {
      const trimmed = prev.trimEnd();
      return trimmed ? `${trimmed} ${token}` : token;
    });
  };

  const allSolved = Boolean(derivationResult?.orderCorrect && equivResult?.equivalent);

  return (
    <section
      data-testid="symbolic-workspace"
      aria-label={`Motor Simbólico: ${spec.title}`}
      className="absolute inset-0 z-20 notebook-paper-bg overflow-y-auto notebook-scroll px-4 sm:px-8 pt-20 pb-8"
    >
      <div className="max-w-[1080px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1 max-w-[740px]">
            <p className="text-[13.5px] text-[var(--text-muted)]">
              Motor Simbólico · Prueba paso a paso y equivalencia algebraica
              {alreadyCompleted ? ' · Completado' : ''}
            </p>
            <h2 className="font-display crayon-ink text-[26px] sm:text-[31px] leading-tight text-[var(--text-primary)]">
              {spec.title}
            </h2>
            <p className="text-[15.5px] text-[var(--text-secondary)] max-w-[66ch]">
              {spec.derivationGoal}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              className="text-[14.5px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] cursor-pointer whitespace-nowrap transition-colors"
            >
              {showHint ? 'Ocultar pista' : 'Ver pista'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-[14.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap transition-colors"
            >
              <CrayonReset size={15} />
              <span>Reordenar</span>
            </button>
          </div>
        </div>

        {showHint && (
          <div className="crayon-ink-panel px-4 py-3 text-[14.5px] text-[var(--text-secondary)]">
            <strong className="font-display text-[17px] font-normal text-[var(--ui-accent)]">
              Pista de cuaderno:{' '}
            </strong>
            {spec.hint}
          </div>
        )}

        <RoughDivider theme={theme} seed={701} />

        {/* Two-column Sketchbook Grid: Derivation Steps (left) + Equivalence Check (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Column 1: Step-by-Step KaTeX Derivation Ordering */}
          <div className="lg:col-span-7 space-y-4">
            <div className="space-y-1">
              <h3 className="font-display text-[21px] text-[var(--text-primary)]">
                1. Ordena la derivación matemática
              </h3>
              <p className="text-[14.5px] text-[var(--text-secondary)]">
                {spec.prompt}
              </p>
            </div>

            <ol className="space-y-3" aria-label="Pasos de la derivación">
              {order.map((blockId, idx) => {
                const block = blockMap.get(blockId);
                if (!block) return null;
                const isMatched =
                  derivationResult !== null && spec.correctOrder[idx] === blockId;
                const isMismatch =
                  derivationResult !== null && spec.correctOrder[idx] !== blockId;

                return (
                  <li
                    key={block.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIdx !== null) moveBlock(dragIdx, idx);
                      setDragIdx(null);
                    }}
                    className={`crayon-ink-panel px-4 py-3.5 flex items-center justify-between gap-4 transition-transform ${
                      dragIdx === idx ? 'opacity-65 scale-[0.99]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                        <span className="font-display text-[16px] text-[var(--text-muted)] tabular-nums">
                          0{idx + 1}
                        </span>
                        <CrayonSwatch
                          crayon={block.crayon}
                          theme={theme}
                          filled
                          seed={30 + idx * 17}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-[15.5px] sm:text-[17px] leading-relaxed text-[var(--text-primary)] break-words">
                          <KatexInline latex={block.latex} />
                        </div>
                        <p className="text-[13.5px] text-[var(--text-secondary)] leading-snug">
                          {block.caption}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMatched && (
                        <span
                          className="text-[13px] font-display text-[var(--ui-success)] mr-1 whitespace-nowrap"
                          aria-label="Paso correcto"
                        >
                          Bien
                        </span>
                      )}
                      {isMismatch && (
                        <span
                          className="text-[13px] font-display text-[var(--ui-warning)] mr-1 whitespace-nowrap"
                          aria-label="Paso fuera de lugar"
                        >
                          Revisar
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, idx - 1)}
                        disabled={idx === 0}
                        aria-label={`Subir paso ${idx + 1}: ${block.caption}`}
                        className="px-2.5 py-1 text-[14px] font-medium text-[var(--text-primary)] hover:text-[var(--ui-accent)] disabled:opacity-25 cursor-pointer disabled:cursor-default border border-dashed border-[var(--hairline-strong)] rounded"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(idx, idx + 1)}
                        disabled={idx === order.length - 1}
                        aria-label={`Bajar paso ${idx + 1}: ${block.caption}`}
                        className="px-2.5 py-1 text-[14px] font-medium text-[var(--text-primary)] hover:text-[var(--ui-accent)] disabled:opacity-25 cursor-pointer disabled:cursor-default border border-dashed border-[var(--hairline-strong)] rounded"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <CrayonButton
                crayon="cobalt"
                theme={theme}
                seed={719}
                variant="sketch"
                onClick={handleVerifyDerivation}
              >
                <CrayonCheck size={15} />
                <span>Comprobar orden</span>
              </CrayonButton>

              {derivationResult && (
                <p
                  data-testid="symbolic-derivation-feedback"
                  className="text-[14.5px] leading-snug"
                  style={{
                    color: derivationResult.orderCorrect
                      ? 'var(--ui-success)'
                      : 'var(--ui-warning)',
                  }}
                >
                  {derivationResult.feedback}
                </p>
              )}
            </div>
          </div>

          {/* Column 2: Deterministic Algebraic Equivalence + Counterexample Verifier */}
          <div className="lg:col-span-5 crayon-ink-panel p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="font-display text-[21px] text-[var(--text-primary)]">
                2. Verificador de equivalencia
              </h3>
              <p className="text-[14.5px] text-[var(--text-secondary)] leading-snug">
                {spec.equivalencePrompt}
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="symbolic-expr-input"
                className="block text-[13.5px] text-[var(--text-muted)]"
              >
                Variables disponibles: {spec.variables.join(' · ')}
              </label>
              <input
                id="symbolic-expr-input"
                data-testid="symbolic-expr-input"
                type="text"
                value={expression}
                onChange={(e) => {
                  setExpression(e.target.value);
                  setEquivResult(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleVerifyEquivalence();
                  }
                }}
                placeholder={`Ej. ${spec.placeholderExpression}`}
                className="w-full px-3.5 py-2.5 rounded border border-dashed border-[var(--hairline-strong)] bg-[var(--bg-paper)] text-[var(--text-primary)] font-mono text-[14.5px] focus:outline-none focus:border-[var(--ui-accent)]"
              />
            </div>

            {/* Quick variable & operator insertion buttons */}
            <div className="flex flex-wrap gap-1.5" aria-label="Atajos de símbolos">
              {[...spec.variables, '+', '-', '*', '/', '^', '(', ')'].map((tok) => (
                <button
                  key={tok}
                  type="button"
                  onClick={() => appendToken(tok)}
                  className="px-2.5 py-1 text-[13px] font-mono text-[var(--text-secondary)] hover:text-[var(--ui-accent)] border border-dashed border-[var(--hairline-strong)] rounded cursor-pointer transition-colors"
                >
                  {tok}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <CrayonButton
                crayon="cobalt"
                theme={theme}
                seed={733}
                variant="filled"
                onClick={handleVerifyEquivalence}
              >
                <CrayonCheck size={15} />
                <span>Validar todo</span>
              </CrayonButton>

              {allSolved && (
                <span
                  data-testid="symbolic-solved-status"
                  className="font-display text-[17px] text-[var(--ui-success)]"
                >
                  ¡Verificado!
                </span>
              )}
            </div>

            {equivResult && (
              <div
                data-testid="symbolic-equiv-feedback"
                className="pt-3 border-t border-dashed border-[var(--hairline)] space-y-2 text-[14.5px]"
              >
                <p
                  style={{
                    color: equivResult.equivalent
                      ? 'var(--ui-success)'
                      : 'var(--ui-warning)',
                  }}
                >
                  {equivResult.feedback}
                </p>
                {equivResult.counterexample && (
                  <div className="font-mono text-[13px] text-[var(--text-secondary)] tabular-nums space-y-0.5">
                    <div>
                      Esperado: <strong className="text-[var(--text-primary)]">{equivResult.counterexample.expected}</strong>
                    </div>
                    <div>
                      Tu fórmula: <strong className="text-[var(--ui-warning)]">{equivResult.counterexample.actual}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
