import { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import { CrayonArrowRight, CrayonClose, CrayonReset } from './CrayonIcons';
import { CURRICULUM_BLOCKS, SCENES } from '../core/curriculum';
import { globalFirstDrawRegistry } from '../core/firstDrawRegistry';
import { GUIDED_LESSONS } from '../core/lessons';
import { getUiCrayonHex } from '../core/palette';
import type { BktSkillState, SceneId, SkillId, ThemeMode } from '../core/types';
import { CrayonProgressStroke, RoughDivider } from './RoughElements';
import { animateSvgStrokesOnce } from './svgDrawAnimation';

interface CurriculumMapModalProps {
  open: boolean;
  activeSceneId: SceneId;
  bktMap: Record<SkillId, BktSkillState>;
  completedStepIds: ReadonlySet<string>;
  theme: ThemeMode;
  onSelectScene: (sceneId: SceneId, replayIntro?: boolean) => void;
  onClose: () => void;
  onResetProgress: () => void;
}

/**
 * Hand-drawn Rough.js course map connecting the 6 curriculum blocks as a visual index.
 * Uses the converged graphite + cobalt UI palette so it reads calmly and cohesively.
 */
function CurriculumDagDiagram({
  theme,
  onJumpToBlock,
}: {
  theme: ThemeMode;
  onJumpToBlock: (blockId: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [labelsVisible, setLabelsVisible] = useState(() =>
    globalFirstDrawRegistry.hasBeenDrawn('graph:curriculum-dag')
  );

  const nodes = [
    { id: 'block-1', num: '01', name: 'Álgebra Lineal', x: 80, y: 68, active: true, crayon: 'cobalt' as const },
    { id: 'block-2', num: '02', name: 'Cálculo Multi.', x: 300, y: 34, active: true, crayon: 'cobalt' as const },
    { id: 'block-3', num: '03', name: 'Cálculo Aplic.', x: 300, y: 102, active: false, crayon: 'pencil' as const },
    { id: 'block-4', num: '04', name: 'Mét. Numéricos', x: 525, y: 34, active: false, crayon: 'pencil' as const },
    { id: 'block-5', num: '05', name: 'Discretas y Grafos', x: 525, y: 102, active: false, crayon: 'pencil' as const },
    { id: 'block-6', num: '06', name: 'Probabilidad / TI', x: 745, y: 68, active: false, crayon: 'pencil' as const },
  ];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);

    const edges: Array<[number, number]> = [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [0, 4],
      [1, 5],
      [4, 5],
    ];

    const linkStroke = getUiCrayonHex('pencil', theme);
    edges.forEach(([a, b], i) => {
      const nA = nodes[a];
      const nB = nodes[b];
      svg.appendChild(
        rc.line(nA.x + 21, nA.y, nB.x - 21, nB.y, {
          seed: 70 + i * 11,
          stroke: linkStroke,
          strokeWidth: 1.5,
          roughness: 1.35,
        })
      );
    });

    nodes.forEach((n, i) => {
      const col = getUiCrayonHex(n.crayon, theme);
      svg.appendChild(
        rc.circle(n.x, n.y, 38, {
          seed: 20 + i * 9,
          stroke: col,
          strokeWidth: n.active ? 2.4 : 1.45,
          fill: n.active ? col : undefined,
          fillStyle: 'hachure',
          hachureGap: 6.5,
          fillWeight: 0.65,
          roughness: 1.45,
        })
      );
    });

    const animated = animateSvgStrokesOnce(svg, 'graph:curriculum-dag', {
      durationMs: 420,
      staggerMs: 35,
      maxTotalStaggerMs: 340,
      onComplete: () => setLabelsVisible(true),
    });
    if (animated) {
      setLabelsVisible(false);
    }
  }, [theme]);

  return (
    <div className="relative w-full max-w-[825px] mx-auto aspect-[825/146] hidden md:block select-none">
      <svg ref={svgRef} viewBox="0 0 825 146" className="w-full h-full block crayon-stroke-svg" />
      <div className="absolute inset-0">
        {nodes.map((n, i) => (
          <div key={n.num}>
            <button
              type="button"
              onClick={() => n.active && onJumpToBlock(n.id)}
              disabled={!n.active}
              style={{
                left: `${(n.x / 825) * 100}%`,
                top: `${(n.y / 146) * 100}%`,
                opacity: labelsVisible ? 1 : 0,
                animationDelay: labelsVisible ? `${i * 35}ms` : undefined,
              }}
              aria-label={`Ir al bloque ${n.num}: ${n.name}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center font-display text-[17px] text-[var(--text-primary)] transition-opacity duration-300 ${
                n.active ? 'cursor-pointer hover:scale-105' : 'cursor-default'
              } ${labelsVisible ? 'crayon-label-reveal' : ''}`}
            >
              {n.num}
            </button>
            <span
              style={{
                left: `${(n.x / 825) * 100}%`,
                top: `${((n.y + 29) / 146) * 100}%`,
                opacity: labelsVisible ? 1 : 0,
                animationDelay: labelsVisible ? `${i * 35 + 60}ms` : undefined,
              }}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[14px] text-[var(--text-secondary)] whitespace-nowrap transition-opacity duration-300 ${
                labelsVisible ? 'crayon-label-reveal' : ''
              }`}
            >
              {n.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CurriculumMapModal({
  open,
  activeSceneId,
  bktMap,
  completedStepIds,
  theme,
  onSelectScene,
  onClose,
  onResetProgress,
}: CurriculumMapModalProps) {
  if (!open) return null;

  const totalSteps = Object.values(GUIDED_LESSONS).reduce((acc, l) => acc + l.steps.length, 0);
  const doneSteps = Object.values(GUIDED_LESSONS).reduce(
    (acc, l) => acc + l.steps.filter((s) => completedStepIds.has(s.id)).length,
    0
  );

  const jumpToBlock = (blockId: string) => {
    const el = document.getElementById(`index-${blockId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Índice del Curso BIBIFOLD"
      className="fixed inset-0 z-40 notebook-paper-bg flex flex-col"
    >
      {/* Clean Top Index Header */}
      <div className="relative px-6 md:px-10 h-[60px] flex items-center justify-between gap-6 shrink-0 crayon-surface">
        <div className="flex items-baseline gap-4">
          <h2 className="font-display crayon-ink text-[26px] sm:text-[28px] leading-none text-[var(--text-primary)]">
            Índice del Curso
          </h2>
          <span className="hidden sm:inline text-[15px] text-[var(--text-muted)]">
            {doneSteps} de {totalSteps} pasos completados
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 font-display text-[19px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
        >
          <span>Volver a la lección</span>
          <CrayonClose size={18} />
        </button>
      </div>

      <RoughDivider theme={theme} seed={401} />

      <div className="flex-1 overflow-y-auto notebook-scroll px-6 md:px-10 py-6">
        <div className="max-w-[1100px] mx-auto space-y-8">
          {/* Hand-drawn visual curriculum map acting as interactive index overview */}
          <CurriculumDagDiagram theme={theme} onJumpToBlock={jumpToBlock} />

          {/* Active Course Modules (1 & 2) — Clean Sketchbook Table of Contents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {CURRICULUM_BLOCKS.filter((b) => b.status === 'active').map((block) => {
              const scenes = block.sceneIds.map((id) => SCENES[id]);

              return (
                <section key={block.id} id={`index-${block.id}`} className="space-y-4">
                  <div className="pb-2 border-b-2 border-dashed border-[var(--hairline-strong)] flex items-baseline justify-between gap-4">
                    <div>
                      <p className="text-[14px] text-[var(--text-muted)]">
                        Módulo 0{block.index}
                      </p>
                      <h3 className="font-display crayon-ink text-[26px] leading-tight text-[var(--text-primary)]">
                        {block.title}
                      </h3>
                    </div>
                    <span className="text-[14.5px] text-[var(--text-muted)] whitespace-nowrap">
                      {scenes.length} lecciones
                    </span>
                  </div>

                  <div className="divide-y divide-dashed divide-[var(--hairline)]">
                    {scenes.map((scene) => {
                      const skill = bktMap[scene.skillId];
                      const pct = Math.round((skill?.pL ?? 0.25) * 100);
                      const lesson = GUIDED_LESSONS[scene.id];
                      const stepsDone = lesson.steps.filter((s) =>
                        completedStepIds.has(s.id)
                      ).length;
                      const isCurrent = scene.id === activeSceneId;

                      return (
                        <div
                          key={scene.id}
                          className="py-3.5 flex items-start justify-between gap-4 group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectScene(scene.id);
                              onClose();
                            }}
                            className="flex-1 text-left space-y-0.5 cursor-pointer"
                          >
                            <div className="flex items-baseline gap-2.5">
                              <span className="font-display text-[16px] text-[var(--text-muted)]">
                                0{lesson.lessonNumber}
                              </span>
                              <span
                                className={`font-display text-[21px] leading-tight transition-colors ${
                                  isCurrent
                                    ? 'text-[var(--ui-accent)] underline decoration-2 underline-offset-4'
                                    : 'text-[var(--text-primary)] group-hover:text-[var(--ui-accent)]'
                                }`}
                              >
                                {scene.title}
                              </span>
                            </div>
                            <p className="text-[14.5px] text-[var(--text-secondary)] pl-7">
                              {scene.subtitle}
                            </p>
                          </button>

                          <div className="flex items-center gap-3 shrink-0 pt-1">
                            <div className="text-right">
                              <div className="text-[13px] text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                                {stepsDone}/3 pasos
                              </div>
                              <CrayonProgressStroke
                                percent={
                                  (skill?.attempts ?? 0) > 0
                                    ? Math.max(pct, (stepsDone / 3) * 100)
                                    : (stepsDone / 3) * 100
                                }
                                crayon="sage"
                                theme={theme}
                                seed={lesson.lessonNumber * 29}
                                className="w-14 h-[9px]"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectScene(scene.id);
                                onClose();
                              }}
                              aria-label={`Abrir lección ${lesson.lessonNumber}: ${scene.title}`}
                              className="p-1 text-[var(--text-muted)] group-hover:text-[var(--ui-accent)] cursor-pointer transition-transform group-hover:translate-x-0.5"
                            >
                              <CrayonArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <RoughDivider theme={theme} seed={419} />

          {/* Future Chapters Roadmap — concise, readable */}
          <section className="space-y-4">
            <div>
              <h3 className="font-display crayon-ink text-[23px] text-[var(--text-primary)]">
                Próximos cuadernos (Módulos 03–06)
              </h3>
              <p className="text-[15px] text-[var(--text-secondary)]">
                Siguientes temas planeados en la ruta de matemáticas visuales para ingeniería.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
              {CURRICULUM_BLOCKS.filter((b) => b.status === 'phase2').map((block) => (
                <div
                  key={block.id}
                  className="pt-3 border-t border-dashed border-[var(--hairline)] space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-display text-[20px] text-[var(--text-primary)]">
                      0{block.index}. {block.title}
                    </h4>
                    <span className="text-[13.5px] text-[var(--text-muted)] whitespace-nowrap">
                      Próximamente
                    </span>
                  </div>
                  <p className="text-[14.5px] text-[var(--text-secondary)] leading-snug">
                    {block.csTopics.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Quiet progress reset footer */}
          <div className="pt-4 pb-6 border-t border-dashed border-[var(--hairline)] flex items-center justify-between gap-4">
            <p className="text-[14px] text-[var(--text-muted)]">
              Tu avance se guarda automáticamente en este navegador.
            </p>
            <button
              type="button"
              onClick={onResetProgress}
              className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap transition-colors"
            >
              <CrayonReset size={15} />
              <span>Reiniciar progreso</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
