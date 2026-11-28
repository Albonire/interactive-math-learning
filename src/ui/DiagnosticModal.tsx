import { useState } from 'react';
import {
  DIAGNOSTIC_QUESTIONS,
  FAST_TRACK_THRESHOLD_PERCENT,
  evaluateDiagnostic,
  type DiagnosticQuestion,
  type DiagnosticReport,
} from '../core/diagnostic';
import { STUDY_MODULES } from '../core/studyPlan';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { ThemeMode } from '../core/types';
import { THEME_PALETTES } from '../core/palette';
import { CrayonArrowLeft, CrayonArrowRight, CrayonClose } from './CrayonIcons';
import {
  CrayonButton,
  CrayonProgressStroke,
  CrayonStepMarker,
  RoughDivider,
} from './RoughElements';

interface DiagnosticModalProps {
  open: boolean;
  theme: ThemeMode;
  existingReport: DiagnosticReport | null;
  onComplete: (report: DiagnosticReport) => void;
  onJumpToModule: (moduleId: StudyModuleId) => void;
  onClose: () => void;
}

function DiagnosticMiniVisual({
  preset,
  theme,
}: {
  preset: NonNullable<DiagnosticQuestion['visualPreset']>;
  theme: ThemeMode;
}) {
  const pal = THEME_PALETTES[theme].crayons;
  const grid = THEME_PALETTES[theme].gridColor;

  let content: React.ReactNode;
  if (preset === 'parabola-shift') {
    content = (
      <svg viewBox="0 0 320 130" className="w-full max-w-[320px] h-auto">
        <line x1="20" y1="98" x2="300" y2="98" stroke={grid} strokeWidth="1.4" />
        <line x1="120" y1="12" x2="120" y2="118" stroke={grid} strokeWidth="1.4" />
        <path d="M 60 22 Q 120 174 180 22" fill="none" stroke={pal.pencil} strokeDasharray="4 3" strokeWidth="1.7" />
        <path d="M 110 8 Q 170 156 230 8" fill="none" stroke={pal.cobalt} strokeWidth="2.5" />
        <circle cx="170" cy="82" r="4.5" fill={pal.vermilion} />
        <text x="178" y="84" fontSize="13" fill={pal.vermilion}>(2, 1)</text>
      </svg>
    );
  } else if (preset === 'unit-circle-q2') {
    const cx = 150;
    const cy = 68;
    const r = 46;
    const ang = (2 * Math.PI) / 3;
    const px = cx + r * Math.cos(ang);
    const py = cy - r * Math.sin(ang);
    content = (
      <svg viewBox="0 0 300 136" className="w-full max-w-[300px] h-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={grid} strokeWidth="1.7" />
        <line x1="80" y1={cy} x2="220" y2={cy} stroke={grid} strokeWidth="1.2" />
        <line x1={cx} y1="12" x2={cx} y2="124" stroke={grid} strokeWidth="1.2" />
        <line x1={cx} y1={cy} x2={px} y2={py} stroke={pal.cobalt} strokeWidth="2.4" />
        <line x1={px} y1={py} x2={px} y2={cy} stroke={pal.vermilion} strokeWidth="2.0" strokeDasharray="3 2" />
        <circle cx={px} cy={py} r="4.5" fill={pal.vermilion} />
        <text x={px - 42} y={py - 6} fontSize="13" fill={pal.cobalt}>θ = 2π/3</text>
      </svg>
    );
  } else if (preset === 'venn-demorgan') {
    content = (
      <svg viewBox="0 0 300 118" className="w-full max-w-[300px] h-auto">
        <rect x="18" y="10" width="264" height="98" rx="4" fill={`${pal.cobalt}18`} stroke={pal.graphite} strokeWidth="1.4" />
        <circle cx="122" cy="59" r="34" fill={THEME_PALETTES[theme].paperBg} stroke={pal.cobalt} strokeWidth="2.0" />
        <circle cx="178" cy="59" r="34" fill={THEME_PALETTES[theme].paperBg} stroke={pal.sage} strokeWidth="2.0" />
        <text x="108" y="64" fontSize="14" fill={pal.cobalt}>A</text>
        <text x="186" y="64" fontSize="14" fill={pal.sage}>B</text>
      </svg>
    );
  } else {
    content = (
      <svg viewBox="0 0 300 116" className="w-full max-w-[300px] h-auto">
        <rect x="20" y="14" width="12" height="86" fill={`${pal.sage}44`} stroke={pal.sage} strokeWidth="1.6" />
        <rect x="32" y="14" width="248" height="10" fill={`${pal.vermilion}44`} stroke={pal.vermilion} strokeWidth="1.6" />
        <rect x="32" y="24" width="248" height="76" fill={`${grid}30`} stroke={grid} strokeWidth="1.2" />
        <text x="22" y="112" fontSize="12" fill={pal.sage}>1% Fallo</text>
        <text x="278" y="112" textAnchor="end" fontSize="12" fill={pal.vermilion}>99% Normal (5% FP)</text>
      </svg>
    );
  }

  return (
    <div className="sketch-frame sketch-diagram-canvas inline-block p-2.5">
      {content}
    </div>
  );
}

