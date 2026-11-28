import { createContext, useContext, type ReactNode } from 'react';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { CrayonToken, ThemeMode } from '../core/types';
import { CrayonNote } from '../ui/CrayonIcons';
import { handifySvgTree } from './handDrawnSvg';
import { useDrawOnEnter } from './useDrawOnEnter';
import { GlossaryText } from '../ui/CrayonDictionary';
import { CrayonSlider, CrayonStepMarker, RoughDivider, RoughUnderline } from '../ui/RoughElements';
export {
  DiagramDragHandle,
  useDiagramDrag,
  InkScrubNumber,
  SketchDial,
  SketchXYPad,
  clientToSvgPoint,
} from './CreativeControls';

export interface ModuleVisualProps {
  theme: ThemeMode;
  onOpen3DLab?: () => void;
  linked3DLabel?: string;
}

const VisualThemeContext = createContext<ThemeMode>('paper');

export function VisualThemeProvider({
  theme,
  children,
}: {
  theme: ThemeMode;
  children: ReactNode;
}) {
  return (
    <VisualThemeContext.Provider value={theme}>
      {children}
    </VisualThemeContext.Provider>
  );
}

function hashLabelSeed(label: string): number {
  let h = 37;
  for (let i = 0; i < label.length; i++) {
    h = (h * 31 + label.charCodeAt(i)) % 997;
  }
  return h + 11;
}

export function useVisualPalette(theme: ThemeMode) {
  const palette = THEME_PALETTES[theme];
  return {
    bg: palette.paperBg,
    surface: palette.surfaceBg,
    grid: palette.gridColor,
    ink: palette.crayons.graphite,
    pencil: palette.crayons.pencil,
    cobalt: palette.crayons.cobalt,
    vermilion: palette.crayons.vermilion,
    sage: palette.crayons.sage,
    ochre: palette.crayons.ochre,
    plum: palette.crayons.plum,
    hex: (token: CrayonToken) => getCrayonHex(token, theme),
  };
}

export function VisualModeTabs<T extends string>({
  tabs,
  active,
  onChange,
  theme,
}: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  theme: ThemeMode;
}) {
  return (
    <div className="mb-4">
      <div
        role="tablist"
        className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pb-2"
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`relative pb-1 text-[15px] sm:text-[16px] leading-tight cursor-pointer transition-colors ${
                isActive
                  ? 'font-display text-[18px] sm:text-[19px] text-[var(--ui-accent)]'
                  : 'font-hand text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
              {isActive && (
                <span aria-hidden="true" className="absolute left-0 right-0 -bottom-1">
                  <RoughUnderline crayon="cobalt" theme={theme} seed={17 + idx * 11} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <RoughDivider theme={theme} seed={29 + tabs.length * 7} />
    </div>
  );
}

export function ParamSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  displayValue,
  crayon = 'cobalt',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  crayon?: CrayonToken;
  onChange: (next: number) => void;
}) {
  const theme = useContext(VisualThemeContext);
  const seed = hashLabelSeed(label);

  // Small discrete domains (n = 2…8, grado 0…9, k = 1…6…) read better as a row of tappable
  // hand-circled numbers: the learner sees every possible value and picks one in a single tap,
  // instead of hunting for a position on a track.
  const count = step > 0 ? Math.round((max - min) / step) + 1 : Infinity;
  if (count >= 2 && count <= 10) {
    const values = Array.from({ length: count }, (_, i) => Number((min + i * step).toFixed(6)));
    const current = values.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best), values[0]);
    const pick = (v: number) => {
      if (v !== value) onChange(v);
    };
    return (
      <div className="flex flex-col gap-1 min-w-[148px]">
        <div className="flex items-baseline justify-between gap-2 text-[14px] text-[var(--text-secondary)]">
          <span className="font-hand leading-tight">{label}</span>
          {displayValue && (
            <span className="font-mono-math text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
              {displayValue}
            </span>
          )}
        </div>
        <div
          role="radiogroup"
          aria-label={label}
          className="flex flex-wrap items-center gap-0.5"
          onKeyDown={(e) => {
            const idx = values.indexOf(current);
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              pick(values[Math.min(values.length - 1, idx + 1)]);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              pick(values[Math.max(0, idx - 1)]);
            }
          }}
        >
          {values.map((v, i) => {
            const selected = v === current;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${label}: ${v}${unit}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => pick(v)}
                className="p-0.5 cursor-pointer rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-[var(--ui-accent)]"
              >
                <CrayonStepMarker
                  index={i + seed}
                  active={selected}
                  completed={false}
                  crayon={crayon}
                  theme={theme}
                  label={String(v).replace('.', ',')}
                  size={selected ? 30 : 26}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-[148px] flex-1">
      <div className="flex items-baseline justify-between gap-2 text-[14px] text-[var(--text-secondary)]">
        <span className="font-hand leading-tight">{label}</span>
        <span className="font-mono-math text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
          {displayValue ?? `${value}${unit}`}
        </span>
      </div>
      <CrayonSlider
        value={value}
        min={min}
        max={max}
        step={step}
        crayon={crayon}
        theme={theme}
        seed={seed}
        ariaLabel={label}
        onChange={onChange}
      />
    </div>
  );
}

export function VisualStageCard({
  caption,
  children,
  controls,
  footer,
}: {
  caption?: string;
  children: ReactNode;
  controls?: ReactNode;
  footer?: ReactNode;
}) {
  const drawRef = useDrawOnEnter<HTMLDivElement>();
  return (
    <div className="space-y-4">
      {controls && (
        <div className="sketch-open-shelf flex flex-wrap items-center gap-x-5 gap-y-3">
          {controls}
        </div>
      )}
      <div ref={drawRef} className="sketch-diagram-canvas py-2 sm:py-3 overflow-x-auto">
        {handifySvgTree(children)}
      </div>
      {(caption || footer) && (
        <div className="flex flex-wrap items-start justify-between gap-2.5 pt-1 text-[15px] text-[var(--text-secondary)]">
          {caption && (
            <p className="leading-snug flex items-start gap-2 max-w-[820px]">
              <CrayonNote
                size={15}
                className="mt-0.5 text-[var(--ui-accent)] shrink-0 opacity-80"
              />
              <span>
                <GlossaryText text={caption} />
              </span>
            </p>
          )}
          {footer}
        </div>
      )}
    </div>
  );
}

export function ActionBtn({
  children,
  onClick,
  active = false,
  tone = 'default',
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
}) {
  const textTone =
    tone === 'accent' || active
      ? 'text-[var(--ui-accent)] font-display text-[15px]'
      : tone === 'danger'
        ? 'text-[var(--ui-warning)] font-display text-[15px]'
        : 'text-[var(--text-primary)] font-hand text-[14.5px]';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-active={active ? 'true' : undefined}
      data-tone={tone !== 'default' ? tone : undefined}
      className={`sketch-btn px-3 py-1 leading-tight whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${textTone}`}
    >
      {children}
    </button>
  );
}
