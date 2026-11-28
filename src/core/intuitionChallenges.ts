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
