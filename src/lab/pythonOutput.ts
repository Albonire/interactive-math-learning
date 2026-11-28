/**
 * Pure helpers for the in-browser Python lab (no DOM, no Pyodide): output capping, traceback
 * cleanup and pre-run warnings. Kept separate so the edge cases are unit-tested.
 */

export const MAX_OUTPUT_CHARS = 12_000;
export const RUN_TIMEOUT_MS = 10_000;

/** Caps output so a runaway print loop cannot freeze the page; says how much was cut. */
export function capOutput(text: string, max = MAX_OUTPUT_CHARS): string {
  if (text.length <= max) return text;
  const cut = text.length - max;
  return `${text.slice(0, max)}\n… (${cut.toLocaleString('es')} caracteres más se omitieron)`;
}

/**
 * Pyodide tracebacks include frames from its own runtime (/lib/python3.x/..., _pyodide, eval_code).
 * Learners only need the frames from their own code (File "<exec>") and the final error line.
 */
export function cleanTraceback(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').trimEnd().split('\n');
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const frame = /^\s*File "([^"]+)"/.exec(line);
    if (frame) {
      skipping = frame[1] !== '<exec>';
      if (!skipping) out.push(line.replace('"<exec>"', '"tu código"'));
      continue;
    }
    if (skipping && /^\s{4,}/.test(line)) continue;
    skipping = false;
    out.push(line);
  }
  return out.join('\n');
}

/** Short Spanish hint for the most common errors a learner hits. */
export function errorHint(cleaned: string): string | null {
  const last = cleaned.trim().split('\n').pop() ?? '';
  if (last.startsWith('SyntaxError')) return 'Revisa paréntesis, dos puntos al final de def/if/for y comillas sin cerrar.';
  if (last.startsWith('IndentationError')) return 'Python usa la sangría para agrupar: alinea los bloques con 4 espacios.';
  if (last.startsWith('NameError')) return 'Usas un nombre que no está definido: ¿un error de escritura o falta ejecutar una línea anterior?';
  if (last.startsWith('ZeroDivisionError')) return 'Dividiste entre cero: revisa el denominador.';
  if (last.startsWith('TypeError')) return 'Mezclas tipos que no combinan (por ejemplo, texto + número).';
  if (last.startsWith('IndexError')) return 'Accedes a una posición que la lista no tiene: recuerda que empieza en 0.';
  if (last.startsWith('RecursionError')) return 'La recursión no termina: ¿falta un caso base?';
  return null;
}

/** Warnings shown before running: features the in-browser runtime does not support. */
export function preRunWarnings(code: string): string[] {
  const w: string[] = [];
  if (/\binput\s*\(/.test(code)) w.push('input() no está disponible aquí: asigna el valor directamente en una variable.');
  if (/^\s*(import|from)\s+(matplotlib|numpy|pandas|scipy)\b/m.test(code)) {
    w.push('Este laboratorio ejecuta Python estándar; numpy, pandas, scipy y matplotlib no se cargan.');
  }
  return w;
}

/** Inserts four spaces at the caret (Tab key in the editor), returning the new text and caret. */
export function insertIndent(text: string, selStart: number, selEnd: number): { text: string; caret: number } {
  const indent = '    ';
  return { text: text.slice(0, selStart) + indent + text.slice(selEnd), caret: selStart + indent.length };
}
