import { useRef, useState } from 'react';
import {
  ActionBtn,
  DiagramDragHandle,
  ParamSlider,
  SketchXYPad,
  VisualStageCard,
  clientToSvgPoint,
  useDiagramDrag,
  useVisualPalette,
  type ModuleVisualProps,
} from './VisualHelpers';

const snapTo = (v: number, step: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Math.round(v / step) * step));

/* ── M18: Vectores y Matrices como Transformaciones ───────────────────────── */
export function M18Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [a, setA] = useState(1.4);
  const [b, setB] = useState(0.5);
  const [c, setC] = useState(0.2);
  const [d, setD] = useState(1.1);
  const [dragVec, setDragVec] = useState<'i' | 'j' | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const det = a * d - b * c;
  const cx = 190;
  const cy = 115;
  const sc = 42;
  const tx = (x: number, y: number) => cx + (a * x + b * y) * sc;
  const ty = (x: number, y: number) => cy - (c * x + d * y) * sc;

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <ActionBtn onClick={() => { setA(1); setB(0); setC(0); setD(1); }}>Identidad</ActionBtn>
            <ActionBtn onClick={() => { setA(0.7); setB(-0.7); setC(0.7); setD(0.7); }}>Rotar 45°</ActionBtn>
            <ActionBtn onClick={() => { setA(1.2); setB(0.8); setC(0); setD(1); }}>Cizalla</ActionBtn>
            <ActionBtn onClick={() => { setA(-1); setB(0.2); setC(0.2); setD(1.1); }}>Espejo (det &lt; 0)</ActionBtn>
            <ActionBtn onClick={() => { setA(1.2); setB(0.6); setC(0.8); setD(0.4); }}>Singular (det = 0)</ActionBtn>
          </div>
          <span className="font-mono-math text-[13px] text-[var(--text-secondary)] tabular-nums">
            A = [[{a.toFixed(1)}, {b.toFixed(1)}], [{c.toFixed(1)}, {d.toFixed(1)}]] · det ={' '}
            <strong style={{ color: det < 0 ? p.vermilion : p.cobalt }}>{det.toFixed(2)}</strong>
          </span>
          {onOpen3DLab && (
            <ActionBtn tone="accent" onClick={onOpen3DLab}>
              {linked3DLabel ?? 'Abrir Lab 3D'} →
            </ActionBtn>
          )}
        </>
      }
      caption={`Arrastra directamente las puntas de los vectores base î (azul) y ĵ (verde) sobre la malla. El área sombreada mide |det(A)| = ${Math.abs(det).toFixed(2)}${det < 0 ? ' (orientación invertida)' : Math.abs(det) < 0.08 ? ' (colapso a recta: matriz singular)' : ''}.`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 380 230"
        className="w-full max-w-[440px] mx-auto h-auto select-none"
        onPointerMove={(e) => {
          if (!dragVec || !svgRef.current) return;
          const pt = clientToSvgPoint(svgRef.current, e.clientX, e.clientY);
          const vx = Math.round(Math.max(-2.2, Math.min(2.2, (pt.x - cx) / sc)) * 10) / 10;
          const vy = Math.round(Math.max(-2.2, Math.min(2.2, (cy - pt.y) / sc)) * 10) / 10;
          if (dragVec === 'i') {
            setA(vx);
            setC(vy);
          } else {
            setB(vx);
            setD(vy);
          }
        }}
        onPointerUp={() => setDragVec(null)}
        onPointerCancel={() => setDragVec(null)}
      >
        {[-2, -1, 0, 1, 2].map((g) => (
          <g key={g}>
            <line x1={tx(g, -2)} y1={ty(g, -2)} x2={tx(g, 2)} y2={ty(g, 2)} stroke={p.grid} strokeWidth="1.1" />
            <line x1={tx(-2, g)} y1={ty(-2, g)} x2={tx(2, g)} y2={ty(2, g)} stroke={p.grid} strokeWidth="1.1" />
          </g>
        ))}
        <polygon
          points={`${tx(0, 0)},${ty(0, 0)} ${tx(1, 0)},${ty(1, 0)} ${tx(1, 1)},${ty(1, 1)} ${tx(0, 1)},${ty(0, 1)}`}
          fill={`${det < 0 ? p.vermilion : p.ochre}2E`}
          stroke={det < 0 ? p.vermilion : p.ochre}
          strokeWidth="1.6"
        />
        <line x1={cx} y1={cy} x2={tx(1, 0)} y2={ty(1, 0)} stroke={p.cobalt} strokeWidth="3" />
        <line x1={cx} y1={cy} x2={tx(0, 1)} y2={ty(0, 1)} stroke={p.sage} strokeWidth="3" />
        <DiagramDragHandle
          cx={tx(1, 0)}
          cy={ty(1, 0)}
          color={p.cobalt}
          paperBg={p.bg}
          label="Arrastrar punta del vector base î"
          active={dragVec === 'i'}
          onPointerDown={(e) => {
            e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
            setDragVec('i');
          }}
        />
        <DiagramDragHandle
          cx={tx(0, 1)}
          cy={ty(0, 1)}
          color={p.sage}
          paperBg={p.bg}
          label="Arrastrar punta del vector base ĵ"
          active={dragVec === 'j'}
          onPointerDown={(e) => {
            e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
            setDragVec('j');
          }}
        />
        <text x={tx(1, 0) + 12} y={ty(1, 0) - 6} fontSize="13" fontWeight="700" fill={p.cobalt} fontFamily="monospace">î</text>
        <text x={tx(0, 1) + 12} y={ty(0, 1) - 6} fontSize="13" fontWeight="700" fill={p.sage} fontFamily="monospace">ĵ</text>
      </svg>
    </VisualStageCard>
  );
}

