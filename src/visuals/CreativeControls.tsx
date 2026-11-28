import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import rough from 'roughjs';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function quantize(v: number, step: number): number {
  if (step <= 0) return v;
  const inv = Math.round(1 / step);
  if (Math.abs(inv * step - 1) < 1e-6) {
    return Math.round(v * inv) / inv;
  }
  return Math.round(v / step) * step;
}

/**
 * Converts client pointer coordinates into exact SVG viewBox coordinates
 * for direct-manipulation drag handles right inside math diagrams.
 */
export function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const mapped = pt.matrixTransform(ctm.inverse());
    return { x: mapped.x, y: mapped.y };
  }
  const rect = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const rx = (clientX - rect.left) / Math.max(1, rect.width);
  const ry = (clientY - rect.top) / Math.max(1, rect.height);
  return {
    x: vb.x + rx * vb.width,
    y: vb.y + ry * vb.height,
  };
}

/**
 * Tactile hand-drawn SVG drag handle directly inside an interactive diagram.
 * Includes a generous invisible hit area (r=22) for effortless finger/mouse grabbing.
 */
export function DiagramDragHandle({
  cx,
  cy,
  color,
  paperBg,
  label,
  active = false,
  onPointerDown,
  onKeyStep,
  valueText,
}: {
  cx: number;
  cy: number;
  color: string;
  paperBg: string;
  label?: string;
  active?: boolean;
  onPointerDown: (e: ReactPointerEvent<SVGGElement>) => void;
  /** Keyboard nudge: arrow keys call this with (dx, dy) in {-1, 0, 1} (×5 with Shift). */
  onKeyStep?: (dx: number, dy: number) => void;
  /** Spoken current value for screen readers, e.g. "x = 1, y = 2". */
  valueText?: string;
}) {
  const keyboardEnabled = Boolean(onKeyStep);
  return (
    <g
      onPointerDown={onPointerDown}
      onKeyDown={
        onKeyStep
          ? (e) => {
              const m = e.shiftKey ? 5 : 1;
              const map: Record<string, [number, number]> = {
                ArrowLeft: [-m, 0],
                ArrowRight: [m, 0],
                ArrowUp: [0, m],
                ArrowDown: [0, -m],
              };
              const d = map[e.key];
              if (!d) return;
              e.preventDefault();
              onKeyStep(d[0], d[1]);
            }
          : undefined
      }
      tabIndex={keyboardEnabled ? 0 : undefined}
      style={{ cursor: active ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none' }}
      className="hand-drag-handle"
      role="slider"
      aria-label={label ?? 'Punto arrastrable'}
      aria-valuetext={valueText}
    >
      {/* Generous touch target */}
      <circle cx={cx} cy={cy} r={22} fill="transparent" />
      {/* Soft pulsing wax aura */}
      <circle
        cx={cx}
        cy={cy}
        r={active ? 14 : 11.5}
        fill={color}
        fillOpacity={active ? 0.25 : 0.14}
        stroke={color}
        strokeWidth={1.3}
        strokeDasharray="3 3"
      />
      {/* Hand-crafted wax knob */}
      <circle
        cx={cx}
        cy={cy}
        r={active ? 7.2 : 6.2}
        fill={paperBg}
        stroke={color}
        strokeWidth={2.6}
      />
      <circle cx={cx} cy={cy} r={2.6} fill={color} />
    </g>
  );
}

/**
 * Shared pointer plumbing for dragging handles inside an SVG diagram. The SVG captures the
 * pointer, so a drag keeps working when the finger slides off the small handle.
 *
 * Usage: spread `svgProps` on the <svg>, and `bind(key)` on each DiagramDragHandle.
 * `onMove` receives the pointer position in the SVG's own viewBox coordinates.
 */
export function useDiagramDrag<K extends string>(
  onMove: (key: K, point: { x: number; y: number }) => void
) {
  const [active, setActive] = useState<K | null>(null);
  const bind = (key: K) => ({
    active: active === key,
    onPointerDown: (e: ReactPointerEvent<SVGGElement>) => {
      e.preventDefault();
      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
      setActive(key);
    },
  });
  const end = () => setActive(null);
  const svgProps = {
    onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => {
      if (active === null) return;
      onMove(active, clientToSvgPoint(e.currentTarget, e.clientX, e.clientY));
    },
    onPointerUp: end,
    onPointerCancel: end,
    style: { touchAction: active ? ('none' as const) : ('pan-y' as const) },
  };
  return { active, bind, svgProps };
}

/**
 * Bret Victor "Tangle"-style inline scrubbable ink number.
 * Drag horizontally directly on the number (or click − / + nibs) to manipulate math live.
 */
export function InkScrubNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  displayValue,
  crayon = 'cobalt',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  crayon?: CrayonToken;
  onChange: (next: number) => void;
}) {
  const [scrubbing, setScrubbing] = useState(false);
  const startRef = useRef<{ x: number; startVal: number } | null>(null);

  const handlePointerDown = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setScrubbing(true);
    startRef.current = { x: e.clientX, startVal: value };
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const s = startRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const range = Math.max(step, max - min);
    const pxForFullRange = 170;
    const next = clamp(quantize(s.startVal + (dx / pxForFullRange) * range, step), min, max);
    if (next !== value) onChange(next);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    startRef.current = null;
    setScrubbing(false);
  };

  const crayonVar = `var(--crayon-${crayon})`;

  return (
    <div className="inline-flex items-center gap-1.5 select-none">
      <span className="font-hand text-[14.5px] text-[var(--text-secondary)]">{label}</span>
      <div className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onChange(clamp(quantize(value - step, step), min, max))}
          aria-label={`Disminuir ${label}`}
          className="w-6 h-6 inline-flex items-center justify-center font-mono-math text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          −
        </button>
        <span
          role="spinbutton"
          tabIndex={0}
          aria-label={`${label} (arrastra horizontalmente para ajustar)`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              onChange(clamp(quantize(value + step, step), min, max));
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              onChange(clamp(quantize(value - step, step), min, max));
            }
          }}
          style={{
            color: crayonVar,
            borderBottomColor: crayonVar,
            touchAction: 'none',
          }}
          title="Arrastra izquierda/derecha para ajustar como en un cuaderno interactivo"
          className={`px-1.5 py-0.5 font-mono-math text-[14px] font-semibold tabular-nums border-b-2 border-dashed cursor-ew-resize transition-transform ${
            scrubbing ? 'scale-105' : ''
          }`}
        >
          {displayValue ?? `${value}${unit}`}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(quantize(value + step, step), min, max))}
          aria-label={`Aumentar ${label}`}
          className="w-6 h-6 inline-flex items-center justify-center font-mono-math text-[13px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Hand-drawn Rotary Compass / Protractor Dial (Rough.js circle + tactile rotating wax needle).
 * Far more expressive than a flat horizontal slider for angles, phases, rotations, and ratios.
 */
