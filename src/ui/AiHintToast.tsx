import type { AiHintSuggestion } from '../ai/aiHintEngine';
import type { ThemeMode } from '../core/types';
import { CrayonClose, CrayonLightbulb } from './CrayonIcons';
import { CrayonButton, RoughDivider } from './RoughElements';

interface AiHintToastProps {
  hint: AiHintSuggestion | null;
  theme: ThemeMode;
  onApply: (hint: AiHintSuggestion) => void;
  onDismiss: () => void;
}

/**
 * Artisanal notebook margin coaching card for "Pistas de IA".
 * Surfaces automatically when interaction analysis detects optimization stagnation
 * or divergence (or on demand), offering a concrete 1-click parameter adjustment.
 */
export function AiHintToast({ hint, theme, onApply, onDismiss }: AiHintToastProps) {
  if (!hint) return null;

  const isDivergence = hint.kind === 'divergence';
  const kindLabel =
    hint.kind === 'divergence'
      ? 'Divergencia detectada'
      : hint.kind === 'stagnation'
        ? 'Estancamiento detectado'
        : 'Sugerencia de ajuste';
  const accentColor = isDivergence ? 'var(--ui-warning)' : 'var(--ui-accent)';
  const hasAction = Boolean(
    hint.recommendedParams ||
      hint.recommendedActivation ||
      hint.recommendedAutoDiffPass ||
      hint.recommendedStartOptimizer
  );

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Pista de IA para ajuste de parámetros"
      data-testid="ai-hint-toast"
      data-hint-kind={hint.kind}
      className="pointer-events-auto absolute bottom-20 left-3 right-3 sm:right-auto sm:bottom-4 sm:left-6 z-[24] sm:w-[348px] max-w-none sm:max-w-[calc(100vw-32px)] bg-[var(--bg-paper)] crayon-ink-panel p-3.5 shadow-[0_12px_28px_rgba(24,25,29,0.14)] crayon-label-reveal"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p
            className="text-[12.5px] leading-none flex items-center gap-1.5"
            style={{ color: accentColor }}
          >
            <CrayonLightbulb size={14} />
            <span className="font-display text-[15px]">Pista de IA</span>
            <span className="text-[var(--hairline-strong)]" aria-hidden="true">
              ·
            </span>
            <span>{kindLabel}</span>
          </p>
          <h3 className="font-display text-[18.5px] leading-snug text-[var(--text-primary)] mt-1">
            {hint.title}
          </h3>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          data-testid="ai-hint-dismiss-btn"
          aria-label="Cerrar pista de IA"
          className="p-1 -mt-1 -mr-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
        >
          <CrayonClose size={15} />
        </button>
      </div>

      <div className="my-2">
        <RoughDivider theme={theme} seed={409} />
      </div>

      <p className="text-[13.5px] leading-snug text-[var(--text-secondary)]">
        {hint.diagnosis}
      </p>
      <p className="text-[14px] leading-snug text-[var(--text-primary)] mt-1.5">
        {hint.suggestion}
      </p>

      {hasAction && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <CrayonButton
            crayon={isDivergence ? 'vermilion' : 'cobalt'}
            theme={theme}
            variant="filled"
            seed={421}
            dataTestId="ai-hint-apply-btn"
            onClick={() => onApply(hint)}
            className="text-[15px] py-1 px-3.5"
          >
            <span>Aplicar ajuste</span>
          </CrayonButton>

          <button
            type="button"
            onClick={onDismiss}
            className="text-[13.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            Seguir probando
          </button>
        </div>
      )}
    </aside>
  );
}
