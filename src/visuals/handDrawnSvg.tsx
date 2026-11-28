/**
 * Hand-drawn rendering layer for every module diagram.
 *
 * The 32 module visuals are written with plain SVG primitives (<line>, <circle>, <rect>, ...),
 * which render as perfect geometry. Instead of rewriting each visual, `handifySvgTree` walks the
 * React element tree a visual hands to VisualStageCard and swaps each intrinsic primitive for
 * <HandShape>, which:
 *
 *  1. keeps the original element (same props, events, markers and fill) but makes its stroke
 *     transparent, so hit areas, z-order and exact geometry are untouched;
 *  2. draws the stroke on top as a double-pass Rough.js crayon line (pointer-events: none);
 *  3. adds light crayon hatching over translucent fills, like shading with the side of a crayon.
 *
 * Randomness is seeded by the element's position in the tree, not by its geometry, so a line
 * being dragged keeps the same hand (no "boiling" while it moves).
 *
 * Opt out on any element with the attribute `data-crisp` (e.g. a pixel-exact grid).
 */
import {
  Children,
  cloneElement,
  createElement,
  isValidElement,
  memo,
  type ReactElement,
  type ReactNode,
} from 'react';
import rough from 'roughjs';

const generator = rough.generator();

type Primitive = 'line' | 'circle' | 'ellipse' | 'rect' | 'path' | 'polyline' | 'polygon';
const PRIMITIVES = new Set<Primitive>(['line', 'circle', 'ellipse', 'rect', 'path', 'polyline', 'polygon']);

type AnyProps = Record<string, unknown>;

const num = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

export function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Rough.js expects a positive 31-bit integer seed.
  return (h >>> 1) % 2147483646 + 1;
}

/**
 * Splits a fill colour into its opaque base and its alpha. Handles #rgb, #rrggbb, #rrggbbaa
 * (the visuals write translucent fills as `${color}22`) plus fillOpacity.
 */
export function parseFill(fill: unknown, fillOpacity: unknown): { base: string | null; alpha: number } {
  if (typeof fill !== 'string' || fill === 'none' || fill === 'transparent') return { base: null, alpha: 0 };
  const op = fillOpacity === undefined ? 1 : num(fillOpacity, 1);
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(fill.trim());
  if (m) {
    const a = m[2] ? Number.parseInt(m[2], 16) / 255 : 1;
    return { base: `#${m[1]}`, alpha: a * op };
  }
  return { base: fill, alpha: op };
}

/** Rough.js drawable for one primitive, or null when there is nothing to draw. */
function roughDrawable(
  type: Primitive,
  p: AnyProps,
  opts: Parameters<typeof generator.line>[4]
) {
  switch (type) {
    case 'line':
      return generator.line(num(p.x1), num(p.y1), num(p.x2), num(p.y2), opts);
    case 'circle': {
      const r = num(p.r);
      return r > 0 ? generator.circle(num(p.cx), num(p.cy), r * 2, opts) : null;
    }
    case 'ellipse': {
      const rx = num(p.rx);
      const ry = num(p.ry);
      return rx > 0 && ry > 0 ? generator.ellipse(num(p.cx), num(p.cy), rx * 2, ry * 2, opts) : null;
    }
    case 'rect': {
      const w = num(p.width);
      const h = num(p.height);
      return w > 0 && h > 0 ? generator.rectangle(num(p.x), num(p.y), w, h, opts) : null;
    }
    case 'path':
      return typeof p.d === 'string' && p.d.trim() ? generator.path(p.d, opts) : null;
    case 'polyline':
    case 'polygon': {
      if (typeof p.points !== 'string') return null;
      const nums = p.points.trim().split(/[\s,]+/).map(Number);
      const pts: Array<[number, number]> = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
      if (pts.length < 2) return null;
      return type === 'polygon' ? generator.polygon(pts, opts) : generator.linearPath(pts, opts);
    }
  }
}

interface HandShapeProps {
  type: Primitive;
  seedKey: string;
  shape: AnyProps;
}

