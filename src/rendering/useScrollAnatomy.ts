/**
 * Scroll-driven Modo Anatomía for the WebGL lab.
 *
 * While "Separar vista" is on, vertical scrolling over the 3D viewport (mouse wheel, trackpad,
 * PageUp/PageDown, or dragging the side rail on touch screens) sets a target explode amount in
 * [0, 1]: scrolling down peels the layers apart, scrolling up folds them back. The visible amount
 * follows that target through a slightly under-damped spring, so the model eases and settles
 * organically instead of jumping with each wheel notch.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export const SPRING = { stiffness: 90, damping: 13 } as const;

/** One explicit-Euler step of the spring (exported for tests). */
export function springStep(
  x: number,
  v: number,
  target: number,
  dt: number,
  k = SPRING.stiffness,
  c = SPRING.damping
): { x: number; v: number } {
  const a = k * (target - x) - c * v;
  const nv = v + a * dt;
  return { x: x + nv * dt, v: nv };
}

/** Converts a WheelEvent delta into explode units (one trackpad "page" ≈ the whole range). */
export function wheelToAmount(deltaY: number, deltaMode: number): number {
  const px = deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * 600 : deltaY;
  return px / 650;
}

interface Options {
  enabled: boolean;
  hostRef: RefObject<HTMLElement | null>;
  apply: (amount: number | null) => void;
  setWheelZoom: (enabled: boolean) => void;
}

export function useScrollAnatomy({ enabled, hostRef, apply, setWheelZoom }: Options) {
  const [amount, setAmount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const state = useRef({ x: 0, v: 0, target: 0 });
  const raf = useRef(0);
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const kick = useCallback(() => {
    if (raf.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const s = state.current;
      const next = springStep(s.x, s.v, s.target, dt);
      s.x = next.x;
      s.v = next.v;
      applyRef.current(Math.max(0, s.x));
      setAmount(Math.max(0, s.x));
      if (Math.abs(s.target - s.x) < 0.0015 && Math.abs(s.v) < 0.002) {
        s.x = s.target;
        s.v = 0;
        applyRef.current(s.x);
        setAmount(s.x);
        raf.current = 0;
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const setTarget = useCallback(
    (t: number) => {
      state.current.target = Math.max(0, Math.min(1, t));
      kick();
    },
    [kick]
  );

  useEffect(() => {
    if (!enabled) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Entering the mode: unfold from the collapsed model to fully separated.
    state.current = { x: 0, v: 0, target: 1 };
    setScrolled(false);
    if (reduced) {
      state.current.x = 1;
      applyRef.current(1);
      setAmount(1);
    } else {
      kick();
    }
    setWheelZoom(false);

    const host = hostRef.current;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom gestures on trackpads
      e.preventDefault();
      setScrolled(true);
      setTarget(state.current.target + wheelToAmount(e.deltaY, e.deltaMode));
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'PageDown') setTarget(state.current.target + 0.25);
      else if (e.key === 'PageUp') setTarget(state.current.target - 0.25);
      else return;
      e.preventDefault();
      setScrolled(true);
    };
    host?.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      host?.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = 0;
      setWheelZoom(true);
      // Hand the layers back to the classic toggle, which damps them home from where they are.
      applyRef.current(null);
    };
  }, [enabled, hostRef, kick, setTarget, setWheelZoom]);

  return { amount, setTarget, scrolled };
}