/* ── M19: Sistemas Lineales y Eliminación Gaussiana ───────────────────────── */
export function M19Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [xWeight, setXWeight] = useState(1);
  const [yWeight, setYWeight] = useState(2);
  // System: x*[2, -1] + y*[-1, 2] = [0, 3] => solution x=1, y=2
  const rx = 2 * xWeight - yWeight;
  const ry = -xWeight + 2 * yWeight;
  const solved = Math.abs(rx - 0) < 0.05 && Math.abs(ry - 3) < 0.05;

  const cx = 140;
  const cy = 145;
  const s = 26;
  const setWeights = (x: number, y: number) => {
    setXWeight(snapTo(x, 0.5, -1, 3));
    setYWeight(snapTo(y, 0.5, -1, 3));
  };
  // Row picture: drag the guess (x, y) onto the crossing of the two lines.
  const rowDrag = useDiagramDrag<'guess'>((_, pt) => setWeights((pt.x - cx) / s, (cy - pt.y) / s));
  // Column picture: drag where x·c₁ + y·c₂ lands; the recipe (x, y) = A⁻¹·tip is solved for you.
  // A = [[2, −1], [−1, 2]] ⇒ A⁻¹ = (1/3)·[[2, 1], [1, 2]].
  const colDrag = useDiagramDrag<'tip'>((_, pt) => {
    const tx = (pt.x - cx) / s;
    const ty = (cy - pt.y) / s;
    setWeights((2 * tx + ty) / 3, (tx + 2 * ty) / 3);
  });

  return (
    <VisualStageCard
      controls={
        <>
          <span className="font-hand text-[14px] text-[var(--text-secondary)]">
            Receta actual: x = <strong style={{ color: p.cobalt }}>{xWeight}</strong>, y ={' '}
            <strong style={{ color: p.sage }}>{yWeight}</strong>. Arrastra el punto en cualquiera de las dos imágenes.
          </span>
          <ActionBtn onClick={() => { setXWeight(1); setYWeight(2); }}>Solución exacta (1, 2)</ActionBtn>
        </>
      }
      caption={
        solved
          ? '✓ Imagen de columnas alcanzada: 1·[2, −1] + 2·[−1, 2] = [0, 3] = b (coincide con el cruce de rectas en la imagen de filas).'
          : `Combinación actual = [${rx.toFixed(1)}, ${ry.toFixed(1)}]. Ajusta (x, y) para alcanzar el objetivo b = [0, 3].`
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <svg viewBox="0 0 280 205" className="w-full h-auto" {...rowDrag.svgProps}>
          <text x="14" y="18" fontSize="11.5" fontWeight="700" fill={p.ink} fontFamily="monospace">Imagen de Filas (rectas)</text>
          <line x1="20" y1={cy} x2="260" y2={cy} stroke={p.grid} />
          <line x1={cx} y1="26" x2={cx} y2="195" stroke={p.grid} />
          {/* 2x - y = 0 => y = 2x */}
          <line x1={cx - 2 * s} y1={cy + 4 * s} x2={cx + 2.5 * s} y2={cy - 5 * s} stroke={p.cobalt} strokeWidth="2.2" />
          {/* -x + 2y = 3 => y = (x+3)/2 */}
          <line x1={cx - 4 * s} y1={cy + 0.5 * s} x2={cx + 4 * s} y2={cy - 3.5 * s} stroke={p.sage} strokeWidth="2.2" />
          <circle cx={cx + 1 * s} cy={cy - 2 * s} r="5.5" fill={p.vermilion} />
          <DiagramDragHandle
            cx={cx + xWeight * s}
            cy={cy - yWeight * s}
            color={p.ink}
            paperBg={p.bg}
            label="Tu candidato (x, y) en la imagen de filas"
            valueText={`x = ${xWeight}, y = ${yWeight}`}
            onKeyStep={(dx, dy) => setWeights(xWeight + dx * 0.5, yWeight + dy * 0.5)}
            {...rowDrag.bind('guess')}
          />
        </svg>

        <svg viewBox="0 0 280 205" className="w-full h-auto" {...colDrag.svgProps}>
          <text x="14" y="18" fontSize="11.5" fontWeight="700" fill={p.ink} fontFamily="monospace">Imagen de Columnas (x·c₁ + y·c₂)</text>
          <line x1="20" y1={cy} x2="260" y2={cy} stroke={p.grid} />
          <line x1={cx} y1="26" x2={cx} y2="195" stroke={p.grid} />
          {/* x * c1 */}
          <line x1={cx} y1={cy} x2={cx + 2 * xWeight * s} y2={cy + xWeight * s} stroke={p.cobalt} strokeWidth="2.6" />
          {/* + y * c2 */}
          <line
            x1={cx + 2 * xWeight * s}
            y1={cy + xWeight * s}
            x2={cx + rx * s}
            y2={cy - ry * s}
            stroke={p.sage}
            strokeWidth="2.6"
          />
          {/* Target b = [0, 3] */}
          <circle cx={cx} cy={cy - 3 * s} r="6" fill={p.vermilion} />
          <text x={cx + 9} y={cy - 3 * s + 4} fontSize="11" fill={p.vermilion} fontFamily="monospace">b=[0,3]</text>
          <DiagramDragHandle
            cx={cx + rx * s}
            cy={cy - ry * s}
            color={p.sage}
            paperBg={p.bg}
            label="Punta de x·c₁ + y·c₂ en la imagen de columnas"
            valueText={`x·c₁ + y·c₂ = [${rx}, ${ry}]`}
            onKeyStep={(dx, dy) => setWeights(xWeight + dx * 0.5, yWeight + dy * 0.5)}
            {...colDrag.bind('tip')}
          />
        </svg>
      </div>
    </VisualStageCard>
  );
}

