import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import rough from 'roughjs';
import {
  tokenizeGlossaryText,
  type GlossaryEntry,
} from '../core/glossary';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { ThemeMode } from '../core/types';
import { CrayonArrowRight, CrayonClose, CrayonPencil } from './CrayonIcons';
import { KatexInline } from './KatexFormula';
import { RoughUnderline } from './RoughElements';

interface AnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
}

interface ActiveLookup {
  entry: GlossaryEntry;
  anchor: AnchorRect;
}

interface CrayonDictionaryContextValue {
  openTerm: (entry: GlossaryEntry, el: HTMLElement) => void;
  closeDictionary: () => void;
  activeEntryId: string | null;
  theme: ThemeMode;
}

const CrayonDictionaryContext = createContext<CrayonDictionaryContextValue | null>(null);

function MarginBracketSvg({
  color,
  seed,
}: {
  color: string;
  seed: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    // Hand-drawn margin vertical curl & little star doodle
    svg.appendChild(
      rc.curve(
        [
          [11, 6],
          [5, 42],
          [7, 110],
          [4, 185],
          [12, 234],
        ],
        {
          seed,
          stroke: color,
          strokeWidth: 2.3,
          roughness: 1.45,
        }
      )
    );
    svg.appendChild(
      rc.circle(8, 12, 5.5, {
        seed: seed + 13,
        stroke: color,
        fill: color,
        fillStyle: 'solid',
        roughness: 1.1,
      })
    );
  }, [color, seed]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 18 240"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="w-[14px] h-full shrink-0 pointer-events-none crayon-stroke-svg"
    />
  );
}

export function CrayonDictionaryProvider({
  theme,
  activeModuleId,
  onJumpToModule,
  children,
}: {
  theme: ThemeMode;
  activeModuleId: StudyModuleId;
  onJumpToModule: (id: StudyModuleId) => void;
  children: ReactNode;
}) {
  const [lookup, setLookup] = useState<ActiveLookup | null>(null);
  const noteRef = useRef<HTMLDivElement | null>(null);

  const openTerm = useCallback((entry: GlossaryEntry, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setLookup({
      entry,
      anchor: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
      },
    });
  }, []);

  const closeDictionary = useCallback(() => {
    setLookup(null);
  }, []);

  // Close on Escape or outside click
  useEffect(() => {
    if (!lookup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLookup(null);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (noteRef.current?.contains(target)) return;
      if (target.closest('[data-glossary-term]')) return;
      setLookup(null);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [lookup]);

  const ctxValue = useMemo<CrayonDictionaryContextValue>(
    () => ({
      openTerm,
      closeDictionary,
      activeEntryId: lookup?.entry.id ?? null,
      theme,
    }),
    [openTerm, closeDictionary, lookup?.entry.id, theme]
  );

  // Compute non-clipping viewport coordinates for desktop floating margin note
  const computeNoteStyle = (): React.CSSProperties => {
    if (!lookup || typeof window === 'undefined') return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 640) {
      return {
        left: 12,
        right: 12,
        bottom: 14,
      };
    }
    const noteW = 348;
    const noteEstH = 265;
    let left = lookup.anchor.left + lookup.anchor.width / 2 - noteW / 2;
    left = Math.max(16, Math.min(vw - noteW - 16, left));
    const spaceBelow = vh - lookup.anchor.bottom;
    const top =
      spaceBelow >= noteEstH + 16
        ? lookup.anchor.bottom + 10
        : Math.max(62, lookup.anchor.top - noteEstH - 12);
    return {
      left,
      top,
      width: noteW,
    };
  };

  const activeAccent = lookup ? getCrayonHex(lookup.entry.crayon, theme) : undefined;
  const noteBg =
    theme === 'paper'
      ? 'rgba(253, 250, 241, 0.97)'
      : 'rgba(20, 25, 34, 0.97)';

  return (
    <CrayonDictionaryContext.Provider value={ctxValue}>
      {children}

      {lookup && activeAccent && (
        <aside
          ref={noteRef}
          role="dialog"
          aria-label={`Crayón Diccionario: ${lookup.entry.term}`}
          data-testid="crayon-dictionary-note"
          style={{
            ...computeNoteStyle(),
            backgroundColor: noteBg,
          }}
          className="fixed z-50 margin-note-slip px-3.5 py-3.5 sm:px-4 sm:py-4 flex gap-2.5 shadow-[4px_7px_22px_rgba(14,16,22,0.22)]"
        >
          <MarginBracketSvg
            color={activeAccent}
            seed={lookup.entry.id.length * 29 + 17}
          />

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div
                  className="inline-flex items-center gap-1 text-[12px] font-hand tracking-wide"
                  style={{ color: activeAccent }}
                >
                  <CrayonPencil size={12} />
                  <span>Crayón Diccionario · {lookup.entry.category}</span>
                </div>
                <h3 className="font-display text-[21px] leading-tight text-[var(--text-primary)] mt-0.5">
                  {lookup.entry.term}
                </h3>
                <div className="w-28 mt-0.5" aria-hidden="true">
                  <RoughUnderline
                    crayon={lookup.entry.crayon}
                    theme={theme}
                    seed={lookup.entry.term.length * 13}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={closeDictionary}
                aria-label="Cerrar nota del Crayón Diccionario"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
              >
                <CrayonClose size={16} />
              </button>
            </div>

            <p className="text-[14.5px] leading-snug text-[var(--text-primary)]">
              {lookup.entry.intuition}
            </p>

            {lookup.entry.latex && (
              <div
                className="py-1.5 px-2 overflow-x-auto text-[14.5px] border-l-2 border-dashed"
                style={{
                  borderColor: activeAccent,
                  backgroundColor:
                    theme === 'paper'
                      ? 'rgba(24, 25, 29, 0.03)'
                      : 'rgba(245, 243, 238, 0.04)',
                }}
              >
                <KatexInline latex={lookup.entry.latex} />
              </div>
            )}

            <p className="text-[13.5px] italic text-[var(--text-secondary)] leading-snug">
              <span
                className="not-italic font-display text-[14px] mr-1"
                style={{ color: activeAccent }}
              >
                Al margen:
              </span>
              {lookup.entry.marginExample}
            </p>

            {lookup.entry.relatedModuleId !== activeModuleId && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onJumpToModule(lookup.entry.relatedModuleId);
                    closeDictionary();
                  }}
                  className="inline-flex items-center gap-1 font-display text-[14.5px] hover:underline cursor-pointer"
                  style={{ color: activeAccent }}
                >
                  <span>Explorar en {lookup.entry.relatedModuleId}</span>
                  <CrayonArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        </aside>
      )}
    </CrayonDictionaryContext.Provider>
  );
}

