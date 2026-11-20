import * as THREE from 'three';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';

let cachedGrainTexture: THREE.CanvasTexture | null = null;

/**
 * Generates a 256x256 seamless multi-channel Wax Crayon & Cold-Press Paper texture:
 * - R: crisp cold-press cotton paper tooth (high micro-contrast bumps & valleys)
 * - G: directional 45-degree overlapping wax crayon scribble strokes
 * - B: organic wax pigment speckles / crumble granulation
 * Zero external dependencies (< 256 KB VRAM).
 */
export function getPaperGrainTexture(): THREE.CanvasTexture {
  if (cachedGrainTexture) return cachedGrainTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const hash2 = (x: number, y: number, period: number, seed: number): number => {
      const ix = ((x % period) + period) % period;
      const iy = ((y % period) + period) % period;
      let n = ix * 374761393 + iy * 668265263 + seed * 1442695041;
      n = (n ^ (n >> 13)) * 1274126177;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    };

    const valueNoise = (u: number, v: number, freq: number, seed: number): number => {
      const x = u * freq;
      const y = v * freq;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);

      const a = hash2(x0, y0, freq, seed);
      const b = hash2(x0 + 1, y0, freq, seed);
      const c = hash2(x0, y0 + 1, freq, seed);
      const d = hash2(x0 + 1, y0 + 1, freq, seed);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };

    for (let y = 0; y < size; y++) {
      const v = y / size;
      for (let x = 0; x < size; x++) {
        const u = x / size;

        // R: bold cold-press paper tooth bump (sharpened contrast so wax visibly catches peaks)
        const coarse = valueNoise(u, v, 14, 11);
        const medium = valueNoise(u, v, 42, 29);
        const fine = valueNoise(u, v, 96, 53);
        const rawTooth = 0.36 * coarse + 0.38 * medium + 0.26 * fine;
        const tooth = Math.max(0, Math.min(1, (rawTooth - 0.5) * 1.65 + 0.5));

        // G: diagonal 45-deg wax crayon pressure strokes (seamless along u+v and u-v)
        const diagA = (u + v) % 1;
        const diagB = (u - v + 1) % 1;
        const strokeMain = valueNoise(diagA * 3.0, diagB * 0.5, 24, 71);
        const strokeFine = valueNoise(diagA * 6.0, diagB * 1.0, 48, 97);
        const scribble = Math.max(
          0,
          Math.min(1, (0.62 * strokeMain + 0.38 * strokeFine - 0.5) * 1.5 + 0.5)
        );

        // B: wax crumble speckles
        const speckleA = valueNoise(u, v, 64, 131);
        const speckleB = hash2(x, y, size, 173);
        const crumble = Math.max(0, Math.min(1, 0.58 * speckleA + 0.42 * speckleB));

        const idx = (y * size + x) * 4;
        data[idx] = Math.round(tooth * 255);
        data[idx + 1] = Math.round(scribble * 255);
        data[idx + 2] = Math.round(crumble * 255);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  cachedGrainTexture = texture;
  return texture;
}

/**
 * Draws a crisp hand-lettered crayon label onto an offscreen canvas with subtle
 * dry-wax underline and paper halo for 3D sprite annotations (v₁, v₂, ∇f, Adam, etc.).
 */
function paintCrayonLabelCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  crayon: CrayonToken,
  theme: ThemeMode
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const ink = getCrayonHex(crayon, theme);
  const paper = THEME_PALETTES[theme].paperBg;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fontSize = text.length > 5 ? 38 : 48;
  ctx.font = `400 ${fontSize}px "Pangolin", "Patrick Hand", cursive`;

  // Subtle soft paper halo so crayon lettering never clashes with 3D strokes behind it
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = theme === 'paper' ? 'rgba(252, 251, 248, 0.90)' : 'rgba(16, 19, 24, 0.90)';
  ctx.strokeText(text, w / 2, h / 2 - 4);

  // Double-pass dry crayon ink for hand-drawn thickness
  ctx.fillStyle = ink;
  ctx.fillText(text, w / 2, h / 2 - 4);
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, w / 2 + 1.2, h / 2 - 3.2);

  // Tiny hand-drawn crayon underline swipe
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  const underlineW = Math.min(w * 0.56, Math.max(38, text.length * 22));
  const x0 = w / 2 - underlineW / 2;
  const x1 = w / 2 + underlineW / 2;
  const yBase = h / 2 + 24;
  ctx.beginPath();
  ctx.moveTo(x0, yBase + 1);
  ctx.quadraticCurveTo(w / 2, yBase - 3, x1, yBase + 1.5);
  ctx.stroke();

  // Dry-wax paper tooth specks over the ink
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = paper;
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 42; i++) {
    const sx = ((i * 53 + text.charCodeAt(0) * 19) % (w - 20)) + 10;
    const sy = ((i * 37 + text.length * 29) % (h - 14)) + 7;
    ctx.fillRect(sx, sy, 2.5, 2.2);
  }
  ctx.restore();
}

export function createCrayonLabelSprite(
  text: string,
  crayon: CrayonToken,
  theme: ThemeMode,
  scale = 0.62
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 112;
  paintCrayonLabelCanvas(canvas, text, crayon, theme);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale * (256 / 112), scale, 1);
  sprite.renderOrder = 15;
  sprite.userData.isCrayonLabel = true;
  sprite.userData.labelText = text;
  sprite.userData.labelCrayon = crayon;
  sprite.userData.labelTheme = theme;
  sprite.userData.labelCanvas = canvas;
  return sprite;
}

export function refreshCrayonLabelSpritesInObject(
  root: THREE.Object3D,
  theme: ThemeMode,
  forceRedraw = false
): void {
  root.traverse((obj) => {
    if (!obj.userData?.isCrayonLabel) return;
    if (!forceRedraw && obj.userData.labelTheme === theme) return;
    const sprite = obj as THREE.Sprite;
    const canvas = obj.userData.labelCanvas as HTMLCanvasElement | undefined;
    const text = obj.userData.labelText as string | undefined;
    const crayon = obj.userData.labelCrayon as CrayonToken | undefined;
    if (!canvas || !text || !crayon) return;

    paintCrayonLabelCanvas(canvas, text, crayon, theme);
    obj.userData.labelTheme = theme;
    if (sprite.material.map) {
      sprite.material.map.needsUpdate = true;
    }
  });
}
