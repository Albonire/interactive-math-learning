import type { CrayonToken } from './types';
import type { StudyModuleId } from './studyPlanTypes';

export interface GlossaryEntry {
  id: string;
  term: string;
  /** Case-insensitive surface forms matched in prose (longest matched first) */
  aliases: ReadonlyArray<string>;
  category: string;
  crayon: CrayonToken;
  intuition: string;
  latex?: string;
  marginExample: string;
  relatedModuleId: StudyModuleId;
}

export const GLOSSARY_ENTRIES: ReadonlyArray<GlossaryEntry> = [
  {
    id: 'binario',
    term: 'Sistema binario',
    aliases: ['binario', 'binaria', 'binarios', 'bits', 'bit'],
    category: 'Aritmética y Computación',
    crayon: 'cobalt',
    intuition:
      'Representación posicional en base 2 donde cada dígito (bit) solo puede ser 0 o 1 y pesa el doble que el de su derecha.',
    latex: 'n = \\sum_{k=0}^{m} b_k \\cdot 2^k',
    marginExample: '1011₂ = 8 + 0 + 2 + 1 = 11₁₀.',
    relatedModuleId: 'M1',
  },
  {
    id: 'hexadecimal',
    term: 'Notación hexadecimal',
    aliases: ['hexadecimal', 'hexadecimales'],
    category: 'Aritmética y Computación',
    crayon: 'plum',
    intuition:
      'Sistema en base 16 (0–9 y A–F) que empaqueta exactamente 4 bits por símbolo, ideal para direcciones de memoria y colores CSS.',
    latex: '\\text{0xFF} = 15\\cdot 16 + 15 = 255',
    marginExample: '1 byte (8 bits) cabe siempre en 2 dígitos hexadecimales.',
    relatedModuleId: 'M1',
  },
  {
    id: 'desbordamiento',
    term: 'Desbordamiento (Overflow)',
    aliases: ['desbordamiento', 'overflow'],
    category: 'Estabilidad Numérica',
    crayon: 'vermilion',
    intuition:
      'Ocurre cuando un cálculo produce un número más grande de lo que cabe en los bits asignados, dando la vuelta o convirtiéndose en infinito.',
    latex: '255 + 1 \\equiv 0 \\pmod{2^8}',
    marginExample: 'En float64, exp(710) desborda a Infinity y rompe un Softmax ingenuo.',
    relatedModuleId: 'M30',
  },
  {
    id: 'funcion',
    term: 'Función',
    aliases: ['función', 'funciones'],
    category: 'Fundamentos',
    crayon: 'cobalt',
    intuition:
      'Regla determinista que asigna a cada entrada del dominio exactamente una salida del codominio, como una máquina sin ambigüedad.',
    latex: 'f: A \\to B,\\quad x \\mapsto f(x)',
    marginExample: 'Dos entradas distintas pueden compartir salida, pero una entrada nunca produce dos salidas.',
    relatedModuleId: 'M3',
  },
  {
    id: 'biyeccion',
    term: 'Biyección',
    aliases: ['biyección', 'biyecciones', 'biyectiva', 'biyectivo'],
    category: 'Teoría de Conjuntos',
    crayon: 'sage',
    intuition:
      'Emparejamiento perfecto uno a uno entre dos conjuntos: nada queda sin pareja y ninguna salida se repite, por lo que existe función inversa.',
    latex: 'f^{-1}(f(x)) = x \\quad \\forall x \\in A',
    marginExample: 'Una matriz invertible es una biyección lineal entre ℝⁿ y ℝⁿ.',
    relatedModuleId: 'M8',
  },
  {
    id: 'inyectiva',
    term: 'Función inyectiva',
    aliases: ['inyectiva', 'inyectivas', 'inyectivo', 'inyección'],
    category: 'Teoría de Conjuntos',
    crayon: 'sage',
    intuition:
      'Ninguna salida recibe dos flechas: entradas distintas siempre producen salidas distintas. Puede sobrar codominio sin flecha.',
    latex: 'f(a) = f(b) \\implies a = b',
    marginExample: 'x ↦ 2x en los enteros es inyectiva, pero no sobreyectiva: ningún entero va al 3.',
    relatedModuleId: 'M8',
  },
  {
    id: 'sobreyectiva',
    term: 'Función sobreyectiva',
    aliases: ['sobreyectiva', 'sobreyectivas', 'sobreyectivo', 'suprayectiva'],
    category: 'Teoría de Conjuntos',
    crayon: 'sage',
    intuition:
      'Todo elemento del codominio recibe al menos una flecha: la imagen cubre el codominio completo. Puede haber salidas con varias flechas.',
    latex: '\\forall y \\in B\\; \\exists x \\in A:\\; f(x) = y',
    marginExample: 'x ↦ x² de ℝ en [0, ∞) es sobreyectiva, pero no inyectiva: 2 y −2 caen en 4.',
    relatedModuleId: 'M8',
  },
  {
    id: 'cuantificador',
    term: 'Cuantificador lógico',
    aliases: ['cuantificador', 'cuantificadores'],
    category: 'Lógica Matemática',
    crayon: 'plum',
    intuition:
      'Símbolos que indican alcance: ∀ ("para todo") exige que no haya ni un solo contraejemplo, mientras ∃ ("existe") pide al menos uno.',
    latex: '\\neg(\\forall x\\, P(x)) \\iff \\exists x\\, \\neg P(x)',
    marginExample: 'Cambiar el orden de ∀x ∃y a ∃y ∀x transforma por completo el significado.',
    relatedModuleId: 'M5',
  },
  {
    id: 'contradiccion',
    term: 'Demostración por contradicción',
    aliases: ['contradicción', 'reducción al absurdo'],
    category: 'Demostración',
    crayon: 'vermilion',
    intuition:
      'Para probar una afirmación, supones temporalmente que es falsa y deduces un absurdo lógico; así obligas a aceptar que era verdadera.',
    latex: '(\\neg P \\implies \\bot) \\implies P',
    marginExample: 'Así se prueba que √2 es irracional y que existen infinitos números primos.',
    relatedModuleId: 'M6',
  },
  {
    id: 'contrapositiva',
    term: 'Contrapositiva',
    aliases: ['contrapositiva', 'contrarrecíproca', 'contrarrecíproco'],
    category: 'Lógica',
    crayon: 'plum',
    intuition:
      'La implicación "si P entonces Q" es lógicamente equivalente a "si no Q entonces no P". La recíproca "si Q entonces P", en cambio, no lo es.',
    latex: '(P \\Rightarrow Q) \\iff (\\neg Q \\Rightarrow \\neg P)',
    marginExample: 'Para probar "si n² es par, n es par" basta probar "si n es impar, n² es impar".',
    relatedModuleId: 'M6',
  },
  {
    id: 'contraejemplo',
    term: 'Contraejemplo',
    aliases: ['contraejemplo', 'contraejemplos'],
    category: 'Lógica',
    crayon: 'vermilion',
    intuition:
      'Un único caso concreto donde la hipótesis se cumple y la conclusión falla basta para refutar una afirmación universal. Mil ejemplos a favor no la prueban.',
    latex: '\\neg\\,\\forall x\\, P(x) \\iff \\exists x\\, \\neg P(x)',
    marginExample: '"n² + n + 41 siempre es primo" falla en n = 40: da 1681 = 41².',
    relatedModuleId: 'M6',
  },
  {
    id: 'induccion',
    term: 'Inducción matemática',
    aliases: ['inducción', 'inductivo', 'inductiva', 'paso inductivo', 'caso base'],
    category: 'Matemática Discreta',
    crayon: 'ochre',
    intuition:
      'Efecto dominó formal: pruebas que cae la primera ficha (caso base) y que cualquier ficha derriba a la siguiente (paso inductivo).',
    latex: 'P(1) \\land \\forall k\\,(P(k)\\Rightarrow P(k+1)) \\implies \\forall n\\, P(n)',
    marginExample: 'Es la gemela teórica de la recursión: el caso base detiene la cadena y el paso la propaga.',
    relatedModuleId: 'M7',
  },
  {
    id: 'recursion',
    term: 'Recursión y memoización',
    aliases: ['recursión', 'recursiva', 'recursivo', 'recursivas', 'recursivos', 'memoización'],
    category: 'Discretas y Computación',
    crayon: 'ochre',
    intuition:
      'Definir un objeto o un cálculo en términos de versiones más pequeñas de sí mismo, con un caso base que corta la cadena. Memoizar guarda resultados ya calculados para no repetirlos.',
    latex: 'F(n) = F(n-1) + F(n-2),\\quad F(0)=0,\\; F(1)=1',
    marginExample: 'Fibonacci recursivo ingenuo hace un número exponencial de llamadas; memoizado hace n + 1.',
    relatedModuleId: 'M7',
  },
  {
    id: 'cardinalidad',
    term: 'Cardinalidad',
    aliases: ['cardinalidad', 'numerable', 'no numerable', 'diagonal de Cantor'],
    category: 'Matemática Discreta',
    crayon: 'plum',
    intuition:
      'Medida del tamaño de un conjunto mediante biyecciones; revela que el infinito de los reales ℝ es estrictamente mayor que el de ℕ.',
    latex: '|\\mathbb{N}| = \\aleph_0 < |\\mathbb{R}| = 2^{\\aleph_0}',
    marginExample: 'Hay tantos números pares como enteros positivos, pero los reales no caben en ninguna lista.',
    relatedModuleId: 'M8',
  },
  {
    id: 'asintotico',
    term: 'Notación asintótica (Big-O)',
    aliases: ['asintótica', 'asintótico', 'Big-O', 'complejidad'],
    category: 'Algoritmos y Series',
    crayon: 'cobalt',
    intuition:
      'Describe cómo crece el costo de un algoritmo o una suma cuando el tamaño de entrada n se vuelve muy grande, ignorando constantes menores.',
    latex: 'f(n) = O(g(n)) \\iff \\exists\\, c > 0,\\, n_0:\\; \\forall n \\ge n_0,\\; f(n) \\le c\\,g(n)',
    marginExample: 'Búsqueda binaria O(log n) encuentra 1 elemento entre 1 millón en solo 20 pasos.',
    relatedModuleId: 'M9',
  },
  {
    id: 'modular',
    term: 'Aritmética modular',
    aliases: ['aritmética modular', 'modular', 'congruencia', 'congruencias', 'módulo n'],
    category: 'Teoría de Números',
    crayon: 'ochre',
    intuition:
      'Aritmética sobre un reloj circular de n horas: solo importa el residuo al dividir entre n, base de tablas hash y criptografía RSA.',
    latex: 'a \\equiv b \\pmod{n} \\iff n \\mid (a - b)',
    marginExample: 'En un reloj de 12 horas, 10 + 5 ≡ 3 (mod 12).',
    relatedModuleId: 'M10',
  },
  {
    id: 'grafo',
    term: 'Grafo y DAG',
    aliases: ['grafo', 'grafos', 'DAG', 'árbol de expansión', 'topológico'],
    category: 'Estructuras Discretas',
    crayon: 'sage',
    intuition:
      'Colección de vértices unidos por aristas que modela redes, rutas y dependencias. Un DAG es un grafo dirigido sin ciclos.',
    latex: 'G = (V, E)',
    marginExample: 'Una red feedforward y el árbol de dependencias de npm se ordenan y evalúan sobre un DAG.',
    relatedModuleId: 'M12',
  },
  {
    id: 'limite',
    term: 'Límite y continuidad',
    aliases: ['límite', 'límites', 'continuidad', 'discontinuidad', 'épsilon-delta'],
    category: 'Cálculo',
    crayon: 'cobalt',
    intuition:
      'El valor al que se acerca f(x) cuando x se aproxima arbitrariamente a un punto a, sin importar qué ocurra exactamente en x = a.',
    latex: '\\lim_{x\\to a} f(x) = L',
    marginExample: 'Es un juego de precisión: para cualquier banda ε que exijas, existe un radio δ que la cumple.',
    relatedModuleId: 'M13',
  },
  {
    id: 'derivada',
    term: 'Derivada',
    aliases: ['derivada', 'derivadas', 'pendiente', 'recta tangente', 'tasa de cambio'],
    category: 'Cálculo Diferencial',
    crayon: 'vermilion',
    intuition:
      'Mejor aproximación lineal local de una curva: mide cuán rápido cambia la salida ante un empujón infinitesimal en la entrada.',
    latex: 'f\'(x) = \\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}',
    marginExample: 'Si miras con lupa una curva suave, casi siempre se ve como una línea recta de pendiente f\'(x).',
    relatedModuleId: 'M14',
  },
  {
    id: 'integral',
    term: 'Integral definida',
    aliases: ['integral', 'integrales', 'Riemann', 'antiderivada'],
    category: 'Cálculo Integral',
    crayon: 'sage',
    intuition:
      'Acumulación continua de infinitas rebanadas diminutas: mide áreas, volúmenes, probabilidad acumulada y trabajo físico.',
    latex: '\\int_a^b f(x)\\,dx = F(b) - F(a)',
    marginExample: 'El Teorema Fundamental conecta acumular (integrar) con medir la tasa de cambio (derivar).',
    relatedModuleId: 'M15',
  },
  {
    id: 'taylor',
    term: 'Serie de Taylor',
    aliases: ['serie de Taylor', 'polinomio de Taylor', 'Taylor'],
    category: 'Análisis',
    crayon: 'plum',
    intuition:
      'Aproxima funciones complejas (como sen x o eˣ) mediante polinomios construidos con sus derivadas en un punto.',
    latex: 'f(x) \\approx \\sum_{k=0}^{n} \\frac{f^{(k)}(a)}{k!}(x-a)^k',
    marginExample: 'Con solo x − x³/6, ya aproximas sin(x) con gran precisión cerca del origen.',
    relatedModuleId: 'M16',
  },
  {
    id: 'convergencia',
    term: 'Convergencia',
    aliases: ['convergencia', 'converge', 'convergen', 'convergente', 'radio de convergencia'],
    category: 'Cálculo y Análisis',
    crayon: 'sage',
    intuition:
      'Una sucesión, serie o algoritmo converge cuando sus valores se estabilizan cada vez más cerca de un único límite, tan cerca como se exija.',
    latex: '\\forall \\varepsilon > 0\\; \\exists N:\\; n \\ge N \\implies |a_n - L| < \\varepsilon',
    marginExample: '1/2 + 1/4 + 1/8 + ⋯ converge a 1; en cambio 1 + 1/2 + 1/3 + ⋯ crece sin cota.',
    relatedModuleId: 'M16',
  },
  {
    id: 'gradiente',
    term: 'Gradiente (∇f)',
    aliases: ['gradiente', 'gradientes', 'derivadas parciales', 'hessiana', 'jacobiana'],
    category: 'Cálculo Multivariable',
    crayon: 'vermilion',
    intuition:
      'Vector que reúne todas las derivadas parciales y apunta exactamente en la dirección de máxima subida sobre una superficie.',
    latex: '\\nabla f(x,y) = \\left(\\frac{\\partial f}{\\partial x},\\; \\frac{\\partial f}{\\partial y}\\right)',
    marginExample: 'Para minimizar un error en Machine Learning, caminas siempre en sentido opuesto: −∇f.',
    relatedModuleId: 'M17',
  },
  {
    id: 'vector',
    term: 'Vector y espacio vectorial',
    aliases: ['vector', 'vectores', 'espacio vectorial', 'transformación lineal', 'matriz', 'matrices'],
    category: 'Álgebra Lineal',
    crayon: 'cobalt',
    intuition:
      'Objeto con magnitud y dirección que puede sumarse y escalarse. Una matriz no es solo una tabla: es una transformación que deforma el espacio.',
    latex: 'T(c\\vec{u} + d\\vec{v}) = c\\,T(\\vec{u}) + d\\,T(\\vec{v})',
    marginExample: 'Las columnas de una matriz te dicen exactamente dónde aterrizan los vectores base î y ĵ.',
    relatedModuleId: 'M18',
  },
  {
    id: 'determinante',
    term: 'Determinante',
    aliases: ['determinante', 'determinantes', 'singular', 'invertible'],
    category: 'Álgebra Lineal',
    crayon: 'ochre',
    intuition:
      'Factor por el que una transformación lineal escala áreas o volúmenes. Si es negativo voltea el espacio; si es 0, lo aplasta.',
    latex: '\\det(A) = \\text{Volumen firmado del paralelepípedo}',
    marginExample: 'Si det(A) = 0, dos direcciones colapsaron y la matriz ya no tiene inversa.',
    relatedModuleId: 'M18',
  },
  {
    id: 'subespacio',
    term: 'Rango y subespacios',
    aliases: ['subespacio', 'subespacios', 'espacio nulo', 'espacio columna', 'rango', 'span'],
    category: 'Álgebra Lineal',
    crayon: 'sage',
    intuition:
      'El rango cuenta cuántas dimensiones sobreviven tras aplicar la matriz A; el espacio nulo agrupa todo lo que A aplasta al cero.',
    latex: '\\dim C(A^\\top) + \\dim N(A) = n',
    marginExample: 'Proyectar un cuarto 3D sobre una sombra 2D tiene rango 2 y espacio nulo de dimensión 1.',
    relatedModuleId: 'M20',
  },
  {
    id: 'ortogonalidad',
    term: 'Ortogonalidad y proyección',
    aliases: ['ortogonalidad', 'ortogonal', 'ortogonales', 'proyección', 'mínimos cuadrados', 'Gram-Schmidt'],
    category: 'Álgebra Lineal',
    crayon: 'cobalt',
    intuition:
      'Dos vectores son ortogonales cuando su producto punto es cero (90°). Proyectar encuentra la sombra más cercana posible sobre un subespacio.',
    latex: '\\hat{x} = (A^\\top A)^{-1} A^\\top b,\\quad e \\perp C(A)',
    marginExample: 'En regresión lineal, el vector de residuos es estrictamente perpendicular al plano de predicciones.',
    relatedModuleId: 'M21',
  },
  {
    id: 'eigen',
    term: 'Eigenvalores y Eigenvectores',
    aliases: ['eigenvalor', 'eigenvalores', 'eigenvector', 'eigenvectores', 'autovalor', 'autovalores', 'autovector', 'autovectores', 'espectral'],
    category: 'Álgebra Lineal',
    crayon: 'plum',
    intuition:
      'Direcciones privilegiadas que una matriz no saca de su recta: solo las estira, encoge o invierte por un factor escalar λ (su eigenvalor).',
    latex: 'A\\vec{v} = \\lambda\\vec{v}',
    marginExample: 'Una rotación en 3D deja fijo su eje: ese eje es un eigenvector con λ = 1.',
    relatedModuleId: 'M22',
  },
  {
    id: 'svd',
    term: 'Descomposición SVD',
    aliases: ['SVD', 'valores singulares', 'PCA', 'rango bajo'],
    category: 'Álgebra Lineal y ML',
    crayon: 'sage',
    intuition:
      'Descompone CUALQUIER matriz en tres gestos geométricos simples: rotar (Vᵀ), estirar en ejes ortogonales (Σ) y volver a rotar (U).',
    latex: 'A = U\\,\\Sigma\\,V^\\top = \\sum_{i=1}^r \\sigma_i \\vec{u}_i \\vec{v}_i^\\top',
    marginExample: 'Quedarse solo con los k mayores valores singulares comprime imágenes y extrae componentes PCA.',
    relatedModuleId: 'M23',
  },
  {
    id: 'bayes',
    term: 'Teorema de Bayes',
    aliases: ['Bayes', 'probabilidad condicional', 'a priori', 'a posteriori', 'verosimilitud'],
    category: 'Probabilidad',
    crayon: 'ochre',
    intuition:
      'Regla matemática para actualizar tus creencias cuando llega evidencia nueva, ponderando cuán rara era la hipótesis inicialmente.',
    latex: 'P(H\\mid E) = \\frac{P(E\\mid H)\\,P(H)}{P(E)}',
    marginExample: 'Con sensibilidad y especificidad del 95% y una prevalencia del 1%, solo ~16% de los positivos están realmente enfermos.',
    relatedModuleId: 'M24',
  },
  {
    id: 'distribucion',
    term: 'Distribución y esperanza',
    aliases: ['distribución', 'distribuciones', 'esperanza', 'varianza', 'gaussiana', 'distribución normal', 'campana normal'],
    category: 'Probabilidad y Estadística',
    crayon: 'cobalt',
    intuition:
      'Mapa de cómo se reparte la masa de probabilidad. La esperanza E[X] es el centro de equilibrio; la varianza mide cuánto se dispersa.',
    latex: '\\operatorname{Var}(X) = \\mathbb{E}[(X - \\mu)^2]',
    marginExample: 'En una campana normal, el 68.3% de los casos vive dentro de ±1 desviación estándar.',
    relatedModuleId: 'M25',
  },
  {
    id: 'covarianza',
    term: 'Covarianza y correlación',
    aliases: ['covarianza', 'covarianzas', 'correlación', 'matriz de covarianza'],
    category: 'Probabilidad',
    crayon: 'ochre',
    intuition:
      'Mide si dos variables tienden a moverse juntas (positiva) u opuestas (negativa). La correlación la normaliza a [−1, 1] y solo detecta relaciones lineales.',
    latex: '\\operatorname{Cov}(X,Y) = \\mathbb{E}[(X-\\mu_X)(Y-\\mu_Y)],\\quad \\rho = \\frac{\\operatorname{Cov}(X,Y)}{\\sigma_X\\sigma_Y}',
    marginExample: 'Si Y = X² con X simétrica en torno a 0, la correlación es 0 aunque Y dependa por completo de X.',
    relatedModuleId: 'M26',
  },
  {
    id: 'tlc',
    term: 'Teorema del Límite Central',
    aliases: ['límite central', 'TLC', 'teorema del límite central'],
    category: 'Inferencia Estadística',
    crayon: 'sage',
    intuition:
      'Al promediar muchas variables independientes e idénticamente distribuidas con varianza finita, la media estandarizada converge a una campana normal, sea cual sea la forma inicial.',
    latex: '\\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\xrightarrow{d} \\mathcal{N}(0, 1)',
    marginExample: 'Medias de dados (uniformes) ya forman una campana con n ≈ 30; el ancho se reduce como σ/√n.',
    relatedModuleId: 'M26',
  },
  {
    id: 'lgn',
    term: 'Ley de los grandes números',
    aliases: ['ley de grandes números', 'ley de los grandes números', 'LGN'],
    category: 'Probabilidad',
    crayon: 'cobalt',
    intuition:
      'La media muestral de observaciones independientes se acerca a la esperanza verdadera a medida que crece n. Habla del valor de la media, no de su forma (eso es el TLC).',
    latex: '\\bar{X}_n \\xrightarrow{p} \\mu \\quad (n \\to \\infty)',
    marginExample: 'La fracción de caras de una moneda justa se estabiliza cerca de 0.5, aunque las rachas nunca desaparecen.',
    relatedModuleId: 'M26',
  },
  {
    id: 'backprop',
    term: 'Backpropagation y AutoDiff',
    aliases: ['backpropagation', 'AutoDiff', 'regla de la cadena', 'diferenciación automática'],
    category: 'Deep Learning',
    crayon: 'vermilion',
    intuition:
      'Aplica la regla de la cadena hacia atrás sobre el grafo computacional para obtener millones de gradientes en un solo barrido.',
    latex: '\\frac{\\partial L}{\\partial w} = \\frac{\\partial L}{\\partial z}\\cdot\\frac{\\partial z}{\\partial w}',
    marginExample: 'Cada nodo recuerda su derivada local del paso Forward y la multiplica al recibir el gradiente de vuelta.',
    relatedModuleId: 'M28',
  },
  {
    id: 'optimizacion',
    term: 'Convexidad y Momentum',
    aliases: ['convexidad', 'convexo', 'convexa', 'descenso de gradiente', 'momentum', 'Adam', 'tasa de aprendizaje'],
    category: 'Optimización',
    crayon: 'sage',
    intuition:
      'En una función convexa todo mínimo local es global. Momentum añade inercia física para amortiguar zigzags en valles estrechos.',
    latex: 'v_{t+1} = \\beta v_t + \\nabla f(\\theta_t),\\quad \\theta_{t+1} = \\theta_t - \\alpha v_{t+1}',
    marginExample: 'Imagina una canica pesada rodando por un cañón curvo en lugar de dar pasos sin memoria.',
    relatedModuleId: 'M29',
  },
  {
    id: 'softmax',
    term: 'Softmax estable',
    aliases: ['Softmax', 'softmax', 'punto flotante', 'IEEE-754', 'estabilidad numérica'],
    category: 'Métodos Numéricos',
    crayon: 'cobalt',
    intuition:
      'Convierte puntuaciones arbitrarias (logits) en probabilidades que suman 1. Restar max(z) antes de exponenciar evita desbordamientos.',
    latex: '\\operatorname{softmax}(z)_i = \\frac{e^{z_i - \\max(z)}}{\\sum_j e^{z_j - \\max(z)}}',
    marginExample: 'Restar la misma constante a todos los logits no cambia ni una milésima las probabilidades.',
    relatedModuleId: 'M30',
  },
  {
    id: 'entropia',
    term: 'Entropía y Divergencia KL',
    aliases: ['entropía', 'entropía cruzada', 'divergencia KL', 'información mutua', 'Shannon'],
    category: 'Teoría de la Información',
    crayon: 'plum',
    intuition:
      'La entropía mide la sorpresa promedio (en bits) de una fuente aleatoria; la divergencia KL mide los bits extra desperdiciados al usar un modelo aproximado Q.',
    latex: 'D_{\\text{KL}}(P \\parallel Q) = \\sum_x P(x)\\log_2\\frac{P(x)}{Q(x)} \\ge 0',
    marginExample: 'Entrenar un clasificador con cross-entropy equivale a minimizar D_KL(P ∥ Q).',
    relatedModuleId: 'M31',
  },
  {
    id: 'grupo',
    term: 'Grupos y simetría',
    aliases: ['teoría de grupos', 'grupo diédrico', 'grupos de simetría', 'grupo de simetrías', 'estructura de grupo', 'tabla de Cayley'],
    category: 'Álgebra Abstracta',
    crayon: 'ochre',
    intuition:
      'Estructura algebraica que captura todas las transformaciones reversibles (rotaciones, reflexiones) que dejan invariante un objeto.',
    latex: 'r\\cdot s \\neq s\\cdot r \\quad (D_4\\text{ no es abeliano})',
    marginExample: 'Girar un cuadrado 90° y voltearlo produce un resultado distinto a voltearlo primero y girarlo.',
    relatedModuleId: 'M32',
  },
  {
    id: 'conforme',
    term: 'Transformación conforme',
    aliases: ['transformación conforme', 'mapeo conforme', 'función conforme', 'conformes'],
    category: 'Análisis Complejo',
    crayon: 'plum',
    intuition:
      'Una función compleja derivable con f′(z) ≠ 0 conserva ángulos (y orientación) en cada punto: localmente gira y escala, como multiplicar por el número complejo f′(z).',
    latex: 'f(z) \\approx f(z_0) + f\'(z_0)\\,(z - z_0)',
    marginExample: 'z ↦ z² dobla los ángulos en el origen (allí f′ = 0), pero los conserva en cualquier otro punto.',
    relatedModuleId: 'M32',
  },
];

