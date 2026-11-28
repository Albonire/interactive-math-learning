import { useRef, useState } from 'react';
import {
  ActionBtn,
  DiagramDragHandle,
  InkScrubNumber,
  ParamSlider,
  SketchXYPad,
  VisualModeTabs,
  VisualStageCard,
  clientToSvgPoint,
  useReportVisualState,
  useVisualPalette,
  type ModuleVisualProps,
} from './VisualHelpers';

/* ── M24: Probabilidad, Condicionalidad y Teorema de Bayes ────────────────── */
export function M24Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [prevalence, setPrevalence] = useState(5); // %
  const [sensitivity, setSensitivity] = useState(95); // %
  const [falsePos, setFalsePos] = useState(10); // %
  const [dragging, setDragging] = useState(false);
  const bayesSvgRef = useRef<SVGSVGElement | null>(null);

  const prior = prevalence / 100;
  const sens = sensitivity / 100;
  const fp = falsePos / 100;
  const tp = prior * sens;
  const fn = prior * (1 - sens);
  const fpArea = (1 - prior) * fp;
  const tnArea = (1 - prior) * (1 - fp);
  const posterior = tp / Math.max(1e-9, tp + fpArea);

  const splitX = 24 + prior * 240;
  const leftSplitY = 20 + sens * 180;
  const rightSplitY = 20 + fp * 180;

  useReportVisualState({ prevalence, sensitivity, falsePos, posterior });
  return (
    <VisualStageCard
      controls={
        <>
          <InkScrubNumber label="Prevalencia P(E):" value={prevalence} min={1} max={50} unit="%" crayon="sage" onChange={setPrevalence} />
          <InkScrubNumber label="Sensibilidad P(+|E):" value={sensitivity} min={50} max={99} unit="%" crayon="cobalt" onChange={setSensitivity} />
          <InkScrubNumber label="Falso + P(+|¬E):" value={falsePos} min={1} max={40} unit="%" crayon="vermilion" onChange={setFalsePos} />
        </>
      }
      caption={`Cuadrado unidad de Bayes: arrastra el nodo interior para variar prevalencia y sensibilidad. P(E | +) = VP / (VP + FP) = ${(posterior * 100).toFixed(1)}%.`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-around gap-5">
        <svg
          ref={bayesSvgRef}
          viewBox="0 0 290 220"
          className="w-[260px] h-auto shrink-0 select-none"
          onPointerMove={(e) => {
            if (!dragging || !bayesSvgRef.current) return;
            const pt = clientToSvgPoint(bayesSvgRef.current, e.clientX, e.clientY);
            const nextPrev = Math.round(Math.max(1, Math.min(50, ((pt.x - 24) / 240) * 100)));
            const nextSens = Math.round(Math.max(50, Math.min(99, ((pt.y - 20) / 180) * 100)));
            setPrevalence(nextPrev);
            setSensitivity(nextSens);
          }}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* VP */}
          <rect x="24" y="20" width={splitX - 24} height={leftSplitY - 20} fill={`${p.sage}44`} stroke={p.sage} strokeWidth="1.6" />
          {/* FN */}
          <rect x="24" y={leftSplitY} width={splitX - 24} height={200 - leftSplitY} fill={`${p.cobalt}22`} stroke={p.cobalt} strokeWidth="1.2" />
          {/* FP */}
          <rect x={splitX} y="20" width={264 - splitX} height={rightSplitY - 20} fill={`${p.vermilion}38`} stroke={p.vermilion} strokeWidth="1.6" />
          {/* VN */}
          <rect x={splitX} y={rightSplitY} width={264 - splitX} height={200 - rightSplitY} fill={`${p.grid}30`} stroke={p.grid} strokeWidth="1.2" />
          <text x="24" y="14" fontSize="11" fill={p.sage} fontFamily="monospace">E ({prevalence}%)</text>
          <text x="264" y="14" textAnchor="end" fontSize="11" fill={p.vermilion} fontFamily="monospace">¬E ({100 - prevalence}%)</text>
          <DiagramDragHandle
            cx={splitX}
            cy={leftSplitY}
            color={p.cobalt}
            paperBg={p.bg}
            label="Arrastrar cruce de prevalencia y sensibilidad"
            active={dragging}
            onPointerDown={(e) => {
              e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
              setDragging(true);
            }}
          />
        </svg>

        <div className="space-y-2 font-mono text-[13px] tabular-nums">
          <div className="text-[16px] font-bold" style={{ color: p.sage }}>
            P(Enfermo | Test +) = {(posterior * 100).toFixed(1)}%
          </div>
          <div>Verdaderos Positivos (VP): {(tp * 1000).toFixed(1)} / 1000</div>
          <div style={{ color: p.vermilion }}>Falsos Positivos (FP): {(fpArea * 1000).toFixed(1)} / 1000</div>
          <div className="text-[var(--text-muted)]">Falsos Negativos (FN): {(fn * 1000).toFixed(1)} / 1000</div>
          <div className="text-[var(--text-muted)]">Verdaderos Negativos (VN): {(tnArea * 1000).toFixed(1)} / 1000</div>
        </div>
      </div>
    </VisualStageCard>
  );
}