/* ── M20: Espacios Vectoriales y los Cuatro Subespacios ───────────────────── */
export function M20Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [m, setM] = useState(4);
  const [n, setN] = useState(5);
  const [r, setR] = useState(2);

  const safeR = Math.min(r, m, n);

  return (
    <VisualStageCard
      controls={
        <>
          <ParamSlider label="Filas m (codominio ℝᵐ)" value={m} min={2} max={6} onChange={(v) => { setM(v); setR((cur) => Math.min(cur, v, n)); }} />
          <ParamSlider label="Columnas n (dominio ℝⁿ)" value={n} min={2} max={6} onChange={(v) => { setN(v); setR((cur) => Math.min(cur, m, v)); }} />
          <ParamSlider label="Rango r" value={safeR} min={1} max={Math.min(m, n)} onChange={setR} />
          {onOpen3DLab && (
            <ActionBtn tone="accent" onClick={onOpen3DLab}>
              {linked3DLabel ?? 'Explorar Span 3D'} →
            </ActionBtn>
          )}
        </>
      }
      caption={`Teorema Rango–Nulidad: dim C(Aᵀ) + dim N(A) = ${safeR} + ${n - safeR} = ${n} = n · En ℝᵐ: dim C(A) + dim N(Aᵀ) = ${safeR} + ${m - safeR} = ${m} = m.`}
    >
      <svg viewBox="0 0 580 215" className="w-full h-auto max-h-[235px]">
        {/* Left side R^n */}
        <text x="125" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill={p.ink} fontFamily="monospace">Dominio ℝ^{n}</text>
        <rect x="35" y="34" width="180" height="72" rx="6" fill={`${p.cobalt}20`} stroke={p.cobalt} strokeWidth="2" />
        <text x="125" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill={p.cobalt} fontFamily="monospace">Espacio Fila C(Aᵀ)</text>
        <text x="125" y="84" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">dim = r = {safeR}</text>

        <rect x="35" y="122" width="180" height="72" rx="6" fill={`${p.vermilion}1C`} stroke={p.vermilion} strokeWidth="2" />
        <text x="125" y="152" textAnchor="middle" fontSize="13" fontWeight="700" fill={p.vermilion} fontFamily="monospace">Espacio Nulo N(A)</text>
        <text x="125" y="172" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">dim = n−r = {n - safeR}</text>

        <text x="125" y="117" textAnchor="middle" fontSize="11.5" fill={p.pencil} fontFamily="monospace">⊥ ortogonales</text>

        {/* Mapping arrows */}
        <line x1="222" y1="70" x2="352" y2="70" stroke={p.sage} strokeWidth="2.6" />
        <text x="287" y="60" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={p.sage} fontFamily="monospace">A: biyección</text>
        <line x1="222" y1="158" x2="352" y2="108" stroke={p.vermilion} strokeWidth="1.8" strokeDasharray="4 3" />
        <text x="292" y="152" textAnchor="middle" fontSize="11" fill={p.vermilion} fontFamily="monospace">A·x = 0</text>

        {/* Right side R^m */}
        <text x="455" y="20" textAnchor="middle" fontSize="13" fontWeight="700" fill={p.ink} fontFamily="monospace">Codominio ℝ^{m}</text>
        <rect x="365" y="34" width="180" height="72" rx="6" fill={`${p.sage}22`} stroke={p.sage} strokeWidth="2" />
        <text x="455" y="64" textAnchor="middle" fontSize="13" fontWeight="700" fill={p.sage} fontFamily="monospace">Espacio Columna C(A)</text>
        <text x="455" y="84" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">dim = r = {safeR}</text>

        <rect x="365" y="122" width="180" height="72" rx="6" fill={`${p.ochre}22`} stroke={p.ochre} strokeWidth="2" />
        <text x="455" y="152" textAnchor="middle" fontSize="13" fontWeight="700" fill={p.ochre} fontFamily="monospace">Nulo Izquierdo N(Aᵀ)</text>
        <text x="455" y="172" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">dim = m−r = {m - safeR}</text>
        <text x="455" y="117" textAnchor="middle" fontSize="11.5" fill={p.pencil} fontFamily="monospace">⊥ ortogonales</text>
      </svg>
    </VisualStageCard>
  );
}

