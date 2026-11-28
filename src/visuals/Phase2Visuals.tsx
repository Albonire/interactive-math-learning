import { useState } from 'react';
import {
  ActionBtn,
  ParamSlider,
  VisualModeTabs,
  VisualStageCard,
  useReportVisualState,
  useVisualPalette,
  type ModuleVisualProps,
} from './VisualHelpers';

/* ── M7: Inducción Matemática y Recursión ─────────────────────────────────── */
export function M7Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'domino' | 'fib'>('domino');
  const [baseOk, setBaseOk] = useState(true);
  const [stepOk, setStepOk] = useState(true);
  const [pushed, setPushed] = useState(true);
  const [fibN, setFibN] = useState(5);
  const [memo, setMemo] = useState(false);

  const countNaiveCalls = (n: number): number => (n <= 1 ? 1 : 1 + countNaiveCalls(n - 1) + countNaiveCalls(n - 2));
  const naiveCalls = countNaiveCalls(fibN);
  const memoCalls = fibN <= 1 ? 1 : 2 * fibN - 1;

  // Build small tree nodes for SVG (up to fib(5))
  type TNode = { id: string; n: number; x: number; y: number; px?: number; py?: number; cached: boolean };
  const buildFibTree = (n: number, memoMode: boolean): TNode[] => {
    const nodes: TNode[] = [];
    const seen = new Set<number>();
    const walk = (k: number, depth: number, left: number, right: number, px?: number, py?: number, path = 'r') => {
      const x = (left + right) / 2;
      const y = 26 + depth * 36;
      const cached = memoMode && seen.has(k);
      nodes.push({ id: path, n: k, x, y, px, py, cached });
      if (k <= 1 || cached) return;
      seen.add(k);
      walk(k - 1, depth + 1, left, x, x, y, `${path}L`);
      walk(k - 2, depth + 1, x, right, x, y, `${path}R`);
    };
    walk(n, 0, 20, 600);
    return nodes;
  };
  const treeNodes = buildFibTree(Math.min(fibN, 5), memo);

  useReportVisualState({ tab, baseOk, stepOk, pushed, fibN, memo });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'domino', label: 'Efecto dominó (Inducción)' },
          { id: 'fib', label: 'Árbol Fibonacci + Memoización' },
        ]}
      />

      {tab === 'domino' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap gap-2">
              <ActionBtn active={baseOk} onClick={() => setBaseOk((v) => !v)}>
                Caso base P(1): {baseOk ? '✓ Verdadero' : '✗ Roto'}
              </ActionBtn>
              <ActionBtn active={stepOk} onClick={() => setStepOk((v) => !v)}>
                Paso P(k)→P(k+1): {stepOk ? '✓ Verdadero' : '✗ Brecha en k=3'}
              </ActionBtn>
              <ActionBtn tone="accent" onClick={() => setPushed((v) => !v)}>
                {pushed ? 'Levantar fichas' : 'Empujar P(1)'}
              </ActionBtn>
            </div>
          }
          caption={
            !pushed
              ? 'Pulsa "Empujar P(1)" para comprobar si caen todas las fichas.'
              : !baseOk
                ? 'Sin caso base P(1), ninguna ficha cae aunque el paso inductivo sea impecable.'
                : !stepOk
                  ? 'Hay una brecha entre k=3 y k=4: la cadena se detiene y la prueba falla.'
                  : '✓ Caso base + paso inductivo completos: todas las fichas P(n) caen para todo n ≥ 1.'
          }
        >
          <svg viewBox="0 0 600 140" className="w-full h-auto max-h-[165px]">
            <line x1="20" y1="115" x2="580" y2="115" stroke={p.grid} strokeWidth="2" />
            {[1, 2, 3, 4, 5, 6, 7].map((k, idx) => {
              const fallen = pushed && baseOk && (stepOk || k <= 3);
              const x = 65 + idx * 74;
              const angle = fallen ? 58 : 0;
              return (
                <g key={k}>
                  <g transform={`translate(${x}, 115) rotate(${angle})`}>
                    <rect
                      x="-10"
                      y="-62"
                      width="20"
                      height="62"
                      rx="3"
                      fill={fallen ? `${p.sage}30` : k === 1 && !baseOk ? `${p.vermilion}25` : `${p.cobalt}20`}
                      stroke={fallen ? p.sage : k === 1 && !baseOk ? p.vermilion : p.cobalt}
                      strokeWidth="2"
                    />
                  </g>
                  <text x={x} y="132" textAnchor="middle" fontSize="11" fill={p.pencil} fontFamily="monospace">
                    P({k})
                  </text>
                  {!stepOk && k === 3 && (
                    <text x={x + 37} y="65" textAnchor="middle" fontSize="14" fill={p.vermilion}>⚡</text>
                  )}
                </g>
              );
            })}
          </svg>
        </VisualStageCard>
      )}

      {tab === 'fib' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Entrada fib(n)" value={fibN} min={2} max={5} onChange={setFibN} />
              <ActionBtn active={memo} onClick={() => setMemo((v) => !v)}>
                Memoización: {memo ? 'ACTIVADA O(n)' : 'DESACTIVADA O(φⁿ)'}
              </ActionBtn>
            </>
          }
          caption={`fib(${fibN}): sin memoización ejecuta ${naiveCalls} llamadas (subproblemas repetidos); con caché baja a ${memoCalls} llamadas.`}
        >
          <svg viewBox="0 0 620 205" className="w-full h-auto max-h-[230px]">
            {treeNodes.map((nd) =>
              nd.px !== undefined && nd.py !== undefined ? (
                <line key={`e-${nd.id}`} x1={nd.px} y1={nd.py + 12} x2={nd.x} y2={nd.y - 12} stroke={p.grid} strokeWidth="1.4" />
              ) : null
            )}
            {treeNodes.map((nd) => (
              <g key={nd.id}>
                <circle
                  cx={nd.x}
                  cy={nd.y}
                  r="13"
                  fill={nd.cached ? `${p.sage}2C` : !memo && nd.n <= 2 ? `${p.vermilion}20` : p.bg}
                  stroke={nd.cached ? p.sage : !memo && nd.n <= 2 ? p.vermilion : p.cobalt}
                  strokeWidth="1.8"
                />
                <text x={nd.x} y={nd.y + 4} textAnchor="middle" fontSize="10.5" fill={p.ink} fontFamily="monospace">
                  F({nd.n})
                </text>
              </g>
            ))}
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M8: Relaciones, Funciones y Cardinalidad ─────────────────────────────── */
export function M8Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'cantor' | 'mod'>('cantor');
  const [cantorStep, setCantorStep] = useState(5);
  const [modN, setModN] = useState(4);

  const list = [
    ['0', '1', '0', '1', '1'],
    ['1', '1', '0', '0', '1'],
    ['0', '0', '1', '1', '0'],
    ['1', '0', '1', '0', '1'],
    ['0', '1', '1', '0', '0'],
  ];
  const diag = list.map((row, i) => (row[i] === '0' ? '1' : '0'));
  const classColors = [p.cobalt, p.sage, p.ochre, p.vermilion, p.plum];

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'cantor', label: 'Diagonal de Cantor (ℝ no numerable)' },
          { id: 'mod', label: 'Clases de equivalencia mod n' },
        ]}
      />

      {tab === 'cantor' && (
        <VisualStageCard
          controls={
            <ParamSlider
              label="Dígitos volteados en diagonal"
              value={cantorStep}
              min={1}
              max={5}
              onChange={setCantorStep}
            />
          }
          caption={`El número nuevo d = 0.${diag.slice(0, cantorStep).join('')}… difiere de la fila i en el dígito i-ésimo: imposible que esté en la lista.`}
        >
          <div className="space-y-2 font-mono text-[14px] max-w-[360px] mx-auto">
            {list.map((row, r) => (
              <div key={r} className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] w-16 shrink-0 whitespace-nowrap">
                  r<sub>{r + 1}</sub> = 0.
                </span>
                {row.map((bit, c) => {
                  const isDiag = r === c && r < cantorStep;
                  return (
                    <span
                      key={c}
                      className="w-8 h-8 inline-flex items-center justify-center rounded border"
                      style={{
                        borderColor: isDiag ? p.vermilion : p.grid,
                        backgroundColor: isDiag ? `${p.vermilion}20` : 'transparent',
                        color: isDiag ? p.vermilion : p.ink,
                        fontWeight: isDiag ? 700 : 400,
                      }}
                    >
                      {bit}
                    </span>
                  );
                })}
                <span className="text-[var(--text-muted)]">…</span>
              </div>
            ))}
            <div className="pt-2 border-t border-[var(--hairline-strong)] flex items-center gap-2">
              <span className="font-bold w-16 shrink-0 whitespace-nowrap" style={{ color: p.sage }}>d = 0.</span>
              {diag.map((bit, i) => (
                <span
                  key={i}
                  className="w-8 h-8 inline-flex items-center justify-center rounded border font-bold"
                  style={{
                    borderColor: i < cantorStep ? p.sage : p.grid,
                    backgroundColor: i < cantorStep ? `${p.sage}26` : 'transparent',
                    color: i < cantorStep ? p.sage : p.pencil,
                  }}
                >
                  {i < cantorStep ? bit : '·'}
                </span>
              ))}
            </div>
          </div>
        </VisualStageCard>
      )}

      {tab === 'mod' && (
        <VisualStageCard
          controls={<ParamSlider label="Módulo n" value={modN} min={2} max={5} onChange={setModN} />}
          caption={`La relación a ≡ b (mod ${modN}) particiona a ℤ en ${modN} clases disjuntas según su resto {0, …, ${modN - 1}}.`}
        >
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 font-mono text-[13px] tabular-nums">
            {Array.from({ length: 20 }, (_, i) => {
              const r = i % modN;
              const color = classColors[r % classColors.length];
              return (
                <div
                  key={i}
                  className="p-2 rounded border text-center"
                  style={{ borderColor: color, backgroundColor: `${color}1A`, color }}
                >
                  <div className="font-bold">{i}</div>
                  <div className="text-[10.5px] opacity-80">[{r}]</div>
                </div>
              );
            })}
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M9: Sucesiones, Series y Crecimiento Asintótico ──────────────────────── */
export function M9Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'stair' | 'bigo'>('stair');
  const [nStair, setNStair] = useState(5);
  const [nBigO, setNBigO] = useState(12);
  const [logScale, setLogScale] = useState(false);

  const bigOCurves = [
    { label: 'log₂ n', color: p.sage, fn: (n: number) => Math.log2(Math.max(1, n)) },
    { label: 'n', color: p.cobalt, fn: (n: number) => n },
    { label: 'n log₂ n', color: p.ochre, fn: (n: number) => n * Math.log2(Math.max(1, n)) },
    { label: 'n²', color: p.plum, fn: (n: number) => n * n },
    { label: '2ⁿ', color: p.vermilion, fn: (n: number) => Math.pow(2, Math.min(n, 16)) },
  ];

  useReportVisualState({ tab, nStair });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'stair', label: 'Escalera de Gauss 1+…+n' },
          { id: 'bigo', label: 'Comparador asintótico O(·)' },
        ]}
      />

      {tab === 'stair' && (
        <VisualStageCard
          controls={<ParamSlider label="n escalones" value={nStair} min={2} max={8} onChange={setNStair} />}
          caption={`Dos escaleras complementarias encajan en un rectángulo de ${nStair} × ${nStair + 1} = ${nStair * (nStair + 1)}. La mitad es ${(nStair * (nStair + 1)) / 2}.`}
        >
          <div className="flex justify-center">
            <svg viewBox="0 0 320 220" className="w-full max-w-[320px] h-auto">
              {(() => {
                const cell = Math.min(28, 220 / (nStair + 1));
                const ox = (320 - (nStair + 1) * cell) / 2;
                const oy = (220 - nStair * cell) / 2;
                const rects = [];
                for (let r = 0; r < nStair; r++) {
                  for (let c = 0; c < nStair + 1; c++) {
                    const isFirst = c <= r;
                    rects.push(
                      <rect
                        key={`${r}-${c}`}
                        x={ox + c * cell + 1}
                        y={oy + r * cell + 1}
                        width={cell - 2}
                        height={cell - 2}
                        rx="2"
                        fill={isFirst ? `${p.cobalt}38` : `${p.ochre}28`}
                        stroke={isFirst ? p.cobalt : p.ochre}
                        strokeWidth="1.3"
                      />
                    );
                  }
                }
                return rects;
              })()}
            </svg>
          </div>
        </VisualStageCard>
      )}

      {tab === 'bigo' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Tamaño de entrada n" value={nBigO} min={4} max={16} onChange={setNBigO} />
              <ActionBtn active={logScale} onClick={() => setLogScale((v) => !v)}>
                Escala: {logScale ? 'Logarítmica' : 'Lineal'}
              </ActionBtn>
            </>
          }
          caption="Compara el número exacto de operaciones para n: observa cómo 2ⁿ domina de golpe a cualquier polinomio."
        >
          <svg viewBox="0 0 540 164" className="w-full h-auto max-h-[210px]" role="img" aria-label="Comparación Big-O dibujada a mano">
            {bigOCurves.map((c, idx) => {
              const val = c.fn(nBigO);
              const maxVal = Math.pow(2, nBigO);
              const pct = logScale
                ? (Math.log10(val + 1) / Math.log10(maxVal + 1)) * 100
                : Math.min(100, (val / maxVal) * 100);
              const y = 14 + idx * 36;
              const barW = Math.max(8, (Math.max(2, pct) / 100) * 340);
              return (
                <g key={c.label}>
                  <text x="88" y={y + 16} textAnchor="end" fontSize="13.5" fontWeight="600" fill={c.color}>
                    {c.label}
                  </text>
                  <rect
                    x="98"
                    y={y + 2}
                    width="340"
                    height="20"
                    rx="3"
                    fill="none"
                    stroke={p.grid}
                    strokeWidth="1.3"
                    strokeDasharray="5 4"
                  />
                  <rect
                    x="98"
                    y={y + 2}
                    width={barW}
                    height="20"
                    rx="3"
                    fill={c.color}
                    fillOpacity="0.24"
                    stroke={c.color}
                    strokeWidth="2"
                  />
                  <line
                    x1="102"
                    y1={y + 12}
                    x2={Math.max(104, 98 + barW - 4)}
                    y2={y + 12}
                    stroke={c.color}
                    strokeWidth="3.2"
                    strokeOpacity="0.6"
                  />
                  <text x="450" y={y + 16} textAnchor="start" fontSize="13" fill={p.ink}>
                    {Math.round(val).toLocaleString()}
                  </text>
                </g>
              );
            })}
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M10: Teoría de Números y Aritmética Modular ──────────────────────────── */
export function M10Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'clock' | 'euclid'>('clock');
  const [modM, setModM] = useState(7);
  const [multA, setMultA] = useState(3);
  const [eucA, setEucA] = useState(21);
  const [eucB, setEucB] = useState(13);

  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const inverse = Array.from({ length: modM }, (_, x) => x).find((x) => (multA * x) % modM === 1) ?? null;

  // Build Euclid tiling squares
  type Sq = { x: number; y: number; size: number; color: string };
  const squares: Sq[] = [];
  const paletteCycle = [p.cobalt, p.sage, p.ochre, p.plum, p.vermilion];
  let remW = Math.max(eucA, eucB);
  let remH = Math.min(eucA, eucB);
  let ox = 0;
  let oy = 0;
  let idx = 0;
  while (remW > 0 && remH > 0 && idx < 24) {
    if (remW >= remH) {
      squares.push({ x: ox, y: oy, size: remH, color: paletteCycle[idx % paletteCycle.length] });
      ox += remH;
      remW -= remH;
    } else {
      squares.push({ x: ox, y: oy, size: remW, color: paletteCycle[idx % paletteCycle.length] });
      oy += remW;
      remH -= remW;
    }
    idx++;
  }
  const bigW = Math.max(eucA, eucB);
  const bigH = Math.min(eucA, eucB);
  const tileScale = Math.min(420 / bigW, 175 / bigH);

  useReportVisualState({ tab, n: modM, a: multA, hasInverse: inverse !== null, inverse });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'clock', label: 'Reloj modular ℤₙ e inverso' },
          { id: 'euclid', label: 'Embaldosado de Euclides (MCD)' },
        ]}
      />

      {tab === 'clock' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Módulo n" value={modM} min={4} max={12} onChange={setModM} />
              <ParamSlider label="Salto a" value={multA} min={1} max={modM - 1} onChange={setMultA} />
            </>
          }
          caption={
            inverse !== null
              ? `✓ mcd(${multA}, ${modM}) = 1 → existe inverso modular: ${multA} · ${inverse} ≡ 1 (mod ${modM}).`
              : `✗ mcd(${multA}, ${modM}) = ${gcd(multA, modM)} > 1 → NO existe inverso modular de ${multA} en ℤ_${modM}.`
          }
        >
          <svg viewBox="0 0 320 210" className="w-full max-w-[320px] mx-auto h-auto">
            <circle cx="160" cy="105" r="76" fill="none" stroke={p.grid} strokeWidth="1.6" />
            {Array.from({ length: modM }, (_, k) => {
              const from = (k * multA) % modM;
              const to = ((k + 1) * multA) % modM;
              const a1 = (from / modM) * Math.PI * 2 - Math.PI / 2;
              const a2 = (to / modM) * Math.PI * 2 - Math.PI / 2;
              return (
                <line
                  key={`j-${k}`}
                  x1={160 + Math.cos(a1) * 76}
                  y1={105 + Math.sin(a1) * 76}
                  x2={160 + Math.cos(a2) * 76}
                  y2={105 + Math.sin(a2) * 76}
                  stroke={inverse !== null ? p.cobalt : p.vermilion}
                  strokeWidth="1.8"
                  opacity="0.7"
                />
              );
            })}
            {Array.from({ length: modM }, (_, k) => {
              const ang = (k / modM) * Math.PI * 2 - Math.PI / 2;
              const x = 160 + Math.cos(ang) * 76;
              const y = 105 + Math.sin(ang) * 76;
              const isInv = k === inverse;
              return (
                <g key={k}>
                  <circle cx={x} cy={y} r={isInv ? 13 : 10} fill={isInv ? p.sage : p.bg} stroke={isInv ? p.sage : p.ink} strokeWidth="1.6" />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill={isInv ? p.bg : p.ink} fontFamily="monospace">
                    {k}
                  </text>
                </g>
              );
            })}
          </svg>
        </VisualStageCard>
      )}

      {tab === 'euclid' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Ancho a" value={eucA} min={6} max={34} onChange={setEucA} />
              <ParamSlider label="Alto b" value={eucB} min={4} max={24} onChange={setEucB} />
            </>
          }
          caption={`El último cuadrado que cierra exactamente el rectángulo ${eucA}×${eucB} tiene lado MCD(${eucA}, ${eucB}) = ${gcd(eucA, eucB)}.`}
        >
          <svg viewBox="0 0 460 200" className="w-full h-auto max-h-[220px]">
            <g transform={`translate(${(460 - bigW * tileScale) / 2}, ${(200 - bigH * tileScale) / 2})`}>
              {squares.map((sq, i) => (
                <g key={i}>
                  <rect
                    x={sq.x * tileScale}
                    y={sq.y * tileScale}
                    width={sq.size * tileScale}
                    height={sq.size * tileScale}
                    fill={`${sq.color}26`}
                    stroke={sq.color}
                    strokeWidth="1.8"
                  />
                  {sq.size * tileScale > 22 && (
                    <text
                      x={(sq.x + sq.size / 2) * tileScale}
                      y={(sq.y + sq.size / 2) * tileScale + 4}
                      textAnchor="middle"
                      fontSize="11"
                      fill={sq.color}
                      fontFamily="monospace"
                    >
                      {sq.size}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M11: Combinatoria ────────────────────────────────────────────────────── */
export function M11Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'pascal' | 'pigeon'>('pascal');
  const [selN, setSelN] = useState(4);
  const [selK, setSelK] = useState(2);
  const [pigeons, setPigeons] = useState(7);
  const [holes, setHoles] = useState(5);

  const comb = (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    let res = 1;
    for (let i = 1; i <= k; i++) res = (res * (n - i + 1)) / i;
    return Math.round(res);
  };

  useReportVisualState({ tab, value: comb(selN, selK), pigeons, holes });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'pascal', label: 'Triángulo de Pascal C(n, k)' },
          { id: 'pigeon', label: 'Principio del Palomar' },
        ]}
      />

      {tab === 'pascal' && (
        <VisualStageCard
          caption={`C(${selN}, ${selK}) = ${comb(selN, selK)} = C(${selN - 1}, ${selK - 1}) + C(${selN - 1}, ${selK}). Toca cualquier número para ver sus dos padres.`}
        >
          <div className="flex flex-col items-center gap-1.5 font-mono text-[13px]">
            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="flex items-center gap-1.5">
                {Array.from({ length: n + 1 }, (_, k) => {
                  const isSel = n === selN && k === selK;
                  const isParent = n === selN - 1 && (k === selK - 1 || k === selK);
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setSelN(n); setSelK(k); }}
                      className="w-9 h-8 rounded border cursor-pointer tabular-nums transition-colors"
                      style={{
                        borderColor: isSel ? p.cobalt : isParent ? p.sage : p.grid,
                        backgroundColor: isSel ? `${p.cobalt}28` : isParent ? `${p.sage}22` : 'transparent',
                        color: isSel ? p.cobalt : isParent ? p.sage : p.ink,
                        fontWeight: isSel || isParent ? 700 : 400,
                      }}
                    >
                      {comb(n, k)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </VisualStageCard>
      )}

      {tab === 'pigeon' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Objetos (palomas)" value={pigeons} min={1} max={12} onChange={setPigeons} />
              <ParamSlider label="Cajas (palomares)" value={holes} min={2} max={7} onChange={setHoles} />
            </>
          }
          caption={
            pigeons > holes
              ? `⚡ Colisión garantizada: con ${pigeons} objetos en ${holes} cajas, al menos una caja recibe ≥ ${Math.ceil(pigeons / holes)} objetos.`
              : `Con ${pigeons} ≤ ${holes}, aún cabe 1 objeto por caja sin colisión.`
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {Array.from({ length: holes }, (_, h) => {
              const count = Math.floor(pigeons / holes) + (h < pigeons % holes ? 1 : 0);
              const collision = count >= 2;
              return (
                <div
                  key={h}
                  className="p-2.5 rounded border text-center"
                  style={{
                    borderColor: collision ? p.vermilion : p.grid,
                    backgroundColor: collision ? `${p.vermilion}14` : 'transparent',
                  }}
                >
                  <div className="text-[11px] font-mono text-[var(--text-muted)]">Caja {h + 1}</div>
                  <div className="flex flex-wrap justify-center gap-1 my-2 min-h-[24px]">
                    {Array.from({ length: count }, (_, i) => (
                      <span
                        key={i}
                        className="w-4 h-4 rounded-full inline-block"
                        style={{ backgroundColor: collision ? p.vermilion : p.cobalt }}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums">{count}</div>
                </div>
              );
            })}
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M12: Teoría de Grafos y Árboles ──────────────────────────────────────── */
export function M12Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [algo, setAlgo] = useState<'bfs' | 'dfs' | 'kruskal' | 'topo'>('bfs');
  const [step, setStep] = useState(3);

  const nodes = [
    { id: 'A', x: 80, y: 105 },
    { id: 'B', x: 200, y: 45 },
    { id: 'C', x: 200, y: 165 },
    { id: 'D', x: 340, y: 45 },
    { id: 'E', x: 340, y: 165 },
    { id: 'F', x: 460, y: 105 },
  ];
  const edges: Array<{ u: string; v: string; w: number }> = [
    { u: 'A', v: 'B', w: 2 },
    { u: 'A', v: 'C', w: 4 },
    { u: 'B', v: 'D', w: 3 },
    { u: 'B', v: 'E', w: 6 },
    { u: 'C', v: 'E', w: 1 },
    { u: 'D', v: 'F', w: 5 },
    { u: 'E', v: 'F', w: 2 },
  ];

  const orders: Record<typeof algo, { nodes: string[]; edges: string[]; note: string }> = {
    bfs: {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
      edges: ['A-B', 'A-C', 'B-D', 'C-E', 'D-F'],
      note: 'BFS explora por capas usando una cola FIFO: primero distancia 1 (B, C), luego distancia 2 (D, E), luego F.',
    },
    dfs: {
      nodes: ['A', 'B', 'D', 'F', 'E', 'C'],
      edges: ['A-B', 'B-D', 'D-F', 'E-F', 'C-E'],
      note: 'DFS profundiza al máximo con pila LIFO antes de retroceder (backtracking).',
    },
    kruskal: {
      nodes: ['C', 'E', 'A', 'B', 'F', 'D'],
      edges: ['C-E', 'A-B', 'E-F', 'B-D', 'A-C'],
      note: 'Kruskal selecciona aristas de menor peso sin cerrar ciclos: w=1 (C-E), w=2 (A-B), w=2 (E-F), w=3 (B-D), w=4 (A-C) → MST total = 12.',
    },
    topo: {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F'],
      edges: ['A-B', 'A-C', 'B-D', 'B-E', 'C-E', 'D-F', 'E-F'],
      note: 'Orden Topológico (DAG dirigido de izquierda a derecha): ningún nodo aparece antes que sus dependencias.',
    },
  };

  const cur = orders[algo];
  const visitedNodes = new Set(cur.nodes.slice(0, step));
  const activeEdges = new Set(cur.edges.slice(0, Math.max(0, algo === 'kruskal' ? step : step - 1)));
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn active={algo === 'bfs'} onClick={() => { setAlgo('bfs'); setStep(3); }}>BFS (Cola)</ActionBtn>
            <ActionBtn active={algo === 'dfs'} onClick={() => { setAlgo('dfs'); setStep(3); }}>DFS (Pila)</ActionBtn>
            <ActionBtn active={algo === 'kruskal'} onClick={() => { setAlgo('kruskal'); setStep(3); }}>Kruskal (MST)</ActionBtn>
            <ActionBtn active={algo === 'topo'} onClick={() => { setAlgo('topo'); setStep(4); }}>Orden Topológico</ActionBtn>
          </div>
          <ParamSlider label="Paso del algoritmo" value={step} min={1} max={6} onChange={setStep} />
        </>
      }
      caption={`${cur.note} Secuencia: ${cur.nodes.slice(0, step).join(' → ')}.`}
    >
      <svg viewBox="0 0 540 210" className="w-full h-auto max-h-[230px]">
        {edges.map((e) => {
          const n1 = nodeMap[e.u];
          const n2 = nodeMap[e.v];
          const key = `${e.u}-${e.v}`;
          const active = activeEdges.has(key);
          const mx = (n1.x + n2.x) / 2;
          const my = (n1.y + n2.y) / 2 - 7;
          return (
            <g key={key}>
              <line
                x1={n1.x}
                y1={n1.y}
                x2={n2.x}
                y2={n2.y}
                stroke={active ? p.sage : p.grid}
                strokeWidth={active ? 3.2 : 1.6}
              />
              {algo === 'kruskal' && (
                <text x={mx} y={my} textAnchor="middle" fontSize="11" fontWeight="700" fill={active ? p.sage : p.pencil} fontFamily="monospace">
                  {e.w}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((nd) => {
          const idx = cur.nodes.indexOf(nd.id);
          const visited = visitedNodes.has(nd.id);
          const isCurrent = idx === step - 1;
          return (
            <g key={nd.id}>
              <circle cx={nd.x} cy={nd.y} r="19" fill={p.bg} />
              <circle
                cx={nd.x}
                cy={nd.y}
                r="19"
                fill={isCurrent ? p.cobalt : visited ? `${p.sage}2E` : p.bg}
                stroke={isCurrent ? p.cobalt : visited ? p.sage : p.ink}
                strokeWidth="2.3"
              />
              <text
                x={nd.x}
                y={nd.y + 5}
                textAnchor="middle"
                fontSize="14.5"
                fontWeight="700"
                fill={isCurrent ? p.bg : p.ink}
              >
                {nd.id}
              </text>
            </g>
          );
        })}
      </svg>
    </VisualStageCard>
  );
}
