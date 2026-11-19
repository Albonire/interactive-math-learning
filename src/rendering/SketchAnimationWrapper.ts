import * as THREE from 'three';
import {
  FirstDrawRegistry,
  getAnatomyLayerDrawOrder,
  globalFirstDrawRegistry,
} from '../core/firstDrawRegistry';

export interface SketchEntranceState {
  progress: number;
  opacity: number;
  scale: number;
  drawProgress: number;
  done: boolean;
}

interface TrackedObjectEntry {
  key: string;
  startTimeMs: number;
  durationMs: number;
  delayMs: number;
  done: boolean;
}

/**
 * Pure easing calculation for a 3D object's first-time crayon sketch entrance:
 * - Opacity eases smoothly from 0 -> 1 so no mesh ever pops in harshly.
 * - Scale expands organically from 0.72 -> 1.0 as if sketched onto the paper.
 * - Shader drawProgress sweeps from 0.03 -> 1.0 with a fresh crayon tip edge.
 */
export function computeSketchEntranceTransform(
  elapsedMs: number,
  durationMs: number,
  delayMs = 0
): SketchEntranceState {
  const effectiveElapsed = elapsedMs - delayMs;
  if (effectiveElapsed <= 0) {
    return {
      progress: 0,
      opacity: 0,
      scale: 0.72,
      drawProgress: 0.02,
      done: false,
    };
  }

  const raw = Math.min(1, effectiveElapsed / Math.max(1, durationMs));
  if (raw >= 1) {
    return {
      progress: 1,
      opacity: 1,
      scale: 1,
      drawProgress: 1,
      done: true,
    };
  }

  // Smooth ease-out cubic for scale & draw sweep; brisk ease-out quad for opacity
  const easeCubic = 1 - Math.pow(1 - raw, 3);
  const easeOpacity = Math.min(1, 1 - Math.pow(1 - Math.min(1, raw * 1.35), 2));

  return {
    progress: raw,
    opacity: easeOpacity,
    scale: 0.72 + 0.28 * easeCubic,
    drawProgress: Math.max(0.03, easeCubic),
    done: false,
  };
}

function isObjectEffectivelyVisible(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    cur = cur.parent;
  }
  return true;
}

function findEnclosingLayerId(obj: THREE.Object3D): string {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (typeof cur.userData?.anatomyLayerId === 'string') {
      return cur.userData.anatomyLayerId;
    }
    cur = cur.parent;
  }
  return 'default';
}

/**
 * Detects whenever ANY 3D object (initial scene mesh, line, sprite, or dynamically
 * revealed element like a rank-collapse sheet or AI surface) becomes visible for
 * the FIRST time, and animates its smooth opacity, scale, and crayon-stroke reveal
 * from zero — eliminating abrupt pop-ins everywhere in the 3D sketchbook.
 */
export class Object3DSketchAnimator {
  private registry: FirstDrawRegistry;
  private activeTracks = new Map<string, TrackedObjectEntry>();

  constructor(registry: FirstDrawRegistry = globalFirstDrawRegistry) {
    this.registry = registry;
  }

  /**
   * Scans the scene graph, registers newly visible 3D objects on their first appearance,
   * and writes smooth `_sketchOpacity`, `_sketchScale`, and `_sketchDraw` factors
   * onto `obj.userData` for `CrayonMaterials` and `Sprite` labels to consume.
   * Returns `true` if any 3D object is still animating.
   */
  public updateObjectTree(
    sceneKey: string,
    root: THREE.Object3D,
    nowMs: number,
    options?: {
      durationMs?: number;
      reducedMotion?: boolean;
      staggerByLayer?: boolean;
    }
  ): boolean {
    const durationMs = options?.durationMs ?? 820;
    const reducedMotion = options?.reducedMotion ?? false;
    const staggerByLayer = options?.staggerByLayer ?? true;

    let anyAnimating = false;
    let ordinal = 0;

    root.traverse((obj) => {
      const isDrawable =
        (obj as THREE.Mesh).isMesh ||
        (obj as THREE.Line).isLine ||
        (obj as THREE.Sprite).isSprite;

      if (!isDrawable) return;
      ordinal++;

      if (!isObjectEffectivelyVisible(obj)) {
        return;
      }

      if (typeof obj.userData._sketchKey !== 'string') {
        const layerId = findEnclosingLayerId(obj);
        obj.userData._sketchKey = `obj3d:${sceneKey}:${layerId}:${ordinal}`;
        obj.userData._sketchLayerId = layerId;
      }

      const key = obj.userData._sketchKey as string;
      const layerId = (obj.userData._sketchLayerId as string) || 'default';
      let track = this.activeTracks.get(key);

      if (!track) {
        const isFirstAppearance = this.registry.claimFirstDraw(key);
        if (isFirstAppearance && !reducedMotion) {
          const isSprite = Boolean((obj as THREE.Sprite).isSprite);
          const layerOrder = getAnatomyLayerDrawOrder(layerId);
          // Initial scene objects cascade by anatomy layer; dynamically revealed objects start immediately
          const alreadyHasOtherObjects = this.activeTracks.size > 0;
          const delayMs = !staggerByLayer
            ? 0
            : isSprite
              ? 420
              : alreadyHasOtherObjects && layerId === 'error'
                ? 0
                : Math.round(layerOrder * 520);

          track = {
            key,
            startTimeMs: nowMs,
            durationMs: isSprite ? Math.round(durationMs * 0.55) : durationMs,
            delayMs,
            done: false,
          };
          this.activeTracks.set(key, track);
        } else {
          // Already seen before or reduced-motion: settle immediately
          track = {
            key,
            startTimeMs: nowMs - durationMs,
            durationMs,
            delayMs: 0,
            done: true,
          };
          this.activeTracks.set(key, track);
        }
      }

      if (track.done) {
        obj.userData._sketchOpacity = 1;
        obj.userData._sketchScale = 1;
        obj.userData._sketchDraw = 1;
        return;
      }

      const state = computeSketchEntranceTransform(
        nowMs - track.startTimeMs,
        track.durationMs,
        track.delayMs
      );
      obj.userData._sketchOpacity = state.opacity;
      obj.userData._sketchScale = state.scale;
      obj.userData._sketchDraw = state.drawProgress;

      if (state.done) {
        track.done = true;
      } else {
        anyAnimating = true;
      }
    });

    return anyAnimating;
  }

  public getAverageProgress(root: THREE.Object3D): number {
    let sum = 0;
    let count = 0;
    root.traverse((obj) => {
      if (typeof obj.userData._sketchDraw === 'number') {
        sum += obj.userData._sketchDraw;
        count++;
      }
    });
    return count > 0 ? sum / count : 1;
  }

  public resetTrackedScene(sceneKey: string): void {
    const prefix = `obj3d:${sceneKey}:`;
    for (const k of Array.from(this.activeTracks.keys())) {
      if (k.startsWith(prefix)) {
        this.activeTracks.delete(k);
      }
    }
  }
}
