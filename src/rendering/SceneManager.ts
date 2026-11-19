import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getEcoRenderProfile, type EcoRenderProfile } from '../core/ecoMode';
import { globalFirstDrawRegistry } from '../core/firstDrawRegistry';
import { THEME_PALETTES } from '../core/palette';
import type { AnatomyLayerSpec, CrayonToken, SceneId, ThemeMode } from '../core/types';
import { CrayonDustPoints } from './CrayonDustPoints';
import { syncCrayonMaterialsInObject } from './CrayonMaterials';
import { refreshCrayonLabelSpritesInObject } from './PaperGrainGenerator';
import {
  SCENE_ANNOTATIONS,
  type ProjectedAnnotation,
} from './sceneAnnotations';
import { Object3DSketchAnimator } from './SketchAnimationWrapper';
import {
  createEigenScene,
  createManifoldScene,
  createSpanScene,
  createSvdScene,
} from './scenes/linearScenes';
import {
  createAutoDiffScene,
  createOptimizersScene,
  createPartialsScene,
  createSymbolicScene,
} from './scenes/calcScenes';
import type { BibifoldSceneController, SceneUpdatePayload } from './scenes/types';

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function buildSceneController(sceneId: SceneId, theme: ThemeMode): BibifoldSceneController {
  switch (sceneId) {
    case 'lin-span':
      return createSpanScene(theme);
    case 'lin-svd':
      return createSvdScene(theme);
    case 'lin-eigen':
      return createEigenScene(theme);
    case 'lin-manifold':
      return createManifoldScene(theme);
    case 'calc-partials':
      return createPartialsScene(theme);
    case 'calc-autodiff':
      return createAutoDiffScene(theme);
    case 'calc-optimizers':
      return createOptimizersScene(theme);
    case 'calc-symbolic':
      return createSymbolicScene(theme);
  }
}

export interface SceneManagerOptions {
  container: HTMLElement;
  initialTheme: ThemeMode;
  initialEcoMode?: boolean;
  onContextLost: () => void;
  onContextRestored: () => void;
  onAnnotationsProjected?: (items: ProjectedAnnotation[]) => void;
}

