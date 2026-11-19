export interface EcoRenderProfile {
  ecoMode: boolean;
  targetFps: number;
  minFrameIntervalMs: number;
  maxPixelRatio: number;
  boilFps: number;
  softwareCooldownMs: number;
  optimizerIntervalMs: number;
}

export interface EcoSvgFilterParams {
  /** Primary .crayon-surface border displacement filter (#crayon-stroke) */
  surfaceWarpFreq: string;
  surfaceWarpOctaves: number;
  surfaceWarpScale: number;
  surfaceMicroFreq: string;
  surfaceMicroOctaves: number;
  surfaceMicroScale: number;
  /** Rough.js stroke tooth filter (#crayon-stroke-tooth) */
  strokeToothOctaves: number;
  strokeToothScale: number;
  /** Display title tooth filter (#crayon-text-tooth) */
  textToothOctaves: number;
  textToothScale: number;
}

const ECO_STORAGE_KEY = 'bibifold_eco_mode_v1';

/**
 * Computes WebGL frame-pacing and resolution budgets for Normal vs Eco Mode.
 * Eco Mode meaningfully lowers mobile GPU/CPU wakeups and fill-rate without losing
 * the handcrafted wax crayon aesthetic.
 */
export function getEcoRenderProfile(
  ecoMode: boolean,
  isSoftwareGl: boolean
): EcoRenderProfile {
  if (ecoMode) {
    return {
      ecoMode: true,
      targetFps: 24,
      minFrameIntervalMs: 1000 / 24,
      maxPixelRatio: 1.0,
      boilFps: 3,
      softwareCooldownMs: 140,
      optimizerIntervalMs: 165,
    };
  }

  return {
    ecoMode: false,
    targetFps: 60,
    minFrameIntervalMs: 0,
    maxPixelRatio: isSoftwareGl ? 1.0 : 1.5,
    boilFps: 6,
    softwareCooldownMs: 65,
    optimizerIntervalMs: 110,
  };
}

/**
 * Computes SVG turbulence & displacement parameters for Normal vs Eco Mode.
 * In Eco Mode, octaves and displacement intensity are gently dialed back to reduce
 * mobile rasterization overhead while preserving unmistakable irregular crayon edges.
 */
export function getEcoSvgFilterParams(ecoMode: boolean): EcoSvgFilterParams {
  if (ecoMode) {
    return {
      surfaceWarpFreq: '0.036 0.052',
      surfaceWarpOctaves: 1,
      surfaceWarpScale: 1.65,
      surfaceMicroFreq: '0.46',
      surfaceMicroOctaves: 1,
      surfaceMicroScale: 0.65,
      strokeToothOctaves: 1,
      strokeToothScale: 1.2,
      textToothOctaves: 1,
      textToothScale: 0.85,
    };
  }

  return {
    surfaceWarpFreq: '0.042 0.068',
    surfaceWarpOctaves: 3,
    surfaceWarpScale: 2.65,
    surfaceMicroFreq: '0.68',
    surfaceMicroOctaves: 2,
    surfaceMicroScale: 1.15,
    strokeToothOctaves: 3,
    strokeToothScale: 1.85,
    textToothOctaves: 2,
    textToothScale: 1.25,
  };
}

export function loadInitialEcoMode(): boolean {
  try {
    const saved = localStorage.getItem(ECO_STORAGE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // Ignore storage access restrictions
  }
  return false;
}

export function saveEcoMode(enabled: boolean): void {
  try {
    localStorage.setItem(ECO_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore quota errors
  }
}
