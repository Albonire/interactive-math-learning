import * as THREE from 'three';
import {
  computeLabelRevealFactor,
  computeLayerDrawProgress,
  getAnatomyLayerDrawOrder,
} from '../core/firstDrawRegistry';
import { THEME_PALETTES, getCrayonHex } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';
import { getPaperGrainTexture } from './PaperGrainGenerator';

export interface CrayonSurfaceOptions {
  crayon: CrayonToken;
  theme: ThemeMode;
  opacity?: number;
  hatchStrength?: number;
  hatchScale?: number;
  doubleSide?: boolean;
  transparent?: boolean;
  depthWrite?: boolean;
  boilAmplitude?: number;
  outlineStrength?: number;
  borderInk?: number;
  borderWidth?: number;
}

const SURFACE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSteady;
  uniform float uBoilAmp;
  uniform float uBoilFps;
  uniform float uSketchScale;

  varying vec3 vNormalView;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying vec3 vViewDir;

  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vUv = uv;
    // Smooth first-appearance sketch scale expansion from local center
    vec3 pos = position * uSketchScale;

    // Subtle handcrafted static wax imperfection so silhouettes never look CAD-sterile
    float staticWobble = (hash31(floor(pos * 14.0)) - 0.5) * 0.011;
    pos += normal * staticWobble;

    // Stop-motion crayon line-boil (6 FPS normal, 3 FPS Eco Mode, frozen when uSteady > 0.5)
    float qTime = floor(uTime * max(1.0, uBoilFps));
    if (uBoilAmp > 0.0001 && uSteady < 0.5) {
      float jx = (hash31(floor(pos * 8.0) + qTime) - 0.5) * 2.0;
      float jy = (hash31(floor(pos * 8.0) + qTime + 19.3) - 0.5) * 2.0;
      pos += normal * (jx * uBoilAmp * 0.55);
      pos.y += jy * uBoilAmp * 0.42;
    }

    #ifdef USE_INSTANCING
      vec4 localInst = instanceMatrix * vec4(pos, 1.0);
      vec4 worldPos = modelMatrix * localInst;
      vec4 mvPos = modelViewMatrix * localInst;
      vNormalView = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    #else
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      vNormalView = normalize(normalMatrix * normal);
    #endif

    vWorldPos = worldPos.xyz;
    vViewDir = normalize(-mvPos.xyz);

    gl_Position = projectionMatrix * mvPos;
  }