export class SceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;

  private activeSceneId: SceneId | null = null;
  private controller: BibifoldSceneController | null = null;
  private theme: ThemeMode;
  private ecoMode: boolean;
  private ecoProfile: EcoRenderProfile;
  private steadyStrokes = false;
  private exploded = false;
  private focusedLayerId: string | null = null;
  private layerSpecs: AnatomyLayerSpec[] = [];

  // First-time 3D hand-sketched draw-on & per-object SketchAnimationWrapper state
  private drawProgress = 1.0;
  private drawAnimating = false;
  private drawStartTime = 0;
  private drawDurationMs = 1350;
  private sketchAnimator = new Object3DSketchAnimator();
  private sketchAnimating = false;

  // Artisanal dry-wax Crayon Dust particle system (single-draw-call THREE.Points)
  private dustPoints: CrayonDustPoints;
  private dustAnimating = false;

  // Non-obtrusive 3D-to-2D anatomy annotations projection (active only when Legend is toggled ON)
  private lastPayload: SceneUpdatePayload | null = null;
  private annotationsEnabled = false;
  private onAnnotationsProjected?: (items: ProjectedAnnotation[]) => void;
  private readonly _projVec = new THREE.Vector3();
  private lastProjEmitMs = 0;
  private projTrailingTimer: number | null = null;

  // Screen-space camera optical offset (e.g. lift 3D diagram cleanly above bottom narration during Intro)
  private viewOffsetXRatio = 0;
  private viewOffsetYRatio = 0;

  private targetCamPos: THREE.Vector3 | null = null;
  private targetCamLook: THREE.Vector3 | null = null;

  private frameId = 0;
  private disposed = false;
  private renderBusy = false;
  private renderDirty = false;
  private lastRenderedCamPos = new THREE.Vector3();
  private lastRenderedCamQuat = new THREE.Quaternion();
  private lastWidth = 0;
  private lastHeight = 0;
  private startTime = performance.now();
  private lastTickTime = performance.now();
  private lastGpuRenderTime = 0;
  private resizeObserver: ResizeObserver;

  private handleContextLost: (e: Event) => void;
  private handleContextRestored: () => void;

  constructor(opts: SceneManagerOptions) {
    this.container = opts.container;
    this.theme = opts.initialTheme;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.ecoMode = opts.initialEcoMode ?? false;
    this.ecoProfile = getEcoRenderProfile(this.ecoMode, this.isSoftwareGl);

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: this.isSoftwareGl,
      powerPreference: this.ecoMode ? 'low-power' : 'high-performance',
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.applyPixelRatio(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.onAnnotationsProjected = opts.onAnnotationsProjected;

    this.scene = new THREE.Scene();
    const bgHex = THEME_PALETTES[this.theme].paperBg;
    // Transparent background lets the textured cotton paper / dusty chalkboard show seamlessly behind 3D crayon meshes
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(bgHex, 0.026);

    this.dustPoints = new CrayonDustPoints(this.theme);
    this.dustPoints.setPixelRatio(this.renderer.getPixelRatio());
    this.scene.add(this.dustPoints.points);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(4.1, 3.1, 4.4);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.maxDistance = 14;
    this.controls.minDistance = 2.0;
    this.controls.maxPolarAngle = Math.PI * 0.85;

    this.controls.addEventListener('start', () => {
      // Never fight manual user camera drag
      this.targetCamPos = null;
      this.targetCamLook = null;
    });
    this.controls.addEventListener('change', () => {
      this.emitProjectedAnnotations(false);
      if (this.isSoftwareGl) this.requestSoftwareRender();
    });
    this.controls.addEventListener('end', () => {
      this.emitProjectedAnnotations(true);
      if (this.isSoftwareGl) this.requestSoftwareRender();
    });

    this.handleContextLost = (e: Event) => {
      e.preventDefault();
      opts.onContextLost();
    };
    this.handleContextRestored = () => {
      opts.onContextRestored();
      this.requestSoftwareRender();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.handleContextRestored);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.updateContainerAttributes();

    // Repaint 3D hand-lettered canvas labels once Caveat Brush finishes loading
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!this.disposed && this.controller) {
          refreshCrayonLabelSpritesInObject(this.controller.root, this.theme, true);
          if (this.isSoftwareGl) this.requestSoftwareRender();
        }
      });
    }

    if (!this.isSoftwareGl) {
      this.startGpuLoop();
    }
  }

  public isSoftwareMode(): boolean {
    return this.isSoftwareGl;
  }

  private applyPixelRatio(width: number, height: number, renderNow: boolean): void {
    const dpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, this.ecoProfile.maxPixelRatio);
    this.renderer.setPixelRatio(dpr);
    this.dustPoints?.setPixelRatio(dpr);
    this.lastWidth = width;
    this.lastHeight = height;
    this.renderer.setSize(width, height, false);
    this.container.dataset.pixelRatio = String(dpr);
    if (renderNow && this.controller) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    );
  }

  private updateContainerAttributes(): void {
    const dustCount = this.dustPoints ? this.dustPoints.activeCount() : 0;
    this.container.dataset.ecoFps = String(this.ecoProfile.targetFps);
    this.container.dataset.drawProgress = this.drawProgress.toFixed(2);
    this.container.dataset.drawComplete =
      this.drawProgress >= 0.999 && !this.sketchAnimating ? 'true' : 'false';
    this.container.dataset.sketchActive = this.sketchAnimating ? 'true' : 'false';
    this.container.dataset.dustActive = dustCount > 0 ? 'true' : 'false';
    this.container.dataset.dustCount = String(dustCount);
    this.container.dataset.viewOffsetY = this.viewOffsetYRatio.toFixed(3);
  }

  /**
   * Applies a clean screen-space optical offset via PerspectiveCamera.setViewOffset
   * without distorting OrbitControls pivot or camera perspective.
   * Positive yRatio lifts the 3D diagram upward; negative xRatio shifts it right.
   */
  public setViewportOffset(xRatio: number, yRatio: number): void {
    if (this.disposed) return;
    if (
      Math.abs(this.viewOffsetXRatio - xRatio) < 1e-4 &&
      Math.abs(this.viewOffsetYRatio - yRatio) < 1e-4
    ) {
      return;
    }
    this.viewOffsetXRatio = xRatio;
    this.viewOffsetYRatio = yRatio;
    this.applyCameraViewOffset();
    this.updateContainerAttributes();
    this.emitProjectedAnnotations(true);
    if (this.isSoftwareGl) {
      this.requestSoftwareRender();
    }
  }

  private applyCameraViewOffset(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const effectiveX = width >= 1024 ? this.viewOffsetXRatio : 0;
    if (Math.abs(effectiveX) < 1e-4 && Math.abs(this.viewOffsetYRatio) < 1e-4) {
      this.camera.clearViewOffset();
    } else {
      const ox = Math.round(width * effectiveX);
      const oy = Math.round(height * this.viewOffsetYRatio);
      this.camera.setViewOffset(width, height, ox, oy, width, height);
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  public emitCrayonDust(
    crayon: CrayonToken,
    intensity: number,
    origin: [number, number, number]
  ): void {
    if (this.disposed || this.prefersReducedMotion()) return;
    const emitted = this.dustPoints.emit(origin, crayon, intensity, this.ecoMode);
    if (emitted > 0) {
      this.dustAnimating = true;
      this.updateContainerAttributes();
      if (this.isSoftwareGl) {
        this.requestSoftwareRender();
      }
    }
  }

  public setAnnotationsEnabled(enabled: boolean): void {
    this.annotationsEnabled = enabled;
    if (!enabled) {
      if (this.projTrailingTimer !== null) {
        window.clearTimeout(this.projTrailingTimer);
        this.projTrailingTimer = null;
      }
      this.onAnnotationsProjected?.([]);
    } else {
      this.emitProjectedAnnotations(true);
    }
  }

  private emitProjectedAnnotations(force: boolean): void {
    if (
      this.disposed ||
      !this.annotationsEnabled ||
      !this.onAnnotationsProjected ||
      !this.controller ||
      !this.lastPayload
    ) {
      return;
    }
    const now = performance.now();
    if (!force && now - this.lastProjEmitMs < 33) {
      // Schedule trailing sync so arrows never stop slightly behind the final camera pose
      if (this.projTrailingTimer === null) {
        this.projTrailingTimer = window.setTimeout(() => {
          this.projTrailingTimer = null;
          this.emitProjectedAnnotations(true);
        }, 42);
      }
      return;
    }
    if (this.projTrailingTimer !== null) {
      window.clearTimeout(this.projTrailingTimer);
      this.projTrailingTimer = null;
    }
    this.lastProjEmitMs = now;

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const specs = SCENE_ANNOTATIONS[this.lastPayload.sceneId] ?? [];

    this.camera.updateMatrixWorld();

    const projected: ProjectedAnnotation[] = specs.map((spec) => {
      const layerGrp = this.controller?.layers[spec.layerId];
      const layerVisible = layerGrp ? layerGrp.visible : true;
      const specVisible = spec.isVisible ? spec.isVisible(this.lastPayload!) : true;
      const layerOffsetY = layerGrp ? layerGrp.position.y : 0;

      const [wx, wy, wz] = spec.getWorldAnchor(this.lastPayload!);
      this._projVec.set(wx, wy + layerOffsetY, wz).project(this.camera);

      const inFront = this._projVec.z >= -1 && this._projVec.z <= 1;
      const anchorX = (this._projVec.x * 0.5 + 0.5) * width;
      const anchorY = (-this._projVec.y * 0.5 + 0.5) * height;

      return {
        id: spec.id,
        label: spec.label,
        note: spec.note,
        layerId: spec.layerId,
        crayon: spec.crayon,
        linkedParamIds: spec.linkedParamIds,
        anchorX,
        anchorY,
        visible: layerVisible && specVisible && inFront,
      };
    });

    this.onAnnotationsProjected(projected);
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    if (width === this.lastWidth && height === this.lastHeight) return;
    this.applyCameraViewOffset();
    this.applyPixelRatio(width, height, true);
    this.emitProjectedAnnotations(true);
  }

  public syncState(
    payload: SceneUpdatePayload,
    layers: AnatomyLayerSpec[],
    exploded: boolean,
    steadyStrokes: boolean,
    focusedLayerId: string | null,
    ecoMode = false
  ): void {
    if (this.disposed) return;

    this.theme = payload.theme;
    this.lastPayload = payload;
    this.steadyStrokes = steadyStrokes;
    this.exploded = exploded;
    this.focusedLayerId = focusedLayerId;
    this.layerSpecs = layers;
    this.dustPoints.setTheme(this.theme);

    if (this.ecoMode !== ecoMode) {
      this.ecoMode = ecoMode;
      this.ecoProfile = getEcoRenderProfile(ecoMode, this.isSoftwareGl);
      const width = Math.max(1, this.container.clientWidth);
      const height = Math.max(1, this.container.clientHeight);
      this.applyPixelRatio(width, height, true);
    }

    const bgHex = THEME_PALETTES[this.theme].paperBg;
    this.scene.background = null;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.set(bgHex);
    }

    if (this.activeSceneId !== payload.sceneId) {
      if (this.controller) {
        this.scene.remove(this.controller.root);
        this.controller.dispose();
      }
      this.dustPoints.clear();
      this.dustAnimating = false;
      this.activeSceneId = payload.sceneId;
      this.controller = buildSceneController(payload.sceneId, this.theme);
      this.scene.add(this.controller.root);

      // First time this 3D figure/graph is seen in the session -> animate drawing it in wax crayon!
      const shouldDrawFirst = globalFirstDrawRegistry.claimFirstDraw(`scene:${payload.sceneId}`);
      const prefersReduced = this.prefersReducedMotion();

      if (shouldDrawFirst && !prefersReduced) {
        this.drawProgress = 0.04;
        this.drawAnimating = true;
        this.drawStartTime = performance.now();
        this.drawDurationMs = this.isSoftwareGl ? 760 : this.ecoMode ? 1150 : 1380;
      } else {
        this.drawProgress = 1.0;
        this.drawAnimating = false;
      }

      this.targetCamPos = this.controller.cameraPos.clone();
      this.targetCamLook = this.controller.cameraTarget.clone();
      if (this.isSoftwareGl) {
        this.camera.position.copy(this.controller.cameraPos);
        this.controls.target.copy(this.controller.cameraTarget);
        this.controls.update();
        this.targetCamPos = null;
        this.targetCamLook = null;
      }
    }

    if (this.controller && this.activeSceneId) {
      this.controller.update(payload);
      // Apply visibility immediately
      for (const spec of this.layerSpecs) {
        const grp = this.controller.layers[spec.id];
        if (grp) {
          grp.visible = spec.visible;
          if (this.isSoftwareGl || this.steadyStrokes) {
            grp.position.y = this.exploded ? spec.explodeOffsetY : 0;
          }
        }
      }

      const now = performance.now();
      this.sketchAnimating = this.sketchAnimator.updateObjectTree(
        this.activeSceneId,
        this.controller.root,
        now,
        {
          durationMs: this.isSoftwareGl ? 640 : this.ecoMode ? 900 : 1080,
          reducedMotion: this.prefersReducedMotion(),
          staggerByLayer: true,
        }
      );

      syncCrayonMaterialsInObject(
        this.controller.root,
        this.theme,
        (now - this.startTime) / 1000,
        this.steadyStrokes,
        this.focusedLayerId,
        this.drawProgress,
        this.ecoProfile.boilFps
      );
      refreshCrayonLabelSpritesInObject(this.controller.root, this.theme, false);
    }

    this.updateContainerAttributes();
    this.emitProjectedAnnotations(true);

    if (this.isSoftwareGl) {
      this.requestSoftwareRender();
    }
  }

  public resetCamera(): void {
    if (!this.controller) return;
    if (this.isSoftwareGl || this.steadyStrokes) {
      this.camera.position.copy(this.controller.cameraPos);
      this.controls.target.copy(this.controller.cameraTarget);
      this.controls.update();
      this.emitProjectedAnnotations(true);
      if (this.isSoftwareGl) this.requestSoftwareRender();
    } else {
      this.targetCamPos = this.controller.cameraPos.clone();
      this.targetCamLook = this.controller.cameraTarget.clone();
    }
  }

  private advanceFirstDraw(now: number): boolean {
    if (!this.drawAnimating) return false;
    const raw = Math.min(1, (now - this.drawStartTime) / Math.max(1, this.drawDurationMs));
    // Gentle ease-out cubic so the crayon begins eagerly and feathers cleanly at completion
    const eased = 1 - Math.pow(1 - raw, 2.4);
    this.drawProgress = raw >= 1 ? 1.0 : Math.max(0.04, eased);
    if (raw >= 1) {
      this.drawAnimating = false;
      this.drawProgress = 1.0;
    }
    this.updateContainerAttributes();
    return this.drawAnimating;
  }

  private stepAnimations(dt: number, now: number): boolean {
    let stillMoving = this.advanceFirstDraw(now);

    if (this.controller && this.activeSceneId) {
      const prevSketchAnimating = this.sketchAnimating;
      this.sketchAnimating = this.sketchAnimator.updateObjectTree(
        this.activeSceneId,
        this.controller.root,
        now,
        {
          durationMs: this.isSoftwareGl ? 640 : this.ecoMode ? 900 : 1080,
          reducedMotion: this.prefersReducedMotion(),
          staggerByLayer: true,
        }
      );
      if (this.sketchAnimating) {
        stillMoving = true;
      }
      if (prevSketchAnimating !== this.sketchAnimating) {
        this.updateContainerAttributes();
      }

      const elapsedSec = (now - this.startTime) / 1000;
      syncCrayonMaterialsInObject(
        this.controller.root,
        this.theme,
        elapsedSec,
        this.steadyStrokes,
        this.focusedLayerId,
        this.drawProgress,
        this.ecoProfile.boilFps
      );

      // Smooth damped vertical exploded-view layer separation
      for (const spec of this.layerSpecs) {
        const grp = this.controller.layers[spec.id];
        if (!grp) continue;
        const targetY = this.exploded ? spec.explodeOffsetY : 0;
        if (Math.abs(grp.position.y - targetY) > 0.002) {
          grp.position.y = THREE.MathUtils.damp(grp.position.y, targetY, 8.5, dt);
          stillMoving = true;
        } else {
          grp.position.y = targetY;
        }
      }
    }

    if (this.targetCamPos && this.targetCamLook) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.targetCamPos.x, 7, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.targetCamPos.y, 7, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.targetCamPos.z, 7, dt);

      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.targetCamLook.x, 7, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.targetCamLook.y, 7, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.targetCamLook.z, 7, dt);

      if (
        this.camera.position.distanceTo(this.targetCamPos) < 0.02 &&
        this.controls.target.distanceTo(this.targetCamLook) < 0.02
      ) {
        this.camera.position.copy(this.targetCamPos);
        this.controls.target.copy(this.targetCamLook);
        this.targetCamPos = null;
        this.targetCamLook = null;
      } else {
        stillMoving = true;
      }
    }

    const prevDustAnimating = this.dustAnimating;
    this.dustAnimating = this.dustPoints.step(dt);
    if (this.dustAnimating) {
      stillMoving = true;
    }
    if (prevDustAnimating !== this.dustAnimating || this.dustAnimating) {
      this.updateContainerAttributes();
    }

    let projectionNeedsUpdate = false;
    if (this.controller && this.activeSceneId) {
      // Check if layer positions moved during damped explode transition
      for (const spec of this.layerSpecs) {
        const grp = this.controller.layers[spec.id];
        if (!grp) continue;
        const targetY = this.exploded ? spec.explodeOffsetY : 0;
        if (Math.abs(grp.position.y - targetY) > 0.002) {
          projectionNeedsUpdate = true;
          break;
        }
      }
    }
    if (this.targetCamPos && this.targetCamLook) {
      projectionNeedsUpdate = true;
    }

    this.controls.update();
    if (projectionNeedsUpdate && this.annotationsEnabled) {
      this.emitProjectedAnnotations(false);
    }
    return stillMoving;
  }

  private startGpuLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();

      // Eco Mode reduces WebGL render frequency to 24 FPS (~41.7ms interval) for mobile battery savings
      const minInterval = this.ecoProfile.minFrameIntervalMs;
      if (minInterval > 0 && now - this.lastGpuRenderTime < minInterval) {
        this.frameId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.08, (now - this.lastTickTime) / 1000);
      this.lastTickTime = now;
      this.lastGpuRenderTime = now;

      this.stepAnimations(dt, now);
      this.renderer.render(this.scene, this.camera);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterSoftwareDraw(cb: () => void, cooldownOverrideMs?: number): void {
    const cooldown = cooldownOverrideMs ?? this.ecoProfile.softwareCooldownMs;
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (this.disposed) return;
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            this.frameId = window.setTimeout(cb, cooldown);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
        return;
      }
    } catch {
      // Fallback
    }
    this.frameId = window.setTimeout(cb, cooldown + 15);
  }

  private requestSoftwareRender(): void {
    if (this.disposed) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      const now = performance.now();
      const keepAnimating = this.stepAnimations(0.03, now);
      this.camera.updateMatrixWorld();
      this.lastRenderedCamPos.copy(this.camera.position);
      this.lastRenderedCamQuat.copy(this.camera.quaternion);
      this.renderer.render(this.scene, this.camera);
      if (this.annotationsEnabled) {
        this.emitProjectedAnnotations(true);
      }
      this.afterSoftwareDraw(
        () => {
          this.renderBusy = false;
          const camMoved =
            this.lastRenderedCamPos.distanceToSquared(this.camera.position) > 1e-6 ||
            1 - Math.abs(this.lastRenderedCamQuat.dot(this.camera.quaternion)) > 1e-6;
          if (
            this.renderDirty ||
            camMoved ||
            keepAnimating ||
            this.drawAnimating ||
            this.sketchAnimating ||
            this.dustAnimating
          ) {
            this.requestSoftwareRender();
          }
        },
        this.drawAnimating || this.sketchAnimating || this.dustAnimating
          ? 75
          : this.ecoProfile.softwareCooldownMs
      );
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    if (this.projTrailingTimer !== null) {
      window.clearTimeout(this.projTrailingTimer);
      this.projTrailingTimer = null;
    }
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    if (this.controller) {
      this.scene.remove(this.controller.root);
      this.controller.dispose();
      this.controller = null;
    }
    this.scene.remove(this.dustPoints.points);
    this.dustPoints.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
