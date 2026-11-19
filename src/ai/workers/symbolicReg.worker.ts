/**
 * Native Web Worker for Evolutionary Symbolic Regression (Scene 2.4).
 * Evolves a population of symbolic candidate genomes over basis functions
 * [sin(x), cos(y), 0.25*(x^2 - y^2), 0.35*(x*y), exp(-0.55*r^2)]
 * using tournament selection, blend crossover, Gaussian mutation, and elitism.
 */

interface StartMessage {
  type: 'start';
  targetWeights: [number, number, number, number, number];
  gridSize: number;
  seed: number;
}

interface StopMessage {
  type: 'stop';
}

type IncomingMsg = StartMessage | StopMessage;

interface Genome {
  weights: [number, number, number, number, number];
  mse: number;
}

let timerId: ReturnType<typeof setInterval> | null = null;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function evalBasis(
  x: number,
  y: number,
  w: [number, number, number, number, number]
): number {
  const r2 = x * x + y * y;
  return (
    w[0] * Math.sin(x) +
    w[1] * Math.cos(y) +
    w[2] * 0.25 * (x * x - y * y) +
    w[3] * 0.35 * (x * y) +
    w[4] * Math.exp(-0.55 * r2)
  );
}

function formatFormula(w: [number, number, number, number, number]): string {
  const terms: Array<[number, string]> = [
    [w[0], 'sin(x)'],
    [w[1], 'cos(y)'],
    [w[2], '0.25(x²-y²)'],
    [w[3], '0.35xy'],
    [w[4], 'exp(-0.55r²)'],
  ];
  const active = terms
    .filter(([coeff]) => Math.abs(coeff) >= 0.04)
    .map(([coeff, name], idx) => {
      const sign = coeff < 0 ? (idx === 0 ? '-' : ' - ') : idx === 0 ? '' : ' + ';
      return `${sign}${Math.abs(coeff).toFixed(2)}·${name}`;
    });
  return active.length > 0 ? active.join('') : '0.00';
}

self.onmessage = (event: MessageEvent<IncomingMsg>) => {
  const msg = event.data;

  if (msg.type === 'stop') {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    return;
  }

  if (msg.type === 'start') {
    if (timerId !== null) clearInterval(timerId);

    const rng = mulberry32(msg.seed || 1337);
    const gridN = msg.gridSize || 25;
    const sampleN = 9;
    const samplePoints: Array<[number, number, number]> = [];

    for (let i = 0; i < sampleN; i++) {
      const x = -2 + (4 * i) / (sampleN - 1);
      for (let j = 0; j < sampleN; j++) {
        const y = -2 + (4 * j) / (sampleN - 1);
        samplePoints.push([x, y, evalBasis(x, y, msg.targetWeights)]);
      }
    }

    const evaluateMse = (w: [number, number, number, number, number]): number => {
      let sum = 0;
      for (let k = 0; k < samplePoints.length; k++) {
        const [x, y, tgt] = samplePoints[k];
        const diff = evalBasis(x, y, w) - tgt;
        sum += diff * diff;
      }
      return sum / samplePoints.length;
    };

    const popSize = 42;
    let population: Genome[] = Array.from({ length: popSize }, () => {
      const w: [number, number, number, number, number] = [
        (rng() - 0.5) * 2.2,
        (rng() - 0.5) * 2.2,
        (rng() - 0.5) * 2.2,
        (rng() - 0.5) * 2.2,
        (rng() - 0.5) * 2.2,
      ];
      return { weights: w, mse: evaluateMse(w) };
    });

    let generation = 0;

    const tournament = (): Genome => {
      let best = population[Math.floor(rng() * popSize)];
      for (let k = 0; k < 3; k++) {
        const candidate = population[Math.floor(rng() * popSize)];
        if (candidate.mse < best.mse) best = candidate;
      }
      return best;
    };

    const evolveStep = () => {
      generation++;
      population.sort((a, b) => a.mse - b.mse);
      const eliteCount = 4;
      const nextPop: Genome[] = population.slice(0, eliteCount).map((g) => ({
        weights: [...g.weights] as [number, number, number, number, number],
        mse: g.mse,
      }));

      const mutScale = Math.max(0.03, 0.32 * Math.exp(-generation * 0.035));

      while (nextPop.length < popSize) {
        const p1 = tournament();
        const p2 = tournament();
        const childW: [number, number, number, number, number] = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
          const alpha = rng();
          let val = alpha * p1.weights[i] + (1 - alpha) * p2.weights[i];
          if (rng() < 0.45) {
            val += (rng() - 0.5) * 2 * mutScale;
          }
          // Sparsity pruning mutation
          if (rng() < 0.04) {
            val = 0;
          }
          childW[i] = Math.max(-1.5, Math.min(1.5, val));
        }
        nextPop.push({ weights: childW, mse: evaluateMse(childW) });
      }

      population = nextPop;
      population.sort((a, b) => a.mse - b.mse);
      const best = population[0];

      // Evaluate visual height grid as transferable Float32Array
      const grid = new Float32Array(gridN * gridN);
      for (let i = 0; i < gridN; i++) {
        const x = -2 + (4 * i) / (gridN - 1);
        for (let j = 0; j < gridN; j++) {
          const y = -2 + (4 * j) / (gridN - 1);
          grid[i * gridN + j] = evalBasis(x, y, best.weights);
        }
      }

      (self as unknown as Worker).postMessage(
        {
          type: 'generation',
          generation,
          bestFormula: formatFormula(best.weights),
          aiMse: best.mse,
          aiGrid: grid,
          done: generation >= 90 || best.mse < 0.0012,
        },
        [grid.buffer]
      );

      if (generation >= 90 || best.mse < 0.0012) {
        if (timerId !== null) {
          clearInterval(timerId);
          timerId = null;
        }
      }
    };

    evolveStep();
    timerId = setInterval(evolveStep, 160);
  }
};
