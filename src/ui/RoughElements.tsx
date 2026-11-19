import { useEffect, useRef, useState, type ReactNode } from 'react';
import rough from 'roughjs';
import { getEcoSvgFilterParams } from '../core/ecoMode';
import { globalFirstDrawRegistry } from '../core/firstDrawRegistry';
import { getCrayonHex, getUiCrayonHex, THEME_PALETTES } from '../core/palette';
import type { AutoDiffSnapshot, CrayonToken, ThemeMode } from '../core/types';
import { animateSvgStrokesOnce } from './svgDrawAnimation';

/**
 * Global hidden SVG filter bank:
 * - #crayon-stroke: microscopic random displacement + dry-wax edge roughness for all .crayon-surface containers
 * - #crayon-text-tooth: dry-wax edge tooth for Caveat Brush titles
 * - #crayon-stroke-tooth: dry-wax edge tooth for Rough.js strokes, sliders & icons
 * All filter octaves & scales adapt automatically when Modo Eco is enabled.
 */
export function CrayonSvgDefs({ ecoMode = false }: { ecoMode?: boolean }) {
  const f = getEcoSvgFilterParams(ecoMode);

  return (
    <svg
      aria-hidden="true"
      className="fixed w-0 h-0 pointer-events-none overflow-hidden"
      focusable="false"
    >
      <defs>
        {/* Irregular handcrafted wax-crayon border displacement for all .crayon-surface containers */}
        <filter
          id="crayon-stroke"
          x="-2%"
          y="-5%"
          width="104%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency={f.surfaceWarpFreq}
            numOctaves={f.surfaceWarpOctaves}
            seed="23"
            result="warpNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warpNoise"
            scale={f.surfaceWarpScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="warpedEdge"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency={f.surfaceMicroFreq}
            numOctaves={f.surfaceMicroOctaves}
            seed="71"
            result="microGrain"
          />
          <feDisplacementMap
            in="warpedEdge"
            in2="microGrain"
            scale={f.surfaceMicroScale}
            xChannelSelector="R"
            yChannelSelector="B"
          />
        </filter>

        {/* Subtle wax grain edge for Caveat Brush titles & stamps (preserves full legibility) */}
        <filter id="crayon-text-tooth" x="-4%" y="-6%" width="108%" height="112%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.72"
            numOctaves={f.textToothOctaves}
            seed="17"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={f.textToothScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Richer dry-wax edge tooth for Rough.js crayon lines, swatches & strokes */}
        <filter id="crayon-stroke-tooth" x="-6%" y="-12%" width="112%" height="124%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.58"
            numOctaves={f.strokeToothOctaves}
            seed="42"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={f.strokeToothScale}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Hand-rubbed pastel/wax halo filter for optimal Reto parameter glow */}
        <filter id="crayon-wax-glow" x="-18%" y="-60%" width="136%" height="220%">
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={ecoMode ? 1.4 : 2.1}
            result="softWax"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves={ecoMode ? 1 : 2}
            seed="89"
            result="waxGrain"
          />
          <feDisplacementMap
            in="softWax"
            in2="waxGrain"
            scale={ecoMode ? 1.1 : 1.9}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export function RoughDivider({
  theme,
  seed = 17,
  className = '',
}: {
  theme: ThemeMode;
  seed?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const stroke =
      theme === 'paper' ? 'rgba(24, 25, 29, 0.36)' : 'rgba(235, 239, 245, 0.24)';
    const line = rc.line(0, 4, 1200, 4, {
      seed,
      stroke,
      strokeWidth: 1.5,
      roughness: 1.45,
      bowing: 0.45,
    });
    svg.appendChild(line);
    animateSvgStrokesOnce(svg, `divider:${seed}`, {
      durationMs: 720,
      staggerMs: 65,
    });
  }, [theme, seed]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 1200 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`w-full h-[8px] block pointer-events-none select-none crayon-stroke-svg ${className}`}
    />
  );
}

