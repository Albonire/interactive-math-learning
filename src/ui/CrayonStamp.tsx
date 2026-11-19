import { useEffect, useRef } from 'react';
import rough from 'roughjs';
import { getUiCrayonHex, THEME_PALETTES } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';

export interface CrayonStampProps {
  title: string;
  subtitle?: string;
  badge?: string;
  crayon?: CrayonToken;
  theme: ThemeMode;
  compact?: boolean;
  seed?: number;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Handcrafted Wax Crayon Notebook Stamp ("Sello de Crayón").
 * Appears with a tactile rotation press animation upon completing a lesson
 * or solving an adaptive challenge, reinforcing the artisan sketchbook feel.
 * Keeps a clean paper/chalkboard medallion behind the lettering so every
 * word reads crisply while framing it in hand-sketched double wax rings.
 */
export function CrayonStamp({
  title,
  subtitle,
  badge = 'BIBIFOLD',
  crayon = 'sage',
  theme,
  compact = false,
  seed = 407,
  onDismiss,
  className = '',
}: CrayonStampProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ink = getUiCrayonHex(crayon, theme);
  const size = compact ? 124 : 156;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const paper = THEME_PALETTES[theme].paperBg;
    const cx = 80;
    const cy = 80;

    // 1. Clean opaque paper/chalkboard base medallion so grid lines never bleed through the stamp
    svg.appendChild(
      rc.circle(cx, cy, 142, {
        seed: seed + 1,
        stroke: 'transparent',
        fill: paper,
        fillStyle: 'solid',
        roughness: 0.85,
      })
    );

    // 2. Subtle hand-hatched wax texture ONLY along the outer ring border
    const ringTint = rc.circle(cx, cy, 140, {
      seed: seed + 7,
      stroke: 'transparent',
      fill: ink,
      fillStyle: 'hachure',
      fillWeight: 1.4,
      hachureGap: 6.2,
      hachureAngle: -32,
      roughness: 1.5,
    });
    ringTint.setAttribute('opacity', theme === 'paper' ? '0.26' : '0.22');
    svg.appendChild(ringTint);

    // 3. Clean inner paper medallion so stamp typography has crisp contrast with zero crossing strokes
    svg.appendChild(
      rc.circle(cx, cy, 118, {
        seed: seed + 11,
        stroke: 'transparent',
        fill: paper,
        fillStyle: 'solid',
        roughness: 0.7,
      })
    );

    // 4. Outer double-pass hand-pressed wax seal ring
    svg.appendChild(
      rc.circle(cx, cy, 142, {
        seed: seed + 13,
        stroke: ink,
        strokeWidth: 3.1,
        roughness: 1.8,
        bowing: 1.15,
      })
    );
    svg.appendChild(
      rc.circle(cx, cy, 120, {
        seed: seed + 29,
        stroke: ink,
        strokeWidth: 1.6,
        roughness: 1.5,
      })
    );

    // 5. Hand-drawn 5-point wax star at the crown of the stamp
    const starPts: Array<[number, number]> = [];
    const starCx = cx;
    const starCy = 37;
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 9.5 : 4.2;
      starPts.push([starCx + Math.cos(angle) * r, starCy + Math.sin(angle) * r]);
    }
    svg.appendChild(
      rc.polygon(starPts, {
        seed: seed + 43,
        stroke: ink,
        strokeWidth: 1.35,
        fill: ink,
        fillStyle: 'solid',
        roughness: 1.05,
      })
    );

    // 6. Hand-sketched accent rules framing the central ribbon banner
    svg.appendChild(
      rc.line(34, 54, 126, 54, {
        seed: seed + 59,
        stroke: ink,
        strokeWidth: 1.35,
        roughness: 1.25,
      })
    );
    svg.appendChild(
      rc.line(38, 101, 122, 101, {
        seed: seed + 67,
        stroke: ink,
        strokeWidth: 1.35,
        roughness: 1.25,
      })
    );
  }, [ink, theme, seed]);

  const innerContent = (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 160 160"
        aria-hidden="true"
        className="w-full h-full block crayon-stroke-svg"
      />
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-4 pointer-events-none"
        style={{ color: ink }}
      >
        <span
          className={`font-display leading-[1.02] tracking-wide ${
            compact ? 'text-[15.5px]' : 'text-[18.5px]'
          }`}
        >
          {title}
        </span>
        {subtitle && (
          <span
            className={`font-hand leading-[1.1] mt-0.5 ${
              compact ? 'text-[10.5px]' : 'text-[12px]'
            }`}
          >
            {subtitle}
          </span>
        )}
        <span
          className={`font-mono-math uppercase tracking-[0.14em] opacity-90 ${
            compact ? 'text-[8px] mt-3' : 'text-[9px] mt-3.5'
          }`}
        >
          {badge}
        </span>
      </div>
    </div>
  );

  if (onDismiss) {
    return (
      <button
        type="button"
        onClick={onDismiss}
        data-testid="crayon-stamp"
        aria-label={`${title}. Clic para cerrar sello`}
        title="Clic para cerrar este sello"
        className={`crayon-stamp-enter cursor-pointer bg-transparent border-0 p-0 focus-visible:outline-dashed transition-transform duration-150 hover:scale-[1.04] ${className}`}
      >
        {innerContent}
      </button>
    );
  }

  return (
    <div
      data-testid="crayon-stamp"
      role="status"
      aria-live="polite"
      className={`crayon-stamp-enter inline-flex ${className}`}
    >
      {innerContent}
    </div>
  );
}
