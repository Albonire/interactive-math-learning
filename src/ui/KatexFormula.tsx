import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import katex from 'katex';
import type { SymbolicParameter, ThemeMode } from '../core/types';
import { getCrayonCssVar } from '../core/palette';
import { RoughUnderline } from './RoughElements';

export function KatexInline({
  latex,
  className = '',
}: {
  latex: string;
  className?: string;
}) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
        strict: false,
      });
    } catch {
      return latex;
    }
  }, [latex]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface ScrubTokenProps {
  param: SymbolicParameter;
  value: number;
  theme: ThemeMode;
  dimmed: boolean;
  active: boolean;
  onChange: (id: string, nextValue: number) => void;
  onFocusToken: (param: SymbolicParameter | null) => void;
}

/**
 * Interactive KaTeX symbolic parameter token:
 * Drag horizontally (scrubbing) or use arrow keys to continuously mutate the 3D state.
 * Pure hand-drawn crayon underline with subtle ↔ drag cue — zero pills or boxes.
 */
export function ScrubToken({
  param,
  value,
  theme,
  dimmed,
  active,
  onChange,
  onFocusToken,
}: ScrubTokenProps) {
  const dragRef = useRef<{ startX: number; startVal: number } | null>(null);

  const clampAndStep = (raw: number) => {
    const stepped = Math.round(raw / param.step) * param.step;
    const clamped = Math.max(param.min, Math.min(param.max, stepped));
    return Number(clamped.toFixed(4));
  };

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startVal: value };
    onFocusToken(param);
  };

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const range = param.max - param.min;
    const delta = (dx / 150) * range;
    const next = clampAndStep(dragRef.current.startVal + delta);
    if (next !== value) {
      onChange(param.id, next);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragRef.current = null;
      onFocusToken(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(param.id, clampAndStep(value + param.step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(param.id, clampAndStep(value - param.step));
    }
  };

  const colorVar = getCrayonCssVar(param.crayon);

  return (
    <button
      type="button"
      role="slider"
      aria-label={`Ajustar parámetro ${param.label}`}
      aria-valuemin={param.min}
      aria-valuemax={param.max}
      aria-valuenow={value}
      title="Arrastra horizontalmente o usa las flechas para ajustar"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => onFocusToken(param)}
      onPointerLeave={() => {
        if (!dragRef.current) onFocusToken(null);
      }}
      onFocus={() => onFocusToken(param)}
      onBlur={() => onFocusToken(null)}
      onKeyDown={handleKeyDown}
      className={`group relative inline-flex flex-col items-center px-2 py-0.5 cursor-ew-resize select-none transition-opacity duration-150 whitespace-nowrap shrink-0 ${
        dimmed ? 'opacity-30' : 'opacity-100'
      }`}
    >
      <span className="inline-flex items-baseline gap-1">
        <KatexInline latex={param.latexSymbol} className="text-[14px] opacity-85" />
        <span className="text-[13px] opacity-60">=</span>
        <span
          className="font-display text-[19px] leading-none tabular-nums"
          style={{ color: colorVar }}
        >
          {value.toFixed(param.step < 0.1 ? 2 : 1)}
        </span>
      </span>
      <span
        className={`w-full transition-opacity duration-150 ${
          active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
        }`}
      >
        <RoughUnderline crayon={param.crayon} theme={theme} seed={param.id.length * 19 + 7} />
      </span>
    </button>
  );
}
