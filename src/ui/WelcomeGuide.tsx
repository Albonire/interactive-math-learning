/**
 * First-visit welcome for a learner who does not know the plan yet: what this is, how a module
 * works (four verbs), how the dictionary works, a daily goal, and two ways to start.
 * Shown once (remembered in localStorage, or for the session if storage is blocked) and can be
 * reopened from the achievements notebook.
 */
import { useEffect, useRef } from 'react';
import type { ThemeMode } from '../core/types';
import { DAILY_GOAL_OPTIONS, type DailyGoal } from '../storage/gameProgress';
import { CrayonStepMarker } from './RoughElements';

const SEEN_KEY = 'bibifold_welcome_seen_v1';
let seenThisSession = false;

export function hasSeenWelcome(): boolean {
  if (seenThisSession) return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen(): void {
  seenThisSession = true;
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage blocked: remembered for this session only.
  }
}

/** Show automatically only to a brand-new learner with no progress at all. */
export function shouldAutoShowWelcome(opts: { seen: boolean; sealed: number; trazos: number }): boolean {
  return !opts.seen && opts.sealed === 0 && opts.trazos === 0;
}

const STEPS = [
  { verb: 'Toca', text: 'Cada módulo abre con un reto: manipula el dibujo hasta que algo pase.' },
  { verb: 'Recorre', text: 'Desplázate: la figura 3D cambia con cada idea, de la intuición a la fórmula.' },
  { verb: 'Consulta', text: 'El atlas resume las representaciones, el temario y la bibliografía.' },
  { verb: 'Programa y sella', text: 'Ejecuta el código en el navegador y responde para sellar el módulo.' },
] as const;

interface Props {
  theme: ThemeMode;
  goal: DailyGoal;
  onSetGoal: (g: DailyGoal) => void;
  onStartDiagnostic: () => void;
  onStartHere: () => void;
  onClose: () => void;
}

export function WelcomeGuide({ theme, goal, onSetGoal, onStartDiagnostic, onStartHere, onClose }: Props) {
  const primaryRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/45" data-testid="welcome-guide">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="sketch-modal notebook-paper-bg w-full max-w-[640px] max-h-[92dvh] overflow-y-auto px-5 py-5 sm:px-8 sm:py-7 space-y-5"
      >
        <div className="space-y-1.5">
          <div className="font-hand text-[14px] text-[var(--ui-accent)]">Cuaderno del cartógrafo</div>
          <h2 id="welcome-title" className="font-display crayon-ink text-[27px] sm:text-[31px] leading-tight text-[var(--text-primary)]">
            Vas a dibujar el mapa de las matemáticas
          </h2>
          <p className="text-[16px] leading-relaxed text-[var(--text-secondary)]">
            32 regiones en 7 fases, de los números y la lógica hasta el álgebra lineal, la probabilidad y el
            backpropagation. Cada región se entiende con las manos, se ve en 3D, se programa y se sella. Lo sellado
            vuelve en repasos espaciados para que no se olvide.
          </p>
        </div>

        <ol className="space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s.verb} className="flex items-start gap-3">
              <CrayonStepMarker index={i} active completed={false} crayon="cobalt" theme={theme} label={String(i + 1)} size={28} />
              <div>
                <div className="font-display text-[18px] text-[var(--text-primary)] leading-tight">{s.verb}</div>
                <div className="text-[14.5px] text-[var(--text-secondary)] leading-snug">{s.text}</div>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-[14.5px] text-[var(--text-secondary)]">
          Las palabras con{' '}
          <span className="underline decoration-wavy decoration-[var(--ui-accent)] underline-offset-[3px]">subrayado ondulado</span>{' '}
          abren el Crayón Diccionario: tócalas cuando un término te frene.
        </p>

        <div>
          <div className="font-hand text-[15px] text-[var(--text-primary)] mb-1.5">¿Cuánto quieres avanzar cada día?</div>
          <div className="flex gap-2" role="radiogroup" aria-label="Meta diaria de trazos">
            {DAILY_GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={goal === g}
                onClick={() => onSetGoal(g)}
                data-active={goal === g ? 'true' : undefined}
                className={`sketch-btn flex-1 px-2 py-1.5 cursor-pointer text-[14.5px] ${goal === g ? 'font-display text-[var(--ui-accent)]' : 'font-hand text-[var(--text-secondary)]'}`}
              >
                {g === 20 ? '≈ 10 min' : g === 40 ? '≈ 20 min' : '≈ 35 min'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            ref={primaryRef}
            type="button"
            onClick={onStartDiagnostic}
            data-testid="welcome-diagnostic"
            className="sketch-btn flex-1 px-4 py-2.5 cursor-pointer font-display text-[17px] text-[var(--ui-accent)]"
            data-active="true"
          >
            Hacer el diagnóstico primero
            <span className="block font-hand text-[13px] text-[var(--text-muted)]">Unos minutos para saltar lo que ya sabes</span>
          </button>
          <button
            type="button"
            onClick={onStartHere}
            data-testid="welcome-start"
            className="sketch-btn flex-1 px-4 py-2.5 cursor-pointer font-display text-[17px] text-[var(--text-primary)]"
          >
            Empezar por M1
            <span className="block font-hand text-[13px] text-[var(--text-muted)]">Desde el principio, a mi ritmo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
