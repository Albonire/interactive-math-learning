import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CODELAB_SPECS,
  evaluateCodeLabSubmission,
} from '../engines/codelabEngine';
import { buildInitialShuffledOrder } from '../engines/symbolicEngine';
import type {
  CodeLabEvaluationResult,
  SceneId,
  SystemsCodeLanguage,
  ThemeMode,
} from '../core/types';
import { CrayonCheck, CrayonPlay, CrayonReset } from './CrayonIcons';
import { CrayonButton, CrayonSwatch, RoughDivider } from './RoughElements';

interface CodeLabWorkspaceProps {
  sceneId: SceneId;
  theme: ThemeMode;
  alreadyCompleted: boolean;
  onAttemptResult: (passed: boolean) => void;
  onPlayStroke?: () => void;
}

/**
 * CodeLab Engine v1 — Interactive Rust & Java Parsons Blocks + Web Worker Test Harness.
 * Executes deterministic numerical and edge-case invariants inside an isolated Web Worker
 * while keeping memory usage well below the 350 MB Lenovo Slim 3 hardware budget.
 */
export function CodeLabWorkspace({
  sceneId,
  theme,
  alreadyCompleted,
  onAttemptResult,
  onPlayStroke,
}: CodeLabWorkspaceProps) {
  const spec = CODELAB_SPECS[sceneId];

  const [language, setLanguage] = useState<SystemsCodeLanguage>('rust');
  const [order, setOrder] = useState<string[]>(() =>
    buildInitialShuffledOrder(spec.correctOrder, sceneId.length * 17 + 5)
  );
  const [slotChoices, setSlotChoices] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const slot of spec.slots) {
      // Start with a non-trivial distractor option so the student actively inspects the invariant
      const nonCorrect = slot.options.find((o) => o.id !== slot.correctOptionId);
      initial[slot.id] = nonCorrect?.id ?? slot.options[0]?.id ?? '';
    }
    return initial;
  });

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CodeLabEvaluationResult | null>(null);
  const [showHint, setShowHint] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);

  // Reset puzzle state whenever scene changes
  useEffect(() => {
    setOrder(buildInitialShuffledOrder(spec.correctOrder, sceneId.length * 17 + 5));
    const nextSlots: Record<string, string> = {};
    for (const slot of spec.slots) {
      const nonCorrect = slot.options.find((o) => o.id !== slot.correctOptionId);
      nextSlots[slot.id] = nonCorrect?.id ?? slot.options[0]?.id ?? '';
    }
    setSlotChoices(nextSlots);
    setResult(null);
    setShowHint(false);
    setRunning(false);
  }, [sceneId, spec.correctOrder, spec.slots]);

  // Clean up isolated verifier worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const blockMap = useMemo(
    () => new Map(spec.blocks.map((b) => [b.id, b])),
    [spec.blocks]
  );

  const slotMap = useMemo(
    () => new Map(spec.slots.map((s) => [s.id, s])),
    [spec.slots]
  );

  const moveBlock = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= order.length || fromIdx === toIdx) return;
    onPlayStroke?.();
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
    setResult(null);
  };

  const handleRunTests = () => {
    onPlayStroke?.();
    setRunning(true);
    const requestId = ++reqIdRef.current;

    const finishWithResult = (evalRes: CodeLabEvaluationResult) => {
      if (requestId !== reqIdRef.current) return;
      setResult(evalRes);
      setRunning(false);
      onAttemptResult(evalRes.passedAll);
    };

    try {
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../engines/workers/codelabVerifier.worker.ts', import.meta.url),
          { type: 'module' }
        );
      }
      const worker = workerRef.current;
      worker.onmessage = (ev: MessageEvent<{ requestId: number; result: CodeLabEvaluationResult }>) => {
        if (ev.data.requestId === requestId) {
          finishWithResult(ev.data.result);
        }
      };
      worker.onerror = () => {
        finishWithResult(evaluateCodeLabSubmission(sceneId, order, slotChoices));
      };
      worker.postMessage({
        requestId,
        sceneId,
        submittedOrder: order,
        slotChoices,
      });
    } catch {
      // Deterministic synchronous fallback if Worker API is unavailable
      finishWithResult(evaluateCodeLabSubmission(sceneId, order, slotChoices));
    }
  };

  const handleReset = () => {
    onPlayStroke?.();
    setOrder(buildInitialShuffledOrder(spec.correctOrder, sceneId.length * 17 + 11));
    setResult(null);
  };

  const renderCodeLine = (rawTemplate: string, slotId?: string): string => {
    if (!slotId) return rawTemplate;
    const slot = slotMap.get(slotId);
    const chosenId = slotChoices[slotId];
    const opt = slot?.options.find((o) => o.id === chosenId) ?? slot?.options[0];
    const codeText = opt ? (language === 'rust' ? opt.rustCode : opt.javaCode) : '___';
    return rawTemplate.replace(`{{slot:${slotId}}}`, codeText);
  };

  return (
    <section
      data-testid="codelab-workspace"
      aria-label={`CodeLab ${language === 'rust' ? 'Rust' : 'Java'}: ${spec.title}`}
      className="absolute inset-0 z-20 notebook-paper-bg overflow-y-auto notebook-scroll px-4 sm:px-8 pt-20 pb-8"
    >
      <div className="max-w-[1120px] mx-auto space-y-6">
        {/* Header & Rust / Java Language Switch */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1 max-w-[740px]">
            <p className="text-[13.5px] text-[var(--text-muted)]">
              CodeLab Local · Bloques Parsons + Verificador en Web Worker · {spec.complexity}
              {alreadyCompleted ? ' · Completado' : ''}
            </p>
            <h2 className="font-display crayon-ink text-[26px] sm:text-[31px] leading-tight text-[var(--text-primary)]">
              {spec.title}
            </h2>
            <p className="text-[15.5px] text-[var(--text-secondary)] max-w-[66ch]">
              {spec.objective}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Rust / Java Segmented Toggle */}
            <div
              role="group"
              aria-label="Seleccionar lenguaje de sistemas"
              className="inline-flex items-center p-0.5 rounded border border-dashed border-[var(--hairline-strong)] bg-[var(--bg-surface)]"
            >
              {(['rust', 'java'] as const).map((lang) => {
                const active = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    data-testid={`codelab-lang-${lang}`}
                    aria-pressed={active}
                    onClick={() => {
                      onPlayStroke?.();
                      setLanguage(lang);
                    }}
                    className={`px-3 py-1 text-[14.5px] font-display rounded cursor-pointer whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-[var(--ui-accent)] text-[var(--bg-paper)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {lang === 'rust' ? 'Rust' : 'Java'}
                  </button>
                );
              })}
            </div>

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
              Pista de implementación:{' '}
            </strong>
            {spec.hint}
          </div>
        )}

        <RoughDivider theme={theme} seed={811} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left: Parsons Block Assembly + Critical Slot Selectors */}
          <div className="lg:col-span-7 space-y-5">
            <div className="space-y-2.5">
              <h3 className="font-display text-[21px] text-[var(--text-primary)]">
                1. Ordena las instrucciones ({language === 'rust' ? 'Rust' : 'Java'})
              </h3>

              <ol className="space-y-2.5" aria-label="Bloques de código Parsons">
                {order.map((blockId, idx) => {
                  const block = blockMap.get(blockId);
                  if (!block) return null;
                  const rawCode = language === 'rust' ? block.rustCode : block.javaCode;
                  const renderedLine = renderCodeLine(rawCode, block.slotId);
                  const isCorrectPos = result !== null && spec.correctOrder[idx] === blockId;
                  const isWrongPos = result !== null && spec.correctOrder[idx] !== blockId;

                  return (
                    <li
                      key={block.id}
                      className="crayon-ink-panel px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="font-mono text-[13px] text-[var(--text-muted)] tabular-nums shrink-0">
                          {idx + 1}.
                        </span>
                        <code className="font-mono text-[13.5px] sm:text-[14px] text-[var(--text-primary)] overflow-x-auto whitespace-pre">
                          {renderedLine}
                        </code>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCorrectPos && (
                          <span className="text-[12.5px] font-display text-[var(--ui-success)] mr-1">
                            OK
                          </span>
                        )}
                        {isWrongPos && (
                          <span className="text-[12.5px] font-display text-[var(--ui-warning)] mr-1">
                            Orden
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label={`Subir línea ${idx + 1}`}
                          className="px-2.5 py-1 text-[14px] font-medium text-[var(--text-primary)] hover:text-[var(--ui-accent)] disabled:opacity-25 cursor-pointer disabled:cursor-default border border-dashed border-[var(--hairline-strong)] rounded"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, idx + 1)}
                          disabled={idx === order.length - 1}
                          aria-label={`Bajar línea ${idx + 1}`}
                          className="px-2.5 py-1 text-[14px] font-medium text-[var(--text-primary)] hover:text-[var(--ui-accent)] disabled:opacity-25 cursor-pointer disabled:cursor-default border border-dashed border-[var(--hairline-strong)] rounded"
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Expression Slot Selectors */}
            {spec.slots.map((slot) => (
              <div key={slot.id} className="crayon-ink-panel p-4 space-y-2.5">
                <label
                  htmlFor={`codelab-slot-${slot.id}`}
                  className="block font-display text-[18px] text-[var(--text-primary)]"
                >
                  2. {slot.prompt}
                </label>
                <select
                  id={`codelab-slot-${slot.id}`}
                  data-testid={`codelab-slot-${slot.id}`}
                  value={slotChoices[slot.id] ?? ''}
                  onChange={(e) => {
                    onPlayStroke?.();
                    setSlotChoices((prev) => ({ ...prev, [slot.id]: e.target.value }));
                    setResult(null);
                  }}
                  className="w-full px-3.5 py-2 rounded border border-dashed border-[var(--hairline-strong)] bg-[var(--bg-paper)] text-[var(--text-primary)] font-mono text-[14px] focus:outline-none focus:border-[var(--ui-accent)] cursor-pointer"
                >
                  {slot.options.map((opt) => {
                    const codeText = language === 'rust' ? opt.rustCode : opt.javaCode;
                    const displayLabel =
                      opt.label.trim() === codeText.trim()
                        ? codeText
                        : `${codeText} — ${opt.label}`;
                    return (
                      <option key={opt.id} value={opt.id}>
                        {displayLabel}
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <CrayonButton
                crayon="cobalt"
                theme={theme}
                seed={827}
                variant="filled"
                onClick={handleRunTests}
              >
                <CrayonPlay size={15} />
                <span>{running ? 'Ejecutando en Worker...' : 'Ejecutar pruebas'}</span>
              </CrayonButton>

              {result?.passedAll && (
                <span
                  data-testid="codelab-passed-badge"
                  className="inline-flex items-center gap-1.5 font-display text-[18px] text-[var(--ui-success)]"
                >
                  <CrayonCheck size={16} />
                  <span>Pruebas superadas</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Live Stack/Heap Memory Strip + Deterministic Worker Test Diagnostics */}
          <div className="lg:col-span-5 space-y-5">
            {/* Memory Layout Panel */}
            <div className="crayon-ink-panel p-4 space-y-3">
              <h3 className="font-display text-[19px] text-[var(--text-primary)]">
                Mapa de memoria ({language === 'rust' ? 'Stack / Rust' : 'Heap plano / JVM'})
              </h3>
              <ul className="divide-y divide-dashed divide-[var(--hairline)]">
                {spec.memoryCells.map((cell, i) => (
                  <li key={cell.label} className="py-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <CrayonSwatch crayon={cell.crayon} theme={theme} filled seed={41 + i * 11} />
                      <span className="font-mono text-[13.5px] text-[var(--text-primary)] truncate">
                        {cell.label}
                      </span>
                    </div>
                    <span className="text-[13px] text-[var(--text-secondary)] text-right tabular-nums">
                      {language === 'rust' ? cell.rustDetail : cell.javaDetail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Worker Verification Output */}
            <div className="crayon-ink-panel p-4 space-y-3" data-testid="codelab-results-panel">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-[19px] text-[var(--text-primary)]">
                  Suite de pruebas (Web Worker)
                </h3>
                {result && (
                  <span className="text-[12.5px] font-mono text-[var(--text-muted)] tabular-nums">
                    {result.executionMs} ms
                  </span>
                )}
              </div>

              {!result ? (
                <p className="text-[14.5px] text-[var(--text-secondary)] leading-snug">
                  Ordena las instrucciones, elige la expresión numérica correcta y pulsa{' '}
                  <strong className="font-display text-[16px] font-normal text-[var(--text-primary)]">
                    Ejecutar pruebas
                  </strong>{' '}
                  para validar casos nominales y casos borde.
                </p>
              ) : (
                <div className="space-y-3">
                  <p
                    className="text-[14.5px] leading-snug"
                    style={{
                      color: result.passedAll ? 'var(--ui-success)' : 'var(--ui-warning)',
                    }}
                  >
                    {result.summary}
                  </p>

                  <ul className="divide-y divide-dashed divide-[var(--hairline)]">
                    {result.tests.map((t) => (
                      <li key={t.id} className="py-2.5 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[14px] text-[var(--text-primary)]">
                            {t.name}
                          </span>
                          <span
                            className="font-display text-[15px] whitespace-nowrap"
                            style={{
                              color: t.passed ? 'var(--ui-success)' : 'var(--ui-warning)',
                            }}
                          >
                            {t.passed ? 'Pasa' : 'Falla'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[12.5px] text-[var(--text-secondary)] tabular-nums">
                          <span>Esperado: {t.expected}</span>
                          <span>Obtenido: {t.actual}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
