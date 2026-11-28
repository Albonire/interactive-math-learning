import { SCENES } from '../core/curriculum';
import { STUDY_MODULES } from '../core/studyPlan';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { SceneId, ThemeMode } from '../core/types';
import {
  CrayonLeaf,
  CrayonMoon,
  CrayonMusicNote,
  CrayonSoundOff,
  CrayonSoundOn,
  CrayonSun,
} from './CrayonIcons';
import { RoughDivider, RoughUnderline } from './RoughElements';

interface TopBarProps {
  appView: 'module' | 'lab3d';
  activeModuleId: StudyModuleId;
  activeSceneId: SceneId;
  drawerMode: 'closed' | 'computational' | 'challenge';
  mapOpen: boolean;
  diagnosticOpen: boolean;
  diagnosticDone: boolean;
  rhythmOpen: boolean;
  rhythmPlaying: boolean;
  rhythmBpm: number | null;
  theme: ThemeMode;
  ecoMode: boolean;
  audioEnabled: boolean;
  onBackToModule: () => void;
  onToggleMap: () => void;
  onToggleDiagnostic: () => void;
  onOpenLinked3D: () => void;
  onOpenIntro: () => void;
  onToggleInspector: () => void;
  onToggleTheme: () => void;
  onToggleEcoMode: () => void;
  onToggleAudio: () => void;
  onToggleRhythm: () => void;
}

/**
 * Calm, Intuitive 3-Zone Sketchbook Top Bar:
 * - Zone 1: BIBIFOLD wordmark + active module/lab indicator
 * - Zone 2: Clean editorial navigation (Plan · Diagnóstico · Lab 3D OR ← M# · Plan · Teoría · Código)
 * - Zone 3: Environment switches (Ritmo · Sonido · Eco · Pizarra/Papel)
 */
