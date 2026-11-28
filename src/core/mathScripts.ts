/**
 * Turns plain-text math in prose ("b^k", "d_k", "log_b(x)", "e^(-x)", "Σ_{i>k}", "∫_a^b") into
 * superscript/subscript segments, so study-plan text reads like math instead of code.
 *
 * Conservative on purpose: a ^ or _ only becomes a script when it is glued to a preceding
 * non-space character and followed by a valid group: (…), {…}, or a run of letters/digits with
 * an optional decimal part ("e^0.5"). A trailing sentence period is never swallowed ("base^k.").
 * Grouping parentheses/braces are dropped from the script; anything else stays literal.
 */
export type ScriptSegment = { kind: 'text'; value: string } | { kind: 'sup' | 'sub'; value: string };

const GROUP = /^(\(([^()]*)\)|\{([^{}]*)\}|([\p{L}\p{N}]+(?:\.\p{N}+)?))/u;

export function splitMathScripts(text: string): ScriptSegment[] {
  const out: ScriptSegment[] = [];
  let buf = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if ((ch === '^' || ch === '_') && i > 0 && !/\s/.test(text[i - 1])) {
      const m = GROUP.exec(text.slice(i + 1));
      if (m) {
        const value = m[2] ?? m[3] ?? m[4] ?? '';
        if (value.length > 0) {
          if (buf) out.push({ kind: 'text', value: buf });
          buf = '';
          out.push({ kind: ch === '^' ? 'sup' : 'sub', value });
          i += 1 + m[0].length;
          continue;
        }
      }
    }
    buf += ch;
    i++;
  }
  if (buf) out.push({ kind: 'text', value: buf });
  return out;
}

/** True when the text contains anything splitMathScripts would turn into a script. */
export function hasMathScripts(text: string): boolean {
  return splitMathScripts(text).some((s) => s.kind !== 'text');
}
