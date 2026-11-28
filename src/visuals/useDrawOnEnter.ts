/**
 * Draws a diagram stroke by stroke the first time it scrolls into view.
 *
 * Until the container is at least ~25% visible its SVGs are held blank (data-draw="pending"),
 * so the reader never sees the finished drawing flash before it is "erased" and redrawn. Then
 * every SVG inside is handed to the shared `animateSvgStrokesOnce` crayon animation, and labels
 * fade in once most strokes are down. Reduced-motion users get the finished drawing at once.
 */
import { useEffect, useId, useRef } from 'react';
import { animateSvgStrokesOnce } from '../ui/svgDrawAnimation';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function useDrawOnEnter<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const instance = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      el.dataset.draw = 'done';
      return;
    }
    el.dataset.draw = 'pending';
    let timer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        el.dataset.draw = 'drawing';
        const svgs = Array.from(el.querySelectorAll<SVGSVGElement>('svg'));
        svgs.forEach((svg, i) =>
          animateSvgStrokesOnce(svg, `enter:${instance}:${i}`, {
            durationMs: 620,
            staggerMs: 38,
            maxTotalStaggerMs: 900,
            initialDelayMs: i * 120,
          })
        );
        timer = window.setTimeout(() => {
          el.dataset.draw = 'done';
        }, 1500);
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, [instance]);

  return ref;
}
