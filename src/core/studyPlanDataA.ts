import type { StudyModuleSpec } from './studyPlanTypes';

/**
 * Phases 1, 2, and 3 (Modules M1 to M17) from PLAN_ESTUDIO.md.
 * Every checkpoint strictly adheres to Regla fija R-OM (balanced option length & real misconceptions).
 */
export const STUDY_MODULES_A: StudyModuleSpec[] = [
  // ==================== FASE 1: FUNDAMENTOS (M1–M6) ====================
  {
    id: 'M1',
    number: 1,
    phaseId: 'phase-1',
    level: '1',
    crayon: 'cobalt',
    title: 'Números, operaciones y sistemas de numeración',
    shortLabel: 'Números y Bases',
    prerequisites: [],
    syllabus: [
      '1.1 Enteros y recta numérica',
      '1.2 Fracciones y proporciones',
      '1.3 Potencias y raíces',
      '1.4 Orden de operaciones',
      '1.5 Notación científica',
      '1.6 Bases 2, 8 y 16',
    ],
    pureMathFocus:
      'El número como posición en una recta y como objeto con estructura algebraica (cierre, neutros e inversos); las leyes de potencias se justifican a partir del conteo de factores.',
    appliedCsMlFocus:
      'Representación binaria, desbordamiento de enteros, operaciones con bits y notación hexadecimal en memoria y colores CSS.',
    visualSpecs: [
      {
        concept: 'Cambio de base',
        visualization: 'Tabla posicional con fichas',
        format: 'W',
        params: 'base (2, 8, 10, 16) y número',
        intuition: 'Cada posición vale exactamente base^k.',
      },
      {
        concept: 'Suma con signo',
        visualization: 'Recta numérica con saltos',
        format: 'W',
        params: 'punto inicial y salto',
        intuition: 'Restar es desplazarse en sentido opuesto sobre la recta.',
      },
      {
        concept: 'Fracción equivalente',
        visualization: 'Barras subdivididas superpuestas',
        format: 'W',
        params: 'numerador, denominador y factor k',
        intuition: 'Misma cantidad medida con distinta partición.',
      },
      {
        concept: 'Potencia a^n',
        visualization: 'Árbol de duplicación',
        format: 'A',
        params: 'exponente n de 0 a 6',
        intuition: 'Crecimiento multiplicativo frente a crecimiento aditivo.',
      },
    ],
    concreteExample: {
      title: 'Convertir 45₁₀ a binario y hexadecimal',
      problem: 'Descomponer 45 en potencias de 2 y agrupar de a 4 bits para leerlo en base 16.',
      steps: [
        'Mayor potencia de 2 menor o igual a 45: 32 = 2⁵ (sobran 13).',
        '13 = 8 + 4 + 1 = 2³ + 2² + 2⁰ → en base 2 resulta 101101₂.',
        'Agrupando en nibbles de 4 bits: (0010)(1101)₂ = (2)(13)₁₆ = 0x2D.',
      ],
      latex: '45_{10} = 1\\cdot 2^5 + 0\\cdot 2^4 + 1\\cdot 2^3 + 1\\cdot 2^2 + 0\\cdot 2^1 + 1\\cdot 2^0 = 101101_2 = \\text{2D}_{16}',
      formalDefinition:
        'Todo entero positivo N en base b ≥ 2 se escribe de forma única como N = Σ d_k · b^k con dígitos 0 ≤ d_k < b.',
    },
    pythonLab: {
      title: 'Conversor posicional de bases sin bibliotecas',
      task: 'Implementa divisiones sucesivas por la base b acumulando residuos de derecha a izquierda.',
      code: `DIGITS = "0123456789ABCDEF"

def to_base(n: int, base: int) -> str:
    if n == 0:
        return "0"
    out = []
    while n > 0:
        n, rem = divmod(n, base)
        out.append(DIGITS[rem])
    return "".join(reversed(out))

print(to_base(45, 2), to_base(45, 16))  # 101101 2D`,
      mlApplication:
        'Cuantización de pesos neuronales a enteros de 8 o 4 bits (INT8/INT4) y máscaras de bits en tensores dispersos.',
    },
    checkpoint: {
      question: 'Al representar un número en base 2 usando una tabla posicional, ¿qué efecto produce añadir un cero al extremo derecho del número binario?',
      options: [
        'Multiplica el valor total del número exactamente por dos al desplazar cada bit una potencia.',
        'Suma exactamente una unidad al número original manteniendo intactas las potencias anteriores.',
        'Divide el valor total del número por dos al reducir el peso asignado al bit más significativo.',
        'Conserva el mismo valor numérico porque los ceros añadidos al final no aportan ninguna cantidad.',
      ],
      correctIndex: 0,
      explanation: 'Añadir un 0 a la derecha multiplica cada dígito d_k·2^k por 2, es decir, desplaza todos los bits hacia la izquierda (n << 1 = 2n).',
    },
    references: ['ROS-ES', 'MCS', 'CS2023'],
  },

  {
    id: 'M2',
    number: 2,
    phaseId: 'phase-1',
    level: '1',
    crayon: 'vermilion',
    title: 'Álgebra elemental',
    shortLabel: 'Álgebra Elemental',
    prerequisites: ['M1'],
    syllabus: [
      '2.1 Expresiones y variables',
      '2.2 Productos notables y factorización',
      '2.3 Ecuaciones lineales y cuadráticas',
      '2.4 Inecuaciones y valor absoluto',
      '2.5 Sistemas 2×2',
    ],
    pureMathFocus:
      'La igualdad como balanza equilibrada (operaciones que preservan el conjunto solución) y la factorización como descomposición estructural.',
    appliedCsMlFocus:
      'Diferencia entre asignación e igualdad lógica, simplificación de expresiones condicionales y rangos de validación.',
    visualSpecs: [
      {
        concept: '(a+b)²',
        visualization: 'Cuadrado dividido en cuatro áreas',
        format: 'W',
        params: 'longitudes a y b',
        intuition: 'El término 2ab corresponde a los dos rectángulos laterales que faltan en a² + b².',
      },
      {
        concept: 'Resolver ecuación',
        visualization: 'Balanza algebraica equilibrada',
        format: 'A',
        params: 'operación en ambos platillos',
        intuition: 'Aplicar la misma operación a ambos lados conserva el equilibrio.',
      },
      {
        concept: 'Sistema 2×2',
        visualization: 'Dos rectas en el plano',
        format: 'W',
        params: 'pendientes e interceptos',
        intuition: 'La solución es el punto de intersección; rectas paralelas no tienen solución.',
      },
      {
        concept: 'Inecuación',
        visualization: 'Recta con intervalos sombreados',
        format: 'W',
        params: 'centro y radio |x − c| ≤ r',
        intuition: 'Una inecuación describe un conjunto continuo de soluciones, no un solo número.',
      },
    ],
    concreteExample: {
      title: 'Completar el cuadrado y sistema 2×2',
      problem: 'Resolver 2x + y = 7 y x − y = 2 sumando ecuaciones y verificando el corte de rectas.',
      steps: [
        'Suma ambas ecuaciones: (2x + x) + (y − y) = 7 + 2 → 3x = 9.',
        'Divide ambos platillos entre 3: x = 3.',
        'Sustituye x = 3 en x − y = 2: 3 − y = 2 → y = 1. Punto de intersección (3, 1).',
      ],
      latex: '(a+b)^2 = a^2 + 2ab + b^2 \\quad\\text{y}\\quad \\begin{cases} 2x+y=7 \\\\ x-y=2 \\end{cases} \\Rightarrow (x,y)=(3,1)',
      formalDefinition:
        'Un sistema lineal 2×2 tiene solución única si y solo si el determinante ad − bc ≠ 0; si ad − bc = 0, las rectas son paralelas o coincidentes.',
    },
    pythonLab: {
      title: 'Resolvedor 2×2 con detección de casos singulares',
      task: 'Clasifica un sistema lineal 2×2 en solución única, infinitas soluciones o sin solución.',
      code: `def solve_2x2(a, b, c, d, e, f, eps=1e-9):
    det = a * d - b * c
    if abs(det) > eps:
        x = (e * d - b * f) / det
        y = (a * f - e * c) / det
        return ("unica", (round(x, 4), round(y, 4)))
    consistent = abs(a * f - e * c) <= eps and abs(b * f - e * d) <= eps
    return ("infinitas" if consistent else "sin_solucion", None)

print(solve_2x2(2, 1, 1, -1, 7, 2))`,
      mlApplication:
        'Resolución de restricciones lineales y cálculo de fronteras de decisión en clasificadores binarios.',
    },
    checkpoint: {
      question: '¿Por qué la expresión (a + b)² no es igual a a² + b² cuando a y b son números positivos?',
      options: [
        'Porque al formar un cuadrado de lado a+b aparecen dos rectángulos de área ab además de a² y b².',
        'Porque al elevar la suma al cuadrado el exponente duplica solamente el valor del primer término a.',
        'Porque las áreas cuadradas a² y b² siempre se restan mutuamente al compartir un vértice común.',
        'Porque la multiplicación de sumas invierte el signo de los términos cruzados cuando ambos son positivos.',
      ],
      correctIndex: 0,
      explanation: 'Geométricamente un cuadrado de lado a+b se parte en un cuadrado a², uno b² y dos rectángulos de área ab.',
    },
    references: ['STW-ES', 'HAM', 'VMLS'],
  },

  {
    id: 'M3',
    number: 3,
    phaseId: 'phase-1',
    level: '1-2',
    crayon: 'sage',
    title: 'Funciones y sus gráficas',
    shortLabel: 'Funciones',
    prerequisites: ['M2'],
    syllabus: [
      '3.1 Función como regla y como pares ordenados',
      '3.2 Dominio y rango',
      '3.3 Composición f(g(x))',
      '3.4 Función inversa',
      '3.5 Lineales, cuadráticas y polinomiales',
      '3.6 Exponenciales y logaritmos',
      '3.7 Transformaciones de gráficas',
    ],
    pureMathFocus:
      'La función como mapeo bien definido entre conjuntos; el logaritmo como función inversa exacta de la exponencial.',
    appliedCsMlFocus:
      'Funciones puras y composición en pipelines (map), logaritmos en complejidad algorítmica (búsqueda binaria) y sigmoide.',
    visualSpecs: [
      {
        concept: 'Mapeo',
        visualization: 'Flechas entre dominio y codominio',
        format: 'W',
        params: 'conectar o quitar flechas',
        intuition: 'Cada entrada del dominio tiene exactamente una salida asignada.',
      },
      {
        concept: 'Transformación',
        visualization: 'Curva base desplazada y escalada',
        format: 'W',
        params: 'a, h, k en a·f(x−h)+k',
        intuition: 'Cada parámetro produce un efecto geométrico aislado y predecible.',
      },
      {
        concept: 'f(g(x))',
        visualization: 'Cadena de dos máquinas',
        format: 'A',
        params: 'entrada x y orden de composición',
        intuition: 'El orden de aplicación cambia el resultado: f(g(x)) ≠ g(f(x)).',
      },
      {
        concept: 'Logaritmo',
        visualization: 'Reflexión de b^x sobre y = x',
        format: 'W',
        params: 'base b',
        intuition: 'log_b(y) responde cuántas veces multiplico b para obtener y.',
      },
    ],
    concreteExample: {
      title: 'Composición no conmutativa e inversa logarítmica',
      problem: 'Con f(x) = 2x + 1 y g(x) = x², compara f(g(3)) con g(f(3)).',
      steps: [
        'Primero g(3) = 3² = 9, luego f(9) = 2(9) + 1 = 19.',
        'Al revés: f(3) = 2(3) + 1 = 7, luego g(7) = 7² = 49.',
        'Como 19 ≠ 49, la composición de funciones depende del orden.',
      ],
      latex: '(f\\circ g)(x) = 2x^2 + 1 \\neq (2x+1)^2 = (g\\circ f)(x), \\quad \\log_b(b^x) = x',
      formalDefinition:
        'Una relación f ⊆ A × B es función si para todo x ∈ A existe un único y ∈ B tal que (x, y) ∈ f.',
    },
    pythonLab: {
      title: 'Composición funcional y contraste lineal vs logarítmico',
      task: 'Compara el número de pasos de búsqueda lineal n frente a búsqueda binaria log₂(n).',
      code: `import math

def compose(f, g):
    return lambda x: f(g(x))

pipeline = compose(lambda u: 2 * u + 1, lambda x: x ** 2)
print("f(g(3)) =", pipeline(3))

for n in [16, 1024, 1_048_576]:
    print(f"n={n:>9} | lineal={n:>9} | log2={math.log2(n):>5.1f}")`,
      mlApplication:
        'Capas de una red neuronal como composición de funciones afines y activaciones no lineales (sigmoide, ReLU).',
    },
    checkpoint: {
      question: '¿Cómo se obtiene geométricamente la gráfica de f⁻¹(x) = log_b(x) a partir de la gráfica de f(x) = b^x?',
      options: [
        'Reflejando cada punto (x, y) de la curva exponencial respecto a la recta diagonal y = x.',
        'Desplazando toda la curva exponencial una unidad hacia abajo a lo largo del eje vertical.',
        'Multiplicando todas las coordenadas verticales de la curva exponencial por menos uno.',
        'Invirtiendo cada ordenada y por su recíproco multiplicativo 1/y sobre el mismo eje x.',
      ],
      correctIndex: 0,
      explanation: 'La función inversa intercambia entrada y salida: (x, y) pasa a (y, x), que es la reflexión sobre y = x (no 1/f(x), que es la recíproca).',
    },
    references: ['STW-ES', 'STR-CALC', '3B1B'],
  },

  {
    id: 'M4',
    number: 4,
    phaseId: 'phase-1',
    level: '2',
    crayon: 'ochre',
    title: 'Trigonometría, geometría analítica y vectores en el plano',
    shortLabel: 'Trigonometría y 2D',
    prerequisites: ['M3'],
    syllabus: [
      '4.1 Radianes y círculo unitario',
      '4.2 Seno y coseno como coordenadas',
      '4.3 Identidades trigonométricas',
      '4.4 Distancia, recta y circunferencia',
      '4.5 Vectores 2D',
      '4.6 Números complejos en forma polar',
    ],
    pureMathFocus:
      'La trigonometría como geometría del círculo unitario y la multiplicación compleja como composición de rotación y escala.',
    appliedCsMlFocus:
      'Rotaciones en gráficos 2D/CSS, similitud coseno en embeddings y codificación posicional sinusoidal en Transformers.',
    visualSpecs: [
      {
        concept: 'Seno y coseno',
        visualization: 'Punto girando con proyecciones que trazan ondas',
        format: 'W',
        params: 'ángulo θ en radianes',
        intuition: 'Las ondas seno y coseno son simplemente las sombras proyectadas de un giro uniforme.',
      },
      {
        concept: 'Radián',
        visualization: 'Arco de longitud igual al radio',
        format: 'A',
        params: 'arco s = r·θ',
        intuition: 'El radián mide el ángulo directamente como longitud de arco recorrida.',
      },
      {
        concept: 'Suma de vectores',
        visualization: 'Regla del paralelogramo interactiva',
        format: 'W',
        params: 'vectores u y v',
        intuition: 'Sumar vectores equivale a encadenar dos desplazamientos.',
      },
      {
        concept: 'Producto complejo',
        visualization: 'Rotación y escalado en el plano complejo',
        format: 'W',
        params: 'módulo r y argumento φ',
        intuition: 'Multiplicar por i gira 90° en sentido antihorario.',
      },
    ],
    concreteExample: {
      title: 'Rotar un vector 2D usando forma polar',
      problem: 'Rotar el vector (1, 0) un ángulo θ = π/3 (60°) y comprobar que su norma se conserva.',
      steps: [
        'En el círculo unitario: cos(π/3) = 0.5 y sen(π/3) = √3/2 ≈ 0.866.',
        'El vector rotado es (0.5, 0.866).',
        'Verificación pitagórica: 0.5² + (√3/2)² = 0.25 + 0.75 = 1.',
      ],
      latex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta, \\qquad \\cos^2\\theta + \\sin^2\\theta = 1',
      formalDefinition:
        'Para todo θ ∈ ℝ, (cos θ, sin θ) es el único punto sobre la circunferencia unitaria a distancia de arco θ desde (1, 0).',
    },
    pythonLab: {
      title: 'Rotación de un polígono 2D con senos y cosenos',
      task: 'Aplica una rotación de ángulo θ a todos los vértices de un polígono y verifica que las distancias no cambian.',
      code: `import math

def rotate_polygon(points, theta):
    c, s = math.cos(theta), math.sin(theta)
    return [(round(x * c - y * s, 3), round(x * s + y * c, 3)) for x, y in points]

square = [(1, 0), (1, 1), (0, 1), (0, 0)]
print(rotate_polygon(square, math.pi / 2))`,
      mlApplication:
        'Similitud coseno cos(θ) = (u·v)/(||u||·||v||) en búsqueda semántica y rotaciones RoPE en modelos de lenguaje.',
    },
    checkpoint: {
      question: 'En el plano complejo, ¿qué transformación geométrica aplica sobre cualquier vector z multiplicarlo por el número complejo r·e^(iφ)?',
      options: [
        'Escala su longitud por el factor r y gira su dirección un ángulo φ en sentido antihorario.',
        'Desplaza su coordenada real sumando r y traslada su coordenada imaginaria sumando φ.',
        'Refleja el vector respecto al eje horizontal y conserva inalterada su longitud original.',
        'Proyecta el vector sobre la circunferencia unitaria descartando el módulo inicial de z.',
      ],
      correctIndex: 0,
      explanation: 'Al multiplicar en forma polar los módulos se multiplican (|z|·r) y los argumentos se suman (arg(z) + φ).',
    },
    references: ['STW-ES', 'NEED', 'ILA', 'VMLS'],
  },

  {
    id: 'M5',
    number: 5,
    phaseId: 'phase-1',
    level: '2',
    crayon: 'plum',
    title: 'Lógica y conjuntos',
    shortLabel: 'Lógica y Conjuntos',
    prerequisites: ['M2'],
    syllabus: [
      '5.1 Proposiciones y conectivos',
      '5.2 Tablas de verdad y leyes de De Morgan',
      '5.3 Implicación, recíproca y contrapositiva',
      '5.4 Cuantificadores ∀, ∃ y su negación',
      '5.5 Conjuntos y producto cartesiano',
      '5.6 Conjunto potencia',
    ],
    pureMathFocus:
      'Precisión absoluta del lenguaje matemático y la lógica proposicional entendida como álgebra booleana.',
    appliedCsMlFocus:
      'Condiciones if y cortocircuito, cláusulas WHERE en SQL, JOIN como producto cartesiano filtrado y conjuntos en Python.',
    visualSpecs: [
      {
        concept: 'Conectivos',
        visualization: 'Tabla de verdad interactiva',
        format: 'W',
        params: 'conectivo y valores P, Q',
        intuition: 'El valor de verdad depende únicamente de las entradas booleanas.',
      },
      {
        concept: 'De Morgan',
        visualization: 'Diagrama de Venn con doble sombreado',
        format: 'W',
        params: 'ley unión o intersección',
        intuition: 'Negar una unión equivale a intersecar las negaciones individuales.',
      },
      {
        concept: 'Cuantificadores',
        visualization: 'Cuadrícula con predicado coloreado',
        format: 'W',
        params: 'celdas P(x) activables',
        intuition: '∀ exige que se cumpla en toda la cuadrícula; ∃ solo necesita un testigo.',
      },
      {
        concept: 'Implicación',
        visualization: 'Inclusión P ⊆ Q',
        format: 'E',
        params: 'regiones P y Q',
        intuition: 'Si P implica Q, todo caso dentro de P queda contenido en Q.',
      },
    ],
    concreteExample: {
      title: 'Negar un cuantificador universal y aplicar De Morgan',
      problem: 'Negar "Todos los servidores responden rápido y sin errores".',
      steps: [
        'Formaliza: ∀s (R(s) ∧ E(s)).',
        'Niega el cuantificador: ¬∀s P(s) ≡ ∃s ¬P(s).',
        'Aplica De Morgan adentro: ∃s (¬R(s) ∨ ¬E(s)) → "Existe al menos un servidor lento o con errores".',
      ],
      latex: '\\neg(\\forall x\\, P(x)) \\equiv \\exists x\\, \\neg P(x), \\qquad \\neg(A \\cup B) = \\neg A \\cap \\neg B',
      formalDefinition:
        'La implicación P → Q es lógicamente equivalente a su contrapositiva ¬Q → ¬P, pero no a su recíproca Q → P.',
    },
    pythonLab: {
      title: 'Generador de tablas de verdad y comprobación de De Morgan',
      task: 'Verifica automáticamente que not (p or q) coincide con (not p) and (not q) en todos los casos.',
      code: `from itertools import product

print("P     Q     | P->Q  ~Q->~P | ~(P|Q) == (~P & ~Q)")
for p, q in product([False, True], repeat=2):
    imp = (not p) or q
    contra = q or (not p)
    dm = (not (p or q)) == ((not p) and (not q))
    print(f"{str(p):<5} {str(q):<5} | {str(imp):<5} {str(contra):<6} | {dm}")`,
      mlApplication:
        'Reescritura segura de filtros SQL complejos, verificación formal de circuitos y reglas lógicas simbólicas.',
    },
    checkpoint: {
      question: '¿Cuál es la negación lógicamente equivalente de la afirmación "Para todo x en el dominio, P(x) es verdadero"?',
      options: [
        'Existe al menos un elemento x en el dominio para el cual P(x) resulta falso.',
        'Para todos los elementos x en el dominio, la propiedad P(x) resulta siempre falsa.',
        'Existe exactamente un elemento x en el dominio donde P(x) se mantiene verdadero.',
        'Ningún elemento x del dominio puede pertenecer al conjunto donde P(x) se evalúa.',
      ],
      correctIndex: 0,
      explanation: 'Refutar un "para todo" (∀) no requiere que todos fallen: basta un único contraejemplo testigo (∃x ¬P(x)).',
    },
    references: ['MCS', 'HAM', 'VEL', 'CS103', 'ROS-ES'],
  },

  {
    id: 'M6',
    number: 6,
    phaseId: 'phase-1',
    level: '2',
    crayon: 'cobalt',
    title: 'Técnicas de demostración',
    shortLabel: 'Demostraciones',
    prerequisites: ['M5'],
    syllabus: [
      '6.1 Estructura de una prueba',
      '6.2 Demostración directa',
      '6.3 Demostración por contrapositiva',
      '6.4 Demostración por contradicción (√2)',
      '6.5 Demostración por casos',
      '6.6 Bicondicional (si y solo si)',
      '6.7 Contraejemplos',
    ],
    pureMathFocus:
      'El paso decisivo del cálculo mecánico a la argumentación rigurosa; columna vertebral de todo el curso.',
    appliedCsMlFocus:
      'Precondiciones y postcondiciones de funciones, depuración sistemática como búsqueda de contraejemplos y diferencia entre pruebas unitarias y corrección general.',
    visualSpecs: [
      {
        concept: 'Estructura de prueba',
        visualization: 'Flujo animado de hipótesis a conclusión',
        format: 'A',
        params: 'directa, contrapositiva o contradicción',
        intuition: 'Cada transición lógica debe estar justificada por una definición o paso previo.',
      },
      {
        concept: 'Contradicción',
        visualization: 'Árbol que termina en absurdo (√2)',
        format: 'A',
        params: 'pasos de la reducción al absurdo',
        intuition: 'Suponer la negación de la tesis conduce inevitablemente a una imposibilidad.',
      },
      {
        concept: 'Contraejemplo',
        visualization: 'Buscador sobre cuadrícula de casos',
        format: 'W',
        params: 'conjetura y rango n',
        intuition: 'Mil casos favorables no prueban un ∀, pero un solo caso rojo lo refuta.',
      },
    ],
    concreteExample: {
      title: 'Prueba por contradicción de que √2 es irracional',
      problem: 'Demostrar que no existen enteros coprimos p, q tales que p/q = √2.',
      steps: [
        'Supón lo contrario: √2 = p/q en forma irreducible (p y q no son ambos pares).',
        'Eleva al cuadrado: 2q² = p² → p² es par → p = 2k también es par.',
        'Sustituye: 2q² = 4k² → q² = 2k² → q también es par. ⚡ Contradicción con ser irreducible.',
      ],
      latex: '\\sqrt{2} = \\frac{p}{q} \\;(\\gcd(p,q)=1) \\;\\Longrightarrow\\; 2 \\mid p \\;\\land\\; 2 \\mid q \\;\\Longrightarrow\\; \\bot',
      formalDefinition:
        'Para probar P → Q por contrapositiva se asume ¬Q y se deduce ¬P; por contradicción se asume P ∧ ¬Q y se deduce un absurdo ⊥.',
    },
    pythonLab: {
      title: 'Búsqueda de contraejemplos frente a prueba general',
      task: 'Encuentra el primer n donde el célebre polinomio de Euler n² + n + 41 deja de ser primo.',
      code: `def is_prime(k: int) -> bool:
    if k < 2:
        return False
    return all(k % d != 0 for d in range(2, int(k ** 0.5) + 1))

for n in range(0, 50):
    val = n * n + n + 41
    if not is_prime(val):
        print(f"Contraejemplo en n={n}: {val} = {n}*{n+1}+41 = 41*{41}")
        break`,
      mlApplication:
        'Property-based testing (Hypothesis) y generación de ejemplos adversarios para refutar invariantes de un modelo.',
    },
    checkpoint: {
      question: '¿Qué diferencia fundamental existe entre probar una propiedad con 10 000 tests unitarios y escribir una demostración matemática?',
      options: [
        'Los tests verifican casos finitos y pueden hallar contraejemplos, mientras la prueba cubre todo el dominio.',
        'Los tests garantizan la verdad sobre dominios infinitos siempre que el código corra sin errores de tiempo.',
        'Una demostración matemática exige ejecutar cada instancia posible hasta agotar la memoria disponible.',
        'Ambas estrategias son equivalentes en validez lógica cuando los casos de prueba se eligen al azar.',
      ],
      correctIndex: 0,
      explanation: 'Como señaló Dijkstra, las pruebas muestran la presencia de errores (contraejemplos), nunca su ausencia en dominios infinitos.',
    },
    references: ['HAM', 'VEL', 'MCS', 'OCW-61200'],
  },

  // ==================== FASE 2: MATEMÁTICAS DISCRETAS (M7–M12) ====================
  {
    id: 'M7',
    number: 7,
    phaseId: 'phase-2',
    level: '2-3',
    crayon: 'vermilion',
    title: 'Inducción, recursión e invariantes',
    shortLabel: 'Inducción y Recursión',
    prerequisites: ['M6'],
    syllabus: [
      '7.1 Principio del buen orden',
      '7.2 Inducción matemática simple',
      '7.3 Inducción fuerte',
      '7.4 Definiciones recursivas',
      '7.5 Inducción estructural',
      '7.6 Máquinas de estado e invariantes',
    ],
    pureMathFocus:
      'La inducción como efecto dominó formal y la recursión como definición finita de estructuras arbitrariamente grandes.',
    appliedCsMlFocus:
      'Funciones recursivas, árboles del DOM y componentes UI, programación dinámica (memoización) e invariantes de bucle.',
    visualSpecs: [
      {
        concept: 'Inducción',
        visualization: 'Fichas de dominó animadas',
        format: 'A',
        params: 'caso base y paso inductivo',
        intuition: 'Si cae la primera ficha y cada ficha derriba a la siguiente, caen todas.',
      },
      {
        concept: 'Recursión',
        visualization: 'Árbol de llamadas de Fibonacci',
        format: 'W',
        params: 'n y modo memoización',
        intuition: 'Sin memoización la pila repite exponencialmente los mismos subproblemas.',
      },
      {
        concept: 'Invariante',
        visualization: 'Máquina de estados con propiedad preservada',
        format: 'A',
        params: 'transiciones de estado',
        intuition: 'Una propiedad verdadera al inicio y conservada en cada paso vale al terminar.',
      },
    ],
    concreteExample: {
      title: 'Inducción en suma de impares y costo de Fibonacci',
      problem: 'Probar que 1 + 3 + 5 + … + (2n−1) = n² para todo n ≥ 1.',
      steps: [
        'Base (n = 1): 1 = 1² ✓.',
        'Hipótesis inductiva: supone que hasta k la suma vale k².',
        'Paso k → k+1: suma anterior + (2k+1) = k² + 2k + 1 = (k+1)² ✓.',
      ],
      latex: 'P(1) \\;\\land\\; \\forall k\\,(P(k) \\to P(k+1)) \\;\\Longrightarrow\\; \\forall n \\ge 1\\, P(n)',
      formalDefinition:
        'La inducción estructural extiende el principio de los naturales a cualquier tipo de dato recursivo (listas, árboles, expresiones).',
    },
    pythonLab: {
      title: 'Fibonacci recursivo frente a memoizado contando llamadas',
      task: 'Mide cuántas llamadas se ejecutan para n=10 con y sin tabla caché.',
      code: `calls_naive = 0
def fib_naive(n):
    global calls_naive
    calls_naive += 1
    return n if n <= 1 else fib_naive(n - 1) + fib_naive(n - 2)

calls_memo = 0
memo = {}
def fib_memo(n):
    global calls_memo
    calls_memo += 1
    if n <= 1: return n
    if n not in memo:
        memo[n] = fib_memo(n - 1) + fib_memo(n - 2)
    return memo[n]

print(fib_naive(10), "llamadas naive:", calls_naive)
print(fib_memo(10), "llamadas memo:", calls_memo)`,
      mlApplication:
        'Programación dinámica en decodificación Viterbi, alineamiento de secuencias y evaluación eficiente de árboles sintácticos.',
    },
    checkpoint: {
      question: 'En una demostración por inducción matemática, ¿qué ocurre si el paso inductivo P(k) → P(k+1) es completamente válido pero falla el caso base P(1)?',
      options: [
        'La cadena lógica queda válida entre vecinos, pero la proposición no queda demostrada para ningún n.',
        'La proposición queda demostrada automáticamente para todo entero n mayor o igual que dos.',
        'El principio del buen orden reemplaza al caso base y valida la fórmula desde n = 0 en adelante.',
        'El paso inductivo corrige el error inicial siempre que se compruebe para un valor k suficientemente grande.',
      ],
      correctIndex: 0,
      explanation: 'Sin derribar la primera ficha del dominó (caso base), la implicación P(k) → P(k+1) nunca dispara la cadena.',
    },
    references: ['MCS', 'OCW-61200', 'HAM', 'CS103'],
  },

  {
    id: 'M8',
    number: 8,
    phaseId: 'phase-2',
    level: '3',
    crayon: 'sage',
    title: 'Relaciones, funciones y cardinalidad',
    shortLabel: 'Relaciones e Infinitos',
    prerequisites: ['M6', 'M7'],
    syllabus: [
      '8.1 Relaciones binarias',
      '8.2 Relaciones de equivalencia y particiones',
      '8.3 Órdenes parciales',
      '8.4 Inyectiva, sobreyectiva y biyectiva',
      '8.5 Cardinalidad de conjuntos',
      '8.6 Argumento diagonal de Cantor',
    ],
    pureMathFocus:
      'Estructura abstracta de relacionar elementos y comparación rigurosa entre distintos tamaños de infinito.',
    appliedCsMlFocus:
      'Modelo relacional y claves foráneas, colisiones de tablas hash, dependencias de paquetes como orden parcial e indecidibilidad.',
    visualSpecs: [
      {
        concept: 'Tipos de función',
        visualization: 'Mapeo entre columnas de puntos',
        format: 'W',
        params: 'añadir o quitar flechas',
        intuition: 'Inyectiva, sobreyectiva y biyectiva son condiciones visuales sobre las flechas.',
      },
      {
        concept: 'Equivalencia',
        visualization: 'Puntos agrupados por clases de color',
        format: 'W',
        params: 'módulo n',
        intuition: 'Toda relación de equivalencia parte el conjunto en bloques disjuntos.',
      },
      {
        concept: 'Diagonal de Cantor',
        visualization: 'Tabla infinita con diagonal invertida',
        format: 'A',
        params: 'construcción del número nuevo',
        intuition: 'Cualquier lista enumerable de reales deja fuera al número diagonal modificado.',
      },
      {
        concept: 'Orden parcial',
        visualization: 'Diagrama de Hasse',
        format: 'E',
        params: 'divisibilidad',
        intuition: 'En un orden parcial existen pares de elementos no comparables entre sí.',
      },
    ],
    concreteExample: {
      title: 'Partición por congruencia módulo 3 y diagonal de Cantor',
      problem: 'Agrupar {0, 1, 2, 3, 4, 5, 6, 7, 8} según x ≡ y (mod 3).',
      steps: [
        'Reflexiva, simétrica y transitiva → es relación de equivalencia.',
        'Las clases disjuntas son [0]={0,3,6}, [1]={1,4,7} y [2]={2,5,8}.',
        'Su unión cubre exactamente el conjunto original sin solapamientos.',
      ],
      latex: '|\\mathbb{N}| = |\\mathbb{Q}| = \\aleph_0 < |\\mathbb{R}| = 2^{\\aleph_0}',
      formalDefinition:
        'Dos conjuntos A y B tienen la misma cardinalidad si y solo si existe una biyección f: A → B.',
    },
    pythonLab: {
      title: 'Verificar propiedades de una relación como matriz booleana',
      task: 'Comprueba reflexividad, simetría y transitividad sobre una matriz binaria n×n.',
      code: `def check_relation(M):
    n = len(M)
    reflexive = all(M[i][i] for i in range(n))
    symmetric = all(M[i][j] == M[j][i] for i in range(n) for j in range(n))
    transitive = all(
        M[i][k] for i in range(n) for j in range(n) for k in range(n)
        if M[i][j] and M[j][k]
    )
    return {"reflexiva": reflexive, "simetrica": symmetric, "transitiva": transitive}

print(check_relation([[1, 1, 0], [1, 1, 0], [0, 0, 1]]))`,
      mlApplication:
        'Agrupamiento en clases de equivalencia (Union-Find), resolución de dependencias de grafos y análisis de colisiones en hashing.',
    },
    checkpoint: {
      question: 'En el argumento diagonal de Cantor sobre los números reales en (0, 1), ¿por qué el número construido d no puede figurar en la fila k de la lista?',
      options: [
        'Porque su k-ésimo dígito decimal se eligió deliberadamente distinto del k-ésimo dígito de la fila k.',
        'Porque todos los dígitos de d son mayores que los dígitos presentes en la primera fila de la lista.',
        'Porque el número d posee una cantidad finita de decimales mientras todas las filas son periódicas.',
        'Porque los números reales solo admiten ordenaciones crecientes donde cada fila supera a la anterior.',
      ],
      correctIndex: 0,
      explanation: 'Al alterar el dígito k-ésimo de la fila k (por ejemplo cambiando 5 por 6 y cualquier otro por 5), d difiere de cada fila en al menos una posición.',
    },
    references: ['MCS', 'HAM', 'VEL', 'CS103'],
  },

  {
    id: 'M9',
    number: 9,
    phaseId: 'phase-2',
    level: '3',
    crayon: 'ochre',
    title: 'Sumatorias, asintótica y recurrencias',
    shortLabel: 'Asintótica y Sumas',
    prerequisites: ['M3', 'M7'],
    syllabus: [
      '9.1 Sumas aritméticas y geométricas',
      '9.2 Cotas por integrales (enfoque intuitivo)',
      '9.3 Notación asintótica O, Ω, Θ',
      '9.4 Recurrencias lineales',
      '9.5 Recurrencias de divide y vencerás',
    ],
    pureMathFocus:
      'Formas cerradas de sumas y comparación rigurosa de tasas de crecimiento cuando n → ∞.',
    appliedCsMlFocus:
      'Complejidad temporal de algoritmos (Merge Sort, búsqueda binaria), índices en SQL y rendimiento de renderizado.',
    visualSpecs: [
      {
        concept: '1 + … + n',
        visualization: 'Escalera duplicada formando un rectángulo',
        format: 'A',
        params: 'tamaño n',
        intuition: 'Dos escaleras encajan en un rectángulo n×(n+1), así que cada una mide n(n+1)/2.',
      },
      {
        concept: 'Asintótica',
        visualization: 'Curvas log n, n, n log n, n², 2^n superpuestas',
        format: 'W',
        params: 'rango n y escala log/lineal',
        intuition: 'Para n grande el orden de crecimiento aplasta cualquier constante multiplicativa.',
      },
      {
        concept: 'Serie geométrica',
        visualization: 'Cuadrado partido a la mitad sucesivamente',
        format: 'A',
        params: 'términos k',
        intuition: '1/2 + 1/4 + 1/8 + … llena exactamente un cuadrado de área 1.',
      },
      {
        concept: 'Divide y vencerás',
        visualization: 'Árbol de recursión con costo por nivel',
        format: 'W',
        params: 'ramas a y factor b',
        intuition: 'El costo total es la suma de los costos acumulados nivel por nivel.',
      },
    ],
    concreteExample: {
      title: 'Recurrencia de Merge Sort T(n) = 2T(n/2) + n',
      problem: 'Sumar el trabajo por nivel en el árbol de recursión de tamaño n.',
      steps: [
        'Nivel 0: 1 problema de tamaño n → costo n.',
        'Nivel k: 2^k subproblemas de tamaño n/2^k → costo 2^k · (n/2^k) = n.',
        'Hay log₂(n) niveles → costo total Θ(n log n).',
      ],
      latex: '\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2} = \\Theta(n^2), \\qquad T(n) = 2T(n/2) + n \\in \\Theta(n\\log n)',
      formalDefinition:
        'f(n) ∈ O(g(n)) si existen constantes c > 0 y n₀ tales que 0 ≤ f(n) ≤ c·g(n) para todo n ≥ n₀.',
    },
    pythonLab: {
      title: 'Comparación empírica de orden O(n log n) frente a O(n²)',
      task: 'Mide operaciones reales de una suma cuadrática frente a ordenamiento timsort.',
      code: `import math

for n in [10, 100, 1000, 10_000]:
    nlogn = n * math.log2(n)
    quad = n * n
    print(f"n={n:>5} | n log2 n={nlogn:>10.0f} | n^2={quad:>10} | ratio={quad/nlogn:>6.1f}x")`,
      mlApplication:
        'Cuello de botella cuadrático O(L²) de la autoatención en Transformers frente a variantes lineales o con ventanas.',
    },
    checkpoint: {
      question: 'Si un algoritmo A ejecuta 500·n·log₂(n) operaciones y un algoritmo B ejecuta 0.5·n² operaciones, ¿cuál afirmación asintótica es correcta?',
      options: [
        'A es asintóticamente más rápido porque n·log₂(n) queda por debajo de n² desde cierto n₀ en adelante.',
        'B es siempre preferible porque su constante inicial 0.5 es mil veces menor que la constante 500 de A.',
        'Ambos algoritmos pertenecen exactamente a la misma clase Θ(n²) al crecer con la entrada n.',
        'Ninguno domina al otro porque las constantes multiplicativas impiden comparar órdenes distintos.',
      ],
      correctIndex: 0,
      explanation: 'Las constantes se absorben en la notación asintótica: para n > 14 000, 0.5·n² ya supera a 500·n·log₂(n) y la brecha crece sin límite.',
    },
    references: ['MCS', 'OCW-61200', 'CS2023'],
  },

  {
    id: 'M10',
    number: 10,
    phaseId: 'phase-2',
    level: '3',
    crayon: 'cobalt',
    title: 'Teoría de números y criptografía',
    shortLabel: 'Números y RSA',
    prerequisites: ['M6'],
    syllabus: [
      '10.1 Divisibilidad y números primos',
      '10.2 Algoritmo de Euclides y MCD',
      '10.3 Aritmética modular ℤₙ',
      '10.4 Inversos modulares',
      '10.5 Pequeño teorema de Fermat y Euler',
      '10.6 Criptosistema RSA',
    ],
    pureMathFocus:
      'Estructura aritmética de los enteros y comportamiento cíclico de la congruencia módulo n.',
    appliedCsMlFocus:
      'Criptografía de clave pública RSA y HTTPS, funciones hash, generadores pseudoaleatorios y códigos de verificación.',
    visualSpecs: [
      {
        concept: 'Aritmética mod n',
        visualization: 'Reloj modular de n posiciones',
        format: 'W',
        params: 'módulo n y operación',
        intuition: 'Sumar módulo n equivale a girar agujas sobre un círculo de n horas.',
      },
      {
        concept: 'Algoritmo de Euclides',
        visualization: 'Rectángulo embaldosado con cuadrados',
        format: 'A',
        params: 'enteros a y b',
        intuition: 'El último cuadrado que encaja sin sobrante mide exactamente MCD(a, b).',
      },
      {
        concept: 'Tabla mod n',
        visualization: 'Mapa de calor multiplicativo',
        format: 'W',
        params: 'n primo frente a compuesto',
        intuition: 'Cuando n es primo, cada fila no nula contiene un 1 (todos tienen inverso).',
      },
      {
        concept: 'RSA',
        visualization: 'Flujo de cifrado y descifrado modular',
        format: 'A',
        params: 'primos p, q y mensaje m',
        intuition: 'Elevar a e y luego a d deshace la potencia gracias al teorema de Euler.',
      },
    ],
    concreteExample: {
      title: 'RSA de juguete con p = 5, q = 11',
      problem: 'Cifrar y descifrar el mensaje m = 9 con n = 55, φ(n) = 40, e = 3 y d = 27.',
      steps: [
        'Comprueba e·d = 3·27 = 81 ≡ 1 (mod 40).',
        'Cifrado: c = 9³ mod 55 = 729 mod 55 = 14.',
        'Descifrado: c²⁷ mod 55 = 14²⁷ mod 55 = 9 = m ✓.',
      ],
      latex: 'e\\cdot d \\equiv 1 \\pmod{\\varphi(n)} \\;\\Longrightarrow\\; (m^e)^d \\equiv m \\pmod{n}',
      formalDefinition:
        'Un entero a tiene inverso multiplicativo módulo n si y solo si mcd(a, n) = 1.',
    },
    pythonLab: {
      title: 'Euclides extendido y RSA didáctico en Python',
      task: 'Calcula el inverso modular y verifica el ciclo completo de cifrado y descifrado.',
      code: `def egcd(a, b):
    if b == 0:
        return a, 1, 0
    g, x1, y1 = egcd(b, a % b)
    return g, y1, x1 - (a // b) * y1

p, q = 11, 13
n, phi = p * q, (p - 1) * (q - 1)
e = 7
_, x, _ = egcd(e, phi)
d = x % phi
m = 42
c = pow(m, e, n)
print(f"clave publica=({e},{n}) | cifrado={c} | descifrado={pow(c, d, n)}")`,
      mlApplication:
        'Cómputo privado (aprendizaje federado con criptografía), semillas deterministas de RNG y tablas hash modulares.',
    },
    checkpoint: {
      question: 'En aritmética modular ℤₙ, ¿qué condición garantiza que un número a tenga inverso multiplicativo módulo n?',
      options: [
        'Que el máximo común divisor entre a y el módulo n sea exactamente igual a uno.',
        'Que el número a sea estrictamente menor que la mitad del valor elegido para n.',
        'Que tanto el número a como el módulo n sean simultáneamente enteros pares positivos.',
        'Que el residuo de dividir n entre a sea igual a cero en la división euclidiana.',
      ],
      correctIndex: 0,
      explanation: 'Por la identidad de Bézout, existe x con a·x ≡ 1 (mod n) si y solo si mcd(a, n) = 1.',
    },
    references: ['MCS', 'OCW-61200', 'VEL', 'ROS-ES'],
  },

  {
    id: 'M11',
    number: 11,
    phaseId: 'phase-2',
    level: '3',
    crayon: 'plum',
    title: 'Combinatoria y conteo',
    shortLabel: 'Combinatoria',
    prerequisites: ['M7'],
    syllabus: [
      '11.1 Reglas de la suma y del producto',
      '11.2 Permutaciones y combinaciones',
      '11.3 Coeficientes binomiales y triángulo de Pascal',
      '11.4 Principio del palomar',
      '11.5 Principio de inclusión-exclusión',
      '11.6 Biyecciones para contar',
    ],
    pureMathFocus:
      'Contar conjuntos enormes sin enumerar sus elementos y demostrar identidades mediante argumentos combinatorios.',
    appliedCsMlFocus:
      'Espacios de búsqueda, entropía de contraseñas, colisiones de hash (paradoja del cumpleaños) y base de la probabilidad discreta.',
    visualSpecs: [
      {
        concept: 'C(n, k)',
        visualization: 'Triángulo de Pascal y caminos en rejilla',
        format: 'W',
        params: 'n y k',
        intuition: 'Elegir k elementos entre n equivale a contar caminos ortogonales en una cuadrícula.',
      },
      {
        concept: 'Palomar',
        visualization: 'Cajas y objetos distribuidos',
        format: 'A',
        params: 'número de objetos y cajas',
        intuition: 'Con más objetos que cajas, al menos una caja sufre colisión obligatoria.',
      },
      {
        concept: 'Inclusión-exclusión',
        visualization: 'Diagrama de Venn de 3 conjuntos con conteos',
        format: 'W',
        params: 'tamaños de intersecciones',
        intuition: 'Sumar y restar intersecciones corrige exactamente el doble conteo.',
      },
      {
        concept: 'Regla del producto',
        visualization: 'Árbol de decisiones por niveles',
        format: 'W',
        params: 'ramas por etapa',
        intuition: 'El total de hojas es el producto de las opciones en cada nivel.',
      },
    ],
    concreteExample: {
      title: 'Caminos en una rejilla de 4×2 y C(6, 2)',
      problem: '¿Cuántos caminos mínimos van de (0,0) a (4,2) moviéndose solo derecha (D) o arriba (A)?',
      steps: [
        'Todo camino usa exactamente 6 pasos: 4 veces D y 2 veces A.',
        'Basta elegir en cuáles 2 de las 6 posiciones colocar una A.',
        'C(6, 2) = 6! / (2! · 4!) = (6 × 5) / 2 = 15 caminos.',
      ],
      latex: '\\binom{n}{k} = \\frac{n!}{k!(n-k)!} = \\binom{n-1}{k-1} + \\binom{n-1}{k}',
      formalDefinition:
        'El principio del palomar establece que si se asignan N objetos a M cajas con N > M, al menos una caja recibe ⌈N/M⌉ o más objetos.',
    },
    pythonLab: {
      title: 'Verificación combinatoria con math.comb e itertools',
      task: 'Compara la fórmula binomial con la enumeración explícita y verifica la suma de filas de Pascal.',
      code: `import itertools, math

n, k = 6, 2
combos = list(itertools.combinations(range(n), k))
assert len(combos) == math.comb(n, k) == 15

row_sum = sum(math.comb(n, j) for j in range(n + 1))
print(f"C({n},{k}) = {len(combos)} | suma fila {n} = {row_sum} = 2^{n}")`,
      mlApplication:
        'Conteo de combinaciones de hiperparámetros, distribuciones binomiales y análisis de colisiones en tablas de embedding.',
    },
    checkpoint: {
      question: '¿Por qué la fórmula de combinaciones C(n, k) divide las permutaciones P(n, k) entre el factorial k!?',
      options: [
        'Porque cada subconjunto de tamaño k puede ordenarse de k! maneras distintas que representan el mismo grupo.',
        'Porque al seleccionar k objetos sin reemplazo se eliminan exactamente k! elementos del conjunto inicial.',
        'Porque el orden de selección multiplica cada elemento elegido por su posición dentro de la lista final.',
        'Porque el principio del palomar exige repartir las permutaciones totales en k! cajas de igual tamaño.',
      ],
      correctIndex: 0,
      explanation: 'Cada grupo sin orden aparece contado exactamente k! veces en las permutaciones ordenadas, por lo que se divide por k!.',
    },
    references: ['MCS', 'OCW-61200', 'HAM', 'CS109R'],
  },

  {
    id: 'M12',
    number: 12,
    phaseId: 'phase-2',
    level: '3',
    crayon: 'sage',
    title: 'Grafos y árboles',
    shortLabel: 'Grafos y Árboles',
    prerequisites: ['M7', 'M8'],
    syllabus: [
      '12.1 Grafos y representaciones (listas y matrices)',
      '12.2 Caminos y conectividad',
      '12.3 Árboles y árboles generadores',
      '12.4 Coloreo de grafos',
      '12.5 Emparejamientos',
      '12.6 DAGs y orden topológico',
      '12.7 Grafos ponderados',
    ],
    pureMathFocus:
      'Estructura combinatoria de redes, propiedades de árboles y pruebas constructivas sobre conectividad.',
    appliedCsMlFocus:
      'Rutas mínimas, resolución de dependencias de compilación (npm), grafos computacionales de redes neuronales (anticipo de M28) y bases de datos de grafos.',
    visualSpecs: [
      {
        concept: 'BFS y DFS',
        visualization: 'Animación paso a paso sobre grafo interactivo',
        format: 'W',
        params: 'nodo inicial y algoritmo',
        intuition: 'BFS explora por capas (cola FIFO); DFS profundiza por ramas (pila LIFO).',
      },
      {
        concept: 'Árbol generador mínimo',
        visualization: 'Kruskal paso a paso',
        format: 'A',
        params: 'aristas ordenadas por peso',
        intuition: 'Elegir siempre la arista más barata sin cerrar ciclos logra el óptimo global.',
      },
      {
        concept: 'Orden topológico',
        visualization: 'DAG desarmándose por nodos sin entrada',
        format: 'A',
        params: 'dependencias',
        intuition: 'Un grafo dirigido admite orden lineal de ejecución si y solo si carece de ciclos.',
      },
      {
        concept: 'Coloreo',
        visualization: 'Grafo con colores asignables',
        format: 'W',
        params: 'paleta por vértice',
        intuition: 'Restricciones puramente locales generan problemas globales difíciles.',
      },
    ],
    concreteExample: {
      title: 'Propiedad fundamental de un árbol con n vértices',
      problem: 'Verificar que todo árbol conexo de 6 nodos tiene exactamente 5 aristas.',
      steps: [
        'Comienza con 1 nodo y 0 aristas.',
        'Cada nuevo nodo añadido sin formar ciclos aporta exactamente 1 arista nueva.',
        'Al llegar a n = 6 vértices hay exactamente n − 1 = 5 aristas.',
      ],
      latex: '|E| = |V| - 1 \\;(\\text{árbol}), \\qquad \\sum_{v \\in V} \\deg(v) = 2|E|',
      formalDefinition:
        'Un grafo acíclico dirigido (DAG) posee orden topológico si cada arista dirigida u → v coloca u antes que v.',
    },
    pythonLab: {
      title: 'Recorrido BFS con cola y reconstrucción de distancias mínimas',
      task: 'Calcula el número mínimo de saltos desde un nodo origen en un grafo no ponderado.',
      code: `from collections import deque

def bfs_distances(graph, start):
    dist = {start: 0}
    queue = deque([start])
    while queue:
        u = queue.popleft()
        for v in graph[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist

G = {"A": ["B", "C"], "B": ["D", "E"], "C": ["E"], "D": ["F"], "E": ["F"], "F": []}
print(bfs_distances(G, "A"))`,
      mlApplication:
        'Orden topológico en motores de diferenciación automática (PyTorch/JAX) y redes neuronales de grafos (GNN).',
    },
    checkpoint: {
      question: '¿Qué estructura de datos diferencia esencialmente el orden de visita entre BFS y DFS sobre un mismo grafo?',
      options: [
        'BFS usa una cola FIFO para expandir por capas de distancia y DFS usa una pila LIFO para profundizar.',
        'BFS ordena siempre las aristas por peso ascendente y DFS selecciona aristas al azar sin marcas.',
        'BFS funciona únicamente en grafos dirigidos acíclicos y DFS opera exclusivamente en árboles binarios.',
        'BFS visita cada vértice tantas veces como su grado y DFS recorre cada arista exactamente una vez.',
      ],
      correctIndex: 0,
      explanation: 'Cambiar la cola (popleft) por una pila (pop) transforma la exploración por capas (BFS) en exploración en profundidad (DFS).',
    },
    references: ['MCS', 'OCW-61200', 'ROS-ES', 'CS103'],
  },

  // ==================== FASE 3: CÁLCULO (M13–M17) ====================
  {
    id: 'M13',
    number: 13,
    phaseId: 'phase-3',
    level: '3',
    crayon: 'cobalt',
    title: 'Límites y continuidad',
    shortLabel: 'Límites',
    prerequisites: ['M3', 'M4'],
    syllabus: [
      '13.1 Aproximación intuitiva',
      '13.2 Límites laterales',
      '13.3 Límites al infinito',
      '13.4 Continuidad',
      '13.5 Definición épsilon-delta (al final)',
    ],
    pureMathFocus:
      'Formalizar qué significa acercarse arbitrariamente a un punto; introducir ε–δ únicamente después de dominar la intuición visual.',
    appliedCsMlFocus:
      'Convergencia de algoritmos iterativos, límites de precisión flotante y comportamiento asintótico.',
    visualSpecs: [
      {
        concept: 'Épsilon-delta',
        visualization: 'Banda horizontal ε y ventana vertical δ interactiva',
        format: 'W',
        params: 'tolerancia ε y radio δ',
        intuition: 'Es un juego de desafío y respuesta: dado cualquier margen ε, debes hallar un δ que encierre la curva.',
      },
      {
        concept: 'Límite',
        visualization: 'Zoom progresivo alrededor de x = a',
        format: 'W',
        params: 'punto a y nivel de zoom',
        intuition: 'El límite depende de hacia dónde apunta la función cerca de a, no de su valor en a.',
      },
      {
        concept: 'Discontinuidades',
        visualization: 'Galería interactiva de tipos (hueco, salto, asíntota)',
        format: 'E',
        params: 'selector de función',
        intuition: 'Tres formas distintas en las que puede romperse la continuidad.',
      },
    ],
    concreteExample: {
      title: 'Juego ε–δ en f(x) = 2x + 1 alrededor de a = 1',
      problem: 'Para un margen ε = 0.2 alrededor de L = 3, encontrar un δ que garantice |f(x) − 3| < 0.2.',
      steps: [
        'Calcula |f(x) − 3| = |(2x + 1) − 3| = 2|x − 1|.',
        'Queremos 2|x − 1| < 0.2, es decir, |x − 1| < 0.1.',
        'Elegir δ = ε/2 = 0.1 encierra por completo la gráfica dentro de la banda verde.',
      ],
      latex: '\\lim_{x \\to a} f(x) = L \\iff \\forall \\varepsilon > 0\\; \\exists \\delta > 0:\\; 0 < |x-a| < \\delta \\implies |f(x)-L| < \\varepsilon',
      formalDefinition:
        'f es continua en a si f(a) existe, el límite cuando x → a existe y ambos valores coinciden.',
    },
    pythonLab: {
      title: 'Aproximación numérica de sin(x)/x y límites de precisión',
      task: 'Evalúa sin(x)/x al acercarse a 0 y observa cuándo el punto flotante colapsa.',
      code: `import math

for k in range(1, 10):
    x = 10 ** (-k)
    print(f"x=1e-{k} | sin(x)/x = {math.sin(x) / x:.12f}")`,
      mlApplication:
        'Estabilidad numérica en pérdidas logarítmicas (añadir ε = 1e-8 en log(p + ε)) y criterios de parada de entrenamiento.',
    },
    checkpoint: {
      question: 'En la definición ε–δ de límite en x = a, ¿por qué se escribe la condición 0 < |x − a| < δ en lugar de |x − a| < δ?',
      options: [
        'Porque el límite evalúa el comportamiento cerca de a sin depender de si f(a) existe o tiene un hueco.',
        'Porque las funciones reales nunca pueden evaluarse en números enteros cuando se calcula un límite.',
        'Porque eliminar el punto x = a garantiza que toda función con salto lateral posea límite único.',
        'Porque la distancia δ debe ser siempre mayor que el margen vertical ε elegido por el observador.',
      ],
      correctIndex: 0,
      explanation: 'Excluir x = a permite que funciones con discontinuidad removible (hueco), como sin(x)/x en 0, tengan límite perfectamente definido.',
    },
    references: ['OCW-1801', 'STW-ES', 'STR-CALC', '3B1B', 'HAM'],
  },

  {
    id: 'M14',
    number: 14,
    phaseId: 'phase-3',
    level: '3',
    crayon: 'vermilion',
    title: 'Derivada y aplicaciones',
    shortLabel: 'Derivadas',
    prerequisites: ['M13'],
    syllabus: [
      '14.1 Razón de cambio y pendiente',
      '14.2 Reglas de derivación',
      '14.3 Regla de la cadena',
      '14.4 Derivada de exponencial y logaritmo',
      '14.5 Optimización en 1D',
      '14.6 Aproximación lineal',
      '14.7 Método de Newton',
    ],
    pureMathFocus:
      'La derivada como mejor linealización local y la regla de la cadena como multiplicación de razones de cambio encadenadas.',
    appliedCsMlFocus:
      'La regla de la cadena es el corazón de backpropagation (M28); minimización de pérdidas en 1D.',
    visualSpecs: [
      {
        concept: 'Derivada',
        visualization: 'Secante que converge a tangente',
        format: 'W',
        params: 'punto x y paso h hacia 0',
        intuition: 'La pendiente instantánea es el límite de las pendientes promedio al encoger h.',
      },
      {
        concept: 'Óptimo',
        visualization: 'Curva con signo de f′ coloreado',
        format: 'W',
        params: 'posición x',
        intuition: 'Los extremos locales ocurren donde la pendiente cruza por cero y cambia de signo.',
      },
      {
        concept: 'Método de Newton',
        visualization: 'Tangentes sucesivas cayendo al eje X',
        format: 'A',
        params: 'estimación inicial x₀',
        intuition: 'Linealizar la curva y seguir su tangente converge rapidísimo a la raíz.',
      },
      {
        concept: 'Regla de la cadena',
        visualization: 'Tres ejes encadenados con estiramientos',
        format: 'A',
        params: 'factores dg/dx y df/dg',
        intuition: 'Las tasas de estiramiento en cascada se multiplican.',
      },
    ],
    concreteExample: {
      title: 'Descenso de gradiente 1D en L(w) = (w − 3)²',
      problem: 'Dar un paso de descenso con tasa α = 0.2 partiendo desde w₀ = 0.',
      steps: [
        'Deriva la pérdida: L′(w) = 2(w − 3).',
        'En w₀ = 0, la pendiente es L′(0) = −6 (baja hacia la derecha).',
        'Actualiza: w₁ = 0 − 0.2·(−6) = 1.2, acercándose al mínimo en w = 3.',
      ],
      latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}, \\qquad \\frac{d}{dx} f(g(x)) = f'(g(x))\\,g'(x)",
      formalDefinition:
        'Si f es diferenciable en x₀, entonces f(x₀ + Δx) ≈ f(x₀) + f′(x₀)·Δx es la mejor aproximación lineal local.',
    },
    pythonLab: {
      title: 'Derivada numérica centrada y descenso de gradiente 1D',
      task: 'Minimiza f(w) = (w − 3)² + 0.5·sin(2w) comparando gradiente numérico y analítico.',
      code: `import math

def f(w): return (w - 3.0) ** 2
def num_deriv(fn, x, h=1e-6): return (fn(x + h) - fn(x - h)) / (2 * h)

w, lr = 0.0, 0.2
for step in range(5):
    g = num_deriv(f, w)
    w -= lr * g
    print(f"paso {step+1}: w={w:.4f}, f(w)={f(w):.4f}")`,
      mlApplication:
        'Cálculo de sensibilidades en redes neuronales (regla de la cadena) y entrenamiento por descenso de gradiente.',
    },
    checkpoint: {
      question: 'En el descenso de gradiente en 1D, ¿por qué se actualiza w restando α·f′(w) en vez de sumarlo?',
      options: [
        'Porque el signo de f′(w) señala hacia dónde sube la curva y restarlo mueve w en sentido descendente.',
        'Porque la derivada f′(w) es siempre negativa para cualquier función diferenciable sobre los reales.',
        'Porque sumar la derivada mantiene constante el valor de w sin modificar el error de entrenamiento.',
        'Porque restar la tasa α garantiza alcanzar el mínimo exacto en una sola iteración sin oscilar.',
      ],
      correctIndex: 0,
      explanation: 'Si f′(w) > 0 la curva sube hacia la derecha, así que hay que moverse a la izquierda (−α·f′(w) < 0); si f′(w) < 0, hacia la derecha.',
    },
    references: ['OCW-1801', 'STW-ES', '3B1B', 'STR-CALC'],
  },

  {
    id: 'M15',
    number: 15,
    phaseId: 'phase-3',
    level: '3',
    crayon: 'sage',
    title: 'Integral y teorema fundamental',
    shortLabel: 'Integrales y TFC',
    prerequisites: ['M14'],
    syllabus: [
      '15.1 Sumas de Riemann',
      '15.2 Integral definida',
      '15.3 Teorema fundamental del cálculo (TFC)',
      '15.4 Sustitución e integración por partes',
      '15.5 Integrales impropias',
      '15.6 Integración numérica (trapecio y Simpson)',
    ],
    pureMathFocus:
      'La integral como acumulación continua y el Teorema Fundamental que la revela como inversa de la derivada.',
    appliedCsMlFocus:
      'Densidades de probabilidad continuas (M25), área bajo la curva ROC (AUC) e integración numérica en física y estadística.',
    visualSpecs: [
      {
        concept: 'Sumas de Riemann',
        visualization: 'Rectángulos y trapecios bajo la curva',
        format: 'W',
        params: 'subdivisiones n y regla de muestreo',
        intuition: 'Al afinar el ancho Δx, la suma de rectángulos converge al área exacta.',
      },
      {
        concept: 'TFC',
        visualization: 'Área acumulada F(x) enlazada con la altura f(x)',
        format: 'A',
        params: 'límite superior x',
        intuition: 'La rapidez con que crece el área acumulada al mover x es justamente la altura f(x).',
      },
      {
        concept: 'Integral impropia',
        visualization: 'Cola de e^(-x) en dominio creciente',
        format: 'W',
        params: 'límite superior b',
        intuition: 'Una región infinitamente larga puede encerrar un área finita.',
      },
    ],
    concreteExample: {
      title: 'Área exacta vs suma de Riemann para f(x) = x² en [0, 2]',
      problem: 'Comparar 4 rectángulos de punto medio con el valor exacto del TFC.',
      steps: [
        'TFC: ∫₀² x² dx = [x³/3]₀² = 8/3 ≈ 2.6667.',
        'Con n = 4 (Δx = 0.5), puntos medios 0.25, 0.75, 1.25, 1.75.',
        'Suma = 0.5·(0.0625 + 0.5625 + 1.5625 + 3.0625) = 2.625 (error de solo 0.0417).',
      ],
      latex: '\\frac{d}{dx}\\int_a^x f(t)\\,dt = f(x), \\qquad \\int_a^b f(x)\\,dx = F(b) - F(a)',
      formalDefinition:
        'La integral definida es el límite de las sumas de Riemann Σ f(x_i*)·Δx cuando la partición se refina (max Δx → 0).',
    },
    pythonLab: {
      title: 'Regla del trapecio y Simpson con análisis de error',
      task: 'Compara el error de trapecio frente a Simpson al integrar sin(x) en [0, π].',
      code: `import math

def trapezoid(f, a, b, n):
    h = (b - a) / n
    return h * (0.5 * f(a) + 0.5 * f(b) + sum(f(a + i * h) for i in range(1, n)))

def simpson(f, a, b, n):
    h = (b - a) / n
    s = f(a) + f(b) + sum((4 if i % 2 else 2) * f(a + i * h) for i in range(1, n))
    return s * h / 3

for n in [4, 16]:
    t = trapezoid(math.sin, 0, math.pi, n)
    s = simpson(math.sin, 0, math.pi, n)
    print(f"n={n:>2} | err_trap={abs(t-2):.2e} | err_simp={abs(s-2):.2e}")`,
      mlApplication:
        'Cálculo del área bajo la curva ROC (AUC) y expectativas continuas en modelos probabilísticos.',
    },
    checkpoint: {
      question: 'Según el Teorema Fundamental del Cálculo, si F(x) mide el área acumulada bajo una curva continua f(t) desde a hasta x, ¿qué mide su derivada F′(x)?',
      options: [
        'Mide exactamente la altura instantánea f(x) de la curva en el extremo móvil x.',
        'Mide la pendiente f′(x) de la curva original evaluada en el punto fijo inicial a.',
        'Mide el ancho total del intervalo b − a dividido entre el número de rectángulos.',
        'Mide el error máximo cometido por la regla del trapecio al aproximar el área.',
      ],
      correctIndex: 0,
      explanation: 'Al avanzar x un pequeño dx, el área nueva añadida es una franja delgada de área f(x)·dx, luego dF/dx = f(x).',
    },
    references: ['OCW-1801', 'STW-ES', '3B1B'],
  },

  {
    id: 'M16',
    number: 16,
    phaseId: 'phase-3',
    level: '3-4',
    crayon: 'ochre',
    title: 'Sucesiones, series y Taylor',
    shortLabel: 'Series y Taylor',
    prerequisites: ['M15'],
    syllabus: [
      '16.1 Sucesiones y convergencia',
      '16.2 Series infinitas y criterios',
      '16.3 Series de potencias y radio de convergencia',
      '16.4 Polinomios de Taylor y cota de error',
    ],
    pureMathFocus:
      'Aproximar funciones suaves mediante polinomios locales y estudiar con rigor cuándo una suma infinita converge.',
    appliedCsMlFocus:
      'Cómo calculan las CPUs exp(x) y sin(x), aproximaciones de segundo orden en optimización (M29) y análisis de error numérico.',
    visualSpecs: [
      {
        concept: 'Polinomio de Taylor',
        visualization: 'Polinomios de grado N abrazando la curva',
        format: 'W',
        params: 'función, grado N y centro a',
        intuition: 'Añadir derivadas superiores hace que el polinomio abrace la curva en un entorno mayor.',
      },
      {
        concept: 'Radio de convergencia',
        visualization: 'Intervalo coloreado para 1/(1−x)',
        format: 'W',
        params: 'valor de evaluación x',
        intuition: 'Fuera del radio de convergencia (|x| ≥ 1), sumar más términos hace explotar la serie.',
      },
      {
        concept: 'Convergencia',
        visualization: 'Sumas parciales estabilizándose',
        format: 'A',
        params: 'índice k',
        intuition: 'Converger significa que las sumas parciales se acercan indefinidamente a un valor límite.',
      },
    ],
    concreteExample: {
      title: 'Aproximar e^0.5 con Taylor de orden 3',
      problem: 'Evaluar P₃(0.5) = 1 + x + x²/2 + x³/6 y comparar con e^0.5 ≈ 1.64872.',
      steps: [
        'Términos: 1 + 0.5 + 0.125 + 0.02083 = 1.64583.',
        'Error real: |1.64872 − 1.64583| ≈ 0.00289.',
        'Cota de Lagrange: e^0.5 · (0.5)⁴ / 24 ≤ 0.0043 ✓.',
      ],
      latex: 'f(x) \\approx \\sum_{k=0}^{N} \\frac{f^{(k)}(a)}{k!}(x-a)^k',
      formalDefinition:
        'El polinomio de Taylor de grado N en a es el único polinomio cuyas derivadas de orden 0 hasta N coinciden con las de f en a.',
    },
    pythonLab: {
      title: 'Cálculo de exp(x) por serie de Taylor frente a math.exp',
      task: 'Observa cuántos términos se necesitan para alcanzar precisión de máquina en x = 1.0.',
      code: `import math

def taylor_exp(x, degree):
    total, term = 1.0, 1.0
    for k in range(1, degree + 1):
        term *= x / k
        total += term
    return total

ref = math.exp(1.0)
for d in [2, 5, 10, 15]:
    val = taylor_exp(1.0, d)
    print(f"grado={d:>2} | approx={val:.12f} | err={abs(val-ref):.2e}")`,
      mlApplication:
        'Aproximación cuadrática de segundo orden (Hessiano / método de Newton) para acelerar la optimización de pérdidas.',
    },
    checkpoint: {
      question: 'Al aproximar f(x) = 1/(1 − x) con su serie de Maclaurin 1 + x + x² + … + x^N, ¿qué sucede si evalúas la serie en x = 1.2 aumentando el grado N?',
      options: [
        'La suma diverge sin límite porque x = 1.2 queda fuera del radio de convergencia |x| < 1.',
        'La suma converge lentamente hacia −5 siempre que se incluyan al menos cincuenta términos.',
        'La serie oscila entre dos valores fijos porque los términos alternan de signo en cada potencia.',
        'La aproximación mejora localmente al aumentar N ya que toda función suave converge en todo ℝ.',
      ],
      correctIndex: 0,
      explanation: 'La singularidad en x = 1 fija el radio de convergencia R = 1; fuera de (-1, 1) las potencias (1.2)^N explotan.',
    },
    references: ['OCW-1801', 'STW-ES', '3B1B'],
  },

  {
    id: 'M17',
    number: 17,
    phaseId: 'phase-3',
    level: '4',
    crayon: 'cobalt',
    title: 'Cálculo multivariable y vectorial',
    shortLabel: 'Multivariable',
    prerequisites: ['M14', 'M18'],
    syllabus: [
      '17.1 Funciones de varias variables',
      '17.2 Curvas de nivel',
      '17.3 Derivadas parciales',
      '17.4 Gradiente y derivada direccional',
      '17.5 Matriz Jacobiana',
      '17.6 Regla de la cadena multivariable',
      '17.7 Hessiano y puntos críticos',
      '17.8 Integrales dobles',
    ],
    pureMathFocus:
      'La derivada generalizada como mejor aproximación lineal (vector gradiente o matriz Jacobiana) y curvatura en el Hessiano.',
    appliedCsMlFocus:
      'Gradiente de la función de pérdida, Jacobiano en capas de redes neuronales y clasificación de puntos de silla con el Hessiano.',
    visualSpecs: [
      {
        concept: 'Superficie y nivel',
        visualization: 'Superficie 3D sincronizada con mapa de contorno',
        format: 'W',
        params: 'punto (x₀, y₀) y frecuencia ω',
        intuition: 'Las curvas de nivel son las rebanadas horizontales proyectadas de la superficie 3D.',
      },
      {
        concept: 'Gradiente',
        visualization: 'Campo vectorial ∇f sobre curvas de nivel',
        format: 'W',
        params: 'punto (x₀, y₀)',
        intuition: '∇f apunta en la dirección de máximo ascenso y es siempre perpendicular a la curva de nivel.',
      },
      {
        concept: 'Hessiano',
        visualization: 'Cuenco mínimo frente a punto de silla',
        format: 'W',
        params: 'curvaturas h_xx y h_yy',
        intuition: 'Los signos de las curvaturas principales distinguen un mínimo de un punto de silla.',
      },
      {
        concept: 'Jacobiano',
        visualization: 'Malla deformable con zoom local',
        format: 'W',
        params: 'punto y campo',
        intuition: 'Al hacer zoom suficiente, cualquier transformación suave se ve lineal.',
      },
    ],
    concreteExample: {
      title: 'Gradiente y perpendicularidad sobre f(x, y) = x² + 2y²',
      problem: 'Evaluar ∇f en (1, 1) y verificar su dirección respecto al elipsoide de nivel.',
      steps: [
        'Parciales: ∂f/∂x = 2x y ∂f/∂y = 4y.',
        'En (1, 1): ∇f(1, 1) = (2, 4).',
        'A lo largo de la curva de nivel f = 3, la tangente es (−2, 1); su producto punto con (2, 4) es 0 ✓.',
      ],
      latex: '\\nabla f(x,y) = \\begin{bmatrix} \\partial f / \\partial x \\\\ \\partial f / \\partial y \\end{bmatrix}, \\qquad D_{\\hat{u}} f = \\nabla f \\cdot \\hat{u}',
      formalDefinition:
        'Para f: ℝⁿ → ℝᵐ, la matriz Jacobiana J_ij = ∂f_i/∂x_j representa la mejor aproximación lineal local.',
    },
    pythonLab: {
      title: 'Gradiente analítico frente a diferencias finitas en NumPy',
      task: 'Comprueba que las derivadas parciales analíticas coinciden con diferencias centrales.',
      code: `import math

def f(x, y): return x * x + 2.0 * y * y
def grad_analytic(x, y): return (2.0 * x, 4.0 * y)
def grad_numeric(x, y, h=1e-6):
    gx = (f(x + h, y) - f(x - h, y)) / (2 * h)
    gy = (f(x, y + h) - f(x, y - h)) / (2 * h)
    return (gx, gy)

print("Analitico:", grad_analytic(1.0, 1.0))
print("Numerico: ", tuple(round(v, 6) for v in grad_numeric(1.0, 1.0)))`,
      mlApplication:
        'Actualización simultánea de millones de pesos en ML mediante el vector gradiente −α∇L(θ).',
    },
    checkpoint: {
      question: 'En un mapa de curvas de nivel de una superficie diferenciable f(x, y), ¿qué ángulo forma el vector gradiente ∇f con la curva de nivel que pasa por ese punto?',
      options: [
        'Es perpendicular (90°) a la curva de nivel y apunta hacia las curvas de mayor altura.',
        'Es tangente (0°) a la curva de nivel y señala el recorrido donde la altura permanece fija.',
        'Forma siempre un ángulo de 45° respecto a los ejes coordenados sin depender de la función.',
        'Apunta exactamente hacia el origen de coordenadas en cualquier punto donde f sea positiva.',
      ],
      correctIndex: 0,
      explanation: 'A lo largo de la curva de nivel la derivada direccional es cero (∇f · t = 0), por lo que ∇f es ortogonal a la tangente t.',
    },
    references: ['MML', 'IMP', 'STW-ES', '3B1B', 'DL'],
    linked3DSceneId: 'calc-partials',
  },
];
