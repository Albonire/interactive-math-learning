import { useState } from 'react';
import {
  ActionBtn,
  ParamSlider,
  SketchXYPad,
  VisualModeTabs,
  VisualStageCard,
  DiagramDragHandle,
  useDiagramDrag,
  useReportVisualState,
  useVisualPalette,
  type ModuleVisualProps,
} from './VisualHelpers';

/* ── M28: Cálculo Matricial y Backpropagation ─────────────────────────────── */
export function M28Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [w, setW] = useState(1.5);
  const [b, setB] = useState(0.5);
  const [x] = useState(2.0);
  const [target] = useState(5.0);
  const [showBack, setShowBack] = useState(true);

  const z = w * x + b;
  const err = z - target;
  const loss = 0.5 * err * err;
  const dLdz = err;
  const dLdw = dLdz * x;
  const dLdb = dLdz * 1;

  useReportVisualState({ loss });
  return (
    <VisualStageCard
      controls={
        <>
          <SketchXYPad
            xLabel="Peso w"
            yLabel="Sesgo b"
            x={w}
            y={b}
            xMin={-1}
            xMax={4}
            yMin={-2}
            yMax={3}
            xStep={0.1}
            yStep={0.1}
            xDisplay={w.toFixed(1)}
            yDisplay={b.toFixed(1)}
            crayon="cobalt"
            theme={theme}
            seed={283}
            onChange={(nx, ny) => {
              setW(nx);
              setB(ny);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <ActionBtn active={showBack} onClick={() => setShowBack((v) => !v)}>
              Flujo Backward: {showBack ? 'Visible' : 'Oculto'}
            </ActionBtn>
            <ActionBtn
              tone="accent"
              onClick={() => {
                setW(Number((w - 0.12 * dLdw).toFixed(2)));
                setB(Number((b - 0.12 * dLdb).toFixed(2)));
              }}
            >
              1 paso GD (−η∇L)
            </ActionBtn>
            {onOpen3DLab && (
              <ActionBtn onClick={onOpen3DLab}>{linked3DLabel ?? 'Abrir AutoDiff 3D'} →</ActionBtn>
            )}
          </div>
        </>
      }
      caption={`Forward: z = w·x + b = ${z.toFixed(2)}, L = ½(z−5)² = ${loss.toFixed(3)} · Backward: ∂L/∂w = ${dLdw.toFixed(2)}, ∂L/∂b = ${dLdb.toFixed(2)}.`}
    >
      <svg viewBox="0 0 600 185" className="w-full h-auto max-h-[205px]">
        {/* Connections */}
        <line x1="95" y1="55" x2="215" y2="92" stroke={p.sage} strokeWidth="2.4" />
        <line x1="95" y1="135" x2="215" y2="92" stroke={p.sage} strokeWidth="2.4" />
        <line x1="255" y1="92" x2="365" y2="92" stroke={p.sage} strokeWidth="2.4" />
        <line x1="405" y1="92" x2="505" y2="92" stroke={p.sage} strokeWidth="2.4" />

        {showBack && (
          <>
            <line x1="505" y1="104" x2="405" y2="104" stroke={p.vermilion} strokeWidth="2" strokeDasharray="4 3" />
            <line x1="365" y1="104" x2="255" y2="104" stroke={p.vermilion} strokeWidth="2" strokeDasharray="4 3" />
            <line x1="215" y1="104" x2="95" y2="67" stroke={p.vermilion} strokeWidth="2" strokeDasharray="4 3" />
            <text x="145" y="45" fontSize="11" fill={p.vermilion} fontFamily="monospace">∂L/∂w={dLdw.toFixed(2)}</text>
            <text x="310" y="124" textAnchor="middle" fontSize="11" fill={p.vermilion} fontFamily="monospace">∂L/∂z={dLdz.toFixed(2)}</text>
          </>
        )}

        {[
          { x: 70, y: 55, label: `w=${w.toFixed(1)}`, col: p.cobalt },
          { x: 70, y: 135, label: `x=${x.toFixed(1)}`, col: p.pencil },
          { x: 235, y: 92, label: `× = ${(w * x).toFixed(1)}`, col: p.sage },
          { x: 385, y: 92, label: `+b = ${z.toFixed(1)}`, col: p.sage },
          { x: 530, y: 92, label: `L=${loss.toFixed(2)}`, col: p.vermilion },
        ].map((nd) => (
          <g key={nd.label}>
            <rect x={nd.x - 42} y={nd.y - 18} width="84" height="36" rx="6" fill={p.bg} stroke={nd.col} strokeWidth="2" />
            <text x={nd.x} y={nd.y + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={nd.col} fontFamily="monospace">
              {nd.label}
            </text>
          </g>
        ))}
      </svg>
    </VisualStageCard>
  );
}

/* ── M29: Optimización Matemática y Convexidad ────────────────────────────── */
export function M29Visual({ theme, onOpen3DLab, linked3DLabel }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [lr, setLr] = useState(0.14);
  const [beta, setBeta] = useState(0.75);

  // Ill-conditioned quadratic f(x,y) = 0.5*x^2 + 6*y^2
  const runGd = (useMom: boolean) => {
    const path: Array<[number, number]> = [[-2.2, 0.9]];
    let vx = 0;
    let vy = 0;
    for (let i = 0; i < 18; i++) {
      const [x, y] = path[path.length - 1];
      const gx = x;
      const gy = 12 * y;
      if (useMom) {
        vx = beta * vx + gx;
        vy = beta * vy + gy;
        path.push([x - lr * vx, y - lr * vy]);
      } else {
        path.push([x - lr * gx, y - lr * gy]);
      }
    }
    return path;
  };
  const gdPath = runGd(false);
  const momPath = runGd(true);
  const mapX = (x: number) => 270 + x * 95;
  const mapY = (y: number) => 110 - y * 72;

  return (
    <VisualStageCard
      controls={
        <>
          <SketchXYPad
            xLabel="Tasa α"
            yLabel="Inercia β"
            x={lr}
            y={beta}
            xMin={0.03}
            xMax={0.18}
            yMin={0.1}
            yMax={0.9}
            xStep={0.01}
            yStep={0.05}
            xDisplay={lr.toFixed(2)}
            yDisplay={beta.toFixed(2)}
            crayon="sage"
            theme={theme}
            seed={293}
            onChange={(nx, ny) => {
              setLr(nx);
              setBeta(ny);
            }}
          />
          {onOpen3DLab && (
            <ActionBtn tone="accent" onClick={onOpen3DLab}>
              {linked3DLabel ?? 'Abrir Carrera 3D (SGD vs Adam)'} →
            </ActionBtn>
          )}
        </>
      }
      caption="Valle mal condicionado f(x,y) = ½x² + 6y²: GD puro (bermellón) oscila en zigzag en el eje empinado; Momentum (salvia) amortigua el zigzag y acelera hacia el mínimo (0,0)."
    >
      <svg viewBox="0 0 540 220" className="w-full h-auto max-h-[235px]">
        {[0.3, 1.0, 2.2, 4.0].map((c) => (
          <ellipse
            key={c}
            cx={mapX(0)}
            cy={mapY(0)}
            rx={Math.sqrt(2 * c) * 95}
            ry={Math.sqrt(c / 6) * 72}
            fill="none"
            stroke={p.grid}
            strokeWidth="1.3"
          />
        ))}
        <path
          d={gdPath.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(y)}`).join(' ')}
          fill="none"
          stroke={p.vermilion}
          strokeWidth="2.2"
        />
        <path
          d={momPath.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(y)}`).join(' ')}
          fill="none"
          stroke={p.sage}
          strokeWidth="2.5"
        />
        <circle cx={mapX(0)} cy={mapY(0)} r="5" fill={p.cobalt} />
        <text x="20" y="24" fontSize="11.5" fill={p.vermilion} fontFamily="monospace">— GD puro</text>
        <text x="115" y="24" fontSize="11.5" fill={p.sage} fontFamily="monospace">— Momentum (β={beta})</text>
      </svg>
    </VisualStageCard>
  );
}