export function SketchDial({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '°',
  displayValue,
  crayon = 'cobalt',
  theme,
  size = 86,
  seed = 73,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  crayon?: CrayonToken;
  theme: ThemeMode;
  size?: number;
  seed?: number;
  onChange: (next: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const roughGroupRef = useRef<SVGGElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const ratio = clamp((value - min) / Math.max(1e-6, max - min), 0, 1);
  // Map 0..1 to full compass angle (starts East = 0 rad, sweeps counter-clockwise)
  const rad = ratio * Math.PI * 2;
  const cx = 50;
  const cy = 50;
  const r = 36;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  const color = getCrayonHex(crayon, theme);
  const ink = THEME_PALETTES[theme].crayons.graphite;
  const pencil = THEME_PALETTES[theme].crayons.pencil;

  useEffect(() => {
    const svg = svgRef.current;
    const g = roughGroupRef.current;
    if (!svg || !g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    const rc = rough.svg(svg);
    g.appendChild(
      rc.circle(cx, cy, r * 2, {
        seed,
        stroke: pencil,
        strokeWidth: 1.5,
        roughness: 1.35,
      })
    );
    // 8 compass tick marks
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const rIn = i % 2 === 0 ? r - 5.5 : r - 3.5;
      g.appendChild(
        rc.line(
          cx + rIn * Math.cos(a),
          cy - rIn * Math.sin(a),
          cx + r * Math.cos(a),
          cy - r * Math.sin(a),
          {
            seed: seed + i * 7,
            stroke: pencil,
            strokeWidth: i % 2 === 0 ? 1.4 : 1,
            roughness: 0.9,
          }
        )
      );
    }
  }, [pencil, seed]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = clientToSvgPoint(svg, clientX, clientY);
      let angle = Math.atan2(-(pt.y - cy), pt.x - cx);
      if (angle < 0) angle += Math.PI * 2;
      const frac = angle / (Math.PI * 2);
      const next = clamp(quantize(min + frac * (max - min), step), min, max);
      onChange(next);
    },
    [min, max, step, onChange]
  );

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        className={`shrink-0 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <g ref={roughGroupRef} />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={3.5} fill={ink} />
        <circle
          cx={nx}
          cy={ny}
          r={dragging ? 7.5 : 6.2}
          fill={THEME_PALETTES[theme].paperBg}
          stroke={color}
          strokeWidth={2.5}
        />
      </svg>
      <div className="leading-tight">
        <div className="font-hand text-[14px] text-[var(--text-secondary)]">{label}</div>
        <div
          className="font-mono-math text-[15px] font-semibold tabular-nums"
          style={{ color }}
        >
          {displayValue ?? `${value}${unit}`}
        </div>
        <div className="font-hand text-[12px] text-[var(--text-muted)]">Gira el dial</div>
      </div>
    </div>
  );
}

/**
 * Hand-drawn 2D XY Drafting Pad: manipulate 2 coupled parameters simultaneously
 * by dragging a scribbled wax puck across an open coordinate plane.
 */
export function SketchXYPad({
  xLabel,
  yLabel,
  x,
  y,
  xMin,
  xMax,
  yMin,
  yMax,
  xStep = 0.1,
  yStep = 0.1,
  xDisplay,
  yDisplay,
  crayon = 'cobalt',
  theme,
  width = 168,
  height = 112,
  seed = 109,
  onChange,
}: {
  xLabel: string;
  yLabel: string;
  x: number;
  y: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xStep?: number;
  yStep?: number;
  xDisplay?: string;
  yDisplay?: string;
  crayon?: CrayonToken;
  theme: ThemeMode;
  width?: number;
  height?: number;
  seed?: number;
  onChange: (nextX: number, nextY: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const roughRef = useRef<SVGGElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const color = getCrayonHex(crayon, theme);
  const pencil = THEME_PALETTES[theme].crayons.pencil;
  const paperBg = THEME_PALETTES[theme].paperBg;

  const pad = 14;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const px = pad + clamp((x - xMin) / Math.max(1e-6, xMax - xMin), 0, 1) * innerW;
  const py = pad + (1 - clamp((y - yMin) / Math.max(1e-6, yMax - yMin), 0, 1)) * innerH;

  useEffect(() => {
    const svg = svgRef.current;
    const g = roughRef.current;
    if (!svg || !g) return;
    while (g.firstChild) g.removeChild(g.firstChild);
    const rc = rough.svg(svg);
    // Open drafting axes (L-frame + faint center crosshairs — NOT a heavy closed box)
    g.appendChild(
      rc.line(pad, height - pad, width - pad, height - pad, {
        seed,
        stroke: pencil,
        strokeWidth: 1.5,
        roughness: 1.25,
      })
    );
    g.appendChild(
      rc.line(pad, pad, pad, height - pad, {
        seed: seed + 5,
        stroke: pencil,
        strokeWidth: 1.5,
        roughness: 1.25,
      })
    );
    g.appendChild(
      rc.line(pad, pad + innerH * 0.5, width - pad, pad + innerH * 0.5, {
        seed: seed + 11,
        stroke: pencil,
        strokeWidth: 0.9,
        roughness: 1,
        strokeLineDash: [4, 4],
      })
    );
    g.appendChild(
      rc.line(pad + innerW * 0.5, pad, pad + innerW * 0.5, height - pad, {
        seed: seed + 17,
        stroke: pencil,
        strokeWidth: 0.9,
        roughness: 1,
        strokeLineDash: [4, 4],
      })
    );
  }, [width, height, innerW, innerH, pencil, seed]);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const pt = clientToSvgPoint(svg, clientX, clientY);
      const fx = clamp((pt.x - pad) / innerW, 0, 1);
      const fy = clamp(1 - (pt.y - pad) / innerH, 0, 1);
      const nx = clamp(quantize(xMin + fx * (xMax - xMin), xStep), xMin, xMax);
      const ny = clamp(quantize(yMin + fy * (yMax - yMin), yStep), yMin, yMax);
      onChange(nx, ny);
    },
    [innerW, innerH, xMin, xMax, yMin, yMax, xStep, yStep, onChange]
  );

  return (
    <div className="inline-flex items-center gap-3 select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        className={`shrink-0 ${dragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        role="group"
        aria-label={`Plano táctil 2D: ${xLabel} y ${yLabel}`}
      >
        <g ref={roughRef} />
        {/* Guide crosshairs to puck */}
        <line
          x1={px}
          y1={height - pad}
          x2={px}
          y2={py}
          stroke={color}
          strokeWidth={1.25}
          strokeDasharray="3 3"
          opacity={0.7}
        />
        <line
          x1={pad}
          y1={py}
          x2={px}
          y2={py}
          stroke={color}
          strokeWidth={1.25}
          strokeDasharray="3 3"
          opacity={0.7}
        />
        {/* Wax puck */}
        <circle cx={px} cy={py} r={dragging ? 12 : 10} fill={color} fillOpacity={0.18} />
        <circle
          cx={px}
          cy={py}
          r={dragging ? 6.5 : 5.5}
          fill={paperBg}
          stroke={color}
          strokeWidth={2.5}
        />
        <circle cx={px} cy={py} r={2.2} fill={color} />
      </svg>
      <div className="text-[13.5px] leading-snug space-y-0.5">
        <div className="font-hand text-[var(--text-muted)]">Arrastra en 2D:</div>
        <div className="font-mono-math text-[13px] text-[var(--text-primary)] tabular-nums">
          <span className="font-hand text-[14px] text-[var(--text-secondary)] mr-1">
            {xLabel}:
          </span>
          <span style={{ color }}>{xDisplay ?? x.toFixed(1)}</span>
        </div>
        <div className="font-mono-math text-[13px] text-[var(--text-primary)] tabular-nums">
          <span className="font-hand text-[14px] text-[var(--text-secondary)] mr-1">
            {yLabel}:
          </span>
          <span style={{ color }}>{yDisplay ?? y.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
