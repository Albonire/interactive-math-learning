import { useEffect, useState, type ReactNode } from 'react';
import { globalFirstDrawRegistry } from '../core/firstDrawRegistry';

export interface SketchAnimationWrapperProps {
  /** Unique identifier of the 3D scene/object group being displayed */
  sceneKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * React wrapper paired with `Object3DSketchAnimator` in Three.js.
 * Detects the FIRST time a 3D scene appears in the session and applies a smooth
 * opacity + scale entrance transition (without ever remounting the WebGL canvas),
 * eliminating abrupt pop-ins when sketching a figure onto the paper for the first time.
 */
export function SketchAnimationWrapper({
  sceneKey,
  children,
  className = '',
}: SketchAnimationWrapperProps) {
  const [animatingKey, setAnimatingKey] = useState<string | null>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

    const isFirstAppearance = globalFirstDrawRegistry.claimFirstDraw(
      `sketch-wrapper:${sceneKey}`
    );

    if (!isFirstAppearance || prefersReduced) {
      setAnimatingKey(null);
      return;
    }

    setAnimatingKey(sceneKey);
    const timer = window.setTimeout(() => {
      setAnimatingKey((cur) => (cur === sceneKey ? null : cur));
    }, 780);

    return () => window.clearTimeout(timer);
  }, [sceneKey]);

  const isAnimating = animatingKey === sceneKey;

  return (
    <div
      data-testid="sketch-animation-wrapper"
      data-sketch-scene={sceneKey}
      data-sketch-wrapper={isAnimating ? 'animating' : 'ready'}
      className={`relative w-full h-full origin-center ${
        isAnimating ? 'sketch-wrapper-enter' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