export type GlossaryToken =
  | { type: 'text'; value: string }
  | { type: 'term'; value: string; entry: GlossaryEntry };

const ALIAS_LOOKUP = new Map<string, GlossaryEntry>();
const SORTED_ALIASES: string[] = [];

for (const entry of GLOSSARY_ENTRIES) {
  for (const alias of entry.aliases) {
    const key = alias.toLocaleLowerCase('es');
    if (!ALIAS_LOOKUP.has(key)) {
      ALIAS_LOOKUP.set(key, entry);
      SORTED_ALIASES.push(alias);
    }
  }
}

SORTED_ALIASES.sort((a, b) => b.length - a.length);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MATCH_REGEX = new RegExp(
  `(?<![\\p{L}\\p{N}_])(${SORTED_ALIASES.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])`,
  'giu'
);

/**
 * Splits a Spanish prose string into plain text and interactive Crayón Diccionario terms.
 * Guarantees longest-match-first, Unicode word-boundary safety, and optional dedupe per paragraph
 * so prose stays airy and readable without over-underlining repeated occurrences.
 */
export function tokenizeGlossaryText(
  text: string,
  options: { maxHighlights?: number; dedupePerBlock?: boolean } = {}
): GlossaryToken[] {
  const { maxHighlights = 6, dedupePerBlock = true } = options;
  if (!text) return [];

  const tokens: GlossaryToken[] = [];
  const seenIds = new Set<string>();
  let highlightCount = 0;
  let lastIndex = 0;

  MATCH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MATCH_REGEX.exec(text)) !== null) {
    const matchedText = match[0];
    const start = match.index;
    const entry = ALIAS_LOOKUP.get(matchedText.toLocaleLowerCase('es'));
    if (!entry) continue;
    if (highlightCount >= maxHighlights) break;
    if (dedupePerBlock && seenIds.has(entry.id)) continue;

    if (start > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    tokens.push({ type: 'term', value: matchedText, entry });
    seenIds.add(entry.id);
    highlightCount += 1;
    lastIndex = start + matchedText.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}

export function getGlossaryEntryById(id: string): GlossaryEntry | undefined {
  return GLOSSARY_ENTRIES.find((e) => e.id === id);
}
