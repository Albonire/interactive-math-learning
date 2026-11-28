/**
 * Python lab sheet (chapter IV): the module's snippet on its own sheet of lab paper (no notebook
 * grid behind the code), editable, runnable in the browser and resettable.
 *
 * Edits are kept per module in localStorage so a learner can come back to their experiment;
 * "Restaurar" brings the original back. Output is shown on a separate slip with clean tracebacks
 * and a hint for common errors.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { capOutput, cleanTraceback, errorHint, insertIndent, preRunWarnings } from '../lab/pythonOutput';
import { isPythonWarm, runPython, type RunResult } from '../lab/pythonRunner';
import type { StudyModuleId } from '../core/studyPlanTypes';

interface Props {
  moduleId: StudyModuleId;
  original: string;
  /** Called after a run that finished without errors. */
  onRunSuccess?: () => void;
}

const storageKey = (id: StudyModuleId) => `bibifold_lab_code_v1:${id}`;

function loadEdit(id: StudyModuleId, original: string): string {
  try {
    return window.localStorage.getItem(storageKey(id)) ?? original;
  } catch {
    return original;
  }
}

function saveEdit(id: StudyModuleId, code: string, original: string): void {
  try {
    if (code === original) window.localStorage.removeItem(storageKey(id));
    else window.localStorage.setItem(storageKey(id), code);
  } catch {
    // Storage blocked: the edit simply is not remembered.
  }
}

type Phase = 'idle' | 'loading' | 'running' | 'done';

export function PythonLab({ moduleId, original, onRunSuccess }: Props) {
  const [code, setCode] = useState(() => loadEdit(moduleId, original));
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RunResult | null>(null);
  const [copied, setCopied] = useState(false);
  const runToken = useRef(0);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // New module: load its code (or the learner's saved edit) and forget the old output.
  useEffect(() => {
    runToken.current++;
    setCode(loadEdit(moduleId, original));
    setResult(null);
    setPhase('idle');
  }, [moduleId, original]);

  useEffect(() => {
    saveEdit(moduleId, code, original);
  }, [moduleId, code, original]);

  const lines = useMemo(() => code.split('\n').length, [code]);
  const warnings = useMemo(() => preRunWarnings(code), [code]);
  const edited = code !== original;
  const busy = phase === 'loading' || phase === 'running';

  const run = async () => {
    if (busy) return;
    const token = ++runToken.current;
    setResult(null);
    setPhase(isPythonWarm() ? 'running' : 'loading');
    const res = await runPython(code, (s) => {
      if (token === runToken.current) setPhase(s);
    });
    if (token !== runToken.current) return; // module changed or a newer run started
    setResult(res);
    setPhase('done');
    if (res.ok) onRunSuccess?.();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void run();
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const ta = e.currentTarget;
      const next = insertIndent(code, ta.selectionStart, ta.selectionEnd);
      setCode(next.text);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = next.caret;
      });
    }
  };

  const copy = () => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const fileName = `${moduleId.toLowerCase()}_laboratorio.py`;
  const errText = result && !result.ok ? (result.kind === 'python' ? cleanTraceback(result.error) : result.error) : '';
  const hint = result && !result.ok && result.kind === 'python' ? errorHint(errText) : null;

  return (
    <div className="lab-sheet space-y-0" data-testid="python-lab">
      {/* File tab */}
      <div className="lab-sheet-head flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono-math text-[13px] text-[var(--text-primary)] truncate">{fileName}</span>
          {edited && <span className="font-hand text-[13px] text-[var(--ui-warning)]">· editado</span>}
        </div>
        <div className="flex items-center gap-2">
          {edited && (
            <button
              type="button"
              onClick={() => setCode(original)}
              className="sketch-btn px-2.5 py-1 text-[13.5px] font-hand text-[var(--text-secondary)] cursor-pointer"
            >
              Restaurar
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="sketch-btn px-2.5 py-1 text-[13.5px] font-hand text-[var(--text-secondary)] cursor-pointer"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            data-testid="python-run"
            data-tone="success"
            title="Ejecutar (Ctrl + Enter)"
            className="sketch-btn px-3 py-1 text-[14.5px] font-display text-[var(--ui-success)] cursor-pointer disabled:opacity-60"
          >
            {phase === 'loading' ? 'Preparando Python…' : phase === 'running' ? 'Ejecutando…' : 'Ejecutar ▸'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="lab-sheet-body flex">
        <div
          aria-hidden="true"
          className="select-none shrink-0 w-[2.75rem] text-right pr-2.5 py-3 font-mono-math text-[12px] leading-[22px] text-[var(--text-muted)] opacity-70"
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={`Código Python de ${moduleId}. Ctrl + Enter para ejecutar.`}
          data-testid="python-editor"
          rows={lines}
          wrap="off"
          className="lab-editor flex-1 min-w-0 resize-none bg-transparent py-3 pr-4 pl-3 font-mono-math text-[12.5px] sm:text-[13.5px] leading-[22px] text-[var(--text-primary)] outline-none overflow-x-auto"
        />
      </div>

      {warnings.length > 0 && (
        <ul className="px-4 py-2 text-[13.5px] font-hand text-[var(--ui-warning)] space-y-0.5">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {/* Output slip */}
      {(busy || result) && (
        <div className="lab-output px-4 py-3 space-y-1.5" role="status" aria-live="polite" data-testid="python-output">
          <div className="flex items-center justify-between gap-2 font-hand text-[13.5px] text-[var(--text-muted)]">
            <span>Salida</span>
            {result && <span className="font-mono-math text-[12px]">{result.ms} ms</span>}
          </div>
          {phase === 'loading' && (
            <p className="font-hand text-[14.5px] text-[var(--text-secondary)]">
              Descargando el intérprete de Python (solo la primera vez, unos segundos)…
            </p>
          )}
          {result && (result.stdout || result.stderr) && (
            <pre className="font-mono-math text-[12.5px] leading-[20px] whitespace-pre-wrap text-[var(--text-primary)]">
              {capOutput(`${result.stdout}${result.stderr}`)}
            </pre>
          )}
          {result?.ok && !result.stdout && !result.stderr && (
            <p className="font-hand text-[14px] text-[var(--text-muted)]">Se ejecutó sin imprimir nada. Añade un print() para ver resultados.</p>
          )}
          {result && !result.ok && (
            <div className="space-y-1">
              <pre className="font-mono-math text-[12.5px] leading-[20px] whitespace-pre-wrap text-[var(--crayon-vermilion,#c2452d)]" data-testid="python-error">
                {capOutput(errText, 4000)}
              </pre>
              {hint && <p className="font-hand text-[14.5px] text-[var(--text-secondary)]">{hint}</p>}
              {result.kind === 'network' && (
                <p className="font-hand text-[14.5px] text-[var(--text-secondary)]">
                  No se pudo descargar Python. Revisa la conexión y vuelve a pulsar Ejecutar.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
