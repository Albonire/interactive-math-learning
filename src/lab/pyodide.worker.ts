/// <reference lib="webworker" />
/**
 * Classic Web Worker that runs learner Python with Pyodide, off the main thread so an endless
 * loop never freezes the page (the main thread terminates this worker on timeout).
 * Pyodide (~10 MB) is fetched from the CDN only on the first run.
 */
// No imports here: in development Vite serves this as a classic worker script, where `import`
// is a syntax error. Keep in sync with MAX_OUTPUT_CHARS in pythonOutput.ts (checked by a test).
const WORKER_MAX_OUTPUT_CHARS = 12_000;

declare function importScripts(...urls: string[]): void;
declare function loadPyodide(options: { indexURL: string }): Promise<PyodideLike>;

interface PyodideLike {
  setStdout(o: { batched: (s: string) => void }): void;
  setStderr(o: { batched: (s: string) => void }): void;
  runPythonAsync(code: string, options?: { globals?: unknown }): Promise<unknown>;
  globals: { get(name: string): () => { destroy(): void } };
}

const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';

let pyodidePromise: Promise<PyodideLike> | null = null;

function getPyodide(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);
      return loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    })();
    // A failed download must not poison every later attempt.
    pyodidePromise.catch(() => {
      pyodidePromise = null;
    });
  }
  return pyodidePromise;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<{ id: number; code: string }>) => {
  const { id, code } = e.data;
  let stage: 'load' | 'run' = 'load';
  try {
    if (!pyodidePromise) ctx.postMessage({ id, type: 'status', status: 'loading' });
    const py = await getPyodide();
    stage = 'run';
    ctx.postMessage({ id, type: 'status', status: 'running' });
    let stdout = '';
    let stderr = '';
    const add = (cur: string, s: string) => (cur.length > WORKER_MAX_OUTPUT_CHARS * 1.2 ? cur : `${cur}${s}\n`);
    py.setStdout({ batched: (s) => (stdout = add(stdout, s)) });
    py.setStderr({ batched: (s) => (stderr = add(stderr, s)) });
    // Fresh namespace per run: earlier runs never leak variables into this one.
    const globals = py.globals.get('dict')();
    const t0 = performance.now();
    try {
      await py.runPythonAsync(code, { globals });
      ctx.postMessage({ id, type: 'result', ok: true, stdout, stderr, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      ctx.postMessage({
        id,
        type: 'result',
        ok: false,
        kind: 'python',
        stdout,
        stderr,
        error: err instanceof Error ? err.message : String(err),
        ms: Math.round(performance.now() - t0),
      });
    } finally {
      globals.destroy();
    }
  } catch (err) {
    ctx.postMessage({
      id,
      type: 'result',
      ok: false,
      kind: stage === 'load' ? 'network' : 'python',
      stdout: '',
      stderr: '',
      error: err instanceof Error ? err.message : String(err),
      ms: 0,
    });
  }
};
