import * as THREE from 'three';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';

/**
 * Composite 3-part procedural 3D wax-crayon / pastel-chalk nib that glides smoothly
 * along the exact active tip coordinate P(t) during trace-by-trace construction.
 *
 * Pivoted directly at its drawing point (0, 0, 0) and tilted at an authentic 34°
 * hand-sketching angle so the wax tip touches the line or contour being drawn.
 */
export class CrayonNibMarker {
  public readonly group: THREE.Group;
  private readonly bodyTilt: THREE.Group;
  private readonly tipMat: THREE.MeshBasicMaterial;
  private readonly wrapperMat: THREE.MeshBasicMaterial;
  private readonly bandMat: THREE.MeshBasicMaterial;
  private readonly ringMat: THREE.MeshBasicMaterial;

  private theme: ThemeMode;
  private activeCrayon: CrayonToken = 'cobalt';
  private targetPos = new THREE.Vector3();
  private hasTarget = false;
  private visibilityAlpha = 0;
  private liftOffset = 0.4;

  constructor(theme: ThemeMode) {
    this.theme = theme;
    this.group = new THREE.Group();
    this.group.name = 'crayon-nib-marker';
    this.group.visible = false;
    this.group.renderOrder = 25;

    this.bodyTilt = new THREE.Group();
    // Tilt like a right-handed artist sketching across an angled notebook
    this.bodyTilt.rotation.set(0.42, 0.3, -0.46);
    this.group.add(this.bodyTilt);

    const waxHex = getCrayonHex(this.activeCrayon, theme);
    const paperHex = THEME_PALETTES[theme].surfaceBg;
    const inkHex = getCrayonHex('graphite', theme);

    this.tipMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(waxHex),
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    this.wrapperMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(paperHex),
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    this.bandMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(inkHex),
      transparent: true,
      opacity: 0,
      depthTest: false,
    });
    this.ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(waxHex),
      transparent: true,
      opacity: 0,
      depthTest: false,
    });

    // Part 1: Tapered wax drawing point inverted so apex touches (0, 0, 0)
    const tipGeo = new THREE.ConeGeometry(0.055, 0.22, 10);
    tipGeo.rotateX(Math.PI);
    tipGeo.translate(0, 0.11, 0);
    const tipMesh = new THREE.Mesh(tipGeo, this.tipMat);

    // Part 2: Paper-wrapped crayon barrel sleeve above the exposed wax cone
    const barrelGeo = new THREE.CylinderGeometry(0.062, 0.058, 0.48, 12);
    barrelGeo.translate(0, 0.45, 0);
    const barrelMesh = new THREE.Mesh(barrelGeo, this.wrapperMat);

    // Part 3: Hand-inked paper wrapper stripe + subtle active-tip contact halo
    const bandGeo = new THREE.CylinderGeometry(0.065, 0.064, 0.06, 12);
    bandGeo.translate(0, 0.28, 0);
    const bandMesh = new THREE.Mesh(bandGeo, this.bandMat);

    const ringGeo = new THREE.RingGeometry(0.032, 0.072, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    ringMesh.position.y = 0.008;

    this.bodyTilt.add(tipMesh, barrelMesh, bandMesh);
    this.group.add(ringMesh);
  }

  public setTheme(theme: ThemeMode): void {
    if (this.theme === theme) return;
    this.theme = theme;
    this.applyColors();
  }

  private applyColors(): void {
    this.tipMat.color.set(getCrayonHex(this.activeCrayon, this.theme));
    this.ringMat.color.set(getCrayonHex(this.activeCrayon, this.theme));
    this.wrapperMat.color.set(THEME_PALETTES[this.theme].surfaceBg);
    this.bandMat.color.set(getCrayonHex('graphite', this.theme));
  }

  public isVisible(): boolean {
    return this.group.visible && this.visibilityAlpha > 0.05;
  }

  /**
   * Advances the 3D crayon nib toward the active stroke tip P(t), or gently lifts
   * and fades away once all strokes settle. Returns true while still animating.
   */
  public update(
    dt: number,
    activeTip: {
      active: boolean;
      worldPos: [number, number, number];
      crayon: CrayonToken;
    } | null,
    suppress: boolean,
    paused: boolean
  ): boolean {
    if (suppress) {
      this.visibilityAlpha = 0;
      this.group.visible = false;
      this.hasTarget = false;
      return false;
    }

    const show = Boolean(activeTip?.active);
    if (show && activeTip) {
      if (this.activeCrayon !== activeTip.crayon) {
        this.activeCrayon = activeTip.crayon;
        this.applyColors();
      }
      this.targetPos.set(activeTip.worldPos[0], activeTip.worldPos[1], activeTip.worldPos[2]);
      if (!this.hasTarget) {
        this.group.position.copy(this.targetPos);
        this.hasTarget = true;
      } else if (!paused) {
        this.group.position.x = THREE.MathUtils.damp(this.group.position.x, this.targetPos.x, 18, dt);
        this.group.position.y = THREE.MathUtils.damp(this.group.position.y, this.targetPos.y, 18, dt);
        this.group.position.z = THREE.MathUtils.damp(this.group.position.z, this.targetPos.z, 18, dt);
      }

      if (!paused) {
        this.visibilityAlpha = THREE.MathUtils.damp(this.visibilityAlpha, 0.94, 14, dt);
        this.liftOffset = THREE.MathUtils.damp(this.liftOffset, 0, 14, dt);
      }
      this.group.visible = true;
    } else {
      if (!paused) {
        this.visibilityAlpha = THREE.MathUtils.damp(this.visibilityAlpha, 0, 10, dt);
        this.liftOffset = THREE.MathUtils.damp(this.liftOffset, 0.42, 8, dt);
      }
      if (this.visibilityAlpha < 0.02) {
        this.visibilityAlpha = 0;
        this.group.visible = false;
        this.hasTarget = false;
        return false;
      }
    }

    this.bodyTilt.position.y = this.liftOffset;
    this.tipMat.opacity = this.visibilityAlpha;
    this.wrapperMat.opacity = this.visibilityAlpha * 0.95;
    this.bandMat.opacity = this.visibilityAlpha * 0.85;
    this.ringMat.opacity = this.visibilityAlpha * 0.36;

    return show || this.visibilityAlpha > 0.02;
  }

  public dispose(): void {
    this.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
      }
    });
    this.tipMat.dispose();
    this.wrapperMat.dispose();
    this.bandMat.dispose();
    this.ringMat.dispose();
  }
}
