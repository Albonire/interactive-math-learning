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

export interface ProceduralStrokeTiming {
  delayMs: number;
  durationMs: number;
}

export interface ConstructionStrokeEvent {
  layerId: string;
  isLine: boolean;
  isSprite: boolean;
}

interface TrackedObjectEntry {
  key: string;
  layerId: string;
  isLine: boolean;
  isSprite: boolean;
  startTimeMs: number;
  durationMs: number;
  delayMs: number;
  started: boolean;
  done: boolean;
}

/**
 * Pure easing calculation for a 3D object's procedural stroke-by-stroke entrance:
 * - Opacity rises smoothly so no mesh or line ever pops in harshly.
 * - Scale settles organically from 0.72 -> 1.0 (lines draw via drawRange + sweep, meshes unfold).
 * - drawProgress uses a calm ease-in-out cubic so every stroke starts gently, glides cleanly,
 *   and lands delicately like lifting a wax crayon off cotton paper.
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

  // Smooth ease-in-out cubic for draw sweep (procedural real-time hand speed)
  const easeDraw =
    raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
  // Calm ease-out cubic for scale settling & gentle ease-out quad for opacity
  const easeScale = 1 - Math.pow(1 - raw, 3);
  const easeOpacity = Math.min(1, 1 - Math.pow(1 - Math.min(1, raw * 1.45), 2));

  return {
    progress: raw,
    opacity: easeOpacity,
    scale: 0.72 + 0.28 * easeScale,
    drawProgress: Math.max(0.03, easeDraw),
    done: false,
  };
}

/**
 * Computes structured, unhurried procedural stroke timings so 3D scenes construct
 * layer by layer AND element by element:
 * 1. Substrate (grid & axes) sketches first
 * 2. Structure (volumes, surfaces, manifolds) unfolds next
 * 3. Operators (vectors, slice curves, probes) draw one by one
 * 4. Invariants / error sheets complete the geometry
 * 5. Hand-lettered 3D labels appear last like an illustrator signing the diagram
 */
export function computeProceduralStrokeTiming(opts: {
  layerId: string;
  indexInLayer: number;
  isSprite: boolean;
  isLine: boolean;
  baseDurationMs: number;
  staggerByLayer: boolean;
  isDynamicReveal: boolean;
  ecoMode?: boolean;
}): ProceduralStrokeTiming {
  const {
    layerId,
    indexInLayer,
    isSprite,
    isLine,
    baseDurationMs,
    staggerByLayer,
    isDynamicReveal,
    ecoMode = false,
  } = opts;

  const durationScale = isSprite ? 0.62 : isLine ? 1.05 : 1.12;
  const durationMs = Math.max(240, Math.round(baseDurationMs * durationScale));

  if (!staggerByLayer || (isDynamicReveal && layerId === 'error')) {
    return { delayMs: 0, durationMs };
  }

  const pace = ecoMode ? 0.58 : 1.0;

  if (isSprite) {
    // Labels are written last in sequence after the main geometry has taken shape
    const cappedIdx = Math.min(indexInLayer, 7);
    const delayMs = Math.round((2750 + cappedIdx * 165) * pace);
    return { delayMs, durationMs };
  }

  const layerOrder = getAnatomyLayerDrawOrder(layerId);
  // Layer stage start times: substrate(0ms) -> structure(~920ms) -> operator(~1820ms) -> invariant(~2480ms)
  const layerBaseMs = layerOrder * 3750;
  // Element-by-element cadence inside each layer (capped gently so dense meshes sweep smoothly)
  const stepMs = layerId === 'operator' || layerId === 'invariant' ? 190 : 135;
  const cappedIdx = Math.min(indexInLayer, 7);
  const delayMs = Math.round((layerBaseMs + cappedIdx * stepMs) * pace);

  return { delayMs, durationMs };
}

/**
 * Computes progressive BufferGeometry drawRange vertex count for THREE.Line / THREE.LineSegments
 * so axes, grids, vector shafts, and curves literally draw stroke-by-stroke across the canvas.
 */
export function computeLineDrawRangeCount(
  totalVertices: number,
  drawProgress: number,
  isLineSegments: boolean
): number {
  if (totalVertices <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, drawProgress));
  if (clamped >= 0.999) return totalVertices;
  if (clamped <= 0.002) return 0;

  if (isLineSegments) {
    const totalPairs = Math.floor(totalVertices / 2);
    if (totalPairs <= 0) return 0;
    const activePairs = Math.max(1, Math.min(totalPairs, Math.ceil(totalPairs * clamped)));
    return activePairs * 2;
  }

  return Math.max(2, Math.min(totalVertices, Math.ceil(totalVertices * clamped)));
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

function applyProgressiveLineDrawRange(
  lineObj: THREE.Line,
  drawProgress: number,
  done: boolean
): void {
  const geo = lineObj.geometry;
  if (!geo) return;
  const posAttr = geo.getAttribute('position');
  if (!posAttr) return;
  const totalVertices = geo.index ? geo.index.count : posAttr.count;
  if (totalVertices <= 2) return;

  if (done) {
    geo.setDrawRange(0, Infinity);
    return;
  }

  const isSegments = Boolean((lineObj as THREE.LineSegments).isLineSegments);
  const count = computeLineDrawRangeCount(totalVertices, drawProgress, isSegments);
  geo.setDrawRange(0, count);
}

