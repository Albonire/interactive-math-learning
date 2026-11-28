/**
 * Side rail for the scroll-driven Modo Anatomía: shows how far the model is peeled apart and can
 * be dragged (touch screens have no wheel). Top = unido, bottom = separado, matching the
 * direction of scrolling down to separate.
 */
import { useRef, useState } from 'react';
import { getCrayonHex } from '../core/palette';
import type { ThemeMode } from '../core/types';
import { handifySvgTree } from '../visuals/handDrawnSvg';

interface Props {
  theme: ThemeMode;
  amount: number;
  scrolled: boolean;
  onSetTarget: (t: number) => void;
}

const TOP = 26;
const BOTTOM = 214;

export function AnatomyScrollRail({ theme, amount, scrolled, onSetTarget }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const ink = getCrayonHex('graphite', theme);
  const accent = getCrayonHex('vermilion', theme);
  const pencil = getCrayonHex('pencil', theme);
  const paper = theme === 'paper' ? '#FCFBF8' : '#101318';
  const y = TOP + Math.min(1, Math.max(0, amount)) * (BOTTOM - TOP);

  const fromPointer = (clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const vy = ((clientY - r.top) / r.height) * 240;
    onSetTarget((vy - TOP) / (BOTTOM - TOP));
  };

  return (
    <div
      className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 select-none pointer-events-auto"
      data-testid="anatomy-scroll-rail"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 54 240"
        className="w-[46px] h-[204px] sm:w-[54px] sm:h-[240px] cursor-grab"
        style={{ touchAction: 'none' }}
        role="slider"
        tabIndex={0}
        aria-label="Modo Anatomía: separación de capas"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(1, amount) * 100)}
        aria-valuetext={`${Math.round(Math.min(1, amount) * 100)}% separado`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') onSetTarget(amount + 0.1);
          else if (e.key === 'ArrowUp') onSetTarget(amount - 0.1);
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          fromPointer(e.clientY);
        }}
        onPointerMove={(e) => dragging && fromPointer(e.clientY)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {handifySvgTree(
          <>
            <text x="27" y="14" textAnchor="middle" fontSize="11" fill={pencil} className="font-hand">unido</text>
            <line x1="27" y1={TOP} x2="27" y2={BOTTOM} stroke={pencil} strokeWidth="2" />
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line key={f} x1="20" y1={TOP + f * (BOTTOM - TOP)} x2="34" y2={TOP + f * (BOTTOM - TOP)} stroke={pencil} strokeWidth="1.3" />
            ))}
            <line x1="27" y1={TOP} x2="27" y2={y} stroke={accent} strokeWidth="3.2" />
            <circle cx="27" cy={y} r={dragging ? 10 : 8.5} fill={paper} stroke={accent} strokeWidth="2.6" />
            <text x="27" y="234" textAnchor="middle" fontSize="11" fill={ink} className="font-hand">separado</text>
          </>,
          'rail',
          true
        )}
      </svg>
      {!scrolled && (
        <span className="font-hand text-[12.5px] text-[var(--text-secondary)] max-w-[96px] text-center leading-tight animate-pulse">
          Desplaza para despiezar
        </span>
      )}
    </div>
  );
}
