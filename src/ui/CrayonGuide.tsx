import { useEffect, useMemo, useRef } from 'react';
import rough from 'roughjs';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';
import {
  computeArrowheadPoints,
  computeOrbitGuideLayout,
  sampleQuadBezierTangent,
  type Point2D,
} from './crayonGuideLogic';

export interface CrayonGuideOrbitProps {
  mode: 'orbit';
  width: number;
  height: number;
  theme: ThemeMode;
  crayon?: CrayonToken;
  label?: string;
  ecoMode?: boolean;
  seed?: number;
  testId?: string;
}

export interface CrayonGuideTargetProps {
  mode: 'target';
  width: number;
  height: number;
  theme: ThemeMode;
  crayon: CrayonToken;
  start: Point2D;
  ctrl: Point2D;
  tip: Point2D;
  anchor: Point2D;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelAlign?: 'left' | 'right';
  showLabel?: boolean;
  targetId?: string;
  ecoMode?: boolean;
  seed?: number;
  testId?: string;
}

export type CrayonGuideProps = CrayonGuideOrbitProps | CrayonGuideTargetProps;

/**
 * Prepares Rough.js generated `<path>` strokes inside `svg` for progressive hand-drawn
 * stroke-dashoffset reveal (CSS-driven, zero React re-renders per frame).
 */
function armProgressiveStrokeDraw(svg: SVGSVGElement, ecoMode: boolean): void {
  const paths = Array.from(svg.querySelectorAll<SVGPathElement>('path'));
  paths.forEach((path, idx) => {
    let len = 140;
    try {
      const measured = path.getTotalLength();
      if (Number.isFinite(measured) && measured > 1) {
        len = Math.ceil(measured) + 4;
      }
    } catch {
      // Safe fallback length
    }
    path.style.setProperty('--cg-len', `${len}`);
    path.style.setProperty('--cg-delay', `${idx * 95}ms`);
    if (!ecoMode) {
      path.classList.add('crayon-guide-stroke-draw');
    }
  });
}

/**
 * Floating hand-crafted 'Crayón Guía' cue for 3D viewports.
 * Appears only after 5s of user inactivity, performs a delicate hand-drawn wax crayon
 * stroke animation pointing to interactive 3D regions without obstructing the view,
 * and stays completely `pointer-events-none`.
 */
