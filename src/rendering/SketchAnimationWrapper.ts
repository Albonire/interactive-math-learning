import * as THREE from 'three';
import {
  FirstDrawRegistry,
  getAnatomyLayerDrawOrder,
  globalFirstDrawRegistry,
} from '../core/firstDrawRegistry';
import type { CrayonToken } from '../core/types';

export interface SketchEntranceState {
  progress: number;
  opacity: number;
  scale: number;
  drawProgress: number;
  contourPhase: number;
  fillPhase: number;
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
  strokeIndex?: number;
}

export interface SegmentedLineTipResult {
  drawVertexCount: number;
  tipLocalPos: [number, number, number] | null;
  activeSegmentIndex: number;
  totalSegments: number;
  segmentFraction: number;
}

export interface ActiveStrokeTipInfo {
  active: boolean;
  worldPos: [number, number, number];
  layerId: string;
  crayon: CrayonToken;
  isLine: boolean;
  progress: number;
}

interface TrackedObjectEntry {
  key: string;
  layerId: string;
  isLine: boolean;
  isSprite: boolean;
  crayon: CrayonToken;
  startTimeMs: number;
  durationMs: number;
  delayMs: number;
  started: boolean;
  done: boolean;
  lastSubStrokeIndex: number;
}

/**
 * Splits a mesh's normalized drawProgress [0..1] into two tactile drawing phases:
 * - contourPhase: perimeter / silhouette ink outline draws first (0.00 -> 0.44)
 * - fillPhase:    directional diagonal wax crayon fill sweeps across the interior (0.30 -> 1.00)
 */
export function computeContourFillPhases(drawProgress: number): {
  contourPhase: number;
  fillPhase: number;
} {
  const p = Math.max(0, Math.min(1, drawProgress));
  const contourRaw = Math.min(1, p / 0.44);
  const contourPhase = 1 - Math.pow(1 - contourRaw, 2);

  const fillRaw = p <= 0.28 ? 0 : Math.min(1, (p - 0.28) / 0.72);
  const fillPhase =
    fillRaw < 0.5
      ? 2 * fillRaw * fillRaw
      : 1 - Math.pow(-2 * fillRaw + 2, 2) / 2;

  return { contourPhase, fillPhase };
}

/**
 * Pure easing calculation for a 3D object's procedural stroke-by-stroke entrance:
 * - Opacity rises smoothly so no mesh or line ever pops in harshly.
 * - Scale settles organically from 0.72 -> 1.0 (lines draw via continuous vertex interpolation).
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
      contourPhase: 0,
      fillPhase: 0,
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
      contourPhase: 1,
      fillPhase: 1,
      done: true,
    };
  }

  // Smooth ease-in-out cubic for draw sweep (procedural real-time hand speed)
  const easeDraw =
    raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
  // Calm ease-out cubic for scale settling & gentle ease-out quad for opacity
  const easeScale = 1 - Math.pow(1 - raw, 3);
  const easeOpacity = Math.min(1, 1 - Math.pow(1 - Math.min(1, raw * 1.45), 2));
  const drawProgress = Math.max(0.03, easeDraw);
  const { contourPhase, fillPhase } = computeContourFillPhases(drawProgress);

  return {
    progress: raw,
    opacity: easeOpacity,
    scale: 0.72 + 0.28 * easeScale,
    drawProgress,
    contourPhase,
    fillPhase,
    done: false,
  };
}

/**
 * Computes structured, unhurried procedural stroke timings so 3D scenes construct
 * layer by layer AND stroke by stroke with zero awkward multi-second stalls:
 * 1. Substrate (grid & axes) sketches first (~0ms)
 * 2. Structure (volumes, surfaces, manifolds) traces contours then fills (~760ms)
 * 3. Operators (vectors, slice curves, probes) draw sequentially (~1520ms)
 * 4. Invariants / error sheets complete the geometry (~2120ms)
 * 5. Hand-lettered 3D labels appear last like an illustrator signing the diagram (~2620ms)
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

  const durationScale = isSprite ? 0.56 : isLine ? 1.12 : 1.18;
  const durationMs = Math.max(240, Math.round(baseDurationMs * durationScale));

  if (!staggerByLayer || (isDynamicReveal && layerId === 'error')) {
    return { delayMs: 0, durationMs };
  }

  const pace = ecoMode ? 0.6 : 1.0;

  if (isSprite) {
    // Labels are written last in sequence after the main geometry has taken shape
    const cappedIdx = Math.min(indexInLayer, 7);
    const delayMs = Math.round((2560 + cappedIdx * 145) * pace);
    return { delayMs, durationMs };
  }

  const layerOrder = getAnatomyLayerDrawOrder(layerId);
  // Layer stage start times: substrate(0ms) -> structure(~768ms) -> operator(~1536ms) -> invariant(~2112ms)
  const layerBaseMs = layerOrder * 3200;
  // Element-by-element cadence inside each layer so individual strokes read clearly
  const stepMs = layerId === 'operator' || layerId === 'invariant' ? 175 : 130;
  const cappedIdx = Math.min(indexInLayer, 8);
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

/**
 * Computes the exact sub-segment progress and interpolated tip coordinate P(t)
 * for a polyline (THREE.Line) or multi-stroke LineSegments buffer.
 * Eliminates blunt vertex-pair popping by sliding the active end-vertex continuously.
 */
