/**
 * Cartographer's notebook HUD: today's trazos against the daily goal (a hand-drawn ring), the
 * current level, and a panel with the level path, goal choice and achievement stamps.
 * Plus GameToasts: short crayon notes when trazos, the daily goal or an achievement are earned.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getCrayonHex } from '../core/palette';
import type { ThemeMode } from '../core/types';
import {
  ACHIEVEMENTS,
  DAILY_GOAL_OPTIONS,
  LEVELS,
  type DailyGoal,
  type GameState,
} from '../storage/gameProgress';
import { handifySvgTree } from '../visuals/handDrawnSvg';
import { CrayonProgressStroke } from './RoughElements';

/** "2026-11-28" → "28 nov" (local calendar day, no time-zone shift). */
export function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');
}

interface HudProps {
  theme: ThemeMode;
  state: GameState;
  total: number;
  todayXp: number;
  level: { index: number; name: string; floor: number; next: number | null; progress: number };
  onSetGoal: (g: DailyGoal) => void;
  onShowGuide?: () => void;
}

function GoalRing({ theme, fraction, size = 30 }: { theme: ThemeMode; fraction: number; size?: number }) {
  const r = 11;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  const done = f >= 1;
  const color = getCrayonHex(done ? 'sage' : 'cobalt', theme);
  const pencil = getCrayonHex('pencil', theme);
  return (
    <svg viewBox="0 0 30 30" width={size} height={size} aria-hidden="true">
      {handifySvgTree(<circle cx="15" cy="15" r={r} fill="none" stroke={pencil} strokeWidth="1.4" strokeDasharray="3 3" />, 'ring', true)}
      <circle
        cx="15"
        cy="15"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * f} ${c}`}
        transform="rotate(-90 15 15)"
        style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)' }}
      />
      {done && <path d="M10 15.5 L13.6 19 L20.5 11.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />}
    </svg>
  );
}

export function GameHud({ theme, state, total, todayXp, level, onSetGoal, onShowGuide }: HudProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  const goal = state.goal;
  const earned = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;

  return (
    <div ref={wrapRef} className="relative" data-testid="game-hud">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Hoy ${todayXp} de ${goal} trazos. Nivel ${level.index + 1}: ${level.name}. Abrir cuaderno de logros.`}
        className="flex items-center gap-1.5 cursor-pointer font-hand text-[13.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <GoalRing theme={theme} fraction={todayXp / goal} />
        <span className="tabular-nums" data-testid="game-today">
          {Math.min(todayXp, 999)}/{goal}
        </span>
        <span className="hidden sm:inline text-[var(--text-muted)]">· {level.name}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Cuaderno de logros"
          data-testid="game-panel"
          className="margin-note-slip absolute right-0 top-[calc(100%+8px)] z-50 w-[min(92vw,360px)] p-4 space-y-3.5"
          style={{ backgroundColor: theme === 'paper' ? 'rgba(253,250,241,0.98)' : 'rgba(20,25,34,0.98)' }}
        >
          <div>
            <div className="font-hand text-[13px] text-[var(--ui-accent)]">Cuaderno del cartógrafo</div>
            <div className="font-display text-[21px] text-[var(--text-primary)] leading-tight">
              Nivel {level.index + 1} · {level.name}
            </div>
            <div className="mt-1.5" aria-hidden="true">
              <CrayonProgressStroke percent={Math.round(level.progress * 100)} crayon="cobalt" theme={theme} seed={71 + level.index} className="w-full h-[12px]" />
            </div>
            <div className="mt-1 font-hand text-[13px] text-[var(--text-muted)]">
              {total} trazos
              {level.next !== null ? ` · faltan ${level.next - total} para ${LEVELS[level.index + 1].name}` : ' · atlas completo'}
            </div>
          </div>

          <div>
            <div className="font-hand text-[14px] text-[var(--text-secondary)] mb-1">Meta diaria</div>
            <div className="flex gap-2" role="radiogroup" aria-label="Meta diaria de trazos">
              {DAILY_GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={goal === g}
                  onClick={() => onSetGoal(g)}
                  data-active={goal === g ? 'true' : undefined}
                  className={`sketch-btn flex-1 px-1.5 py-1 cursor-pointer whitespace-nowrap text-[13px] ${goal === g ? 'font-display text-[var(--ui-accent)]' : 'font-hand text-[var(--text-secondary)]'}`}
                >
                  {g} {g === 20 ? '· suave' : g === 40 ? '· constante' : '· intensa'}
                </button>
              ))}
            </div>
            <p className="mt-1 font-hand text-[12.5px] text-[var(--text-muted)]">
              Un reto resuelto da 10, ejecutar el código 10, sellar un módulo 30, un repaso recordado 20.
            </p>
          </div>

          <div>
            <div className="font-hand text-[14px] text-[var(--text-secondary)] mb-1.5">
              Logros · {earned}/{ACHIEVEMENTS.length}
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {ACHIEVEMENTS.map((a) => {
                const on = state.achievements[a.id];
                return (
                  <li
                    key={a.id}
                    data-tone={on ? 'success' : undefined}
                    className={`sketch-card px-2 py-1.5 text-[12.5px] leading-snug ${on ? '' : 'opacity-55'}`}
                    title={a.detail}
                  >
                    <div className={`font-display text-[14px] ${on ? 'text-[var(--ui-success)]' : 'text-[var(--text-secondary)]'}`}>
                      {on ? '✓ ' : ''}
                      {a.title}
                    </div>
                    <div className="font-hand text-[var(--text-muted)]">{on ? `Logrado el ${formatDay(on)}` : a.detail}</div>
                  </li>
                );
              })}
            </ul>
          </div>
          {onShowGuide && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onShowGuide();
              }}
              className="font-hand text-[14px] text-[var(--ui-accent)] underline decoration-dotted cursor-pointer"
            >
              ¿Cómo funciona el cuaderno?
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Toasts ────────────────────────────────────────────────────────────────────

export interface GameToast {
  id: number;
  title: string;
  detail?: string;
  tone: 'xp' | 'goal' | 'achievement';
}

export function useGameToasts() {
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const nextId = useRef(1);
  const push = useCallback((t: Omit<GameToast, 'id'>) => {
    const id = nextId.current++;
    // Keep at most three on screen; the oldest leaves first.
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.tone === 'xp' ? 2400 : 4200);
  }, []);
  return { toasts, push };
}

export function GameToasts({ toasts }: { toasts: GameToast[] }) {
  return (
    <div
      className="fixed z-[60] bottom-4 right-4 left-4 sm:left-auto flex flex-col items-center sm:items-end gap-2 pointer-events-none"
      aria-live="polite"
      data-testid="game-toasts"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`game-toast margin-note-slip px-3.5 py-2 max-w-[320px] ${t.tone === 'achievement' ? 'game-toast-achievement' : ''}`}
        >
          <div
            className={`font-display text-[17px] leading-tight ${
              t.tone === 'xp' ? 'text-[var(--ui-accent)]' : 'text-[var(--ui-success)]'
            }`}
          >
            {t.title}
          </div>
          {t.detail && <div className="font-hand text-[13.5px] text-[var(--text-secondary)]">{t.detail}</div>}
        </div>
      ))}
    </div>
  );
}