export function CrayonGuide(props: CrayonGuideProps) {
  const { width, height, theme, ecoMode = false } = props;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const strokeHex = getCrayonHex(props.crayon ?? 'cobalt', theme);

  const orbitLayout = useMemo(() => {
    if (props.mode !== 'orbit' || width <= 0 || height <= 0) return null;
    return computeOrbitGuideLayout(width, height);
  }, [props.mode, width, height]);

  // Primary quadratic Bézier path string for both Rough.js stroke and moving crayon nib
  const primaryCurvePath = useMemo(() => {
    if (props.mode === 'orbit' && orbitLayout) {
      const { arcStart: s, arcCtrl: c, arcEnd: e } = orbitLayout;
      return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
    }
    if (props.mode === 'target') {
      const { start: s, ctrl: c, tip: e } = props;
      return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
    }
    return '';
  }, [props, orbitLayout]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || width <= 0 || height <= 0 || !primaryCurvePath) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const rc = rough.svg(svg);
    const baseSeed = props.seed ?? 707;

    if (props.mode === 'orbit' && orbitLayout) {
      // 1. Primary curved hand-sketched swipe arc
      svg.appendChild(
        rc.path(primaryCurvePath, {
          seed: baseSeed,
          stroke: strokeHex,
          strokeWidth: orbitLayout.compact ? 2.1 : 2.4,
          roughness: ecoMode ? 1.0 : 1.45,
          bowing: 0.9,
        })
      );

      // 2. Arrowhead at end of swipe arc
      const endTan = sampleQuadBezierTangent(
        orbitLayout.arcStart,
        orbitLayout.arcCtrl,
        orbitLayout.arcEnd,
        1
      );
      const head = computeArrowheadPoints(
        orbitLayout.arcEnd,
        endTan,
        orbitLayout.compact ? 8 : 9.5,
        0.48
      );
      svg.appendChild(
        rc.linearPath(
          [
            [head.left.x, head.left.y],
            [orbitLayout.arcEnd.x, orbitLayout.arcEnd.y],
            [head.right.x, head.right.y],
          ],
          {
            seed: baseSeed + 13,
            stroke: strokeHex,
            strokeWidth: orbitLayout.compact ? 2.0 : 2.3,
            roughness: ecoMode ? 0.85 : 1.2,
          }
        )
      );

      // 3. Opposite subtle curved return echo (suggests 360° orbit without crowding)
      const { echoStart: es, echoCtrl: ec, echoEnd: ee } = orbitLayout;
      const echoD = `M ${ee.x.toFixed(1)} ${ee.y.toFixed(1)} Q ${ec.x.toFixed(1)} ${ec.y.toFixed(1)} ${es.x.toFixed(1)} ${es.y.toFixed(1)}`;
      svg.appendChild(
        rc.path(echoD, {
          seed: baseSeed + 29,
          stroke: strokeHex,
          strokeWidth: 1.5,
          roughness: ecoMode ? 0.9 : 1.35,
          strokeLineDash: [4, 4],
        })
      );

      // 4. Delicate hand-drawn anchor loop near end of gesture
      svg.appendChild(
        rc.circle(orbitLayout.haloCenter.x, orbitLayout.haloCenter.y, orbitLayout.haloRadius * 2, {
          seed: baseSeed + 41,
          stroke: strokeHex,
          strokeWidth: 1.35,
          roughness: ecoMode ? 0.9 : 1.3,
        })
      );
    } else if (props.mode === 'target') {
      // 1. Curved Rough.js arrow pointing to interactive 3D element
      svg.appendChild(
        rc.path(primaryCurvePath, {
          seed: baseSeed,
          stroke: strokeHex,
          strokeWidth: 2.5,
          roughness: ecoMode ? 1.0 : 1.5,
          bowing: 0.85,
        })
      );

      // 2. Hand-drawn arrowhead
      const endTan = sampleQuadBezierTangent(props.start, props.ctrl, props.tip, 1);
      const head = computeArrowheadPoints(props.tip, endTan, 10.5, 0.46);
      svg.appendChild(
        rc.linearPath(
          [
            [head.left.x, head.left.y],
            [props.tip.x, props.tip.y],
            [head.right.x, head.right.y],
          ],
          {
            seed: baseSeed + 12,
            stroke: strokeHex,
            strokeWidth: 2.5,
            roughness: ecoMode ? 0.9 : 1.2,
          }
        )
      );

      // 3. Hand-circled halo around the 3D anchor point
      svg.appendChild(
        rc.circle(props.anchor.x, props.anchor.y, 17, {
          seed: baseSeed + 26,
          stroke: strokeHex,
          strokeWidth: 1.75,
          roughness: ecoMode ? 1.0 : 1.45,
        })
      );
    }

    armProgressiveStrokeDraw(svg, ecoMode);
  }, [props, orbitLayout, primaryCurvePath, width, height, strokeHex, ecoMode]);

  if (width <= 0 || height <= 0 || !primaryCurvePath) return null;

  const haloShadow =
    theme === 'paper'
      ? '0 0 8px rgba(252, 251, 248, 0.96), 0 0 3px rgba(252, 251, 248, 0.98)'
      : '0 0 9px rgba(16, 19, 24, 0.96), 0 0 4px rgba(16, 19, 24, 0.98)';

  const paperColor = THEME_PALETTES[theme].paperBg;
  const testId =
    props.testId ?? (props.mode === 'orbit' ? 'crayon-guide-floating' : 'crayon-guide-arrow');

  return (
    <div
      data-testid={testId}
      data-guide-mode={props.mode}
      data-guide-target={props.mode === 'target' ? props.targetId : 'orbit-3d'}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden crayon-guide-enter"
    >
      {/* Hand-sketched Rough.js strokes with progressive stroke-dashoffset draw-in */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full pointer-events-none crayon-guide-nudge ${
          ecoMode ? '' : 'crayon-stroke-svg'
        }`}
      />

      {/* Animated wax-crayon nib that traces along the curved hand-drawn path */}
      {!ecoMode && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 pointer-events-none crayon-guide-nib"
          style={{
            offsetPath: `path("${primaryCurvePath}")`,
            offsetRotate: '0deg',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="-translate-x-[3px] -translate-y-[21px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
          >
            {/* Hand-drawn wax crayon silhouette tilted at natural sketching angle */}
            <path
              d="M3.2 20.6 L6.8 12.8 L16.2 3.4 C17.1 2.6 18.4 2.7 19.3 3.6 L20.4 4.7 C21.3 5.6 21.4 6.9 20.6 7.8 L11.2 17.2 L3.2 20.6 Z"
              fill={paperColor}
              stroke={strokeHex}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Colored wax tip */}
            <path
              d="M3.2 20.6 L6.8 12.8 L11.2 17.2 Z"
              fill={strokeHex}
              fillOpacity="0.88"
            />
            {/* Paper wrapper stripes */}
            <path
              d="M9.6 10.2 L13.8 14.4 M13.4 6.4 L17.6 10.6"
              stroke={strokeHex}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Unboxed hand-lettered cue label */}
      {props.mode === 'orbit' && orbitLayout && (
        <div
          style={{
            left: `${orbitLayout.labelX}px`,
            top: `${orbitLayout.labelY}px`,
            color: strokeHex,
            textShadow: haloShadow,
          }}
          className="absolute pointer-events-none crayon-guide-nudge max-w-[175px]"
        >
          <span className="font-display text-[14px] sm:text-[15px] leading-tight block">
            {props.label ?? 'Arrastra para girar 3D'}
          </span>
        </div>
      )}

      {props.mode === 'target' &&
        props.showLabel !== false &&
        props.label &&
        props.labelX !== undefined &&
        props.labelY !== undefined && (
          <div
            style={{
              left: props.labelAlign === 'left' ? `${props.labelX}px` : undefined,
              right:
                props.labelAlign === 'right'
                  ? `${Math.max(18, width - props.labelX)}px`
                  : undefined,
              top: `${props.labelY}px`,
              transform: 'translateY(-50%)',
              textShadow: haloShadow,
              color: strokeHex,
            }}
            className={`absolute max-w-[170px] pointer-events-none crayon-guide-nudge ${
              props.labelAlign === 'left' ? 'text-left' : 'text-right'
            }`}
          >
            <span className="font-display text-[15.5px] leading-tight block">
              {props.label}
            </span>
          </div>
        )}
    </div>
  );
}