/**
 * Orchestrates structured, procedural, stroke-by-stroke 3D construction for every object
 * (lines, wireframes, surfaces, vectors, sprites, and dynamically revealed elements).
 * - Lines & LineSegments draw progressively vertex-by-vertex / segment-by-segment.
 * - Meshes unfold smoothly with a moving wax-crayon frontier and organic dry-tooth fade.
 * - Emits `onStrokeStart` milestones as each element begins sketching for synced crayon audio.
 */
export class Object3DSketchAnimator {
  private registry: FirstDrawRegistry;
  private activeTracks = new Map<string, TrackedObjectEntry>();

  constructor(registry: FirstDrawRegistry = globalFirstDrawRegistry) {
    this.registry = registry;
  }

  public updateObjectTree(
    sceneKey: string,
    root: THREE.Object3D,
    nowMs: number,
    options?: {
      durationMs?: number;
      reducedMotion?: boolean;
      staggerByLayer?: boolean;
      ecoMode?: boolean;
      onStrokeStart?: (event: ConstructionStrokeEvent) => void;
    }
  ): boolean {
    const durationMs = options?.durationMs ?? 1160;
    const reducedMotion = options?.reducedMotion ?? false;
    const staggerByLayer = options?.staggerByLayer ?? true;
    const ecoMode = options?.ecoMode ?? false;
    const onStrokeStart = options?.onStrokeStart;

    let anyAnimating = false;
    let ordinal = 0;
    const layerCounters = new Map<string, number>();
    let spriteCounter = 0;
    const alreadyHadTracks = this.activeTracks.size > 0;

    root.traverse((obj) => {
      const isMesh = Boolean((obj as THREE.Mesh).isMesh);
      const isLine = Boolean((obj as THREE.Line).isLine);
      const isSprite = Boolean((obj as THREE.Sprite).isSprite);

      if (!isMesh && !isLine && !isSprite) return;
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
          let idxInLayer = 0;
          if (isSprite) {
            idxInLayer = spriteCounter++;
          } else {
            idxInLayer = layerCounters.get(layerId) ?? 0;
            layerCounters.set(layerId, idxInLayer + 1);
          }

          const timing = computeProceduralStrokeTiming({
            layerId,
            indexInLayer: idxInLayer,
            isSprite,
            isLine,
            baseDurationMs: durationMs,
            staggerByLayer,
            isDynamicReveal: alreadyHadTracks,
            ecoMode,
          });

          track = {
            key,
            layerId,
            isLine,
            isSprite,
            startTimeMs: nowMs,
            durationMs: timing.durationMs,
            delayMs: timing.delayMs,
            started: false,
            done: false,
          };
          this.activeTracks.set(key, track);
        } else {
          track = {
            key,
            layerId,
            isLine,
            isSprite,
            startTimeMs: nowMs - durationMs,
            durationMs,
            delayMs: 0,
            started: true,
            done: true,
          };
          this.activeTracks.set(key, track);
        }
      }

      if (track.done) {
        obj.userData._sketchOpacity = 1;
        obj.userData._sketchScale = 1;
        obj.userData._sketchDraw = 1;
        if (isLine) {
          applyProgressiveLineDrawRange(obj as THREE.Line, 1, true);
        }
        return;
      }

      const elapsedMs = nowMs - track.startTimeMs;
      if (!track.started && elapsedMs >= track.delayMs) {
        track.started = true;
        onStrokeStart?.({
          layerId: track.layerId,
          isLine: track.isLine,
          isSprite: track.isSprite,
        });
      }

      const state = computeSketchEntranceTransform(
        elapsedMs,
        track.durationMs,
        track.delayMs
      );
      obj.userData._sketchOpacity = state.opacity;
      obj.userData._sketchScale = isLine ? 1 : state.scale;
      obj.userData._sketchDraw = state.drawProgress;

      if (isLine) {
        applyProgressiveLineDrawRange(
          obj as THREE.Line,
          state.opacity <= 0.005 ? 0 : state.drawProgress,
          state.done
        );
      }

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

  /**
   * Resets a scene's tracked strokes and FirstDrawRegistry claims so the full
   * stroke-by-stroke procedural construction can replay cleanly (e.g. when entering a Theory Intro).
   */
  public replayScene(sceneKey: string, root?: THREE.Object3D): void {
    const prefix = `obj3d:${sceneKey}:`;
    this.registry.clearPrefix(prefix);
    this.resetTrackedScene(sceneKey);
    if (root) {
      root.traverse((obj) => {
        if (typeof obj.userData._sketchKey === 'string') {
          delete obj.userData._sketchOpacity;
          delete obj.userData._sketchScale;
          delete obj.userData._sketchDraw;
        }
      });
    }
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