export function RoughUnderline({
  crayon,
  theme,
  seed = 42,
}: {
  crayon: CrayonToken;
  theme: ThemeMode;
  seed?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const col = getUiCrayonHex(crayon, theme);
    svg.appendChild(
      rc.line(2, 4, 118, 4, {
        seed,
        stroke: col,
        strokeWidth: 2.8,
        roughness: 1.55,
        bowing: 1.0,
      })
    );
    animateSvgStrokesOnce(svg, `underline:${seed}:${crayon}`, {
      durationMs: 420,
      staggerMs: 40,
    });
  }, [crayon, theme, seed]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 120 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="w-full h-[7px] block pointer-events-none crayon-stroke-svg"
    />
  );
}

/**
 * Hand-scribbled wax crayon dab for 3D Anatomy Layer toggles (no flat CSS squares)
 */
export function CrayonSwatch({
  crayon,
  theme,
  filled,
  seed = 13,
}: {
  crayon: CrayonToken;
  theme: ThemeMode;
  filled: boolean;
  seed?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const col = getCrayonHex(crayon, theme);
    svg.appendChild(
      rc.circle(9, 9, 13, {
        seed,
        stroke: col,
        strokeWidth: 1.6,
        fill: filled ? col : undefined,
        fillStyle: 'hachure',
        fillWeight: 2.2,
        hachureGap: 2.6,
        roughness: 1.4,
      })
    );
    animateSvgStrokesOnce(svg, `swatch:${seed}`, {
      durationMs: 420,
      staggerMs: 30,
    });
  }, [crayon, theme, filled, seed]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="w-[16px] h-[16px] inline-block shrink-0 pointer-events-none crayon-stroke-svg"
    />
  );
}

/**
 * Hand-painted wax crayon button swatch (replaces plastic rectangular buttons with a real crayon stroke)
 */
export function CrayonButton({
  crayon,
  theme,
  seed = 77,
  variant = 'filled',
  className = '',
  children,
  onClick,
  ariaExpanded,
  title,
}: {
  crayon: CrayonToken;
  theme: ThemeMode;
  seed?: number;
  variant?: 'filled' | 'sketch';
  className?: string;
  children: ReactNode;
  onClick: () => void;
  ariaExpanded?: boolean;
  title?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const col = getUiCrayonHex(crayon, theme);

    if (variant === 'filled') {
      // Painterly multi-pass wax crayon stroke behind CTA text
      svg.appendChild(
        rc.rectangle(4, 4, 172, 34, {
          seed,
          stroke: col,
          strokeWidth: 2.2,
          fill: col,
          fillStyle: 'zigzag',
          fillWeight: 2.8,
          hachureGap: 3.1,
          hachureAngle: -14,
          roughness: 1.65,
        })
      );
      svg.appendChild(
        rc.rectangle(5, 5, 170, 32, {
          seed: seed + 19,
          stroke: col,
          strokeWidth: 1.4,
          roughness: 1.75,
          bowing: 1.2,
        })
      );
    } else {
      svg.appendChild(
        rc.rectangle(4, 4, 172, 34, {
          seed,
          stroke: col,
          strokeWidth: 2.0,
          roughness: 1.65,
          bowing: 1.15,
        })
      );
    }

    animateSvgStrokesOnce(svg, `btn:${seed}:${variant}`, {
      durationMs: 560,
      staggerMs: 45,
      maxTotalStaggerMs: 260,
    });
  }, [crayon, theme, seed, variant]);

  const textColor =
    variant === 'filled'
      ? theme === 'paper'
        ? '#FCFBF8'
        : '#101318'
      : getUiCrayonHex(crayon, theme);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={ariaExpanded}
      title={title}
      className={`relative inline-flex items-center justify-center gap-1.5 px-4 py-1.5 font-display text-[18px] leading-none whitespace-nowrap shrink-0 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] ${className}`}
      style={{ color: textColor }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 180 42"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none crayon-stroke-svg"
      />
      <span className="relative z-10 inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}

/**
 * Hand-scribbled wax crayon progress bar (for BKT Mastery & Lesson progress)
 */
export function CrayonProgressStroke({
  percent,
  crayon,
  theme,
  seed = 55,
  className = 'w-20 h-[10px]',
}: {
  percent: number;
  crayon: CrayonToken;
  theme: ThemeMode;
  seed?: number;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const clamped = Math.max(0, Math.min(100, percent));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const trackColor =
      theme === 'paper' ? 'rgba(59, 53, 46, 0.25)' : 'rgba(242, 237, 226, 0.22)';
    const fillColor = getUiCrayonHex(crayon, theme);

    svg.appendChild(
      rc.line(3, 6, 117, 6, {
        seed,
        stroke: trackColor,
        strokeWidth: 2.4,
        roughness: 1.3,
      })
    );

    if (clamped > 2) {
      const endX = 3 + (114 * clamped) / 100;
      svg.appendChild(
        rc.line(3, 6, endX, 6, {
          seed: seed + 11,
          stroke: fillColor,
          strokeWidth: 4.2,
          roughness: 1.5,
        })
      );
    }

    animateSvgStrokesOnce(svg, `progress:${seed}`, {
      durationMs: 560,
      staggerMs: 85,
    });
  }, [clamped, crayon, theme, seed]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 120 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`inline-block pointer-events-none crayon-stroke-svg ${className}`}
    />
  );
}

