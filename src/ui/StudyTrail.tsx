/**
 * The study plan as a hand-drawn trail: 32 stations on a winding path, coloured by phase.
 *
 * Each station shows, at a glance, what the learner can do next:
 *  - dominado (filled, ticked), disponible (prerequisites met), bloqueado (dashed, says what is
 *    missing), repaso pendiente (ochre flag), "estás aquí" and the recommended next station.
 * Locked stations stay clickable: the trail advises, it does not imprison.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCrayonHex } from '../core/palette';
import { STUDY_MODULES, STUDY_MODULES_LIST, STUDY_PHASES_MAP } from '../core/studyPlan';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { ThemeMode } from '../core/types';
import { dueReviews, getStudyRhythmSnapshot, localDay } from '../storage/studyRhythm';
import { handifySvgTree } from '../visuals/handDrawnSvg';

interface StudyTrailProps {
  theme: ThemeMode;
  activeModuleId: StudyModuleId;
  completedModuleIds: ReadonlySet<StudyModuleId>;
  onSelectModule: (id: StudyModuleId) => void;
}

type StationState = 'done' | 'open' | 'locked';

export function recommendedNext(completed: ReadonlySet<StudyModuleId>): StudyModuleId | null {
  for (const m of STUDY_MODULES_LIST) {
    if (completed.has(m.id) || m.optional) continue;
    if (m.prerequisites.every((p) => completed.has(p))) return m.id;
  }
  return null;
}

export function StudyTrail({ theme, activeModuleId, completedModuleIds, onSelectModule }: StudyTrailProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [cols, setCols] = useState(6);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 900;
      setCols(w < 520 ? 3 : w < 760 ? 4 : 6);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const due = useMemo(() => new Set(dueReviews(getStudyRhythmSnapshot(), localDay())), []);
  const next = recommendedNext(completedModuleIds);

  // Logical width shrinks with the column count so labels keep a readable size on phones.
  const W = cols === 3 ? 440 : cols === 4 ? 660 : 960;
  const padX = cols === 3 ? 62 : 80;
  const rowH = cols === 3 ? 140 : 150;
  const top = 86;
  const ids = STUDY_MODULES_LIST.map((m) => m.id);
  const rows = Math.ceil(ids.length / cols);
  const H = top + rows * rowH;
  const stepX = (W - padX * 2) / (cols - 1);

  // Serpentine layout: left-to-right, then right-to-left, like a path down a notebook page.
  const pos = ids.map((_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const col = r % 2 === 0 ? c : cols - 1 - c;
    // Small deterministic sway so the path never looks ruled.
    const sway = Math.sin(i * 1.7) * 9;
    return { x: padX + col * stepX, y: top + r * rowH + sway };
  });

  // One smooth trail through all stations; row turns bulge outwards like a hand-drawn U-turn.
  let d = `M ${pos[0].x} ${pos[0].y}`;
  for (let i = 1; i < pos.length; i++) {
    const a = pos[i - 1];
    const b = pos[i];
    const sameRow = Math.abs(a.y - b.y) < rowH / 2;
    if (sameRow) {
      const mx = (a.x + b.x) / 2;
      d += ` Q ${mx} ${(a.y + b.y) / 2 + (i % 2 === 0 ? 14 : -14)} ${b.x} ${b.y}`;
    } else {
      const out = a.x > W / 2 ? 62 : -62;
      d += ` C ${a.x + out} ${a.y + 10} ${b.x + out} ${b.y - 10} ${b.x} ${b.y}`;
    }
  }

  const ink = getCrayonHex('graphite', theme);
  const pencil = getCrayonHex('pencil', theme);
  const sage = getCrayonHex('sage', theme);
  const ochre = getCrayonHex('ochre', theme);
  const paper = theme === 'paper' ? '#FCFBF8' : '#101318';

  const stationState = (id: StudyModuleId): StationState =>
    completedModuleIds.has(id)
      ? 'done'
      : STUDY_MODULES[id].prerequisites.every((p) => completedModuleIds.has(p))
        ? 'open'
        : 'locked';

  const phaseStarts = new Set(
    ids.filter((id, i) => i === 0 || STUDY_MODULES[ids[i - 1]].phaseId !== STUDY_MODULES[id].phaseId)
  );

  const svgChildren = (
    <>
      <path d={d} fill="none" stroke={pencil} strokeWidth="7" strokeOpacity="0.18" />
      <path d={d} fill="none" stroke={pencil} strokeWidth="1.6" strokeDasharray="7 7" />
      {ids.map((id, i) => {
        const m = STUDY_MODULES[id];
        const phase = STUDY_PHASES_MAP[m.phaseId];
        const color = getCrayonHex(phase.crayon, theme);
        const st = stationState(id);
        const { x, y } = pos[i];
        const isHere = id === activeModuleId;
        const isNext = id === next;
        const missing = m.prerequisites.filter((p) => !completedModuleIds.has(p));
        const label =
          `${id} ${m.shortLabel}. ` +
          (st === 'done' ? 'Dominado.' : st === 'open' ? 'Disponible.' : `Requiere ${missing.join(', ')}.`) +
          (due.has(id) ? ' Repaso pendiente.' : '') +
          (isNext ? ' Siguiente recomendado.' : '');
        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-label={label}
            data-testid={`trail-${id}`}
            data-state={st}
            className="cursor-pointer outline-none trail-station"
            onClick={() => onSelectModule(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectModule(id);
              }
            }}
          >
            <title>{label}</title>
            {phaseStarts.has(id) && (
              <text x={x < W / 2 ? Math.max(8, x - 40) : Math.min(W - 8, x + 40)} y={y - 54} textAnchor={x < W / 2 ? 'start' : 'end'} fontSize="15" fill={color} className="font-display" stroke={paper} strokeWidth="4" style={{ paintOrder: 'stroke' }}>
                Fase {phase.index} · {phase.shortTitle}
              </text>
            )}
            {(isNext || isHere) && (
              <circle cx={x} cy={y} r="29" fill="none" stroke={isHere ? ink : color} strokeWidth="1.6" strokeDasharray={isHere ? undefined : '3 4'} />
            )}
            <circle cx={x} cy={y} r="34" fill="transparent" data-crisp="" />
            <circle
              cx={x}
              cy={y}
              r="21"
              fill={st === 'done' ? `${sage}55` : paper}
              stroke={st === 'locked' ? pencil : st === 'done' ? sage : color}
              strokeWidth={st === 'open' ? 3 : 2}
              strokeDasharray={st === 'locked' ? '4 4' : undefined}
            />
            {st === 'done' ? (
              <path d={`M ${x - 8} ${y + 1} L ${x - 2} ${y + 7} L ${x + 9} ${y - 7}`} fill="none" stroke={sage} strokeWidth="3" />
            ) : (
              <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fill={st === 'locked' ? pencil : ink} className="font-hand">
                {id}
              </text>
            )}
            <text
              x={x}
              y={y + 42}
              textAnchor="middle"
              fontSize="13"
              fill={st === 'locked' ? pencil : ink}
              className="font-hand"
              stroke={paper}
              strokeWidth="4"
              style={{ paintOrder: 'stroke' }}
            >
              {st === 'done' ? `${id} · ${m.shortLabel}` : m.shortLabel}
            </text>
            {isHere && (
              <text x={x} y={y - 30} textAnchor="middle" fontSize="12" fill={ink} className="font-hand" stroke={paper} strokeWidth="4" style={{ paintOrder: 'stroke' }}>
                estás aquí
              </text>
            )}
            {isNext && !isHere && (
              <text x={x} y={y - 30} textAnchor="middle" fontSize="12" fill={color} className="font-hand" stroke={paper} strokeWidth="4" style={{ paintOrder: 'stroke' }}>
                siguiente
              </text>
            )}
            {due.has(id) && (
              <g>
                <line x1={x + 16} y1={y - 16} x2={x + 16} y2={y - 36} stroke={ochre} strokeWidth="2" />
                <polygon points={`${x + 16},${y - 36} ${x + 30},${y - 31} ${x + 16},${y - 26}`} fill={`${ochre}aa`} stroke={ochre} strokeWidth="1.5" />
              </g>
            )}
          </g>
        );
      })}
    </>
  );

  return (
    <div ref={wrapRef} className="w-full" data-testid="study-trail">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-2 text-[13.5px] font-hand text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: `${sage}88`, border: `1.5px solid ${sage}` }} />
          dominado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ border: `2.5px solid ${getCrayonHex('cobalt', theme)}` }} />
          disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ border: `1.5px dashed ${pencil}` }} />
          faltan prerrequisitos
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: ochre }}>
          <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
            <line x1="2" y1="1" x2="2" y2="13" stroke={ochre} strokeWidth="1.6" />
            <polygon points="2,1 11,4 2,7" fill={ochre} />
          </svg>
          repaso pendiente
        </span>
        {next && (
          <button
            type="button"
            onClick={() => onSelectModule(next)}
            className="ml-auto font-display text-[15px] text-[var(--ui-accent)] underline decoration-wavy underline-offset-4 cursor-pointer"
          >
            Siguiente recomendado: {next} · {STUDY_MODULES[next].shortLabel} →
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="group" aria-label="Camino de estudio">
        {handifySvgTree(svgChildren, 'trail', true)}
      </svg>
    </div>
  );
}