export function DiagnosticModal({
  open,
  theme,
  existingReport,
  onComplete,
  onJumpToModule,
  onClose,
}: DiagnosticModalProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [report, setReport] = useState<DiagnosticReport | null>(existingReport);

  if (!open) return null;

  const q = DIAGNOSTIC_QUESTIONS[idx];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === DIAGNOSTIC_QUESTIONS.length;
  const progressPct = Math.round((answeredCount / DIAGNOSTIC_QUESTIONS.length) * 100);

  const handleSubmit = () => {
    const evaluated = evaluateDiagnostic(answers);
    setReport(evaluated);
    onComplete(evaluated);
  };

  const handleRestart = () => {
    setAnswers({});
    setIdx(0);
    setReport(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fase 0: Diagnóstico de vacíos"
      data-testid="diagnostic-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/50"
    >
      <div className="sketch-modal notebook-paper-bg w-full max-w-[780px] max-h-[92dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="text-[14px] font-hand text-[var(--text-muted)]">
              Fase 0 · Evaluación adaptativa (Regla R-OM)
            </div>
            <h2 className="font-display crayon-ink text-[23px] sm:text-[27px] leading-tight text-[var(--text-primary)]">
              Diagnóstico de vacíos y mapa de calor
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar diagnóstico"
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <CrayonClose size={19} />
          </button>
        </div>
        <RoughDivider theme={theme} seed={211} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto notebook-scroll px-4 sm:px-6 py-4 space-y-5">
          {report ? (
            <div className="space-y-5" data-testid="diagnostic-report">
              <div className="sketch-frame flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-[14.5px] text-[var(--text-secondary)]">Puntaje global</div>
                  <div className="font-display crayon-ink text-[32px] leading-none text-[var(--ui-accent)] tabular-nums mt-0.5">
                    {report.overallPercent}% ({report.totalCorrect}/{report.totalQuestions})
                  </div>
                </div>
                <div className="text-[14.5px] text-[var(--text-secondary)] max-w-[360px] leading-snug">
                  Umbral del plan: <strong className="text-[var(--text-primary)]">≥ {FAST_TRACK_THRESHOLD_PERCENT}%</strong> habilita{' '}
                  <em>Repaso rápido</em>; menor a {FAST_TRACK_THRESHOLD_PERCENT}% recomienda{' '}
                  <em>Cursar completo</em>.
                </div>
              </div>

              {/* Heatmap by Block */}
              <div className="space-y-2.5">
                <h3 className="font-display text-[21px] text-[var(--text-primary)]">
                  Mapa de calor por bloque
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {report.blocks.map((blk, bi) => {
                    const fast = blk.recommendation === 'repaso-rapido';
                    return (
                      <button
                        key={blk.moduleId}
                        type="button"
                        data-tone={fast ? 'success' : 'warning'}
                        onClick={() => {
                          onJumpToModule(blk.moduleId);
                          onClose();
                        }}
                        className="sketch-card text-left p-3.5 cursor-pointer hover:-translate-y-[1px]"
                      >
                        <div className="flex items-baseline justify-between gap-2 font-mono-math text-[12.5px]">
                          <span className="font-bold text-[var(--text-primary)]">{blk.moduleId}</span>
                          <span className="tabular-nums">{blk.scorePercent}%</span>
                        </div>
                        <div className="font-display text-[17px] leading-snug text-[var(--text-primary)] mt-0.5">
                          {blk.blockLabel}
                        </div>
                        <div className="mt-1.5">
                          <CrayonProgressStroke
                            percent={blk.scorePercent}
                            crayon={fast ? 'sage' : 'vermilion'}
                            theme={theme}
                            seed={300 + bi * 17}
                            className="w-full h-[9px]"
                          />
                        </div>
                        <div
                          className="text-[13.5px] mt-1 font-hand"
                          style={{ color: fast ? 'var(--ui-success)' : 'var(--ui-warning)' }}
                        >
                          {fast ? '✓ Repaso rápido' : '→ Cursar completo'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Misconceptions isolated */}
              {report.detectedMisconceptions.length > 0 && (
                <div className="sketch-card p-4 space-y-1.5">
                  <h3 className="font-display text-[19px] text-[var(--text-primary)]">
                    Errores conceptuales detectados
                  </h3>
                  <ul className="space-y-1.5 text-[14.5px] text-[var(--text-secondary)]">
                    {report.detectedMisconceptions.map((m) => (
                      <li key={`${m.moduleId}-${m.id}`} className="flex items-baseline gap-2">
                        <span className="font-mono-math text-[12px] text-[var(--ui-warning)] shrink-0">
                          [{m.moduleId}]
                        </span>
                        <span>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <RoughDivider theme={theme} seed={239} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="sketch-btn px-3.5 py-1.5 text-[14.5px] font-hand text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Repetir diagnóstico
                </button>
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={251}
                  dataTestId="diagnostic-start-recommended"
                  onClick={() => {
                    onJumpToModule(report.recommendedEntryModule);
                    onClose();
                  }}
                >
                  <span>
                    Ir a ruta recomendada ({report.recommendedEntryModule}:{' '}
                    {STUDY_MODULES[report.recommendedEntryModule].shortLabel})
                  </span>
                  <CrayonArrowRight size={15} />
                </CrayonButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Hand-Drawn Progress Indicator */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-[var(--text-secondary)] tabular-nums">
                  <span className="font-display text-[16px] text-[var(--text-primary)]">
                    Ítem {idx + 1}/{DIAGNOSTIC_QUESTIONS.length} · {q.blockModuleId} ({q.blockLabel})
                  </span>
                  <span className="inline-flex items-center gap-2 font-mono-math text-[12.5px]">
                    <CrayonProgressStroke
                      percent={progressPct}
                      crayon="sage"
                      theme={theme}
                      seed={193}
                      className="w-20 h-[10px]"
                    />
                    <span>
                      {answeredCount}/{DIAGNOSTIC_QUESTIONS.length}
                    </span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {DIAGNOSTIC_QUESTIONS.map((item, i) => {
                    const answered = answers[item.id] !== undefined;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setIdx(i)}
                        aria-label={`Ir a pregunta ${i + 1}`}
                        className="cursor-pointer transition-transform hover:scale-105"
                      >
                        <CrayonStepMarker
                          index={i}
                          active={i === idx}
                          completed={answered && i !== idx}
                          crayon="cobalt"
                          theme={theme}
                          label={String(i + 1)}
                          size={26}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="font-display text-[19px] sm:text-[20px] text-[var(--text-primary)] leading-snug">
                {q.prompt}
              </p>

              {q.visualPreset && <DiagnosticMiniVisual preset={q.visualPreset} theme={theme} />}

              {q.codeSnippet && (
                <pre className="sketch-code-sheet py-3 pr-4 font-mono-math text-[12.5px] text-[var(--text-primary)] overflow-x-auto leading-[22px]">
                  {q.codeSnippet}
                </pre>
              )}

              <div className="space-y-2.5" role="radiogroup" aria-label="Opciones de respuesta">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-testid={`diag-opt-${oi}`}
                      data-state={selected ? 'selected' : undefined}
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                      className="sketch-option w-full text-left px-3.5 py-2.5 flex items-center gap-3 text-[15px] leading-snug text-[var(--text-primary)] cursor-pointer"
                    >
                      <CrayonStepMarker
                        index={oi}
                        active={selected}
                        completed={false}
                        crayon="cobalt"
                        theme={theme}
                        label={String.fromCharCode(65 + oi)}
                        size={26}
                      />
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              <RoughDivider theme={theme} seed={263} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                  className="sketch-btn inline-flex items-center gap-1 px-3 py-1.5 text-[14.5px] font-hand text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                >
                  <CrayonArrowLeft size={14} />
                  <span>Anterior</span>
                </button>
                <div className="flex flex-wrap items-center gap-2.5">
                  {idx < DIAGNOSTIC_QUESTIONS.length - 1 ? (
                    <button
                      type="button"
                      data-testid="diag-next-btn"
                      data-tone="accent"
                      onClick={() => setIdx((i) => Math.min(DIAGNOSTIC_QUESTIONS.length - 1, i + 1))}
                      className="sketch-btn inline-flex items-center gap-1 px-4 py-1.5 text-[15px] font-display text-[var(--ui-accent)] cursor-pointer"
                    >
                      <span>Siguiente</span>
                      <CrayonArrowRight size={14} />
                    </button>
                  ) : null}
                  <CrayonButton
                    crayon="cobalt"
                    theme={theme}
                    seed={277}
                    dataTestId="diag-submit-btn"
                    disabled={!allAnswered}
                    onClick={handleSubmit}
                  >
                    Generar mapa de calor
                  </CrayonButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