/**
 * Tactile Hand-Drawn Wax Crayon Range Slider
 * Sketches onto the paper on its first appearance, then updates instantaneously when dragged.
 * Supports a subtle intensifying hand-rubbed wax crayon halo when approaching/reaching an optimal Reto value.
 */
export function CrayonSlider({
  value,
  min,
  max,
  step,
  crayon,
  theme,
  seed = 41,
  ariaLabel,
  optimalGlow = 0,
  isOptimal = false,
  onChange,
  onFocusStart,
  onFocusEnd,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  crayon: CrayonToken;
  theme: ThemeMode;
  seed?: number;
  ariaLabel: string;
  optimalGlow?: number;
  isOptimal?: boolean;
  onChange: (val: number) => void;
  onFocusStart?: () => void;
  onFocusEnd?: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ratio = Math.max(0, Math.min(1, (value - min) / Math.max(1e-6, max - min)));
  const thumbX = 10 + ratio * 100;
  const clampedGlow = Math.max(0, Math.min(1, optimalGlow));

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const trackColor =
      theme === 'paper' ? 'rgba(59, 53, 46, 0.28)' : 'rgba(242, 237, 226, 0.25)';
    const fillColor = getCrayonHex(crayon, theme);
    const sageHex = getCrayonHex('sage', theme);
    const ochreHex = getCrayonHex('ochre', theme);
    const paperColor = THEME_PALETTES[theme].paperBg;
    const cy = 12;

    // Subtle intensifying hand-rubbed wax halo behind track & thumb during active Reto proximity
    if (clampedGlow > 0.05) {
      const haloGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      haloGroup.setAttribute('filter', 'url(#crayon-wax-glow)');
      if (isOptimal) {
        haloGroup.setAttribute('class', 'crayon-optimal-halo');
      }
      const haloStroke = isOptimal ? sageHex : ochreHex;
      const haloAlpha = (0.18 + clampedGlow * (theme === 'paper' ? 0.36 : 0.44)).toFixed(2);
      haloGroup.setAttribute('opacity', haloAlpha);

      // Warm smudged wax pass along the rail
      haloGroup.appendChild(
        rc.line(8, cy, Math.max(22, thumbX), cy, {
          seed: seed + 53,
          stroke: haloStroke,
          strokeWidth: 7.5 + clampedGlow * 5.2,
          roughness: 1.85,
        })
      );

      // Expanding sketchy wax halo around the thumb
      haloGroup.appendChild(
        rc.circle(thumbX, cy, 15.5 + clampedGlow * 6.5, {
          seed: seed + 61,
          stroke: haloStroke,
          strokeWidth: 2.6 + clampedGlow * 2.1,
          fill: haloStroke,
          fillStyle: 'hachure',
          hachureGap: 3.4,
          roughness: 1.7,
        })
      );

      svg.appendChild(haloGroup);
    }

    // Hand-drawn pencil rail
    svg.appendChild(
      rc.line(8, cy, 112, cy, {
        seed,
        stroke: trackColor,
        strokeWidth: 2.2,
        roughness: 1.35,
      })
    );

    // Colored wax crayon fill stroke up to the thumb
    if (thumbX > 11) {
      svg.appendChild(
        rc.line(8, cy, thumbX, cy, {
          seed: seed + 7,
          stroke: fillColor,
          strokeWidth: isOptimal ? 5.2 : 4.8,
          roughness: 1.5,
        })
      );
    }

    // Crisp hand-drawn sage confirmation ring right around the thumb when optimal is reached
    if (isOptimal) {
      svg.appendChild(
        rc.circle(thumbX, cy, 17.5, {
          seed: seed + 79,
          stroke: sageHex,
          strokeWidth: 1.65,
          roughness: 1.45,
        })
      );
    }

    // Scribbled wax dot handle
    svg.appendChild(
      rc.circle(thumbX, cy, 13, {
        seed: seed + 23,
        stroke: isOptimal ? sageHex : fillColor,
        strokeWidth: 2.2,
        fill: paperColor,
        fillStyle: 'solid',
        roughness: 1.2,
      })
    );
    svg.appendChild(
      rc.circle(thumbX, cy, 6, {
        seed: seed + 31,
        stroke: isOptimal ? sageHex : fillColor,
        fill: isOptimal ? sageHex : fillColor,
        fillStyle: 'solid',
        roughness: 0.9,
      })
    );

    animateSvgStrokesOnce(svg, `slider:${ariaLabel}`, {
      durationMs: 480,
      staggerMs: 55,
      maxTotalStaggerMs: 220,
    });
  }, [thumbX, crayon, theme, seed, ariaLabel, clampedGlow, isOptimal]);

  return (
    <div
      data-optimal-glow={clampedGlow.toFixed(2)}
      data-optimal-hit={isOptimal ? 'true' : 'false'}
      className="relative w-full h-[24px] flex items-center select-none rounded-[3px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-dashed has-[:focus-visible]:outline-[var(--ui-accent)] has-[:focus-visible]:outline-offset-2"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 120 24"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="w-full h-[24px] block pointer-events-none crayon-stroke-svg overflow-visible"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={onFocusStart}
        onPointerUp={onFocusEnd}
        onPointerCancel={onFocusEnd}
        onBlur={onFocusEnd}
        onFocus={onFocusStart}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  );
}

