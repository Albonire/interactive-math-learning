import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { ThemeMode } from '../core/types';
import { CrayonArrowRight, CrayonReset } from '../ui/CrayonIcons';
import { GlossaryText } from '../ui/CrayonDictionary';
import { CrayonButton, RoughUnderline } from '../ui/RoughElements';
import {
  buildHand3DScene,
  clampNumber,
  projectVec3,
  type ProjectedPoint,
} from './hand3dMath';

interface HandCrafted3DStageProps {
  moduleId: StudyModuleId;
  theme: ThemeMode;
  /** Scroll-driven progress 0..1 across the scrollytelling chapter */
  scrollProgress: number;
  /** Active narrative beat index 0..3 */
  activeBeat?: number;
  /** Optional button to jump into full Three.js WebGL Lab 3D */
  onOpenWebGL?: () => void;
  webGLLabel?: string;
}

function deterministicJitter(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = Number.parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draws a single organic hand-sketched graphite/wax stroke between two 2D points
 * with subtle deterministic quadratic midpoint wobble and optional double pass.
 */
function strokeHandLine(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  color: string,
  width: number,
  alpha: number,
  seed: number,
  dashed = false
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 0.8) return;

  const nx = -dy / len;
  const ny = dx / len;
  const wobble = Math.min(2.6, len * 0.022) * deterministicJitter(seed);
  const mx = (ax + bx) * 0.5 + nx * wobble;
  const my = (ay + by) * 0.5 + ny * wobble;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = hexToRgba(color, clampNumber(alpha, 0.14, 1));
  ctx.lineWidth = width;
  if (dashed) {
    ctx.setLineDash([5.5, 4.5]);
  }

  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(mx, my, bx, by);
  ctx.stroke();

  // Subtle second wax-crayon pass on hero strokes for handmade tooth
  if (!dashed && width >= 1.85 && len > 10) {
    const wobble2 = Math.min(2.2, len * 0.018) * deterministicJitter(seed + 41.7);
    const jx = deterministicJitter(seed + 13) * 0.8;
    const jy = deterministicJitter(seed + 29) * 0.8;
    ctx.strokeStyle = hexToRgba(color, clampNumber(alpha * 0.42, 0.08, 0.55));
    ctx.lineWidth = Math.max(0.9, width * 0.65);
    ctx.beginPath();
    ctx.moveTo(ax + jx, ay + jy);
    ctx.quadraticCurveTo(
      (ax + bx) * 0.5 + nx * wobble2,
      (ay + by) * 0.5 + ny * wobble2,
      bx - jx * 0.6,
      by - jy * 0.6
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawDraftingCornerTicks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  inkColor: string
): void {
  const pad = 10;
  const tick = 12;
  ctx.save();
  ctx.strokeStyle = hexToRgba(inkColor, 0.28);
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'round';

  const corners: Array<[number, number, number, number]> = [
    [pad, pad, 1, 1],
    [w - pad, pad, -1, 1],
    [pad, h - pad, 1, -1],
    [w - pad, h - pad, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * tick);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * tick, cy);
    ctx.stroke();
  }
  ctx.restore();
}

export function HandCrafted3DStage({
  moduleId,
  theme,
  scrollProgress,
  activeBeat = 0,
  onOpenWebGL,
  webGLLabel,
}: HandCrafted3DStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 420, h: 330 });
  const [yawOffset, setYawOffset] = useState(0);
  const [pitchOffset, setPitchOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [manualProgress, setManualProgress] = useState<number | null>(null);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  // Reset orbit & manual override when switching module
  useEffect(() => {
    setYawOffset(0);
    setPitchOffset(0);
    setManualProgress(null);
  }, [moduleId]);

  // Responsive ResizeObserver for crisp retina canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const w = Math.max(240, Math.round(rect.width));
      // On phones the stage is pinned while the text scrolls, so it stays compact there.
      const h =
        w < 560
          ? Math.max(190, Math.min(240, Math.round(w * 0.6)))
          : Math.max(260, Math.min(390, Math.round(w * 0.78)));
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const effectiveProgress = manualProgress ?? scrollProgress;

  const scene = useMemo(
    () => buildHand3DScene(moduleId, effectiveProgress),
    [moduleId, effectiveProgress]
  );

  // Render hand-sketched 3D projection onto retina 2D canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);

    const palette = THEME_PALETTES[theme];
    const baseYaw = scene.camera
      ? scene.camera.yaw + (effectiveProgress - 0.5) * 0.3
      : 0.56 + effectiveProgress * 1.25 + activeBeat * 0.08;
    const basePitch = scene.camera
      ? scene.camera.pitch
      : 0.34 + Math.sin(effectiveProgress * Math.PI) * 0.14;
    const yaw = baseYaw + yawOffset;
    const pitch = clampNumber(basePitch + pitchOffset, -1.15, 1.15);

    drawDraftingCornerTicks(ctx, size.w, size.h, palette.crayons.graphite);

    // 1. Project & depth-sort translucent hand-tinted polygons
    const projectedPolys = scene.polys
      .map((poly, idx) => {
        const pts: ProjectedPoint[] = poly.points.map((pt) =>
          projectVec3(pt, yaw, pitch, size.w, size.h)
        );
        const avgDepth = pts.reduce((acc, p) => acc + p.depth, 0) / Math.max(1, pts.length);
        return { poly, pts, avgDepth, idx };
      })
      .sort((a, b) => a.avgDepth - b.avgDepth);

    for (const { poly, pts, idx } of projectedPolys) {
      if (pts.length < 3) continue;
      const color = getCrayonHex(poly.crayon, theme);
      const fillAlpha = poly.fillAlpha ?? (theme === 'chalkboard' ? 0.16 : 0.13);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, fillAlpha);
      ctx.fill();
      ctx.restore();

      const sw = poly.strokeWidth ?? 1.4;
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        strokeHandLine(
          ctx,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
          color,
          sw,
          0.55,
          idx * 31 + i * 7 + 3
        );
      }
    }

    // 2. Project & depth-sort hand-drawn lines
    const projectedLines = scene.lines
      .map((line, idx) => {
        const pa = projectVec3(line.a, yaw, pitch, size.w, size.h);
        const pb = projectVec3(line.b, yaw, pitch, size.w, size.h);
        const avgDepth = (pa.depth + pb.depth) * 0.5;
        return { line, pa, pb, avgDepth, idx };
      })
      .sort((a, b) => a.avgDepth - b.avgDepth);

    for (const { line, pa, pb, avgDepth, idx } of projectedLines) {
      const color = getCrayonHex(line.crayon, theme);
      // Depth cueing: front edges richer & slightly thicker, back edges softer
      const depthNorm = clampNumber((avgDepth + 1.8) / 3.6, 0, 1);
      const baseOpacity = line.opacity ?? 0.94;
      const alpha = baseOpacity * (0.42 + depthNorm * 0.58);
      const width = (line.width ?? 1.8) * (0.84 + depthNorm * 0.28);

      strokeHandLine(
        ctx,
        pa.x,
        pa.y,
        pb.x,
        pb.y,
        color,
        width,
        alpha,
        idx * 17.3 + 5,
        line.dashed
      );
    }

    // 3. Project & depth-sort wax dots and handwritten annotations
    const projectedDots = scene.dots
      .map((dot, idx) => ({
        dot,
        pt: projectVec3(dot.p, yaw, pitch, size.w, size.h),
        idx,
      }))
      .sort((a, b) => a.pt.depth - b.pt.depth);

    for (const { dot, pt, idx } of projectedDots) {
      const color = getCrayonHex(dot.crayon, theme);
      const r = (dot.radius ?? 4.2) * clampNumber(pt.scale * 1.05, 0.78, 1.35);

      ctx.save();
      // Outer soft wax halo
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r + 2.2, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, theme === 'chalkboard' ? 0.24 : 0.16);
      ctx.fill();

      // Core wax dot
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Hand-drawn ink rim
      ctx.beginPath();
      ctx.arc(
        pt.x + deterministicJitter(idx * 11) * 0.45,
        pt.y + deterministicJitter(idx * 19) * 0.45,
        r + 0.5,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = hexToRgba(palette.crayons.graphite, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Handwritten vertex label with subtle paper/chalk halo
      if (dot.label) {
        ctx.font = `600 13.5px 'Patrick Hand', cursive, sans-serif`;
        ctx.textBaseline = 'middle';
        const lx = pt.x + r + 5;
        const ly = pt.y - 2;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = hexToRgba(palette.paperBg, 0.88);
        ctx.strokeText(dot.label, lx, ly);
        ctx.fillStyle = color;
        ctx.fillText(dot.label, lx, ly);
      }
      ctx.restore();
    }
  }, [scene, size, theme, effectiveProgress, activeBeat, yawOffset, pitchOffset]);

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw: yawOffset,
      pitch: pitchOffset,
    };
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const start = dragRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    setYawOffset(start.yaw + dx * 0.011);
    setPitchOffset(clampNumber(start.pitch + dy * 0.009, -1.0, 1.0));
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  // Keyboard orbit: arrow keys rotate, Home recenters (the canvas is focusable).
  const handleKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = e.shiftKey ? 0.3 : 0.12;
    if (e.key === 'ArrowLeft') setYawOffset((v) => v - step);
    else if (e.key === 'ArrowRight') setYawOffset((v) => v + step);
    else if (e.key === 'ArrowUp') setPitchOffset((v) => clampNumber(v - step, -1, 1));
    else if (e.key === 'ArrowDown') setPitchOffset((v) => clampNumber(v + step, -1, 1));
    else if (e.key === 'Home') {
      setYawOffset(0);
      setPitchOffset(0);
    } else return;
    e.preventDefault();
  };

  const isModified = Math.abs(yawOffset) > 0.02 || Math.abs(pitchOffset) > 0.02 || manualProgress !== null;

  return (
    <div
      ref={containerRef}
      data-testid="hand-3d-stage"
      data-scroll-progress={effectiveProgress.toFixed(2)}
      className="w-full select-none space-y-2.5"
    >
      {/* Header whisper — completely boxless */}
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="hidden sm:flex font-hand text-[13.5px] text-[var(--ui-accent)] items-center gap-1.5">
            <span>Estudio 3D a mano alzada</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-math text-[11.5px] text-[var(--text-muted)]">
              {Math.round(effectiveProgress * 100)}%
            </span>
          </div>
          <h3 className="font-display crayon-ink text-[20px] sm:text-[22px] leading-tight text-[var(--text-primary)]">
            {scene.title}
          </h3>
          <div className="w-28 mt-0.5">
            <RoughUnderline crayon="cobalt" theme={theme} seed={moduleId.charCodeAt(1) * 19 + 7} />
          </div>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={() => {
              setYawOffset(0);
              setPitchOffset(0);
              setManualProgress(null);
            }}
            className="sketch-btn inline-flex items-center gap-1 px-2.5 py-1 text-[13px] font-hand text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
            title="Sincronizar de nuevo con el scroll y vista inicial"
          >
            <CrayonReset size={13} />
            <span>Recentrar</span>
          </button>
        )}
      </div>

      {/* Open-page 3D canvas — zero rectangular box, sits right on cotton paper / chalkboard */}
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          data-testid="hand-3d-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="img"
          style={{ width: size.w, height: size.h, touchAction: 'none' }}
          className={`block w-full rounded-sm focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-[var(--ui-accent)] ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          aria-label={`Escultura matemática 3D: ${scene.title}. ${scene.subtitle} Arrastra o usa las flechas para girar.`}
        />
        <span className="hidden sm:block pointer-events-none absolute bottom-2 right-3 font-hand text-[12.5px] text-[var(--text-muted)] opacity-80">
          <span className="hidden sm:inline">Arrastra o usa las flechas para girar · </span>el scroll transforma la escena
        </span>
      </div>

      {/* Interactive phase-morph scrub strip (compact, zero slider box) */}
      <div className="flex items-center gap-3 px-1">
        <span className="font-hand text-[13px] text-[var(--text-muted)] shrink-0">
          Fase 3D:
        </span>
        <div className="flex items-center gap-2 flex-1">
          {[0, 0.33, 0.67, 1].map((stop, idx) => {
            const active = Math.abs(effectiveProgress - stop) < 0.19;
            return (
              <button
                key={stop}
                type="button"
                onClick={() => setManualProgress(stop)}
                className={`flex-1 py-1 text-center font-mono-math text-[11.5px] border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-[var(--ui-accent)] text-[var(--ui-accent)] font-semibold'
                    : 'border-dashed border-[var(--hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                0{idx + 1}
              </button>
            );
          })}
          {manualProgress !== null && (
            <button
              type="button"
              onClick={() => setManualProgress(null)}
              className="font-hand text-[12.5px] text-[var(--ui-accent)] underline decoration-dotted cursor-pointer shrink-0"
            >
              Seguir scroll
            </button>
          )}
        </div>
      </div>

      {/* Handwritten subtitle with interactive glossary terms */}
      <p className="px-1 text-[14.5px] leading-snug text-[var(--text-secondary)]">
        <GlossaryText text={scene.subtitle} />
      </p>

      {/* Optional bridge to the full Three.js WebGL 3D Lab */}
      {onOpenWebGL && (
        <div className="pt-1 px-1">
          <CrayonButton
            crayon="cobalt"
            theme={theme}
            seed={moduleId.charCodeAt(1) * 11 + 53}
            onClick={onOpenWebGL}
          >
            <span>{webGLLabel ?? 'Entrar al Laboratorio 3D WebGL'}</span>
            <CrayonArrowRight size={14} />
          </CrayonButton>
        </div>
      )}
    </div>
  );
}
