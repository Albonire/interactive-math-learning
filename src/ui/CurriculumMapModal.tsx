import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import rough from 'roughjs';
import {
  METHODOLOGY_NOTES,
  STUDY_MODULES,
  STUDY_MODULES_LIST,
  STUDY_PHASES,
  VERIFIED_REFERENCES,
  computePhaseCompletion,
} from '../core/studyPlan';
import type { StudyModuleId, StudyPhaseId } from '../core/studyPlanTypes';
import type { DiagnosticReport } from '../core/diagnostic';
import { SCENES } from '../core/curriculum';
import type { CrayonToken, SceneId, ThemeMode } from '../core/types';
import { getCrayonHex, THEME_PALETTES } from '../core/palette';
import { CrayonArrowRight, CrayonClose } from './CrayonIcons';
import {
  CrayonButton,
  CrayonProgressStroke,
  CrayonStepMarker,
  RoughDivider,
} from './RoughElements';

interface CurriculumMapModalProps {
  open: boolean;
  activeModuleId: StudyModuleId;
  completedModuleIds: ReadonlySet<StudyModuleId>;
  diagnosticReport: DiagnosticReport | null;
  theme: ThemeMode;
  onSelectModule: (id: StudyModuleId) => void;
  onOpen3DScene: (sceneId: SceneId) => void;
  onOpenDiagnostic: () => void;
  onClose: () => void;
  onExportProgress: () => void;
  onImportProgress: (rawJson: string) => { ok: boolean; message: string };
  onResetProgress: () => void;
}

interface DagPhaseNode {
  id: StudyPhaseId;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  crayon: CrayonToken;
}

const DAG_NODES: DagPhaseNode[] = [
  { id: 'phase-0', x: 10, y: 46, w: 120, h: 52, label: 'F0 Diagnóstico', sub: 'Entrada', crayon: 'ochre' },
  { id: 'phase-1', x: 158, y: 46, w: 118, h: 52, label: 'F1 Fundam.', sub: 'M1–M6', crayon: 'cobalt' },
  { id: 'phase-2', x: 304, y: 46, w: 118, h: 52, label: 'F2 Discretas', sub: 'M7–M12', crayon: 'vermilion' },
  { id: 'phase-3', x: 454, y: 10, w: 128, h: 52, label: 'F3 Cálculo', sub: 'M13–M17', crayon: 'sage' },
  { id: 'phase-4', x: 454, y: 80, w: 128, h: 52, label: 'F4 Álg. Lineal', sub: 'M18–M23', crayon: 'cobalt' },
  { id: 'phase-5', x: 614, y: 46, w: 112, h: 52, label: 'F5 Probab.', sub: 'M24–M27', crayon: 'ochre' },
  { id: 'phase-6', x: 752, y: 46, w: 98, h: 52, label: 'F6 ML', sub: 'M28–M32', crayon: 'plum' },
];

const DAG_EDGES: ReadonlyArray<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  crayon: CrayonToken;
}> = [
  { x1: 132, y1: 72, x2: 155, y2: 72, crayon: 'pencil' },
  { x1: 278, y1: 72, x2: 301, y2: 72, crayon: 'pencil' },
  { x1: 424, y1: 68, x2: 451, y2: 38, crayon: 'sage' },
  { x1: 424, y1: 76, x2: 451, y2: 104, crayon: 'cobalt' },
  { x1: 584, y1: 38, x2: 611, y2: 68, crayon: 'sage' },
  { x1: 584, y1: 104, x2: 611, y2: 76, crayon: 'cobalt' },
  { x1: 728, y1: 72, x2: 749, y2: 72, crayon: 'plum' },
];