/* ── M30: Métodos Numéricos y Estabilidad ─────────────────────────────────── */
export function M30Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'softmax' | 'ieee'>('softmax');
  const [scaleZ, setScaleZ] = useState(100);

  const logits = [scaleZ, scaleZ + 1, scaleZ + 2];
  const naiveExps = logits.map((v) => Math.exp(v));
  const naiveSum = naiveExps.reduce((a, b) => a + b, 0);
  const naiveOut = naiveExps.map((v) => v / naiveSum);

  const maxZ = Math.max(...logits);
  const stableExps = logits.map((v) => Math.exp(v - maxZ));
  const stableSum = stableExps.reduce((a, b) => a + b, 0);
  const stableOut = stableExps.map((v) => v / stableSum);

  // Toy 4-bit exponent/mantissa non-uniform float ticks in [0.5, 4.0]
  const floatTicks: number[] = [];
  for (let exp = -1; exp <= 1; exp++) {
    for (let m = 0; m < 4; m++) {
      floatTicks.push((1 + m / 4) * Math.pow(2, exp));
    }
  }

  useReportVisualState({ tab, scaleZ, naiveBroken: naiveOut.some((v) => !Number.isFinite(v)) });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'softmax', label: 'Softmax ingenuo vs estable' },
          { id: 'ieee', label: 'Recta no uniforme IEEE-754' },
        ]}
      />

      {tab === 'softmax' && (
        <VisualStageCard
          controls={<ParamSlider label="Magnitud de logits z" value={scaleZ} min={10} max={900} step={10} onChange={setScaleZ} />}
          caption="Al superar ~709, exp(z) en float64 hace overflow a Infinity y Softmax ingenuo produce NaN. Restar max(z) antes de exponenciar da el resultado exacto sin desbordar."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-[13px] tabular-nums">
            <div className="p-3 rounded border" style={{ borderColor: Number.isNaN(naiveOut[0]) ? p.vermilion : p.grid }}>
              <div className="font-bold mb-1.5" style={{ color: Number.isNaN(naiveOut[0]) ? p.vermilion : p.ink }}>
                Softmax ingenuo exp(z) / Σexp(z)
              </div>
              <div>Logits: [{logits.join(', ')}]</div>
              <div className="mt-1.5">
                Salida: [{naiveOut.map((v) => (Number.isNaN(v) ? 'NaN ⚡' : v.toFixed(4))).join(', ')}]
              </div>
            </div>

            <div className="p-3 rounded border" style={{ borderColor: p.sage }}>
              <div className="font-bold mb-1.5" style={{ color: p.sage }}>
                Softmax estable exp(z − max(z))
              </div>
              <div>Desplazados: [{logits.map((v) => v - maxZ).join(', ')}]</div>
              <div className="mt-1.5">
                Salida: [{stableOut.map((v) => v.toFixed(4)).join(', ')}]
              </div>
            </div>
          </div>
        </VisualStageCard>
      )}

      {tab === 'ieee' && (
        <VisualStageCard caption="Los números de punto flotante NO están equiespaciados: son densos cerca de 0 y cada vez más separados al crecer el exponente (por eso 0.1 + 0.2 ≠ 0.3 exacto).">
          <svg viewBox="0 0 540 110" className="w-full h-auto max-h-[130px]">
            <line x1="30" y1="62" x2="510" y2="62" stroke={p.ink} strokeWidth="2" />
            {floatTicks.map((val, i) => {
              const x = 35 + (val / 4.2) * 465;
              return (
                <g key={i}>
                  <line x1={x} y1="42" x2={x} y2="82" stroke={p.cobalt} strokeWidth="2" />
                  {i % 2 === 0 && (
                    <text x={x} y="98" textAnchor="middle" fontSize="10" fill={p.pencil} fontFamily="monospace">
                      {val}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M31: Teoría de la Información ────────────────────────────────────────── */
export function M31Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [p1, setP1] = useState(0.7);
  const [q1, setQ1] = useState(0.5);

  const p2 = 1 - p1;
  const q2 = 1 - q1;
  const H = -(p1 * Math.log2(p1) + p2 * Math.log2(p2));
  const CE = -(p1 * Math.log2(q1) + p2 * Math.log2(q2));
  const KL = CE - H;

  // Each distribution is a stick of length 1 split into A | B: drag the split to move mass.
  const X0 = 70;
  const X1 = 510;
  const toX = (prob: number) => X0 + prob * (X1 - X0);
  const toProb = (x: number) => Math.min(0.95, Math.max(0.05, Math.round(((x - X0) / (X1 - X0)) * 20) / 20));
  const drag = useDiagramDrag<'p' | 'q'>((key, pt) => (key === 'p' ? setP1(toProb(pt.x)) : setQ1(toProb(pt.x))));

  const BIT_W = 80; // px per bit; CE peaks near 4.1 bits at p = 0.95, q = 0.05, which still fits
  const sticks: Array<{ key: 'p' | 'q'; y: number; val: number; color: string; name: string; set: (v: number) => void }> = [
    { key: 'p', y: 40, val: p1, color: p.cobalt, name: 'Realidad p', set: setP1 },
    { key: 'q', y: 92, val: q1, color: p.ochre, name: 'Modelo q', set: setQ1 },
  ];
  const bars = [
    { label: 'H(p)', note: 'incertidumbre propia de los datos', val: H, color: p.cobalt, y: 150 },
    { label: 'D_KL(p ‖ q)', note: 'bits extra por usar q en vez de p', val: KL, color: p.vermilion, y: 180 },
    { label: 'H(p, q)', note: 'cross-entropy = H(p) + D_KL', val: CE, color: p.sage, y: 210 },
  ];

  useReportVisualState({ p1, q1, kl: KL });
  return (
    <VisualStageCard
      controls={
        <>
          <span className="font-hand text-[14px] text-[var(--text-secondary)]">
            Arrastra el corte A | B de cada barra para repartir la probabilidad.
          </span>
        </>
      }
      caption={`H(p, q) = H(p) + D_KL(p || q) → ${CE.toFixed(3)} = ${H.toFixed(3)} + ${KL.toFixed(3)} bits. Minimizar cross-entropy equivale a reducir a 0 los bits extra de KL.`}
    >
      <svg viewBox="0 0 560 230" className="w-full h-auto" {...drag.svgProps}>
        {sticks.map((st) => (
          <g key={st.key}>
            <text x={X0} y={st.y - 14} fontSize="12" fill={st.color} fontFamily="monospace">
              {st.name}: A = {st.val.toFixed(2)} · B = {(1 - st.val).toFixed(2)}
            </text>
            <rect x={X0} y={st.y - 8} width={toX(st.val) - X0} height={16} fill={st.color} fillOpacity={0.32} stroke={st.color} strokeWidth={1.4} rx={3} />
            <rect x={toX(st.val)} y={st.y - 8} width={X1 - toX(st.val)} height={16} fill={st.color} fillOpacity={0.08} stroke={st.color} strokeWidth={1.2} strokeDasharray="4 3" rx={3} />
            <text x={X0 - 12} y={st.y + 4} textAnchor="end" fontSize="12" fill={p.ink} fontFamily="monospace">A</text>
            <text x={X1 + 12} y={st.y + 4} fontSize="12" fill={p.ink} fontFamily="monospace">B</text>
            <DiagramDragHandle
              cx={toX(st.val)}
              cy={st.y}
              color={st.color}
              paperBg={p.bg}
              label={`${st.name}: probabilidad de A`}
              valueText={`${st.name}(A) = ${st.val.toFixed(2)}`}
              onKeyStep={(dx) => st.set(Math.min(0.95, Math.max(0.05, Math.round((st.val + dx * 0.05) * 20) / 20)))}
              {...drag.bind(st.key)}
            />
          </g>
        ))}
        <text x={X0} y={130} fontSize="11.5" fill={p.pencil} fontFamily="monospace">
          H(p): incertidumbre de los datos · D_KL: bits extra por usar q · H(p, q) = H(p) + D_KL
        </text>
        {bars.map((b) => (
          <g key={b.label}>
            <text x={X0 - 8} y={b.y + 4} textAnchor="end" fontSize="12" fill={b.color} fontFamily="monospace">{b.label}</text>
            <rect x={X0} y={b.y - 8} width={Math.max(1, Math.min(X1 - X0, b.val * BIT_W))} height={16} fill={b.color} fillOpacity={0.55} rx={2} />
            <text x={X0 + Math.min(X1 - X0, b.val * BIT_W) + 8} y={b.y + 4} fontSize="12" fill={p.ink} fontFamily="monospace">
              {b.val.toFixed(3)} bits
            </text>
            <title>{b.note}</title>
          </g>
        ))}
      </svg>
    </VisualStageCard>
  );
}

/* ── M32: Álgebra Abstracta y Análisis Complejo ───────────────────────────── */
export function M32Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'d4' | 'conformal'>('d4');
  // D4 state: rotation k in {0,1,2,3}, flipped boolean
  const [rot, setRot] = useState(0);
  const [flip, setFlip] = useState(false);
  const [history, setHistory] = useState<string[]>(['e']);
  const [confPower, setConfPower] = useState(2);

  // Vertices initially A(TL), B(TR), C(BR), D(BL)
  const baseLabels = ['A', 'B', 'C', 'D'];
  const transformed = baseLabels.map((_, idx) => {
    const afterRot = (idx - rot + 4) % 4;
    const finalIdx = flip ? [1, 0, 3, 2][afterRot] : afterRot;
    return baseLabels[finalIdx];
  });

  const applyR = () => {
    setRot((r) => (flip ? (r + 3) % 4 : (r + 1) % 4));
    setHistory((h) => [...h.slice(-5), 'r']);
  };
  const applyS = () => {
    setFlip((f) => !f);
    setHistory((h) => [...h.slice(-5), 's']);
  };
  const resetD4 = () => {
    setRot(0);
    setFlip(false);
    setHistory(['e']);
  };

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'd4', label: 'Grupo Diédrico D₄ (Simetrías del cuadrado)' },
          { id: 'conformal', label: 'Transformación conforme f(z) = zⁿ' },
        ]}
      />

      {tab === 'd4' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap gap-2">
              <ActionBtn tone="accent" onClick={applyR}>Rotar 90° (r)</ActionBtn>
              <ActionBtn tone="accent" onClick={applyS}>Reflejar eje vertical (s)</ActionBtn>
              <ActionBtn onClick={resetD4}>Identidad (e)</ActionBtn>
            </div>
          }
          caption={`Historial: ${history.join(' · ')}. Prueba r luego s frente a s luego r: D₄ es NO abeliano (r·s ≠ s·r).`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
            <svg viewBox="0 0 210 210" className="w-[180px] h-[180px]">
              <line x1="105" y1="16" x2="105" y2="194" stroke={p.vermilion} strokeDasharray="4 3" strokeWidth="1.4" />
              <rect x="45" y="45" width="120" height="120" rx="6" fill={`${p.cobalt}18`} stroke={p.cobalt} strokeWidth="2.5" />
              {[
                { x: 45, y: 45, lbl: transformed[0], col: p.cobalt },
                { x: 165, y: 45, lbl: transformed[1], col: p.sage },
                { x: 165, y: 165, lbl: transformed[2], col: p.ochre },
                { x: 45, y: 165, lbl: transformed[3], col: p.vermilion },
              ].map((v, i) => (
                <g key={i}>
                  <circle cx={v.x} cy={v.y} r="14" fill={p.bg} stroke={v.col} strokeWidth="2.2" />
                  <text x={v.x} y={v.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={v.col} fontFamily="monospace">
                    {v.lbl}
                  </text>
                </g>
              ))}
            </svg>

            <div className="text-[12.5px] font-mono space-y-1.5">
              <div className="text-[var(--text-secondary)]">Mini-tabla de Cayley (subgrupo de r y s):</div>
              <table className="border-collapse text-center">
                <thead>
                  <tr className="border-b border-[var(--hairline-strong)]">
                    <th className="px-2.5 py-1">∘</th>
                    <th className="px-2.5 py-1">e</th>
                    <th className="px-2.5 py-1">r</th>
                    <th className="px-2.5 py-1">s</th>
                    <th className="px-2.5 py-1">rs</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['e', 'e', 'r', 's', 'rs'],
                    ['r', 'r', 'r²', 'rs', 'r²s'],
                    ['s', 's', 'r³s', 'e', 'r³'],
                    ['rs', 'rs', 's', 'r', 'e'],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-[var(--hairline)]">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={`px-2.5 py-1 ${ci === 0 ? 'font-bold text-[var(--text-secondary)]' : ''}`}
                          style={
                            (row[0] === 'r' && ci === 3) || (row[0] === 's' && ci === 2)
                              ? { color: p.vermilion, fontWeight: 700 }
                              : undefined
                          }
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[11.5px]" style={{ color: p.vermilion }}>
                Nota: r∘s = rs ≠ r³s = s∘r
              </div>
            </div>
          </div>
        </VisualStageCard>
      )}

      {tab === 'conformal' && (
        <VisualStageCard
          controls={<ParamSlider label="Potencia compleja n en f(z) = zⁿ" value={confPower} min={1} max={3} step={0.5} onChange={setConfPower} />}
          caption="Las funciones holomorfas (como z²) deforman líneas rectas en curvas parabólicas preservando los ángulos rectos de 90° en cada cruce (transformación conforme)."
        >
          <svg viewBox="0 0 360 210" className="w-full max-w-[380px] mx-auto h-auto">
            <line x1="20" y1="105" x2="340" y2="105" stroke={p.grid} />
            <line x1="180" y1="12" x2="180" y2="198" stroke={p.grid} />
            {[0.5, 0.85, 1.2].map((u) => (
              <path
                key={`u-${u}`}
                d={Array.from({ length: 35 }, (_, i) => {
                  const v = -1.1 + (i / 34) * 2.2;
                  const r = Math.hypot(u, v);
                  const th = Math.atan2(v, u);
                  const rn = Math.pow(r, confPower);
                  const x = rn * Math.cos(confPower * th);
                  const y = rn * Math.sin(confPower * th);
                  return `${i === 0 ? 'M' : 'L'} ${180 + x * 46} ${105 - y * 46}`;
                }).join(' ')}
                fill="none"
                stroke={p.cobalt}
                strokeWidth="1.9"
              />
            ))}
            {[-0.7, 0, 0.7].map((v) => (
              <path
                key={`v-${v}`}
                d={Array.from({ length: 35 }, (_, i) => {
                  const u = 0.25 + (i / 34) * 1.15;
                  const r = Math.hypot(u, v);
                  const th = Math.atan2(v, u);
                  const rn = Math.pow(r, confPower);
                  const x = rn * Math.cos(confPower * th);
                  const y = rn * Math.sin(confPower * th);
                  return `${i === 0 ? 'M' : 'L'} ${180 + x * 46} ${105 - y * 46}`;
                }).join(' ')}
                fill="none"
                stroke={p.sage}
                strokeWidth="1.9"
              />
            ))}
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}