/* ── M21: Ortogonalidad, Proyecciones y Mínimos Cuadrados ─────────────────── */
export function M21Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const pts = [
    { x: 1, y: 1.4 },
    { x: 2, y: 1.9 },
    { x: 3, y: 3.1 },
    { x: 4, y: 3.6 },
  ];
  // Exact OLS for these 4 points: meanX=2.5, meanY=2.5, slope=0.78, intercept=0.55
  const [slope, setSlope] = useState(0.5);
  const [intercept, setIntercept] = useState(1.1);

  const sse = pts.reduce((acc, pt) => {
    const err = pt.y - (slope * pt.x + intercept);
    return acc + err * err;
  }, 0);

  const mapX = (x: number) => 60 + x * 95;
  const mapY = (y: number) => 205 - y * 44;

  return (
    <VisualStageCard
      controls={
        <>
          <SketchXYPad
            xLabel="Pendiente m"
            yLabel="Intercepto b"
            x={slope}
            y={intercept}
            xMin={0}
            xMax={1.4}
            yMin={-0.5}
            yMax={2.5}
            xStep={0.02}
            yStep={0.05}
            xDisplay={slope.toFixed(2)}
            yDisplay={intercept.toFixed(2)}
            crayon="cobalt"
            theme={theme}
            seed={211}
            onChange={(nx, ny) => {
              setSlope(nx);
              setIntercept(ny);
            }}
          />
          <ActionBtn tone="accent" onClick={() => { setSlope(0.78); setIntercept(0.55); }}>
            Óptimo OLS (AᵀA)⁻¹Aᵀy
          </ActionBtn>
        </>
      }
      caption={`Suma de áreas cuadradas de residuos Σ(yᵢ − ŷᵢ)² = ${sse.toFixed(3)}. En el óptimo OLS (0.78x + 0.55), el vector error es ortogonal al espacio columna.`}
    >
      <svg viewBox="0 0 540 220" className="w-full h-auto max-h-[240px]">
        <line x1="40" y1={mapY(0)} x2="500" y2={mapY(0)} stroke={p.grid} strokeWidth="1.3" />
        <line x1={mapX(0)} y1="14" x2={mapX(0)} y2="210" stroke={p.grid} strokeWidth="1.3" />
        <line
          x1={mapX(0.3)}
          y1={mapY(slope * 0.3 + intercept)}
          x2={mapX(4.5)}
          y2={mapY(slope * 4.5 + intercept)}
          stroke={p.cobalt}
          strokeWidth="2.5"
        />
        {pts.map((pt, idx) => {
          const yHat = slope * pt.x + intercept;
          const xPx = mapX(pt.x);
          const yPx = mapY(pt.y);
          const yHatPx = mapY(yHat);
          const side = Math.abs(yPx - yHatPx);
          const topY = Math.min(yPx, yHatPx);
          return (
            <g key={idx}>
              <rect
                x={xPx}
                y={topY}
                width={side}
                height={side}
                fill={`${p.vermilion}26`}
                stroke={p.vermilion}
                strokeWidth="1.5"
              />
              <circle cx={xPx} cy={yPx} r="5" fill={p.sage} />
            </g>
          );
        })}
      </svg>
    </VisualStageCard>
  );
}

