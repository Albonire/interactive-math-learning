import { useEffect, useMemo, useRef, useState } from 'react';
import rough from 'roughjs';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { ThemeMode } from '../core/types';
import {
  computeCalloutLayout,
  type PositionedCallout,
  type ProjectedAnnotation,
} from '../rendering/sceneAnnotations';
import { CrayonNote } from './CrayonIcons';
import { RoughUnderline } from './RoughElements';

interface ViewportAnnotationsOverlayProps {
  open: boolean;
  onToggle: () => void;
  annotations: ProjectedAnnotation[];
  focusedParamId: string | null;
  theme: ThemeMode;
  hidden?: boolean;
}

/**
 * Non-obtrusive hand-drawn 3D anatomy callouts rendered directly over the open sketchbook
 * margins, controlled by a small quiet "Leyenda" toggle in the top-right corner of the viewport.
 * During active parameter manipulation, the relevant 3D callout highlights crisp and bold while
 * unrelated callouts softly step back.
 */
export function ViewportAnnotationsOverlay({
  open,
  onToggle,
  annotations,
  focusedParamId,
  theme,
  hidden = false,
}: ViewportAnnotationsOverlayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (hidden) return;
    const el = hostRef.current;
    if (!el) return;
    const sync = () => {
      setViewportSize((prev) =>
        prev.width === el.clientWidth && prev.height === el.clientHeight
          ? prev
          : { width: el.clientWidth, height: el.clientHeight }
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hidden, open]);

  const callouts: PositionedCallout[] = useMemo(() => {
    if (!open || hidden || viewportSize.width === 0 || viewportSize.height === 0) {
      return [];
    }
    return computeCalloutLayout(annotations, viewportSize.width, viewportSize.height);
  }, [open, hidden, annotations, viewportSize.width, viewportSize.height]);

  // Draw organic Rough.js curved crayon leader lines, arrowheads & anchor rings
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!open || hidden || callouts.length === 0) return;

    const rc = rough.svg(svg);
    const paperHalo = THEME_PALETTES[theme].paperBg;

    callouts.forEach((c, idx) => {
      const isLinked =
        focusedParamId !== null && c.linkedParamIds.includes(focusedParamId);
      const isDimmed = focusedParamId !== null && !isLinked;
      const strokeHex = getCrayonHex(c.crayon, theme);
      const opacity = isDimmed ? 0.24 : isLinked ? 0.98 : 0.82;

      const startX = c.side === 'left' ? c.labelX + 150 : c.labelX - 150;
      const startY = c.labelY - 7;

      // Shorten line end slightly so the arrowhead touches the 3D anchor cleanly
      const dx = c.anchorX - c.ctrlX;
      const dy = c.anchorY - c.ctrlY;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const tipX = c.anchorX - ux * 6;
      const tipY = c.anchorY - uy * 6;

      const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      grp.setAttribute('opacity', opacity.toFixed(2));

      // Hand-drawn curved crayon pointer path
      const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${c.ctrlX.toFixed(1)} ${c.ctrlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`;
      grp.appendChild(
        rc.path(pathD, {
          seed: 310 + idx * 29,
          stroke: strokeHex,
          strokeWidth: isLinked ? 2.4 : 1.7,
          roughness: 1.45,
          bowing: 0.7,
        })
      );

      // Sketchy arrowhead pointing onto the 3D anatomy target
      const headLen = isLinked ? 9.5 : 8;
      const spread = 0.44;
      const cosS = Math.cos(spread);
      const sinS = Math.sin(spread);
      const lx = tipX - (ux * cosS - uy * sinS) * headLen;
      const ly = tipY - (ux * sinS + uy * cosS) * headLen;
      const rx = tipX - (ux * cosS + uy * sinS) * headLen;
      const ry = tipY - (-ux * sinS + uy * cosS) * headLen;

      grp.appendChild(
        rc.linearPath(
          [
            [lx, ly],
            [tipX, tipY],
            [rx, ry],
          ],
          {
            seed: 420 + idx * 17,
            stroke: strokeHex,
            strokeWidth: isLinked ? 2.3 : 1.65,
            roughness: 1.15,
          }
        )
      );

      // Small hand-sketched wax target ring around the projected 3D anchor
      grp.appendChild(
        rc.circle(c.anchorX, c.anchorY, isLinked ? 11 : 8, {
          seed: 530 + idx * 13,
          stroke: strokeHex,
          strokeWidth: isLinked ? 2.1 : 1.5,
          fill: paperHalo,
          fillStyle: 'solid',
          roughness: 1.25,
        })
      );

      svg.appendChild(grp);
    });
  }, [callouts, focusedParamId, open, hidden, theme]);

  if (hidden) return null;

  const haloShadow =
    theme === 'paper'
      ? '0 0 8px rgba(252, 251, 248, 0.96), 0 0 3px rgba(252, 251, 248, 0.98)'
      : '0 0 9px rgba(16, 19, 24, 0.96), 0 0 4px rgba(16, 19, 24, 0.98)';

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 z-[15] overflow-hidden select-none"
      data-testid="viewport-annotations-layer"
      data-legend-open={open ? 'true' : 'false'}
    >
      {/* Small, unobtrusive top-right "Leyenda" toggle inside the 3D viewport */}
      <div className="pointer-events-auto absolute top-3.5 sm:top-4 right-4 sm:right-6 z-20">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={open}
          data-testid="viewport-legend-toggle"
          title={
            open
              ? 'Ocultar anotaciones dibujadas sobre la escena 3D (tecla L)'
              : 'Mostrar anotaciones dibujadas señalando cada parte de la figura 3D (tecla L)'
          }
          className={`relative inline-flex items-center gap-1.5 py-1 px-1.5 text-[15px] leading-none cursor-pointer transition-colors whitespace-nowrap ${
            open
              ? 'font-display text-[17.5px] text-[var(--ui-accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          style={{ textShadow: haloShadow }}
        >
          <CrayonNote size={15} />
          <span>Leyenda</span>
          {open && (
            <span className="absolute left-1 right-1 -bottom-0.5">
              <RoughUnderline crayon="cobalt" theme={theme} seed={83} />
            </span>
          )}
        </button>
      </div>

      {/* Hand-drawn Rough.js curved crayon arrows & anchor rings */}
      {open && viewportSize.width > 0 && viewportSize.height > 0 && (
        <svg
          ref={svgRef}
          width={viewportSize.width}
          height={viewportSize.height}
          viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none crayon-stroke-svg"
        />
      )}

      {/* Unboxed hand-lettered callout notes arranged cleanly in the open left/right margins */}
      {open &&
        callouts.map((c) => {
          const isLinked =
            focusedParamId !== null && c.linkedParamIds.includes(focusedParamId);
          const isDimmed = focusedParamId !== null && !isLinked;
          const swatchHex = getCrayonHex(c.crayon, theme);

          return (
            <div
              key={c.id}
              data-testid={`callout-${c.id}`}
              data-callout-active={isLinked ? 'true' : 'false'}
              style={{
                left: c.side === 'left' ? `${c.labelX}px` : undefined,
                right:
                  c.side === 'right'
                    ? `${Math.max(16, viewportSize.width - c.labelX)}px`
                    : undefined,
                top: `${c.labelY}px`,
                transform: 'translateY(-50%)',
                opacity: isDimmed ? 0.28 : 1,
                textShadow: haloShadow,
              }}
              className={`absolute w-[144px] pointer-events-none transition-opacity duration-200 ${
                c.side === 'left' ? 'text-right' : 'text-left'
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 ${
                  c.side === 'left' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-[7px] h-[7px] rounded-full shrink-0"
                  style={{
                    backgroundColor: swatchHex,
                    transform: isLinked ? 'scale(1.3)' : 'scale(1)',
                    transition: 'transform 180ms ease',
                  }}
                />
                <span
                  className="font-display leading-[1.08] tracking-wide"
                  style={{
                    fontSize: isLinked ? '18px' : '16.5px',
                    color: isLinked ? swatchHex : 'var(--text-primary)',
                  }}
                >
                  {c.label}
                </span>
              </div>
              <p className="text-[13px] leading-[1.2] text-[var(--text-secondary)] mt-0.5">
                {c.note}
              </p>
            </div>
          );
        })}
    </div>
  );
}
