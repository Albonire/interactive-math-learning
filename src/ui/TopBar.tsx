import { SCENES } from '../core/curriculum';
import { GUIDED_LESSONS } from '../core/lessons';
import type { SceneId, ThemeMode } from '../core/types';
import {
  CrayonLeaf,
  CrayonMoon,
  CrayonSoundOff,
  CrayonSoundOn,
  CrayonSun,
} from './CrayonIcons';
import { RoughDivider, RoughUnderline } from './RoughElements';

interface TopBarProps {
  activeSceneId: SceneId;
  drawerMode: 'closed' | 'computational' | 'challenge';
  mapOpen: boolean;
  theme: ThemeMode;
  ecoMode: boolean;
  audioEnabled: boolean;
  onToggleMap: () => void;
  onOpenIntro: () => void;
  onToggleInspector: () => void;
  onToggleTheme: () => void;
  onToggleEcoMode: () => void;
  onToggleAudio: () => void;
}

/**
 * Calm, Intuitive 3-Zone Sketchbook Top Bar (converged graphite + cobalt palette):
 * - Zone 1: BIBIFOLD wordmark + quiet current lesson indicator (opens Índice)
 * - Zone 2: 3 clean editorial links (Índice · Teoría · Código)
 * - Zone 3: Subtle environment switches (Sonido · Eco · Pizarra/Papel)
 */
export function TopBar({
  activeSceneId,
  drawerMode,
  mapOpen,
  theme,
  ecoMode,
  audioEnabled,
  onToggleMap,
  onOpenIntro,
  onToggleInspector,
  onToggleTheme,
  onToggleEcoMode,
  onToggleAudio,
}: TopBarProps) {
  const meta = SCENES[activeSceneId];
  const lesson = GUIDED_LESSONS[activeSceneId];
  const audioEffectivelyOn = audioEnabled && !ecoMode;

  const linkClass = (isActive: boolean) =>
    `relative py-1 font-display text-[19px] leading-none whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
      isActive
        ? 'text-[var(--ui-accent)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <header className="relative z-30 w-full crayon-surface shrink-0">
      <div className="h-[54px] px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand + quiet current lesson marker */}
        <div className="flex items-baseline gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (mapOpen) onToggleMap();
            }}
            className="font-display crayon-ink text-[25px] sm:text-[27px] leading-none tracking-wide text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            BIBIFOLD
          </button>

          <span className="hidden sm:inline text-[var(--hairline-strong)]" aria-hidden="true">
            ·
          </span>

          <button
            type="button"
            onClick={onToggleMap}
            title="Abrir Índice del Curso"
            className="hidden sm:inline-flex items-baseline gap-1.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] truncate cursor-pointer transition-colors"
          >
            <span className="text-[var(--text-muted)] whitespace-nowrap">
              Lección {lesson.lessonNumber}/8
            </span>
            <span className="font-display text-[17.5px] text-[var(--text-primary)] truncate">
              {meta.shortLabel}
            </span>
          </button>
        </div>

        {/* Zone 2: Clean 3-Link Editorial Navigation (converged cobalt active underline) */}
        <nav aria-label="Navegación de la lección" className="flex items-center gap-5 sm:gap-7">
          <button type="button" onClick={onToggleMap} className={linkClass(mapOpen)}>
            Índice
            {mapOpen && (
              <span className="absolute left-0 right-0 -bottom-1">
                <RoughUnderline crayon="cobalt" theme={theme} seed={31} />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenIntro}
            title="Ver introducción teórica en pantalla completa"
            className={linkClass(false)}
          >
            Teoría
          </button>

          <button
            type="button"
            onClick={onToggleInspector}
            aria-expanded={drawerMode === 'computational'}
            className={linkClass(drawerMode === 'computational')}
          >
            Código
            {drawerMode === 'computational' && (
              <span className="absolute left-0 right-0 -bottom-1">
                <RoughUnderline crayon="cobalt" theme={theme} seed={43} />
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: Quiet Environment Switches */}
        <div className="flex items-center gap-3.5 sm:gap-5 shrink-0">
          <button
            type="button"
            data-testid="toggle-audio-btn"
            onClick={onToggleAudio}
            aria-pressed={audioEffectivelyOn}
            aria-label={
              ecoMode
                ? 'Sonido de crayón silenciado por Modo Eco'
                : audioEnabled
                  ? 'Silenciar sonido sutil de crayón'
                  : 'Activar sonido sutil de crayón'
            }
            title={
              ecoMode
                ? 'Audio silenciado automáticamente mientras Modo Eco está activo'
                : audioEnabled
                  ? 'Sonido sutil de trazo de crayón y papel activo (clic para silenciar)'
                  : 'Activar sonido sutil de trazo de crayón y papel'
            }
            className={`relative py-1 inline-flex items-center gap-1 text-[15px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              ecoMode
                ? 'text-[var(--text-muted)] opacity-60 hover:opacity-85'
                : audioEnabled
                  ? 'text-[var(--text-primary)] hover:text-[var(--ui-accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {audioEffectivelyOn ? <CrayonSoundOn size={15} /> : <CrayonSoundOff size={15} />}
            <span className="hidden md:inline">
              {audioEffectivelyOn ? 'Sonido' : 'Silencio'}
            </span>
          </button>

          <button
            type="button"
            data-testid="toggle-eco-btn"
            onClick={onToggleEcoMode}
            aria-pressed={ecoMode}
            aria-label={
              ecoMode
                ? 'Desactivar Modo Eco de ahorro energético'
                : 'Activar Modo Eco de ahorro energético'
            }
            title="Modo Eco: suaviza la textura SVG y limita WebGL a 24 FPS para ahorrar batería"
            className={`relative py-1 inline-flex items-center gap-1 text-[15px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              ecoMode
                ? 'font-display text-[17.5px] text-[var(--ui-success)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CrayonLeaf size={15} />
            <span className="hidden xs:inline sm:inline">Eco</span>
            {ecoMode && (
              <span className="absolute left-0 right-0 -bottom-1">
                <RoughUnderline crayon="sage" theme={theme} seed={57} />
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={
              theme === 'paper'
                ? 'Cambiar a tema Pizarra Oscura'
                : 'Cambiar a tema Papel Blanco'
            }
            className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {theme === 'paper' ? (
              <>
                <CrayonMoon size={16} />
                <span className="hidden sm:inline">Pizarra</span>
              </>
            ) : (
              <>
                <CrayonSun size={16} />
                <span className="hidden sm:inline">Papel</span>
              </>
            )}
          </button>
        </div>
      </div>

      <RoughDivider theme={theme} seed={101} />
    </header>
  );
}
