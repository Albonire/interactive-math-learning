import { useEffect, useRef, useState } from 'react';
import {
  ActionBtn,
  DiagramDragHandle,
  InkScrubNumber,
  ParamSlider,
  SketchDial,
  VisualModeTabs,
  VisualStageCard,
  clientToSvgPoint,
  useReportVisualState,
  useVisualPalette,
  type ModuleVisualProps,
} from './VisualHelpers';

/* ── M1: Números, Aritmética y Bases ──────────────────────────────────────── */
export function M1Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'bases' | 'numberline' | 'fractions' | 'powers'>('bases');
  const [decimal, setDecimal] = useState(173);
  const [base, setBase] = useState<2 | 8 | 10 | 16>(2);
  const [jumpStart, setJumpStart] = useState(-3);
  const [jumpDelta, setJumpDelta] = useState(7);
  const [dragHandle, setDragHandle] = useState<'start' | 'end' | null>(null);
  const lineSvgRef = useRef<SVGSVGElement | null>(null);
  const [fracA, setFracA] = useState({ n: 2, d: 3 });
  const [fracB, setFracB] = useState({ n: 4, d: 6 });
  const [powBase, setPowBase] = useState(2);
  const [powExp, setPowExp] = useState(4);

  const toggleBit = (bitIndex: number) => {
    setDecimal((prev) => prev ^ (1 << bitIndex));
  };

  const digitsInBase = decimal.toString(base).toUpperCase().split('');
  const hexByte = decimal.toString(16).toUpperCase().padStart(2, '0');
  const swatchColor = `#${hexByte}6B94`;

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'bases', label: 'Tabla posicional y bits' },
          { id: 'numberline', label: 'Recta con saltos' },
          { id: 'fractions', label: 'Barras de fracciones' },
          { id: 'powers', label: 'Árbol de potencias' },
        ]}
      />

      {tab === 'bases' && (
        <VisualStageCard
          controls={
            <>
              <InkScrubNumber
                label="Valor decimal:"
                value={decimal}
                min={0}
                max={255}
                crayon="cobalt"
                onChange={setDecimal}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {([2, 8, 10, 16] as const).map((b) => (
                  <ActionBtn key={b} active={base === b} onClick={() => setBase(b)}>
                    Base {b}
                  </ActionBtn>
                ))}
              </div>
            </>
          }
          caption={`1 byte = 8 bits interactivos. Toca cualquier bit para encenderlo o apagarlo y observa su peso posicional y color CSS #${hexByte}6B94.`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((bit) => {
                const isOn = ((decimal >> bit) & 1) === 1;
                const weight = 1 << bit;
                return (
                  <button
                    key={bit}
                    type="button"
                    data-active={isOn ? 'true' : undefined}
                    onClick={() => toggleBit(bit)}
                    className={`sketch-card p-2 text-center cursor-pointer transition-transform hover:-translate-y-0.5 ${
                      isOn ? '' : 'opacity-72'
                    }`}
                  >
                    <div className="text-[12.5px] font-mono-math text-[var(--text-muted)]">2<sup>{bit}</sup></div>
                    <div className="font-display text-[25px] leading-tight text-[var(--text-primary)] tabular-nums">
                      {isOn ? '1' : '0'}
                    </div>
                    <div className="text-[11.5px] font-mono-math text-[var(--text-secondary)] tabular-nums">
                      {isOn ? `+${weight}` : '0'}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-dashed border-[var(--hairline-strong)]">
              <div className="space-y-1">
                <div className="text-[14px] font-hand text-[var(--text-muted)]">
                  Descomposición posicional en base {base}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono-math text-[13.5px] text-[var(--text-primary)] tabular-nums">
                  {digitsInBase.map((d, idx) => {
                    const exp = digitsInBase.length - 1 - idx;
                    return (
                      <span key={`${d}-${idx}`} className="inline-flex items-center gap-1">
                        {idx > 0 && <span className="text-[var(--text-muted)]">+</span>}
                        <span className="sketch-tile px-2 py-0.5 border border-dashed border-[var(--hairline-strong)] bg-[var(--bg-surface)]/70">
                          {d}·{base}<sup>{exp}</sup>
                        </span>
                      </span>
                    );
                  })}
                  <span className="text-[var(--text-muted)]">=</span>
                  <strong className="font-display text-[19px] font-normal text-[var(--ui-accent)]">
                    {decimal}₁₀
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-[13px] font-mono-math tabular-nums">
                <span
                  className="sketch-tile w-8 h-8 border-2 border-[var(--ink-frame-border)] shrink-0"
                  style={{ backgroundColor: swatchColor }}
                  aria-label={`Color hexadecimal ${swatchColor}`}
                />
                <div className="leading-tight">
                  <div>Hex: 0x{hexByte} · Oct: 0o{decimal.toString(8)}</div>
                  <div className="text-[var(--text-muted)]">Canal R CSS: {swatchColor}</div>
                </div>
              </div>
            </div>
          </div>
        </VisualStageCard>
      )}

      {tab === 'numberline' && (
        <VisualStageCard
          controls={
            <>
              <InkScrubNumber label="Origen a:" value={jumpStart} min={-8} max={8} crayon="cobalt" onChange={setJumpStart} />
              <InkScrubNumber label="Salto b:" value={jumpDelta} min={-8} max={8} crayon={jumpDelta >= 0 ? 'sage' : 'vermilion'} onChange={setJumpDelta} />
              <span className="font-hand text-[14px] text-[var(--text-muted)]">
                Arrastra los puntos directamente sobre la recta
              </span>
            </>
          }
          caption={`Suma con signo: (${jumpStart}) + (${jumpDelta}) = ${jumpStart + jumpDelta}. Los saltos negativos apuntan a la izquierda; el valor absoluto |${jumpDelta}| = ${Math.abs(jumpDelta)} mide distancia.`}
        >
          <svg
            ref={lineSvgRef}
            viewBox="0 0 640 165"
            className="w-full h-auto max-h-[215px] select-none"
            onPointerMove={(e) => {
              if (!dragHandle || !lineSvgRef.current) return;
              const pt = clientToSvgPoint(lineSvgRef.current, e.clientX, e.clientY);
              const val = Math.round((pt.x - 320) / 27);
              if (dragHandle === 'start') {
                setJumpStart(Math.max(-8, Math.min(8, val)));
              } else {
                const targetEnd = Math.max(-10, Math.min(10, val));
                setJumpDelta(Math.max(-8, Math.min(8, targetEnd - jumpStart)));
              }
            }}
            onPointerUp={() => setDragHandle(null)}
            onPointerCancel={() => setDragHandle(null)}
          >
            <line x1="30" y1="108" x2="610" y2="108" stroke={p.ink} strokeWidth="2" />
            {Array.from({ length: 21 }, (_, i) => i - 10).map((n) => {
              const x = 320 + n * 27;
              return (
                <g key={n}>
                  <line
                    x1={x}
                    y1={n === 0 ? 96 : 102}
                    x2={x}
                    y2={n === 0 ? 120 : 114}
                    stroke={n === 0 ? p.cobalt : p.pencil}
                    strokeWidth={n === 0 ? 2.2 : 1.2}
                  />
                  {n % 2 === 0 && (
                    <text
                      x={x}
                      y="138"
                      textAnchor="middle"
                      fontSize="11"
                      fill={n === 0 ? p.cobalt : p.pencil}
                      fontFamily="monospace"
                    >
                      {n}
                    </text>
                  )}
                </g>
              );
            })}
            {(() => {
              const clampedEnd = Math.max(-10, Math.min(10, jumpStart + jumpDelta));
              const x1 = 320 + jumpStart * 27;
              const x2 = 320 + clampedEnd * 27;
              const midX = (x1 + x2) / 2;
              const arcY = 108 - Math.min(72, Math.abs(x2 - x1) * 0.45 + 22);
              const color = jumpDelta >= 0 ? p.sage : p.vermilion;
              return (
                <g>
                  <path
                    d={`M ${x1} 102 Q ${midX} ${arcY} ${x2} 102`}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />
                  <DiagramDragHandle
                    cx={x1}
                    cy={108}
                    color={p.cobalt}
                    paperBg={p.bg}
                    label="Arrastrar origen a"
                    active={dragHandle === 'start'}
                    onPointerDown={(e) => {
                      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                      setDragHandle('start');
                    }}
                  />
                  <DiagramDragHandle
                    cx={x2}
                    cy={108}
                    color={color}
                    paperBg={p.bg}
                    label="Arrastrar destino a + b"
                    active={dragHandle === 'end'}
                    onPointerDown={(e) => {
                      e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                      setDragHandle('end');
                    }}
                  />
                  <text
                    x={midX}
                    y={Math.max(18, arcY - 4)}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill={color}
                    fontFamily="monospace"
                  >
                    {jumpDelta >= 0 ? `+${jumpDelta}` : `${jumpDelta}`}
                  </text>
                </g>
              );
            })()}
          </svg>
        </VisualStageCard>
      )}

      {tab === 'fractions' && (
        <VisualStageCard
          controls={
            <>
              <InkScrubNumber label="Denom. A:" value={fracA.d} min={2} max={10} crayon="cobalt" onChange={(d) => setFracA((s) => ({ n: Math.min(s.n, d), d }))} />
              <InkScrubNumber label="Denom. B:" value={fracB.d} min={2} max={12} crayon="sage" onChange={(d) => setFracB((s) => ({ n: Math.min(s.n, d), d }))} />
              <span className="font-hand text-[14px] text-[var(--text-muted)]">
                Toca las celdas directamente para colorear el numerador
              </span>
            </>
          }
          caption={
            fracA.n * fracB.d === fracB.n * fracA.d
              ? `¡Equivalentes! ${fracA.n}/${fracA.d} = ${fracB.n}/${fracB.d} = ${(fracA.n / fracA.d).toFixed(3)} (misma longitud sobre la unidad).`
              : `${fracA.n}/${fracA.d} = ${(fracA.n / fracA.d).toFixed(3)} frente a ${fracB.n}/${fracB.d} = ${(fracB.n / fracB.d).toFixed(3)}.`
          }
        >
          <div className="space-y-4">
            {[
              {
                label: `A = ${fracA.n}/${fracA.d}`,
                n: fracA.n,
                d: fracA.d,
                color: p.cobalt,
                onPick: (k: number) => setFracA((s) => ({ ...s, n: k })),
              },
              {
                label: `B = ${fracB.n}/${fracB.d}`,
                n: fracB.n,
                d: fracB.d,
                color: p.sage,
                onPick: (k: number) => setFracB((s) => ({ ...s, n: k })),
              },
            ].map((bar) => (
              <div key={bar.label} className="space-y-1">
                <div className="flex justify-between text-[13px] font-mono tabular-nums">
                  <span>{bar.label}</span>
                  <span>{((bar.n / bar.d) * 100).toFixed(1)}%</span>
                </div>
                <div className="grid gap-1.5 h-10" style={{ gridTemplateColumns: `repeat(${bar.d}, minmax(0, 1fr))` }}>
                  {Array.from({ length: bar.d }, (_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => bar.onPick(idx + 1)}
                      aria-label={`Fijar ${bar.label} en ${idx + 1} de ${bar.d}`}
                      className="cursor-pointer transition-colors"
                      style={{
                        borderColor: idx < bar.n ? bar.color : p.grid,
                        backgroundColor: idx < bar.n ? `${bar.color}36` : 'transparent',
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </VisualStageCard>
      )}

      {tab === 'powers' && (
        <VisualStageCard
          controls={
            <>
              <InkScrubNumber label="Base a:" value={powBase} min={2} max={3} crayon="sage" onChange={setPowBase} />
              <InkScrubNumber label="Exponente n:" value={powExp} min={0} max={5} crayon="cobalt" onChange={setPowExp} />
            </>
          }
          caption={`Cada nivel multiplica por ${powBase}: ${powBase}^${powExp} = ${Math.pow(powBase, powExp)} hojas. Con n = 0 hay exactamente 1 nodo raíz (${powBase}^0 = 1).`}
        >
          <svg viewBox="0 0 640 200" className="w-full h-auto max-h-[230px]">
            {Array.from({ length: Math.min(powExp, 4) + 1 }, (_, level) => {
              const count = Math.pow(powBase, level);
              const capped = Math.min(count, 16);
              const y = 26 + level * 38;
              return (
                <g key={level}>
                  <text x="10" y={y + 4} fontSize="11" fill={p.pencil} fontFamily="monospace">
                    {powBase}
                    <tspan baselineShift="super" fontSize="8">{level}</tspan>
                    <tspan> = {count}</tspan>
                  </text>
                  {Array.from({ length: capped }, (_, i) => {
                    const x = 110 + ((i + 0.5) / capped) * 510;
                    const parentIdx = Math.floor(i / powBase);
                    const parentCount = Math.max(1, Math.min(Math.pow(powBase, level - 1), 16));
                    const px = 110 + ((parentIdx + 0.5) / parentCount) * 510;
                    return (
                      <g key={i}>
                        {level > 0 && count <= 16 && (
                          <line x1={px} y1={y - 34} x2={x} y2={y - 5} stroke={p.grid} strokeWidth="1.2" />
                        )}
                        <circle cx={x} cy={y} r={capped > 8 ? 4 : 6} fill={level === Math.min(powExp, 4) ? p.cobalt : p.sage} />
                      </g>
                    );
                  })}
                  {count > 16 && (
                    <text x="625" y={y + 4} textAnchor="end" fontSize="11" fill={p.vermilion} fontFamily="monospace">
                      … ({count})
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

/* ── M2: Álgebra Elemental y Ecuaciones ───────────────────────────────────── */
export function M2Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'areas' | 'balance' | 'system'>('areas');
  const [a, setA] = useState(3);
  const [b, setB] = useState(2);
  const [dragCorner, setDragCorner] = useState(false);
  const areaSvgRef = useRef<SVGSVGElement | null>(null);
  const [balStep, setBalStep] = useState(0); // 2x + 3 = 11 -> 2x = 8 -> x = 4
  const [slope2, setSlope2] = useState(-1);
  const [absRadius, setAbsRadius] = useState(3);

  const total = a + b;
  const scale = 200 / total;
  const aPx = a * scale;
  const bPx = b * scale;

  const balanceSteps = [
    { eq: '2x + 3 = 11', leftWeights: ['x', 'x', '+3'], rightVal: 11, note: 'Ecuación inicial en equilibrio.' },
    { eq: '2x = 8', leftWeights: ['x', 'x'], rightVal: 8, note: 'Restamos 3 en ambos platillos: la balanza sigue nivelada.' },
    { eq: 'x = 4', leftWeights: ['x'], rightVal: 4, note: 'Dividimos ambos platillos entre 2: descubrimos x = 4.' },
  ];
  const curBal = balanceSteps[balStep];

  const parallel = Math.abs(slope2 - 1) < 0.05;
  const ix = parallel ? null : (3 - 1) / (1 - slope2); // y = x + 1 vs y = m2*x + 3
  const iy = ix !== null ? ix + 1 : null;

  useReportVisualState({ tab, a, b });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'areas', label: 'Cuadrado de áreas (a+b)²' },
          { id: 'balance', label: 'Balanza algebraica' },
          { id: 'system', label: 'Sistema 2×2 e inecuación' },
        ]}
      />

      {tab === 'areas' && (
        <VisualStageCard
          controls={
            <>
              <InkScrubNumber label="Lado a:" value={a} min={1} max={8} crayon="cobalt" onChange={setA} />
              <InkScrubNumber label="Lado b:" value={b} min={1} max={6} crayon="sage" onChange={setB} />
              <span className="font-hand text-[14px] text-[var(--text-muted)]">
                Arrastra el cruce interior del cuadrado para repartir a y b
              </span>
            </>
          }
          caption={`(${a}+${b})² = ${total * total} = a² (${a * a}) + 2ab (${2 * a * b}) + b² (${b * b}). Nunca olvides los dos rectángulos ab.`}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            <svg
              ref={areaSvgRef}
              viewBox="0 0 250 250"
              className="w-[230px] h-[230px] shrink-0 select-none"
              onPointerMove={(e) => {
                if (!dragCorner || !areaSvgRef.current) return;
                const pt = clientToSvgPoint(areaSvgRef.current, e.clientX, e.clientY);
                const frac = Math.max(0.16, Math.min(0.84, (pt.x - 28) / 200));
                const nextA = Math.max(1, Math.min(8, Math.round(frac * total)));
                const nextB = Math.max(1, Math.min(6, total - nextA));
                setA(nextA);
                setB(nextB);
              }}
              onPointerUp={() => setDragCorner(false)}
              onPointerCancel={() => setDragCorner(false)}
            >
              <rect x="28" y="28" width={aPx} height={aPx} fill={`${p.cobalt}28`} stroke={p.cobalt} strokeWidth="2" />
              <text x={28 + aPx / 2} y={28 + aPx / 2 + 5} textAnchor="middle" fontSize="14" fill={p.cobalt} fontFamily="monospace">
                a²={a * a}
              </text>

              <rect x={28 + aPx} y="28" width={bPx} height={aPx} fill={`${p.ochre}28`} stroke={p.ochre} strokeWidth="2" />
              <text x={28 + aPx + bPx / 2} y={28 + aPx / 2 + 5} textAnchor="middle" fontSize="12" fill={p.ochre} fontFamily="monospace">
                ab={a * b}
              </text>

              <rect x="28" y={28 + aPx} width={aPx} height={bPx} fill={`${p.ochre}28`} stroke={p.ochre} strokeWidth="2" />
              <text x={28 + aPx / 2} y={28 + aPx + bPx / 2 + 4} textAnchor="middle" fontSize="12" fill={p.ochre} fontFamily="monospace">
                ab={a * b}
              </text>

              <rect x={28 + aPx} y={28 + aPx} width={bPx} height={bPx} fill={`${p.sage}30`} stroke={p.sage} strokeWidth="2" />
              <text x={28 + aPx + bPx / 2} y={28 + aPx + bPx / 2 + 4} textAnchor="middle" fontSize="11" fill={p.sage} fontFamily="monospace">
                b²={b * b}
              </text>

              <text x={28 + aPx / 2} y="19" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">a={a}</text>
              <text x={28 + aPx + bPx / 2} y="19" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">b={b}</text>

              <DiagramDragHandle
                cx={28 + aPx}
                cy={28 + aPx}
                color={p.vermilion}
                paperBg={p.bg}
                label="Arrastrar división entre a y b"
                active={dragCorner}
                onPointerDown={(e) => {
                  e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                  setDragCorner(true);
                }}
              />
            </svg>

            <div className="space-y-2 text-[14px] font-mono tabular-nums">
              <div className="text-[var(--text-primary)]">Área total: ({a} + {b})² = <strong>{total * total}</strong></div>
              <div style={{ color: p.cobalt }}>Cuadrado a² = {a * a}</div>
              <div style={{ color: p.ochre }}>Dos rectángulos 2ab = {2 * a * b}</div>
              <div style={{ color: p.sage }}>Cuadrado b² = {b * b}</div>
              <div className="pt-2 border-t border-[var(--hairline)] text-[var(--text-secondary)]">
                Error clásico a² + b² = {a * a + b * b} (faltan {2 * a * b})
              </div>
            </div>
          </div>
        </VisualStageCard>
      )}

      {tab === 'balance' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap items-center gap-2">
              {balanceSteps.map((s, idx) => (
                <ActionBtn key={s.eq} active={balStep === idx} onClick={() => setBalStep(idx)}>
                  Paso {idx + 1}: {s.eq}
                </ActionBtn>
              ))}
            </div>
          }
          caption={curBal.note}
        >
          <svg viewBox="0 0 560 190" className="w-full h-auto max-h-[210px]">
            <polygon points="280,145 255,180 305,180" fill={`${p.pencil}33`} stroke={p.ink} strokeWidth="1.8" />
            <line x1="110" y1="142" x2="450" y2="142" stroke={p.ink} strokeWidth="3" />
            <line x1="160" y1="142" x2="160" y2="118" stroke={p.ink} strokeWidth="2" />
            <line x1="400" y1="142" x2="400" y2="118" stroke={p.ink} strokeWidth="2" />
            <line x1="90" y1="118" x2="230" y2="118" stroke={p.cobalt} strokeWidth="3" />
            <line x1="330" y1="118" x2="470" y2="118" stroke={p.sage} strokeWidth="3" />

            {curBal.leftWeights.map((w, i) => (
              <g key={`${w}-${i}`} transform={`translate(${106 + i * 40}, 76)`}>
                <rect width="34" height="38" rx="4" fill={w === 'x' ? `${p.cobalt}30` : `${p.ochre}30`} stroke={w === 'x' ? p.cobalt : p.ochre} strokeWidth="2" />
                <text x="17" y="24" textAnchor="middle" fontSize="14" fontWeight="700" fill={p.ink} fontFamily="monospace">{w}</text>
              </g>
            ))}

            <g transform="translate(362, 68)">
              <rect width="76" height="46" rx="4" fill={`${p.sage}28`} stroke={p.sage} strokeWidth="2" />
              <text x="38" y="29" textAnchor="middle" fontSize="18" fontWeight="700" fill={p.sage} fontFamily="monospace">
                {curBal.rightVal}
              </text>
            </g>

            <text x="280" y="34" textAnchor="middle" fontSize="19" fontWeight="700" fill={p.ink} fontFamily="monospace">
              {curBal.eq}
            </text>
          </svg>
        </VisualStageCard>
      )}

      {tab === 'system' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider
                label="Pendiente recta 2 (m₂)"
                value={slope2}
                min={-2}
                max={2}
                step={0.5}
                onChange={setSlope2}
              />
              <ParamSlider
                label="Radio inecuación |x − 1| ≤ r"
                value={absRadius}
                min={0.5}
                max={4}
                step={0.5}
                onChange={setAbsRadius}
              />
            </>
          }
          caption={
            parallel
              ? 'Rectas paralelas (m₁ = m₂ = 1): el sistema 2×2 no tiene solución.'
              : `Intersección única en (${ix!.toFixed(2)}, ${iy!.toFixed(2)}). Abajo: intervalo solución [${(1 - absRadius).toFixed(1)}, ${(1 + absRadius).toFixed(1)}].`
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <svg viewBox="0 0 280 210" className="w-full h-auto">
              <line x1="20" y1="120" x2="260" y2="120" stroke={p.grid} strokeWidth="1.5" />
              <line x1="140" y1="15" x2="140" y2="195" stroke={p.grid} strokeWidth="1.5" />
              {/* y = x + 1 */}
              <line x1={140 - 4 * 26} y1={120 - (-3) * 20} x2={140 + 4 * 26} y2={120 - 5 * 20} stroke={p.cobalt} strokeWidth="2.4" />
              {/* y = m2*x + 3 */}
              <line
                x1={140 - 4 * 26}
                y1={120 - (slope2 * -4 + 3) * 20}
                x2={140 + 4 * 26}
                y2={120 - (slope2 * 4 + 3) * 20}
                stroke={p.vermilion}
                strokeWidth="2.4"
              />
              {ix !== null && iy !== null && (
                <circle cx={140 + ix * 26} cy={120 - iy * 20} r="5.5" fill={p.sage} stroke={p.bg} strokeWidth="1.5" />
              )}
              <text x="24" y="24" fontSize="11" fill={p.cobalt} fontFamily="monospace">y = x + 1</text>
              <text x="24" y="40" fontSize="11" fill={p.vermilion} fontFamily="monospace">y = {slope2}x + 3</text>
            </svg>

            <svg viewBox="0 0 280 120" className="w-full h-auto">
              <text x="140" y="24" textAnchor="middle" fontSize="12" fill={p.ink} fontFamily="monospace">
                |x − 1| ≤ {absRadius}
              </text>
              <line x1="20" y1="70" x2="260" y2="70" stroke={p.ink} strokeWidth="1.8" />
              {[-4, -2, 0, 2, 4, 6].map((t) => {
                const x = 110 + t * 22;
                return (
                  <g key={t}>
                    <line x1={x} y1="64" x2={x} y2="76" stroke={p.pencil} strokeWidth="1.2" />
                    <text x={x} y="92" textAnchor="middle" fontSize="10" fill={p.pencil} fontFamily="monospace">{t}</text>
                  </g>
                );
              })}
              <line
                x1={110 + (1 - absRadius) * 22}
                y1="70"
                x2={110 + (1 + absRadius) * 22}
                y2="70"
                stroke={p.sage}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <circle cx={110 + 1 * 22} cy="70" r="4" fill={p.cobalt} />
            </svg>
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M3: Funciones, Transformaciones y Modelado ───────────────────────────── */
export function M3Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'mapping' | 'transform' | 'compose'>('mapping');
  const [arrows, setArrows] = useState<Array<[number, number]>>([
    // Starts broken on purpose (x1 has two arrows, x2 none): chapter I asks to fix it.
    [0, 0],
    [0, 1],
    [2, 2],
  ]);
  const [hShift, setHShift] = useState(1.5);
  const [kShift, setKShift] = useState(-1);
  const [compX, setCompX] = useState(2);

  const toggleArrow = (from: number, to: number) => {
    setArrows((prev) => {
      const exists = prev.some(([a, b]) => a === from && b === to);
      return exists ? prev.filter(([a, b]) => !(a === from && b === to)) : [...prev, [from, to]];
    });
  };

  const outCounts = [0, 1, 2].map((u) => arrows.filter(([a]) => a === u).length);
  const inCounts = [0, 1, 2].map((v) => arrows.filter(([, b]) => b === v).length);
  const isFunction = outCounts.every((c) => c === 1);
  const isInjective = isFunction && inCounts.every((c) => c <= 1);
  const isSurjective = isFunction && inCounts.every((c) => c >= 1);
  const mappingCaption = !isFunction
    ? '✗ No es función: cada x debe tener exactamente una flecha de salida (las rojas tienen 0 o más de 1).'
    : isInjective && isSurjective
      ? '✓ Biyectiva: cada x tiene una salida, ninguna y recibe dos flechas y ninguna queda sin flecha. Existe la inversa: invierte las flechas.'
      : isInjective
        ? '✓ Función inyectiva, pero no sobreyectiva: alguna y queda sin flecha.'
        : isSurjective
          ? '✓ Función sobreyectiva, pero no inyectiva: alguna y recibe dos flechas.'
          : '✓ Es función, pero ni inyectiva ni sobreyectiva: hay un choque en una y, y otra y queda sin flecha.';

  // Arrow-drawing state for the mapping diagram.
  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragPt, setDragPt] = useState<{ x: number; y: number } | null>(null);
  const DOM_X = 110;
  const CO_X = 330;
  const NODE_Y = (i: number) => 62 + i * 62;

  const gx = compX + 1;
  const fgx = gx * gx;
  const fx = compX * compX;
  const gfx = fx + 1;

  useReportVisualState({ tab, isFunction, isInjective, isSurjective });
  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'mapping', label: 'Mapeo Dominio → Codominio' },
          { id: 'transform', label: 'Traslación y reflexión exp/log' },
          { id: 'compose', label: 'Máquinas f(g(x)) vs g(f(x))' },
        ]}
      />

      {tab === 'mapping' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-hand text-[14px] text-[var(--text-secondary)] mr-1">
                Arrastra desde una x hasta una y para trazar una flecha; toca una flecha para borrarla.
              </span>
              <ActionBtn onClick={() => setArrows([[0, 0], [0, 1], [2, 2]])}>Reiniciar</ActionBtn>
            </div>
          }
          caption={mappingCaption}
        >
          <svg
            ref={mapSvgRef}
            viewBox="0 0 440 236"
            className="w-full max-w-[560px] mx-auto h-auto select-none"
            style={{ touchAction: dragFrom !== null ? 'none' : 'pan-y' }}
            onPointerMove={(e) => {
              if (dragFrom === null) return;
              setDragPt(clientToSvgPoint(e.currentTarget, e.clientX, e.clientY));
            }}
            onPointerUp={(e) => {
              if (dragFrom === null) return;
              const pt = clientToSvgPoint(e.currentTarget, e.clientX, e.clientY);
              const target = [0, 1, 2].find((j) => Math.hypot(pt.x - CO_X, pt.y - NODE_Y(j)) < 30);
              if (target !== undefined) toggleArrow(dragFrom, target);
              setDragFrom(null);
              setDragPt(null);
            }}
            onPointerCancel={() => {
              setDragFrom(null);
              setDragPt(null);
            }}
          >
            <ellipse cx={DOM_X} cy="124" rx="62" ry="98" fill={`${p.cobalt}14`} stroke={p.cobalt} strokeWidth="1.8" strokeDasharray="5 4" />
            <ellipse cx={CO_X} cy="124" rx="62" ry="98" fill={`${p.sage}14`} stroke={p.sage} strokeWidth="1.8" strokeDasharray="5 4" />
            <text x={DOM_X} y="16" textAnchor="middle" fontSize="15" fill={p.cobalt} className="font-hand">Dominio X</text>
            <text x={CO_X} y="16" textAnchor="middle" fontSize="15" fill={p.sage} className="font-hand">Codominio Y</text>

            {arrows.map(([u, v]) => {
              const bad = outCounts[u] > 1;
              const color = bad ? p.vermilion : p.ink;
              const x1 = DOM_X + 20;
              const y1 = NODE_Y(u);
              const x2 = CO_X - 22;
              const y2 = NODE_Y(v);
              // Gentle arc so crossing arrows stay readable; the head follows the arc's end tangent.
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2 - 16;
              const ang = Math.atan2(y2 - my, x2 - mx);
              const head = (da: number) => ({ x: x2 - 11 * Math.cos(ang + da), y: y2 - 11 * Math.sin(ang + da) });
              const h1 = head(0.45);
              const h2 = head(-0.45);
              return (
                <g
                  key={`${u}-${v}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Flecha x${u + 1} → y${v + 1}. Pulsa para borrarla.`}
                  className="cursor-pointer outline-none"
                  onClick={() => toggleArrow(u, v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Delete' || e.key === 'Backspace') {
                      e.preventDefault();
                      toggleArrow(u, v);
                    }
                  }}
                >
                  <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke="transparent" strokeWidth="16" data-crisp="" />
                  <path d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`} fill="none" stroke={color} strokeWidth="2.4" />
                  <line x1={x2} y1={y2} x2={h1.x} y2={h1.y} stroke={color} strokeWidth="2.4" />
                  <line x1={x2} y1={y2} x2={h2.x} y2={h2.y} stroke={color} strokeWidth="2.4" />
                </g>
              );
            })}

            {dragFrom !== null && dragPt && (
              <line x1={DOM_X + 20} y1={NODE_Y(dragFrom)} x2={dragPt.x} y2={dragPt.y} stroke={p.cobalt} strokeWidth="2" strokeDasharray="6 5" />
            )}

            {[0, 1, 2].map((i) => {
              const outs = outCounts[i];
              const ins = inCounts[i];
              const domColor = outs === 1 ? p.cobalt : p.vermilion;
              const coColor = ins > 1 ? p.ochre : p.sage;
              return (
                <g key={i}>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`x${i + 1}: ${outs} ${outs === 1 ? 'flecha' : 'flechas'} de salida. Teclas 1, 2 o 3 trazan o borran la flecha hacia y1, y2 o y3.`}
                    className="cursor-grab outline-none"
                    style={{ touchAction: 'none' }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      mapSvgRef.current?.setPointerCapture(e.pointerId);
                      setDragFrom(i);
                      setDragPt({ x: DOM_X + 20, y: NODE_Y(i) });
                    }}
                    onKeyDown={(e) => {
                      const j = ['1', '2', '3'].indexOf(e.key);
                      if (j >= 0) {
                        e.preventDefault();
                        toggleArrow(i, j);
                      }
                    }}
                  >
                    <circle cx={DOM_X} cy={NODE_Y(i)} r="26" fill="transparent" data-crisp="" />
                    <circle cx={DOM_X} cy={NODE_Y(i)} r="17" fill={p.bg} stroke={domColor} strokeWidth={dragFrom === i ? 3 : 2.2} />
                    <text x={DOM_X} y={NODE_Y(i) + 5} textAnchor="middle" fontSize="15" fill={p.ink} className="font-hand">x{i + 1}</text>
                  </g>
                  {outs !== 1 && (
                    <text x={DOM_X - 30} y={NODE_Y(i) + 5} textAnchor="end" fontSize="13" fill={p.vermilion} className="font-hand" stroke={p.bg} strokeWidth="4" style={{ paintOrder: 'stroke' }}>
                      {outs === 0 ? 'sin salida' : `${outs} salidas`}
                    </text>
                  )}
                  <circle cx={CO_X} cy={NODE_Y(i)} r="17" fill={p.bg} stroke={coColor} strokeWidth="2.2" strokeDasharray={ins === 0 ? '4 3' : undefined} />
                  <text x={CO_X} y={NODE_Y(i) + 5} textAnchor="middle" fontSize="15" fill={p.ink} className="font-hand">y{i + 1}</text>
                  {ins !== 1 && (
                    <text x={CO_X + 30} y={NODE_Y(i) + 5} fontSize="13" fill={ins > 1 ? p.ochre : p.pencil} className="font-hand" stroke={p.bg} strokeWidth="4" style={{ paintOrder: 'stroke' }}>
                      {ins === 0 ? 'nadie llega' : `${ins} llegan`}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </VisualStageCard>
      )}

      {tab === 'transform' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Desplazamiento h (en x − h)" value={hShift} min={-2.5} max={2.5} step={0.5} onChange={setHShift} />
              <ParamSlider label="Desplazamiento k (+ k)" value={kShift} min={-2} max={2} step={0.5} onChange={setKShift} />
            </>
          }
          caption={`f(x − (${hShift})) + (${kShift}): restar h > 0 desplaza la parábola a la DERECHA. A la derecha, e^x y ln(x) son reflejos exactos sobre la diagonal y = x.`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <svg viewBox="0 0 280 200" className="w-full h-auto">
              <line x1="20" y1="130" x2="260" y2="130" stroke={p.grid} strokeWidth="1.2" />
              <line x1="140" y1="15" x2="140" y2="185" stroke={p.grid} strokeWidth="1.2" />
              {/* Reference y = x^2 */}
              <path
                d={Array.from({ length: 41 }, (_, i) => {
                  const x = -3 + i * 0.15;
                  const y = x * x * 0.45;
                  return `${i === 0 ? 'M' : 'L'} ${140 + x * 32} ${130 - y * 28}`;
                }).join(' ')}
                fill="none"
                stroke={p.pencil}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Shifted y = (x - h)^2 + k */}
              <path
                d={Array.from({ length: 51 }, (_, i) => {
                  const x = -4 + i * 0.16;
                  const y = (x - hShift) * (x - hShift) * 0.45 + kShift;
                  return `${i === 0 ? 'M' : 'L'} ${140 + x * 32} ${130 - y * 28}`;
                }).join(' ')}
                fill="none"
                stroke={p.cobalt}
                strokeWidth="2.5"
              />
              <circle cx={140 + hShift * 32} cy={130 - kShift * 28} r="5" fill={p.vermilion} />
              <text x="16" y="24" fontSize="11" fill={p.cobalt} fontFamily="monospace">
                vértice ({hShift}, {kShift})
              </text>
            </svg>

            <svg viewBox="0 0 280 200" className="w-full h-auto">
              <line x1="20" y1="130" x2="260" y2="130" stroke={p.grid} strokeWidth="1.2" />
              <line x1="100" y1="15" x2="100" y2="185" stroke={p.grid} strokeWidth="1.2" />
              {/* y = x mirror */}
              <line x1="30" y1="190" x2="210" y2="10" stroke={p.pencil} strokeWidth="1.4" strokeDasharray="4 4" />
              {/* e^x */}
              <path
                d={Array.from({ length: 40 }, (_, i) => {
                  const x = -2.2 + i * 0.1;
                  const y = Math.exp(x);
                  return `${i === 0 ? 'M' : 'L'} ${100 + x * 32} ${130 - Math.min(4.2, y) * 26}`;
                }).join(' ')}
                fill="none"
                stroke={p.cobalt}
                strokeWidth="2.3"
              />
              {/* ln(x) */}
              <path
                d={Array.from({ length: 40 }, (_, i) => {
                  const x = 0.14 + i * 0.11;
                  const y = Math.log(x);
                  return `${i === 0 ? 'M' : 'L'} ${100 + x * 32} ${130 - y * 26}`;
                }).join(' ')}
                fill="none"
                stroke={p.sage}
                strokeWidth="2.3"
              />
              <text x="150" y="34" fontSize="11" fill={p.cobalt} fontFamily="monospace">eˣ</text>
              <text x="206" y="100" fontSize="11" fill={p.sage} fontFamily="monospace">ln(x)</text>
              <text x="212" y="24" fontSize="10" fill={p.pencil} fontFamily="monospace">y = x</text>
            </svg>
          </div>
        </VisualStageCard>
      )}

      {tab === 'compose' && (
        <VisualStageCard
          controls={<ParamSlider label="Entrada x" value={compX} min={-4} max={5} onChange={setCompX} />}
          caption={`f(x) = x², g(x) = x + 1. Observa cómo el orden importa: f(g(${compX})) = ${fgx}, mientras g(f(${compX})) = ${gfx}.`}
        >
          <div className="space-y-3 font-mono text-[14px] tabular-nums">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1.5 rounded border border-[var(--hairline)]">x = {compX}</span>
              <span>→</span>
              <span className="px-2.5 py-1.5 rounded border" style={{ borderColor: p.sage, color: p.sage }}>
                g(x)=x+1 → {gx}
              </span>
              <span>→</span>
              <span className="px-2.5 py-1.5 rounded border" style={{ borderColor: p.cobalt, color: p.cobalt }}>
                f(·)=(·)² → <strong>{fgx}</strong>
              </span>
              <span className="text-[var(--text-muted)] text-[12.5px]">(f ∘ g)(x)</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1.5 rounded border border-[var(--hairline)]">x = {compX}</span>
              <span>→</span>
              <span className="px-2.5 py-1.5 rounded border" style={{ borderColor: p.cobalt, color: p.cobalt }}>
                f(x)=x² → {fx}
              </span>
              <span>→</span>
              <span className="px-2.5 py-1.5 rounded border" style={{ borderColor: p.sage, color: p.sage }}>
                g(·)=·+1 → <strong>{gfx}</strong>
              </span>
              <span className="text-[var(--text-muted)] text-[12.5px]">(g ∘ f)(x)</span>
            </div>
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M4: Geometría Analítica, Trigonometría y Complejos ───────────────────── */
export function M4Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'trig' | 'complex'>('trig');
  const [deg, setDeg] = useState(57);
  const [playing, setPlaying] = useState(false);
  const [dragCircle, setDragCircle] = useState(false);
  const trigSvgRef = useRef<SVGSVGElement | null>(null);
  const [rotDeg, setRotDeg] = useState(90);
  const [scaleR, setScaleR] = useState(1.2);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setDeg((d) => (d + 3) % 360);
    }, 45);
    return () => window.clearInterval(id);
  }, [playing]);

  const rad = (deg * Math.PI) / 180;
  const cx = 105;
  const cy = 105;
  const r = 74;
  const px = cx + r * Math.cos(rad);
  const py = cy - r * Math.sin(rad);

  // Complex z = 1.5 + 0.8i multiplied by scaleR * e^(i*rotDeg)
  const zRe = 1.4;
  const zIm = 0.8;
  const phi = (rotDeg * Math.PI) / 180;
  const wRe = scaleR * (zRe * Math.cos(phi) - zIm * Math.sin(phi));
  const wIm = scaleR * (zRe * Math.sin(phi) + zIm * Math.cos(phi));

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'trig', label: 'Círculo unitario → Ondas sin/cos' },
          { id: 'complex', label: 'Rotación compleja z · r·e^(iφ)' },
        ]}
      />

      {tab === 'trig' && (
        <VisualStageCard
          controls={
            <>
              <SketchDial
                label="Ángulo θ"
                value={deg}
                min={0}
                max={360}
                step={1}
                displayValue={`${deg}° (${rad.toFixed(2)} rad)`}
                crayon="vermilion"
                theme={theme}
                size={76}
                seed={47}
                onChange={(next) => {
                  setPlaying(false);
                  setDeg(Math.round(next) % 360);
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <ActionBtn active={playing} onClick={() => setPlaying((v) => !v)}>
                  {playing ? 'Pausar giro' : 'Animar θ'}
                </ActionBtn>
                <ActionBtn onClick={() => { setPlaying(false); setDeg(57); }}>1 rad (57°)</ActionBtn>
                <span className="font-hand text-[14px] text-[var(--text-muted)]">
                  O arrastra el punto directo sobre el círculo
                </span>
              </div>
            </>
          }
          caption={`cos(θ) = ${Math.cos(rad).toFixed(3)} (horizontal) · sin(θ) = ${Math.sin(rad).toFixed(3)} (vertical) · sin²+cos² = 1.`}
        >
          <svg
            ref={trigSvgRef}
            viewBox="0 0 600 215"
            className="w-full h-auto max-h-[245px] select-none"
            onPointerMove={(e) => {
              if (!dragCircle || !trigSvgRef.current) return;
              const pt = clientToSvgPoint(trigSvgRef.current, e.clientX, e.clientY);
              let angle = Math.atan2(-(pt.y - cy), pt.x - cx);
              if (angle < 0) angle += Math.PI * 2;
              setDeg(Math.round((angle * 180) / Math.PI) % 360);
            }}
            onPointerUp={() => setDragCircle(false)}
            onPointerCancel={() => setDragCircle(false)}
          >
            {/* Unit Circle */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.grid} strokeWidth="1.8" />
            <line x1={cx - r - 12} y1={cy} x2={cx + r + 12} y2={cy} stroke={p.grid} strokeWidth="1" />
            <line x1={cx} y1={cy - r - 12} x2={cx} y2={cy + r + 12} stroke={p.grid} strokeWidth="1" />
            <line x1={cx} y1={cy} x2={px} y2={cy} stroke={p.cobalt} strokeWidth="2.5" />
            <line x1={px} y1={cy} x2={px} y2={py} stroke={p.vermilion} strokeWidth="2.5" />
            <line x1={cx} y1={cy} x2={px} y2={py} stroke={p.ink} strokeWidth="2" />
            <line x1={px} y1={py} x2={230 + (deg / 360) * 330} y2={py} stroke={p.vermilion} strokeWidth="1.2" strokeDasharray="4 3" />

            {/* Sine & Cosine waves */}
            <line x1="230" y1={cy} x2="575" y2={cy} stroke={p.grid} strokeWidth="1.2" />
            <path
              d={Array.from({ length: 73 }, (_, i) => {
                const a = (i / 72) * Math.PI * 2;
                return `${i === 0 ? 'M' : 'L'} ${230 + (i / 72) * 330} ${cy - Math.sin(a) * r}`;
              }).join(' ')}
              fill="none"
              stroke={p.vermilion}
              strokeWidth="2.2"
            />
            <path
              d={Array.from({ length: 73 }, (_, i) => {
                const a = (i / 72) * Math.PI * 2;
                return `${i === 0 ? 'M' : 'L'} ${230 + (i / 72) * 330} ${cy - Math.cos(a) * r}`;
              }).join(' ')}
              fill="none"
              stroke={p.cobalt}
              strokeWidth="1.8"
              strokeDasharray="5 3"
            />
            <circle cx={230 + (deg / 360) * 330} cy={py} r="5" fill={p.vermilion} />
            <text x="236" y="24" fontSize="11" fill={p.vermilion} fontFamily="monospace">sin(θ)</text>
            <text x="292" y="24" fontSize="11" fill={p.cobalt} fontFamily="monospace">cos(θ)</text>

            <DiagramDragHandle
              cx={px}
              cy={py}
              color={p.vermilion}
              paperBg={p.bg}
              label="Arrastrar punto P(θ) en el círculo unitario"
              active={dragCircle}
              onPointerDown={(e) => {
                e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
                setPlaying(false);
                setDragCircle(true);
              }}
            />
          </svg>
        </VisualStageCard>
      )}

      {tab === 'complex' && (
        <VisualStageCard
          controls={
            <>
              <SketchDial
                label="Rotación φ"
                value={rotDeg}
                min={0}
                max={360}
                unit="°"
                crayon="vermilion"
                theme={theme}
                size={74}
                seed={89}
                onChange={(v) => setRotDeg(Math.round(v) % 360)}
              />
              <InkScrubNumber
                label="Escala r:"
                value={scaleR}
                min={0.5}
                max={1.8}
                step={0.1}
                displayValue={scaleR.toFixed(1)}
                crayon="cobalt"
                onChange={setScaleR}
              />
              <div className="flex flex-wrap gap-1.5">
                <ActionBtn onClick={() => { setRotDeg(90); setScaleR(1); }}>× i (90°)</ActionBtn>
                <ActionBtn onClick={() => { setRotDeg(180); setScaleR(1); }}>× i² = −1 (180°)</ActionBtn>
              </div>
            </>
          }
          caption={`z = 1.4 + 0.8i → w = z · (${scaleR}·e^(i·${rotDeg}°)) = ${wRe.toFixed(2)} ${wIm >= 0 ? '+' : '−'} ${Math.abs(wIm).toFixed(2)}i. Multiplicar complejos rota y escala el plano.`}
        >
          <svg viewBox="0 0 360 220" className="w-full max-w-[380px] mx-auto h-auto">
            <line x1="20" y1="110" x2="340" y2="110" stroke={p.grid} strokeWidth="1.4" />
            <line x1="180" y1="14" x2="180" y2="206" stroke={p.grid} strokeWidth="1.4" />
            <text x="328" y="102" fontSize="11" fill={p.pencil} fontFamily="monospace">Re</text>
            <text x="188" y="24" fontSize="11" fill={p.pencil} fontFamily="monospace">Im</text>
            {/* Original z */}
            <line x1="180" y1="110" x2={180 + zRe * 42} y2={110 - zIm * 42} stroke={p.cobalt} strokeWidth="2.5" />
            <circle cx={180 + zRe * 42} cy={110 - zIm * 42} r="5" fill={p.cobalt} />
            <text x={188 + zRe * 42} y={108 - zIm * 42} fontSize="12" fill={p.cobalt} fontFamily="monospace">z</text>
            {/* Rotated w */}
            <line x1="180" y1="110" x2={180 + wRe * 42} y2={110 - wIm * 42} stroke={p.vermilion} strokeWidth="2.8" />
            <circle cx={180 + wRe * 42} cy={110 - wIm * 42} r="5.5" fill={p.vermilion} />
            <text x={188 + wRe * 42} y={108 - wIm * 42} fontSize="12" fill={p.vermilion} fontFamily="monospace">w</text>
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M5: Lógica Proposicional, Conjuntos y Cuantificadores ────────────────── */
export function M5Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'truth' | 'venn' | 'quantifiers'>('truth');
  const [propP, setPropP] = useState(false);
  const [propQ, setPropQ] = useState(true);
  const [vennExpr, setVennExpr] = useState<'demorgan1' | 'demorgan2' | 'diff'>('demorgan1');
  const [grid, setGrid] = useState<boolean[][]>([
    [true, true, true, true],
    [true, false, true, true],
    [false, true, false, false],
    [true, true, true, false],
  ]);

  const toggleCell = (r: number, c: number) => {
    setGrid((g) => g.map((row, ri) => row.map((val, ci) => (ri === r && ci === c ? !val : val))));
  };

  const forallXexistsY = grid.every((row) => row.some(Boolean));
  const existsYforallX = [0, 1, 2, 3].some((c) => grid.every((row) => row[c]));

  const rows: Array<[boolean, boolean]> = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ];

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'truth', label: 'Tabla de verdad viva' },
          { id: 'venn', label: 'Venn y De Morgan' },
          { id: 'quantifiers', label: 'Cuadrícula ∀ vs ∃' },
        ]}
      />

      {tab === 'truth' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap items-center gap-2">
              <ActionBtn active={propP} onClick={() => setPropP((v) => !v)}>
                P = {propP ? 'V' : 'F'}
              </ActionBtn>
              <ActionBtn active={propQ} onClick={() => setPropQ((v) => !v)}>
                Q = {propQ ? 'V' : 'F'}
              </ActionBtn>
            </div>
          }
          caption="Observa la fila resaltada: P → Q solo es falsa cuando P = V y Q = F; por eso es lógicamente equivalente a ¬P ∨ Q."
        >
          <table className="w-full text-center font-mono text-[13.5px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--hairline-strong)] text-[var(--text-secondary)]">
                <th className="py-1.5">P</th>
                <th className="py-1.5">Q</th>
                <th className="py-1.5">P ∧ Q</th>
                <th className="py-1.5">P ∨ Q</th>
                <th className="py-1.5">P → Q</th>
                <th className="py-1.5">¬P ∨ Q</th>
                <th className="py-1.5">P ⊕ Q</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([rp, rq]) => {
                const active = rp === propP && rq === propQ;
                const imp = !rp || rq;
                return (
                  <tr
                    key={`${rp}-${rq}`}
                    onClick={() => { setPropP(rp); setPropQ(rq); }}
                    className={`border-b border-[var(--hairline)] cursor-pointer transition-colors ${
                      active ? 'bg-[var(--ui-accent)]/14 font-bold' : 'hover:bg-[var(--bg-surface)]/50'
                    }`}
                  >
                    <td className="py-2">{rp ? 'V' : 'F'}</td>
                    <td className="py-2">{rq ? 'V' : 'F'}</td>
                    <td className="py-2">{rp && rq ? 'V' : 'F'}</td>
                    <td className="py-2">{rp || rq ? 'V' : 'F'}</td>
                    <td className="py-2" style={{ color: imp ? p.sage : p.vermilion }}>{imp ? 'V' : 'F'}</td>
                    <td className="py-2" style={{ color: imp ? p.sage : p.vermilion }}>{imp ? 'V' : 'F'}</td>
                    <td className="py-2">{rp !== rq ? 'V' : 'F'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </VisualStageCard>
      )}

      {tab === 'venn' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap gap-2">
              <ActionBtn active={vennExpr === 'demorgan1'} onClick={() => setVennExpr('demorgan1')}>
                ¬(A ∪ B) = ¬A ∩ ¬B
              </ActionBtn>
              <ActionBtn active={vennExpr === 'demorgan2'} onClick={() => setVennExpr('demorgan2')}>
                ¬(A ∩ B) = ¬A ∪ ¬B
              </ActionBtn>
              <ActionBtn active={vennExpr === 'diff'} onClick={() => setVennExpr('diff')}>
                A \ B = A ∩ ¬B
              </ActionBtn>
            </div>
          }
          caption="Ambas expresiones de cada Ley de De Morgan sombrean exactamente la misma región del universo U."
        >
          <svg viewBox="0 0 380 190" className="w-full max-w-[400px] mx-auto h-auto">
            <rect
              x="20"
              y="16"
              width="340"
              height="158"
              rx="6"
              fill={vennExpr === 'demorgan1' || vennExpr === 'demorgan2' ? `${p.cobalt}22` : 'transparent'}
              stroke={p.ink}
              strokeWidth="1.6"
            />
            <text x="32" y="34" fontSize="11" fill={p.pencil} fontFamily="monospace">Universo U</text>

            {/* Circle A */}
            <circle
              cx="155"
              cy="96"
              r="54"
              fill={
                vennExpr === 'demorgan1'
                  ? p.bg
                  : vennExpr === 'diff'
                    ? `${p.cobalt}2E`
                    : `${p.cobalt}22`
              }
              stroke={p.cobalt}
              strokeWidth="2.2"
            />
            {/* Circle B */}
            <circle
              cx="225"
              cy="96"
              r="54"
              fill={
                vennExpr === 'demorgan1'
                  ? p.bg
                  : vennExpr === 'diff'
                    ? p.bg
                    : `${p.cobalt}22`
              }
              stroke={p.sage}
              strokeWidth="2.2"
            />
            {/* Intersection cutout for demorgan2 */}
            {vennExpr === 'demorgan2' && (
              <path
                d="M 190 54.5 A 54 54 0 0 1 190 137.5 A 54 54 0 0 1 190 54.5 Z"
                fill={p.bg}
                stroke={p.vermilion}
                strokeWidth="1.8"
                strokeDasharray="3 2"
              />
            )}
            <text x="128" y="99" fontSize="14" fontWeight="700" fill={p.cobalt} fontFamily="monospace">A</text>
            <text x="246" y="99" fontSize="14" fontWeight="700" fill={p.sage} fontFamily="monospace">B</text>
          </svg>
        </VisualStageCard>
      )}

      {tab === 'quantifiers' && (
        <VisualStageCard
          caption="Toca cualquier celda (x, y) para alternar P(x, y). Compara cómo cambiar el orden de ∀ y ∃ cambia la verdad."
        >
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div className="space-y-1">
              <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[12px]">
                <div />
                {[1, 2, 3, 4].map((y) => (
                  <div key={y} className="text-[var(--text-muted)]">y{y}</div>
                ))}
                {grid.map((row, r) => (
                  <div key={r} className="contents">
                    <div className="flex items-center justify-center text-[var(--text-muted)]">x{r + 1}</div>
                    {row.map((val, c) => (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        onClick={() => toggleCell(r, c)}
                        className="w-10 h-10 rounded border font-bold cursor-pointer transition-colors"
                        style={{
                          borderColor: val ? p.sage : p.grid,
                          backgroundColor: val ? `${p.sage}28` : 'transparent',
                          color: val ? p.sage : p.pencil,
                        }}
                      >
                        {val ? 'V' : 'F'}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 text-[13.5px] max-w-[300px]">
              <div className="p-2.5 rounded border border-[var(--hairline)]">
                <div className="font-mono text-[13px]">∀x ∃y P(x, y)</div>
                <div className="text-[12.5px] text-[var(--text-secondary)]">Cada fila tiene al menos un V:</div>
                <div className="font-bold mt-0.5" style={{ color: forallXexistsY ? p.sage : p.vermilion }}>
                  {forallXexistsY ? '✓ VERDADERO' : '✗ FALSO (hay fila vacía)'}
                </div>
              </div>
              <div className="p-2.5 rounded border border-[var(--hairline)]">
                <div className="font-mono text-[13px]">∃y ∀x P(x, y)</div>
                <div className="text-[12.5px] text-[var(--text-secondary)]">Existe una columna toda V:</div>
                <div className="font-bold mt-0.5" style={{ color: existsYforallX ? p.sage : p.vermilion }}>
                  {existsYforallX ? '✓ VERDADERO' : '✗ FALSO (ninguna columna llena)'}
                </div>
              </div>
            </div>
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}

/* ── M6: Técnicas de Demostración ─────────────────────────────────────────── */
export function M6Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'flow' | 'counter'>('flow');
  const [method, setMethod] = useState<'direct' | 'contra' | 'absurd'>('absurd');
  const [stepIdx, setStepIdx] = useState(3);
  const [claim, setClaim] = useState<'euler' | 'mersenne' | 'quad'>('euler');
  const [testN, setTestN] = useState(40);

  const proofs = {
    direct: [
      'Hipótesis: n es par → existe k ∈ ℤ con n = 2k.',
      'Sustituimos: n² = (2k)² = 4k² = 2(2k²).',
      'Como 2k² ∈ ℤ, concluimos que n² es par. ∎',
    ],
    contra: [
      'Queremos probar: n² par → n par.',
      'Contrapositiva equivalente: n impar → n² impar.',
      'Si n = 2k+1, entonces n² = 4k²+4k+1 = 2(2k²+2k)+1 (impar). ∎',
    ],
    absurd: [
      'Supón por absurdo: √2 = a/b con mcd(a, b) = 1.',
      'Elevamos al cuadrado: 2b² = a² → a² es par → a = 2k.',
      'Sustituimos: 2b² = 4k² → b² = 2k² → b también es par.',
      '⚡ CONTRADICCIÓN: a y b son pares, viola mcd(a, b) = 1. ∎',
    ],
  };

  const isPrime = (num: number) => {
    if (num < 2) return false;
    for (let d = 2; d * d <= num; d++) if (num % d === 0) return false;
    return true;
  };

  const evalClaim = (n: number) => {
    if (claim === 'euler') {
      const val = n * n + n + 41;
      return { expr: `${n}² + ${n} + 41 = ${val}`, holds: isPrime(val), hint: 'Prueba n = 40 o n = 41' };
    }
    if (claim === 'mersenne') {
      const val = Math.pow(2, n) - 1;
      return { expr: `2^${n} − 1 = ${val}`, holds: isPrime(val), hint: 'Prueba n = 4 o n = 11' };
    }
    return { expr: `${n}² = ${n * n} > 2·${n} = ${2 * n}`, holds: n * n > 2 * n, hint: 'Prueba n = 1 o n = 2' };
  };

  const res = evalClaim(testN);

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'flow', label: 'Flujo de demostración' },
          { id: 'counter', label: 'Cazador de contraejemplos' },
        ]}
      />

      {tab === 'flow' && (
        <VisualStageCard
          controls={
            <div className="flex flex-wrap items-center gap-2">
              <ActionBtn active={method === 'direct'} onClick={() => { setMethod('direct'); setStepIdx(2); }}>Directa</ActionBtn>
              <ActionBtn active={method === 'contra'} onClick={() => { setMethod('contra'); setStepIdx(2); }}>Contrapositiva</ActionBtn>
              <ActionBtn active={method === 'absurd'} onClick={() => { setMethod('absurd'); setStepIdx(3); }}>Contradicción (√2)</ActionBtn>
            </div>
          }
          caption="Avanza paso a paso para distinguir entre prueba directa, contrapositiva y reducción al absurdo."
        >
          <div className="space-y-2.5">
            {proofs[method].map((text, idx) => {
              const visible = idx <= stepIdx;
              const isBoom = text.startsWith('⚡');
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => setStepIdx(idx)}
                  className={`w-full text-left p-3 rounded border transition-all cursor-pointer ${
                    visible ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{
                    borderColor: isBoom && visible ? p.vermilion : idx === stepIdx ? p.cobalt : p.grid,
                    backgroundColor: isBoom && visible ? `${p.vermilion}14` : 'transparent',
                  }}
                >
                  <span className="font-mono text-[12px] text-[var(--text-muted)] mr-2">Paso {idx + 1}.</span>
                  <span className="text-[14px] text-[var(--text-primary)]">{text}</span>
                </button>
              );
            })}
          </div>
        </VisualStageCard>
      )}

      {tab === 'counter' && (
        <VisualStageCard
          controls={
            <>
              <div className="flex flex-wrap gap-1.5">
                <ActionBtn active={claim === 'euler'} onClick={() => { setClaim('euler'); setTestN(40); }}>
                  n² + n + 41 primo
                </ActionBtn>
                <ActionBtn active={claim === 'mersenne'} onClick={() => { setClaim('mersenne'); setTestN(4); }}>
                  2ⁿ − 1 primo
                </ActionBtn>
                <ActionBtn active={claim === 'quad'} onClick={() => { setClaim('quad'); setTestN(2); }}>
                  n² &gt; 2n (n ≥ 1)
                </ActionBtn>
              </div>
              <ParamSlider
                label="Valor de prueba n"
                value={testN}
                min={1}
                max={claim === 'euler' ? 42 : claim === 'mersenne' ? 12 : 8}
                onChange={setTestN}
              />
            </>
          }
          caption={`Un millón de casos verdaderos no demuestran ∀n; un solo contraejemplo refuta la conjetura. (${res.hint}).`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <div className="font-mono text-[17px] text-[var(--text-primary)] tabular-nums">
              n = {testN} → {res.expr}
            </div>
            <div
              className="font-display text-[20px]"
              style={{ color: res.holds ? p.sage : p.vermilion }}
            >
              {res.holds ? '✓ Cumple para este n (no prueba ∀n)' : '⚡ ¡CONTRAEJEMPLO! Conjetura refutada'}
            </div>
          </div>
        </VisualStageCard>
      )}
    </div>
  );
}
