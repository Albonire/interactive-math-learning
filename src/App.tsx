import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SCENES,
  buildComputationalBridge,
  buildSceneLiveMetrics,
} from './core/curriculum';
import {
  getEcoRenderProfile,
  loadInitialEcoMode,
  saveEcoMode,
} from './core/ecoMode';
import { LESSON_INTROS } from './core/lessonIntros';
import { GUIDED_LESSONS, evaluateLessonProgress } from './core/lessons';
import type {
  AnatomyLayerSpec,
  ChallengeEvaluation,
  ChallengeSpec,
  OptimizerProbeState,
  SceneId,
  SymbolicParameter,
  ThemeMode,
  WorkspaceEngineMode,
} from './core/types';
import { updateBktSkill } from './ai/bktEngine';
import {
  computeZdpReward,
  selectBanditArm,
  updateBanditState,
  type BanditContext,
} from './ai/contextualBandit';
import { evaluateChallengeAttempt, generateChallengeForScene } from './ai/challengeGenerator';
import { computeChallengeParamProximity } from './ai/challengeProximity';
import {
  analyzeUserInteractionsForAiHint,
  computeSceneObjectiveError,
  type AiHintSuggestion,
  type ParamInteractionSample,
} from './ai/aiHintEngine';
import {
  loadAllFreehandStrokes,
  saveSceneFreehandStrokes,
  type FreehandStoreMap,
  type FreehandStroke,
} from './sketch/freehandStorage';
import {
  CrayonAudioEngine,
  loadInitialAudioEnabled,
  saveAudioEnabled,
} from './audio/crayonAudio';
import {
  RhythmAudioEngine,
  type RhythmAudioSnapshot,
} from './audio/rhythmAudioEngine';
import { RhythmAudioPopover } from './ui/RhythmAudioPopover';
import {
  createDefaultPersistedData,
  exportProgressJson,
  loadPersistedAiData,
  parseImportedProgressJson,
  savePersistedAiData,
  type PersistedAiData,
} from './storage/localTelemetry';
import type { ActivationKind, ManifoldDatasetKind } from './math/linearAlgebra';
import {
  SYMBOLIC_TARGETS,
  createInitialOptimizerProbes,
  evaluateAutoDiffDag,
  evaluateLossLandscape,
  stepOptimizerProbe,
} from './math/multivariable';
import { SceneManager } from './rendering/SceneManager';
import { ParameterEnergyTracker } from './rendering/crayonDust';
import {
  IDLE_GUIDE_DELAY_MS,
  getWorldAnchorForParam,
  type ProjectedAnnotation,
} from './rendering/sceneAnnotations';
import { TopBar } from './ui/TopBar';
import { AnatomyScrollRail } from './ui/AnatomyScrollRail';
import { useScrollAnatomy } from './rendering/useScrollAnatomy';
import { EMPTY_RHYTHM, replaceStudyRhythm } from './storage/studyRhythm';
import { EMPTY_GAME, replaceGame } from './storage/gameProgress';
import { CoursePipelineDock } from './ui/CoursePipelineDock';
import { SlideDrawer } from './ui/SlideDrawer';
import { CurriculumMapModal } from './ui/CurriculumMapModal';
import { LessonIntroPlayer } from './ui/LessonIntroPlayer';
import { CrayonStamp } from './ui/CrayonStamp';
import { SketchAnimationWrapper } from './ui/SketchAnimationWrapper';
import { ViewportAnnotationsOverlay } from './ui/ViewportAnnotationsOverlay';
import { FreehandCanvasOverlay } from './ui/FreehandCanvasOverlay';
import { AiHintToast } from './ui/AiHintToast';
import { SymbolicWorkspace } from './ui/SymbolicWorkspace';
import { CodeLabWorkspace } from './ui/CodeLabWorkspace';
import { ModuleWorkspace } from './ui/ModuleWorkspace';
import { DiagnosticModal } from './ui/DiagnosticModal';
import { STUDY_MODULES } from './core/studyPlan';
import type { StudyModuleId } from './core/studyPlanTypes';
import type { DiagnosticReport } from './core/diagnostic';
import { CrayonSvgDefs, RoughUnderline, WebGLFallbackSvg } from './ui/RoughElements';

const LESSON_PROGRESS_KEY = 'bibifold_completed_steps_v1';

function loadCompletedSteps(): Set<string> {
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveCompletedSteps(set: Set<string>): void {
  try {
    localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore quota errors
  }
}

function defaultParamsFor(sceneId: SceneId): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of SCENES[sceneId].defaultParams) {
    out[p.id] = p.value;
  }
  return out;
}