export function computeSegmentedStrokeTip(
  basePositions: ArrayLike<number>,
  drawProgress: number,
  isLineSegments: boolean
): SegmentedLineTipResult {
  const totalVertices = Math.floor(basePositions.length / 3);
  if (totalVertices < 2) {
    return {
      drawVertexCount: totalVertices,
      tipLocalPos: null,
      activeSegmentIndex: 0,
      totalSegments: 0,
      segmentFraction: 0,
    };
  }

  const clamped = Math.max(0, Math.min(1, drawProgress));
  const totalSegments = isLineSegments
    ? Math.floor(totalVertices / 2)
    : totalVertices - 1;

  if (totalSegments <= 0) {
    return {
      drawVertexCount: 0,
      tipLocalPos: null,
      activeSegmentIndex: 0,
      totalSegments: 0,
      segmentFraction: 0,
    };
  }

  if (clamped <= 0.002) {
    return {
      drawVertexCount: 0,
      tipLocalPos: [basePositions[0], basePositions[1], basePositions[2]],
      activeSegmentIndex: 0,
      totalSegments,
      segmentFraction: 0,
    };
  }

  if (clamped >= 0.999) {
    const lastIdx = (totalVertices - 1) * 3;
    return {
      drawVertexCount: totalVertices,
      tipLocalPos: [
        basePositions[lastIdx],
        basePositions[lastIdx + 1],
        basePositions[lastIdx + 2],
      ],
      activeSegmentIndex: totalSegments - 1,
      totalSegments,
      segmentFraction: 1,
    };
  }

  const scaled = clamped * totalSegments;
  const activeSegmentIndex = Math.min(totalSegments - 1, Math.floor(scaled));
  const segmentFraction = Math.max(0.02, Math.min(1, scaled - activeSegmentIndex));

  const startVertIdx = isLineSegments ? activeSegmentIndex * 2 : activeSegmentIndex;
  const endVertIdx = startVertIdx + 1;
  const s3 = startVertIdx * 3;
  const e3 = endVertIdx * 3;

  const ax = basePositions[s3];
  const ay = basePositions[s3 + 1];
  const az = basePositions[s3 + 2];
  const bx = basePositions[e3];
  const by = basePositions[e3 + 1];
  const bz = basePositions[e3 + 2];

  const tx = ax + (bx - ax) * segmentFraction;
  const ty = ay + (by - ay) * segmentFraction;
  const tz = az + (bz - az) * segmentFraction;

  const drawVertexCount = isLineSegments
    ? (activeSegmentIndex + 1) * 2
    : activeSegmentIndex + 2;

  return {
    drawVertexCount: Math.min(totalVertices, drawVertexCount),
    tipLocalPos: [tx, ty, tz],
    activeSegmentIndex,
    totalSegments,
    segmentFraction,
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

function resolveObjectCrayon(obj: THREE.Object3D): CrayonToken {
  const mesh = obj as THREE.Mesh;
  const mat = mesh.material as THREE.Material | undefined;
  const tok = mat?.userData?.crayonToken as CrayonToken | undefined;
  if (tok) return tok;
  const layerId = findEnclosingLayerId(obj);
  if (layerId === 'substrate') return 'graphite';
  if (layerId === 'structure') return 'cobalt';
  if (layerId === 'operator') return 'vermilion';
  if (layerId === 'error') return 'vermilion';
  return 'ochre';
}

function restoreLineBasePositions(lineObj: THREE.Line): void {
  const geo = lineObj.geometry;
  if (!geo) return;
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  const base = geo.userData._sketchBasePositions as Float32Array | undefined;
  const patchedIdx = geo.userData._sketchPatchedVertIdx as number | undefined;
  if (posAttr && base && typeof patchedIdx === 'number' && patchedIdx >= 0) {
    const arr = posAttr.array as Float32Array;
    if (arr.length === base.length) {
      const i3 = patchedIdx * 3;
      arr[i3] = base[i3];
      arr[i3 + 1] = base[i3 + 1];
      arr[i3 + 2] = base[i3 + 2];
      posAttr.needsUpdate = true;
    }
    geo.userData._sketchPatchedVertIdx = -1;
  }
}

function applySegmentedLineStroke(
  lineObj: THREE.Line,
  drawProgress: number,
  done: boolean
): SegmentedLineTipResult | null {
  const geo = lineObj.geometry;
  if (!geo) return null;
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!posAttr) return null;
  const totalVertices = geo.index ? geo.index.count : posAttr.count;
  if (totalVertices < 2) return null;

  if (done) {
    restoreLineBasePositions(lineObj);
    geo.setDrawRange(0, Infinity);
    // Clear cached snapshot after completion so live parameter drags mutate geometry freely
    delete geo.userData._sketchBasePositions;
    delete geo.userData._sketchPatchedVertIdx;
    return null;
  }

  // Indexed geometries fall back cleanly to drawRange without mutating shared vertex positions
  if (geo.index) {
    const isSegments = Boolean((lineObj as THREE.LineSegments).isLineSegments);
    const count = computeLineDrawRangeCount(totalVertices, drawProgress, isSegments);
    geo.setDrawRange(0, count);
    return null;
  }

  const arr = posAttr.array as Float32Array;
  let base = geo.userData._sketchBasePositions as Float32Array | undefined;
  if (!base || base.length !== arr.length) {
    base = new Float32Array(arr);
    geo.userData._sketchBasePositions = base;
    geo.userData._sketchPatchedVertIdx = -1;
  } else {
    // Restore previous patched tip vertex before applying next sub-segment interpolation
    restoreLineBasePositions(lineObj);
  }

  const isSegments = Boolean((lineObj as THREE.LineSegments).isLineSegments);
  const seg = computeSegmentedStrokeTip(base, drawProgress, isSegments);
  geo.setDrawRange(0, seg.drawVertexCount);

  if (seg.drawVertexCount >= 2 && seg.tipLocalPos && drawProgress < 0.999) {
    const tipVertIdx = seg.drawVertexCount - 1;
    const i3 = tipVertIdx * 3;
    arr[i3] = seg.tipLocalPos[0];
    arr[i3 + 1] = seg.tipLocalPos[1];
    arr[i3 + 2] = seg.tipLocalPos[2];
    posAttr.needsUpdate = true;
    geo.userData._sketchPatchedVertIdx = tipVertIdx;
  }

  return seg;
}

/**
 * Orchestrates structured, segmented, trace-by-trace 3D construction for every object:
 * - Lines & LineSegments draw smoothly sub-stroke by sub-stroke with continuous tip interpolation.
 * - Meshes trace organic contours first, then sweep directional wax fill across their surface.
 * - Supports pause/resume (frozen intro synchronization), snap completion, and single-layer retrace.
 * - Tracks the active stroke world-space tip P(t) for the moving 3D crayon nib marker.
 */
export class Object3DSketchAnimator {
  private registry: FirstDrawRegistry;
  private activeTracks = new Map<string, TrackedObjectEntry>();
  private paused = false;
  private pausedAtMs = 0;
  private latestTip: ActiveStrokeTipInfo | null = null;
  private readonly _tmpVec = new THREE.Vector3();

  constructor(registry: FirstDrawRegistry = globalFirstDrawRegistry) {
    this.registry = registry;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public setPaused(paused: boolean, nowMs: number): void {
    if (this.paused === paused) return;
    if (paused) {
      this.paused = true;
      this.pausedAtMs = nowMs;
    } else {
      const deltaMs = Math.max(0, nowMs - this.pausedAtMs);
      for (const track of this.activeTracks.values()) {
        if (!track.done) {
          track.startTimeMs += deltaMs;
        }
      }
      this.paused = false;
      this.pausedAtMs = 0;
    }
  }

  public getActiveStrokeTip(): ActiveStrokeTipInfo | null {
    return this.latestTip;
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

    const effectiveNowMs = this.paused ? this.pausedAtMs : nowMs;
    let anyAnimating = false;
    let ordinal = 0;
    const layerCounters = new Map<string, number>();
    let spriteCounter = 0;
    const alreadyHadTracks = this.activeTracks.size > 0;

    let bestTip: ActiveStrokeTipInfo | null = null;
    let bestTipPriority = -1;

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
        const crayon = resolveObjectCrayon(obj);
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
            crayon,
            startTimeMs: effectiveNowMs,
            durationMs: timing.durationMs,
            delayMs: timing.delayMs,
            started: false,
            done: false,
            lastSubStrokeIndex: 0,
          };
          this.activeTracks.set(key, track);
        } else {
          track = {
            key,
            layerId,
            isLine,
            isSprite,
            crayon,
            startTimeMs: effectiveNowMs - durationMs,
            durationMs,
            delayMs: 0,
            started: true,
            done: true,
            lastSubStrokeIndex: 0,
          };
          this.activeTracks.set(key, track);
        }
      }

      if (track.done) {
        obj.userData._sketchOpacity = 1;
        obj.userData._sketchScale = 1;
        obj.userData._sketchDraw = 1;
        obj.userData._sketchContour = 1;
        obj.userData._sketchFill = 1;
        if (isLine) {
          applySegmentedLineStroke(obj as THREE.Line, 1, true);
        }
        return;
      }

      const elapsedMs = effectiveNowMs - track.startTimeMs;
      if (!track.started && elapsedMs >= track.delayMs) {
        track.started = true;
        onStrokeStart?.({
          layerId: track.layerId,
          isLine: track.isLine,
          isSprite: track.isSprite,
          strokeIndex: 0,
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
      obj.userData._sketchContour = state.contourPhase;
      obj.userData._sketchFill = state.fillPhase;

      let lineSeg: SegmentedLineTipResult | null = null;
      if (isLine) {
        lineSeg = applySegmentedLineStroke(
          obj as THREE.Line,
          state.opacity <= 0.005 ? 0 : state.drawProgress,
          state.done
        );
        // Emit subtle sub-stroke audio pulse on distinct segmented strokes (e.g. grid/axis passes)
        if (
          lineSeg &&
          lineSeg.totalSegments > 1 &&
          track.started &&
          !state.done &&
          lineSeg.activeSegmentIndex > track.lastSubStrokeIndex &&
          lineSeg.activeSegmentIndex % Math.max(2, Math.floor(lineSeg.totalSegments / 4)) === 0
        ) {
          track.lastSubStrokeIndex = lineSeg.activeSegmentIndex;
          onStrokeStart?.({
            layerId: track.layerId,
            isLine: true,
            isSprite: false,
            strokeIndex: lineSeg.activeSegmentIndex,
          });
        }
      }

      // Compute active crayon nib anchor for the highest-priority currently sketching stroke
      if (!state.done && state.progress > 0.01 && !track.isSprite) {
        const layerPriority = Math.round(getAnatomyLayerDrawOrder(track.layerId) * 100);
        const priority = layerPriority + (track.isLine ? 35 : 15) + state.progress * 10;
        if (priority >= bestTipPriority) {
          let tipReady = false;
          if (lineSeg?.tipLocalPos) {
            this._tmpVec.set(
              lineSeg.tipLocalPos[0],
              lineSeg.tipLocalPos[1],
              lineSeg.tipLocalPos[2]
            );
            obj.localToWorld(this._tmpVec);
            tipReady = true;
          } else if (isMesh) {
            const mesh = obj as THREE.Mesh;
            if (!mesh.geometry.boundingBox) {
              mesh.geometry.computeBoundingBox();
            }
            const bb = mesh.geometry.boundingBox;
            if (bb) {
              const t = state.drawProgress;
              this._tmpVec.set(
                bb.min.x + (bb.max.x - bb.min.x) * t,
                bb.min.y + (bb.max.y - bb.min.y) * (0.25 + 0.55 * t),
                bb.min.z + (bb.max.z - bb.min.z) * (0.2 + 0.65 * t)
              );
              obj.localToWorld(this._tmpVec);
              tipReady = true;
            }
          }
          if (tipReady) {
            bestTipPriority = priority;
            bestTip = {
              active: true,
              worldPos: [this._tmpVec.x, this._tmpVec.y, this._tmpVec.z],
              layerId: track.layerId,
              crayon: track.crayon,
              isLine: track.isLine,
              progress: state.drawProgress,
            };
          }
        }
      }

      if (state.done) {
        track.done = true;
      } else {
        anyAnimating = true;
      }
    });

    this.latestTip = anyAnimating ? bestTip : null;
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
   * Immediately settles all strokes in a scene (used when skipping intro or advancing to Beat 3/4).
   */
  public completeScene(sceneKey: string, root: THREE.Object3D): void {
    const prefix = `obj3d:${sceneKey}:`;
    for (const [k, track] of this.activeTracks.entries()) {
      if (k.startsWith(prefix)) {
        track.done = true;
        track.started = true;
      }
    }
    root.traverse((obj) => {
      if (typeof obj.userData._sketchKey === 'string') {
        this.registry.markDrawn(obj.userData._sketchKey);
        obj.userData._sketchOpacity = 1;
        obj.userData._sketchScale = 1;
        obj.userData._sketchDraw = 1;
        obj.userData._sketchContour = 1;
        obj.userData._sketchFill = 1;
        if ((obj as THREE.Line).isLine) {
          applySegmentedLineStroke(obj as THREE.Line, 1, true);
        }
      }
    });
    this.latestTip = null;
  }

  /**
   * Re-traces only the strokes belonging to a specific anatomy layer (e.g. Beat 2 spotlight)
   * without disturbing already-drawn surrounding layers.
   */
  public replayLayer(sceneKey: string, root: THREE.Object3D, layerId: string): void {
    const prefix = `obj3d:${sceneKey}:${layerId}:`;
    this.registry.clearPrefix(prefix);
    for (const k of Array.from(this.activeTracks.keys())) {
      if (k.startsWith(prefix)) {
        this.activeTracks.delete(k);
      }
    }
    root.traverse((obj) => {
      const k = obj.userData._sketchKey;
      if (typeof k === 'string' && k.startsWith(prefix)) {
        if ((obj as THREE.Line).isLine) {
          restoreLineBasePositions(obj as THREE.Line);
        }
        delete obj.userData._sketchOpacity;
        delete obj.userData._sketchScale;
        delete obj.userData._sketchDraw;
        delete obj.userData._sketchContour;
        delete obj.userData._sketchFill;
      }
    });
  }

  /**
   * Resets a scene's tracked strokes and FirstDrawRegistry claims so the full
   * stroke-by-stroke procedural construction can replay cleanly (e.g. when entering a Theory Intro).
   */
  public replayScene(sceneKey: string, root?: THREE.Object3D): void {
    const prefix = `obj3d:${sceneKey}:`;
    this.registry.clearPrefix(prefix);
    this.resetTrackedScene(sceneKey);
    this.latestTip = null;
    if (root) {
      root.traverse((obj) => {
        if (typeof obj.userData._sketchKey === 'string') {
          if ((obj as THREE.Line).isLine) {
            restoreLineBasePositions(obj as THREE.Line);
          }
          delete obj.userData._sketchOpacity;
          delete obj.userData._sketchScale;
          delete obj.userData._sketchDraw;
          delete obj.userData._sketchContour;
          delete obj.userData._sketchFill;
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