/* ── M25: Variables Aleatorias y Distribuciones ───────────────────────────── */
export function M25Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [dist, setDist] = useState<'binom' | 'normal'>('binom');
  const [n, setN] = useState(10);
  const [prob, setProb] = useState(0.4);
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);

  const comb = (nn: number, kk: number) => {
    let r = 1;
    for (let i = 1; i <= kk; i++) r = (r * (nn - i + 1)) / i;
    return r;
  };
  const meanBinom = n * prob;
  const sdBinom = Math.sqrt(n * prob * (1 - prob));
  const bars = Array.from({ length: n + 1 }, (_, k) => ({
    k,
    p: comb(n, k) * Math.pow(prob, k) * Math.pow(1 - prob, n - k),
  }));
  const maxP = Math.max(...bars.map((b) => b.p), 0.05);

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex gap-1.5">
            <ActionBtn active={dist === 'binom'} onClick={() => setDist('binom')}>Binomial(n, p)</ActionBtn>
            <ActionBtn active={dist === 'normal'} onClick={() => setDist('normal')}>Normal(μ, σ²)</ActionBtn>
          </div>
          {dist === 'binom' ? (
            <>
              <ParamSlider label="Ensayos n" value={n} min={4} max={16} onChange={setN} />
              <ParamSlider label="Probabilidad p" value={prob} min={0.1} max={0.9} step={0.05} onChange={setProb} />
            </>
          ) : (
            <SketchXYPad
              xLabel="Media μ"
              yLabel="Desviación σ"
              x={mu}
              y={sigma}
              xMin={-2}
              xMax={2}
              yMin={0.4}
              yMax={2}
              xStep={0.1}
              yStep={0.1}
              xDisplay={mu.toFixed(1)}
              yDisplay={sigma.toFixed(1)}
              crayon="cobalt"
              theme={theme}
              seed={251}
              onChange={(nx, ny) => {
                setMu(nx);
                setSigma(ny);
              }}
            />
          )}
        </>
      }
      caption={
        dist === 'binom'
          ? `Fulcro de esperanza E[X] = np = ${meanBinom.toFixed(2)} (triángulo bermellón) · Desviación σ = ${sdBinom.toFixed(2)}.`
          : `Normal(μ=${mu.toFixed(1)}, σ=${sigma.toFixed(1)}): el 68.3% del área cae en [μ−σ, μ+σ] (banda salvia).`
      }
    >
      {dist === 'binom' ? (
        <svg viewBox="0 0 540 205" className="w-full h-auto max-h-[225px]">
          <line x1="35" y1="168" x2="505" y2="168" stroke={p.ink} strokeWidth="1.6" />
          {bars.map((b) => {
            const bw = 450 / (n + 1);
            const x = 45 + b.k * bw;
            const h = (b.p / maxP) * 135;
            return (
              <g key={b.k}>
                <rect x={x + 2} y={168 - h} width={Math.max(4, bw - 4)} height={h} fill={`${p.cobalt}34`} stroke={p.cobalt} strokeWidth="1.4" />
                <text x={x + bw / 2} y="183" textAnchor="middle" fontSize="10" fill={p.pencil} fontFamily="monospace">{b.k}</text>
              </g>
            );
          })}
          {/* Fulcrum at E[X] */}
          {(() => {
            const fx = 45 + (meanBinom + 0.5) * (450 / (n + 1));
            return <polygon points={`${fx},170 ${fx - 8},196 ${fx + 8},196`} fill={p.vermilion} />;
          })()}
        </svg>
      ) : (
        <svg viewBox="0 0 540 205" className="w-full h-auto max-h-[225px]">
          {(() => {
            const mapX = (x: number) => 270 + x * 52;
            const pdf = (x: number) => Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
            const peak = pdf(mu);
            const mapY = (y: number) => 176 - (y / Math.max(peak, 0.45)) * 140;
            return (
              <>
                <rect
                  x={mapX(mu - sigma)}
                  y="24"
                  width={mapX(mu + sigma) - mapX(mu - sigma)}
                  height="152"
                  fill={`${p.sage}20`}
                />
                <line x1="20" y1="176" x2="520" y2="176" stroke={p.ink} strokeWidth="1.5" />
                <path
                  d={Array.from({ length: 81 }, (_, i) => {
                    const x = -4.5 + (i / 80) * 9;
                    return `${i === 0 ? 'M' : 'L'} ${mapX(x)} ${mapY(pdf(x))}`;
                  }).join(' ')}
                  fill="none"
                  stroke={p.cobalt}
                  strokeWidth="2.6"
                />
                <line x1={mapX(mu)} y1="24" x2={mapX(mu)} y2="176" stroke={p.vermilion} strokeWidth="2" strokeDasharray="4 3" />
              </>
            );
          })()}
        </svg>
      )}
    </VisualStageCard>
  );
}

