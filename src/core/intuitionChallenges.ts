/**
 * Challenges that open chapter I ("Toca la intuición") of a module.
 *
 * Instead of showing a solved diagram, the module asks the learner to make something happen with
 * their hands, step by step. Each visual reports its live state (useReportVisualState); a step is
 * met when its `check` holds. Steps go from "find it" to a twist that exposes the key idea.
 */
import type { StudyModuleId } from './studyPlanTypes';

export type VisualState = Record<string, unknown>;

export interface ChallengeStep {
  prompt: string;
  hint: string;
  /** What the learner should notice once it works. */
  insight: string;
  check: (s: VisualState) => boolean;
}

const n = (v: unknown): number => (typeof v === 'number' ? v : Number.NaN);
const near = (a: unknown, b: number, tol: number): boolean => Math.abs(n(a) - b) <= tol;

export const INTUITION_CHALLENGES: Partial<Record<StudyModuleId, ChallengeStep[]>> = {
  M1: [
    {
      prompt: 'Toca los bits para encenderlos o apagarlos hasta formar el 100.',
      hint: 'Busca la mayor potencia de 2 que cabe en 100 y resta: 100 = 64 + …',
      insight: '100 = 64 + 32 + 4 = 01100100₂: cada bit encendido suma su peso.',
      check: (s) => s.tab === 'bases' && s.decimal === 100,
    },
    {
      prompt: 'Forma el número más grande que caben en estos 8 bits.',
      hint: 'Enciéndelos todos.',
      insight: '11111111₂ = 255 = 2⁸ − 1: un byte guarda 256 valores, del 0 al 255.',
      check: (s) => s.tab === 'bases' && s.decimal === 255,
    },
    {
      prompt: 'Escribe 45 y míralo en base 16. ¿Cuántas cifras necesita?',
      hint: 'Ajusta el valor decimal y pulsa "Base 16".',
      insight: '45 = 2D₁₆: cada cifra hexadecimal resume exactamente 4 bits (0010 1101).',
      check: (s) => s.tab === 'bases' && s.decimal === 45 && s.base === 16,
    },
  ],
  M2: [
    {
      prompt: 'Reparte el cuadrado para que (a + b)² valga 49 con a distinto de b.',
      hint: '(a + b)² = 49 significa que el lado completo mide 7.',
      insight: 'El total es 49 aunque a² + b² sea menor: los dos rectángulos ab ponen el resto.',
      check: (s) => s.tab === 'areas' && near(n(s.a) + n(s.b), 7, 0.05) && !near(s.a, n(s.b), 0.05),
    },
    {
      prompt: 'Ahora consigue que a² + b² sea exactamente la mitad del área total.',
      hint: 'La mitad sale cuando a² + b² = 2ab. ¿Qué relación entre a y b lo cumple?',
      insight: 'a² + b² − 2ab = (a − b)² = 0: solo ocurre cuando a = b.',
      check: (s) => s.tab === 'areas' && near(s.a, n(s.b), 0.05) && n(s.a) > 0,
    },
  ],
  M3: [
    {
      prompt: 'Este mapeo no es una función. Arréglalo: cada x debe tener exactamente una flecha.',
      hint: 'Mira las x marcadas en rojo: a una le sobra una flecha y a otra le falta.',
      insight: 'Ser función solo pide una salida por entrada; las y pueden repetirse.',
      check: (s) => s.tab === 'mapping' && s.isFunction === true,
    },
    {
      prompt: 'Ahora haz que siga siendo función pero NO sea inyectiva.',
      hint: 'Haz que dos x apunten a la misma y.',
      insight: 'No inyectiva: dos entradas distintas comparten salida, así que no se puede invertir.',
      check: (s) => s.tab === 'mapping' && s.isFunction === true && s.isInjective === false,
    },
    {
      prompt: 'Por último, conviértela en una biyección.',
      hint: 'Cada y debe recibir exactamente una flecha.',
      insight: 'Con una biyección puedes invertir todas las flechas y obtener f⁻¹.',
      check: (s) => s.tab === 'mapping' && s.isFunction === true && s.isInjective === true && s.isSurjective === true,
    },
  ],
  M4: [
    {
      prompt: 'Gira el punto hasta un ángulo donde seno y coseno valgan exactamente lo mismo.',
      hint: 'Busca donde el punto está a la misma altura que distancia horizontal al centro.',
      insight: 'Ocurre en 45° y en 225°: sobre la diagonal y = x del círculo unitario.',
      check: (s) => s.tab === 'trig' && [45, 225].some((a) => Math.abs(n(s.deg) - a) <= 1),
    },
    {
      prompt: 'Ahora lleva el punto a donde cos θ = −1.',
      hint: 'El coseno es la sombra horizontal: el punto más a la izquierda del círculo.',
      insight: 'θ = 180° = π rad: media vuelta deja el punto en (−1, 0).',
      check: (s) => s.tab === 'trig' && Math.abs(n(s.deg) - 180) <= 1,
    },
    {
      prompt: 'Encuentra un ángulo con seno negativo y coseno positivo.',
      hint: 'Seno negativo: por debajo del eje. Coseno positivo: a la derecha.',
      insight: 'Es el cuarto cuadrante, entre 270° y 360°: abajo a la derecha.',
      check: (s) => s.tab === 'trig' && n(s.deg) > 270 && n(s.deg) < 360,
    },
  ],
  M5: [
    {
      prompt: 'En la tabla de verdad, elige P y Q para que P → Q sea falsa.',
      hint: 'Una promesa "si P entonces Q" solo se rompe de una manera.',
      insight: 'P → Q solo es falsa con P verdadera y Q falsa: la promesa se rompió.',
      check: (s) => s.tab === 'truth' && s.p === true && s.q === false,
    },
    {
      prompt: 'En Cuantificadores, consigue que ∃y ∀x sea verdadero: una misma y que sirva para todas las x.',
      hint: 'Llena por completo una de las columnas.',
      insight: 'Una sola y que funciona para todas las x: eso pide ∃y ∀x.',
      check: (s) => s.tab === 'quantifiers' && s.existsYforallX === true,
    },
    {
      prompt: 'Ahora rompe ∀x ∃y: deja a alguna x sin ninguna y.',
      hint: 'Vacía una fila entera.',
      insight: 'Basta una x sin pareja para que "para toda x existe y" falle: el orden de los cuantificadores importa.',
      check: (s) => s.tab === 'quantifiers' && s.forallXexistsY === false,
    },
  ],
  M6: [
    {
      prompt: 'En el cazador de contraejemplos, refuta "n² + n + 41 siempre es primo".',
      hint: 'Prueba valores de n hasta que la fórmula deje de dar un primo.',
      insight: 'De n = 0 a 39 da primos, pero n = 40 da 1681 = 41²: un solo caso tumba el "siempre".',
      check: (s) => s.tab === 'counter' && s.claim === 'euler' && s.holds === false,
    },
    {
      prompt: 'Ahora refuta "2ⁿ − 1 es primo cuando n es primo" con un n primo.',
      hint: 'n = 2, 3, 5 y 7 funcionan. Sigue con el siguiente primo… y el otro.',
      insight: 'Con n = 11, 2¹¹ − 1 = 2047 = 23 · 89: que n sea primo no basta.',
      check: (s) => s.tab === 'counter' && s.claim === 'mersenne' && [2, 3, 5, 7, 11].includes(n(s.n)) && s.holds === false,
    },
  ],
  M7: [
    {
      prompt: 'Con el caso base verdadero, rompe la cadena de fichas.',
      hint: 'Haz que el paso P(k) → P(k+1) falle en algún k.',
      insight: 'Una sola brecha en el paso inductivo detiene la cadena: la prueba ya no cubre todo n.',
      check: (s) => s.tab === 'domino' && s.baseOk === true && s.stepOk === false && s.pushed === true,
    },
    {
      prompt: 'Ahora arregla el paso pero rompe el caso base, y empuja.',
      hint: 'Paso verdadero, caso base roto, fichas empujadas.',
      insight: 'Sin la primera ficha no cae ninguna: el paso inductivo solo traslada una verdad que ya exista.',
      check: (s) => s.tab === 'domino' && s.baseOk === false && s.stepOk === true && s.pushed === true,
    },
  ],
  M9: [
    {
      prompt: 'Elige cuántos escalones hacen falta para que la escalera sume 28 bloques.',
      hint: 'n(n + 1)/2 = 28.',
      insight: 'n = 7: dos escaleras forman un rectángulo 7 × 8 = 56, y una sola es la mitad.',
      check: (s) => s.tab === 'stair' && s.nStair === 7,
    },
  ],
  M11: [
    {
      prompt: 'Toca en el triángulo una casilla C(n, k) que valga 10.',
      hint: 'Busca en la fila 5.',
      insight: 'C(5, 2) = C(5, 3) = 10: elegir 2 de 5 es lo mismo que dejar fuera 3.',
      check: (s) => s.tab === 'pascal' && s.value === 10,
    },
    {
      prompt: 'En el palomar, garantiza al menos 3 palomas en alguna caja usando las mínimas palomas posibles.',
      hint: 'Con 2 por caja aún nadie tiene 3. ¿Cuántas hacen falta para forzarlo?',
      insight: 'Con c cajas hacen falta 2c + 1 palomas: la siguiente siempre cae donde ya hay dos.',
      check: (s) => s.tab === 'pigeon' && n(s.pigeons) === 2 * n(s.holes) + 1,
    },
  ],
  M14: [
    {
      prompt: 'Acerca x₀ + h a x₀ hasta que la secante sea prácticamente la tangente.',
      hint: 'Reduce h al mínimo.',
      insight: 'Con h → 0 la pendiente secante tiende a la derivada f′(x₀).',
      check: (s) => s.tab === 'secant' && n(s.h) <= 0.051,
    },
    {
      prompt: 'Encuentra un punto x₀ donde la tangente sea horizontal.',
      hint: 'f(x) = x³/3 − x + 1, así que f′(x) = x² − 1.',
      insight: 'f′(x₀) = 0 en x₀ = ±1: un máximo local en −1 y un mínimo local en 1.',
      check: (s) => s.tab === 'secant' && Math.abs(n(s.x0) * n(s.x0) - 1) < 0.06,
    },
  ],
  M18: [
    {
      prompt: 'Arrastra î y ĵ hasta que la matriz aplaste el plano en una recta.',
      hint: 'Pon los dos vectores en la misma dirección.',
      insight: 'det A = 0: el área del cuadrado unidad desaparece y la transformación no se puede deshacer.',
      check: (s) => Math.abs(n(s.det)) < 0.05,
    },
    {
      prompt: 'Ahora haz que la transformación invierta la orientación del plano.',
      hint: 'Cruza ĵ al otro lado de î.',
      insight: 'det A < 0: el plano se refleja, como verlo en un espejo.',
      check: (s) => n(s.det) < -0.05,
    },
  ],
  M20: [
    {
      prompt: 'Configura una matriz de 4 filas y 6 columnas con rango 3.',
      hint: 'Filas m = 4, columnas n = 6, rango r = 3.',
      insight: 'dim N(A) = n − r = 3: tres direcciones de ℝ⁶ se aplastan a cero.',
      check: (s) => s.m === 4 && s.n === 6 && s.r === 3,
    },
    {
      prompt: 'Haz que el espacio nulo sea solo el vector cero.',
      hint: 'El rango tiene que alcanzar el número de columnas.',
      insight: 'Rango igual al número de columnas: las columnas son independientes y Ax = 0 solo tiene x = 0.',
      check: (s) => s.r === s.n,
    },
  ],
  M21: [
    {
      prompt: 'Ajusta pendiente e intercepto hasta que la suma de cuadrados baje de 0,12.',
      hint: 'Mira los cuadrados rojos: hazlos lo más pequeños posible a la vez.',
      insight: 'El mínimo (0,78x + 0,55, suma ≈ 0,098) es la recta de mínimos cuadrados.',
      check: (s) => n(s.sse) < 0.12,
    },
  ],
  M23: [
    {
      prompt: 'Conserva al menos el 99,5 % de la energía con el menor rango k posible.',
      hint: 'Cada σᵢ aporta σᵢ² de energía; los primeros aportan casi todo.',
      insight: 'k = 3 basta (99,7 %): las otras tres componentes son casi ruido.',
      check: (s) => s.k === 3 && n(s.energy) >= 99.5,
    },
  ],
  M25: [
    {
      prompt: 'Haz que la binomial sea simétrica.',
      hint: 'La simetría depende solo de p.',
      insight: 'Con p = 0,5 éxito y fracaso pesan igual y la distribución se refleja en n/2.',
      check: (s) => s.dist === 'binom' && Math.abs(n(s.p) - 0.5) < 1e-3,
    },
    {
      prompt: 'Con n = 16 ensayos, coloca la media exactamente en 12.',
      hint: 'E[X] = n·p.',
      insight: 'p = 0,75 da 16 · 0,75 = 12: la esperanza se desplaza con p.',
      check: (s) => s.dist === 'binom' && s.n === 16 && Math.abs(n(s.n) * n(s.p) - 12) < 0.02,
    },
  ],
  M26: [
    {
      prompt: 'Con la población bimodal, sube el tamaño de muestra hasta 25 o más.',
      hint: 'Elige "Bimodal" y aumenta n.',
      insight: 'Aunque la población tiene dos jorobas, las medias forman una sola campana: el TCL en acción.',
      check: (s) => s.source === 'bimodal' && n(s.sampleN) >= 25,
    },
  ],
  M27: [
    {
      prompt: 'Haz que el MAP coincida exactamente con el MLE.',
      hint: 'Busca un prior que no empuje hacia ningún lado.',
      insight: 'Con prior Beta(1, 1) (uniforme) el MAP es el MLE: solo hablan los datos.',
      check: (s) => s.tab === 'bayes' && Math.abs(n(s.map) - n(s.mle)) < 1e-9,
    },
    {
      prompt: 'Sin cambiar los datos, haz que el MAP quede por debajo de 0,5.',
      hint: 'Un prior que crea mucho en la cruz.',
      insight: 'Un prior fuerte arrastra la estimación: con pocos datos, la creencia previa pesa mucho.',
      check: (s) => s.tab === 'bayes' && s.heads === 7 && s.tails === 3 && n(s.map) < 0.5,
    },
  ],
  M28: [
    {
      prompt: 'Ajusta w y b hasta que la pérdida sea prácticamente cero.',
      hint: 'L = ½(w·2 + b − 5)²: hace falta w·2 + b = 5.',
      insight: 'Con L = 0 ambos gradientes se anulan: el descenso ya no tiene hacia dónde moverse.',
      check: (s) => n(s.loss) < 0.01,
    },
  ],
  M30: [
    {
      prompt: 'Sube los logits hasta encontrar el primer valor en que el softmax ingenuo falla.',
      hint: 'exp(z) desborda en float64 un poco por encima de z = 709.',
      insight: 'exp(710 + 2) = ∞ y ∞/∞ = NaN; restar el máximo evita el desborde sin cambiar el resultado.',
      check: (s) => s.tab === 'softmax' && s.naiveBroken === true && n(s.scaleZ) <= 710,
    },
  ],
  M10: [
    {
      prompt: 'Encuentra un salto a que NO tenga inverso módulo n.',
      hint: 'Con n primo todos los saltos tienen inverso. Prueba con un n compuesto.',
      insight: 'Sin inverso exactamente cuando mcd(a, n) > 1: el reloj nunca pasa por 1.',
      check: (s) => s.tab === 'clock' && s.hasInverse === false,
    },
    {
      prompt: 'Ahora encuentra un a ≠ 1 que sea su propio inverso: a·a ≡ 1 (mod n).',
      hint: 'Prueba a = n − 1, que es lo mismo que −1 módulo n.',
      insight: '(n − 1)² = n² − 2n + 1 ≡ 1: −1 siempre es su propio inverso.',
      check: (s) => s.tab === 'clock' && s.hasInverse === true && s.inverse === s.a && s.a !== 1,
    },
  ],
  M13: [
    {
      prompt: 'El retador exige ε = 0,20 o menos. Encuentra una ventana δ que funcione.',
      hint: 'Arrastra primero el borde verde hacia abajo y luego estrecha el azul.',
      insight: 'Para cada ε hay un δ: eso es exactamente lo que significa que el límite exista.',
      check: (s) => s.kind !== 'jump' && n(s.eps) <= 0.2 + 1e-9 && s.insideBand === true,
    },
    {
      prompt: 'Cambia a "Salto (sin límite)" con ε = 0,30 o menos y busca un δ.',
      hint: 'Estrecha δ cuanto quieras y mira si la curva entra en la banda.',
      insight: 'Ningún δ sirve: los dos lados se quedan a alturas distintas, así que no hay límite.',
      check: (s) => s.kind === 'jump' && n(s.eps) <= 0.3 + 1e-9,
    },
  ],
  M15: [
    {
      prompt: 'Arrastra el límite b hasta que el área bajo la curva valga 2.',
      hint: 'El área es F(b) = 0,15b³ + 0,4b. Mira el valor exacto en el pie.',
      insight: 'F(2) = 1,2 + 0,8 = 2: el área acumulada crece al ritmo f(b).',
      check: (s) => near(s.exact, 2, 0.05),
    },
    {
      prompt: 'Con ese b, sube n hasta que Riemann y la integral difieran en menos de 0,01.',
      hint: 'Más rectángulos, más finos: el error se encoge.',
      insight: 'Refinar la partición hace converger la suma de Riemann a la integral.',
      check: (s) => near(s.exact, 2, 0.05) && Math.abs(n(s.approx) - n(s.exact)) < 0.01,
    },
  ],
  M17: [
    {
      prompt: 'En el cuenco, lleva el punto a un lugar donde ∇f apunte en horizontal.',
      hint: '∇f = (2x, 3y): la componente vertical se anula cuando y = 0.',
      insight: 'Sobre el eje x las curvas de nivel son verticales, y ∇f las cruza a 90°.',
      check: (s) => s.surface === 'bowl' && Math.abs(n(s.gy)) < 0.12 && Math.abs(n(s.gx)) > 0.5,
    },
    {
      prompt: 'Ahora lleva el punto al lugar donde ∇f = 0.',
      hint: 'Es donde no hay subida en ninguna dirección.',
      insight: 'En el fondo del cuenco no hay dirección de subida: ∇f se anula en el mínimo.',
      check: (s) => Math.abs(n(s.gx)) < 0.12 && Math.abs(n(s.gy)) < 0.12,
    },
    {
      prompt: 'Cambia a "Punto silla" y encuentra un punto donde ∇f apunte hacia abajo en el mapa.',
      hint: 'En x² − y² la componente vertical de ∇f es −2y.',
      insight: 'En la silla, subir en y es bajar en f: la superficie cae a lo largo de ese eje.',
      check: (s) => s.surface === 'saddle' && n(s.gy) < -0.6 && Math.abs(n(s.gx)) < 0.3,
    },
  ],
  M19: [
    {
      prompt: 'Encuentra la receta (x, y) que lleva x·c₁ + y·c₂ justo hasta b.',
      hint: 'Arrastra el punto en la imagen de filas hasta el cruce, o la punta en la de columnas hasta b.',
      insight: 'El cruce de las rectas (filas) y la receta que llega a b (columnas) son la misma solución.',
      check: (s) => s.solved === true,
    },
  ],
  M24: [
    {
      prompt: 'Haz que un resultado positivo signifique más de un 50 % de probabilidad de estar enfermo.',
      hint: 'Con una enfermedad rara dominan los falsos positivos.',
      insight: 'P(E | +) depende tanto de la prevalencia como del test: la tasa base manda.',
      check: (s) => n(s.posterior) > 0.5,
    },
    {
      prompt: 'Ahora con una prevalencia de 2 % o menos, consigue de nuevo más del 50 %.',
      hint: 'Solo queda bajar mucho los falsos positivos.',
      insight: 'Para enfermedades raras hace falta una especificidad altísima.',
      check: (s) => n(s.prevalence) <= 2 && n(s.posterior) > 0.5,
    },
  ],
  M31: [
    {
      prompt: 'Si la realidad es p(A) = 0,90, lleva la entropía cruzada a su mínimo posible.',
      hint: 'La entropía cruzada nunca baja de H(p); el sobrecoste es la KL.',
      insight: 'El mínimo se alcanza con q = p: entonces la KL vale 0.',
      check: (s) => near(s.p1, 0.9, 0.001) && near(s.q1, 0.9, 0.001),
    },
    {
      prompt: 'Ahora haz que el modelo pague más de 2 bits extra (KL > 2).',
      hint: 'Que el modelo esté muy seguro de lo contrario a la realidad.',
      insight: 'Un modelo confiado y equivocado paga muchísimo: −log q explota cuando q → 0.',
      check: (s) => n(s.kl) > 2,
    },
  ],
};
