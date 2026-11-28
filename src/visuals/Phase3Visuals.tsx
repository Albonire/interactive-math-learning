import { useRef, useState } from 'react';
import {
  ActionBtn,
  DiagramDragHandle,
  InkScrubNumber,
  ParamSlider,
  VisualModeTabs,
  VisualStageCard,
  clientToSvgPoint,
  useDiagramDrag,
  useVisualPalette,
  type ModuleVisualProps,
} from './VisualHelpers';

const snapTo = (v: number, step: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(v / step) * step));

/* ── M13: Límites y Continuidad ───────────────────────────────────────────── */
export function M13Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [eps, setEps] = useState(0.8);
  const [delta, setDelta] = useState(0.5);
  const [kind, setKind] = useState<'cont' | 'hole' | 'jump'>('cont');

  // Function near a = 1: f(x) = 0.5*x^2 + 0.5 (L = 1 at a = 1)
  const f = (x: number) => {
    if (kind === 'jump') return x < 1 ? 0.6 : 1.5;
    return 0.5 * x * x + 0.5;
  };
  const L = 1.0;
  const a = 1.0;
  let insideBand = true;
  for (let i = -20; i <= 20; i++) {
    if (i === 0) continue;
    const x = a + (i / 20) * delta;
    if (Math.abs(f(x) - L) > eps) {
      insideBand = false;
      break;
    }
  }

  const mapX = (x: number) => 60 + ((x + 0.5) / 3) * 460;
  const mapY = (y: number) => 185 - (y / 2.6) * 165;
  const invX = (sx: number) => ((sx - 60) / 460) * 3 - 0.5;
  const invY = (sy: number) => ((185 - sy) / 165) * 2.6;
  const setEpsSafe = (v: number) => setEps(snapTo(v, 0.05, 0.15, 1.0));
  const setDeltaSafe = (v: number) => setDelta(snapTo(v, 0.05, 0.05, 0.9));
  // Direct manipulation: the challenger drags the ε band edge, you answer by dragging the δ edge.
  const drag = useDiagramDrag<'eps' | 'delta'>((key, pt) => {
    if (key === 'eps') setEpsSafe(invY(pt.y) - L);
    else setDeltaSafe(invX(pt.x) - a);
  });

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn active={kind === 'cont'} onClick={() => setKind('cont')}>Continua</ActionBtn>
            <ActionBtn active={kind === 'hole'} onClick={() => setKind('hole')}>Hueco removible</ActionBtn>
            <ActionBtn active={kind === 'jump'} onClick={() => setKind('jump')}>Salto (sin límite)</ActionBtn>
          </div>
          <span className="font-hand text-[14px] text-[var(--text-secondary)]">
            Arrastra el borde de la banda <strong style={{ color: p.sage }}>ε = {eps.toFixed(2)}</strong> y responde
            moviendo tu ventana <strong style={{ color: insideBand ? p.cobalt : p.vermilion }}>δ = {delta.toFixed(2)}</strong>.
          </span>
        </>
      }
      caption={
        kind === 'jump'
          ? '⚡ Discontinuidad de salto: por pequeño que hagas δ, los límites laterales (0.6 y 1.5) no coinciden.'
          : insideBand
            ? `✓ ¡Banda superada! Para 0 < |x − 1| < ${delta.toFixed(2)}, toda la curva queda dentro de |f(x) − 1| < ${eps.toFixed(2)}.`
            : // |f(x) − 1| = ½|x − 1||x + 1| < ε holds for every |x − 1| < δ iff δ ≤ √(1 + 2ε) − 1.
              `✗ La curva escapa de la banda ε = ${eps.toFixed(2)}. Funciona cualquier δ ≤ √(1 + 2ε) − 1 ≈ ${(Math.sqrt(1 + 2 * eps) - 1).toFixed(3)}.`
      }
    >
      <svg viewBox="0 0 560 210" className="w-full h-auto max-h-[230px]" {...drag.svgProps}>
        {/* Epsilon horizontal band */}
        <rect
          x="40"
          y={mapY(L + eps)}
          width="480"
          height={mapY(L - eps) - mapY(L + eps)}
          fill={`${p.sage}22`}
          stroke={p.sage}
          strokeDasharray="4 3"
          strokeWidth="1.2"
        />
        {/* Delta vertical band */}
        <rect
          x={mapX(a - delta)}
          y="16"
          width={mapX(a + delta) - mapX(a - delta)}
          height="172"
          fill={`${insideBand ? p.cobalt : p.vermilion}1A`}
          stroke={insideBand ? p.cobalt : p.vermilion}
          strokeDasharray="4 3"
          strokeWidth="1.4"
        />
        <line x1="40" y1={mapY(0)} x2="520" y2={mapY(0)} stroke={p.grid} strokeWidth="1.4" />
        <line x1={mapX(0)} y1="15" x2={mapX(0)} y2="195" stroke={p.grid} strokeWidth="1.4" />

        {kind === 'jump' ? (
          <>
            <line x1={mapX(-0.4)} y1={mapY(0.6)} x2={mapX(1)} y2={mapY(0.6)} stroke={p.cobalt} strokeWidth="2.6" />
            <line x1={mapX(1)} y1={mapY(1.5)} x2={mapX(2.4)} y2={mapY(1.5)} stroke={p.cobalt} strokeWidth="2.6" />
            <circle cx={mapX(1)} cy={mapY(0.6)} r="4.5" fill={p.bg} stroke={p.cobalt} strokeWidth="2" />
            <circle cx={mapX(1)} cy={mapY(1.5)} r="4.5" fill={p.cobalt} />
          </>
        ) : (
          <>
            <path
              d={Array.from({ length: 61 }, (_, i) => {
                const x = -0.3 + i * 0.045;
                return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(f(x))}`;
              }).join(' ')}
              fill="none"
              stroke={p.cobalt}
              strokeWidth="2.6"
            />
            {kind === 'hole' ? (
              <>
                <circle cx={mapX(1)} cy={mapY(1)} r="5" fill={p.bg} stroke={p.vermilion} strokeWidth="2.2" />
                <circle cx={mapX(1)} cy={mapY(1.9)} r="4.5" fill={p.vermilion} />
              </>
            ) : (
              <circle cx={mapX(1)} cy={mapY(1)} r="5" fill={p.sage} />
            )}
          </>
        )}

        <text x="524" y={mapY(L) + 4} fontSize="11" fill={p.sage} fontFamily="monospace">L±ε</text>
        <text x={mapX(a)} y="202" textAnchor="middle" fontSize="11" fill={p.cobalt} fontFamily="monospace">a±δ</text>

        <DiagramDragHandle
          cx={500}
          cy={mapY(L + eps)}
          color={p.sage}
          paperBg={p.bg}
          label="Borde de la banda ε (arrastra en vertical)"
          valueText={`ε = ${eps.toFixed(2)}`}
          onKeyStep={(_, dy) => setEpsSafe(eps + dy * 0.05)}
          {...drag.bind('eps')}
        />
        <DiagramDragHandle
          cx={mapX(a + delta)}
          cy={30}
          color={insideBand ? p.cobalt : p.vermilion}
          paperBg={p.bg}
          label="Borde de la ventana δ (arrastra en horizontal)"
          valueText={`δ = ${delta.toFixed(2)}`}
          onKeyStep={(dx) => setDeltaSafe(delta + dx * 0.05)}
          {...drag.bind('delta')}
        />
      </svg>
    </VisualStageCard>
  );
}

/* ── M14: Derivadas y Aplicaciones ────────────────────────────────────────── */
export function M14Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'secant' | 'newton'>('secant');
  const [x0, setX0] = useState(0.8);
  const [h, setH] = useState(0.9);
  const [dragPt, setDragPt] = useState<'x0' | 'xh' | null>(null);
  const secSvgRef = useRef<SVGSVGElement | null>(null);
  const [newtonStep, setNewtonStep] = useState(2);

  // f(x) = x^3/3 - x + 1
  const f = (x: number) => (x * x * x) / 3 - x + 1;
  const df = (x: number) => x * x - 1;
  const secSlope = (f(x0 + h) - f(x0)) / h;
  const tanSlope = df(x0);

  // Newton iterations for g(x) = x^2 - 2 starting at x = 2.5
  const nPts = [2.5];
  for (let i = 0; i < 4; i++) {
    const prev = nPts[nPts.length - 1];
    nPts.push(prev - (prev * prev - 2) / (2 * prev));
  }

  const mapX = (x: number) => 280 + x * 95;
  const mapY = (y: number) => 145 - y * 48;

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'secant', label: 'Secante → Tangente (h → 0)' },
          { id: 'newton', label: 'Iteraciones de Newton-Raphson' },
        ]}
      />

      {tab === 'secant' && (
        <VisualStageCard
          controls={
            <>
              <InkScrubNumber label="Punto x₀:" value={x0} min={-1.5} max={1.6} step={0.1} displayValue={x0.toFixed(1)} crayon="sage" onChange={setX0} />
              <InkScrubNumber label="Incremento h:" value={h} min={0.05} max={1.2} step={0.05} displayValue={h.toFixed(2)} crayon="vermilion" onChange={setH} />
              <span className="font-hand text-[14px] text-[var(--text-muted)]">
                Arrastra x₀ o x₀+h directamente sobre la curva
              </span>
            </>
          }
          caption={`Pendiente secante = ${secSlope.toFixed(3)} → Derivada exacta f'(${x0.toFixed(1)}) = ${tanSlope.toFixed(3)}. Cuando f'(x)=0 (±1) aparecen extremos locales.`}
        >
          <svg
            ref={secSvgRef}
            viewBox="0 0 560 215"
            className="w-full h-auto max-h-[240px] select-none"
            onPointerMove={(e) => {
              if (!dragPt || !secSvgRef.current) return;
              const pt = clientToSvgPoint(secSvgRef.current, e.clientX, e.clientY);
              const xVal = (pt.x - 280) / 95;
              if (dragPt === 'x0') {
                setX0(Math.round(Math.max(-1.5, Math.min(1.6, xVal)) * 20) / 20);
              } else {
                const nextH = Math.max(0.05, Math.min(1.2, xVal - x0));
                setH(Math.round(nextH * 20) / 20);
              }
            }}
            onPointerUp={() => setDragPt(null)}
            onPointerCancel={() => setDragPt(null)}
          >
            <line x1="20" y1={mapY(0)} x2="540" y2={mapY(0)} stroke={p.grid} strokeWidth="1.3" />
            <line x1={mapX(0)} y1="15" x2={mapX(0)} y2="200" stroke={p.grid} strokeWidth="1.3" />
            <path
              d={Array.from({ length: 65 }, (_, i) => {
                const x = -2.2 + i * 0.07;
                return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(f(x))}`;
              }).join(' ')}
              fill="none"
              stroke={p.cobalt}
              strokeWidth="2.5"
            />
            {/* Exact tangent */}
            <line
              x1={mapX(x0 - 1.1)}
              y1={mapY(f(x0) - 1.1 * tanSlope)}
              x2={mapX(x0 + 1.1)}
              y2={mapY(f(x0) + 1.1 * tanSlope)}
              stroke={p.sage}
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            {/* Secant */}
            <line
              x1={mapX(x0 - 0.5)}
              y1={mapY(f(x0) - 0.5 * secSlope)}
              x2={mapX(x0 + h + 0.5)}
              y2={mapY(f(x0 + h) + 0.5 * secSlope)}
              stroke={p.vermilion}
              strokeWidth="2.4"
            />
            <DiagramDragHandle
              cx={mapX(x0)}
              cy={mapY(f(x0))}
              color={p.sage}
              paperBg={p.bg}
              label="Arrastrar punto x0 sobre la curva"
              active={dragPt === 'x0'}
              onPointerDown={(e) => {
                e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                setDragPt('x0');
              }}
            />
            <DiagramDragHandle
              cx={mapX(x0 + h)}
              cy={mapY(f(x0 + h))}
              color={p.vermilion}
              paperBg={p.bg}
              label="Arrastrar punto x0+h hacia x0"
              active={dragPt === 'xh'}
              onPointerDown={(e) => {
                e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                setDragPt('xh');
              }}
            />
          </svg>
        </VisualStageCard>
      )}

      {tab === 'newton' && (
        <VisualStageCard
          controls={<ParamSlider label="Iteraciones mostradas" value={newtonStep} min={1} max={4} onChange={setNewtonStep} />}
          caption={`Raíz de x² − 2 = 0 (√2 ≈ 1.414214): x_${newtonStep} = ${nPts[newtonStep].toFixed(6)}. Convergencia cuadrática: los dígitos exactos se duplican en cada tangente.`}
        >
          <div className="space-y-1.5 font-mono text-[13.5px] tabular-nums">
            {nPts.slice(0, newtonStep + 1).map((v, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded border border-[var(--hairline)]">
                <span>Iteración x_{i}</span>
                <span style={{ color: i === newtonStep ? p.sage : p.ink }} className="font-bold">{v.toFixed(7)}</span>
                <span className="text-[var(--text-muted)]">error = {Math.abs(v - Math.SQRT2).toExponential(2)}</span>
              </div>
            ))}
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M15: Integrales y Teorema Fundamental ────────────────────────────────── */
export function M15Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [nRect, setNRect] = useState(8);
  const [upperB, setUpperB] = useState(2.2);
  const [rule, setRule] = useState<'left' | 'mid' | 'right'>('mid');

  // f(x) = 0.45*x^2 + 0.4 on [0, upperB]
  const f = (x: number) => 0.45 * x * x + 0.4;
  const exactF = (x: number) => 0.15 * x * x * x + 0.4 * x;
  const dx = upperB / nRect;
  let approx = 0;
  const rects = Array.from({ length: nRect }, (_, i) => {
    const xL = i * dx;
    const xSample = rule === 'left' ? xL : rule === 'mid' ? xL + dx / 2 : xL + dx;
    const h = f(xSample);
    approx += h * dx;
    return { xL, h };
  });

  const mapX = (x: number) => 55 + (x / 3.2) * 470;
  const mapY = (y: number) => 190 - (y / 4.8) * 165;
  const setB = (v: number) => setUpperB(snapTo(v, 0.1, 0.6, 3.0));
  // Drag the upper limit b along the axis: the accumulated area grows at rate f(b) (TFC).
  const drag = useDiagramDrag<'b'>((_, pt) => setB(((pt.x - 55) / 470) * 3.2));

  return (
    <VisualStageCard
      controls={
        <>
          <ParamSlider label="Subdivisiones n" value={nRect} min={2} max={32} onChange={setNRect} />
          <span className="font-hand text-[14px] text-[var(--text-secondary)]">
            Arrastra la línea <strong style={{ color: p.vermilion }}>b = {upperB.toFixed(1)}</strong> para acumular área.
          </span>
          <div className="flex gap-1.5">
            {(['left', 'mid', 'right'] as const).map((r) => (
              <ActionBtn key={r} active={rule === r} onClick={() => setRule(r)}>
                {r === 'left' ? 'Izquierda' : r === 'mid' ? 'Punto medio' : 'Derecha'}
              </ActionBtn>
            ))}
          </div>
        </>
      }
      caption={`Riemann (${nRect} rect.) = ${approx.toFixed(4)} · Integral exacta F(${upperB.toFixed(1)}) = ${exactF(upperB).toFixed(4)} · TFC: dF/db = f(${upperB.toFixed(1)}) = ${f(upperB).toFixed(3)}.`}
    >
      <svg viewBox="0 0 560 210" className="w-full h-auto max-h-[235px]" {...drag.svgProps}>
        <line x1="40" y1={mapY(0)} x2="535" y2={mapY(0)} stroke={p.ink} strokeWidth="1.5" />
        <line x1={mapX(0)} y1="16" x2={mapX(0)} y2="198" stroke={p.ink} strokeWidth="1.5" />
        {rects.map((r, i) => (
          <rect
            key={i}
            x={mapX(r.xL)}
            y={mapY(r.h)}
            width={Math.max(1, mapX(r.xL + dx) - mapX(r.xL))}
            height={mapY(0) - mapY(r.h)}
            fill={`${p.sage}28`}
            stroke={p.sage}
            strokeWidth="1.1"
          />
        ))}
        <path
          d={Array.from({ length: 61 }, (_, i) => {
            const x = (i / 60) * 3.1;
            return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(f(x))}`;
          }).join(' ')}
          fill="none"
          stroke={p.cobalt}
          strokeWidth="2.6"
        />
        <line x1={mapX(upperB)} y1={mapY(0)} x2={mapX(upperB)} y2={mapY(f(upperB))} stroke={p.vermilion} strokeWidth="2.6" />
        <text x={mapX(upperB)} y="205" textAnchor="middle" fontSize="11" fill={p.vermilion} fontFamily="monospace">
          b={upperB.toFixed(1)}
        </text>
        <DiagramDragHandle
          cx={mapX(upperB)}
          cy={mapY(f(upperB))}
          color={p.vermilion}
          paperBg={p.bg}
          label="Límite superior b (arrastra en horizontal)"
          valueText={`b = ${upperB.toFixed(1)}`}
          onKeyStep={(dx) => setB(upperB + dx * 0.1)}
          {...drag.bind('b')}
        />
      </svg>
    </VisualStageCard>
  );
}

/* ── M16: Series de Taylor y Ecuaciones Diferenciales ─────────────────────── */
export function M16Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [fnKind, setFnKind] = useState<'sin' | 'exp' | 'geo'>('sin');
  const [degree, setDegree] = useState(3);

  const fact = (n: number) => {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  };
  const exact = (x: number) => (fnKind === 'sin' ? Math.sin(x) : fnKind === 'exp' ? Math.exp(x) : 1 / (1 - x));
  const taylor = (x: number) => {
    let s = 0;
    for (let k = 0; k <= degree; k++) {
      if (fnKind === 'sin') {
        if (k % 2 === 1) s += (Math.pow(-1, (k - 1) / 2) * Math.pow(x, k)) / fact(k);
      } else if (fnKind === 'exp') {
        s += Math.pow(x, k) / fact(k);
      } else {
        s += Math.pow(x, k);
      }
    }
    return s;
  };

  const xMin = fnKind === 'geo' ? -1.4 : -3.5;
  const xMax = fnKind === 'geo' ? 1.4 : 3.5;
  const mapX = (x: number) => 40 + ((x - xMin) / (xMax - xMin)) * 480;
  const mapY = (y: number) => 115 - Math.max(-3.5, Math.min(3.5, y)) * 28;

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn active={fnKind === 'sin'} onClick={() => setFnKind('sin')}>sin(x)</ActionBtn>
            <ActionBtn active={fnKind === 'exp'} onClick={() => setFnKind('exp')}>eˣ</ActionBtn>
            <ActionBtn active={fnKind === 'geo'} onClick={() => setFnKind('geo')}>1 / (1 − x) (R=1)</ActionBtn>
          </div>
          <ParamSlider label="Grado del polinomio N" value={degree} min={0} max={9} onChange={setDegree} />
        </>
      }
      caption={
        fnKind === 'geo'
          ? 'Atención al radio de convergencia R = 1: dentro de (-1, 1) el polinomio se pega a 1/(1−x); fuera diverge bruscamente.'
          : `Polinomio de Taylor grado ${degree} (bermellón) abrazando a ${fnKind === 'sin' ? 'sin(x)' : 'eˣ'} (cobalto) alrededor de x = 0.`
      }
    >
      <svg viewBox="0 0 560 225" className="w-full h-auto max-h-[240px]">
        {fnKind === 'geo' && (
          <rect
            x={mapX(-1)}
            y="12"
            width={mapX(1) - mapX(-1)}
            height="200"
            fill={`${p.sage}16`}
            stroke={p.sage}
            strokeDasharray="4 3"
          />
        )}
        <line x1="30" y1={mapY(0)} x2="530" y2={mapY(0)} stroke={p.grid} strokeWidth="1.2" />
        <line x1={mapX(0)} y1="12" x2={mapX(0)} y2="212" stroke={p.grid} strokeWidth="1.2" />
        <path
          d={Array.from({ length: 91 }, (_, i) => {
            const x = xMin + (i / 90) * (xMax - xMin);
            if (fnKind === 'geo' && Math.abs(x - 1) < 0.08) return '';
            return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(exact(x))}`;
          }).filter(Boolean).join(' ')}
          fill="none"
          stroke={p.cobalt}
          strokeWidth="2.4"
        />
        <path
          d={Array.from({ length: 91 }, (_, i) => {
            const x = xMin + (i / 90) * (xMax - xMin);
            return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(taylor(x))}`;
          }).join(' ')}
          fill="none"
          stroke={p.vermilion}
          strokeWidth="2.4"
          strokeDasharray="6 3"
        />
      </svg>
    </VisualStageCard>
  );
}

/* ── M17: Cálculo Multivariable ───────────────────────────────────────────── */
export function M17Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [surface, setSurface] = useState<'bowl' | 'saddle'>('bowl');
  const [px, setPx] = useState(1.1);
  const [py, setPy] = useState(0.8);

  // bowl: f(x,y) = x^2 + 1.5 y^2 -> grad = (2x, 3y)
  // saddle: f(x,y) = x^2 - y^2 -> grad = (2x, -2y)
  const gx = 2 * px;
  const gy = surface === 'bowl' ? 3 * py : -2 * py;
  const fVal = surface === 'bowl' ? px * px + 1.5 * py * py : px * px - py * py;

  const mapX = (x: number) => 170 + x * 62;
  const mapY = (y: number) => 115 - y * 50;
  const setPoint = (x: number, y: number) => {
    setPx(snapTo(x, 0.05, -1.8, 1.8));
    setPy(snapTo(y, 0.05, -1.6, 1.6));
  };
  // Walk the point across the contour map: the gradient arrow follows your finger.
  const drag = useDiagramDrag<'p'>((_, pt) => setPoint((pt.x - 170) / 62, (115 - pt.y) / 50));

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn active={surface === 'bowl'} onClick={() => setSurface('bowl')}>
              Cuenco x² + 1.5y² (H &gt; 0)
            </ActionBtn>
            <ActionBtn active={surface === 'saddle'} onClick={() => setSurface('saddle')}>
              Punto silla x² − y² (det H &lt; 0)
            </ActionBtn>
          </div>
          <span className="font-hand text-[14px] text-[var(--text-secondary)]">
            Arrastra el punto sobre el mapa de curvas de nivel.
          </span>
          {onOpen3DLab && (
            <ActionBtn tone="accent" onClick={onOpen3DLab}>
              {linked3DLabel ?? 'Abrir Superficie 3D'} →
            </ActionBtn>
          )}
        </>
      }
      caption={`En (${px.toFixed(1)}, ${py.toFixed(1)}): f = ${fVal.toFixed(2)}, ∇f = (${gx.toFixed(2)}, ${gy.toFixed(2)}). Observa que ∇f siempre es perpendicular a la curva de nivel.`}
    >
      <svg viewBox="0 0 340 230" className="w-full max-w-[380px] mx-auto h-auto" {...drag.svgProps}>
        {surface === 'bowl'
          ? [0.4, 1.0, 1.8, 2.8, 4.0].map((c) => (
              <ellipse
                key={c}
                cx={mapX(0)}
                cy={mapY(0)}
                rx={Math.sqrt(c) * 62}
                ry={Math.sqrt(c / 1.5) * 50}
                fill="none"
                stroke={p.grid}
                strokeWidth="1.4"
              />
            ))
          : [-1.5, -0.5, 0.5, 1.5].map((c) => (
              <g key={c}>
                <path
                  d={Array.from({ length: 35 }, (_, i) => {
                    const t = -1.6 + (i / 34) * 3.2;
                    const x = c > 0 ? Math.sqrt(c + t * t) : t;
                    const y = c > 0 ? t : Math.sqrt(-c + t * t);
                    return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(y)}`;
                  }).join(' ')}
                  fill="none"
                  stroke={p.grid}
                  strokeWidth="1.3"
                />
                <path
                  d={Array.from({ length: 35 }, (_, i) => {
                    const t = -1.6 + (i / 34) * 3.2;
                    const x = c > 0 ? -Math.sqrt(c + t * t) : t;
                    const y = c > 0 ? t : -Math.sqrt(-c + t * t);
                    return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(y)}`;
                  }).join(' ')}
                  fill="none"
                  stroke={p.grid}
                  strokeWidth="1.3"
                />
              </g>
            ))}

        {/* Gradient arrow */}
        <line
          x1={mapX(px)}
          y1={mapY(py)}
          x2={mapX(px + gx * 0.22)}
          y2={mapY(py + gy * 0.22)}
          stroke={p.vermilion}
          strokeWidth="3"
        />
        <DiagramDragHandle
          cx={mapX(px)}
          cy={mapY(py)}
          color={p.cobalt}
          paperBg={p.bg}
          label="Punto (x, y) sobre el mapa de nivel"
          valueText={`x = ${px.toFixed(2)}, y = ${py.toFixed(2)}`}
          onKeyStep={(dx, dy) => setPoint(px + dx * 0.1, py + dy * 0.1)}
          {...drag.bind('p')}
        />
        <text x={mapX(px + gx * 0.24)} y={mapY(py + gy * 0.24) - 4} fontSize="11.5" fontWeight="700" fill={p.vermilion} fontFamily="monospace">
          ∇f
        </text>
      </svg>
    </VisualStageCard>
  );
}
