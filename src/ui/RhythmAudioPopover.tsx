import { useEffect, useRef, type ChangeEvent } from 'react';
import {
  STUDY_TRACK_PRESETS,
  type RhythmAudioSnapshot,
  type StudyTrackId,
} from '../audio/rhythmAudioEngine';
import type { ThemeMode } from '../core/types';
import {
  CrayonClose,
  CrayonMusicNote,
  CrayonPause,
  CrayonPlay,
  CrayonUpload,
} from './CrayonIcons';
import { CrayonButton, CrayonSlider, RoughDivider } from './RoughElements';

interface RhythmAudioPopoverProps {
  open: boolean;
  theme: ThemeMode;
  snapshot: RhythmAudioSnapshot;
  onClose: () => void;
  onTogglePlay: () => void;
  onSelectTrack: (trackId: StudyTrackId) => void;
  onUploadFile: (file: File) => void;
  onTapTempo: () => void;
  onChangeVolume: (vol: number) => void;
  onToggleSync: (enabled: boolean) => void;
  onChangeSyncStrength: (strength: number) => void;
  onEnableAudio: () => void;
}

/**
 * Artisanal Sketchbook Popover for Background Study Music & Real-Time Tempo Sync.
 * - Clean unboxed editorial layout (zero pill badges).
 * - Play built-in offline study grooves OR upload any local audio track.
 * - Shows live detected BPM, 4-beat wax pulse dots, and subtle stroke-sync intensity.
 */