/* ── M26: Distribuciones Conjuntas y Teorema Central del Límite ───────────── */
export function M26Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [source, setSource] = useState<'uniform' | 'skewed' | 'bimodal'>('skewed');
  const [sampleN, setSampleN] = useState(12);
  const [seed, setSeed] = useState(1);

  // Deterministic PRNG for reproducible clean CLT histogram
  const drawOne = (s: { v: number }) => {
    s.v = (s.v * 1664525 + 1013904223) >>> 0;
    const u = s.v / 4294967296;
    if (source === 'uniform') return u;
    if (source === 'skewed') return Math.pow(u, 3);
    return u < 0.5 ? 0.15 + u * 0.25 : 0.72 + (u - 0.5) * 0.25;
  };

  const bins = Array.from({ length: 18 }, () => 0);
  const state = { v: 1337 + seed * 997 + sampleN * 31 };
  const trials = 400;
  for (let t = 0; t < trials; t++) {
    let sum = 0;
    for (let i = 0; i < sampleN; i++) sum += drawOne(state);
    const avg = sum / sampleN;
    const idx = Math.min(bins.length - 1, Math.max(0, Math.floor(avg * bins.length)));
    bins[idx]++;
  }
  const maxBin = Math.max(...bins, 1);

  return (
    <VisualStageCard
      controls={
        <>
          <div className="flex flex-wrap gap-1.5">
            <ActionBtn active={source === 'uniform'} onClick={() => setSource('uniform')}>Uniforme</ActionBtn>
            <ActionBtn active={source === 'skewed'} onClick={() => setSource('skewed')}>Muy sesgada (U³)</ActionBtn>
            <ActionBtn active={source === 'bimodal'} onClick={() => setSource('bimodal')}>Bimodal</ActionBtn>
          </div>
          <ParamSlider label="Tamaño de muestra n" value={sampleN} min={1} max={30} onChange={setSampleN} />
          <ActionBtn onClick={() => setSeed((s) => s + 1)}>Nueva simulación (400 medias)</ActionBtn>
        </>
      }
      caption={`Teorema Central del Límite: con n = 1 ves la población original; al subir a n = ${sampleN}, la distribución de las 400 medias muestrales converge a una campana Gaussiana cuya anchura se encoge como σ/√n.`}
    >
      <svg viewBox="0 0 540 190" className="w-full h-auto max-h-[210px]">
        <line x1="25" y1="165" x2="515" y2="165" stroke={p.ink} strokeWidth="1.5" />
        {bins.map((count, i) => {
          const bw = 480 / bins.length;
          const h = (count / maxBin) * 140;
          return (
            <rect
              key={i}
              x={30 + i * bw + 1}
              y={165 - h}
              width={bw - 2}
              height={h}
              fill={`${p.sage}38`}
              stroke={p.sage}
              strokeWidth="1.3"
            />
          );
        })}
      </svg>
    </VisualStageCard>
  );
}

