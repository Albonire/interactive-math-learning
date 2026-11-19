import * as THREE from 'three';
import { getCrayonHex, hexToRgbTuple } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';
import {
  CrayonDustPool,
  MAX_DUST_PARTICLES,
  computeDustFlakeAlpha,
} from './crayonDust';

const DUST_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aSeed;
  attribute vec3 aColor;

  uniform float uPixelRatio;

  varying float vAlpha;
  varying float vSeed;
  varying vec3 vColor;

  void main() {
    vAlpha = aAlpha;
    vSeed = aSeed;
    vColor = aColor;

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;

    float distScale = 5.4 / max(1.4, -mvPos.z);
    gl_PointSize = aAlpha > 0.004 ? clamp(aSize * distScale * uPixelRatio, 1.5, 16.0) : 0.0;
  }
`;

const DUST_FRAG = /* glsl */ `
  varying float vAlpha;
  varying float vSeed;
  varying vec3 vColor;

  void main() {
    if (vAlpha <= 0.004) discard;

    // Irregular hand-crumbled dry wax / chalk flake silhouette (never synthetic smooth circles)
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float angle = atan(p.y, p.x);
    float wobble = 0.74
      + 0.16 * sin(angle * 3.0 + vSeed * 25.13)
      + 0.10 * cos(angle * 5.0 - vSeed * 18.7);
    float r = length(p);
    if (r > wobble) discard;

    // Subtle dry-wax inner tooth speckle so each flake reads like real crayon dust on paper
    float tooth = fract(sin(dot(floor(gl_PointCoord * 7.0) + vSeed * 13.0, vec2(12.9898, 78.233))) * 43758.5453);
    float edgeSoft = 1.0 - smoothstep(wobble * 0.45, wobble, r);
    float alpha = vAlpha * edgeSoft * (0.72 + 0.28 * tooth);
    if (alpha <= 0.01) discard;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

/**
 * Single-draw-call Three.js Points system for subtle artisanal Crayon Dust crumbs.
 * Pre-allocates all typed buffers once so per-frame updates generate zero garbage.
 */
export class CrayonDustPoints {
  public readonly points: THREE.Points;
  private readonly pool: CrayonDustPool;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;
  private readonly seeds: Float32Array;

  private readonly posAttr: THREE.BufferAttribute;
  private readonly colAttr: THREE.BufferAttribute;
  private readonly sizeAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly seedAttr: THREE.BufferAttribute;

  private theme: ThemeMode;
  private hadActiveLastFrame = false;

  constructor(initialTheme: ThemeMode) {
    this.theme = initialTheme;
    this.pool = new CrayonDustPool(MAX_DUST_PARTICLES);

    this.positions = new Float32Array(MAX_DUST_PARTICLES * 3);
    this.colors = new Float32Array(MAX_DUST_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_DUST_PARTICLES);
    this.alphas = new Float32Array(MAX_DUST_PARTICLES);
    this.seeds = new Float32Array(MAX_DUST_PARTICLES);

    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    this.sizeAttr = new THREE.BufferAttribute(this.sizes, 1);
    this.alphaAttr = new THREE.BufferAttribute(this.alphas, 1);
    this.seedAttr = new THREE.BufferAttribute(this.seeds, 1);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aColor', this.colAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aSeed', this.seedAttr);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: 1 },
      },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 25;
  }

  public setTheme(theme: ThemeMode): void {
    this.theme = theme;
  }

  public setPixelRatio(dpr: number): void {
    this.material.uniforms.uPixelRatio.value = Math.max(1, Math.min(2, dpr));
  }

  public emit(
    origin: [number, number, number],
    crayon: CrayonToken,
    intensity: number,
    ecoMode: boolean
  ): number {
    const emitted = this.pool.emitBurst({ origin, crayon, intensity, ecoMode });
    this.syncBuffers();
    return emitted;
  }

  public step(dtSec: number): boolean {
    const anyActive = this.pool.step(dtSec);
    if (anyActive || this.hadActiveLastFrame) {
      this.syncBuffers();
    }
    this.hadActiveLastFrame = anyActive;
    return anyActive;
  }

  public activeCount(): number {
    return this.pool.activeCount();
  }

  public clear(): void {
    this.pool.clear();
    this.syncBuffers();
    this.hadActiveLastFrame = false;
  }

  private syncBuffers(): void {
    const particles = this.pool.particles;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.active) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      const normAge = p.age / Math.max(0.001, p.maxAge);
      const [r, g, b] = hexToRgbTuple(getCrayonHex(p.crayon, this.theme));

      this.positions[i * 3 + 0] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;

      this.colors[i * 3 + 0] = r;
      this.colors[i * 3 + 1] = g;
      this.colors[i * 3 + 2] = b;

      this.sizes[i] = p.size * (1 - normAge * 0.32);
      this.alphas[i] = computeDustFlakeAlpha(normAge);
      this.seeds[i] = p.seed;
    }

    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.seedAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