/* ── M22: Valores y Vectores Propios ──────────────────────────────────────── */
export function M22Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [iter, setIter] = useState(2);
  // Symmetric matrix A = [[2.2, 0.8], [0.8, 1.0]] -> dominant eigenvec ~ [0.894, 0.447]
  const steps: Array<[number, number]> = [[0.2, 1.0]];
  for (let k = 0; k < 7; k++) {
    const [x, y] = steps[steps.length - 1];
    const nx = 2.2 * x + 0.8 * y;
    const ny = 0.8 * x + 1.0 * y;
    const norm = Math.hypot(nx, ny);
    steps.push([nx / norm, ny / norm]);
  }
  const cur = steps[iter];
  const dom: [number, number] = [0.894, 0.447];
  const cx = 180;
  const cy = 120;
  const r = 82;

  return (
    <VisualStageCard
      controls={
        <>
          <ParamSlider label="Iteración de potencia k (Aᵏv / ‖Aᵏv‖)" value={iter} min={0} max={7} onChange={setIter} />
          {onOpen3DLab && (
            <ActionBtn tone="accent" onClick={onOpen3DLab}>
              {linked3DLabel ?? 'Abrir Eigenvectores 3D'} →
            </ActionBtn>
          )}
        </>
      }
      caption={`Paso k=${iter}: v_k = [${cur[0].toFixed(3)}, ${cur[1].toFixed(3)}] converge a la dirección propia dominante [${dom[0]}, ${dom[1]}] (así opera PageRank).`}
    >
      <svg viewBox="0 0 360 225" className="w-full max-w-[380px] mx-auto h-auto">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.grid} strokeDasharray="4 3" />
        {/* Eigenvector axis */}
        <line x1={cx - dom[0] * 110} y1={cy + dom[1] * 110} x2={cx + dom[0] * 110} y2={cy - dom[1] * 110} stroke={p.sage} strokeWidth="1.8" strokeDasharray="5 3" />
        {steps.slice(0, iter + 1).map((v, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + v[0] * r}
            y2={cy - v[1] * r}
            stroke={i === iter ? p.vermilion : p.cobalt}
            strokeWidth={i === iter ? 3.2 : 1.3}
            opacity={i === iter ? 1 : 0.35 + (i / 10)}
          />
        ))}
        <circle cx={cx + cur[0] * r} cy={cy - cur[1] * r} r="5.5" fill={p.vermilion} />
        <text x={cx + dom[0] * 92} y={cy - dom[1] * 92 - 6} fontSize="11" fill={p.sage} fontFamily="monospace">v₁ (λ₁=2.6)</text>
      </svg>
    </VisualStageCard>
  );
}