`;

const SURFACE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uPaperColor;
  uniform vec3 uShadowTint;
  uniform vec3 uInkColor;
  uniform vec3 uLightDir;
  uniform sampler2D uPaperGrain;
  uniform float uGrainScale;
  uniform float uOpacity;
  uniform float uHatchStrength;
  uniform float uHatchScale;
  uniform float uDimFactor;
  uniform float uIsDark;
  uniform float uOutlineStrength;
  uniform float uBorderInk;
  uniform float uBorderWidth;
  uniform float uDrawProgress;
  uniform float uSketchOpacity;

  varying vec3 vNormalView;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  varying vec3 vViewDir;

  void main() {
    if (uSketchOpacity <= 0.005) discard;

    // Screen-space cold-press paper tooth + directional diagonal wax scribble strokes
    vec2 grainUv = gl_FragCoord.xy / uGrainScale;
    vec3 grainSample = texture2D(uPaperGrain, grainUv).rgb;
    float tooth = grainSample.r;
    float scribble = grainSample.g;
    float crumble = grainSample.b;

    // First-time two-stage hand-drawn crayon reveal: contour/rim outline traces first, then wax fill sweeps across
    float freshTipBoost = 0.0;
    float contourOnlyBoost = 0.0;
    if (uDrawProgress < 0.999) {
      if (uDrawProgress <= 0.002) discard;
      float sweep = clamp(
        (vWorldPos.x * 0.21 + vWorldPos.z * 0.16 + vWorldPos.y * 0.14 + 0.50),
        0.0,
        1.0
      );
      float sketchJitter = (tooth - 0.5) * 0.14 + (scribble - 0.5) * 0.09;
      float contourProgress = clamp(uDrawProgress / 0.44, 0.0, 1.0);
      float fillProgress = clamp((uDrawProgress - 0.26) / 0.74, 0.0, 1.0);

      float edgeDistPre = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
      float isPerimeter = 1.0 - smoothstep(0.015, 0.055, edgeDistPre);
      float fresnelPre = pow(1.0 - max(0.0, dot(normalize(vNormalView), normalize(vViewDir))), 1.8);
      float isContourZone = max(isPerimeter, smoothstep(0.32, 0.62, fresnelPre));

      float contourFrontier = contourProgress * 1.20 - (sweep + sketchJitter * 0.7);
      float fillFrontier = fillProgress * 1.24 - (sweep + sketchJitter);

      if (fillFrontier < 0.0) {
        if (isContourZone < 0.25 || contourFrontier < 0.0) discard;
        contourOnlyBoost = isContourZone * (1.0 - smoothstep(0.0, 0.22, contourFrontier) * 0.35);
      } else {
        // Concentrated freshly-laid wax edge right at the invisible hand's crayon tip
        freshTipBoost = (1.0 - smoothstep(0.0, 0.14, fillFrontier)) * (0.65 + 0.35 * tooth);
      }
    }

    // Dry-wax tooth stipple fade so both opaque & translucent meshes enter softly without popping
    if (uSketchOpacity < 0.995) {
      float toothThreshold = tooth * 0.62 + crumble * 0.38;
      if (toothThreshold > uSketchOpacity * 1.18) discard;
    }

    vec3 N = normalize(vNormalView);
    if (!gl_FrontFacing) N = -N;
    vec3 L = normalize(uLightDir);
    vec3 V = normalize(vViewDir);

    // 3-band hand-shaded wax crayon lighting (warm key + cool fill)
    float ndl = dot(N, L) * 0.5 + 0.5;
    float fill = max(0.0, dot(N, normalize(vec3(-0.65, 0.45, -0.5)))) * 0.24;
    float lightVal = clamp(ndl * 0.86 + fill, 0.0, 1.0);
    float band1 = smoothstep(0.24, 0.36, lightVal);
    float band2 = smoothstep(0.62, 0.76, lightVal);
    float toon = 0.36 + 0.36 * band1 + 0.28 * band2;

    // Secondary world-space crayon stroke grain so wax strokes cling naturally to 3D forms
    vec2 worldStrokeUv = vec2(vWorldPos.x + vWorldPos.z * 0.72, vWorldPos.y - vWorldPos.x * 0.52) * 0.72;
    float worldScribble = texture2D(uPaperGrain, worldStrokeUv).g;
    float combinedStroke = mix(scribble, worldScribble, 0.48);

    // Painterly wax crayon pigment shift: warm sunlit wax vs cool-deep layered shadow wax
    vec3 warmLift = uIsDark > 0.5 ? vec3(0.08, 0.06, 0.02) : vec3(0.06, 0.04, -0.02);
    vec3 coolShade = uIsDark > 0.5 ? vec3(-0.04, -0.02, 0.05) : vec3(-0.04, -0.02, 0.06);
    vec3 deepWax = mix(uColor * 0.58 + coolShade, uShadowTint, uIsDark > 0.5 ? 0.28 : 0.24);
    vec3 midWax = uColor * (0.92 + 0.20 * combinedStroke);
    vec3 lightWax = mix(uColor * 1.16 + warmLift, uPaperColor, uIsDark > 0.5 ? 0.10 : 0.26);
    vec3 shaded = mix(deepWax, midWax, band1);
    shaded = mix(shaded, lightWax, band2);

    // Layered hand-colored wax crayon strokes (45° primary pass + -30° cross-hatch in deep shadow)
    float shadowMask = 1.0 - smoothstep(0.28, 0.80, lightVal);
    float deepShadowMask = 1.0 - smoothstep(0.14, 0.48, lightVal);
    float diagPrimary = (gl_FragCoord.x * 0.74 + gl_FragCoord.y * 0.67) * 0.155 + (tooth - 0.5) * 1.45;
    float diagCross = (gl_FragCoord.x * 0.50 - gl_FragCoord.y * 0.86) * 0.135 + (crumble - 0.5) * 1.35;
    float stroke1 = 1.0 - smoothstep(0.07, 0.29, abs(fract(diagPrimary) - 0.5));
    float stroke2 = 1.0 - smoothstep(0.06, 0.24, abs(fract(diagCross) - 0.5));
    shaded = mix(shaded, deepWax * 0.88, stroke1 * shadowMask * 0.38);
    shaded = mix(shaded, mix(deepWax, uShadowTint, 0.35), stroke2 * deepShadowMask * 0.30);

    // Cold-press paper tooth breakthrough: sunlit planes reveal tactile paper valleys & dry-wax speckles
    float fresnel = pow(1.0 - max(0.0, dot(N, V)), 2.0);
    float pressure = mix(0.88, 0.50, toon) + (combinedStroke - 0.5) * 0.28;
    float waxCoverage = smoothstep(0.18, 0.78, tooth * 0.64 + crumble * 0.36 + (pressure - 0.48));
    float bleedAmount = (1.0 - waxCoverage) * (uIsDark > 0.5 ? 0.32 : 0.42);
    vec3 pigment = mix(shaded, uPaperColor, bleedAmount);

    // Extra 45-degree architectural wax hatching for anatomical slice planes & collapse sheets
    if (uHatchStrength > 0.01) {
      float diag = (vWorldPos.x + vWorldPos.y + vWorldPos.z) * uHatchScale + (tooth - 0.5) * 0.92;
      float stripe = abs(fract(diag) - 0.5);
      float hatchLine = 1.0 - smoothstep(0.07, 0.17, stripe);
      vec3 hatchInk = mix(uColor * 0.62, uShadowTint, 0.44);
      pigment = mix(pigment, hatchInk, hatchLine * uHatchStrength * 0.75);
    }

    // Hand-inked charcoal (paper) / chalk-accent (chalkboard) silhouette contour rim
    float rimEdge = smoothstep(0.28, 0.65, fresnel + (tooth - 0.5) * 0.22);
    vec3 inkTone = uIsDark > 0.5
      ? mix(uColor * 1.48, uInkColor, 0.52)
      : mix(uColor * 0.28, uInkColor, 0.68);
    pigment = mix(pigment, inkTone, rimEdge * uOutlineStrength * (0.76 + 0.24 * tooth));

    // Organic hand-inked UV perimeter border on planes, slices, tangent patches & heightfields
    float borderAlphaBoost = 0.0;
    if (uBorderInk > 0.01) {
      float edgeDist = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
      float organicWidth = uBorderWidth * (0.78 + 0.48 * tooth);
      float borderMask = 1.0 - smoothstep(organicWidth * 0.35, organicWidth, edgeDist);
      float borderStrength = borderMask * uBorderInk * (0.78 + 0.22 * crumble);
      pigment = mix(pigment, inkTone, borderStrength * 0.92);
      borderAlphaBoost = borderStrength * 0.55;
    }

    // Emphasize active crayon-tip edge & initial contour trace while drawing for the first time
    if (freshTipBoost > 0.001 || contourOnlyBoost > 0.001) {
      vec3 tipTint = uIsDark > 0.5 ? mix(uColor * 1.38, uInkColor, 0.48) : mix(uColor * 0.42, uInkColor, 0.58);
      pigment = mix(pigment, tipTint, max(freshTipBoost * 0.76, contourOnlyBoost * 0.85));
    }

    // Dimming when another symbolic parameter/layer is isolated + smooth entrance pigment lift
    float effectiveVis = uDimFactor * smoothstep(0.0, 0.9, uSketchOpacity);
    vec3 finalCol = mix(uPaperColor, pigment, effectiveVis);
    float baseAlpha = clamp(uOpacity + borderAlphaBoost, 0.0, 1.0);
    float finalAlpha = baseAlpha * (0.28 + 0.72 * uDimFactor) * uSketchOpacity;

    gl_FragColor = vec4(finalCol, finalAlpha);
  }
`;

