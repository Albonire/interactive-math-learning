import { useEffect, useRef, useState } from 'react';
import rough from 'roughjs';
import { CrayonArrowRight, CrayonClose, CrayonReset } from './CrayonIcons';
import { computeDecayedMastery, needsSpacedReview } from '../ai/bktEngine';
import { CURRICULUM_BLOCKS, SCENES } from '../core/curriculum';
import { GUIDED_LESSONS } from '../core/lessons';
import { ROADMAP_TIERS } from '../core/lessonSpecs';
import { getUiCrayonHex } from '../core/palette';
import type { BktSkillState, SceneId, SkillId, ThemeMode } from '../core/types';
import { CrayonProgressStroke, RoughDivider } from './RoughElements';
import { animateSvgStrokesOnce } from './svgDrawAnimation';

interface CurriculumMapModalProps {
  open: boolean;
  activeSceneId: SceneId;
  bktMap: Record<SkillId, BktSkillState>;
  completedStepIds: ReadonlySet<string>;
  completed3DChallengeScenes?: ReadonlyArray<SceneId>;
  completedSymbolicScenes?: ReadonlyArray<SceneId>;
  completedCodeLabScenes?: ReadonlyArray<SceneId>;
  theme: ThemeMode;
  onSelectScene: (sceneId: SceneId, replayIntro?: boolean) => void;
  onClose: () => void;
  onResetProgress: () => void;
  onExportProgress?: () => string;
  onImportProgress?: (rawJson: string) => { ok: boolean; message: string };
}

/**
 * Hand-drawn Rough.js course map connecting the 6 curriculum blocks as a visual index.
 * Labels are placed cleanly above top-row nodes and below bottom-row nodes with zero overlap.
 */