/* ── M27: Inferencia Estadística, MLE, MAP y Bayesiana ────────────────────── */
export function M27Visual({ theme }: ModuleVisualProps) {
  const p = useVisualPalette(theme);
  const [tab, setTab] = useState<'bayes' | 'ci'>('bayes');
  const [heads, setHeads] = useState(7);
  const [tails, setTails] = useState(3);
  const [alpha0, setAlpha0] = useState(3);
  const [beta0, setBeta0] = useState(3);

  const postA = alpha0 + heads;
  const postB = beta0 + tails;
  const mle = heads / Math.max(1, heads + tails);
  const map = (postA - 1) / Math.max(1e-6, postA + postB - 2);

  // Unnormalized Beta density for plotting on [0, 1]
  const betaCurve = (a: number, b: number) => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const t = 0.01 + (i / 60) * 0.98;
      return { t, v: Math.pow(t, a - 1) * Math.pow(1 - t, b - 1) };
    });
    const peak = Math.max(...pts.map((pt) => pt.v), 1e-9);
    return pts.map((pt) => ({ t: pt.t, y: pt.v / peak }));
  };
  const priorPts = betaCurve(alpha0, beta0);
  const postPts = betaCurve(postA, postB);

  return (
    <div>
      <VisualModeTabs
        theme={theme}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'bayes', label: 'Prior → Posterior (MLE vs MAP)' },
          { id: 'ci', label: '20 Intervalos de Confianza (95%)' },
        ]}
      />

      {tab === 'bayes' && (
        <VisualStageCard
          controls={
            <>
              <ParamSlider label="Prior α₀" value={alpha0} min={1} max={8} onChange={setAlpha0} />
              <ParamSlider label="Prior β₀" value={beta0} min={1} max={8} onChange={setBeta0} />
              <ActionBtn onClick={() => setHeads((h) => h + 1)}>+1 Éxito ({heads})</ActionBtn>
              <ActionBtn onClick={() => setTails((t) => t + 1)}>+1 Fracaso ({tails})</ActionBtn>
              <ActionBtn onClick={() => { setHeads(7); setTails(3); }}>Reiniciar datos</ActionBtn>
            </>
          }
          caption={`MLE (solo datos) = ${mle.toFixed(3)} · MAP (con prior Beta(${alpha0},${beta0})) = ${map.toFixed(3)}. Al acumular más datos, el posterior se afila y el prior pierde peso.`}
        >
          <svg viewBox="0 0 540 200" className="w-full h-auto max-h-[220px]">
            <line x1="40" y1="170" x2="500" y2="170" stroke={p.ink} strokeWidth="1.5" />
            <path
              d={priorPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${40 + pt.t * 460} ${170 - pt.y * 125}`).join(' ')}
              fill="none"
              stroke={p.pencil}
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            <path
              d={postPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${40 + pt.t * 460} ${170 - pt.y * 138}`).join(' ')}
              fill="none"
              stroke={p.cobalt}
              strokeWidth="2.8"
            />
            <line x1={40 + mle * 460} y1="22" x2={40 + mle * 460} y2="170" stroke={p.vermilion} strokeWidth="2" strokeDasharray="3 3" />
            <line x1={40 + map * 460} y1="22" x2={40 + map * 460} y2="170" stroke={p.sage} strokeWidth="2.2" />
            <text x={40 + mle * 460} y="16" textAnchor="middle" fontSize="11" fill={p.vermilion} fontFamily="monospace">MLE</text>
            <text x={40 + map * 460} y="188" textAnchor="middle" fontSize="11" fill={p.sage} fontFamily="monospace">MAP</text>
          </svg>
        </VisualStageCard>
      )}

      {tab === 'ci' && (
        <VisualStageCard caption="Interpretación frecuentista correcta: de 20 intervalos construidos con el mismo método al 95%, ~19 cubren el parámetro verdadero θ (línea azul) y ~1 falla (bermellón).">
          <svg viewBox="0 0 540 210" className="w-full h-auto max-h-[230px]">
            <line x1="270" y1="12" x2="270" y2="198" stroke={p.cobalt} strokeWidth="2" strokeDasharray="4 3" />
            {Array.from({ length: 20 }, (_, i) => {
              const offset = Math.sin(i * 3.1 + 0.5) * 44 + (i === 13 ? 72 : 0);
              const center = 270 + offset;
              const half = 48;
              const covers = center - half <= 270 && center + half >= 270;
              const y = 18 + i * 9.2;
              return (
                <g key={i}>
                  <line
                    x1={center - half}
                    y1={y}
                    x2={center + half}
                    y2={y}
                    stroke={covers ? p.sage : p.vermilion}
                    strokeWidth="2.4"
                  />
                  <circle cx={center} cy={y} r="2.6" fill={covers ? p.sage : p.vermilion} />
                </g>
              );
            })}
            <text x="275" y="16" fontSize="11" fill={p.cobalt} fontFamily="monospace">θ real</text>
          </svg>
        </VisualStageCard>
      )}
    </div>
  );
}