export function TopBar({
  appView,
  activeModuleId,
  activeSceneId,
  drawerMode,
  mapOpen,
  diagnosticOpen,
  diagnosticDone,
  rhythmOpen,
  rhythmPlaying,
  rhythmBpm,
  theme,
  ecoMode,
  audioEnabled,
  onBackToModule,
  onToggleMap,
  onToggleDiagnostic,
  onOpenLinked3D,
  onOpenIntro,
  onToggleInspector,
  onToggleTheme,
  onToggleEcoMode,
  onToggleAudio,
  onToggleRhythm,
}: TopBarProps) {
  const mod = STUDY_MODULES[activeModuleId];
  const sceneMeta = SCENES[activeSceneId];
  const audioEffectivelyOn = audioEnabled && !ecoMode;

  const linkClass = (isActive: boolean) =>
    `relative py-1.5 font-display text-[15.5px] sm:text-[18.5px] md:text-[19px] leading-none whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer ${
      isActive
        ? 'text-[var(--ui-accent)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <header className="relative z-30 w-full crayon-surface shrink-0">
      <div className="h-[50px] sm:h-[54px] px-2 sm:px-5 lg:px-6 flex items-center justify-between gap-1.5 sm:gap-4 lg:gap-8">
        {/* Zone 1: Brand + quiet active module marker */}
        <div className="flex items-baseline gap-2 sm:gap-3 min-w-0 shrink-0 lg:shrink">
          <button
            type="button"
            onClick={() => {
              if (mapOpen) onToggleMap();
              if (appView === 'lab3d') onBackToModule();
            }}
            className="font-display crayon-ink text-[18px] sm:text-[24px] lg:text-[27px] leading-none tracking-wide text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
          >
            BIBIFOLD
          </button>

          <span className="hidden lg:inline text-[var(--hairline-strong)]" aria-hidden="true">
            ·
          </span>

          <button
            type="button"
            onClick={onToggleMap}
            title="Abrir Plan Curricular (7 Fases, 32 Módulos)"
            className="hidden lg:inline-flex items-baseline gap-1.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] truncate cursor-pointer transition-colors"
          >
            <span className="text-[var(--text-muted)] whitespace-nowrap font-mono text-[13px]">
              {appView === 'lab3d' ? `Lab 3D · ${mod.id}` : `${mod.id}/32`}
            </span>
            <span className="font-display text-[17.5px] text-[var(--text-primary)] truncate">
              {appView === 'lab3d' ? sceneMeta.shortLabel : mod.shortLabel}
            </span>
          </button>
        </div>

        {/* Zone 2: Clean Editorial Navigation */}
        <nav aria-label="Navegación principal" className="flex items-center gap-2.5 sm:gap-5 lg:gap-7 shrink-0">
          {appView === 'lab3d' && (
            <button
              type="button"
              data-testid="back-to-module-btn"
              onClick={onBackToModule}
              className={linkClass(false)}
            >
              ← {mod.id}
            </button>
          )}

          <button
            type="button"
            data-testid="nav-plan-btn"
            onClick={onToggleMap}
            className={linkClass(mapOpen)}
          >
            Plan
            {mapOpen && (
              <span aria-hidden="true" className="absolute left-0 right-0 -bottom-0.5">
                <RoughUnderline crayon="cobalt" theme={theme} seed={31} />
              </span>
            )}
          </button>

          {appView === 'module' ? (
            <>
              <button
                type="button"
                data-testid="nav-diagnostic-btn"
                onClick={onToggleDiagnostic}
                className={linkClass(diagnosticOpen)}
              >
                <span className="hidden sm:inline">Diagnóstico</span>
                <span className="sm:hidden">Diag.</span>
                {diagnosticDone && !diagnosticOpen && (
                  <span className="ml-0.5 sm:ml-1 text-[12px] text-[var(--ui-success)]" aria-label="completado">
                    ✓
                  </span>
                )}
                {diagnosticOpen && (
                  <span aria-hidden="true" className="absolute left-0 right-0 -bottom-0.5">
                    <RoughUnderline crayon="cobalt" theme={theme} seed={43} />
                  </span>
                )}
              </button>

              <button
                type="button"
                data-testid="nav-lab3d-btn"
                onClick={onOpenLinked3D}
                title="Abrir laboratorio 3D interactivo"
                className={linkClass(false)}
              >
                <span className="hidden sm:inline">Lab 3D</span>
                <span className="sm:hidden">3D</span>
              </button>
            </>
          ) : (
            <>
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
                  <span className="absolute left-0 right-0 -bottom-0.5">
                    <RoughUnderline crayon="cobalt" theme={theme} seed={43} />
                  </span>
                )}
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Quiet Environment Switches */}
        <div className="flex items-center gap-1.5 sm:gap-3.5 lg:gap-5 shrink-0">
          <button
            type="button"
            data-testid="toggle-rhythm-btn"
            onClick={onToggleRhythm}
            aria-expanded={rhythmOpen}
            aria-label={
              rhythmPlaying && rhythmBpm
                ? `Ritmo activo a ${Math.round(rhythmBpm)} BPM (abrir panel de música)`
                : 'Abrir música de fondo y sincronización de trazos'
            }
            title="Música de estudio con detector de tempo y sincronización sutil de trazos"
            className={`relative p-1.5 sm:p-1 inline-flex items-center gap-1 text-[15px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              ecoMode
                ? 'text-[var(--text-muted)] opacity-60 hover:opacity-85'
                : rhythmPlaying || rhythmOpen
                  ? 'text-[var(--ui-accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CrayonMusicNote size={16} />
            <span className="hidden md:inline">
              {rhythmPlaying && rhythmBpm && !ecoMode ? `${Math.round(rhythmBpm)} BPM` : 'Ritmo'}
            </span>
            {(rhythmOpen || (rhythmPlaying && !ecoMode)) && (
              <span className="absolute left-0.5 right-0.5 -bottom-0.5">
                <RoughUnderline
                  crayon={rhythmPlaying && !ecoMode ? 'sage' : 'cobalt'}
                  theme={theme}
                  seed={63}
                />
              </span>
            )}
          </button>

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
            className={`relative p-1.5 sm:p-1 inline-flex items-center gap-1 text-[15px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              ecoMode
                ? 'text-[var(--text-muted)] opacity-60 hover:opacity-85'
                : audioEnabled
                  ? 'text-[var(--text-primary)] hover:text-[var(--ui-accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {audioEffectivelyOn ? <CrayonSoundOn size={16} /> : <CrayonSoundOff size={16} />}
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
            className={`relative p-1.5 sm:p-1 inline-flex items-center gap-1 text-[15px] whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              ecoMode
                ? 'font-display text-[17px] text-[var(--ui-success)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CrayonLeaf size={16} />
            <span className="hidden md:inline">Eco</span>
            {ecoMode && (
              <span className="absolute left-0.5 right-0.5 -bottom-0.5">
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
            className="p-1.5 sm:p-1 inline-flex items-center gap-1.5 text-[15px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {theme === 'paper' ? (
              <>
                <CrayonMoon size={16} />
                <span className="hidden md:inline">Pizarra</span>
              </>
            ) : (
              <>
                <CrayonSun size={16} />
                <span className="hidden md:inline">Papel</span>
              </>
            )}
          </button>
        </div>
      </div>

      <RoughDivider theme={theme} seed={101} />
    </header>
  );
}
