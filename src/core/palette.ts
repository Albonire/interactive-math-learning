import type { CrayonToken, ThemeMode } from './types';

export interface ThemePalette {
  paperBg: string;
  surfaceBg: string;
  gridColor: string;
  shadowTint: string;
  crayons: Record<CrayonToken, string>;
}

export type UiChromeRole = 'accent' | 'success' | 'warning' | 'neutral' | 'muted';

export const THEME_PALETTES: Record<ThemeMode, ThemePalette> = {
  paper: {
    // Crisp bright warm-white cotton sketchbook paper
    paperBg: '#FCFBF8',
    surfaceBg: '#F4F1EA',
    gridColor: '#CFCAC0',
    shadowTint: '#31343C',
    // Expressive semantic wax pigments reserved for 3D mathematical diagrams
    crayons: {
      graphite: '#18191D',
      cobalt: '#1B5694',
      vermilion: '#D93B2B',
      ochre: '#C9820B',
      sage: '#1F7A4D',
      plum: '#7C3F8C',
      pencil: '#6E7078',
    },
  },
  chalkboard: {
    // Deep matte slate-charcoal chalkboard with luminous pastel chalk crayons
    paperBg: '#101318',
    surfaceBg: '#161A21',
    gridColor: '#28303B',
    shadowTint: '#07090C',
    // Expressive pastel chalk pigments reserved for 3D mathematical diagrams
    crayons: {
      graphite: '#F5F3EE',
      cobalt: '#6DB8F5',
      vermilion: '#FF7E6E',
      ochre: '#FFD05B',
      sage: '#63DBA0',
      plum: '#D49CE2',
      pencil: '#98A1AE',
    },
  },
};

/**
 * Unified, lower-saturation editorial ink palette for UI chrome only.
 * Reduces visual saturation around buttons, tabs, underlines, progress bars,
 * and overlays so the 3D mathematical artwork remains the undisputed focal point.
 */
export const UI_CHROME_PALETTES: Record<ThemeMode, Record<UiChromeRole, string>> = {
  paper: {
    accent: '#35536E',
    success: '#3F6652',
    warning: '#A2473D',
    neutral: '#18191D',
    muted: '#656973',
  },
  chalkboard: {
    accent: '#8DAEC9',
    success: '#84B39B',
    warning: '#D28B82',
    neutral: '#F5F3EE',
    muted: '#98A1AE',
  },
};

export function getCrayonHex(token: CrayonToken, theme: ThemeMode): string {
  return THEME_PALETTES[theme].crayons[token];
}

export function getUiChromeHex(role: UiChromeRole, theme: ThemeMode): string {
  return UI_CHROME_PALETTES[theme][role];
}

/**
 * Maps a CrayonToken to the calmed, unified UI chrome palette for non-3D controls.
 */
export function getUiCrayonHex(token: CrayonToken, theme: ThemeMode): string {
  const ui = UI_CHROME_PALETTES[theme];
  switch (token) {
    case 'cobalt':
    case 'plum':
    case 'ochre':
      return ui.accent;
    case 'sage':
      return ui.success;
    case 'vermilion':
      return ui.warning;
    case 'graphite':
      return ui.neutral;
    case 'pencil':
      return ui.muted;
  }
}

export function getCrayonCssVar(token: CrayonToken): string {
  return `var(--crayon-${token})`;
}

export function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const int = parseInt(clean, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}