const LINE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSteady;
  uniform float uBoilAmp;
  uniform float uBoilFps;
  uniform float uSketchScale;

  varying vec3 vWorldPos;

  float hash31(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  }

  void main() {
    vec3 pos = position * uSketchScale;
    // Slight static hand-drawn jitter so lines feel sketched by hand
    float s1 = (hash31(floor(pos * 12.0)) - 0.5) * 0.010;
    float s2 = (hash31(floor(pos * 12.0) + 17.3) - 0.5) * 0.010;
    pos.x += s1;
    pos.z += s2;

    float qTime = floor(uTime * max(1.0, uBoilFps));
    if (uBoilAmp > 0.0001 && uSteady < 0.5) {
      float n1 = hash31(floor(pos * 8.0) + qTime) - 0.5;
      float n2 = hash31(floor(pos * 8.0) + qTime + 41.7) - 0.5;
      pos.x += n1 * uBoilAmp;
      pos.y += n2 * uBoilAmp;
      pos.z += (n1 - n2) * uBoilAmp * 0.5;
    }
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const LINE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uPaperColor;
  uniform sampler2D uPaperGrain;
  uniform float uGrainScale;
  uniform float uOpacity;
  uniform float uDimFactor;
  uniform float uDrawProgress;
  uniform float uSketchOpacity;

  varying vec3 vWorldPos;

  void main() {
    if (uSketchOpacity <= 0.005) discard;

    vec3 g = texture2D(uPaperGrain, gl_FragCoord.xy / uGrainScale).rgb;

    if (uDrawProgress < 0.999) {
      if (uDrawProgress <= 0.002) discard;
      float radial = clamp(length(vWorldPos.xz) * 0.24 + (vWorldPos.x + vWorldPos.y) * 0.08 + 0.14, 0.0, 1.0);
      float frontier = uDrawProgress * 1.18 - (radial + (g.r - 0.5) * 0.08);
      if (frontier < 0.0) discard;
    }

    float dryWax = smoothstep(0.14, 0.52, g.r * 0.65 + g.b * 0.35 + 0.18);
    vec3 col = mix(uPaperColor, uColor, uDimFactor * (0.76 + 0.24 * dryWax));
    float alpha = uOpacity * (0.24 + 0.76 * uDimFactor) * (0.68 + 0.32 * dryWax) * uSketchOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createCrayonSurfaceMaterial(opts: CrayonSurfaceOptions): THREE.ShaderMaterial {
  const palette = THEME_PALETTES[opts.theme];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSteady: { value: 0 },
      uBoilAmp: { value: opts.boilAmplitude ?? 0.007 },
      uBoilFps: { value: 6.0 },
      uSketchScale: { value: 1.0 },
      uSketchOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color(getCrayonHex(opts.crayon, opts.theme)) },
      uPaperColor: { value: new THREE.Color(palette.paperBg) },
      uShadowTint: { value: new THREE.Color(palette.shadowTint) },
      uInkColor: { value: new THREE.Color(getCrayonHex('graphite', opts.theme)) },
      uLightDir: { value: new THREE.Vector3(0.55, 0.85, 0.45).normalize() },
      uPaperGrain: { value: getPaperGrainTexture() },
      uGrainScale: { value: 155.0 },
      uOpacity: { value: opts.opacity ?? 1.0 },
      uHatchStrength: { value: opts.hatchStrength ?? 0.0 },
      uHatchScale: { value: opts.hatchScale ?? 5.5 },
      uDimFactor: { value: 1.0 },
      uIsDark: { value: opts.theme === 'chalkboard' ? 1.0 : 0.0 },
      uOutlineStrength: { value: opts.outlineStrength ?? 0.78 },
      uBorderInk: { value: opts.borderInk ?? 0.0 },
      uBorderWidth: { value: opts.borderWidth ?? 0.022 },
      uDrawProgress: { value: 1.0 },
    },
    vertexShader: SURFACE_VERT,
    fragmentShader: SURFACE_FRAG,
    side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 0.99),
    depthWrite: opts.depthWrite ?? !(opts.transparent ?? false),
  });
  mat.userData.crayonToken = opts.crayon;
  mat.userData.isCrayonMaterial = true;
  return mat;
}