/**
 * Hand-drawn rough circle marker for sequential course & lesson pipeline stages
 */
export function CrayonStepMarker({
  index,
  active,
  completed,
  crayon,
  theme,
  label,
  size = 28,
}: {
  index: number;
  active: boolean;
  completed: boolean;
  crayon: CrayonToken;
  theme: ThemeMode;
  label?: string;
  size?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const col = completed
      ? getUiCrayonHex('sage', theme)
      : active
        ? getUiCrayonHex(crayon, theme)
        : getUiCrayonHex('pencil', theme);

    svg.appendChild(
      rc.circle(14, 14, 22, {
        seed: 90 + index * 17,
        stroke: col,
        strokeWidth: active || completed ? 2.3 : 1.35,
        fill: completed ? col : undefined,
        fillStyle: 'hachure',
        fillWeight: 1.8,
        hachureGap: 3.4,
        roughness: 1.4,
      })
    );

    if (active && !completed) {
      svg.appendChild(
        rc.circle(14, 14, 24.5, {
          seed: 140 + index * 13,
          stroke: col,
          strokeWidth: 1.25,
          roughness: 1.65,
        })
      );
    }

    if (completed) {
      const checkStroke = theme === 'paper' ? '#FCFBF8' : '#101318';
      svg.appendChild(
        rc.linearPath(
          [
            [8.5, 14.5],
            [12.5, 18.5],
            [20, 9.5],
          ],
          {
            seed: 200 + index,
            stroke: checkStroke,
            strokeWidth: 2.5,
            roughness: 0.9,
          }
        )
      );
    }

    animateSvgStrokesOnce(svg, `marker:${label ?? index}:${size}`, {
      durationMs: 420,
      staggerMs: 40,
      initialDelayMs: Math.min(280, index * 32),
    });
  }, [index, active, completed, crayon, theme, label, size]);

  return (
    <span
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 28 28"
        aria-hidden="true"
        className="w-full h-full pointer-events-none crayon-stroke-svg"
      />
      {!completed && (
        <span
          className="absolute inset-0 flex items-center justify-center font-display leading-none"
          style={{
            fontSize: size <= 24 ? '13.5px' : '15px',
            color: active ? getUiCrayonHex(crayon, theme) : 'var(--text-muted)',
          }}
        >
          {label ?? index + 1}
        </span>
      )}
    </span>
  );
}

