import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSessionSalt, hashStringSeed, shuffledOptionOrder } from '../core/optionShuffle';
import { getModuleQuestions, pickQuestionIndex } from '../core/questionBank';
import { REVIEW_INTERVALS_DAYS, localDay, useStudyRhythm } from '../storage/studyRhythm';
import { XP, getGameSnapshot, useGameProgress, xpOnDay } from '../storage/gameProgress';
import { INTUITION_CHALLENGES } from '../core/intuitionChallenges';
import { STUDY_PHASES } from '../core/studyPlan';
import { GameHud, GameToasts, useGameToasts } from './GameHud';
import { WelcomeGuide, hasSeenWelcome, markWelcomeSeen, shouldAutoShowWelcome } from './WelcomeGuide';
import {
  STUDY_MODULES,
  STUDY_PHASES_MAP,
  VERIFIED_REFERENCES,
  getAdjacentModuleIds,
  getDependentsOf,
} from '../core/studyPlan';
import type { StudyModuleId } from '../core/studyPlanTypes';
import type { DiagnosticReport } from '../core/diagnostic';
import { SCENES } from '../core/curriculum';
import type { SceneId, ThemeMode } from '../core/types';
import { HandCrafted3DStage } from '../visuals/HandCrafted3DStage';
import { ModuleVisualDispatcher } from '../visuals/ModuleVisualDispatcher';
import { VisualStateReportProvider } from '../visuals/VisualHelpers';
import { IntuitionChallenge } from './IntuitionChallenge';
import { PythonLab } from './PythonLab';
import { CrayonDictionaryProvider, GlossaryText } from './CrayonDictionary';
import {
  CrayonArrowLeft,
  CrayonArrowRight,
  CrayonCheck,
  CrayonLightbulb,
  CrayonPencil,
} from './CrayonIcons';
import { CrayonStamp } from './CrayonStamp';
import { KatexInline } from './KatexFormula';
import {
  CrayonButton,
  CrayonProgressStroke,
  CrayonStepMarker,
  RoughDivider,
  RoughUnderline,
} from './RoughElements';

interface ModuleWorkspaceProps {
  moduleId: StudyModuleId;
  theme: ThemeMode;
  completedModuleIds: ReadonlySet<StudyModuleId>;
  diagnosticReport: DiagnosticReport | null;
  onSelectModule: (id: StudyModuleId) => void;
  onMarkModuleCompleted: (id: StudyModuleId) => void;
  onOpen3DScene: (sceneId: SceneId) => void;
  onOpenDiagnostic: () => void;
  onOpenPlanMap: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  W: 'Interactivo',
  A: 'Animación',
  E: 'Diagrama',
  R: 'Referencia',
};

const CHAPTERS = [
  { id: 'intuition', label: 'I. Intuición' },
  { id: 'story3d', label: 'II. 3D y Teoría' },
  { id: 'atlas', label: 'III. Atlas y Temario' },
  { id: 'practice', label: 'IV. Python y Sello' },
] as const;

const STORY_BEAT_TITLES = [
  'Matemática pura',
  'Computación e IA',
  'Cálculo concreto',
  'Definición formal',
] as const;

type ChapterId = (typeof CHAPTERS)[number]['id'];