export function createCrayonLineMaterial(
  crayon: CrayonToken,
  theme: ThemeMode,
  opacity = 0.92,
  boilAmp = 0.007
): THREE.ShaderMaterial {
  const palette = THEME_PALETTES[theme];
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSteady: { value: 0 },
      uBoilAmp: { value: boilAmp },
      uBoilFps: { value: 6.0 },
      uSketchScale: { value: 1.0 },
      uSketchOpacity: { value: 1.0 },
      uColor: { value: new THREE.Color(getCrayonHex(crayon, theme)) },
      uPaperColor: { value: new THREE.Color(palette.paperBg) },
      uPaperGrain: { value: getPaperGrainTexture() },
      uGrainScale: { value: 150.0 },
      uOpacity: { value: opacity },
      uDimFactor: { value: 1.0 },
      uDrawProgress: { value: 1.0 },
    },
    vertexShader: LINE_VERT,
    fragmentShader: LINE_FRAG,
    transparent: true,
    depthWrite: opacity >= 0.95,
  });
  mat.userData.crayonToken = crayon;
  mat.userData.isCrayonMaterial = true;
  return mat;
}

export function syncCrayonMaterialsInObject(
  root: THREE.Object3D,
  theme: ThemeMode,
  elapsedSec: number,
  steadyStrokes: boolean,
  focusedLayerId: string | null,
  globalDrawProgress = 1.0,
  boilFps = 6.0
): void {
  const palette = THEME_PALETTES[theme];
  const isDark = theme === 'chalkboard' ? 1.0 : 0.0;
  const steadyVal = steadyStrokes ? 1.0 : 0.0;
  const labelReveal = computeLabelRevealFactor(globalDrawProgress);
  const inkHex = getCrayonHex('graphite', theme);

  root.traverse((obj) => {
    const layerId: string | undefined = obj.userData.anatomyLayerId;
    if (layerId !== undefined) {
      obj.userData._activeDim = focusedLayerId && focusedLayerId !== layerId ? 0.25 : 1.0;
      obj.userData._layerDrawOrder = getAnatomyLayerDrawOrder(layerId);
    }

    const objSketchOpacity =
      typeof obj.userData._sketchOpacity === 'number' ? obj.userData._sketchOpacity : 1.0;
    const objSketchScale =
      typeof obj.userData._sketchScale === 'number' ? obj.userData._sketchScale : 1.0;
    const objSketchDraw =
      typeof obj.userData._sketchDraw === 'number' ? obj.userData._sketchDraw : 1.0;

    // Reveal 3D hand-lettered label sprites smoothly with opacity + gentle scale on first appearance
    if (obj.userData?.isCrayonLabel) {
      const sprite = obj as THREE.Sprite;
      if (!sprite.userData._baseSpriteScale) {
        sprite.userData._baseSpriteScale = sprite.scale.clone();
      }
      const baseScale = sprite.userData._baseSpriteScale as THREE.Vector3;
      sprite.scale.set(
        baseScale.x * objSketchScale,
        baseScale.y * objSketchScale,
        baseScale.z
      );
      if (sprite.material) {
        sprite.material.opacity = Math.min(labelReveal, objSketchOpacity);
      }
      return;
    }

    const mesh = obj as THREE.Mesh;
    const mat = mesh.material as THREE.ShaderMaterial | undefined;
    if (!mat || !mat.userData?.isCrayonMaterial) return;

    const token = mat.userData.crayonToken as CrayonToken | undefined;
    if (token && mat.uniforms.uColor) {
      mat.uniforms.uColor.value.set(getCrayonHex(token, theme));
    }
    if (mat.uniforms.uPaperColor) mat.uniforms.uPaperColor.value.set(palette.paperBg);
    if (mat.uniforms.uShadowTint) mat.uniforms.uShadowTint.value.set(palette.shadowTint);
    if (mat.uniforms.uInkColor) mat.uniforms.uInkColor.value.set(inkHex);
    if (mat.uniforms.uIsDark) mat.uniforms.uIsDark.value = isDark;
    if (mat.uniforms.uTime) mat.uniforms.uTime.value = elapsedSec;
    if (mat.uniforms.uSteady) mat.uniforms.uSteady.value = steadyVal;
    if (mat.uniforms.uBoilFps) mat.uniforms.uBoilFps.value = boilFps;

    // Walk up to find enclosing anatomy layer dim factor & draw order
    let dim = 1.0;
    let drawOrder = 0.35;
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (typeof cur.userData._activeDim === 'number') {
        dim = cur.userData._activeDim;
        if (typeof cur.userData._layerDrawOrder === 'number') {
          drawOrder = cur.userData._layerDrawOrder;
        }
        break;
      }
      cur = cur.parent;
    }
    if (mat.uniforms.uDimFactor) {
      mat.uniforms.uDimFactor.value = dim;
    }
    if (mat.uniforms.uDrawProgress) {
      const layerDraw = computeLayerDrawProgress(globalDrawProgress, drawOrder);
      mat.uniforms.uDrawProgress.value = Math.min(layerDraw, objSketchDraw);
    }
    if (mat.uniforms.uSketchScale) {
      mat.uniforms.uSketchScale.value = objSketchScale;
    }
    if (mat.uniforms.uSketchOpacity) {
      mat.uniforms.uSketchOpacity.value = objSketchOpacity;
    }
  });
}