export default function App() {
  const [aiData, setAiData] = useState<PersistedAiData>(() => loadPersistedAiData());
  const initialSceneId: SceneId = aiData.lastSceneId ?? 'lin-span';
  const [appView, setAppView] = useState<'module' | 'lab3d'>('module');
  const [activeModuleId, setActiveModuleId] = useState<StudyModuleId>(
    () => aiData.activeModuleId ?? 'M1'
  );
  const [diagnosticOpen, setDiagnosticOpen] = useState<boolean>(false);

  const [sceneId, setSceneId] = useState<SceneId>(initialSceneId);
  const [theme, setTheme] = useState<ThemeMode>('paper');
  const themeRef = useRef<ThemeMode>(theme);
  themeRef.current = theme;
  const [ecoMode, setEcoMode] = useState<boolean>(() => loadInitialEcoMode());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => loadInitialAudioEnabled());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [rhythmOpen, setRhythmOpen] = useState<boolean>(false);
  const audioEngineRef = useRef<CrayonAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new CrayonAudioEngine(audioEnabled, ecoMode, (stats) => {
      const el = rootRef.current;
      if (el) {
        el.dataset.audioState = stats.state;
        el.dataset.audioPlays = String(
          stats.strokePlays + stats.dustPlays + stats.introPlays + stats.annotationPlays
        );
        el.dataset.audioSyncedPlays = String(stats.syncedPlays);
      }
    });
  }
  const rhythmEngineRef = useRef<RhythmAudioEngine | null>(null);
  if (!rhythmEngineRef.current) {
    rhythmEngineRef.current = new RhythmAudioEngine(
      () => audioEngineRef.current?.ensureSharedContext() ?? null,
      audioEnabled,
      ecoMode,
      (pulse) => {
        managerRef.current?.setBeatPulse(pulse);
      }
    );
  }
  const [rhythmSnapshot, setRhythmSnapshot] = useState<RhythmAudioSnapshot>(() =>
    rhythmEngineRef.current!.getSnapshot()
  );
  const [steadyStrokes] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Fullscreen Animated Theory Introduction (active only inside 3D Lab mode)
  const [introOpen, setIntroOpen] = useState<boolean>(false);
  const [introBeatIdx, setIntroBeatIdx] = useState<number>(0);
  const [introPlaying, setIntroPlaying] = useState<boolean>(true);
  const seenIntrosRef = useRef<Set<SceneId>>(
    new Set<SceneId>(
      aiData.seenIntroScenes.length > 0 ? aiData.seenIntroScenes : [initialSceneId]
    )
  );
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceEngineMode>('webgl3d');

  // Non-obtrusive 3D Viewport Legend, 5s idle Crayón Guía & Crayon Dust energy tracker
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const [idleGuideActive, setIdleGuideActive] = useState<boolean>(false);
  const [projectedAnnotations, setProjectedAnnotations] = useState<ProjectedAnnotation[]>([]);
  const dustEnergyRef = useRef<ParameterEnergyTracker>(new ParameterEnergyTracker());

  // Modo 'Escritura Libre' (Freehand Crayon Canvas Overlay persisted per lesson in LocalStorage)
  const [freehandStore, setFreehandStore] = useState<FreehandStoreMap>(() =>
    loadAllFreehandStrokes()
  );
  const [freehandActive, setFreehandActive] = useState<boolean>(false);
  const [freehandVisible, setFreehandVisible] = useState<boolean>(true);

  // Sistema de 'Pistas de IA' (Real-Time Parameter Stagnation & Divergence Coach)
  const [activeAiHint, setActiveAiHint] = useState<AiHintSuggestion | null>(null);
  const interactionHistoryRef = useRef<ParamInteractionSample[]>([]);
  const dismissedHintIdsRef = useRef<Set<string>>(new Set());

  // Guided Interactive Course State
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(() =>
    loadCompletedSteps()
  );
  const [activeStepIdx, setActiveStepIdx] = useState<number>(() => {
    const lesson = GUIDED_LESSONS[initialSceneId];
    const done = loadCompletedSteps();
    const firstOpen = lesson.steps.findIndex((s) => !done.has(s.id));
    return firstOpen === -1 ? 0 : firstOpen;
  });
  const [celebrationStamp, setCelebrationStamp] = useState<{
    key: string;
    title: string;
    subtitle: string;
    badge: string;
    crayon: 'sage' | 'ochre' | 'cobalt';
  } | null>(null);

  // Single Source of Truth for active scene parameters and anatomy state
  const [paramValues, setParamValues] = useState<Record<string, number>>(() =>
    defaultParamsFor(initialSceneId)
  );
  const paramValuesRef = useRef<Record<string, number>>(paramValues);
  paramValuesRef.current = paramValues;

  const [layers, setLayers] = useState<AnatomyLayerSpec[]>(() =>
    SCENES[initialSceneId].defaultLayers.map((l) => ({ ...l }))
  );
  const [exploded, setExploded] = useState(false);
  const [anatomyCollapsed, setAnatomyCollapsed] = useState(false);
  const [focusedParamId, setFocusedParamId] = useState<string | null>(null);
  const animRafRef = useRef<number | null>(null);

  // Clean slide-over drawer & Course Index states
  const [drawerMode, setDrawerMode] = useState<'closed' | 'computational' | 'challenge'>('closed');
  const [mapOpen, setMapOpen] = useState(false);
  const [webglLost, setWebglLost] = useState(false);

  // Scene-specific simulation states
  const [activation, setActivation] = useState<ActivationKind>('tanh');
  const [dataset, setDataset] = useState<ManifoldDatasetKind>('rings');
  const [landscape, setLandscape] = useState<'rosenbrock' | 'rastrigin' | 'saddle'>('rosenbrock');
  const [autoDiffPass, setAutoDiffPass] = useState<'idle' | 'forward' | 'backward'>('idle');
  const [optimizerProbes, setOptimizerProbes] = useState<OptimizerProbeState[]>(() =>
    createInitialOptimizerProbes('rosenbrock')
  );
  const [optimizerRunning, setOptimizerRunning] = useState(false);

  // Symbolic regression Web Worker state (Scene 2.4)
  const [symbolicTargetIdx, setSymbolicTargetIdx] = useState(0);
  const [symbolicRunning, setSymbolicRunning] = useState(false);
  const [symbolicGen, setSymbolicGen] = useState(0);
  const [symbolicAiFormula, setSymbolicAiFormula] = useState('En espera');
  const [symbolicAiMse, setSymbolicAiMse] = useState(99);
  const [aiSymbolicGrid, setAiSymbolicGrid] = useState<Float32Array | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Local Edge AI challenge UI state
  const [activeChallenge, setActiveChallenge] = useState<ChallengeSpec | null>(null);
  const [challengeEval, setChallengeEval] = useState<ChallengeEvaluation | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Erratic parameter reversal tracker for Contextual Bandit context vector
  const erraticRef = useRef({ lastDeltaSign: 0, reversals: 0, moves: 0 });
  const seedCounterRef = useRef(104729);

  // Three.js isolated host container
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<SceneManager | null>(null);

  // Scroll-driven Modo Anatomía: while "Separar vista" is on, vertical scroll peels the model apart.
  const applyExplodeAmount = useCallback((amount: number | null) => {
    managerRef.current?.setExplodeAmount(amount);
  }, []);
  const setWheelZoom = useCallback((enabledZoom: boolean) => {
    managerRef.current?.setWheelZoomEnabled(enabledZoom);
  }, []);
  const anatomyScroll = useScrollAnatomy({
    enabled: appView === 'lab3d' && exploded && !webglLost && !introOpen,
    hostRef: canvasHostRef,
    apply: applyExplodeAmount,
    setWheelZoom,
  });

  const sceneMeta = SCENES[sceneId];
  const activeLesson = GUIDED_LESSONS[sceneId];

  // Sync HTML .dark & .eco-mode classes
  useEffect(() => {
    const rootEl = document.documentElement;
    if (theme === 'chalkboard') {
      rootEl.classList.add('dark');
    } else {
      rootEl.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const rootEl = document.documentElement;
    rootEl.classList.toggle('eco-mode', ecoMode);
    saveEcoMode(ecoMode);
  }, [ecoMode]);

  // Initialize Web Audio & Rhythm Tempo engines on app mount (honoring initial audioEnabled & ecoMode)
  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new CrayonAudioEngine(audioEnabled, ecoMode, (stats) => {
        const el = rootRef.current;
        if (el) {
          el.dataset.audioState = stats.state;
          el.dataset.audioPlays = String(
            stats.strokePlays + stats.dustPlays + stats.introPlays + stats.annotationPlays
          );
          el.dataset.audioSyncedPlays = String(stats.syncedPlays);
        }
      });
    }
    if (!rhythmEngineRef.current) {
      rhythmEngineRef.current = new RhythmAudioEngine(
        () => audioEngineRef.current?.ensureSharedContext() ?? null,
        audioEnabled,
        ecoMode,
        (pulse) => {
          managerRef.current?.setBeatPulse(pulse);
        }
      );
    }

    const engine = audioEngineRef.current;
    const rhythm = rhythmEngineRef.current;
    engine.setRhythmSource(rhythm);
    engine.initialize();
    const unsubRhythm = rhythm.subscribe((snap) => setRhythmSnapshot(snap));

    if (rootRef.current) {
      const st = engine.getStats();
      rootRef.current.dataset.audioState = st.state;
      rootRef.current.dataset.audioPlays = String(
        st.strokePlays + st.dustPlays + st.introPlays + st.annotationPlays
      );
      rootRef.current.dataset.audioSyncedPlays = String(st.syncedPlays);
    }
    return () => {
      unsubRhythm();
      engine.setRhythmSource(null);
      rhythm.dispose();
      rhythmEngineRef.current = null;
      engine.dispose();
      audioEngineRef.current = null;
    };
    // Mount-only lifecycle; settings updates sync in the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep optional Web Audio & Rhythm engines synchronized with user preference & ecoMode silencing
  useEffect(() => {
    saveAudioEnabled(audioEnabled);
    audioEngineRef.current?.syncSettings(audioEnabled, ecoMode);
    rhythmEngineRef.current?.syncSettings(audioEnabled, ecoMode);
  }, [audioEnabled, ecoMode]);

  // Initialize Three.js WebGL 2 SceneManager lazily only when in 3D Lab mode
  useEffect(() => {
    if (appView !== 'lab3d') {
      managerRef.current?.dispose();
      managerRef.current = null;
      return;
    }
    const container = canvasHostRef.current;
    if (!container) return;

    try {
      const manager = new SceneManager({
        container,
        initialTheme: themeRef.current,
        initialEcoMode: ecoMode,
        onContextLost: () => setWebglLost(true),
        onContextRestored: () => setWebglLost(false),
        onAnnotationsProjected: (items) => setProjectedAnnotations(items),
        onConstructionStroke: (ev) => {
          audioEngineRef.current?.playConstructionStroke(
            ev.layerId,
            themeRef.current,
            ev.isSprite,
            performance.now()
          );
        },
      });
      managerRef.current = manager;
      manager.syncState(
        {
          sceneId,
          params: paramValuesRef.current,
          theme: themeRef.current,
          activation,
          dataset,
          landscape,
          autoDiffPass,
          optimizerProbes,
          symbolicTargetIdx,
          aiSymbolicGrid,
        },
        layers,
        exploded,
        steadyStrokes,
        activeFocusedLayerId,
        ecoMode
      );
    } catch {
      setWebglLost(true);
    }

    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
    // Mount/unmount WebGL cleanly strictly on entering/leaving Lab 3D mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appView]);

  // Stop Web Worker on unmount or scene exit
  const stopSymbolicWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setSymbolicRunning(false);
  }, []);

  const cancelParamAnim = useCallback(() => {
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelParamAnim();
      stopSymbolicWorker();
    };
  }, [cancelParamAnim, stopSymbolicWorker]);

  // Helper to persist last active lesson & seen intros cleanly across reloads
  const persistSessionLesson = useCallback((activeId: SceneId, markSeenIntro: boolean) => {
    if (markSeenIntro) {
      seenIntrosRef.current.add(activeId);
    }
    const seenList = Array.from(seenIntrosRef.current);
    setAiData((prev) => {
      const sameScene = prev.lastSceneId === activeId;
      const sameSeen =
        prev.seenIntroScenes.length === seenList.length &&
        seenList.every((s) => prev.seenIntroScenes.includes(s));
      if (sameScene && sameSeen) return prev;
      const next: PersistedAiData = {
        ...prev,
        lastSceneId: activeId,
        seenIntroScenes: seenList,
      };
      savePersistedAiData(next);
      return next;
    });
  }, []);

  // Switch scene cleanly resetting defaults and launching fullscreen theory intro on first visit
  const selectScene = useCallback(
    (nextId: SceneId, replayIntro?: boolean) => {
      cancelParamAnim();
      stopSymbolicWorker();
      setOptimizerRunning(false);
      setSceneId(nextId);
      setParamValues(defaultParamsFor(nextId));
      setLayers(SCENES[nextId].defaultLayers.map((l) => ({ ...l })));
      setExploded(false);
      setFocusedParamId(null);
      setActivation('tanh');
      setDataset('rings');
      setLandscape('rosenbrock');
      setAutoDiffPass('idle');
      setOptimizerProbes(createInitialOptimizerProbes('rosenbrock'));
      setSymbolicGen(0);
      setSymbolicAiFormula('En espera');
      setSymbolicAiMse(99);
      setAiSymbolicGrid(null);
      setActiveChallenge(null);
      setChallengeEval(null);
      setShowHint(false);
      setCelebrationStamp(null);
      setDrawerMode('closed');
      setMapOpen(false);
      setFreehandActive(false);
      setActiveAiHint(null);
      interactionHistoryRef.current = [];
      dismissedHintIdsRef.current.clear();
      setWorkspaceMode('webgl3d');
      setIntroPlaying(true);
      managerRef.current?.setConstructionPaused(false);
      setProjectedAnnotations([]);
      dustEnergyRef.current.reset();
      erraticRef.current = { lastDeltaSign: 0, reversals: 0, moves: 0 };

      const nextLesson = GUIDED_LESSONS[nextId];
      const firstOpen = nextLesson.steps.findIndex((s) => !completedStepIds.has(s.id));
      setActiveStepIdx(firstOpen === -1 ? 0 : firstOpen);

      const shouldOpenIntro = replayIntro ?? false;
      if (shouldOpenIntro) {
        persistSessionLesson(nextId, true);
        setIntroBeatIdx(0);
        setIntroOpen(true);
      } else {
        persistSessionLesson(nextId, false);
        setIntroOpen(false);
      }
    },
    [cancelParamAnim, completedStepIds, persistSessionLesson, stopSymbolicWorker]
  );

  // Study Plan navigation & persistence callbacks
  const completedModuleSet = useMemo(
    () => new Set<StudyModuleId>(aiData.completedModuleIds ?? []),
    [aiData.completedModuleIds]
  );

  const handleSelectModule = useCallback((nextModId: StudyModuleId) => {
    setActiveModuleId(nextModId);
    setAppView('module');
    setIntroOpen(false);
    setMapOpen(false);
    setDrawerMode('closed');
    setAiData((prev) => {
      if (prev.activeModuleId === nextModId) return prev;
      const next: PersistedAiData = { ...prev, activeModuleId: nextModId };
      savePersistedAiData(next);
      return next;
    });
  }, []);

  const handleMarkModuleCompleted = useCallback((doneId: StudyModuleId) => {
    setAiData((prev) => {
      const existing = prev.completedModuleIds ?? [];
      if (existing.includes(doneId)) return prev;
      const next: PersistedAiData = {
        ...prev,
        completedModuleIds: [...existing, doneId],
      };
      savePersistedAiData(next);
      return next;
    });
  }, []);

  const handleCompleteDiagnostic = useCallback((report: DiagnosticReport) => {
    setAiData((prev) => {
      const next: PersistedAiData = {
        ...prev,
        diagnosticReport: report,
      };
      savePersistedAiData(next);
      return next;
    });
  }, []);

  const handleOpen3DScene = useCallback(
    (targetSceneId: SceneId) => {
      setAppView('lab3d');
      selectScene(targetSceneId, false);
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    },
    [selectScene]
  );

  // Live 3D choreography while the fullscreen theory intro plays
  useEffect(() => {
    if (!introOpen) {
      audioEngineRef.current?.stopIntroPhrase();
      return;
    }
    const beat = LESSON_INTROS[sceneId]?.beats[introBeatIdx];
    if (!beat) return;

    const st = beat.stageState;
    if (st.activation) setActivation(st.activation);
    if (st.dataset) setDataset(st.dataset);
    if (st.landscape) {
      setLandscape(st.landscape);
      setOptimizerProbes(createInitialOptimizerProbes(st.landscape));
    }
    setExploded(Boolean(st.exploded));
    setAutoDiffPass(st.autoDiffPass ?? 'idle');
    setOptimizerRunning(Boolean(st.startOptimizer));

    // Beat choreography sync for segmented trace-by-trace 3D construction:
    // - Beat 0: full structured, trace-by-trace procedural 3D build with moving crayon nib
    // - Beat 1 ("Partes de la gráfica"): re-traces the focused anatomy layer cleanly
    // - Beats 2+: settles all construction strokes cleanly so live parameter motion shines
    if (introBeatIdx === 0) {
      managerRef.current?.replayProceduralBuild();
    } else if (introBeatIdx === 1 && st.focusedLayerId) {
      managerRef.current?.replayLayerBuild(st.focusedLayerId);
    } else if (introBeatIdx >= 2) {
      managerRef.current?.completeProceduralBuild();
    }

    const targetParams = { ...defaultParamsFor(sceneId), ...(st.params ?? {}) };
    cancelParamAnim();
    // Warm, multi-stroke crayon sketching phrase spanning the slow intro choreography
    audioEngineRef.current?.playIntroPhrase(theme, introBeatIdx, performance.now());

    const startParams = { ...paramValuesRef.current };
    const durationMs = steadyStrokes || managerRef.current?.isSoftwareMode() ? 0 : 2800;

    if (durationMs === 0) {
      setParamValues(targetParams);
    } else {
      const t0 = performance.now();
      const tick = (now: number) => {
        const raw = Math.min(1, (now - t0) / durationMs);
        // Smooth ease-in-out cubic for unhurried, structured visual storytelling
        const ease = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
        const next: Record<string, number> = { ...targetParams };
        for (const [k, endVal] of Object.entries(targetParams)) {
          const startVal = startParams[k] ?? endVal;
          next[k] = Number((startVal + (endVal - startVal) * ease).toFixed(3));
        }
        setParamValues(next);
        if (raw < 1) {
          animRafRef.current = requestAnimationFrame(tick);
        } else {
          animRafRef.current = null;
        }
      };
      animRafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      audioEngineRef.current?.stopIntroPhrase();
    };
  }, [introOpen, sceneId, introBeatIdx, steadyStrokes, cancelParamAnim, theme]);

  // Synchronize LessonIntroPlayer Pausa Narrativa with SceneManager stroke construction & camera freedom
  useEffect(() => {
    const paused = introOpen && !introPlaying;
    managerRef.current?.setConstructionPaused(paused);
    if (paused) {
      cancelParamAnim();
      managerRef.current?.cancelCameraTransition();
      audioEngineRef.current?.stopIntroPhrase();
    }
  }, [introOpen, introPlaying, cancelParamAnim]);

  // Transition smoothly from fullscreen intro to clean hands-on practice (resetting any intro demo mutations)
  const handleFinishIntro = useCallback(() => {
    cancelParamAnim();
    stopSymbolicWorker();
    audioEngineRef.current?.stopIntroPhrase();
    setIntroPlaying(true);
    managerRef.current?.setConstructionPaused(false);
    managerRef.current?.completeProceduralBuild();
    setOptimizerRunning(false);
    setParamValues(defaultParamsFor(sceneId));
    setExploded(false);
    setActivation('tanh');
    setDataset('rings');
    setLandscape('rosenbrock');
    setAutoDiffPass('idle');
    setOptimizerProbes(createInitialOptimizerProbes('rosenbrock'));
    setSymbolicGen(0);
    setSymbolicAiFormula('En espera');
    setSymbolicAiMse(99);
    setAiSymbolicGrid(null);
    setActiveAiHint(null);
    interactionHistoryRef.current = [];
    dismissedHintIdsRef.current.clear();
    persistSessionLesson(sceneId, true);
    setIntroOpen(false);
  }, [cancelParamAnim, persistSessionLesson, sceneId, stopSymbolicWorker]);

  // Optimizer race animation loop (Scene 2.3) — respects Eco Mode interval & Pausa Narrativa
  useEffect(() => {
    if (!optimizerRunning || sceneId !== 'calc-optimizers' || (introOpen && !introPlaying)) return;
    const intervalMs = getEcoRenderProfile(ecoMode, false).optimizerIntervalMs;
    const id = window.setInterval(() => {
      setOptimizerProbes((prev) =>
        prev.map((probe) =>
          stepOptimizerProbe(
            probe,
            landscape,
            paramValues.lr ?? 0.06,
            paramValues.beta ?? 0.82
          )
        )
      );
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [optimizerRunning, sceneId, landscape, paramValues.lr, paramValues.beta, ecoMode, introOpen, introPlaying]);

  // Real-time AI Hint detector for Lesson 7 optimizer divergence or vanishing-step stagnation
  useEffect(() => {
    if (introOpen || workspaceMode !== 'webgl3d' || drawerMode !== 'closed') return;
    if (sceneId !== 'calc-optimizers') return;

    const hint = analyzeUserInteractionsForAiHint({
      sceneId,
      params: paramValues,
      history: interactionHistoryRef.current,
      activeChallenge,
      activation,
      dataset,
      landscape,
      optimizerProbes,
      optimizerRunning,
      autoDiffPass,
      symbolicTargetIdx,
    });
    if (hint && !dismissedHintIdsRef.current.has(hint.id)) {
      setActiveAiHint((prev) => (prev?.id === hint.id ? prev : hint));
    }
  }, [
    introOpen,
    workspaceMode,
    drawerMode,
    sceneId,
    paramValues,
    activeChallenge,
    activation,
    dataset,
    landscape,
    optimizerProbes,
    optimizerRunning,
    autoDiffPass,
    symbolicTargetIdx,
  ]);

  // Auto-exit freehand capture when switching away from open 3D practice
  useEffect(() => {
    if (introOpen || workspaceMode !== 'webgl3d' || drawerMode !== 'closed' || mapOpen) {
      setFreehandActive(false);
    }
  }, [introOpen, workspaceMode, drawerMode, mapOpen]);

  // Live mathematical evaluation for Guided Course steps (paused while watching theory intro)
  const adamProbe = optimizerProbes[2];
  useEffect(() => {
    if (introOpen) return;
    const newlyDone = evaluateLessonProgress(
      sceneId,
      {
        sceneId,
        params: paramValues,
        exploded,
        activation,
        dataset,
        landscape,
        autoDiffPass,
        optimizerSteps: adamProbe?.stepCount ?? 0,
        optimizerRunning,
        symbolicGen,
        symbolicTargetIdx,
        inspectorOpened: drawerMode === 'computational',
        challengeOpened: drawerMode === 'challenge',
      },
      completedStepIds
    );
    if (newlyDone.length > 0) {
      const lesson = GUIDED_LESSONS[sceneId];
      const wasAlreadyAllDone = lesson.steps.every((s) => completedStepIds.has(s.id));

      const nextSet = new Set(completedStepIds);
      newlyDone.forEach((id) => nextSet.add(id));
      saveCompletedSteps(nextSet);
      setCompletedStepIds(nextSet);

      const isNowAllDone = lesson.steps.every((s) => nextSet.has(s.id));
      if (!wasAlreadyAllDone && isNowAllDone) {
        setCelebrationStamp({
          key: `lesson-${sceneId}-${Date.now()}`,
          title: '¡Lección Lista!',
          subtitle: `Lección ${lesson.lessonNumber} completada`,
          badge: 'CUADERNO',
          crayon: 'sage',
        });
      }
    }
  }, [
    introOpen,
    sceneId,
    paramValues,
    exploded,
    activation,
    dataset,
    landscape,
    autoDiffPass,
    adamProbe?.stepCount,
    optimizerRunning,
    symbolicGen,
    symbolicTargetIdx,
    drawerMode,
    completedStepIds,
  ]);

  // Focused 3D layer from intro narration beat or tactile CrayonSlider drag
  const activeFocusedLayerId = useMemo(() => {
    if (introOpen) {
      return LESSON_INTROS[sceneId]?.beats[introBeatIdx]?.stageState.focusedLayerId ?? null;
    }
    if (focusedParamId) {
      const p = sceneMeta.defaultParams.find((item) => item.id === focusedParamId);
      if (p) return p.linkedLayerId;
    }
    return null;
  }, [introOpen, sceneId, introBeatIdx, focusedParamId, sceneMeta.defaultParams]);

  // Push Single Source of Truth state into Three.js SceneManager
  useEffect(() => {
    managerRef.current?.syncState(
      {
        sceneId,
        params: paramValues,
        theme,
        activation,
        dataset,
        landscape,
        autoDiffPass,
        optimizerProbes,
        symbolicTargetIdx,
        aiSymbolicGrid,
      },
      layers,
      exploded,
      steadyStrokes,
      activeFocusedLayerId,
      ecoMode
    );
  }, [
    sceneId,
    paramValues,
    theme,
    activation,
    dataset,
    landscape,
    autoDiffPass,
    optimizerProbes,
    symbolicTargetIdx,
    aiSymbolicGrid,
    layers,
    exploded,
    steadyStrokes,
    activeFocusedLayerId,
    ecoMode,
  ]);

  // Toggle 3D-to-2D annotation projection when Legend or 5s idle Crayón Guía is active
  useEffect(() => {
    const needsProjection =
      appView === 'lab3d' &&
      !introOpen &&
      workspaceMode === 'webgl3d' &&
      drawerMode === 'closed' &&
      (legendOpen || idleGuideActive);
    managerRef.current?.setAnnotationsEnabled(needsProjection);
  }, [appView, legendOpen, idleGuideActive, introOpen, workspaceMode, drawerMode]);

  // 5-second inactivity timer for 'Crayón Guía' during open hands-on 3D practice
  useEffect(() => {
    if (
      appView !== 'lab3d' ||
      introOpen ||
      workspaceMode !== 'webgl3d' ||
      mapOpen ||
      drawerMode !== 'closed'
    ) {
      setIdleGuideActive(false);
      return;
    }

    let timerId: number | null = null;
    const armTimer = () => {
      if (timerId !== null) window.clearTimeout(timerId);
      setIdleGuideActive(false);
      timerId = window.setTimeout(() => {
        setIdleGuideActive(true);
      }, IDLE_GUIDE_DELAY_MS);
    };

    armTimer();
    const onUserActivity = () => armTimer();
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener('pointerdown', onUserActivity, opts);
    window.addEventListener('keydown', onUserActivity, opts);
    window.addEventListener('wheel', onUserActivity, opts);
    window.addEventListener('touchstart', onUserActivity, opts);

    return () => {
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('pointerdown', onUserActivity, { capture: true });
      window.removeEventListener('keydown', onUserActivity, { capture: true });
      window.removeEventListener('wheel', onUserActivity, { capture: true });
      window.removeEventListener('touchstart', onUserActivity, { capture: true });
    };
  }, [appView, introOpen, workspaceMode, mapOpen, drawerMode, sceneId, paramValues, exploded, legendOpen, activeStepIdx]);

  // Play delicate pencil/crayon flick when Crayón Guía draws in (if unlocked and not in Eco Mode)
  useEffect(() => {
    if (appView === 'lab3d' && idleGuideActive && !introOpen && workspaceMode === 'webgl3d' && drawerMode === 'closed') {
      audioEngineRef.current?.playAnnotationSketch(theme, performance.now());
    }
  }, [appView, idleGuideActive, introOpen, workspaceMode, drawerMode, theme]);

  // Center the 3D diagram cleanly in the open stage above the bottom narration bar during Intro
  useEffect(() => {
    if (!introOpen) {
      managerRef.current?.setViewportOffset(0, 0);
      return;
    }
    const beat = LESSON_INTROS[sceneId]?.beats[introBeatIdx];
    const hasLeftCard = Boolean(beat?.parts?.length || beat?.formula);
    // Positive yRatio lifts the 3D scene upward cleanly above the bottom narration bar
    // while keeping the Z axis label inside the upper frame; negative xRatio shifts it right
    // on wide viewports when the Beat 2 / Beat 4 card sits on the left
    managerRef.current?.setViewportOffset(hasLeftCard ? -0.055 : 0, 0.068);
  }, [introOpen, sceneId, introBeatIdx]);

  // Keyboard shortcuts: H collapses bottom practice bar, L toggles 3D Legend, D toggles Escritura Libre, Escape closes overlays
  useEffect(() => {
    if (introOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setAnatomyCollapsed((v) => !v);
      } else if ((e.key === 'l' || e.key === 'L') && !mapOpen && drawerMode === 'closed') {
        setLegendOpen((prev) => {
          const next = !prev;
          if (next) {
            audioEngineRef.current?.unlock();
            audioEngineRef.current?.playAnnotationSketch(theme, performance.now());
          }
          return next;
        });
      } else if (
        (e.key === 'd' || e.key === 'D') &&
        workspaceMode === 'webgl3d' &&
        !mapOpen &&
        drawerMode === 'closed'
      ) {
        audioEngineRef.current?.unlock();
        setFreehandActive((v) => !v);
      } else if (e.key === 'Escape') {
        if (mapOpen) setMapOpen(false);
        else if (drawerMode !== 'closed') setDrawerMode('closed');
        else if (freehandActive) setFreehandActive(false);
        else if (activeAiHint) setActiveAiHint(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [introOpen, mapOpen, drawerMode, workspaceMode, freehandActive, activeAiHint, theme]);

  const handleParamChange = useCallback(
    (id: string, nextVal: number) => {
      cancelParamAnim();

      const oldVal = paramValuesRef.current[id] ?? nextVal;
      const pMeta = SCENES[sceneId].defaultParams.find((p) => p.id === id);
      if (pMeta) {
        const span = Math.max(1e-6, pMeta.max - pMeta.min);
        const normDelta = Math.abs(nextVal - oldVal) / span;
        const nowMs = performance.now();

        // Subtle dry wax-crayon stroke sound on parameter drag (auto-silenced if off or ecoMode)
        if (normDelta > 1e-4) {
          audioEngineRef.current?.playParameterStroke(normDelta, theme, nowMs);
        }

        const dust = dustEnergyRef.current.recordDelta(normDelta, nowMs);
        if (dust.shouldEmit && managerRef.current) {
          audioEngineRef.current?.playCrayonDust(dust.intensity, theme, nowMs);
          const nextParams = { ...paramValuesRef.current, [id]: nextVal };
          const anchor = getWorldAnchorForParam(
            {
              sceneId,
              params: nextParams,
              theme,
              activation,
              dataset,
              landscape,
              autoDiffPass,
              optimizerProbes,
              symbolicTargetIdx,
              aiSymbolicGrid,
            },
            id
          );
          const layerSpec = layers.find((l) => l.id === pMeta.linkedLayerId);
          const explodeY = exploded && layerSpec ? layerSpec.explodeOffsetY : 0;
          managerRef.current.emitCrayonDust(pMeta.crayon, dust.intensity, [
            anchor[0],
            anchor[1] + explodeY,
            anchor[2],
          ]);
        }
      }

      const nextParams = { ...paramValuesRef.current, [id]: nextVal };

      setParamValues((prev) => {
        const prevVal = prev[id] ?? nextVal;
        const sign = Math.sign(nextVal - prevVal);
        if (sign !== 0) {
          if (erraticRef.current.lastDeltaSign !== 0 && sign !== erraticRef.current.lastDeltaSign) {
            erraticRef.current.reversals++;
          }
          erraticRef.current.lastDeltaSign = sign;
          erraticRef.current.moves++;
        }
        return { ...prev, [id]: nextVal };
      });

      // Record interaction sample & run real-time AI Hint stagnation/divergence analysis
      if (Math.abs(nextVal - oldVal) > 1e-6) {
        const errorMetric = computeSceneObjectiveError(sceneId, nextParams, {
          activeChallenge,
          activation,
          dataset,
          landscape,
          optimizerProbes,
          symbolicTargetIdx,
        });
        const nextHistory = [
          ...interactionHistoryRef.current.slice(-19),
          {
            timestampMs: performance.now(),
            paramId: id,
            value: nextVal,
            errorMetric,
          },
        ];
        interactionHistoryRef.current = nextHistory;

        const hint = analyzeUserInteractionsForAiHint({
          sceneId,
          params: nextParams,
          history: nextHistory,
          activeChallenge,
          activation,
          dataset,
          landscape,
          optimizerProbes,
          optimizerRunning,
          autoDiffPass,
          symbolicTargetIdx,
        });
        if (hint && !dismissedHintIdsRef.current.has(hint.id)) {
          setActiveAiHint((prev) => (prev?.id === hint.id ? prev : hint));
        }
      }
    },
    [
      cancelParamAnim,
      sceneId,
      theme,
      activation,
      dataset,
      landscape,
      autoDiffPass,
      optimizerProbes,
      optimizerRunning,
      symbolicTargetIdx,
      aiSymbolicGrid,
      activeChallenge,
      layers,
      exploded,
    ]
  );

  const handleChangeFreehandStrokes = useCallback(
    (nextStrokes: FreehandStroke[]) => {
      setFreehandStore((prev) => ({ ...prev, [sceneId]: nextStrokes }));
      saveSceneFreehandStrokes(sceneId, nextStrokes);
    },
    [sceneId]
  );

  const handleRequestAiHint = useCallback(() => {
    audioEngineRef.current?.unlock();
    if (activeAiHint) {
      setActiveAiHint(null);
      return;
    }
    const hint = analyzeUserInteractionsForAiHint({
      sceneId,
      params: paramValuesRef.current,
      history: interactionHistoryRef.current,
      activeChallenge,
      activation,
      dataset,
      landscape,
      optimizerProbes,
      optimizerRunning,
      autoDiffPass,
      symbolicTargetIdx,
      forceAdvice: true,
    });
    if (hint) {
      audioEngineRef.current?.playAnnotationSketch(theme, performance.now());
      setActiveAiHint(hint);
    }
  }, [
    activeAiHint,
    sceneId,
    activeChallenge,
    activation,
    dataset,
    landscape,
    optimizerProbes,
    optimizerRunning,
    autoDiffPass,
    symbolicTargetIdx,
    theme,
  ]);

  const handleDismissAiHint = useCallback(() => {
    if (activeAiHint) {
      dismissedHintIdsRef.current.add(activeAiHint.id);
    }
    setActiveAiHint(null);
  }, [activeAiHint]);

  const handleApplyAiHint = useCallback(
    (hint: AiHintSuggestion) => {
      audioEngineRef.current?.unlock();
      audioEngineRef.current?.playParameterStroke(0.22, theme, performance.now());
      cancelParamAnim();

      if (hint.recommendedActivation) {
        setActivation(hint.recommendedActivation);
      }
      if (hint.recommendedAutoDiffPass) {
        setAutoDiffPass(hint.recommendedAutoDiffPass);
        if (drawerMode === 'closed') setDrawerMode('computational');
      }
      if (hint.recommendedParams) {
        setParamValues((prev) => ({ ...prev, ...hint.recommendedParams }));
      }
      if (hint.recommendedStartOptimizer && sceneId === 'calc-optimizers') {
        setOptimizerProbes(createInitialOptimizerProbes(landscape));
        setOptimizerRunning(true);
      }

      interactionHistoryRef.current = [];
      dismissedHintIdsRef.current.add(hint.id);
      setActiveAiHint(null);
    },
    [cancelParamAnim, drawerMode, landscape, sceneId, theme]
  );

  const handleFocusToken = useCallback((param: SymbolicParameter | null) => {
    if (param) {
      audioEngineRef.current?.unlock();
    }
    setFocusedParamId(param ? param.id : null);
  }, []);

  const handleResetScene = useCallback(() => {
    cancelParamAnim();
    stopSymbolicWorker();
    setParamValues(defaultParamsFor(sceneId));
    setLayers(SCENES[sceneId].defaultLayers.map((l) => ({ ...l })));
    setExploded(false);
    setActivation('tanh');
    setDataset('rings');
    setLandscape('rosenbrock');
    setAutoDiffPass('idle');
    dustEnergyRef.current.reset();
    setOptimizerRunning(false);
    setOptimizerProbes(createInitialOptimizerProbes('rosenbrock'));
    setSymbolicGen(0);
    setSymbolicAiFormula('En espera');
    setSymbolicAiMse(99);
    setAiSymbolicGrid(null);
    setActiveAiHint(null);
    interactionHistoryRef.current = [];
    dismissedHintIdsRef.current.clear();
    managerRef.current?.resetCamera();
  }, [cancelParamAnim, sceneId, stopSymbolicWorker]);

  // Symbolic regression Web Worker trigger (Scene 2.4)
  const handleToggleSymbolicWorker = useCallback(() => {
    if (symbolicRunning) {
      stopSymbolicWorker();
      return;
    }

    const target = SYMBOLIC_TARGETS[symbolicTargetIdx] ?? SYMBOLIC_TARGETS[0];
    const worker = new Worker(new URL('./ai/workers/symbolicReg.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    setSymbolicRunning(true);
    setSymbolicGen(0);

    worker.onmessage = (ev: MessageEvent) => {
      const d = ev.data as {
        generation: number;
        bestFormula: string;
        aiMse: number;
        aiGrid: Float32Array;
        done: boolean;
      };
      setSymbolicGen(d.generation);
      setSymbolicAiFormula(d.bestFormula);
      setSymbolicAiMse(d.aiMse);
      setAiSymbolicGrid(d.aiGrid);
      if (d.done) {
        setSymbolicRunning(false);
        worker.terminate();
        workerRef.current = null;
      }
    };

    worker.postMessage({
      type: 'start',
      targetWeights: target.weights,
      gridSize: 25,
      seed: 2026 + symbolicTargetIdx * 97,
    });
  }, [symbolicRunning, symbolicTargetIdx, stopSymbolicWorker]);

  // Smooth animated live demonstration for any Sequential Pipeline Step
  const handleRunStepDemo = useCallback(
    (stepIdx: number) => {
      const step = GUIDED_LESSONS[sceneId].steps[stepIdx];
      if (!step) return;
      const demo = step.demo;

      if (demo.params) {
        cancelParamAnim();
        const targetParams = demo.params;
        const startParams = { ...paramValuesRef.current };
        const durationMs =
          steadyStrokes || managerRef.current?.isSoftwareMode() ? 0 : 650;

        if (durationMs === 0) {
          setParamValues((prev) => ({ ...prev, ...targetParams }));
        } else {
          let t0: number | null = null;
          const tick = (now: number) => {
            if (t0 === null) t0 = now;
            const raw = Math.min(1, Math.max(0, (now - t0) / durationMs));
            // Snappy ease-out cubic so every demo reaches its exact mathematical target smoothly
            const ease = 1 - Math.pow(1 - raw, 3);
            setParamValues((prev) => {
              const next = { ...prev };
              for (const [k, endVal] of Object.entries(targetParams)) {
                const startVal = startParams[k] ?? endVal;
                next[k] = Number((startVal + (endVal - startVal) * ease).toFixed(3));
              }
              return next;
            });
            if (raw < 1) {
              animRafRef.current = requestAnimationFrame(tick);
            } else {
              animRafRef.current = null;
            }
          };
          animRafRef.current = requestAnimationFrame(tick);
        }
      }
      if (demo.exploded !== undefined) {
        setExploded(demo.exploded);
      }
      if (demo.activation) {
        setActivation(demo.activation);
      }
      if (demo.dataset) {
        setDataset(demo.dataset);
      }
      if (demo.landscape) {
        setLandscape(demo.landscape);
        setOptimizerProbes(createInitialOptimizerProbes(demo.landscape));
      }
      if (demo.autoDiffPass) {
        setAutoDiffPass(demo.autoDiffPass);
      }
      if (demo.openInspector) {
        setDrawerMode('computational');
      }
      if (demo.startOptimizer) {
        setOptimizerRunning(true);
      }
      if (demo.startSymbolic && !symbolicRunning) {
        handleToggleSymbolicWorker();
      }
    },
    [sceneId, paramValues, steadyStrokes, symbolicRunning, cancelParamAnim, handleToggleSymbolicWorker]
  );

  // Adaptive Challenge generator using LinUCB Contextual Bandit
  const buildCurrentContext = useCallback(
    (overrideErr?: number): BanditContext => {
      const skill = aiData.bkt[sceneMeta.skillId];
      const erratic =
        erraticRef.current.moves > 2
          ? Math.min(1, erraticRef.current.reversals / erraticRef.current.moves)
          : 0.15;
      const openedRatio =
        layers.filter((l) => l.visible).length / Math.max(1, layers.length);
      return {
        mastery: skill.pL,
        normalizedError:
          overrideErr ?? aiData.lastErrorBySkill[sceneMeta.skillId] ?? 0.45,
        erraticIndex: erratic,
        normalizedTime: 0.35,
        layersOpenedRatio: openedRatio,
      };
    },
    [aiData, sceneMeta.skillId, layers]
  );

  const launchChallenge = useCallback(() => {
    const ctx = buildCurrentContext();
    const { arm } = selectBanditArm(aiData.bandit, ctx);
    seedCounterRef.current += 37;
    const challenge = generateChallengeForScene(
      sceneId,
      sceneMeta.skillId,
      arm,
      seedCounterRef.current
    );

    setActiveChallenge(challenge);
    setChallengeEval(null);
    setShowHint(arm === 0);
    erraticRef.current = { lastDeltaSign: 0, reversals: 0, moves: 0 };

    if (arm === 0) {
      setLayers((prev) =>
        prev.map((l) => ({
          ...l,
          visible: challenge.recommendedLayers.includes(l.id) ? true : l.visible,
        }))
      );
    } else if (arm === 2) {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === 'error' || l.id === 'invariant' ? { ...l, visible: false } : l
        )
      );
    }

    if (sceneId === 'lin-eigen' && challenge.targetParams.a !== undefined) {
      setParamValues((prev) => ({
        ...prev,
        a: challenge.targetParams.a,
        b: challenge.targetParams.b,
        c: 0.2,
        d: challenge.targetParams.d,
      }));
    }

    setDrawerMode('challenge');
  }, [aiData.bandit, buildCurrentContext, sceneId, sceneMeta.skillId]);

  const handleVerifyChallenge = useCallback(() => {
    if (!activeChallenge) return;

    const currentAdam = optimizerProbes[2];
    const adamLoss = currentAdam
      ? evaluateLossLandscape(currentAdam.x, currentAdam.y, landscape).loss
      : 2.0;

    const res = evaluateChallengeAttempt(activeChallenge, paramValues, {
      activation,
      dataset,
      adamLoss,
      adamSteps: currentAdam?.stepCount ?? 0,
      adamDiverged: currentAdam?.diverged ?? false,
      symbolicTargetIdx,
    });

    const durationMs = Math.max(1200, Date.now() - activeChallenge.startedAt);
    const erraticIndex =
      erraticRef.current.moves > 0
        ? Math.min(1, erraticRef.current.reversals / erraticRef.current.moves)
        : 0;

    const prevSkill = aiData.bkt[activeChallenge.skillId];
    const nextSkill = updateBktSkill(prevSkill, res.solved);
    const reward = computeZdpReward(res.solved, res.errorMetric, durationMs, erraticIndex);

    const ctx = buildCurrentContext(res.errorMetric);
    const nextBandit = updateBanditState(aiData.bandit, activeChallenge.arm, ctx, reward);

    const prev3D = aiData.completed3DChallengeScenes;
    const next3D =
      res.solved && !prev3D.includes(activeChallenge.sceneId)
        ? [...prev3D, activeChallenge.sceneId]
        : prev3D;

    const nextData: PersistedAiData = {
      ...aiData,
      bkt: {
        ...aiData.bkt,
        [activeChallenge.skillId]: nextSkill,
      },
      bandit: nextBandit,
      lastErrorBySkill: {
        ...aiData.lastErrorBySkill,
        [activeChallenge.skillId]: res.errorMetric,
      },
      completed3DChallengeScenes: next3D,
    };

    setAiData(nextData);
    savePersistedAiData(nextData);

    setChallengeEval({
      errorMetric: res.errorMetric,
      solved: res.solved,
      feedback: res.feedback,
      contrastNote: activeChallenge.referenceContrast,
      pLBefore: prevSkill.pL,
      pLAfter: nextSkill.pL,
      reward,
    });

    if (res.solved) {
      setCelebrationStamp({
        key: `challenge-${activeChallenge.sceneId}-${Date.now()}`,
        title: '¡Reto Superado!',
        subtitle: `Dominio ${Math.round(nextSkill.pL * 100)}%`,
        badge: 'VERIFICADO',
        crayon: 'cobalt',
      });
    }
  }, [
    activeChallenge,
    aiData,
    activation,
    buildCurrentContext,
    dataset,
    landscape,
    layers,
    optimizerProbes,
    paramValues,
    symbolicTargetIdx,
  ]);

  // Record Symbolic Engine v1 and CodeLab Engine v1 attempts into BKT mastery + schema-v3 storage
  const handleEngineAttempt = useCallback(
    (engineKind: 'symbolic' | 'codelab', passed: boolean) => {
      const skillId = sceneMeta.skillId;
      const prevSkill = aiData.bkt[skillId];
      const nextSkill = updateBktSkill(prevSkill, passed);

      const listKey =
        engineKind === 'symbolic' ? 'completedSymbolicScenes' : 'completedCodeLabScenes';
      const existing = aiData[listKey];
      const wasCompleted = existing.includes(sceneId);
      const nextList = passed && !wasCompleted ? [...existing, sceneId] : existing;

      const nextData: PersistedAiData = {
        ...aiData,
        bkt: {
          ...aiData.bkt,
          [skillId]: nextSkill,
        },
        [listKey]: nextList,
      };
      setAiData(nextData);
      savePersistedAiData(nextData);

      if (passed && !wasCompleted) {
        setCelebrationStamp({
          key: `${engineKind}-${sceneId}-${Date.now()}`,
          title: engineKind === 'symbolic' ? '¡Prueba Lista!' : '¡CodeLab Listo!',
          subtitle: `Dominio ${Math.round(nextSkill.pL * 100)}%`,
          badge: engineKind === 'symbolic' ? 'SIMBÓLICO' : 'CODELAB',
          crayon: engineKind === 'symbolic' ? 'sage' : 'ochre',
        });
      }
    },
    [aiData, sceneId, sceneMeta.skillId]
  );

  const handleExportProgress = useCallback(
    () => exportProgressJson(aiData, completedStepIds),
    [aiData, completedStepIds]
  );

  const handleImportProgress = useCallback(
    (rawJson: string): { ok: boolean; message: string } => {
      const res = parseImportedProgressJson(rawJson);
      if (!res.ok) {
        return { ok: false, message: res.error };
      }
      setAiData(res.aiData);
      savePersistedAiData(res.aiData);
      const nextSteps = new Set(res.completedStepIds);
      setCompletedStepIds(nextSteps);
      saveCompletedSteps(nextSteps);
      if (res.studyRhythm) replaceStudyRhythm(res.studyRhythm);
      if (res.game) replaceGame(res.game);
      return { ok: true, message: 'Progreso restaurado en tu cuaderno local.' };
    },
    []
  );

  // Derived live computational bridge & metrics
  const adamCurrentLoss = adamProbe
    ? evaluateLossLandscape(adamProbe.x, adamProbe.y, landscape).loss
    : 2.0;

  const bridge = useMemo(
    () =>
      buildComputationalBridge(sceneId, paramValues, {
        activation,
        dataset,
        landscape,
        symbolicTargetIdx,
        aiFormula: symbolicAiFormula,
        aiMse: symbolicAiMse,
        generation: symbolicGen,
      }),
    [
      sceneId,
      paramValues,
      activation,
      dataset,
      landscape,
      symbolicTargetIdx,
      symbolicAiFormula,
      symbolicAiMse,
      symbolicGen,
    ]
  );

  const liveMetrics = useMemo(
    () =>
      buildSceneLiveMetrics(sceneId, paramValues, {
        activation,
        dataset,
        landscape,
        symbolicTargetIdx,
        adamLoss: adamCurrentLoss,
        adamSteps: adamProbe?.stepCount ?? 0,
        aiMse: symbolicAiMse,
        generation: symbolicGen,
      }),
    [
      sceneId,
      paramValues,
      activation,
      dataset,
      landscape,
      symbolicTargetIdx,
      adamCurrentLoss,
      adamProbe?.stepCount,
      symbolicAiMse,
      symbolicGen,
    ]
  );

  const autoDiffSnapshot = useMemo(
    () =>
      sceneId === 'calc-autodiff'
        ? evaluateAutoDiffDag(
            paramValues.x ?? 0.7,
            paramValues.y ?? 0.6,
            paramValues.w ?? 1.6,
            autoDiffPass
          )
        : null,
    [sceneId, paramValues.x, paramValues.y, paramValues.w, autoDiffPass]
  );

  const activeSkillState = aiData.bkt[sceneMeta.skillId];

  // Live Reto optimality proximity for intensifying artisanal crayon glow on parameter sliders
  const challengeProximity = useMemo(
    () =>
      computeChallengeParamProximity(
        drawerMode === 'challenge' ? activeChallenge : null,
        paramValues,
        {
          activation,
          dataset,
          adamLoss: adamCurrentLoss,
          adamSteps: adamProbe?.stepCount ?? 0,
          adamDiverged: adamProbe?.diverged ?? false,
          symbolicTargetIdx,
        }
      ),
    [
      drawerMode,
      activeChallenge,
      paramValues,
      activation,
      dataset,
      adamCurrentLoss,
      adamProbe?.stepCount,
      adamProbe?.diverged,
      symbolicTargetIdx,
    ]
  );

  return (
    <div
      ref={rootRef}
      className={`h-full w-full flex flex-col overflow-hidden bg-[var(--bg-paper)] text-[var(--text-primary)] ${
        ecoMode ? 'eco-mode' : ''
      }`}
      data-app-view={appView}
      data-module={activeModuleId}
      data-scene={sceneId}
      data-theme={theme}
      data-eco={ecoMode ? 'true' : 'false'}
      data-audio={ecoMode ? 'eco-muted' : audioEnabled ? 'on' : 'off'}
      data-rhythm-active={rhythmSnapshot.isPlaying ? 'true' : 'false'}
      data-rhythm-bpm={rhythmSnapshot.detectedBpm !== null ? String(Math.round(rhythmSnapshot.detectedBpm)) : ''}
      data-intro={introOpen ? 'true' : 'false'}
      data-workspace-mode={workspaceMode}
    >
      <CrayonSvgDefs ecoMode={ecoMode} />

      {/* Calm Top Bar — completely hidden during Fullscreen Theory Introduction */}
      {!(appView === 'lab3d' && introOpen) && (
        <TopBar
          appView={appView}
          activeModuleId={activeModuleId}
          activeSceneId={sceneId}
          drawerMode={drawerMode}
          mapOpen={mapOpen}
          diagnosticOpen={diagnosticOpen}
          diagnosticDone={Boolean(aiData.diagnosticReport)}
          rhythmOpen={rhythmOpen}
          rhythmPlaying={rhythmSnapshot.isPlaying}
          rhythmBpm={rhythmSnapshot.detectedBpm}
          theme={theme}
          ecoMode={ecoMode}
          audioEnabled={audioEnabled}
          onBackToModule={() => {
            setDrawerMode('closed');
            setIntroOpen(false);
            setAppView('module');
          }}
          onToggleMap={() => {
            setRhythmOpen(false);
            setDiagnosticOpen(false);
            setMapOpen((v) => !v);
          }}
          onToggleDiagnostic={() => {
            setRhythmOpen(false);
            setMapOpen(false);
            setDiagnosticOpen((v) => !v);
          }}
          onOpenLinked3D={() => {
            setRhythmOpen(false);
            setMapOpen(false);
            setDiagnosticOpen(false);
            const target = STUDY_MODULES[activeModuleId].linked3DSceneId ?? sceneId;
            handleOpen3DScene(target);
          }}
          onOpenIntro={() => {
            audioEngineRef.current?.unlock();
            setDrawerMode('closed');
            setMapOpen(false);
            setRhythmOpen(false);
            setWorkspaceMode('webgl3d');
            setIntroPlaying(true);
            managerRef.current?.setConstructionPaused(false);
            setIntroBeatIdx(0);
            setIntroOpen(true);
          }}
          onToggleInspector={() => {
            setRhythmOpen(false);
            setDrawerMode((m) => (m === 'computational' ? 'closed' : 'computational'));
          }}
          onToggleTheme={() => setTheme((t) => (t === 'paper' ? 'chalkboard' : 'paper'))}
          onToggleEcoMode={() => setEcoMode((e) => !e)}
          onToggleRhythm={() => {
            audioEngineRef.current?.unlock();
            setRhythmOpen((v) => !v);
          }}
          onToggleAudio={() => {
            setAudioEnabled((prev) => {
              const next = !prev;
              audioEngineRef.current?.syncSettings(next, ecoMode);
              rhythmEngineRef.current?.syncSettings(next, ecoMode);
              if (next && !ecoMode) {
                audioEngineRef.current?.unlock();
                audioEngineRef.current?.playParameterStroke(0.24, theme, performance.now());
              }
              return next;
            });
          }}
        />
      )}

      {!(appView === 'lab3d' && introOpen) && (
        <RhythmAudioPopover
          open={rhythmOpen}
          theme={theme}
          snapshot={rhythmSnapshot}
          onClose={() => setRhythmOpen(false)}
          onTogglePlay={() => {
            audioEngineRef.current?.unlock();
            void rhythmEngineRef.current?.togglePlayback();
          }}
          onSelectTrack={(id) => {
            audioEngineRef.current?.unlock();
            rhythmEngineRef.current?.selectTrack(id);
          }}
          onUploadFile={(file) => {
            audioEngineRef.current?.unlock();
            void rhythmEngineRef.current?.loadCustomAudioFile(file);
          }}
          onTapTempo={() => {
            audioEngineRef.current?.unlock();
            rhythmEngineRef.current?.tapTempo();
          }}
          onChangeVolume={(vol) => rhythmEngineRef.current?.setMusicVolume(vol)}
          onToggleSync={(en) => rhythmEngineRef.current?.setSyncEnabled(en)}
          onChangeSyncStrength={(str) => rhythmEngineRef.current?.setSyncStrength(str)}
          onEnableAudio={() => {
            if (ecoMode) setEcoMode(false);
            if (!audioEnabled) setAudioEnabled(true);
            audioEngineRef.current?.syncSettings(true, false);
            rhythmEngineRef.current?.syncSettings(true, false);
            audioEngineRef.current?.unlock();
          }}
        />
      )}

      {/* Main Stage: 32-Module Visual Study Plan OR Flagship 3D WebGL Lab */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden notebook-paper-bg">
        {/* 32-Module Escalera Workspace (Default Primary Experience) */}
        {appView === 'module' && (
          <ModuleWorkspace
            moduleId={activeModuleId}
            theme={theme}
            completedModuleIds={completedModuleSet}
            diagnosticReport={aiData.diagnosticReport ?? null}
            onSelectModule={handleSelectModule}
            onMarkModuleCompleted={handleMarkModuleCompleted}
            onOpen3DScene={handleOpen3DScene}
            onOpenDiagnostic={() => setDiagnosticOpen(true)}
            onOpenPlanMap={() => setMapOpen(true)}
          />
        )}

        {/* Isolated WebGL canvas mount (mounted only when appView === 'lab3d') */}
        {appView === 'lab3d' && (
          <SketchAnimationWrapper
            sceneKey={sceneId}
            className={webglLost ? 'hidden' : 'block'}
          >
            <div
              ref={canvasHostRef}
              data-testid="webgl-viewport"
              className="absolute inset-0 w-full h-full touch-none"
            />
          </SketchAnimationWrapper>
        )}

        {appView === 'lab3d' && exploded && !webglLost && !introOpen && (
          <AnatomyScrollRail
            theme={theme}
            amount={anatomyScroll.amount}
            scrolled={anatomyScroll.scrolled}
            onSetTarget={anatomyScroll.setTarget}
          />
        )}

        {appView === 'lab3d' && webglLost && (
          <WebGLFallbackSvg
            title={sceneMeta.title}
            theme={theme}
            exploded={exploded}
            legendOpen={legendOpen}
          />
        )}

        {/* FULLSCREEN ANIMATED THEORY INTRODUCTION (Lab 3D only) */}
        {appView === 'lab3d' && introOpen && (
          <LessonIntroPlayer
            intro={LESSON_INTROS[sceneId]}
            beatIndex={introBeatIdx}
            theme={theme}
            onChangeBeat={(nextBeat) => {
              audioEngineRef.current?.unlock();
              setIntroBeatIdx(nextBeat);
            }}
            onPlayingChange={(playing) => setIntroPlaying(playing)}
            onReplaySketch={() => {
              audioEngineRef.current?.unlock();
              const beat = LESSON_INTROS[sceneId]?.beats[introBeatIdx];
              managerRef.current?.setConstructionPaused(false);
              if (introBeatIdx === 1 && beat?.stageState.focusedLayerId) {
                managerRef.current?.replayLayerBuild(beat.stageState.focusedLayerId);
              } else {
                managerRef.current?.replayProceduralBuild();
              }
              audioEngineRef.current?.playIntroPhrase(theme, introBeatIdx, performance.now());
            }}
            onFinish={handleFinishIntro}
          />
        )}

        {/* Calm Top-Right Workspace Mode Switcher (Visual 3D · Simbólico · CodeLab) */}
        {appView === 'lab3d' && !introOpen && drawerMode === 'closed' && (
          <div
            role="tablist"
            aria-label="Modo de laboratorio"
            data-testid="workspace-mode-switcher"
            className="pointer-events-auto absolute top-2.5 sm:top-3.5 left-3 right-3 sm:left-auto sm:right-6 z-[22] flex sm:inline-flex items-center justify-center sm:justify-start gap-3.5 sm:gap-4 px-2.5 sm:px-3 py-1.5 rounded bg-[var(--bg-paper)]/94 border border-dashed border-[var(--hairline-strong)]"
          >
            {(
              [
                {
                  id: 'webgl3d' as const,
                  label: 'Visual 3D',
                  done:
                    aiData.completed3DChallengeScenes.includes(sceneId) ||
                    activeLesson.steps.every((s) => completedStepIds.has(s.id)),
                },
                {
                  id: 'symbolic' as const,
                  label: 'Simbólico',
                  done: aiData.completedSymbolicScenes.includes(sceneId),
                },
                {
                  id: 'codelab' as const,
                  label: 'CodeLab',
                  done: aiData.completedCodeLabScenes.includes(sceneId),
                },
              ]
            ).map((tab, idx) => {
              const active = workspaceMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-testid={`mode-tab-${tab.id}`}
                  onClick={() => {
                    audioEngineRef.current?.unlock();
                    audioEngineRef.current?.playParameterStroke(0.16, theme, performance.now());
                    setWorkspaceMode(tab.id);
                  }}
                  className={`relative pb-0.5 text-[14.5px] leading-none cursor-pointer whitespace-nowrap transition-colors ${
                    active
                      ? 'font-display text-[17.5px] text-[var(--ui-accent)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                  {tab.done && (
                    <span
                      className="ml-1 text-[12px] text-[var(--ui-success)]"
                      aria-label="completado"
                    >
                      ✓
                    </span>
                  )}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-1">
                      <RoughUnderline crayon="cobalt" theme={theme} seed={91 + idx * 13} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* HANDS-ON PRACTICE HEADER: Minimal direct-on-paper title + single live metric line (3D mode) */}
        {appView === 'lab3d' && !introOpen && (
          <div className="pointer-events-none absolute top-[54px] sm:top-4 left-3 sm:left-6 right-3 sm:right-6 z-10 flex items-start justify-between gap-4 sm:gap-6">
            {workspaceMode === 'webgl3d' ? (
              <div className="max-w-full sm:max-w-[calc(100%-335px)] lg:max-w-[560px] select-none">
                <h1 className="font-display crayon-ink text-[21px] sm:text-[28px] lg:text-[32px] leading-[1.06] text-[var(--text-primary)]">
                  {sceneMeta.title}
                </h1>

                {/* Single calm live reading directly beneath title */}
                <div className="pt-0.5 sm:pt-1 flex flex-wrap items-baseline gap-x-2 sm:gap-x-2.5 gap-y-0.5 text-[13px] sm:text-[15px] text-[var(--text-secondary)] tabular-nums">
                  <span>
                    {liveMetrics.primaryLabel}:{' '}
                    <strong className="font-display text-[16px] sm:text-[19px] font-normal text-[var(--text-primary)]">
                      {liveMetrics.primaryValue}
                    </strong>
                  </span>
                  <span className="text-[var(--hairline-strong)]" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    {liveMetrics.secondaryLabel}:{' '}
                    <strong className="font-display text-[16px] sm:text-[19px] font-normal text-[var(--text-primary)]">
                      {liveMetrics.secondaryValue}
                    </strong>
                  </span>
                  <span className="hidden lg:inline-flex items-baseline gap-2 whitespace-nowrap">
                    <span className="text-[var(--hairline-strong)]" aria-hidden="true">
                      —
                    </span>
                    <span
                      className="font-display text-[18px] leading-tight"
                      style={{
                        color:
                          liveMetrics.statusSeverity === 'warning'
                            ? 'var(--ui-warning)'
                            : liveMetrics.statusSeverity === 'highlight'
                              ? 'var(--ui-success)'
                              : 'var(--text-muted)',
                      }}
                    >
                      {liveMetrics.statusText}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <div />
            )}

            {/* Open top-right paper margin — displays CrayonStamp cleanly below mode switcher & Leyenda */}
            {drawerMode === 'closed' && celebrationStamp && (
              <div className="pointer-events-auto pt-[86px] select-none z-[23]">
                <CrayonStamp
                  key={celebrationStamp.key}
                  title={celebrationStamp.title}
                  subtitle={celebrationStamp.subtitle}
                  badge={celebrationStamp.badge}
                  crayon={celebrationStamp.crayon}
                  theme={theme}
                  onDismiss={() => setCelebrationStamp(null)}
                />
              </div>
            )}
          </div>
        )}

        {/* Symbolic Engine v1 Workspace (Step-by-step KaTeX derivation + Equivalence verifier) */}
        {appView === 'lab3d' && !introOpen && workspaceMode === 'symbolic' && (
          <SymbolicWorkspace
            sceneId={sceneId}
            theme={theme}
            alreadyCompleted={aiData.completedSymbolicScenes.includes(sceneId)}
            onAttemptResult={(passed) => handleEngineAttempt('symbolic', passed)}
            onPlayStroke={() => {
              audioEngineRef.current?.unlock();
              audioEngineRef.current?.playParameterStroke(0.18, theme, performance.now());
            }}
          />
        )}

        {/* CodeLab Engine v1 Workspace (Rust & Java Parsons blocks + Web Worker test harness) */}
        {appView === 'lab3d' && !introOpen && workspaceMode === 'codelab' && (
          <CodeLabWorkspace
            sceneId={sceneId}
            theme={theme}
            alreadyCompleted={aiData.completedCodeLabScenes.includes(sceneId)}
            onAttemptResult={(passed) => handleEngineAttempt('codelab', passed)}
            onPlayStroke={() => {
              audioEngineRef.current?.unlock();
              audioEngineRef.current?.playParameterStroke(0.18, theme, performance.now());
            }}
          />
        )}

        {/* Modo 'Escritura Libre': Overlaid wax-crayon canvas persisted per lesson in LocalStorage */}
        <FreehandCanvasOverlay
          sceneId={sceneId}
          active={freehandActive}
          visible={freehandVisible}
          strokes={freehandStore[sceneId] ?? []}
          theme={theme}
          ecoMode={ecoMode}
          hidden={appView !== 'lab3d' || introOpen || drawerMode !== 'closed' || workspaceMode !== 'webgl3d'}
          onChangeStrokes={handleChangeFreehandStrokes}
          onCloseDrawing={() => setFreehandActive(false)}
          onToggleVisible={() => setFreehandVisible((v) => !v)}
          onStrokeSound={(delta) => {
            audioEngineRef.current?.unlock();
            audioEngineRef.current?.playParameterStroke(delta, theme, performance.now());
          }}
        />

        {/* Non-obtrusive hand-drawn 3D anatomy callouts, Escritura Libre & Pista IA controls */}
        <ViewportAnnotationsOverlay
          open={legendOpen}
          onToggle={() => {
            setLegendOpen((prev) => {
              const next = !prev;
              if (next) {
                audioEngineRef.current?.unlock();
                audioEngineRef.current?.playAnnotationSketch(theme, performance.now());
              }
              return next;
            });
          }}
          annotations={projectedAnnotations}
          focusedParamId={focusedParamId}
          theme={theme}
          ecoMode={ecoMode}
          guideActive={idleGuideActive && !freehandActive}
          hidden={appView !== 'lab3d' || introOpen || drawerMode !== 'closed' || workspaceMode !== 'webgl3d'}
          freehandActive={freehandActive}
          freehandCount={(freehandStore[sceneId] ?? []).length}
          onToggleFreehand={() => {
            audioEngineRef.current?.unlock();
            setFreehandActive((prev) => {
              const next = !prev;
              if (next) setFreehandVisible(true);
              return next;
            });
          }}
          aiHintAvailable={Boolean(activeAiHint)}
          aiHintOpen={Boolean(activeAiHint)}
          onRequestAiHint={handleRequestAiHint}
        />

        {/* Real-time AI Hints margin card (stagnation / divergence coaching + 1-click apply) */}
        <AiHintToast
          hint={appView === 'lab3d' && !introOpen && workspaceMode === 'webgl3d' && drawerMode === 'closed' ? activeAiHint : null}
          theme={theme}
          onApply={handleApplyAiHint}
          onDismiss={handleDismissAiHint}
        />

        {/* Clean Slide-Over Drawer (Code Bridge & Adaptive Challenge) — Lab 3D only */}
        {appView === 'lab3d' && !introOpen && (
          <SlideDrawer
            mode={drawerMode}
            sceneId={sceneId}
            theme={theme}
            bridge={bridge}
            autoDiffSnapshot={autoDiffSnapshot}
            challenge={activeChallenge}
            challengeProximity={challengeProximity}
            evaluation={challengeEval}
            skillState={activeSkillState}
            showHint={showHint}
            onChangeMode={(m) => {
              if (m === 'challenge' && (!activeChallenge || activeChallenge.sceneId !== sceneId)) {
                launchChallenge();
              } else {
                setDrawerMode(m);
              }
            }}
            onVerifyChallenge={handleVerifyChallenge}
            onNewChallenge={launchChallenge}
            onToggleHint={() => setShowHint((h) => !h)}
          />
        )}
      </main>

      {/* Unified Sequential Practice Dock — shown only in 3D hands-on mode */}
      {appView === 'lab3d' && !introOpen && workspaceMode === 'webgl3d' && (
        <CoursePipelineDock
          lesson={activeLesson}
          sceneId={sceneId}
          activeStepIdx={activeStepIdx}
          completedStepIds={completedStepIds}
          challengeActive={drawerMode === 'challenge'}
          activeChallenge={activeChallenge}
          challengeProximity={challengeProximity}
          paramsMeta={sceneMeta.defaultParams}
          paramValues={paramValues}
          exploded={exploded}
          collapsed={anatomyCollapsed}
          focusedParamId={focusedParamId}
          theme={theme}
          activation={activation}
          dataset={dataset}
          landscape={landscape}
          autoDiffPass={autoDiffPass}
          optimizerRunning={optimizerRunning}
          symbolicRunning={symbolicRunning}
          symbolicTargetIdx={symbolicTargetIdx}
          onSelectStep={(idx) => {
            setDrawerMode('closed');
            setActiveStepIdx(idx);
          }}
          onRunStepDemo={handleRunStepDemo}
          onLaunchChallenge={launchChallenge}
          onVerifyChallenge={handleVerifyChallenge}
          onSelectScene={selectScene}
          onChangeParam={handleParamChange}
          onFocusToken={handleFocusToken}
          onToggleExploded={() => {
            setFocusedParamId(null);
            audioEngineRef.current?.unlock();
            audioEngineRef.current?.playParameterStroke(0.18, theme, performance.now());
            setExploded((v) => !v);
          }}
          onToggleCollapsed={() => setAnatomyCollapsed((v) => !v)}
          onResetScene={handleResetScene}
          onChangeActivation={setActivation}
          onChangeDataset={setDataset}
          onChangeLandscape={(ls) => {
            setLandscape(ls);
            setOptimizerRunning(false);
            setOptimizerProbes(createInitialOptimizerProbes(ls));
          }}
          onTriggerAutoDiffPass={(pass) => {
            setAutoDiffPass(pass);
            if (drawerMode === 'closed') setDrawerMode('computational');
          }}
          onToggleOptimizerRun={() => setOptimizerRunning((r) => !r)}
          onStepOptimizer={() => {
            setOptimizerRunning(false);
            setOptimizerProbes((prev) =>
              prev.map((p) =>
                stepOptimizerProbe(
                  p,
                  landscape,
                  paramValues.lr ?? 0.06,
                  paramValues.beta ?? 0.82
                )
              )
            );
          }}
          onResetOptimizers={() => {
            setOptimizerRunning(false);
            setOptimizerProbes(createInitialOptimizerProbes(landscape));
          }}
          onToggleSymbolicWorker={handleToggleSymbolicWorker}
          onCycleSymbolicTarget={() => {
            stopSymbolicWorker();
            setSymbolicTargetIdx((idx) => (idx + 1) % SYMBOLIC_TARGETS.length);
            setSymbolicGen(0);
            setSymbolicAiFormula('En espera');
            setSymbolicAiMse(99);
            setAiSymbolicGrid(null);
          }}
        />
      )}

      {/* 7-Phase / 32-Module Visual Study Plan Modal */}
      <CurriculumMapModal
        open={!(appView === 'lab3d' && introOpen) && mapOpen}
        activeModuleId={activeModuleId}
        completedModuleIds={completedModuleSet}
        diagnosticReport={aiData.diagnosticReport ?? null}
        theme={theme}
        onSelectModule={handleSelectModule}
        onOpen3DScene={handleOpen3DScene}
        onOpenDiagnostic={() => setDiagnosticOpen(true)}
        onClose={() => setMapOpen(false)}
        onExportProgress={handleExportProgress}
        onImportProgress={handleImportProgress}
        onResetProgress={() => {
          cancelParamAnim();
          stopSymbolicWorker();
          const fresh = createDefaultPersistedData();
          setAiData(fresh);
          savePersistedAiData(fresh);
          setActiveModuleId('M1');
          const emptySteps = new Set<string>();
          setCompletedStepIds(emptySteps);
          saveCompletedSteps(emptySteps);
          replaceStudyRhythm(EMPTY_RHYTHM);
          replaceGame(EMPTY_GAME);
          seenIntrosRef.current = new Set();
          setParamValues(defaultParamsFor(sceneId));
          setLayers(SCENES[sceneId].defaultLayers.map((l) => ({ ...l })));
          setExploded(false);
          setActivation('tanh');
          setDataset('rings');
          setLandscape('rosenbrock');
          setAutoDiffPass('idle');
          setOptimizerRunning(false);
          setOptimizerProbes(createInitialOptimizerProbes('rosenbrock'));
          setSymbolicGen(0);
          setSymbolicAiFormula('En espera');
          setSymbolicAiMse(99);
          setAiSymbolicGrid(null);
          setDrawerMode('closed');
          setActiveChallenge(null);
          setActiveStepIdx(0);
          setChallengeEval(null);
          setCelebrationStamp(null);
          managerRef.current?.resetCamera();
        }}
      />

      {/* Fase 0: Diagnóstico adaptativo de vacíos y mapa de calor */}
      <DiagnosticModal
        open={!(appView === 'lab3d' && introOpen) && diagnosticOpen}
        theme={theme}
        existingReport={aiData.diagnosticReport ?? null}
        onComplete={handleCompleteDiagnostic}
        onJumpToModule={handleSelectModule}
        onClose={() => setDiagnosticOpen(false)}
      />
    </div>
  );
}
