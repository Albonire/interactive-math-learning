import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
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
import { getCrayonHex } from '../core/palette';
import { STUDY_MODULES } from '../core/studyPlan';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { ThemeMode } from '../core/types';
import { CrayonArrowRight, CrayonClose, CrayonPencil } from './CrayonIcons';
import { KatexInline } from './KatexFormula';
import { RoughUnderline } from './RoughElements';

interface ActiveLookup {
  entry: GlossaryEntry;
  /** The highlighted word that opened the note; tracked live so the note follows it on scroll. */
  anchorEl: HTMLElement;
}

interface NotePlacement {
  left: number;
  top: number;
  width?: number;
  right?: number;
  bottom?: number;
  /** Horizontal position (px, relative to the note) of the little pointer tick toward the word. */
  tickX?: number;
  placement: 'below' | 'above' | 'sheet';
}

interface CrayonDictionaryContextValue {
  openTerm: (entry: GlossaryEntry, el: HTMLElement) => void;
  closeDictionary: (restoreFocus?: boolean) => void;
  activeEntryId: string | null;
  theme: ThemeMode;
}

const NOTE_WIDTH = 348;
const VIEWPORT_GUTTER = 16;
const MOBILE_BREAKPOINT = 640;
const NOTE_DOM_ID = 'crayon-dictionary-note';

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
  const [placement, setPlacement] = useState<NotePlacement | null>(null);
  const noteRef = useRef<HTMLElement | null>(null);

  const openTerm = useCallback((entry: GlossaryEntry, el: HTMLElement) => {
    // Clicking the same word again folds the note away (toggle), like flipping a margin slip.
    setLookup((prev) =>
      prev && prev.entry.id === entry.id && prev.anchorEl === el ? null : { entry, anchorEl: el }
    );
  }, []);

  const lookupRef = useRef<ActiveLookup | null>(null);
  lookupRef.current = lookup;

  const closeDictionary = useCallback((restoreFocus = true) => {
    const prev = lookupRef.current;
    setLookup(null);
    if (prev && restoreFocus && prev.anchorEl.isConnected) {
      // Return keyboard focus to the word that opened the note.
      window.requestAnimationFrame(() => prev.anchorEl.focus({ preventScroll: true }));
    }
  }, []);

  /**
   * Places the note next to its word using the note's real measured height, flips it above
   * when there is no room below, and becomes a bottom sheet on narrow screens. It re-runs on
   * every scroll (any scroll container, captured) and resize, so the note stays attached to
   * its word instead of floating over unrelated content.
   */
  const reposition = useCallback(() => {
    if (!lookup) return;
    const { anchorEl } = lookup;
    if (!anchorEl.isConnected) {
      setLookup(null);
      return;
    }
    const zoomHost = document.getElementById('root') ?? document.documentElement;
    const rawZoom = Number.parseFloat(window.getComputedStyle(zoomHost).zoom || '1');
    const zoom = Number.isFinite(rawZoom) && rawZoom > 0.1 ? rawZoom : 1;
    const vw = window.innerWidth / zoom;
    const vh = window.innerHeight / zoom;
    const rawRect = anchorEl.getBoundingClientRect();
    const r = {
      left: rawRect.left / zoom,
      right: rawRect.right / zoom,
      top: rawRect.top / zoom,
      bottom: rawRect.bottom / zoom,
      width: rawRect.width / zoom,
    };

    // The word left the visible page: fold the note away rather than leave it orphaned.
    if (r.bottom < 0 || r.top > vh) {
      setLookup(null);
      return;
    }

    if (vw < MOBILE_BREAKPOINT) {
      setPlacement({ left: 12, right: 12, top: 0, bottom: 14, placement: 'sheet' });
      return;
    }

    const noteH = noteRef.current?.offsetHeight ?? 265;
    const width = Math.min(NOTE_WIDTH, vw - VIEWPORT_GUTTER * 2);
    const anchorMid = r.left + r.width / 2;
    let left = anchorMid - width / 2;
    left = Math.max(VIEWPORT_GUTTER, Math.min(vw - width - VIEWPORT_GUTTER, left));
    const fitsBelow = vh - r.bottom >= noteH + VIEWPORT_GUTTER;
    const fitsAbove = r.top >= noteH + VIEWPORT_GUTTER;
    const below = fitsBelow || !fitsAbove;
    const top = below
      ? Math.min(r.bottom + 10, vh - noteH - VIEWPORT_GUTTER)
      : r.top - noteH - 10;
    setPlacement({
      left,
      top: Math.max(VIEWPORT_GUTTER, top),
      width,
      tickX: Math.max(18, Math.min(width - 18, anchorMid - left)),
      placement: below ? 'below' : 'above',
    });
  }, [lookup]);

  // Measure after the note renders (real height), then keep it glued to its word.
  useLayoutEffect(() => {
    if (!lookup) {
      setPlacement(null);
      return;
    }
    reposition();
    let raf = 0;
    const schedule = () => {
      if (raf === 0) {
        raf = window.requestAnimationFrame(() => {
          raf = 0;
          reposition();
        });
      }
    };
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (ro && noteRef.current) ro.observe(noteRef.current);
    return () => {
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      ro?.disconnect();
      if (raf !== 0) window.cancelAnimationFrame(raf);
    };
  }, [lookup, reposition]);

  // Move focus into the note when it opens so keyboard and screen-reader users land on it.
  // (Waits until the note is placed: a visibility:hidden element cannot take focus.)
  const isPlaced = placement !== null;
  useEffect(() => {
    if (lookup && isPlaced) noteRef.current?.focus({ preventScroll: true });
  }, [lookup, isPlaced]);

  // Close on Escape (focus returns to the word) or on a click outside the note.
  useEffect(() => {
    if (!lookup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeDictionary(true);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (noteRef.current?.contains(target)) return;
      if (target.closest('[data-glossary-term]')) return;
      closeDictionary(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [lookup, closeDictionary]);

  const ctxValue = useMemo<CrayonDictionaryContextValue>(
    () => ({
      openTerm,
      closeDictionary,
      activeEntryId: lookup?.entry.id ?? null,
      theme,
    }),
    [openTerm, closeDictionary, lookup?.entry.id, theme]
  );

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
          id={NOTE_DOM_ID}
          role="dialog"
          tabIndex={-1}
          aria-label={`Crayón Diccionario: ${lookup.entry.term}`}
          data-testid="crayon-dictionary-note"
          data-placement={placement?.placement}
          style={{
            ...(placement
              ? {
                  left: placement.left,
                  top: placement.placement === 'sheet' ? undefined : placement.top,
                  right: placement.right,
                  bottom: placement.bottom,
                  width: placement.width,
                }
              : { left: -9999, top: 0, width: NOTE_WIDTH }),
            visibility: placement ? 'visible' : 'hidden',
            backgroundColor: noteBg,
          }}
          className="fixed z-50 margin-note-slip outline-none px-3.5 py-3.5 sm:px-4 sm:py-4 flex gap-2.5 shadow-[4px_7px_22px_rgba(14,16,22,0.22)]"
        >
          {placement?.tickX !== undefined && (
            <span
              aria-hidden="true"
              className="absolute w-3 h-3 rotate-45 border-[var(--ink-frame-border)]"
              style={{
                left: placement.tickX - 6,
                backgroundColor: noteBg,
                ...(placement.placement === 'below'
                  ? { top: -7, borderTopWidth: 1.5, borderLeftWidth: 1.5 }
                  : { bottom: -7, borderBottomWidth: 1.5, borderRightWidth: 1.5 }),
              }}
            />
          )}
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
                onClick={() => closeDictionary(true)}
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
                    closeDictionary(false);
                  }}
                  className="inline-flex items-center gap-1 font-display text-[14.5px] hover:underline cursor-pointer"
                  style={{ color: activeAccent }}
                >
                  <span>
                    Explorar en {lookup.entry.relatedModuleId}
                    {STUDY_MODULES[lookup.entry.relatedModuleId]
                      ? `: ${STUDY_MODULES[lookup.entry.relatedModuleId].shortLabel}`
                      : ''}
                  </span>
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
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-controls={isOpen ? NOTE_DOM_ID : undefined}
            title={`Definición en Crayón Diccionario: ${tok.entry.term}`}
            style={{
              textDecorationColor: accent,
              backgroundColor: isOpen
                ? `${accent}${ctx.theme === 'paper' ? '22' : '2A'}`
                : 'transparent',
            }}
            className="inline p-0 m-0 border-0 text-inherit underline decoration-wavy decoration-[1.5px] underline-offset-[3px] rounded-xs cursor-pointer transition-colors hover:opacity-85"
          >
            {tok.value}
          </button>
        );
      })}
    </>
  );
}