export function RhythmAudioPopover({
  open,
  theme,
  snapshot,
  onClose,
  onTogglePlay,
  onSelectTrack,
  onUploadFile,
  onTapTempo,
  onChangeVolume,
  onToggleSync,
  onChangeSyncStrength,
  onEnableAudio,
}: RhythmAudioPopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest('[data-testid="toggle-rhythm-btn"]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isBlocked = snapshot.audioBlockedReason !== null;
  const tempoReady = snapshot.detectedBpm !== null && snapshot.confidence >= 0.35;
  const bpmText =
    snapshot.detectedBpm !== null ? `${Math.round(snapshot.detectedBpm)} BPM` : '— BPM';
  const statusLabel = isBlocked
    ? snapshot.audioBlockedReason === 'eco'
      ? 'Pausado por Modo Eco'
      : 'Audio silenciado'
    : !snapshot.isPlaying && snapshot.sourceMode !== 'tap-tempo'
      ? 'En espera'
      : tempoReady
        ? snapshot.syncEnabled
          ? 'Trazos en sincronía'
          : 'Tempo detectado'
        : 'Escuchando pulso…';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
    e.target.value = '';
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Música de fondo y sincronización de trazos"
      data-testid="rhythm-audio-popover"
      className="fixed top-[54px] sm:top-[60px] right-3 sm:right-6 z-40 w-[330px] max-w-[calc(100vw-24px)] max-h-[calc(100dvh-68px)] overflow-y-auto notebook-scroll bg-[var(--bg-paper)] crayon-ink-panel p-4 shadow-[0_14px_34px_rgba(24,25,29,0.16)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[21px] leading-tight text-[var(--text-primary)] flex items-center gap-1.5">
            <CrayonMusicNote size={17} className="text-[var(--ui-accent)]" />
            <span>Ritmo y Trazos</span>
          </h2>
          <p className="text-[13.5px] text-[var(--text-secondary)] mt-0.5 leading-snug">
            Detecta el tempo musical y sincroniza ligeramente los trazos de crayón 3D.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de ritmo"
          className="p-1.5 -mt-1 -mr-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
        >
          <CrayonClose size={16} />
        </button>
      </div>

      {/* Blocked audio helper notice */}
      {isBlocked && (
        <div className="mt-3 pt-2.5 border-t border-dashed border-[var(--hairline)] flex items-center justify-between gap-2 text-[13.5px]">
          <span className="text-[var(--text-secondary)]">
            {snapshot.audioBlockedReason === 'eco'
              ? 'Desactiva Eco para escuchar música.'
              : 'Activa el sonido para escuchar música.'}
          </span>
          <button
            type="button"
            onClick={onEnableAudio}
            className="text-[var(--ui-accent)] font-display text-[15px] hover:underline cursor-pointer shrink-0"
          >
            Activar
          </button>
        </div>
      )}

      <div className="my-3">
        <RoughDivider theme={theme} seed={211} />
      </div>

      {/* Live Tempo Readout + 4-Beat Wax Pulse Dots (zero pills) */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              data-testid="rhythm-bpm-readout"
              className="font-mono text-[20px] font-semibold tracking-tight text-[var(--text-primary)] tabular-nums"
            >
              {bpmText}
            </span>
            <span className="text-[var(--hairline-strong)]" aria-hidden="true">
              ·
            </span>
            <span
              data-testid="rhythm-status-label"
              className="text-[13.5px] text-[var(--text-secondary)] truncate"
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* 4 handcrafted wax dots breathing with the detected 4/4 beat */}
        <div
          className="flex items-center gap-1.5 shrink-0"
          aria-hidden="true"
          data-testid="rhythm-beat-dots"
        >
          {[0, 1, 2, 3].map((dot) => {
            const isCurrent =
              (snapshot.isPlaying || snapshot.sourceMode === 'tap-tempo') &&
              tempoReady &&
              snapshot.beatIndex === dot;
            const scale = isCurrent ? 1 + snapshot.beatPulse * 0.42 : 0.86;
            const opacity = isCurrent ? 0.55 + snapshot.beatPulse * 0.45 : 0.24;
            return (
              <span
                key={dot}
                className="block w-2.5 h-2.5 rounded-full transition-transform duration-75"
                style={{
                  backgroundColor:
                    dot === 0 ? 'var(--ui-accent)' : 'var(--text-primary)',
                  transform: `scale(${scale.toFixed(2)})`,
                  opacity: Number(opacity.toFixed(2)),
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Primary Transport Row */}
      <div className="mt-3 flex items-center gap-2.5">
        <CrayonButton
          onClick={onTogglePlay}
          crayon={snapshot.isPlaying ? 'sage' : 'cobalt'}
          theme={theme}
          variant={snapshot.isPlaying ? 'filled' : 'sketch'}
          disabled={isBlocked}
          seed={219}
          dataTestId="rhythm-play-btn"
          className="flex-1 justify-center text-[15px] py-1.5"
        >
          {snapshot.isPlaying ? <CrayonPause size={14} /> : <CrayonPlay size={14} />}
          <span>{snapshot.isPlaying ? 'Pausar música' : 'Reproducir'}</span>
        </CrayonButton>

        <button
          type="button"
          data-testid="rhythm-tap-btn"
          onClick={onTapTempo}
          disabled={isBlocked}
          title="Pulsa varias veces al compás de música externa para marcar el ritmo"
          className="px-3 py-1.5 text-[14px] font-display text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-dashed border-[var(--hairline-strong)] rounded-[3px] cursor-pointer disabled:opacity-40 transition-colors"
        >
          Marcar pulso
        </button>
      </div>

      {/* Built-in Study Tracks + Upload Custom Audio */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12.5px] tracking-wide uppercase text-[var(--text-muted)]">
            Pista de estudio
          </span>
          <button
            type="button"
            data-testid="rhythm-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBlocked}
            className="inline-flex items-center gap-1 text-[13.5px] text-[var(--ui-accent)] hover:underline cursor-pointer disabled:opacity-40"
          >
            <CrayonUpload size={13} />
            <span>Subir audio</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Subir archivo de música local"
          />
        </div>

        <div className="space-y-1">
          {STUDY_TRACK_PRESETS.map((preset) => {
            const selected = snapshot.trackId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`rhythm-track-${preset.id}`}
                onClick={() => onSelectTrack(preset.id)}
                className={`w-full text-left px-2.5 py-1.5 rounded-[3px] flex items-baseline justify-between gap-2 cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                    : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
                }`}
              >
                <span
                  className={`font-display text-[16px] inline-flex items-center gap-1.5 ${
                    selected ? 'text-[var(--ui-accent)]' : ''
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full shrink-0 transition-opacity ${
                      selected ? 'bg-[var(--ui-accent)] opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span>{preset.label}</span>
                </span>
                <span className="text-[12.5px] text-[var(--text-muted)]">{preset.subtitle}</span>
              </button>
            );
          })}

          {snapshot.customTrackName && (
            <button
              type="button"
              data-testid="rhythm-track-custom"
              onClick={() => onSelectTrack('custom')}
              className={`w-full text-left px-2.5 py-1.5 rounded-[3px] flex items-baseline justify-between gap-2 cursor-pointer transition-colors ${
                snapshot.trackId === 'custom'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              <span className="font-display text-[16px] truncate inline-flex items-center gap-1.5 text-[var(--ui-accent)]">
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    snapshot.trackId === 'custom' ? 'bg-[var(--ui-accent)] opacity-100' : 'opacity-0'
                  }`}
                />
                <span className="truncate">{snapshot.customTrackName}</span>
              </span>
              <span className="text-[12.5px] text-[var(--text-muted)] shrink-0">Archivo local</span>
            </button>
          )}
        </div>

        {snapshot.errorMessage && (
          <p className="mt-1.5 text-[12.5px] text-[var(--crayon-vermilion)]">
            {snapshot.errorMessage}
          </p>
        )}
      </div>

      <div className="my-3">
        <RoughDivider theme={theme} seed={227} />
      </div>

      {/* Sliders: Music Volume + Subtle Crayon-Sync Strength */}
      <div className="space-y-2.5">
        <div>
          <div className="flex items-center justify-between text-[13.5px] mb-0.5">
            <span className="text-[var(--text-secondary)]">Volumen de música</span>
            <span className="font-mono text-[12.5px] text-[var(--text-muted)] tabular-nums">
              {Math.round(snapshot.musicVolume * 100)}%
            </span>
          </div>
          <CrayonSlider
            value={snapshot.musicVolume}
            min={0.05}
            max={1}
            step={0.05}
            crayon="cobalt"
            theme={theme}
            seed={233}
            ariaLabel="Volumen de música de fondo"
            onChange={onChangeVolume}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[13.5px] mb-0.5">
            <label className="inline-flex items-center gap-1.5 text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                data-testid="rhythm-sync-toggle"
                checked={snapshot.syncEnabled}
                onChange={(e) => onToggleSync(e.target.checked)}
                className="accent-[var(--ui-accent)] cursor-pointer"
              />
              <span>Sincronizar trazos de crayón</span>
            </label>
            <span className="font-mono text-[12.5px] text-[var(--text-muted)] tabular-nums">
              {snapshot.syncEnabled ? `${Math.round(snapshot.syncStrength * 100)}%` : 'Off'}
            </span>
          </div>
          <CrayonSlider
            value={snapshot.syncStrength}
            min={0}
            max={1}
            step={0.05}
            crayon="sage"
            theme={theme}
            seed={241}
            ariaLabel="Intensidad de sincronización rítmica de trazos"
            onChange={(val) => {
              if (!snapshot.syncEnabled && val > 0) onToggleSync(true);
              onChangeSyncStrength(val);
            }}
          />
        </div>
      </div>
    </div>
  );
}
