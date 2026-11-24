import { useEffect, useRef, useState } from 'react';
import type { LessonIntroSpec } from '../core/lessonIntros';
import type { ThemeMode } from '../core/types';
import {
  CrayonArrowLeft,
  CrayonArrowRight,
  CrayonPause,
  CrayonPlay,
  CrayonReset,
} from './CrayonIcons';
import { KatexInline } from './KatexFormula';
import { CrayonButton, CrayonSwatch, RoughUnderline } from './RoughElements';

interface LessonIntroPlayerProps {
  intro: LessonIntroSpec;
  beatIndex: number;
  theme: ThemeMode;
  onChangeBeat: (nextIndex: number) => void;
  onFinish: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onReplaySketch?: () => void;
}

/**
 * Fullscreen in-app narrated lesson introduction.
 * Clears away all panels, toolbars, and dock chrome so the student focuses 100%
 * on the live animated 3D graph + plain-Spanish explanation, like an interactive video.
 * The central 3D canvas remains gently orbitable while the presentation plays.
 */
export function LessonIntroPlayer({
  intro,
  beatIndex,
  theme,
  onChangeBeat,
  onFinish,
  onPlayingChange,
  onReplaySketch,
}: LessonIntroPlayerProps) {
  const beats = intro.beats;
  const beat = beats[beatIndex] ?? beats[0];
  const isLastBeat = beatIndex >= beats.length - 1;

  const [playing, setPlaying] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return true;
  });
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);

  // Sync play/pause state with 3D trace-by-trace stroke animator & audio engine
  useEffect(() => {
    onPlayingChange?.(playing);
  }, [playing, onPlayingChange]);

  // Reset per-beat timer whenever the lesson or beat changes
  useEffect(() => {
    elapsedRef.current = 0;
    setElapsedMs(0);
  }, [intro.sceneId, beatIndex]);

  // Smooth video-style auto-advance across beats 1..3 (pauses gracefully on final beat 4)
  useEffect(() => {
    if (!playing) return;
    const tickMs = 80;
    const id = window.setInterval(() => {
      const next = elapsedRef.current + tickMs;
      if (next >= beat.durationMs) {
        if (beatIndex < beats.length - 1) {
          elapsedRef.current = 0;
          setElapsedMs(0);
          onChangeBeat(beatIndex + 1);
        } else {
          // Stop smoothly at the end of beat 4 so the student can read the formula and click Start
          elapsedRef.current = beat.durationMs;
          setElapsedMs(beat.durationMs);
          setPlaying(false);
        }
        return;
      }
      elapsedRef.current = next;
      setElapsedMs(next);
    }, tickMs);
    return () => window.clearInterval(id);
  }, [playing, beat.durationMs, beatIndex, beats.length, onChangeBeat]);

  // Keyboard navigation: Right/Space advances, Left goes back, Escape enters practice
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onFinish();
      } else if (e.key === 'ArrowRight') {
        if (beatIndex < beats.length - 1) {
          onChangeBeat(beatIndex + 1);
        } else {
          onFinish();
        }
      } else if (e.key === 'ArrowLeft' && beatIndex > 0) {
        onChangeBeat(beatIndex - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beatIndex, beats.length, onChangeBeat, onFinish]);

  const beatFillPct = Math.min(100, (elapsedMs / Math.max(1, beat.durationMs)) * 100);

  return (
    <section
      data-testid="lesson-intro-fullscreen"
      aria-label={`Introducción teórica: ${intro.title}`}
      className="absolute inset-0 z-30 flex flex-col justify-between pointer-events-none select-none"
    >
      {/* TOP MARGIN: Clean chapter header + instant 1-click escape to practice */}
      <div
        className="pointer-events-auto px-6 sm:px-10 pt-4 pb-3 flex items-start justify-between gap-6"
        style={{
          background:
            'linear-gradient(to bottom, var(--bg-paper) 0%, var(--bg-paper-wash) 72%, transparent 100%)',
        }}
      >
        <div className="max-w-[580px]">
          <p className="text-[14px] text-[var(--text-muted)] leading-none">
            Lección {intro.lessonNumber} de 8 · {intro.moduleName} · Introducción teórica
          </p>
          <h1 className="font-display crayon-ink text-[28px] sm:text-[36px] leading-[1.06] text-[var(--text-primary)] pt-1">
            {intro.title}
          </h1>
          <p className="text-[16px] text-[var(--text-secondary)] pt-0.5">
            {intro.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onFinish}
          data-testid="intro-skip-btn"
          className="inline-flex items-center gap-1.5 font-display text-[19px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] cursor-pointer whitespace-nowrap shrink-0 pt-1 transition-colors"
        >
          <span>Saltar a la práctica</span>
          <CrayonArrowRight size={16} />
        </button>
      </div>

      {/* MIDDLE STAGE: Open 3D canvas + contextual visual callouts on left margin (only on Beats 2 & 4) */}
      <div className="flex-1 min-h-0 px-6 sm:px-10 py-2 flex items-center pointer-events-none">
        {beat.parts && beat.parts.length > 0 && (
          <div
            data-testid="intro-parts-legend"
            className="pointer-events-auto max-w-[330px] max-h-full overflow-y-auto notebook-scroll py-3.5 px-4 crayon-ink-panel space-y-2.5 crayon-label-reveal"
          >
            <p className="font-display text-[18px] text-[var(--text-primary)] leading-none">
              Qué ves en la gráfica
            </p>
            <ul className="space-y-2">
              {beat.parts.map((part, idx) => (
                <li key={part.label} className="flex items-start gap-2.5">
                  <span className="pt-0.5 shrink-0">
                    <CrayonSwatch
                      crayon={part.crayon}
                      theme={theme}
                      filled
                      seed={81 + idx * 17}
                    />
                  </span>
                  <div className="text-[14.5px] leading-snug">
                    <span className="font-display text-[17px] text-[var(--text-primary)]">
                      {part.label}:{' '}
                    </span>
                    <span className="text-[var(--text-secondary)]">{part.meaning}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {beat.formula && (
          <div
            data-testid="intro-formula-card"
            className="pointer-events-auto max-w-[360px] max-h-full overflow-y-auto notebook-scroll py-4 px-5 crayon-ink-panel space-y-3 crayon-label-reveal"
          >
            <div className="text-[20px] text-[var(--text-primary)] pb-2 border-b border-dashed border-[var(--hairline)]">
              <KatexInline latex={beat.formula.latex} />
            </div>
            <ul className="space-y-1.5">
              {beat.formula.breakdown.map((piece) => (
                <li key={piece.symbol} className="text-[14.5px] leading-snug">
                  <strong className="font-display text-[17px] font-normal text-[var(--ui-accent)]">
                    {piece.symbol}
                  </strong>
                  <span className="text-[var(--text-muted)]"> — </span>
                  <span className="text-[var(--text-secondary)]">{piece.meaning}</span>
                </li>
              ))}
            </ul>
            {beat.realWorldNote && (
              <p className="pt-2 border-t border-dashed border-[var(--hairline)] text-[14px] leading-snug text-[var(--text-secondary)]">
                <span className="font-display text-[16px] text-[var(--text-primary)]">
                  En la vida real:{' '}
                </span>
                {beat.realWorldNote}
              </p>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM NARRATION & VIDEO-LIKE TIMELINE BAR */}
      <div
        className="pointer-events-auto px-6 sm:px-10 pt-5 pb-4"
        style={{
          background:
            'linear-gradient(to top, var(--bg-paper) 0%, var(--bg-paper) 76%, var(--bg-paper-wash) 90%, transparent 100%)',
        }}
      >
        <div className="max-w-[920px] mx-auto space-y-3.5">
          {/* Active narration beat text */}
          <div key={beat.id} className="space-y-1.5 crayon-label-reveal">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-[17px] text-[var(--ui-accent)] whitespace-nowrap">
                {beat.tag}
              </span>
              <h2 className="relative inline-block font-display crayon-ink text-[24px] sm:text-[28px] leading-tight text-[var(--text-primary)] pb-1">
                {beat.headline}
                <span className="block w-full mt-0.5">
                  <RoughUnderline crayon="cobalt" theme={theme} seed={641 + beatIndex * 23} />
                </span>
              </h2>
            </div>
            <p className="text-[17px] sm:text-[18.5px] leading-[1.42] text-[var(--text-primary)] max-w-[78ch]">
              {beat.narration}
            </p>
          </div>

          {/* 4-segment interactive video-style chapter timeline */}
          <div
            className="grid grid-cols-4 gap-2.5 pt-1"
            role="tablist"
            aria-label="Capítulos de la introducción"
          >
            {beats.map((b, idx) => {
              const isPast = idx < beatIndex;
              const isCurrent = idx === beatIndex;
              const widthPct = isPast ? 100 : isCurrent ? beatFillPct : 0;

              return (
                <button
                  key={b.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  onClick={() => {
                    elapsedRef.current = 0;
                    setElapsedMs(0);
                    onChangeBeat(idx);
                  }}
                  className="text-left group cursor-pointer space-y-1.5"
                >
                  <div className="h-[6px] w-full rounded-[3px] bg-[var(--hairline)] overflow-hidden crayon-stroke-svg">
                    <div
                      className="h-full rounded-[3px] transition-[width] duration-100 ease-linear"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: isPast
                          ? 'var(--ui-success)'
                          : 'var(--ui-accent)',
                      }}
                    />
                  </div>
                  <span
                    className={`block text-[13.5px] truncate transition-colors ${
                      isCurrent
                        ? 'font-display text-[15.5px] text-[var(--text-primary)]'
                        : isPast
                          ? 'text-[var(--text-secondary)]'
                          : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {b.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Minimal playback & next-step controls */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  if (!playing && isLastBeat && elapsedMs >= beat.durationMs) {
                    elapsedRef.current = 0;
                    setElapsedMs(0);
                    onChangeBeat(0);
                  }
                  setPlaying((p) => !p);
                }}
                aria-label={playing ? 'Pausar presentación' : 'Reproducir presentación'}
                className="inline-flex items-center gap-1.5 font-display text-[18px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap transition-colors"
              >
                {playing ? <CrayonPause size={16} /> : <CrayonPlay size={16} />}
                <span>{playing ? 'Pausar' : 'Reproducir'}</span>
              </button>

              {onReplaySketch && (
                <button
                  type="button"
                  data-testid="intro-replay-sketch-btn"
                  onClick={() => {
                    setPlaying(true);
                    onReplaySketch();
                  }}
                  className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] cursor-pointer whitespace-nowrap transition-colors"
                >
                  <CrayonReset size={14} />
                  <span>Volver a trazar</span>
                </button>
              )}

              {beatIndex > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeBeat(beatIndex - 1)}
                  className="inline-flex items-center gap-1 text-[15.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap transition-colors"
                >
                  <CrayonArrowLeft size={15} />
                  <span>Anterior</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {!isLastBeat ? (
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={611 + beatIndex * 17}
                  variant="filled"
                  onClick={() => onChangeBeat(beatIndex + 1)}
                >
                  <span>Siguiente</span>
                  <CrayonArrowRight size={15} />
                </CrayonButton>
              ) : (
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={677}
                  variant="filled"
                  onClick={onFinish}
                >
                  <span>Comenzar práctica</span>
                  <CrayonArrowRight size={15} />
                </CrayonButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