/**
 * Renders Spanish mathematical prose where recognized glossary terms appear with a subtle
 * hand-drawn wavy crayon underline. Clicking any term opens the floating Crayón Diccionario margin note.
 */
export function GlossaryText({
  text,
  maxHighlights = 5,
}: {
  text: string;
  maxHighlights?: number;
}) {
  const ctx = useContext(CrayonDictionaryContext);
  const tokens = useMemo(
    () => tokenizeGlossaryText(text, { maxHighlights, dedupePerBlock: true }),
    [text, maxHighlights]
  );

  if (!ctx) {
    return <>{text}</>;
  }

  const handleClick = (entry: GlossaryEntry, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    ctx.openTerm(entry, e.currentTarget);
  };

  return (
    <>
      {tokens.map((tok, idx) => {
        if (tok.type === 'text') {
          return <span key={idx}>{tok.value}</span>;
        }
        const accent = getCrayonHex(tok.entry.crayon, ctx.theme);
        const isOpen = ctx.activeEntryId === tok.entry.id;
        return (
          <button
            key={`${tok.entry.id}-${idx}`}
            type="button"
            data-glossary-term={tok.entry.id}
            onClick={(e) => handleClick(tok.entry, e)}
            title={`Definición en Crayón Diccionario: ${tok.entry.term}`}
            style={{
              textDecorationColor: accent,
              backgroundColor: isOpen
                ? `${accent}${ctx.theme === 'paper' ? '22' : '2A'}`
                : 'transparent',
            }}
            className="inline p-0 m-0 border-0 font-inherit text-inherit underline decoration-wavy decoration-[1.5px] underline-offset-[3px] rounded-xs cursor-pointer transition-colors hover:opacity-85"
          >
            {tok.value}
          </button>
        );
      })}
    </>
  );
}

/** Ensures THEME_PALETTES reference remains tree-shake-safe if inspected */
export const DICTIONARY_PALETTE_REF = THEME_PALETTES;
