import { useEffect, useMemo, useRef, useState } from 'react';
import rough from 'roughjs';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { ThemeMode } from '../core/types';
import {
  computeAnnotationOpacity,
  computeCalloutLayout,
  computeGuideArrowGeometry,
  selectPrimaryInteractiveAnnotation,
  type EcoPointerState,
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
  ecoMode: boolean;
  guideActive: boolean;
  hidden?: boolean;
}

/**
 * Non-obtrusive hand-drawn 3D anatomy callouts rendered directly over the open sketchbook margins:
 * - Quiet top-right "Leyenda" toggle reveals curved crayon callouts pointing to 3D parts.
 * - In Modo Eco, annotations leave fixed opacity behind and adopt lightweight mouse-linked
 *   dynamic opacity (settling softly at rest, brightening smoothly near cursor movement)
 *   while skipping heavy SVG displacement filters to cut compositing cost.
 * - After 5 seconds of inactivity (`guideActive`), a subtle animated "Crayón Guía" arrow
 *   points to the 3D component with the highest interaction weight without obstructing the graph.
 */
export function ViewportAnnotationsOverlay({
  open,
  onToggle,
  annotations,
  focusedParamId,
  theme,
  ecoMode,
  guideActive,
  hidden = false,
}: ViewportAnnotationsOverlayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const guideSvgRef = useRef<SVGSVGElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [ecoPointer, setEcoPointer] = useState<EcoPointerState>({ x: 0, y: 0, active: false });

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
  }, [hidden, open, guideActive]);

  // Lightweight throttled pointer tracker active ONLY when Modo Eco + Leyenda are open
  useEffect(() => {
    if (!ecoMode || !open || hidden) {
      setEcoPointer((prev) => (prev.active ? { ...prev, active: false } : prev));
      return;
    }

    let lastMoveMs = 0;
    let settleTimer: number | null = null;

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveMs < 80) return;
      lastMoveMs = now;

      const rect = hostRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setEcoPointer({ x, y, active: true });

      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
      settleTimer = window.setTimeout(() => {
        settleTimer = null;
        setEcoPointer((prev) => (prev.active ? { ...prev, active: false } : prev));
      }, 2200);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
    };
  }, [ecoMode, open, hidden]);

  const callouts: PositionedCallout[] = useMemo(() => {
    if (!open || hidden || viewportSize.width === 0 || viewportSize.height === 0) {
      return [];
    }
    return computeCalloutLayout(annotations, viewportSize.width, viewportSize.height);
  }, [open, hidden, annotations, viewportSize.width, viewportSize.height]);

  const calloutOpacities = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of callouts) {
      const isLinked = focusedParamId !== null && c.linkedParamIds.includes(focusedParamId);
      const isDimmed = focusedParamId !== null && !isLinked;
      const opacity = computeAnnotationOpacity({
        ecoMode,
        isLinked,
        isDimmed,
        pointer: ecoPointer,
        anchorX: c.anchorX,
        anchorY: c.anchorY,
        labelX: c.labelX,
        labelY: c.labelY,
      });
      map.set(c.id, opacity);
    }
    return map;
  }, [callouts, focusedParamId, ecoMode, ecoPointer]);

  // Draw organic Rough.js curved crayon leader lines, arrowheads & anchor rings (never redrawn on pointer move)
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
      const strokeHex = getCrayonHex(c.crayon, theme);
      const initialOpacity = calloutOpacities.get(c.id) ?? 0.85;

      const startX = c.side === 'left' ? c.labelX + 150 : c.labelX - 150;
      const startY = c.labelY - 7;

      const dx = c.anchorX - c.ctrlX;
      const dy = c.anchorY - c.ctrlY;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const tipX = c.anchorX - ux * 6;
      const tipY = c.anchorY - uy * 6;

      const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      grp.setAttribute('data-svg-callout-id', c.id);
      grp.style.opacity = initialOpacity.toFixed(2);
      grp.style.transition = 'opacity 280ms ease-out';

      const pathD = `M ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${c.ctrlX.toFixed(1)} ${c.ctrlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`;
      grp.appendChild(
        rc.path(pathD, {
          seed: 310 + idx * 29,
          stroke: strokeHex,
          strokeWidth: isLinked ? 2.4 : 1.7,
          roughness: ecoMode ? 1.05 : 1.45,
          bowing: 0.7,
        })
      );

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
            roughness: ecoMode ? 0.9 : 1.15,
          }
        )
      );

      grp.appendChild(
        rc.circle(c.anchorX, c.anchorY, isLinked ? 11 : 8, {
          seed: 530 + idx * 13,
          stroke: strokeHex,
          strokeWidth: isLinked ? 2.1 : 1.5,
          fill: paperHalo,
          fillStyle: 'solid',
          roughness: ecoMode ? 0.95 : 1.25,
        })
      );

      svg.appendChild(grp);
    });
    // Intentionally excludes calloutOpacities so pointer movement never regenerates Rough.js paths
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callouts, focusedParamId, open, hidden, theme, ecoMode]);

  // Lightweight opacity-only sync for SVG callout groups during Eco Mode mouse movement
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !open || hidden) return;
    const groups = svg.querySelectorAll<SVGGElement>('g[data-svg-callout-id]');
    groups.forEach((grp) => {
      const id = grp.getAttribute('data-svg-callout-id');
      if (!id) return;
      const op = calloutOpacities.get(id);
      if (op !== undefined) {
        grp.style.opacity = op.toFixed(2);
      }
    });
  }, [calloutOpacities, open, hidden]);

  // 'Crayón Guía': selects the highest interaction-weight 3D component after 5s of inactivity
  const guideTarget = useMemo(() => {
    if (!guideActive || hidden || viewportSize.width === 0 || viewportSize.height === 0) {
      return null;
    }
    return selectPrimaryInteractiveAnnotation(
      annotations,
      viewportSize.width,
      viewportSize.height
    );
  }, [guideActive, hidden, annotations, viewportSize.width, viewportSize.height]);

  const guideGeom = useMemo(() => {
    if (!guideTarget || viewportSize.width === 0 || viewportSize.height === 0) return null;
    return computeGuideArrowGeometry(guideTarget, viewportSize.width, viewportSize.height);
  }, [guideTarget, viewportSize.width, viewportSize.height]);

  // Draw the small handcrafted 'Crayón Guía' arrow onto the highest-weight 3D component
  useEffect(() => {
    const svg = guideSvgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!guideTarget || !guideGeom || hidden) return;

    const rc = rough.svg(svg);
    const strokeHex = getCrayonHex(guideTarget.crayon, theme);

    const pathD = `M ${guideGeom.startX.toFixed(1)} ${guideGeom.startY.toFixed(1)} Q ${guideGeom.ctrlX.toFixed(1)} ${guideGeom.ctrlY.toFixed(1)} ${guideGeom.tipX.toFixed(1)} ${guideGeom.tipY.toFixed(1)}`;
    svg.appendChild(
      rc.path(pathD, {
        seed: 707,
        stroke: strokeHex,
        strokeWidth: 2.5,
        roughness: ecoMode ? 1.0 : 1.5,
        bowing: 0.8,
      })
    );

    const dx = guideGeom.tipX - guideGeom.ctrlX;
    const dy = guideGeom.tipY - guideGeom.ctrlY;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const headLen = 10.5;
    const spread = 0.46;
    const cosS = Math.cos(spread);
    const sinS = Math.sin(spread);

    const lx = guideGeom.tipX - (ux * cosS - uy * sinS) * headLen;
    const ly = guideGeom.tipY - (ux * sinS + uy * cosS) * headLen;
    const rx = guideGeom.tipX - (ux * cosS + uy * sinS) * headLen;
    const ry = guideGeom.tipY - (-ux * sinS + uy * cosS) * headLen;

    svg.appendChild(
      rc.linearPath(
        [
          [lx, ly],
          [guideGeom.tipX, guideGeom.tipY],
          [rx, ry],
        ],
        {
          seed: 719,
          stroke: strokeHex,
          strokeWidth: 2.5,
          roughness: ecoMode ? 0.9 : 1.2,
        }
      )
    );

    svg.appendChild(
      rc.circle(guideTarget.anchorX, guideTarget.anchorY, 16, {
        seed: 733,
        stroke: strokeHex,
        strokeWidth: 1.7,
        roughness: ecoMode ? 1.0 : 1.45,
      })
    );
  }, [guideTarget, guideGeom, hidden, theme, ecoMode]);

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
      data-eco-dynamic={ecoMode ? 'true' : 'false'}
      data-eco-pointer-active={ecoPointer.active ? 'true' : 'false'}
      data-guide-active={guideTarget ? 'true' : 'false'}
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
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            ecoMode ? '' : 'crayon-stroke-svg'
          }`}
        />
      )}

      {/* Unboxed hand-lettered callout notes arranged cleanly in the open left/right margins */}
      {open &&
        callouts.map((c) => {
          const isLinked =
            focusedParamId !== null && c.linkedParamIds.includes(focusedParamId);
          const swatchHex = getCrayonHex(c.crayon, theme);
          const opacity = calloutOpacities.get(c.id) ?? 0.88;

          return (
            <div
              key={c.id}
              data-testid={`callout-${c.id}`}
              data-callout-active={isLinked ? 'true' : 'false'}
              data-callout-opacity={opacity.toFixed(2)}
              style={{
                left: c.side === 'left' ? `${c.labelX}px` : undefined,
                right:
                  c.side === 'right'
                    ? `${Math.max(16, viewportSize.width - c.labelX)}px`
                    : undefined,
                top: `${c.labelY}px`,
                transform: 'translateY(-50%)',
                opacity,
                textShadow: haloShadow,
              }}
              className={`absolute w-[144px] pointer-events-none transition-opacity duration-300 ${
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

      {/* 'Crayón Guía': subtle animated crayon arrow over highest-interaction-weight 3D component after 5s idle */}
      {guideTarget && guideGeom && viewportSize.width > 0 && viewportSize.height > 0 && (
        <div
          data-testid="crayon-guide-arrow"
          data-guide-target={guideTarget.id}
          className="absolute inset-0 pointer-events-none crayon-label-reveal"
        >
          <svg
            ref={guideSvgRef}
            width={viewportSize.width}
            height={viewportSize.height}
            viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full pointer-events-none crayon-guide-nudge ${
              ecoMode ? '' : 'crayon-stroke-svg'
            }`}
          />
          {!open && (
            <div
              style={{
                left: guideGeom.labelAlign === 'left' ? `${guideGeom.labelX}px` : undefined,
                right:
                  guideGeom.labelAlign === 'right'
                    ? `${Math.max(18, viewportSize.width - guideGeom.labelX)}px`
                    : undefined,
                top: `${guideGeom.labelY}px`,
                transform: 'translateY(-50%)',
                textShadow: haloShadow,
                color: getCrayonHex(guideTarget.crayon, theme),
              }}
              className={`absolute max-w-[164px] pointer-events-none crayon-guide-nudge ${
                guideGeom.labelAlign === 'left' ? 'text-left' : 'text-right'
              }`}
            >
              <span className="font-display text-[15px] leading-tight block">
                Explora {guideTarget.label}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
