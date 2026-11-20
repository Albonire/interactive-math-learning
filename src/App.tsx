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
  CrayonAudioEngine,
  loadInitialAudioEnabled,
  saveAudioEnabled,
} from './audio/crayonAudio';
import {
  createDefaultPersistedData,
  loadPersistedAiData,
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
  getWorldAnchorForParam,
  type ProjectedAnnotation,
} from './rendering/sceneAnnotations';
import { TopBar } from './ui/TopBar';
import { CoursePipelineDock } from './ui/CoursePipelineDock';
import { SlideDrawer } from './ui/SlideDrawer';
import { CurriculumMapModal } from './ui/CurriculumMapModal';
import { LessonIntroPlayer } from './ui/LessonIntroPlayer';
import { CrayonStamp } from './ui/CrayonStamp';
import { SketchAnimationWrapper } from './ui/SketchAnimationWrapper';
import { ViewportAnnotationsOverlay } from './ui/ViewportAnnotationsOverlay';
import { CrayonSvgDefs, WebGLFallbackSvg } from './ui/RoughElements';

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
  const [sceneId, setSceneId] = useState<SceneId>('lin-span');
  const [theme, setTheme] = useState<ThemeMode>('paper');
  const [ecoMode, setEcoMode] = useState<boolean>(() => loadInitialEcoMode());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(() => loadInitialAudioEnabled());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioEngineRef = useRef<CrayonAudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new CrayonAudioEngine(audioEnabled, ecoMode, (stats) => {
      const el = rootRef.current;
      if (el) {
        el.dataset.audioState = stats.state;
        el.dataset.audioPlays = String(stats.strokePlays + stats.dustPlays);
      }
    });
  }
  const [steadyStrokes] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Fullscreen Animated Theory Introduction (plays inside viewport before practice)
  const [introOpen, setIntroOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return true;
  });
  const [introBeatIdx, setIntroBeatIdx] = useState<number>(0);
  const seenIntrosRef = useRef<Set<SceneId>>(new Set(['lin-span']));

  // Non-obtrusive 3D Viewport Legend & Crayon Dust interaction energy tracker
  const [legendOpen, setLegendOpen] = useState<boolean>(false);
  const [projectedAnnotations, setProjectedAnnotations] = useState<ProjectedAnnotation[]>([]);
  const dustEnergyRef = useRef<ParameterEnergyTracker>(new ParameterEnergyTracker());

  // Guided Interactive Course State
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(() =>
    loadCompletedSteps()
  );
  const [celebrationStamp, setCelebrationStamp] = useState<{
    key: string;
    title: string;
    subtitle: string;
    badge: string;
    crayon: 'sage' | 'ochre' | 'cobalt';
  } | null>(null);

  // Single Source of Truth for active scene parameters and anatomy state
  const [paramValues, setParamValues] = useState<Record<string, number>>(() =>
    defaultParamsFor('lin-span')
  );
  const paramValuesRef = useRef<Record<string, number>>(paramValues);
  paramValuesRef.current = paramValues;

  const [layers, setLayers] = useState<AnatomyLayerSpec[]>(() =>
    SCENES['lin-span'].defaultLayers.map((l) => ({ ...l }))
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

  // Local Edge AI state (BKT + LinUCB Bandit + Telemetry)
  const [aiData, setAiData] = useState<PersistedAiData>(() => loadPersistedAiData());
  const [activeChallenge, setActiveChallenge] = useState<ChallengeSpec | null>(null);
  const [challengeEval, setChallengeEval] = useState<ChallengeEvaluation | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Erratic parameter reversal tracker for Contextual Bandit context vector
  const erraticRef = useRef({ lastDeltaSign: 0, reversals: 0, moves: 0 });
  const seedCounterRef = useRef(104729);

  // Three.js isolated host container
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<SceneManager | null>(null);

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

  // Initialize Web Audio engine on app mount (strictly honoring initial audioEnabled & ecoMode)
  useEffect(() => {
    const engine = audioEngineRef.current;
    engine?.initialize();
    if (rootRef.current && engine) {
      const st = engine.getStats();
      rootRef.current.dataset.audioState = st.state;
      rootRef.current.dataset.audioPlays = String(st.strokePlays + st.dustPlays);
    }
    return () => {
      engine?.dispose();
    };
  }, []);

  // Keep optional Web Audio engine synchronized with user preference & ecoMode silencing
  useEffect(() => {
    saveAudioEnabled(audioEnabled);
    audioEngineRef.current?.syncSettings(audioEnabled, ecoMode);
  }, [audioEnabled, ecoMode]);

  // Initialize Three.js WebGL 2 SceneManager once on mount
  useEffect(() => {
    const container = canvasHostRef.current;
    if (!container) return;

    try {
      const manager = new SceneManager({
        container,
        initialTheme: theme,
        initialEcoMode: ecoMode,
        onContextLost: () => setWebglLost(true),
        onContextRestored: () => setWebglLost(false),
        onAnnotationsProjected: (items) => setProjectedAnnotations(items),
      });
      managerRef.current = manager;
    } catch {
      setWebglLost(true);
    }

    return () => {
      managerRef.current?.dispose();
      managerRef.current = null;
    };
    // Intentionally mounted once so HUD state updates never recreate WebGL context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setAutoDiffPass('idle');
      setActiveChallenge(null);
      setChallengeEval(null);
      setShowHint(false);
      setCelebrationStamp(null);
      setDrawerMode('closed');
      setMapOpen(false);
      setProjectedAnnotations([]);
      dustEnergyRef.current.reset();
      erraticRef.current = { lastDeltaSign: 0, reversals: 0, moves: 0 };

      const nextLesson = GUIDED_LESSONS[nextId];
      const firstOpen = nextLesson.steps.findIndex((s) => !completedStepIds.has(s.id));
      setActiveStepIdx(firstOpen === -1 ? 0 : firstOpen);

      if (nextId === 'calc-optimizers') {
        setOptimizerProbes(createInitialOptimizerProbes(landscape));
      }
      if (nextId === 'calc-symbolic') {
        setSymbolicGen(0);
        setSymbolicAiFormula('En espera');
        setSymbolicAiMse(99);
        setAiSymbolicGrid(null);
      }

      const shouldOpenIntro = replayIntro ?? !seenIntrosRef.current.has(nextId);
      if (shouldOpenIntro) {
        seenIntrosRef.current.add(nextId);
        setIntroBeatIdx(0);
        setIntroOpen(true);
      } else {
        setIntroOpen(false);
      }
    },
    [cancelParamAnim, completedStepIds, landscape, stopSymbolicWorker]
  );

  // Live 3D choreography while the fullscreen theory intro plays
  useEffect(() => {
    if (!introOpen) return;
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

    const targetParams = { ...defaultParamsFor(sceneId), ...(st.params ?? {}) };
    cancelParamAnim();
    const startParams = { ...paramValuesRef.current };
    const durationMs = steadyStrokes || managerRef.current?.isSoftwareMode() ? 0 : 820;

    if (durationMs === 0) {
      setParamValues(targetParams);
    } else {
      const t0 = performance.now();
      const tick = (now: number) => {
        const raw = Math.min(1, (now - t0) / durationMs);
        const ease = 1 - Math.pow(1 - raw, 3);
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
  }, [introOpen, sceneId, introBeatIdx, steadyStrokes, cancelParamAnim]);

  // Transition smoothly from fullscreen intro to clean hands-on practice
  const handleFinishIntro = useCallback(() => {
    cancelParamAnim();
    setOptimizerRunning(false);
    setParamValues(defaultParamsFor(sceneId));
    setExploded(false);
    setAutoDiffPass('idle');
    if (sceneId === 'calc-optimizers') {
      setOptimizerProbes(createInitialOptimizerProbes(landscape));
    }
    setIntroOpen(false);
  }, [cancelParamAnim, landscape, sceneId]);

  // Optimizer race animation loop (Scene 2.3) — respects Eco Mode interval
  useEffect(() => {
    if (!optimizerRunning || sceneId !== 'calc-optimizers') return;
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
  }, [optimizerRunning, sceneId, landscape, paramValues.lr, paramValues.beta, ecoMode]);

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

  // Toggle 3D-to-2D annotation projection only when Legend is open during hands-on practice
  useEffect(() => {
    managerRef.current?.setAnnotationsEnabled(legendOpen && !introOpen && drawerMode === 'closed');
  }, [legendOpen, introOpen, drawerMode]);

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

  // Keyboard shortcuts: H collapses bottom practice bar, L toggles 3D Legend, Escape closes index/drawer
  useEffect(() => {
    if (introOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'h' || e.key === 'H') {
        setAnatomyCollapsed((v) => !v);
      } else if ((e.key === 'l' || e.key === 'L') && !mapOpen && drawerMode === 'closed') {
        setLegendOpen((v) => !v);
      } else if (e.key === 'Escape') {
        if (mapOpen) setMapOpen(false);
        else if (drawerMode !== 'closed') setDrawerMode('closed');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [introOpen, mapOpen, drawerMode]);

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
      symbolicTargetIdx,
      aiSymbolicGrid,
      layers,
      exploded,
    ]
  );

  const handleFocusToken = useCallback((param: SymbolicParameter | null) => {
    if (param) {
      audioEngineRef.current?.unlock();
    }
    setFocusedParamId(param ? param.id : null);
  }, []);

  const handleResetScene = useCallback(() => {
    setParamValues(defaultParamsFor(sceneId));
    setLayers(SCENES[sceneId].defaultLayers.map((l) => ({ ...l })));
    setExploded(false);
    setAutoDiffPass('idle');
    dustEnergyRef.current.reset();
    if (sceneId === 'calc-optimizers') {
      setOptimizerRunning(false);
      setOptimizerProbes(createInitialOptimizerProbes(landscape));
    }
    managerRef.current?.resetCamera();
  }, [sceneId, landscape]);

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
        const startParams = { ...paramValues };
        const durationMs =
          steadyStrokes || managerRef.current?.isSoftwareMode() ? 0 : 520;

        if (durationMs === 0) {
          setParamValues((prev) => ({ ...prev, ...targetParams }));
        } else {
          const t0 = performance.now();
          const tick = (now: number) => {
            const raw = Math.min(1, (now - t0) / durationMs);
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
      className={`h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-paper)] text-[var(--text-primary)] ${
        ecoMode ? 'eco-mode' : ''
      }`}
      data-scene={sceneId}
      data-theme={theme}
      data-eco={ecoMode ? 'true' : 'false'}
      data-audio={ecoMode ? 'eco-muted' : audioEnabled ? 'on' : 'off'}
      data-intro={introOpen ? 'true' : 'false'}
    >
      <CrayonSvgDefs ecoMode={ecoMode} />

      {/* Calm Top Bar — completely hidden during Fullscreen Theory Introduction */}
      {!introOpen && (
        <TopBar
          activeSceneId={sceneId}
          drawerMode={drawerMode}
          mapOpen={mapOpen}
          theme={theme}
          ecoMode={ecoMode}
          audioEnabled={audioEnabled}
          onToggleMap={() => setMapOpen((v) => !v)}
          onOpenIntro={() => {
            setDrawerMode('closed');
            setMapOpen(false);
            setIntroBeatIdx(0);
            setIntroOpen(true);
          }}
          onToggleInspector={() =>
            setDrawerMode((m) => (m === 'computational' ? 'closed' : 'computational'))
          }
          onToggleTheme={() => setTheme((t) => (t === 'paper' ? 'chalkboard' : 'paper'))}
          onToggleEcoMode={() => setEcoMode((e) => !e)}
          onToggleAudio={() => {
            setAudioEnabled((prev) => {
              const next = !prev;
              audioEngineRef.current?.syncSettings(next, ecoMode);
              if (next && !ecoMode) {
                audioEngineRef.current?.unlock();
                audioEngineRef.current?.playParameterStroke(0.24, theme, performance.now());
              }
              return next;
            });
          }}
        />
      )}

      {/* Protagonist 3D Hand-Painted Sketchbook Canvas (expands to 100% viewport during Intro) */}
      <main className="relative flex-1 min-h-0 w-full overflow-hidden notebook-paper-bg crayon-ink-viewport">
        {/* Isolated WebGL canvas mount wrapped in SketchAnimationWrapper for smooth first-time entrance */}
        <SketchAnimationWrapper sceneKey={sceneId} className={webglLost ? 'hidden' : 'block'}>
          <div
            ref={canvasHostRef}
            data-testid="webgl-viewport"
            className="absolute inset-0 w-full h-full"
          />
        </SketchAnimationWrapper>

        {webglLost && <WebGLFallbackSvg title={sceneMeta.title} theme={theme} />}

        {/* FULLSCREEN ANIMATED THEORY INTRODUCTION (clears entire viewport around the 3D graph) */}
        {introOpen && (
          <LessonIntroPlayer
            intro={LESSON_INTROS[sceneId]}
            beatIndex={introBeatIdx}
            theme={theme}
            onChangeBeat={setIntroBeatIdx}
            onFinish={handleFinishIntro}
          />
        )}

        {/* HANDS-ON PRACTICE HEADER: Minimal direct-on-paper title + single live metric line */}
        {!introOpen && (
          <div className="pointer-events-none absolute top-3 sm:top-4 left-4 sm:left-6 right-4 sm:right-6 z-10 flex items-start justify-between gap-6">
            <div className="max-w-[680px] select-none">
              <h1 className="font-display crayon-ink text-[26px] sm:text-[32px] leading-[1.06] text-[var(--text-primary)]">
                {sceneMeta.title}
              </h1>

              {/* Single calm live reading directly beneath title */}
              <div className="pt-1 flex flex-wrap items-baseline gap-x-2 sm:gap-x-2.5 gap-y-0.5 text-[14px] sm:text-[15.5px] text-[var(--text-secondary)] tabular-nums">
                <span>
                  {liveMetrics.primaryLabel}:{' '}
                  <strong className="font-display text-[18px] sm:text-[20px] font-normal text-[var(--text-primary)]">
                    {liveMetrics.primaryValue}
                  </strong>
                </span>
                <span className="text-[var(--hairline-strong)]" aria-hidden="true">
                  ·
                </span>
                <span>
                  {liveMetrics.secondaryLabel}:{' '}
                  <strong className="font-display text-[18px] sm:text-[20px] font-normal text-[var(--text-primary)]">
                    {liveMetrics.secondaryValue}
                  </strong>
                </span>
                <span className="hidden sm:inline-flex items-baseline gap-2 whitespace-nowrap">
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

            {/* Open top-right paper margin — displays CrayonStamp below the quiet Leyenda toggle */}
            {drawerMode === 'closed' && celebrationStamp && (
              <div className="pointer-events-auto pt-10 select-none">
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

        {/* Non-obtrusive hand-drawn 3D anatomy callouts + quiet top-right "Leyenda" toggle */}
        <ViewportAnnotationsOverlay
          open={legendOpen}
          onToggle={() => setLegendOpen((v) => !v)}
          annotations={projectedAnnotations}
          focusedParamId={focusedParamId}
          theme={theme}
          hidden={introOpen || drawerMode !== 'closed'}
        />

        {/* Clean Slide-Over Drawer (Code Bridge & Adaptive Challenge) — hidden during Intro */}
        {!introOpen && (
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

      {/* Unified Sequential Practice Dock — completely hidden during Fullscreen Theory Intro */}
      {!introOpen && (
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

      {/* Visual Course Index Modal (Hand-Drawn Map + Clean Table of Contents) */}
      <CurriculumMapModal
        open={!introOpen && mapOpen}
        activeSceneId={sceneId}
        bktMap={aiData.bkt}
        completedStepIds={completedStepIds}
        theme={theme}
        onSelectScene={selectScene}
        onClose={() => setMapOpen(false)}
        onResetProgress={() => {
          const fresh = createDefaultPersistedData();
          setAiData(fresh);
          savePersistedAiData(fresh);
          const emptySteps = new Set<string>();
          setCompletedStepIds(emptySteps);
          saveCompletedSteps(emptySteps);
          seenIntrosRef.current = new Set([sceneId]);
          setActiveStepIdx(0);
          setChallengeEval(null);
          setCelebrationStamp(null);
        }}
      />
    </div>
  );
}