/* ── M23: SVD y Aplicaciones (PCA y Compresión) ───────────────────────────── */
export function M23Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [rankK, setRankK] = useState(2);

  // Synthetic 6x6 structured image built from 4 rank-1 outer products with known singular values
  const sigmas = [12.0, 5.2, 2.1, 0.7, 0.2, 0.05];
  const uBasis = [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 1, -1, -1, -1],
    [1, -1, -1, -1, -1, 1],
    [1, -1, 1, -1, 1, -1],
    [0, 1, -1, 1, -1, 0],
    [1, 0, -1, 0, 1, -1],
  ];
  const vBasis = [
    [1, 1, 1, 1, 1, 1],
    [1, 1, 0, 0, -1, -1],
    [1, -1, 0, 0, -1, 1],
    [0, 1, -1, 1, -1, 0],
    [1, -1, 1, -1, 1, -1],
    [-1, 1, 0, 1, -1, 0],
  ];

  const totalEnergy = sigmas.reduce((acc, s) => acc + s * s, 0);
  const keptEnergy = sigmas.slice(0, rankK).reduce((acc, s) => acc + s * s, 0);
  const energyPct = (keptEnergy / totalEnergy) * 100;

  const cellVal = (r: number, c: number) => {
    let val = 0;
    for (let k = 0; k < rankK; k++) {
      val += sigmas[k] * uBasis[k][r] * vBasis[k][c];
    }
    return Math.max(0, Math.min(1, (val + 8) / 28));
  };

  return (
    <VisualStageCard
      controls={
        <>
          <ParamSlider label="Rango truncado k (σ₁…σₖ)" value={rankK} min={1} max={6} onChange={setRankK} />
          {onOpen3DLab && (
            <ActionBtn tone="accent" onClick={onOpen3DLab}>
              {linked3DLabel ?? 'Abrir SVD 3D (UΣVᵀ)'} →
            </ActionBtn>
          )}
        </>
      }
      caption={`Con solo rango k = ${rankK}/6 conservas ${energyPct.toFixed(1)}% de la energía total Σσᵢ² (compresión de bajo rango y PCA).`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
        <div>
          <div className="text-[12px] font-mono text-[var(--text-muted)] mb-1.5 text-center">
            Reconstrucción 6×6 (rango {rankK})
          </div>
          <div className="grid grid-cols-6 gap-1 w-[174px]">
            {Array.from({ length: 6 }, (_, r) =>
              Array.from({ length: 6 }, (_, c) => {
                const intensity = cellVal(r, c);
                return (
                  <div
                    key={`${r}-${c}`}
                    className="w-6 h-6 rounded-sm border border-[var(--hairline)]"
                    style={{ backgroundColor: p.cobalt, opacity: 0.12 + intensity * 0.85 }}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="w-full max-w-[260px] space-y-1.5 font-mono text-[12px] tabular-nums">
          <div className="text-[var(--text-muted)]">Espectro de valores singulares σᵢ</div>
          {sigmas.map((s, idx) => {
            const active = idx < rankK;
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-7">σ{idx + 1}</span>
                <div className="flex-1 h-4 rounded bg-[var(--bg-surface)] overflow-hidden border border-[var(--hairline)]">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(s / sigmas[0]) * 100}%`,
                      backgroundColor: active ? p.sage : p.grid,
                    }}
                  />
                </div>
                <span className="w-10 text-right">{s.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </VisualStageCard>
  );
}
