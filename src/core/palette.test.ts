import test from 'node:test';
import assert from 'node:assert/strict';
import { THEME_PALETTES, UI_CHROME_PALETTES, hexToRgbTuple } from './palette';

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgbTuple(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hslSaturation(hex: string): number {
  const [r, g, b] = hexToRgbTuple(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const l = (max + min) / 2;
  return d / (1 - Math.abs(2 * l - 1));
}

test('Paper theme has bright white-paper luminance and Chalkboard theme is deep dark', () => {
  const paperLum = relativeLuminance(THEME_PALETTES.paper.paperBg);
  const chalkLum = relativeLuminance(THEME_PALETTES.chalkboard.paperBg);

  assert.ok(paperLum > 0.94, `Expected bright white paper (>0.94), got ${paperLum}`);
  assert.ok(chalkLum < 0.02, `Expected deep dark chalkboard (<0.02), got ${chalkLum}`);
  assert.ok(paperLum - chalkLum > 0.92);
});

test('Primary graphite and semantic crayons maintain clear contrast against both substrates', () => {
  const paperContrast = contrastRatio(
    THEME_PALETTES.paper.paperBg,
    THEME_PALETTES.paper.crayons.graphite
  );
  assert.ok(paperContrast > 14, `Expected high ink contrast on paper, got ${paperContrast}`);

  const chalkContrast = contrastRatio(
    THEME_PALETTES.chalkboard.paperBg,
    THEME_PALETTES.chalkboard.crayons.graphite
  );
  assert.ok(chalkContrast > 14, `Expected high chalk contrast on chalkboard, got ${chalkContrast}`);
});

test('Unified UI chrome palette lowers saturation compared to 3D graph crayons while preserving WCAG AA contrast', () => {
  for (const theme of ['paper', 'chalkboard'] as const) {
    const bg = THEME_PALETTES[theme].paperBg;
    const ui = UI_CHROME_PALETTES[theme];
    const crayons = THEME_PALETTES[theme].crayons;

    assert.ok(
      hslSaturation(ui.accent) < hslSaturation(crayons.cobalt) - 0.15,
      `Expected ${theme} UI accent saturation to be calmer than 3D cobalt`
    );
    assert.ok(
      hslSaturation(ui.success) < hslSaturation(crayons.sage) - 0.15,
      `Expected ${theme} UI success saturation to be calmer than 3D sage`
    );
    assert.ok(
      hslSaturation(ui.warning) < hslSaturation(crayons.vermilion) - 0.15,
      `Expected ${theme} UI warning saturation to be calmer than 3D vermilion`
    );

    for (const role of ['accent', 'success', 'warning'] as const) {
      const cr = contrastRatio(bg, ui[role]);
      assert.ok(cr >= 4.5, `Expected ${theme} UI ${role} contrast >= 4.5, got ${cr.toFixed(2)}`);
    }
  }
});
