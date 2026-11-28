/**
 * Opening challenge of chapter I: a short sequence of "make it happen" steps checked live against
 * the state the module visual reports. Each solved step reveals what to notice; the last one
 * stamps the challenge. Steps advance on their own after a short pause so the success registers.
 */
import { useEffect, useRef, useState } from 'react';
import { INTUITION_CHALLENGES, type VisualState } from '../core/intuitionChallenges';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { ThemeMode } from '../core/types';
import { CrayonLightbulb } from './CrayonIcons';
import { CrayonStamp } from './CrayonStamp';
import { CrayonStepMarker } from './RoughElements';

interface Props {
  moduleId: StudyModuleId;
  theme: ThemeMode;
  state: VisualState | null;
  /** Called once per solved step (counts as study activity for the streak). */
  onStepSolved: () => void;
}

export function IntuitionChallenge({ moduleId, theme, state, onStepSolved }: Props) {
  const steps = INTUITION_CHALLENGES[moduleId];
  const [stepIdx, setStepIdx] = useState(0);
  const [solvedIdx, setSolvedIdx] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const onSolvedRef = useRef(onStepSolved);
  onSolvedRef.current = onStepSolved;

  useEffect(() => {
    setStepIdx(0);
    setSolvedIdx(null);
    setShowHint(false);
  }, [moduleId]);

  const done = steps ? stepIdx >= steps.length : false;

  useEffect(() => {
    if (!steps || done || !state || solvedIdx === stepIdx) return;
    if (steps[stepIdx].check(state)) {
      setSolvedIdx(stepIdx);
      setShowHint(false);
      onSolvedRef.current();
    }
  }, [steps, done, state, stepIdx, solvedIdx]);

  useEffect(() => {
    if (solvedIdx === null || solvedIdx !== stepIdx) return;
    const t = window.setTimeout(() => setStepIdx((i) => i + 1), 2600);
    return () => window.clearTimeout(t);
  }, [solvedIdx, stepIdx]);

  if (!steps) return null;

  const current = done ? null : steps[stepIdx];
  const justSolved = solvedIdx === stepIdx;

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-dashed"
      style={{ borderColor: done || justSolved ? 'var(--ui-success)' : 'var(--hairline-strong)' }}
      data-testid="intuition-challenge"
      data-step={stepIdx}
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 min-w-[240px] space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-hand text-[14px] text-[var(--ui-accent)]">Reto de intuición</span>
          <span className="inline-flex items-center gap-0.5" aria-label={`Paso ${Math.min(stepIdx + 1, steps.length)} de ${steps.length}`}>
            {steps.map((_, i) => (
              <CrayonStepMarker
                key={i}
                index={i}
                active={i === stepIdx}
                completed={i < stepIdx || (i === stepIdx && justSolved)}
                crayon="cobalt"
                theme={theme}
                label={String(i + 1)}
                size={22}
              />
            ))}
          </span>
        </div>

        {current && (
          <p className="font-display text-[19px] sm:text-[20px] leading-snug text-[var(--text-primary)]">
            {justSolved ? <span className="text-[var(--ui-success)]">✓ </span> : null}
            {current.prompt}
          </p>
        )}
        {current && justSolved && (
          <p className="text-[15.5px] text-[var(--ui-success)] leading-snug" data-testid="challenge-insight">
            {current.insight}
          </p>
        )}
        {current && !justSolved && (
          <div className="text-[14.5px] text-[var(--text-secondary)]">
            {showHint ? (
              <span className="inline-flex items-start gap-1.5">
                <CrayonLightbulb size={14} className="mt-0.5 text-[var(--ui-warning)] shrink-0" />
                {current.hint}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="font-hand underline decoration-dotted hover:text-[var(--ui-accent)] cursor-pointer"
              >
                Necesito una pista
              </button>
            )}
          </div>
        )}
        {done && (
          <p className="font-display text-[19px] text-[var(--ui-success)]">
            Reto completo. Ahora baja al recorrido 3D para ver la idea formalizada.
          </p>
        )}
      </div>
      {done && (
        <CrayonStamp title="¡Resuelto!" subtitle={moduleId} crayon="sage" theme={theme} compact seed={611 + moduleId.length} />
      )}
    </div>
  );
}
