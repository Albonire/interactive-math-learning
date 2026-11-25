import { useCallback, useEffect, useRef, useState } from 'react';
import { getCrayonHex } from '../core/palette';
import type { CrayonToken, SceneId, ThemeMode } from '../core/types';
import {
  appendCompletedStroke,
  appendFreehandPoint,
  createFreehandStroke,
  getBrushRadiusPx,
  undoLastFreehandStroke,
  type FreehandBrushSize,
  type FreehandStroke,
  type FreehandTool,
} from '../sketch/freehandStorage';
import {
  CrayonClose,
  CrayonEraser,
  CrayonPencil,
  CrayonReset,
} from './CrayonIcons';
import { CrayonSwatch } from './RoughElements';

interface FreehandCanvasOverlayProps {
  sceneId: SceneId;
  active: boolean;
  visible: boolean;
  strokes: readonly FreehandStroke[];
  theme: ThemeMode;
  ecoMode: boolean;
  hidden?: boolean;
  onChangeStrokes: (next: FreehandStroke[]) => void;
  onCloseDrawing: () => void;
  onToggleVisible: () => void;
  onStrokeSound?: (normDelta: number) => void;
}

const BRUSH_CRAYONS: readonly { token: CrayonToken; label: string }[] = [
  { token: 'graphite', label: 'Grafito' },
  { token: 'cobalt', label: 'Cobalto' },
  { token: 'vermilion', label: 'Bermellón' },
  { token: 'ochre', label: 'Ocre' },
  { token: 'sage', label: 'Salvia' },
];

const BRUSH_SIZES: readonly { id: FreehandBrushSize; label: string; dotPx: number }[] = [
  { id: 'fine', label: 'Fino', dotPx: 4 },
  { id: 'medium', label: 'Medio', dotPx: 7 },
  { id: 'bold', label: 'Grueso', dotPx: 10 },
];

function deterministicHash(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Draws a single wax-crayon or eraser stroke onto a 2D canvas using dry-wax
 * multi-grain stippling so hand-drawn equations and sketches feel authentically
 * drawn on cotton paper or dusty chalkboard.
 */
function renderStrokeOnContext(
  ctx: CanvasRenderingContext2D,
  stroke: FreehandStroke,
  width: number,
  height: number,
  theme: ThemeMode,
  ecoMode: boolean
): void {
  if (stroke.points.length === 0) return;
  const radius = getBrushRadiusPx(stroke.size, stroke.tool);

  ctx.save();
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = radius * 2;
    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.nx * width, first.ny * height);
    if (stroke.points.length === 1) {
      ctx.arc(first.nx * width, first.ny * height, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].nx * width, stroke.points[i].ny * height);
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const hex = getCrayonHex(stroke.crayon, theme);
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Core textured wax spine
  ctx.strokeStyle = hex;
  ctx.globalAlpha = theme === 'paper' ? 0.78 : 0.84;
  ctx.lineWidth = radius * 1.45;
  ctx.beginPath();
  const p0 = stroke.points[0];
  ctx.moveTo(p0.nx * width, p0.ny * height);
  if (stroke.points.length === 1) {
    ctx.fillStyle = hex;
    ctx.arc(p0.nx * width, p0.ny * height, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    for (let i = 1; i < stroke.points.length; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const mx = ((prev.nx + curr.nx) * 0.5) * width;
      const my = ((prev.ny + curr.ny) * 0.5) * height;
      ctx.quadraticCurveTo(prev.nx * width, prev.ny * height, mx, my);
    }
    const last = stroke.points[stroke.points.length - 1];
    ctx.lineTo(last.nx * width, last.ny * height);
    ctx.stroke();
  }

  // Dry-wax cotton-tooth grain pass (lightweight in Eco Mode)
  const grainStride = ecoMode ? 3 : 1;
  const bristlesPerStep = ecoMode ? 2 : 5;
  ctx.fillStyle = hex;

  let seedBase = stroke.createdAt % 997;
  for (let i = 1; i < stroke.points.length; i += grainStride) {
    const a = stroke.points[i - 1];
    const b = stroke.points[i];
    const ax = a.nx * width;
    const ay = a.ny * height;
    const bx = b.nx * width;
    const by = b.ny * height;
    const segLen = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.min(10, Math.ceil(segLen / Math.max(2.5, radius * 1.15))));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const cx = ax + (bx - ax) * t;
      const cy = ay + (by - ay) * t;
      for (let k = 0; k < bristlesPerStep; k++) {
        seedBase += 1.37;
        const r1 = deterministicHash(seedBase) - 0.5;
        const r2 = deterministicHash(seedBase + 19.1) - 0.5;
        const r3 = deterministicHash(seedBase + 41.7);
        const spread = radius * (1.25 + b.p * 0.45);
        const gx = cx + r1 * spread * 2;
        const gy = cy + r2 * spread * 2;
        const gSize = Math.max(0.9, radius * (0.22 + r3 * 0.34));
        ctx.globalAlpha = (theme === 'paper' ? 0.22 : 0.28) + r3 * 0.34;
        ctx.fillRect(gx, gy, gSize, gSize);
      }
    }
  }

  ctx.restore();
}