export function ModuleWorkspace({
  moduleId,
  theme,
  completedModuleIds,
  diagnosticReport,
  onSelectModule,
  onMarkModuleCompleted,
  onOpen3DScene,
  onOpenDiagnostic,
  onOpenPlanMap,
}: ModuleWorkspaceProps) {
  const mod = STUDY_MODULES[moduleId];
  const phase = STUDY_PHASES_MAP[mod.phaseId];
  const { prev, next } = getAdjacentModuleIds(moduleId);
  const dependents = getDependentsOf(moduleId);
  const isCompleted = completedModuleIds.has(moduleId);
  const totalPercent = Math.round((completedModuleIds.size / 32) * 100);

  // R-OM checkpoint state. Indices are always the ORIGINAL data indices; only the display
  // order is shuffled, so the correct answer cannot be found by position.
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [eliminated, setEliminated] = useState<ReadonlySet<number>>(() => new Set());
  const [solved, setSolved] = useState(false);
  const [sessionSalt] = useState(createSessionSalt);

  // Scroll-driven state
  const [pageProgress, setPageProgress] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [activeBeat, setActiveBeat] = useState(0);
  const [activeChapter, setActiveChapter] = useState<ChapterId>('intuition');

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const chapterRefs = useRef<Record<ChapterId, HTMLElement | null>>({
    intuition: null,
    story3d: null,
    atlas: null,
    practice: null,
  });
  const beatRefs = useRef<Array<HTMLElement | null>>([null, null, null, null]);

  // Reset checkpoint & scroll cleanly on module change
  useEffect(() => {
    setSelectedOpt(null);
    setSubmitted(false);
    setAttempt(0);
    setEliminated(new Set());
    setSolved(false);
    setLastWrong(null);
    setPageProgress(0);
    setStoryProgress(0);
    setActiveBeat(0);
    setActiveChapter('intuition');
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [moduleId]);

  // Smooth rAF-throttled scroll tracker driving the 3D sculpture, active narrative beat & ink progress thread
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let rafId = 0;

    const computeScroll = () => {
      rafId = 0;
      const maxScroll = Math.max(1, container.scrollHeight - container.clientHeight);
      const nextPageProg = Math.max(0, Math.min(1, container.scrollTop / maxScroll));
      setPageProgress(nextPageProg);

      const containerRect = container.getBoundingClientRect();
      const focusY = containerRect.top + containerRect.height * 0.36;

      // Determine active chapter
      let currentChap: ChapterId = 'intuition';
      for (const ch of CHAPTERS) {
        const el = chapterRefs.current[ch.id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= focusY + 40) {
          currentChap = ch.id;
        }
      }
      setActiveChapter(currentChap);

      // Compute continuous scroll progress (0..1) inside Chapter II (3D Scrollytelling)
      const storyEl = chapterRefs.current.story3d;
      if (storyEl) {
        const r = storyEl.getBoundingClientRect();
        const span = Math.max(180, r.height - containerRect.height * 0.35);
        const passed = containerRect.top + containerRect.height * 0.28 - r.top;
        const prog = Math.max(0, Math.min(1, passed / span));
        setStoryProgress(prog);
      }

      // Highlight nearest narrative beat 0..3
      let bestBeat = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      beatRefs.current.forEach((el, idx) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mid = (r.top + r.bottom) * 0.5;
        const dist = Math.abs(mid - focusY);
        if (dist < bestDist) {
          bestDist = dist;
          bestBeat = idx;
        }
      });
      setActiveBeat(bestBeat);
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(computeScroll);
      }
    };

    computeScroll();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
    };
  }, [moduleId]);

  // Scroll-driven reveal: each chapter rises into place the first time it scrolls into view.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const els = Object.values(chapterRefs.current).filter((el): el is HTMLElement => !!el);
    els.forEach((el) => delete el.dataset.inview);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.inview = 'true';
            io.unobserve(e.target);
          }
        }
      },
      { root, threshold: 0.06 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [moduleId]);

  const scrollToChapter = useCallback((id: ChapterId) => {
    const el = chapterRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const scrollToBeat = useCallback((beatIndex: number) => {
    const el = beatRefs.current[beatIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // ── Study rhythm: streak + spaced re-checks of sealed modules ──
  const rhythm = useStudyRhythm(completedModuleIds);

  // ── Game layer: trazos only for learning actions, each granted once (see gameProgress.ts) ──
  const game = useGameProgress();
  const { toasts, push: pushToast } = useGameToasts();
  const grant = useCallback(
    (key: string, xp: number, label: string) => {
      const before = xpOnDay(getGameSnapshot(), localDay());
      if (!game.award(key, xp)) return;
      pushToast({ tone: 'xp', title: `+${xp} trazos`, detail: label });
      const goal = getGameSnapshot().goal;
      if (before < goal && before + xp >= goal) {
        pushToast({ tone: 'goal', title: 'Meta del día cumplida', detail: `${goal} trazos hoy. Lo que sumes ahora es extra.` });
      }
    },
    [game, pushToast]
  );
  const [welcomeOpen, setWelcomeOpen] = useState(() =>
    shouldAutoShowWelcome({ seen: hasSeenWelcome(), sealed: completedModuleIds.size, trazos: game.total })
  );
  const closeWelcome = useCallback(() => {
    markWelcomeSeen();
    setWelcomeOpen(false);
  }, []);

  const completedPhases = useMemo(
    () => STUDY_PHASES.filter((ph) => ph.moduleIds.length > 0 && ph.moduleIds.every((id) => completedModuleIds.has(id))).length,
    [completedModuleIds]
  );
  useEffect(() => {
    const fresh = game.syncAchievements({ sealedCount: completedModuleIds.size, completedPhases, streak: rhythm.streak });
    // On a first load with lots of earlier progress, celebrate at most two and summarize the rest.
    fresh.slice(0, 2).forEach((a) => pushToast({ tone: 'achievement', title: `Logro: ${a.title}`, detail: a.detail }));
    if (fresh.length > 2) pushToast({ tone: 'achievement', title: `+${fresh.length - 2} logros más`, detail: 'Míralos en el cuaderno de logros.' });
  }, [completedModuleIds.size, completedPhases, rhythm.streak, game.total, game, pushToast]);

  const challengeSteps = INTUITION_CHALLENGES[moduleId]?.length ?? 0;
  const chapterDone: Record<ChapterId, boolean> = {
    intuition: challengeSteps > 0 && Array.from({ length: challengeSteps }, (_, i) => game.has(`ch:${moduleId}:${i}`)).every(Boolean),
    story3d: game.has(`story:${moduleId}`),
    atlas: false,
    practice: isCompleted,
  };

  // Chapter II counts as read only when each of its four beats was actually on screen for a while,
  // so jumping past it with the chapter navigation (a smooth scroll through it) does not count.
  const beatDwell = useRef<number[]>([0, 0, 0, 0]);
  const beatSince = useRef<{ beat: number; t: number } | null>(null);
  useEffect(() => {
    beatDwell.current = [0, 0, 0, 0];
    beatSince.current = null;
  }, [moduleId]);
  useEffect(() => {
    const now = performance.now();
    const prev = beatSince.current;
    if (prev) beatDwell.current[prev.beat] += now - prev.t;
    beatSince.current = { beat: activeBeat, t: now };
    // Credit the current beat even if the reader rests on it without scrolling again.
    const id = window.setTimeout(() => {
      const cur = beatSince.current;
      if (!cur) return;
      const dwell = [...beatDwell.current];
      dwell[cur.beat] += performance.now() - cur.t;
      if (dwell.every((ms) => ms >= 1500)) grant(`story:${moduleId}`, XP.story, 'Recorriste el capítulo 3D completo');
    }, 1600);
    const dwellNow = beatDwell.current;
    if (dwellNow.every((ms) => ms >= 1500)) grant(`story:${moduleId}`, XP.story, 'Recorriste el capítulo 3D completo');
    return () => window.clearTimeout(id);
  }, [activeBeat, moduleId, grant]);

  const [visualState, setVisualState] = useState<Record<string, unknown> | null>(null);
  useEffect(() => setVisualState(null), [moduleId]);
  const reviewMode = isCompleted && rhythm.isDue(moduleId);
  const [roundOutcome, setRoundOutcome] = useState<
    { kind: 'review'; firstTry: boolean; nextDays: number } | { kind: 'seal' } | null
  >(null);
  const pendingChapterRef = useRef<ChapterId | null>(null);
  useEffect(() => {
    setRoundOutcome(null);
    const pending = pendingChapterRef.current;
    if (!pending) return;
    pendingChapterRef.current = null;
    // After the module swap renders and the scroll resets, glide to the requested chapter.
    const id = window.setTimeout(() => scrollToChapter(pending), 60);
    return () => window.clearTimeout(id);
  }, [moduleId, scrollToChapter]);
  const goToReview = (id: StudyModuleId) => {
    if (id === moduleId) {
      scrollToChapter('practice');
    } else {
      pendingChapterRef.current = 'practice';
      onSelectModule(id);
    }
  };

  const diagBlock = diagnosticReport?.blocks.find((b) => b.moduleId === moduleId) ?? null;
  const linkedScene = mod.linked3DSceneId ? SCENES[mod.linked3DSceneId] : null;
  const secondaryScene = mod.secondary3DSceneId ? SCENES[mod.secondary3DSceneId] : null;

  // Question bank: each round asks the next question, starting from a per-session offset.
  const questions = useMemo(() => getModuleQuestions(moduleId), [moduleId]);
  const qIndex = pickQuestionIndex(questions.length, attempt, hashStringSeed(`${sessionSalt}:${moduleId}`));
  const q = questions[qIndex];
  const optionOrder = useMemo(
    () => shuffledOptionOrder(q.options.length, `${q.id}#${attempt}#${sessionSalt}`),
    [q.options.length, q.id, attempt, sessionSalt]
  );
  const [lastWrong, setLastWrong] = useState<number | null>(null);
  const isCorrect = submitted && selectedOpt === q.correctIndex;
  const wrongTries = eliminated.size;
  /** Sealed only when solved with no wrong try in this round (elimination is not mastery). */
  const cleanSolve = solved && wrongTries === 0;

  const handleVerifyCheckpoint = () => {
    if (selectedOpt === null || solved) return;
    setSubmitted(true);
    rhythm.markActive();
    if (selectedOpt === q.correctIndex) {
      setSolved(true);
      const firstTry = wrongTries === 0;
      if (reviewMode) {
        const stage = rhythm.stageOf(moduleId) ?? -1;
        const nextStage = firstTry ? Math.min(REVIEW_INTERVALS_DAYS.length - 1, stage + 1) : 0;
        rhythm.onReviewed(moduleId, firstTry);
        setRoundOutcome({ kind: 'review', firstTry, nextDays: REVIEW_INTERVALS_DAYS[nextStage] });
        if (firstTry) grant(`review:${moduleId}:${localDay()}`, XP.review, 'Lo recordabas en el repaso');
      } else if (firstTry) {
        if (!isCompleted) {
          onMarkModuleCompleted(moduleId);
          rhythm.onSealed(moduleId);
          setRoundOutcome({ kind: 'seal' });
          grant(`seal:${moduleId}`, XP.seal, `Sellaste ${moduleId}`);
        }
        grant(`q:${q.id}`, XP.practice, 'Pregunta nueva acertada a la primera');
      }
    } else {
      // Cross the distractor out, but never reveal which option is right.
      setEliminated((prev) => new Set(prev).add(selectedOpt));
      setLastWrong(selectedOpt);
    }
  };

  const handleNewRound = () => {
    setAttempt((a) => a + 1);
    setEliminated(new Set());
    setSelectedOpt(null);
    setSubmitted(false);
    setSolved(false);
    setLastWrong(null);
    setRoundOutcome(null);
  };


  return (
    <CrayonDictionaryProvider
      theme={theme}
      activeModuleId={moduleId}
      onJumpToModule={onSelectModule}
    >
      <div
        ref={scrollRef}
        data-testid="module-workspace"
        data-active-chapter={activeChapter}
        data-story-progress={storyProgress.toFixed(2)}
        className="h-full w-full overflow-y-auto notebook-paper-bg notebook-scroll relative"
      >
        {/* Sticky Open-Page Scroll Thread & Chapter Anchors (zero box, crisp opaque paper background) */}
        <div
          className="sticky top-0 z-20 border-b border-dashed border-[var(--hairline)]"
          style={{ backgroundColor: 'var(--bg-paper)' }}
        >
          <div className="max-w-[1140px] mx-auto px-3.5 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
            <nav
              aria-label="Capítulos del cuaderno"
              className="flex items-center gap-x-4 sm:gap-x-6 gap-y-1 overflow-x-auto no-scrollbar"
            >
              {CHAPTERS.map((ch) => {
                const isAct = activeChapter === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    data-testid={`chapter-nav-${ch.id}`}
                    onClick={() => scrollToChapter(ch.id)}
                    className={`relative shrink-0 py-0.5 text-[14px] sm:text-[15px] whitespace-nowrap cursor-pointer transition-colors ${
                      isAct
                        ? 'font-display text-[16.5px] sm:text-[17.5px] text-[var(--ui-accent)]'
                        : 'font-hand text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {ch.label}
                    {chapterDone[ch.id] && (
                      <span className="ml-1 text-[var(--ui-success)]" aria-label="completado">
                        ✓
                      </span>
                    )}
                    {isAct && (
                      <span aria-hidden="true" className="absolute left-0 right-0 -bottom-1">
                        <RoughUnderline crayon="cobalt" theme={theme} seed={ch.id.length * 13 + 5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <GameHud
              theme={theme}
              state={game.state}
              total={game.total}
              todayXp={game.todayXp}
              level={game.level}
              onSetGoal={game.setGoal}
              onShowGuide={() => setWelcomeOpen(true)}
            />
          </div>

          {/* Continuous hand-drawn wavy crayon scroll progress thread */}
          <div className="h-[5px] w-full overflow-hidden" aria-hidden="true">
            <svg
              viewBox="0 0 1000 6"
              preserveAspectRatio="none"
              className="block w-full h-full"
            >
              <path
                d="M 0 3.2 Q 125 1.4 250 3.3 T 500 2.9 T 750 3.4 T 1000 2.8"
                fill="none"
                stroke="var(--hairline)"
                strokeWidth="1.2"
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
              <path
                d="M 0 3.2 Q 125 1.4 250 3.3 T 500 2.9 T 750 3.4 T 1000 2.8"
                fill="none"
                stroke="var(--ui-accent)"
                strokeWidth="2.4"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset={Math.max(0, 100 - pageProgress * 100)}
                style={{ opacity: 0.82 }}
              />
            </svg>
          </div>
        </div>

        {/* Continuous Open-Page Notebook Spread — Zero Excess Boxes */}
        <div className="max-w-[1140px] mx-auto px-4 sm:px-7 lg:px-10 py-6 sm:py-8 space-y-14 pb-20">
          {/* ── MASTHEAD ──────────────────────────────────────────────────── */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-[var(--text-muted)]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <button
                  type="button"
                  onClick={onOpenPlanMap}
                  className="font-hand text-[14.5px] text-[var(--text-secondary)] hover:text-[var(--ui-accent)] underline decoration-dotted cursor-pointer transition-colors"
                >
                  Fase {phase.index}: {phase.shortTitle}
                </button>
                <span aria-hidden="true">·</span>
                <span className="font-mono-math text-[13px]">{mod.id} de 32</span>
                <span aria-hidden="true">·</span>
                <span>Nivel {mod.level}</span>
                {mod.optional && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Opcional</span>
                  </>
                )}
                {isCompleted && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[var(--ui-success)] font-display text-[15px]">
                      <CrayonCheck size={14} /> Dominado
                    </span>
                  </>
                )}
                {diagBlock && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span
                      className="font-hand"
                      style={{
                        color:
                          diagBlock.recommendation === 'repaso-rapido'
                            ? 'var(--ui-success)'
                            : 'var(--ui-warning)',
                      }}
                    >
                      Diagnóstico:{' '}
                      {diagBlock.recommendation === 'repaso-rapido'
                        ? 'Repaso rápido'
                        : 'Cursar completo'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:inline-flex items-center gap-1.5 mr-1 text-[12.5px] font-mono-math text-[var(--text-muted)]"
                  title={`Avance global del plan: ${completedModuleIds.size} de 32 módulos dominados`}
                >
                  <CrayonProgressStroke
                    percent={totalPercent}
                    crayon="sage"
                    theme={theme}
                    seed={41}
                    className="w-16 h-[10px]"
                  />
                  <span>{completedModuleIds.size}/32</span>
                </div>
                <button
                  type="button"
                  disabled={!prev}
                  onClick={() => prev && onSelectModule(prev)}
                  className="sketch-btn inline-flex items-center gap-1 px-2.5 py-1 text-[13.5px] font-hand text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-35 cursor-pointer"
                >
                  <CrayonArrowLeft size={13} />
                  <span>{prev ?? 'Inicio'}</span>
                </button>
                <button
                  type="button"
                  disabled={!next}
                  onClick={() => next && onSelectModule(next)}
                  className="sketch-btn inline-flex items-center gap-1 px-2.5 py-1 text-[13.5px] font-hand text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-35 cursor-pointer"
                >
                  <span>{next ?? 'Fin'}</span>
                  <CrayonArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <h1 className="font-display crayon-ink text-[30px] sm:text-[38px] leading-[1.06] text-[var(--text-primary)]">
                  {mod.id} · {mod.title}
                </h1>
                <p className="text-[16.5px] sm:text-[17.5px] text-[var(--text-secondary)] leading-relaxed max-w-[760px]">
                  <GlossaryText text={mod.appliedCsMlFocus} />
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {linkedScene ? (
                  <CrayonButton
                    crayon="cobalt"
                    theme={theme}
                    seed={mod.number * 13 + 7}
                    dataTestId="open-linked-3d-btn"
                    onClick={() => onOpen3DScene(linkedScene.id)}
                  >
                    <span>Abrir Lab 3D: {linkedScene.shortLabel}</span>
                    <CrayonArrowRight size={15} />
                  </CrayonButton>
                ) : !diagnosticReport && mod.id === 'M1' ? (
                  <CrayonButton
                    crayon="cobalt"
                    theme={theme}
                    seed={91}
                    dataTestId="open-diagnostic-cta"
                    onClick={onOpenDiagnostic}
                  >
                    <span>Hacer Diagnóstico (Fase 0)</span>
                    <CrayonArrowRight size={15} />
                  </CrayonButton>
                ) : null}

                {secondaryScene && (
                  <button
                    type="button"
                    onClick={() => onOpen3DScene(secondaryScene.id)}
                    className="sketch-btn px-3 py-1.5 text-[14.5px] font-hand text-[var(--text-primary)] cursor-pointer"
                  >
                    Lab 3D extra: {secondaryScene.shortLabel}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px] text-[var(--text-secondary)]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[var(--text-muted)]">Prerrequisitos:</span>
                {mod.prerequisites.length === 0 ? (
                  <span>Ninguno (punto de entrada)</span>
                ) : (
                  mod.prerequisites.map((pre, i) => (
                    <span key={pre} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-[var(--hairline-strong)]">·</span>}
                      <button
                        type="button"
                        onClick={() => onSelectModule(pre)}
                        className="font-mono-math text-[13px] underline decoration-dotted hover:text-[var(--ui-accent)] cursor-pointer"
                      >
                        {pre}
                        {completedModuleIds.has(pre) ? ' ✓' : ''}
                      </button>
                    </span>
                  ))
                )}
              </div>

              {(rhythm.streak > 0 || rhythm.due.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 font-hand" data-testid="study-rhythm">
                  {rhythm.streak > 0 && (
                    <span
                      className="text-[var(--ui-success)]"
                      title={rhythm.activeToday ? 'Ya estudiaste hoy' : 'Resuelve un reto hoy para mantener la racha'}
                    >
                      Racha: {rhythm.streak} {rhythm.streak === 1 ? 'día' : 'días'}
                      {!rhythm.activeToday && ' (sigue hoy)'}
                    </span>
                  )}
                  {rhythm.due.length > 0 && (
                    <>
                      {rhythm.streak > 0 && <span className="text-[var(--hairline-strong)]">·</span>}
                      <span className="text-[var(--ui-warning)]">Para repasar hoy:</span>
                      {rhythm.due.slice(0, 4).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => goToReview(id)}
                          className="underline decoration-wavy decoration-[var(--ui-warning)] underline-offset-[3px] hover:text-[var(--ui-accent)] cursor-pointer"
                          title={`Repasar ${id}: ${STUDY_MODULES[id].shortLabel}`}
                        >
                          {id}
                        </button>
                      ))}
                      {rhythm.due.length > 4 && <span>+{rhythm.due.length - 4}</span>}
                    </>
                  )}
                </div>
              )}

              {dependents.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[var(--text-muted)]">Desbloquea:</span>
                  {dependents.slice(0, 5).map((dep, i) => (
                    <span key={dep} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-[var(--hairline-strong)]">·</span>}
                      <button
                        type="button"
                        onClick={() => onSelectModule(dep)}
                        className="font-mono-math text-[13px] hover:text-[var(--ui-accent)] cursor-pointer"
                      >
                        {dep}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </header>

          <RoughDivider theme={theme} seed={mod.number * 17 + 3} />

          {/* ── CHAPTER I: DIRECT-MANIPULATION INTUITION STAGE ────────────── */}
          <section
            ref={(el) => {
              chapterRefs.current.intuition = el;
            }}
            data-scroll-chapter="intuition"
            className="scroll-mt-16 space-y-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display crayon-ink text-[24px] sm:text-[27px] text-[var(--text-primary)]">
                I. Toca la intuición directamente
              </h2>
              <span className="font-hand text-[14.5px] text-[var(--text-muted)]">
                Peldaño A · Manipulación viva sobre el cuaderno
              </span>
            </div>

            <IntuitionChallenge
              moduleId={moduleId}
              theme={theme}
              state={visualState}
              onStepSolved={(i) => {
                rhythm.markActive();
                grant(`ch:${moduleId}:${i}`, XP.challengeStep, `Paso ${i + 1} del reto de intuición`);
              }}
            />

            <VisualStateReportProvider value={setVisualState}>
              <ModuleVisualDispatcher
                moduleId={moduleId}
                theme={theme}
                onOpen3DLab={linkedScene ? () => onOpen3DScene(linkedScene.id) : undefined}
                linked3DLabel={linkedScene ? `Abrir Lab 3D: ${linkedScene.shortLabel}` : undefined}
              />
            </VisualStateReportProvider>
          </section>

          <RoughDivider theme={theme} seed={mod.number * 23 + 11} />

          {/* ── CHAPTER II: SCROLL-DRIVEN 3D STORYTELLING & THEORY ────────── */}
          <section
            ref={(el) => {
              chapterRefs.current.story3d = el;
            }}
            data-scroll-chapter="story3d"
            className="scroll-mt-16 space-y-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display crayon-ink text-[24px] sm:text-[27px] text-[var(--text-primary)]">
                II. Recorrido 3D y formalización paso a paso
              </h2>
              <span className="font-hand text-[14.5px] text-[var(--text-muted)]">
                Desplázate: el dibujo 3D evoluciona con cada peldaño
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
              {/* Mobile/Tablet: 3D Stage appears first so touch users inspect immediately; Desktop: Sticky right column */}
              <div className="sticky top-[46px] z-10 -mx-4 px-4 pb-2 border-b border-dashed border-[var(--hairline)] bg-[var(--bg-paper)] sm:-mx-7 sm:px-7 lg:mx-0 lg:px-0 lg:pb-0 lg:border-0 lg:bg-transparent lg:col-span-6 lg:order-2 lg:top-16">
                <HandCrafted3DStage
                  moduleId={moduleId}
                  theme={theme}
                  scrollProgress={storyProgress}
                  activeBeat={activeBeat}
                  activeBeatLabel={STORY_BEAT_TITLES[activeBeat]}
                  onOpenWebGL={linkedScene ? () => onOpen3DScene(linkedScene.id) : undefined}
                  webGLLabel={linkedScene ? `Explorar en Lab 3D WebGL: ${linkedScene.shortLabel}` : undefined}
                />
              </div>

              {/* Left Open-Page Scrollytelling Narrative Beats connected by a continuous hand-drawn crayon spine */}
              <div className="relative lg:col-span-6 lg:order-1 pl-9 sm:pl-11 space-y-10 sm:space-y-12">
                {/* Continuous hand-sketched vertical crayon ink spine growing smoothly with storyProgress */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 18 400"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute left-[11px] sm:left-[13px] top-3 bottom-4 w-[18px] h-[calc(100%-28px)]"
                >
                  <path
                    d="M 9 0 Q 6 65 10.5 130 T 7.5 265 T 9.5 400"
                    fill="none"
                    stroke="var(--hairline-strong)"
                    strokeWidth="1.4"
                    strokeDasharray="5 6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 9 0 Q 6 65 10.5 130 T 7.5 265 T 9.5 400"
                    fill="none"
                    stroke="var(--ui-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    strokeDashoffset={Math.max(0, 100 - Math.max(8, storyProgress * 100))}
                    style={{ opacity: 0.82 }}
                  />
                </svg>

                {/* Beat 01: Enfoque de matemática pura */}
                <article
                  ref={(el) => {
                    beatRefs.current[0] = el;
                  }}
                  data-beat-active={activeBeat === 0 ? 'true' : undefined}
                  className={`relative scroll-beat ${
                    activeBeat === 0
                      ? 'opacity-100 translate-x-0.5'
                      : 'opacity-76 hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => scrollToBeat(0)}
                    aria-label="Ir al peldaño 1: Enfoque de matemática pura"
                    className="absolute -left-9 sm:-left-11 top-0.5 cursor-pointer bg-[var(--bg-paper)] rounded-full"
                  >
                    <CrayonStepMarker
                      index={0}
                      active={activeBeat === 0}
                      completed={activeBeat > 0}
                      crayon="cobalt"
                      theme={theme}
                      label="01"
                      size={26}
                    />
                  </button>
                  <div className="flex items-center gap-2 text-[14px] font-hand text-[var(--ui-accent)] mb-1">
                    <CrayonPencil size={14} />
                    <span>Enfoque de matemática pura</span>
                  </div>
                  <h3 className="font-display text-[21.5px] text-[var(--text-primary)] mb-1.5">
                    La estructura detrás del trazo
                  </h3>
                  <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">
                    <GlossaryText text={mod.pureMathFocus} />
                  </p>
                </article>

                {/* Beat 02: Computación e IA */}
                <article
                  ref={(el) => {
                    beatRefs.current[1] = el;
                  }}
                  data-beat-active={activeBeat === 1 ? 'true' : undefined}
                  className={`relative scroll-beat ${
                    activeBeat === 1
                      ? 'opacity-100 translate-x-0.5'
                      : 'opacity-76 hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => scrollToBeat(1)}
                    aria-label="Ir al peldaño 2: Puente con computación e IA"
                    className="absolute -left-9 sm:-left-11 top-0.5 cursor-pointer bg-[var(--bg-paper)] rounded-full"
                  >
                    <CrayonStepMarker
                      index={1}
                      active={activeBeat === 1}
                      completed={activeBeat > 1}
                      crayon="sage"
                      theme={theme}
                      label="02"
                      size={26}
                    />
                  </button>
                  <div className="flex items-center gap-2 text-[14px] font-hand text-[var(--ui-success)] mb-1">
                    <CrayonLightbulb size={14} />
                    <span>Puente con computación e IA</span>
                  </div>
                  <h3 className="font-display text-[21.5px] text-[var(--text-primary)] mb-1.5">
                    Dónde cobra vida en software y modelos
                  </h3>
                  <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">
                    <GlossaryText text={mod.appliedCsMlFocus} />
                  </p>
                </article>

                {/* Beat 03: Cálculo concreto con números pequeños */}
                <article
                  ref={(el) => {
                    beatRefs.current[2] = el;
                  }}
                  data-beat-active={activeBeat === 2 ? 'true' : undefined}
                  className={`relative scroll-beat space-y-2.5 ${
                    activeBeat === 2
                      ? 'opacity-100 translate-x-0.5'
                      : 'opacity-76 hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => scrollToBeat(2)}
                    aria-label="Ir al peldaño 3: Cálculo con números pequeños"
                    className="absolute -left-9 sm:-left-11 top-0.5 cursor-pointer bg-[var(--bg-paper)] rounded-full"
                  >
                    <CrayonStepMarker
                      index={2}
                      active={activeBeat === 2}
                      completed={activeBeat > 2}
                      crayon="ochre"
                      theme={theme}
                      label="03"
                      size={26}
                    />
                  </button>
                  <div className="font-hand text-[14px] text-[var(--ui-accent)]">
                    Peldaño B · Cálculo con números pequeños
                  </div>
                  <h3 className="font-display text-[22px] text-[var(--text-primary)] leading-snug">
                    {mod.concreteExample.title}
                  </h3>
                  <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">
                    <GlossaryText text={mod.concreteExample.problem} />
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[15.5px] text-[var(--text-secondary)]">
                    {mod.concreteExample.steps.map((st, i) => (
                      <li key={i} className="leading-relaxed">
                        <GlossaryText text={st} />
                      </li>
                    ))}
                  </ol>
                </article>

                {/* Beat 04: Formalización y fórmula clave */}
                <article
                  ref={(el) => {
                    beatRefs.current[3] = el;
                  }}
                  data-beat-active={activeBeat === 3 ? 'true' : undefined}
                  className={`relative scroll-beat space-y-3 ${
                    activeBeat === 3
                      ? 'opacity-100 translate-x-0.5'
                      : 'opacity-76 hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => scrollToBeat(3)}
                    aria-label="Ir al peldaño 4: Definición formal"
                    className="absolute -left-9 sm:-left-11 top-0.5 cursor-pointer bg-[var(--bg-paper)] rounded-full"
                  >
                    <CrayonStepMarker
                      index={3}
                      active={activeBeat === 3}
                      completed={false}
                      crayon="plum"
                      theme={theme}
                      label="04"
                      size={26}
                    />
                  </button>
                  <div className="font-hand text-[14px] text-[var(--ui-accent)]">
                    Peldaño C · Definición formal
                  </div>
                  <div className="formula-nowrap py-2.5 px-3 border-y border-dashed border-[var(--hairline-strong)] overflow-x-auto text-[18px] text-[var(--text-primary)]">
                    <KatexInline latex={mod.concreteExample.latex} />
                  </div>
                  <p className="text-[16px] text-[var(--text-secondary)] leading-relaxed">
                    <GlossaryText text={mod.concreteExample.formalDefinition} />
                  </p>
                </article>
              </div>
            </div>
          </section>

          <RoughDivider theme={theme} seed={mod.number * 29 + 5} />

          {/* ── CHAPTER III: OPEN ATLAS OF REPRESENTATIONS & SYLLABUS ─────── */}
          <section
            ref={(el) => {
              chapterRefs.current.atlas = el;
            }}
            data-scroll-chapter="atlas"
            className="scroll-mt-16 space-y-8"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display crayon-ink text-[24px] sm:text-[27px] text-[var(--text-primary)]">
                  III. Atlas de representaciones visuales
                </h2>
                <span className="font-hand text-[14.5px] text-[var(--text-muted)]">
                  Cada idea en el medio visual que mejor la revela
                </span>
              </div>

              {/* Boxless open-paper ledger rows */}
              <div className="divide-y divide-dashed divide-[var(--hairline-strong)]">
                {mod.visualSpecs.map((vs, idx) => (
                  <div
                    key={vs.concept}
                    className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-baseline"
                  >
                    <div className="md:col-span-3 flex items-baseline gap-2">
                      <span className="font-mono-math text-[12px] text-[var(--text-muted)]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-display text-[17.5px] text-[var(--text-primary)]">
                        <GlossaryText text={vs.concept} />
                      </span>
                    </div>
                    <div className="md:col-span-4 text-[15px] text-[var(--text-secondary)] leading-snug">
                      <GlossaryText text={vs.visualization} />
                    </div>
                    <div className="md:col-span-1 font-mono-math text-[12px] text-[var(--ui-accent)]">
                      {FORMAT_LABELS[vs.format] ?? vs.format}
                    </div>
                    <div className="md:col-span-4 text-[15px] text-[var(--text-secondary)] leading-snug">
                      <GlossaryText text={vs.intuition} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unboxed 2-column open spread for Syllabus & Verified References */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pt-2">
              <div className="space-y-2.5">
                <h3 className="font-display text-[21px] text-[var(--text-primary)]">
                  Temario del módulo
                </h3>
                <ul className="space-y-2 text-[15.5px] text-[var(--text-secondary)]">
                  {mod.syllabus.map((item, idx) => (
                    <li key={item} className="flex items-baseline gap-2.5">
                      <span className="font-mono-math text-[12px] text-[var(--ui-accent)] shrink-0">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <span>
                        <GlossaryText text={item} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5 md:border-l md:border-dashed md:border-[var(--hairline-strong)] md:pl-8">
                <h3 className="font-display text-[21px] text-[var(--text-primary)]">
                  Bibliografía y cursos verificados
                </h3>
                <ul className="space-y-2.5 text-[15px] text-[var(--text-secondary)]">
                  {mod.references.map((code) => {
                    const ref = VERIFIED_REFERENCES[code];
                    return (
                      <li key={code} className="leading-snug">
                        <span className="font-mono-math text-[12px] text-[var(--ui-accent)] mr-1.5">
                          [{code}]
                        </span>
                        {ref.citation}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </section>

          <RoughDivider theme={theme} seed={mod.number * 31 + 7} />

          {/* ── CHAPTER IV: OPEN PYTHON NOTEBOOK & R-OM MASTERY STAMP ─────── */}
          <section
            ref={(el) => {
              chapterRefs.current.practice = el;
            }}
            data-scroll-chapter="practice"
            className="scroll-mt-16 space-y-10"
          >
            {/* Open Red-Margin Python Sheet (zero box!) */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[14px] font-hand text-[var(--ui-accent)]">
                    Peldaños D y E · Implementación en Python y conexión con IA
                  </div>
                  <h2 className="font-display crayon-ink text-[24px] sm:text-[27px] text-[var(--text-primary)]">
                    IV. {mod.pythonLab.title}
                  </h2>
                </div>
              </div>

              <p className="text-[16px] text-[var(--text-secondary)] max-w-[780px]">
                <GlossaryText text={mod.pythonLab.task} />
              </p>

              <PythonLab
                moduleId={moduleId}
                original={mod.pythonLab.code}
                onRunSuccess={() => grant(`lab:${moduleId}`, XP.lab, 'Ejecutaste el laboratorio')}
              />

              <p className="text-[15.5px] text-[var(--text-secondary)] max-w-[820px]">
                <strong className="font-display text-[17px] font-normal text-[var(--text-primary)]">
                  Conexión directa con CS/ML:
                </strong>{' '}
                <GlossaryText text={mod.pythonLab.mlApplication} />
              </p>
            </div>

            <RoughDivider theme={theme} seed={mod.number * 37 + 13} />

            {/* Open-Paper R-OM Mastery Challenge (zero outer box!) */}
            <div className="space-y-4 max-w-[820px]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-[240px]">
                  <div className="text-[14px] font-hand text-[var(--ui-accent)]">
                    {reviewMode && !solved ? 'Repaso espaciado · ¿Lo recuerdas sin mirar arriba?' : 'Verificación de dominio · Regla R-OM'}
                    <span className="ml-2 font-mono-math text-[12px] text-[var(--text-muted)]" data-testid="question-counter">
                      pregunta {qIndex + 1} de {questions.length}
                    </span>
                  </div>
                  <p className="font-display text-[21px] sm:text-[23px] text-[var(--text-primary)] leading-snug">
                    <GlossaryText text={q.prompt} />
                  </p>
                </div>

                {isCompleted && (
                  <div className="shrink-0">
                    <CrayonStamp
                      title="¡Dominado!"
                      subtitle={mod.id}
                      crayon="sage"
                      theme={theme}
                      compact
                      seed={407 + mod.number * 11}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2.5" role="radiogroup" aria-label="Opciones del reto">
                {optionOrder.map((idx, displayPos) => {
                  const opt = q.options[idx];
                  const chosen = selectedOpt === idx;
                  const isEliminated = eliminated.has(idx);
                  const revealCorrect = solved && idx === q.correctIndex;
                  const optState = revealCorrect
                    ? 'correct'
                    : isEliminated
                      ? 'wrong'
                      : chosen
                        ? 'selected'
                        : undefined;
                  const markerCrayon = revealCorrect ? 'sage' : isEliminated ? 'vermilion' : 'cobalt';

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      aria-disabled={isEliminated || solved}
                      data-testid={`checkpoint-opt-${displayPos}`}
                      data-state={optState}
                      onClick={() => {
                        if (isEliminated || solved) return;
                        setSelectedOpt(idx);
                        setSubmitted(false);
                      }}
                      className={`sketch-option w-full text-left px-3.5 py-2.5 flex items-center gap-3 text-[15.5px] leading-snug text-[var(--text-primary)] ${
                        isEliminated ? 'opacity-55 cursor-not-allowed' : solved ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <CrayonStepMarker
                        index={displayPos}
                        active={chosen || revealCorrect || isEliminated}
                        completed={revealCorrect}
                        crayon={markerCrayon}
                        theme={theme}
                        label={String.fromCharCode(65 + displayPos)}
                        size={26}
                      />
                      <span
                        className={`flex-1 ${isEliminated ? 'line-through decoration-[var(--crayon-vermilion)] decoration-2' : ''}`}
                      >
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {submitted && (
                <div
                  data-testid="checkpoint-feedback"
                  role="status"
                  className="py-2.5 border-y border-dashed text-[15.5px] leading-relaxed"
                  style={{
                    borderColor: cleanSolve ? 'var(--ui-success)' : 'var(--ui-warning)',
                  }}
                >
                  <strong
                    className="font-display text-[17.5px] font-normal"
                    style={{ color: cleanSolve ? 'var(--ui-success)' : 'var(--ui-warning)' }}
                  >
                    {roundOutcome?.kind === 'review'
                      ? roundOutcome.firstTry
                        ? `✓ Lo recordabas. Próximo repaso en ${roundOutcome.nextDays} ${roundOutcome.nextDays === 1 ? 'día' : 'días'}: cada acierto aleja el siguiente.`
                        : '✓ Correcto, pero tras dudar: volverá mañana para afianzarlo.'
                      : cleanSolve
                      ? isCompleted && roundOutcome?.kind !== 'seal'
                        ? '✓ Correcto a la primera.'
                        : '✓ Correcto a la primera. Módulo sellado: volverá en 1 día para un repaso rápido.'
                      : isCorrect
                        ? `✓ Correcto, tras ${wrongTries} ${wrongTries === 1 ? 'intento fallido' : 'intentos fallidos'}. Para sellarlo, acierta una ronda nueva a la primera.`
                        : '✗ Esa opción describe un error conceptual frecuente.'}
                  </strong>{' '}
                  {isCorrect ? (
                    <GlossaryText text={q.explanation} />
                  ) : (
                    <span className="text-[var(--text-secondary)]">
                      {lastWrong !== null && q.feedback[lastWrong] && (
                        <span className="block text-[var(--text-primary)] my-1" data-testid="distractor-feedback">
                          <GlossaryText text={q.feedback[lastWrong]} />
                        </span>
                      )}
                      Elige de nuevo entre las que quedan, o vuelve al{' '}
                      <button
                        type="button"
                        onClick={() => scrollToChapter('story3d')}
                        className="underline decoration-dotted hover:text-[var(--ui-accent)] cursor-pointer"
                      >
                        cálculo concreto y la definición formal
                      </button>
                      .
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <CrayonButton
                  crayon="cobalt"
                  theme={theme}
                  seed={131 + mod.number * 7}
                  dataTestId="checkpoint-verify-btn"
                  disabled={selectedOpt === null || solved || eliminated.has(selectedOpt)}
                  onClick={handleVerifyCheckpoint}
                >
                  Verificar respuesta
                </CrayonButton>

                {solved && !cleanSolve && roundOutcome?.kind !== 'review' && (
                  <button
                    type="button"
                    data-testid="checkpoint-new-round"
                    onClick={handleNewRound}
                    className="sketch-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 font-hand text-[15px] text-[var(--text-primary)] cursor-pointer"
                  >
                    Otra pregunta para sellarlo
                  </button>
                )}

                {solved && (cleanSolve || roundOutcome?.kind === 'review') && questions.length > 1 && (
                  <button
                    type="button"
                    data-testid="checkpoint-practice-more"
                    onClick={handleNewRound}
                    className="sketch-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 font-hand text-[15px] text-[var(--text-secondary)] cursor-pointer"
                  >
                    Practicar otra ({qIndex + 1}/{questions.length} → {((qIndex + 1) % questions.length) + 1}/{questions.length})
                  </button>
                )}

                {cleanSolve && next && (
                  <button
                    type="button"
                    data-tone="success"
                    onClick={() => onSelectModule(next)}
                    className="sketch-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 font-display text-[16.5px] text-[var(--ui-success)] cursor-pointer"
                  >
                    <span>
                      Continuar a {next}: {STUDY_MODULES[next].shortLabel}
                    </span>
                    <CrayonArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      <GameToasts toasts={toasts} />
      {welcomeOpen && (
        <WelcomeGuide
          theme={theme}
          goal={game.state.goal}
          onSetGoal={game.setGoal}
          onStartDiagnostic={() => {
            closeWelcome();
            onOpenDiagnostic();
          }}
          onStartHere={() => {
            closeWelcome();
            if (moduleId !== 'M1') onSelectModule('M1');
          }}
          onClose={closeWelcome}
        />
      )}
    </CrayonDictionaryProvider>
  );
}