function RoughPhaseDag({
  theme,
  selectedPhase,
  completedModuleIds,
  diagnosticReport,
  onSelectPhase,
  onOpenDiagnostic,
}: {
  theme: ThemeMode;
  selectedPhase: 'all' | StudyPhaseId;
  completedModuleIds: ReadonlySet<StudyModuleId>;
  diagnosticReport: DiagnosticReport | null;
  onSelectPhase: (id: StudyPhaseId) => void;
  onOpenDiagnostic: () => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewW = 860;
  const viewH = 144;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const rc = rough.svg(svg);
    const paperBg = THEME_PALETTES[theme].paperBg;

    // 1. Hand-sketched directional arrows
    DAG_EDGES.forEach((edge, i) => {
      const col = getCrayonHex(edge.crayon, theme);
      svg.appendChild(
        rc.line(edge.x1, edge.y1, edge.x2, edge.y2, {
          seed: 70 + i * 13,
          stroke: col,
          strokeWidth: 2.0,
          roughness: 1.3,
        })
      );
      const ang = Math.atan2(edge.y2 - edge.y1, edge.x2 - edge.x1);
      const len = 7.5;
      svg.appendChild(
        rc.linearPath(
          [
            [edge.x2 - len * Math.cos(ang - 0.48), edge.y2 - len * Math.sin(ang - 0.48)],
            [edge.x2, edge.y2],
            [edge.x2 - len * Math.cos(ang + 0.48), edge.y2 - len * Math.sin(ang + 0.48)],
          ],
          {
            seed: 140 + i * 11,
            stroke: col,
            strokeWidth: 1.9,
            roughness: 0.9,
          }
        )
      );
    });

    // 2. Hand-drawn phase folio boxes with soft translucent crayon hachure when selected
    DAG_NODES.forEach((node, i) => {
      const col = getCrayonHex(node.crayon, theme);
      const isSelected = selectedPhase === node.id;
      svg.appendChild(
        rc.rectangle(node.x, node.y, node.w, node.h, {
          seed: 220 + i * 19,
          stroke: col,
          strokeWidth: isSelected ? 2.6 : 1.75,
          fill: isSelected ? `${col}2E` : paperBg,
          fillStyle: isSelected ? 'hachure' : 'solid',
          fillWeight: isSelected ? 0.9 : 1,
          hachureGap: 8,
          roughness: 1.45,
          bowing: 1.1,
        })
      );
      if (isSelected) {
        svg.appendChild(
          rc.rectangle(node.x + 2, node.y + 2, node.w - 4, node.h - 4, {
            seed: 310 + i * 7,
            stroke: col,
            strokeWidth: 1.15,
            roughness: 1.3,
          })
        );
      }
    });
  }, [theme, selectedPhase]);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="relative min-w-[660px] w-full aspect-[860/144] select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-full block crayon-stroke-svg"
          aria-hidden="true"
        />
        <div className="absolute inset-0">
          {DAG_NODES.map((node) => {
            const stats = computePhaseCompletion(node.id, completedModuleIds);
            const col = getCrayonHex(node.crayon, theme);
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  if (node.id === 'phase-0') {
                    onOpenDiagnostic();
                  } else {
                    onSelectPhase(node.id);
                  }
                }}
                style={{
                  left: `${(node.x / viewW) * 100}%`,
                  top: `${(node.y / viewH) * 100}%`,
                  width: `${(node.w / viewW) * 100}%`,
                  height: `${(node.h / viewH) * 100}%`,
                }}
                className="absolute flex flex-col items-center justify-center text-center leading-tight px-1 cursor-pointer transition-transform duration-150 hover:scale-[1.03]"
              >
                <span
                  className="font-display text-[13px] md:text-[14px] leading-none whitespace-nowrap"
                  style={{ color: col }}
                >
                  {node.label}
                </span>
                <span className="font-mono-math text-[10px] sm:text-[10.5px] text-[var(--text-secondary)] mt-0.5 whitespace-nowrap tabular-nums">
                  {node.id === 'phase-0'
                    ? diagnosticReport
                      ? `${diagnosticReport.overallPercent}%`
                      : node.sub
                    : `${node.sub} (${stats.done}/${stats.total})`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CurriculumMapModal({
  open,
  activeModuleId,
  completedModuleIds,
  diagnosticReport,
  theme,
  onSelectModule,
  onOpen3DScene,
  onOpenDiagnostic,
  onClose,
  onExportProgress,
  onImportProgress,
  onResetProgress,
}: CurriculumMapModalProps) {
  const [selectedPhase, setSelectedPhase] = useState<'all' | StudyPhaseId>('all');
  const [showRefs, setShowRefs] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const totalDone = completedModuleIds.size;
  const totalModules = STUDY_MODULES_LIST.length;
  const totalPercent = Math.round((totalDone / totalModules) * 100);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = onImportProgress(String(reader.result ?? ''));
      setImportFeedback({ ok: result.ok, text: result.message });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const visiblePhases = STUDY_PHASES.filter(
    (ph) => ph.index > 0 && (selectedPhase === 'all' || ph.id === selectedPhase)
  );

  const diagByMod = new Map(
    (diagnosticReport?.blocks ?? []).map((b) => [b.moduleId, b.recommendation])
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan de estudio visual (7 Fases, 32 Módulos)"
      data-testid="curriculum-map-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/50"
    >
      <div className="sketch-modal notebook-paper-bg w-full max-w-[1040px] max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="text-[14px] font-hand text-[var(--text-muted)]">
              Plan integral de matemáticas visuales · 60–75 semanas orientativas
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="font-display crayon-ink text-[24px] sm:text-[29px] leading-tight text-[var(--text-primary)]">
                Mapa curricular: 7 Fases · 32 Módulos
              </h2>
              <span className="inline-flex items-center gap-2 font-mono-math text-[13px] text-[var(--ui-accent)] tabular-nums">
                <CrayonProgressStroke
                  percent={totalPercent}
                  crayon="sage"
                  theme={theme}
                  seed={113}
                  className="w-20 h-[10px]"
                />
                <span>
                  {totalDone}/{totalModules} dominados
                </span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar plan curricular"
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <CrayonClose size={19} />
          </button>
        </div>
        <RoughDivider theme={theme} seed={151} />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto notebook-scroll px-4 sm:px-6 py-4 space-y-5">
          {/* Hand-Drawn Rough.js 7-Phase Dependency Diagram (Fase 3 & 4 in parallel!) */}
          <div className="sketch-frame p-3.5 sm:p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-hand text-[14.5px] text-[var(--text-secondary)]">
                Grafo de dependencias entre fases (Fase 3 y Fase 4 en paralelo tras M6/M14)
              </span>
              <CrayonButton
                crayon="cobalt"
                theme={theme}
                variant="sketch"
                seed={181}
                dataTestId="map-open-diagnostic-btn"
                onClick={() => {
                  onClose();
                  onOpenDiagnostic();
                }}
                className="!text-[15.5px] !py-1 !px-3"
              >
                <span>
                  {diagnosticReport
                    ? `Fase 0: Diagnóstico (${diagnosticReport.overallPercent}% — ver mapa)`
                    : 'Abrir Fase 0: Diagnóstico'}
                </span>
                <CrayonArrowRight size={14} />
              </CrayonButton>
            </div>

            <RoughPhaseDag
              theme={theme}
              selectedPhase={selectedPhase}
              completedModuleIds={completedModuleIds}
              diagnosticReport={diagnosticReport}
              onSelectPhase={(id) => setSelectedPhase((cur) => (cur === id ? 'all' : id))}
              onOpenDiagnostic={() => {
                onClose();
                onOpenDiagnostic();
              }}
            />
          </div>

          {/* Phase Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 text-[14px]">
            <button
              type="button"
              onClick={() => setSelectedPhase('all')}
              data-active={selectedPhase === 'all' ? 'true' : undefined}
              className={`sketch-btn px-3 py-1 cursor-pointer ${
                selectedPhase === 'all'
                  ? 'font-display text-[15px] text-[var(--ui-accent)]'
                  : 'font-hand text-[var(--text-secondary)]'
              }`}
            >
              Todas las fases (32)
            </button>
            {STUDY_PHASES.filter((ph) => ph.index > 0).map((ph) => (
              <button
                key={ph.id}
                type="button"
                onClick={() => setSelectedPhase(ph.id)}
                data-active={selectedPhase === ph.id ? 'true' : undefined}
                className={`sketch-btn px-3 py-1 cursor-pointer ${
                  selectedPhase === ph.id
                    ? 'font-display text-[15px] text-[var(--ui-accent)]'
                    : 'font-hand text-[var(--text-secondary)]'
                }`}
              >
                F{ph.index}: {ph.shortTitle}
              </button>
            ))}
          </div>

          {/* Module Catalog by Phase */}
          <div className="space-y-6">
            {visiblePhases.map((phase) => {
              const comp = computePhaseCompletion(phase.id, completedModuleIds);
              return (
                <section key={phase.id} className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 className="font-display crayon-ink text-[22px] text-[var(--text-primary)] leading-tight">
                        Fase {phase.index}: {phase.title}
                      </h3>
                      <p className="text-[14.5px] text-[var(--text-secondary)]">
                        {phase.levelRange} · {phase.weeksLabel}
                        {phase.parallelNote ? ` · ${phase.parallelNote}` : ''} — {phase.summary}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 font-mono-math text-[12.5px] text-[var(--text-muted)] tabular-nums">
                      <CrayonProgressStroke
                        percent={comp.percent}
                        crayon={phase.crayon}
                        theme={theme}
                        seed={phase.index * 37 + 9}
                        className="w-16 h-[9px]"
                      />
                      <span>
                        {comp.done}/{comp.total} ({comp.percent}%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {phase.moduleIds.map((mId) => {
                      const mod = STUDY_MODULES[mId];
                      const active = mId === activeModuleId;
                      const done = completedModuleIds.has(mId);
                      const rec = diagByMod.get(mId);
                      const scene = mod.linked3DSceneId ? SCENES[mod.linked3DSceneId] : null;
                      return (
                        <div
                          key={mId}
                          data-active={active ? 'true' : undefined}
                          className="sketch-card p-3.5 hover:-translate-y-[1px]"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <button
                              type="button"
                              data-testid={`select-module-${mId}`}
                              onClick={() => {
                                onSelectModule(mId);
                                onClose();
                              }}
                              className="text-left flex-1 flex items-start gap-2.5 cursor-pointer"
                            >
                              <div className="mt-0.5">
                                <CrayonStepMarker
                                  index={mod.number}
                                  active={active}
                                  completed={done}
                                  crayon={phase.crayon}
                                  theme={theme}
                                  label={String(mod.number)}
                                  size={28}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[12.5px] font-mono-math text-[var(--text-muted)]">
                                  <span className="font-bold text-[var(--text-primary)]">{mod.id}</span>
                                  <span>·</span>
                                  <span>Nivel {mod.level}</span>
                                  {done && (
                                    <span className="text-[var(--ui-success)] font-bold">
                                      · ✓ Dominado
                                    </span>
                                  )}
                                  {rec && (
                                    <span
                                      style={{
                                        color:
                                          rec === 'repaso-rapido'
                                            ? 'var(--ui-success)'
                                            : 'var(--ui-warning)',
                                      }}
                                    >
                                      · {rec === 'repaso-rapido' ? 'Repaso rápido' : 'Cursar completo'}
                                    </span>
                                  )}
                                </div>
                                <div className="font-display text-[18.5px] leading-snug text-[var(--text-primary)] mt-0.5">
                                  {mod.title}
                                </div>
                                <div className="text-[13.5px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                                  {mod.visualSpecs[0]?.visualization}
                                </div>
                              </div>
                            </button>

                            {scene && (
                              <button
                                type="button"
                                data-tone="accent"
                                onClick={() => {
                                  onSelectModule(mId);
                                  onOpen3DScene(scene.id);
                                  onClose();
                                }}
                                title={`Abrir Laboratorio 3D: ${scene.title}`}
                                className="sketch-btn px-2.5 py-1 text-[12.5px] font-display text-[var(--ui-accent)] shrink-0 cursor-pointer"
                              >
                                Lab 3D
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Collapsible Verified References & Methodology Notes */}
          <div className="pt-2 space-y-2">
            <RoughDivider theme={theme} seed={271} />
            <button
              type="button"
              onClick={() => setShowRefs((v) => !v)}
              className="font-display text-[16.5px] text-[var(--ui-accent)] hover:underline cursor-pointer pt-1"
            >
              {showRefs
                ? '▾ Ocultar catálogo de referencias verificadas y notas metodológicas'
                : '▸ Ver catálogo de referencias verificadas (MIT OCW, Stanford, Harvard, Strang, 3B1B) y notas metodológicas'}
            </button>
            {showRefs && (
              <div className="sketch-card p-4 mt-2 space-y-3 text-[14px] text-[var(--text-secondary)]">
                <ul className="space-y-1 list-disc list-inside">
                  {METHODOLOGY_NOTES.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <RoughDivider theme={theme} seed={283} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {Object.values(VERIFIED_REFERENCES).map((ref) => (
                    <div key={ref.code} className="leading-snug">
                      <span className="font-mono-math text-[12px] text-[var(--ui-accent)] mr-1">
                        [{ref.code}]
                      </span>
                      {ref.citation}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Export / Import / Confirmed Reset */}
        <RoughDivider theme={theme} seed={197} />
        <div className="px-4 sm:px-6 py-3 bg-[var(--bg-surface)]/55 flex flex-wrap items-center justify-between gap-2 text-[14px] shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportProgress}
              className="sketch-btn px-3 py-1 font-hand text-[var(--text-primary)] cursor-pointer"
            >
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="sketch-btn px-3 py-1 font-hand text-[var(--text-primary)] cursor-pointer"
            >
              Importar JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChange}
            />
            {importFeedback && (
              <span style={{ color: importFeedback.ok ? 'var(--ui-success)' : 'var(--ui-warning)' }}>
                {importFeedback.text}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!confirmReset ? (
              <button
                type="button"
                data-testid="reset-progress-btn"
                data-tone="danger"
                onClick={() => setConfirmReset(true)}
                className="sketch-btn px-3 py-1 font-hand text-[var(--ui-warning)] cursor-pointer"
              >
                Reiniciar progreso
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[var(--ui-warning)] text-[14px]">¿Borrar todo el progreso?</span>
                <CrayonButton
                  crayon="vermilion"
                  theme={theme}
                  seed={313}
                  dataTestId="confirm-reset-btn"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="!text-[15px] !py-1 !px-3"
                >
                  Confirmar
                </CrayonButton>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="sketch-btn px-3 py-1 font-hand text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