/** One primitive, redrawn by hand. Memoized: same props, same strokes. */
export const HandShape = memo(function HandShape({ type, seedKey, shape }: HandShapeProps) {
  const stroke = shape.stroke;
  const hasStroke = typeof stroke === 'string' && stroke !== 'none' && stroke !== 'transparent';
  const sw = num(shape.strokeWidth, 1);
  const seed = hashSeed(seedKey);
  const { base: fillBase, alpha: fillAlpha } = parseFill(shape.fill, shape.fillOpacity);

  // Curves carry math (function plots), so they wobble less than straight construction lines.
  const isCurve = type === 'path' || type === 'polyline';
  const small = type === 'circle' && num(shape.r) < 9;

  const strokePaths = hasStroke
    ? (() => {
        const d = roughDrawable(type, shape, {
          seed,
          roughness: isCurve ? 0.55 : small ? 0.6 : 1.05,
          bowing: isCurve ? 0.4 : 1.1,
          stroke: stroke as string,
          strokeWidth: Math.max(0.8, sw * 0.82),
          disableMultiStroke: sw < 1.1,
          preserveVertices: isCurve,
          curveStepCount: 7,
        });
        return d ? generator.toPaths(d) : [];
      })()
    : [];

  // Shading for light, translucent areas (bands, regions, Venn sets): crayon hatching.
  const hatch =
    fillBase && fillAlpha > 0.02 && fillAlpha < 0.6 && type !== 'path' && type !== 'line'
      ? (() => {
          const d = roughDrawable(type, shape, {
            seed: seed + 7,
            roughness: 1.2,
            stroke: 'none',
            fill: fillBase,
            fillStyle: 'hachure',
            hachureAngle: -41 + (seed % 9),
            hachureGap: Math.max(5, Math.min(9, 5 + sw * 1.5)),
            fillWeight: 1.1,
          });
          return d ? generator.toPaths(d) : [];
        })()
      : [];

  // The original element keeps fill, events, markers and its exact geometry; its stroke goes
  // transparent (not none) so thin lines keep their pointer hit area.
  const original = createElement(type, {
    ...shape,
    stroke: hasStroke ? 'transparent' : shape.stroke,
  });

  const overlayStyle = {
    pointerEvents: 'none' as const,
    opacity: shape.opacity as number | undefined,
  };

  return (
    <>
      {original}
      {(hatch.length > 0 || strokePaths.length > 0) && (
        <g
          className="hand-ink"
          style={overlayStyle}
          transform={typeof shape.transform === 'string' ? shape.transform : undefined}
          strokeDasharray={shape.strokeDasharray as string | undefined}
          strokeOpacity={shape.strokeOpacity as number | undefined}
          aria-hidden="true"
        >
          {hatch.map((pp, i) => (
            <path
              key={`h${i}`}
              d={pp.d}
              fill="none"
              stroke={fillBase ?? undefined}
              strokeWidth={0.9}
              strokeOpacity={Math.min(0.55, 0.18 + fillAlpha * 1.6)}
              strokeLinecap="round"
            />
          ))}
          {strokePaths.map((pp, i) => (
            <path
              key={`s${i}`}
              d={pp.d}
              fill="none"
              stroke={pp.stroke}
              strokeWidth={pp.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}
    </>
  );
});

/**
 * Recursively replaces intrinsic SVG primitives in a React element tree with <HandShape>.
 * Custom components (e.g. drag handles) are left alone; only what the visual wrote inline is
 * redrawn. `<text>` and HTML are never touched.
 */
export function handifySvgTree(node: ReactNode, path = 'r', insideSvg = false): ReactNode {
  return Children.map(node, (child, index) => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<AnyProps>;
    const childPath = `${path}.${el.key ?? index}`;
    if (typeof el.type !== 'string') return el;
    const type = el.type;
    const props = el.props;

    if (insideSvg && PRIMITIVES.has(type as Primitive) && props['data-crisp'] === undefined) {
      return <HandShape key={el.key ?? undefined} type={type as Primitive} seedKey={childPath} shape={props} />;
    }
    if (type === 'text' || type === 'defs' || type === 'marker' || type === 'foreignObject' || type === 'clipPath') {
      return el;
    }
    if (props.children === undefined) return el;
    const nowInSvg = insideSvg || type === 'svg';
    return cloneElement(el, undefined, handifySvgTree(props.children as ReactNode, childPath, nowInSvg));
  });
}
