/**
 * Main-thread side of the Python lab. One shared worker; each run has an id so a result that
 * arrives after the learner switched module or pressed Run again is ignored. A run that exceeds
 * the time limit terminates the worker (the only way to stop an endless loop) and a fresh one
 * is created next time.
 */
import { RUN_TIMEOUT_MS } from './pythonOutput';

export type RunStatus = 'loading' | 'running';

export type RunResult =
  | { ok: true; stdout: string; stderr: string; ms: number }
  | { ok: false; kind: 'python' | 'network' | 'timeout'; stdout: string; stderr: string; error: string; ms: number };

let worker: Worker | null = null;
let nextId = 1;
let warm = false;

function getWorker(): Worker {
  if (!worker) worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url));
  return worker;
}

/** True once Pyodide has loaded in the current worker (the next run starts fast). */
export function isPythonWarm(): boolean {
  return warm;
}

export function runPython(
  code: string,
  onStatus: (s: RunStatus) => void,
  timeoutMs = RUN_TIMEOUT_MS
): Promise<RunResult> {
  const w = getWorker();
  const id = nextId++;
  return new Promise<RunResult>((resolve) => {
    let timer = 0;
    // The time limit only starts once the code is actually running, so a slow first download
    // of Pyodide is never mistaken for an endless loop.
    const armTimeout = () => {
      timer = window.setTimeout(() => {
        cleanup();
        w.terminate();
        worker = null;
        warm = false;
        resolve({
          ok: false,
          kind: 'timeout',
          stdout: '',
          stderr: '',
          error: `Se detuvo tras ${Math.round(timeoutMs / 1000)} s: ¿un bucle que no termina?`,
          ms: timeoutMs,
        });
      }, timeoutMs);
    };
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { id: number; type: string; status?: RunStatus } & Partial<RunResult>;
      if (data.id !== id) return;
      if (data.type === 'status' && data.status) {
        onStatus(data.status);
        if (data.status === 'running') {
          warm = true;
          armTimeout();
        }
        return;
      }
      if (data.type === 'result') {
        cleanup();
        resolve(data as unknown as RunResult);
      }
    };
    const onError = (e: ErrorEvent) => {
      cleanup();
      worker?.terminate();
      worker = null;
      warm = false;
      resolve({ ok: false, kind: 'network', stdout: '', stderr: '', error: e.message || 'El entorno de Python no pudo iniciarse.', ms: 0 });
    };
    function cleanup() {
      window.clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
    }
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    w.postMessage({ id, code });
  });
}
