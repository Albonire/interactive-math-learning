import { globalFirstDrawRegistry } from '../core/firstDrawRegistry';

export interface SvgDrawOptions {
  /** Base stroke animation duration per path in ms */
  durationMs?: number;
  /** Delay between consecutive strokes in ms */
  staggerMs?: number;
  /** Maximum total stagger window so complex graphs finish briskly */
  maxTotalStaggerMs?: number;
  /** Initial delay before first stroke starts */
  initialDelayMs?: number;
  /** Optional callback once all strokes finish drawing */
  onComplete?: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animates every stroke inside an SVG element as if drawn by hand with wax crayon
 * on its FIRST appearance (guarded by `globalFirstDrawRegistry`).
 * Subsequent renders with the same `visualKey` skip the intro animation cleanly.
 */
export function animateSvgStrokesOnce(
  svg: SVGSVGElement | null,
  visualKey: string,
  options: SvgDrawOptions = {}
): boolean {
  if (!svg) return false;

  const isFirstTime = globalFirstDrawRegistry.claimFirstDraw(visualKey);
  if (!isFirstTime) return false;

  if (prefersReducedMotion()) {
    svg.dataset.firstDrawAnimated = 'reduced';
    options.onComplete?.();
    return false;
  }

  const {
    durationMs = 680,
    staggerMs = 45,
    maxTotalStaggerMs = 750,
    initialDelayMs = 0,
    onComplete,
  } = options;

  const shapes = Array.from(
    svg.querySelectorAll<SVGGeometryElement>(
      'path, line, polyline, polygon, circle, ellipse, rect'
    )
  );

  if (shapes.length === 0) {
    svg.dataset.firstDrawAnimated = 'true';
    onComplete?.();
    return true;
  }

  svg.dataset.firstDrawAnimated = 'drawing';

  const effectiveStagger =
    shapes.length > 1
      ? Math.min(staggerMs, maxTotalStaggerMs / Math.max(1, shapes.length - 1))
      : 0;

  let longestEndMs = 0;

  shapes.forEach((shape, idx) => {
    const delay = initialDelayMs + idx * effectiveStagger;
    const strokeAttr = shape.getAttribute('stroke');
    const isFillOnly = strokeAttr === 'none';

    if (isFillOnly || typeof shape.getTotalLength !== 'function') {
      const dur = Math.max(240, durationMs * 0.65);
      longestEndMs = Math.max(longestEndMs, delay + dur);
      if (typeof shape.animate === 'function') {
        shape.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: dur,
          delay,
          easing: 'ease-out',
          fill: 'both',
        });
      }
      return;
    }

    let len = 140;
    try {
      const measured = shape.getTotalLength();
      if (Number.isFinite(measured) && measured > 0.5) {
        len = measured;
      }
    } catch {
      // Some detached SVGs throw on getTotalLength; safe fallback above
    }

    // Scale duration slightly by stroke length so short ticks draw briskly and long lines flow smoothly
    const strokeDur = Math.round(
      Math.max(260, Math.min(durationMs * 1.25, durationMs * (0.65 + Math.min(1, len / 320) * 0.55)))
    );
    longestEndMs = Math.max(longestEndMs, delay + strokeDur);

    shape.style.strokeDasharray = `${len} ${len}`;
    shape.style.strokeDashoffset = `${len}`;

    if (typeof shape.animate === 'function') {
      const clearDash = () => {
        shape.style.strokeDasharray = '';
        shape.style.strokeDashoffset = '';
      };
      try {
        const anim = shape.animate(
          [
            { strokeDashoffset: len, opacity: 0.35 },
            { strokeDashoffset: len * 0.78, opacity: 1, offset: 0.16 },
            { strokeDashoffset: 0, opacity: 1 },
          ],
          {
            duration: strokeDur,
            delay,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'backwards',
          }
        );
        anim.onfinish = clearDash;
        anim.oncancel = clearDash;
      } catch {
        clearDash();
      }
    } else {
      shape.style.strokeDasharray = '';
      shape.style.strokeDashoffset = '';
    }
  });

  window.setTimeout(() => {
    shapes.forEach((shape) => {
      shape.style.strokeDasharray = '';
      shape.style.strokeDashoffset = '';
    });
    if (svg.dataset.firstDrawAnimated === 'drawing') {
      svg.dataset.firstDrawAnimated = 'true';
    }
    onComplete?.();
  }, Math.round(longestEndMs + 40));

  return true;
}