/**
 * Overlaid freehand crayon drawing canvas over the 3D scene ("Escritura Libre").
 * - Captures pointer strokes only when `active` is true; when exited, stays
 *   `pointer-events-none` so handwritten equations remain visible over the 3D view
 *   while OrbitControls work seamlessly underneath.
 * - All strokes are stored in normalized [0..1] coordinates and persisted per scene.
 */
export function FreehandCanvasOverlay({
  sceneId,
  active,
  visible,
  strokes,
  theme,
  ecoMode,
  hidden = false,
  onChangeStrokes,
  onCloseDrawing,
  onToggleVisible,
  onStrokeSound,
}: FreehandCanvasOverlayProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tool, setTool] = useState<FreehandTool>('crayon');
  const [crayon, setCrayon] = useState<CrayonToken>('cobalt');
  const [brushSize, setBrushSize] = useState<FreehandBrushSize>('medium');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const activeStrokeRef = useRef<FreehandStroke | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const lastSoundPointRef = useRef<{ x: number; y: number } | null>(null);

  // Measure host container smoothly
  useEffect(() => {
    if (hidden) return;
    const host = hostRef.current;
    if (!host) return;
    const sync = () => {
      setViewportSize((prev) =>
        prev.width === host.clientWidth && prev.height === host.clientHeight
          ? prev
          : { width: host.clientWidth, height: host.clientHeight }
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(host);
    return () => ro.disconnect();
  }, [hidden, active, visible]);

  // Repaint full stroke stack whenever strokes, size, theme, or visibility changes
  const repaintCanvas = useCallback(
    (inProgress: FreehandStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas || viewportSize.width === 0 || viewportSize.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, ecoMode ? 1.25 : 2);
      const targetW = Math.max(1, Math.round(viewportSize.width * dpr));
      const targetH = Math.max(1, Math.round(viewportSize.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportSize.width, viewportSize.height);

      if (visible) {
        for (const s of strokes) {
          renderStrokeOnContext(ctx, s, viewportSize.width, viewportSize.height, theme, ecoMode);
        }
        if (inProgress) {
          renderStrokeOnContext(ctx, inProgress, viewportSize.width, viewportSize.height, theme, ecoMode);
        }
      }
      ctx.restore();
    },
    [viewportSize.width, viewportSize.height, strokes, theme, ecoMode, visible]
  );

  useEffect(() => {
    if (hidden) return;
    repaintCanvas(activeStrokeRef.current);
  }, [hidden, repaintCanvas]);

  // Reset any in-flight stroke when switching lessons or leaving draw mode
  useEffect(() => {
    activeStrokeRef.current = null;
    drawingPointerIdRef.current = null;
  }, [sceneId, active]);

  const toNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    const p = e.pressure > 0 && e.pressure <= 1 ? Math.max(0.35, e.pressure) : 0.72;
    return { nx, ny, p, px: e.clientX - rect.left, py: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = toNormalizedPoint(e);
    if (!pt) return;

    if (!visible) onToggleVisible();

    drawingPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture errors
    }

    const stroke = createFreehandStroke(tool, crayon, brushSize, {
      nx: pt.nx,
      ny: pt.ny,
      p: pt.p,
    });
    activeStrokeRef.current = stroke;
    lastSoundPointRef.current = { x: pt.px, y: pt.py };
    repaintCanvas(stroke);
    if (tool === 'crayon') {
      onStrokeSound?.(0.14);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active || drawingPointerIdRef.current !== e.pointerId || !activeStrokeRef.current) return;
    e.preventDefault();
    const pt = toNormalizedPoint(e);
    if (!pt) return;

    const prevPoints = activeStrokeRef.current.points;
    const nextPoints = appendFreehandPoint(prevPoints, { nx: pt.nx, ny: pt.ny, p: pt.p });
    if (nextPoints.length === prevPoints.length) return;

    activeStrokeRef.current = {
      ...activeStrokeRef.current,
      points: nextPoints,
    };
    repaintCanvas(activeStrokeRef.current);

    if (tool === 'crayon' && lastSoundPointRef.current) {
      const distPx = Math.hypot(
        pt.px - lastSoundPointRef.current.x,
        pt.py - lastSoundPointRef.current.y
      );
      if (distPx >= 14) {
        lastSoundPointRef.current = { x: pt.px, y: pt.py };
        onStrokeSound?.(Math.min(0.65, distPx / 120));
      }
    }
  };

  const finishStroke = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingPointerIdRef.current === null || !activeStrokeRef.current) return;
    if (e && e.pointerId !== drawingPointerIdRef.current) return;

    const completed = activeStrokeRef.current;
    activeStrokeRef.current = null;
    drawingPointerIdRef.current = null;
    lastSoundPointRef.current = null;

    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    onChangeStrokes(appendCompletedStroke(strokes, completed));
  };

  if (hidden) return null;

  return (
    <div
      ref={hostRef}
      data-testid="freehand-overlay-root"
      data-freehand-active={active ? 'true' : 'false'}
      data-freehand-strokes={String(strokes.length)}
      data-freehand-visible={visible ? 'true' : 'false'}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
    >
      {/* Full-viewport transparent canvas layered directly over the 3D scene */}
      <canvas
        ref={canvasRef}
        data-testid="freehand-canvas"
        aria-label="Lienzo de escritura libre con crayón sobre la escena 3D"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        className={`absolute inset-0 z-[14] w-full h-full touch-none ${
          active ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
        }`}
      />

      {/* Artisanal floating crayon brush palette (visible only while Escritura Libre mode is active) */}
      {active && (
        <div
          role="toolbar"
          aria-label="Herramientas de Escritura Libre"
          data-testid="freehand-toolbar"
          className="pointer-events-auto absolute bottom-[78px] left-3 right-3 sm:left-auto sm:bottom-auto sm:top-[98px] sm:right-6 z-[25] sm:w-[248px] max-h-[46dvh] overflow-y-auto notebook-scroll bg-[var(--bg-paper)] crayon-ink-panel p-2.5 sm:p-3 shadow-[0_12px_28px_rgba(24,25,29,0.14)] space-y-1.5 sm:space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-[16.5px] sm:text-[17.5px] leading-none text-[var(--text-primary)] inline-flex items-center gap-1.5">
              <CrayonPencil size={15} className="text-[var(--ui-accent)]" />
              <span>Escritura Libre</span>
            </span>
            <button
              type="button"
              onClick={onCloseDrawing}
              data-testid="freehand-done-btn"
              title="Volver a rotar la cámara 3D (los bocetos siguen visibles)"
              aria-label="Salir del modo Escritura Libre"
              className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] cursor-pointer transition-colors"
            >
              <span>Rotar 3D</span>
              <CrayonClose size={14} />
            </button>
          </div>

          <p className="hidden sm:block text-[12.5px] leading-snug text-[var(--text-muted)]">
            Anota ecuaciones o bocetos sobre el 3D. Se guardan localmente por lección.
          </p>

          {/* Crayon swatches + Eraser */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Color de crayón">
              {BRUSH_CRAYONS.map((c, idx) => {
                const selected = tool === 'crayon' && crayon === c.token;
                return (
                  <button
                    key={c.token}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`Crayón ${c.label}`}
                    data-testid={`freehand-color-${c.token}`}
                    onClick={() => {
                      setTool('crayon');
                      setCrayon(c.token);
                    }}
                    className={`p-1 rounded-[3px] cursor-pointer transition-transform ${
                      selected
                        ? 'scale-110 ring-1 ring-dashed ring-[var(--ui-accent)] bg-[var(--bg-surface)]'
                        : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <CrayonSwatch crayon={c.token} theme={theme} filled seed={301 + idx * 13} />
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="freehand-eraser-btn"
              aria-pressed={tool === 'eraser'}
              title="Borrador de crayón"
              onClick={() => setTool((t) => (t === 'eraser' ? 'crayon' : 'eraser'))}
              className={`px-2 py-1 rounded-[3px] text-[13px] inline-flex items-center gap-1 cursor-pointer transition-colors ${
                tool === 'eraser'
                  ? 'bg-[var(--bg-surface-muted)] text-[var(--ui-accent)] font-display'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
              }`}
            >
              <CrayonEraser size={14} />
              <span>Borrar</span>
            </button>
          </div>

          {/* Stroke Thickness */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-dashed border-[var(--hairline)]">
            <span className="text-[12.5px] text-[var(--text-muted)]">Grosor</span>
            <div className="flex items-center gap-1.5">
              {BRUSH_SIZES.map((s) => {
                const selected = brushSize === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-testid={`freehand-size-${s.id}`}
                    aria-pressed={selected}
                    onClick={() => setBrushSize(s.id)}
                    className={`px-2 py-0.5 rounded-[3px] text-[12.5px] inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      selected
                        ? 'bg-[var(--bg-surface)] text-[var(--ui-accent)] font-display'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="rounded-full bg-current inline-block"
                      style={{ width: `${s.dotPx}px`, height: `${s.dotPx}px` }}
                    />
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Undo · Visibility · Clear */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-dashed border-[var(--hairline)] text-[13px]">
            <button
              type="button"
              data-testid="freehand-undo-btn"
              disabled={strokes.length === 0}
              onClick={() => onChangeStrokes(undoLastFreehandStroke(strokes))}
              className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <CrayonReset size={13} />
              <span>Deshacer</span>
            </button>

            <button
              type="button"
              data-testid="freehand-visibility-btn"
              disabled={strokes.length === 0}
              onClick={onToggleVisible}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              {visible ? 'Ocultar' : 'Mostrar'}
            </button>

            <button
              type="button"
              data-testid="freehand-clear-btn"
              disabled={strokes.length === 0}
              onClick={() => onChangeStrokes([])}
              className="text-[var(--ui-warning)] hover:underline disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              Limpiar ({strokes.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