function CurriculumDagDiagram({
  theme,
  onJumpToBlock,
}: {
  theme: ThemeMode;
  onJumpToBlock: (blockId: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewW = 840;
  const viewH = 186;

  const nodes = [
    { id: 'block-1', num: '01', name: 'Álgebra Lineal', x: 84, y: 92, labelY: 132, active: true, crayon: 'cobalt' as const },
    { id: 'block-2', num: '02', name: 'Cálculo Multi.', x: 304, y: 54, labelY: 18, active: true, crayon: 'cobalt' as const },
    { id: 'block-3', num: '03', name: 'Cálculo Aplic.', x: 304, y: 130, labelY: 168, active: false, crayon: 'pencil' as const },
    { id: 'block-4', num: '04', name: 'Mét. Numéricos', x: 536, y: 54, labelY: 18, active: false, crayon: 'pencil' as const },
    { id: 'block-5', num: '05', name: 'Discretas y Grafos', x: 536, y: 130, labelY: 168, active: false, crayon: 'pencil' as const },
    { id: 'block-6', num: '06', name: 'Probabilidad / TI', x: 756, y: 92, labelY: 132, active: false, crayon: 'pencil' as const },
  ];

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);

    const straightEdges: Array<[number, number]> = [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [1, 5],
      [4, 5],
    ];

    const linkStroke = getUiCrayonHex('pencil', theme);
    straightEdges.forEach(([a, b], i) => {
      const nA = nodes[a];
      const nB = nodes[b];
      svg.appendChild(
        rc.line(nA.x + 22, nA.y, nB.x - 22, nB.y, {
          seed: 70 + i * 11,
          stroke: linkStroke,
          strokeWidth: 1.5,
          roughness: 1.25,
        })
      );
    });

    // Gentle mid-lane curve from 01 -> 05 so it never crosses 03 or its label
    svg.appendChild(
      rc.curve(
        [
          [nodes[0].x + 22, nodes[0].y + 4],
          [304, 92],
          [nodes[4].x - 22, nodes[4].y - 6],
        ],
        {
          seed: 147,
          stroke: linkStroke,
          strokeWidth: 1.4,
          roughness: 1.15,
        }
      )
    );

    nodes.forEach((n, i) => {
      const col = getUiCrayonHex(n.crayon, theme);
      svg.appendChild(
        rc.circle(n.x, n.y, 40, {
          seed: 20 + i * 9,
          stroke: col,
          strokeWidth: n.active ? 2.4 : 1.6,
          fill: n.active ? col : undefined,
          fillStyle: 'hachure',
          hachureGap: 6.5,
          fillWeight: 0.65,
          roughness: 1.35,
        })
      );
    });

    animateSvgStrokesOnce(svg, 'graph:curriculum-dag', {
      durationMs: 360,
      staggerMs: 28,
      maxTotalStaggerMs: 240,
    });
  }, [theme]);

  return (
    <div
      data-testid="curriculum-dag-diagram"
      className="relative w-full max-w-[840px] mx-auto aspect-[840/186] hidden md:block select-none"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full h-full block crayon-stroke-svg"
      />
      <div className="absolute inset-0">
        {nodes.map((n) => (
          <div key={n.num}>
            <button
              type="button"
              onClick={() => n.active && onJumpToBlock(n.id)}
              disabled={!n.active}
              style={{
                left: `${(n.x / viewW) * 100}%`,
                top: `${(n.y / viewH) * 100}%`,
              }}
              aria-label={`Ir al bloque ${n.num}: ${n.name}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center font-display text-[17px] text-[var(--text-primary)] ${
                n.active ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-85'
              }`}
            >
              {n.num}
            </button>
            <span
              data-testid={`dag-label-${n.num}`}
              style={{
                left: `${(n.x / viewW) * 100}%`,
                top: `${(n.labelY / viewH) * 100}%`,
              }}
              className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 px-1.5 rounded bg-[var(--bg-paper-wash)] text-[14px] whitespace-nowrap ${
                n.active
                  ? 'font-display text-[15px] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)]'
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
  completed3DChallengeScenes = [],
  completedSymbolicScenes = [],
  completedCodeLabScenes = [],
  theme,
  onSelectScene,
  onClose,
  onResetProgress,
  onExportProgress,
  onImportProgress,
}: CurriculumMapModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [transferNotice, setTransferNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Always open at the top of the Course Index and clear transient confirmation state
  useEffect(() => {
    if (open) {
      setConfirmingReset(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [open]);

  if (!open) return null;

  const totalSteps = Object.values(GUIDED_LESSONS).reduce((acc, l) => acc + l.steps.length, 0);
  const doneSteps = Object.values(GUIDED_LESSONS).reduce(
    (acc, l) => acc + l.steps.filter((s) => completedStepIds.has(s.id)).length,
    0
  );

  const handleExportClick = () => {
    if (!onExportProgress) return;
    const json = onExportProgress();
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bibifold-progreso-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setTransferNotice({ ok: true, text: 'Respaldo JSON descargado.' });
    } catch {
      setTransferNotice({ ok: false, text: 'No se pudo generar la descarga.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImportProgress) return;
    try {
      const text = await file.text();
      const res = onImportProgress(text);
      setTransferNotice({ ok: res.ok, text: res.message });
    } catch {
      setTransferNotice({ ok: false, text: 'No se pudo leer el archivo seleccionado.' });
    }
  };

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

      <div
        ref={scrollContainerRef}
        data-testid="curriculum-modal-scroll"
        className="flex-1 overflow-y-auto notebook-scroll px-6 md:px-10 py-6"
      >
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
                      const effectivePL = skill ? computeDecayedMastery(skill) : 0.25;
                      const reviewDue = skill ? needsSpacedReview(skill) : false;
                      const pct = Math.round(effectivePL * 100);
                      const lesson = GUIDED_LESSONS[scene.id];
                      const stepsDone = lesson.steps.filter((s) =>
                        completedStepIds.has(s.id)
                      ).length;
                      const threeDDone =
                        completed3DChallengeScenes.includes(scene.id) || stepsDone === 3;
                      const symDone = completedSymbolicScenes.includes(scene.id);
                      const codeDone = completedCodeLabScenes.includes(scene.id);
                      const isCurrent = scene.id === activeSceneId;

                      return (
                        <div
                          key={scene.id}
                          data-testid={`index-lesson-${scene.id}`}
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
                            <p
                              data-testid={`index-badges-${scene.id}`}
                              className="text-[12.5px] text-[var(--text-muted)] pl-7 pt-0.5"
                            >
                              3D{threeDDone ? ' ✓' : ''} · Simbólico{symDone ? ' ✓' : ''} · CodeLab
                              {codeDone ? ' ✓' : ''}
                              {reviewDue ? ' · Repaso sugerido' : ''}
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

          {/* Upgraded 0→100 Roadmap Overview (6 Tiers · 40 Planned Lessons) */}
          <section className="space-y-4">
            <div>
              <h3 className="font-display crayon-ink text-[23px] text-[var(--text-primary)]">
                Ruta maestra 0→100 (40 lecciones · 4 motores)
              </h3>
              <p className="text-[15px] text-[var(--text-secondary)]">
                Evolución modular desde cimientos hasta jefes integradores, comenzando en la siguiente ola por el Motor Discreto de CS.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
              {ROADMAP_TIERS.map((tier) => (
                <div
                  key={tier.code}
                  className="pt-3 border-t border-dashed border-[var(--hairline)] space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="font-display text-[20px] text-[var(--text-primary)]">
                      {tier.code} · {tier.title}
                    </h4>
                    <span className="text-[13px] text-[var(--text-muted)] whitespace-nowrap tabular-nums">
                      {tier.activeCount > 0
                        ? `${tier.activeCount}/${tier.lessonCount} activas`
                        : `${tier.lessonCount} lecc. · ${tier.waveLabel}`}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--text-muted)]">
                    {tier.engineFocus}
                  </p>
                  <p className="text-[14px] text-[var(--text-secondary)] leading-snug">
                    {tier.highlights.join(' · ')}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Quiet progress export/import & reset footer */}
          <div className="pt-4 pb-6 border-t border-dashed border-[var(--hairline)] flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-[14px] text-[var(--text-muted)]">
                Tu avance (esquema v3 con decaimiento de repaso) se guarda localmente en este navegador.
              </p>
              {transferNotice && (
                <p
                  data-testid="progress-transfer-notice"
                  className="text-[13.5px]"
                  style={{
                    color: transferNotice.ok ? 'var(--ui-success)' : 'var(--ui-warning)',
                  }}
                >
                  {transferNotice.text}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {onExportProgress && (
                <button
                  type="button"
                  data-testid="export-progress-btn"
                  onClick={handleExportClick}
                  className="text-[14.5px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] cursor-pointer whitespace-nowrap transition-colors"
                >
                  Exportar JSON
                </button>
              )}
              {onImportProgress && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    className="hidden"
                    aria-label="Importar respaldo JSON de progreso"
                  />
                  <button
                    type="button"
                    data-testid="import-progress-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[14.5px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] cursor-pointer whitespace-nowrap transition-colors"
                  >
                    Importar JSON
                  </button>
                </>
              )}
              {!confirmingReset ? (
                <button
                  type="button"
                  data-testid="reset-progress-btn"
                  onClick={() => setConfirmingReset(true)}
                  className="inline-flex items-center gap-1.5 text-[15px] text-[var(--text-muted)] hover:text-[var(--ui-warning)] cursor-pointer whitespace-nowrap transition-colors"
                >
                  <CrayonReset size={15} />
                  <span>Reiniciar progreso</span>
                </button>
              ) : (
                <div
                  data-testid="reset-progress-confirm"
                  className="inline-flex items-center gap-3 px-3 py-1 rounded border border-dashed border-[var(--ui-warning)] bg-[var(--bg-paper)] text-[14px]"
                >
                  <span className="text-[var(--text-primary)]">¿Borrar todo tu avance?</span>
                  <button
                    type="button"
                    data-testid="confirm-reset-progress-btn"
                    onClick={() => {
                      onResetProgress();
                      setConfirmingReset(false);
                      setTransferNotice({ ok: true, text: 'Progreso reiniciado a 0 pasos.' });
                    }}
                    className="font-display text-[16px] text-[var(--ui-warning)] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    data-testid="cancel-reset-progress-btn"
                    onClick={() => setConfirmingReset(false)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