/**
 * Hand-drawn Rough.js SVG computational DAG for Scene 2.2 (AutoDiff)
 * Animates every edge & node stroke sequentially on its FIRST appearance.
 */
export function AutoDiffRoughGraph({
  snapshot,
  theme,
}: {
  snapshot: AutoDiffSnapshot;
  theme: ThemeMode;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [labelsVisible, setLabelsVisible] = useState(() =>
    globalFirstDrawRegistry.hasBeenDrawn('graph:autodiff-dag')
  );

  const layout: Record<string, { x: number; y: number }> = {
    x: { x: 42, y: 36 },
    w: { x: 42, y: 114 },
    y: { x: 42, y: 192 },
    v1: { x: 146, y: 36 },
    v2: { x: 146, y: 114 },
    v3: { x: 146, y: 192 },
    v4: { x: 246, y: 74 },
    out: { x: 318, y: 132 },
  };
  const boxW = 70;
  const boxH = 40;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);

    const edgeColor =
      snapshot.activePass === 'backward'
        ? getCrayonHex('vermilion', theme)
        : snapshot.activePass === 'forward'
          ? getCrayonHex('sage', theme)
          : getCrayonHex('pencil', theme);

    snapshot.nodes.forEach((node, idx) => {
      const dst = layout[node.id];
      if (!dst) return;
      node.inputs.forEach((srcId, j) => {
        const src = layout[srcId];
        if (!src) return;
        const line = rc.line(src.x + boxW / 2, src.y, dst.x - boxW / 2, dst.y, {
          seed: 100 + idx * 13 + j * 7,
          stroke: edgeColor,
          strokeWidth: snapshot.activePass === 'idle' ? 1.4 : 2.1,
          roughness: 1.25,
        });
        svg.appendChild(line);
      });
    });

    snapshot.nodes.forEach((node, idx) => {
      const pos = layout[node.id];
      if (!pos) return;
      const stroke = getCrayonHex(node.crayon, theme);
      const rect = rc.rectangle(pos.x - boxW / 2, pos.y - boxH / 2, boxW, boxH, {
        seed: 300 + idx * 17,
        stroke,
        strokeWidth: 1.8,
        fill: THEME_PALETTES[theme].surfaceBg,
        fillStyle: 'solid',
        roughness: 1.35,
      });
      svg.appendChild(rect);
    });

    const animated = animateSvgStrokesOnce(svg, 'graph:autodiff-dag', {
      durationMs: 620,
      staggerMs: 55,
      maxTotalStaggerMs: 780,
      onComplete: () => setLabelsVisible(true),
    });
    if (animated) {
      setLabelsVisible(false);
    }
  }, [snapshot, theme]);

  return (
    <div
      className="relative w-full aspect-[360/228] select-none"
      aria-label="Grafo computacional AutoDiff"
    >
      <svg
        ref={svgRef}
        viewBox="0 0 360 228"
        className="w-full h-full block crayon-stroke-svg"
      />
      <div className="absolute inset-0 pointer-events-none">
        {snapshot.nodes.map((node, i) => {
          const pos = layout[node.id];
          if (!pos) return null;
          return (
            <div
              key={node.id}
              style={{
                left: `${(pos.x / 360) * 100}%`,
                top: `${(pos.y / 228) * 100}%`,
                opacity: labelsVisible ? 1 : 0,
                animationDelay: labelsVisible ? `${i * 30}ms` : undefined,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 text-center leading-tight transition-opacity duration-300 ${
                labelsVisible ? 'crayon-label-reveal' : ''
              }`}
            >
              <div className="text-[12px] font-hand text-[var(--text-primary)] whitespace-nowrap">
                {node.label}
              </div>
              <div className="text-[10px] font-mono-math tabular-nums flex items-center justify-center gap-0.5 whitespace-nowrap">
                <span style={{ color: 'var(--crayon-sage)' }}>{node.value.toFixed(1)}</span>
                <span className="text-[var(--text-muted)]">/</span>
                <span style={{ color: 'var(--crayon-vermilion)' }}>
                  {node.grad.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Graceful Rough.js technical fallback when WebGL 2 is unavailable or context lost
 */
export function WebGLFallbackSvg({
  title,
  theme,
}: {
  title: string;
  theme: ThemeMode;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const g = getCrayonHex('graphite', theme);
    const c = getCrayonHex('cobalt', theme);
    const v = getCrayonHex('vermilion', theme);
    const o = getCrayonHex('ochre', theme);

    svg.appendChild(rc.line(70, 220, 350, 220, { seed: 1, stroke: g, strokeWidth: 1.8, roughness: 1.4 }));
    svg.appendChild(rc.line(180, 250, 180, 60, { seed: 2, stroke: g, strokeWidth: 1.8, roughness: 1.4 }));
    svg.appendChild(rc.line(180, 220, 310, 165, { seed: 3, stroke: c, strokeWidth: 3.0, roughness: 1.5 }));
    svg.appendChild(rc.line(180, 220, 235, 95, { seed: 4, stroke: v, strokeWidth: 3.0, roughness: 1.5 }));
    svg.appendChild(rc.line(180, 220, 110, 145, { seed: 5, stroke: o, strokeWidth: 3.0, roughness: 1.5 }));
    svg.appendChild(
      rc.polygon(
        [
          [180, 220],
          [310, 165],
          [365, 40],
          [235, 95],
        ],
        { seed: 6, stroke: c, fill: c, fillStyle: 'hachure', hachureGap: 6, strokeWidth: 1.5, roughness: 1.5 }
      )
    );

    animateSvgStrokesOnce(svg, 'fallback:webgl-diagram', {
      durationMs: 700,
      staggerMs: 85,
      maxTotalStaggerMs: 750,
    });
  }, [theme]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center notebook-paper-bg">
      <svg ref={svgRef} viewBox="0 0 420 280" className="w-full max-w-md h-auto mb-4 crayon-stroke-svg" />
      <p className="font-display text-2xl text-[var(--text-primary)] crayon-ink">{title}</p>
      <p className="text-[16px] text-[var(--text-secondary)] max-w-md mt-1">
        El contexto WebGL 2 no está activo en este navegador. La ecuación interactiva y el plano
        computacional continúan completamente operativos.
      </p>
    </div>
  );
}
