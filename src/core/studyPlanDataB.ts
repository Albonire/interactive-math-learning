import type { StudyModuleSpec } from './studyPlanTypes';

/**
 * Phases 4, 5, and 6 (Modules M18 to M32) from PLAN_ESTUDIO.md.
 * Every checkpoint strictly adheres to Regla fija R-OM.
 */
export const STUDY_MODULES_B: StudyModuleSpec[] = [
  // ==================== FASE 4: ÁLGEBRA LINEAL (M18–M23) ====================
  {
    id: 'M18',
    number: 18,
    phaseId: 'phase-4',
    level: '3',
    crayon: 'cobalt',
    title: 'Vectores, matrices y transformaciones lineales',
    shortLabel: 'Matrices y Transform.',
    prerequisites: ['M4', 'M6'],
    syllabus: [
      '18.1 Vectores en ℝⁿ',
      '18.2 Combinación lineal y span',
      '18.3 Producto punto, norma y ángulo',
      '18.4 La matriz como transformación lineal',
      '18.5 Producto matricial como composición',
    ],
    pureMathFocus:
      'Una matriz no es una tabla estática de números: es una transformación lineal determinada por dónde aterrizan los vectores base î y ĵ.',
    appliedCsMlFocus:
      'Embeddings vectoriales, similitud coseno, motores gráficos y capas densas de redes neuronales Wx + b.',
    visualSpecs: [
      {
        concept: 'Matriz 2×2',
        visualization: 'Malla deformable con vectores base î y ĵ',
        format: 'W',
        params: 'entradas a, b, c, d',
        intuition: 'Las columnas de la matriz indican exactamente adónde van î y ĵ.',
      },
      {
        concept: 'Combinación lineal',
        visualization: 'Dos vectores que barren el plano',
        format: 'W',
        params: 'escalares c₁ y c₂',
        intuition: 'El span es todo el espacio alcanzable combinando los vectores.',
      },
      {
        concept: 'Producto de matrices',
        visualization: 'Dos transformaciones aplicadas en secuencia',
        format: 'A',
        params: 'orden A·B',
        intuition: 'Multiplicar matrices significa componer primero B y luego A.',
      },
      {
        concept: 'Producto punto',
        visualization: 'Proyección escalada sobre otro vector',
        format: 'W',
        params: 'ángulo entre u y v',
        intuition: 'Mide cuánto apuntan dos vectores en la misma dirección.',
      },
    ],
    concreteExample: {
      title: 'Leer una matriz 2×2 por sus columnas',
      problem: 'Aplicar A = [[2, 1], [0, 1]] al vector x = (3, 2) como combinación lineal de columnas.',
      steps: [
        'Primera columna (destino de î): (2, 0). Segunda columna (destino de ĵ): (1, 1).',
        'A·x = 3·(2, 0) + 2·(1, 1).',
        'Resultado: (6 + 2, 0 + 2) = (8, 2).',
      ],
      latex: 'A\\vec{x} = x_1\\vec{a}_1 + x_2\\vec{a}_2, \\qquad \\vec{u}\\cdot\\vec{v} = \\|\\vec{u}\\|\\|\\vec{v}\\|\\cos\\theta',
      formalDefinition:
        'T: ℝⁿ → ℝᵐ es lineal si y solo si T(αu + βv) = αT(u) + βT(v) para todo u, v y escalares α, β.',
    },
    pythonLab: {
      title: 'Transformación de un polígono 2×2 por columnas',
      task: 'Aplica una matriz de cizalladura y escala a un cuadrado unitario y calcula su nueva área.',
      code: `def mat2_vec(A, v):
    return (A[0][0]*v[0] + A[0][1]*v[1], A[1][0]*v[0] + A[1][1]*v[1])

A = [[2.0, 0.5], [0.0, 1.5]]
square = [(0,0), (1,0), (1,1), (0,1)]
transformed = [mat2_vec(A, p) for p in square]
print("Poligono transformado:", transformed)`,
      mlApplication:
        'Cada capa lineal y = Wx + b transforma el espacio de características antes de la activación no lineal.',
    },
    checkpoint: {
      question: 'Desde el punto de vista geométrico, ¿qué representan las columnas de una matriz A de tamaño 2×2?',
      options: [
        'Representan las coordenadas finales donde aterrizan los vectores base unitarios î y ĵ tras aplicar A.',
        'Representan los ángulos en radianes que gira cada eje coordenado sin alterar su longitud inicial.',
        'Representan los valores propios reales ordenados de mayor a menor a lo largo de la diagonal.',
        'Representan los puntos fijos del plano que permanecen inmóviles antes de trasladar el origen.',
      ],
      correctIndex: 0,
      explanation: 'Como A·[1,0]ᵀ es la columna 1 y A·[0,1]ᵀ es la columna 2, las columnas codifican por completo la transformación lineal.',
    },
    references: ['STR-ILA', 'OCW-1806', '3B1B', 'ILA', 'VMLS', 'CS229-LA'],
    linked3DSceneId: 'lin-span',
  },

  {
    id: 'M19',
    number: 19,
    phaseId: 'phase-4',
    level: '3',
    crayon: 'vermilion',
    title: 'Sistemas Ax = b, eliminación e inversas',
    shortLabel: 'Ax = b y LU',
    prerequisites: ['M18'],
    syllabus: [
      '19.1 Imagen de filas y de columnas',
      '19.2 Eliminación gaussiana',
      '19.3 Factorización LU',
      '19.4 Matriz inversa',
      '19.5 Transpuesta y matrices de permutación',
    ],
    pureMathFocus:
      'Dos imágenes complementarias del mismo sistema (intersección de filas vs receta de columnas) y eliminación como factorización A = LU.',
    appliedCsMlFocus:
      'Resolución de sistemas en simulación física, costo O(n³) y por qué en ingeniería se usa solve(A, b) en lugar de calcular A⁻¹ explícita.',
    visualSpecs: [
      {
        concept: 'Imagen de filas vs columnas',
        visualization: 'Doble panel sincronizado: rectas cortándose vs receta de columnas',
        format: 'W',
        params: 'coeficientes y pesos x₁, x₂',
        intuition: 'Cortar rectas y combinar columnas para alcanzar b resuelven exactamente el mismo problema.',
      },
      {
        concept: 'Eliminación',
        visualization: 'Matriz aumentada con pivotes resaltados paso a paso',
        format: 'A',
        params: 'paso de eliminación',
        intuition: 'Cada operación de fila corresponde a multiplicar por una matriz elemental.',
      },
      {
        concept: 'Inversa',
        visualization: 'Transformación A y su deshacer A⁻¹',
        format: 'A',
        params: 'reversión',
        intuition: 'A⁻¹ devuelve la malla deformada exactamente a la cuadrícula identidad.',
      },
    ],
    concreteExample: {
      title: 'Eliminación gaussiana y factorización LU en 2×2',
      problem: 'Resolver [[2, 1], [4, 5]]·x = [5, 13] eliminando el 4 debajo del pivote 2.',
      steps: [
        'Multiplicador ℓ₂₁ = 4 / 2 = 2. Resta 2·(fila 1) a la fila 2.',
        'Queda U = [[2, 1], [0, 3]] y b′ = [5, 3] → x₂ = 1, luego 2x₁ + 1 = 5 → x₁ = 2.',
        'L = [[1, 0], [2, 1]] cumple L·U = A.',
      ],
      latex: 'A = LU, \\qquad (AB)^{-1} = B^{-1}A^{-1}',
      formalDefinition:
        'A es invertible si y solo si tiene n pivotes no nulos, equivalente a que Ax = 0 tenga únicamente la solución trivial x = 0.',
    },
    pythonLab: {
      title: 'Eliminación gaussiana con pivoteo parcial',
      task: 'Implementa eliminación con pivoteo para evitar divisiones por pivotes casi nulos.',
      code: `def gauss_solve(A, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[piv] = M[piv], M[col]
        for r in range(col + 1, n):
            f = M[r][col] / M[col][col]
            for c in range(col, n + 1):
                M[r][c] -= f * M[col][c]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))) / M[i][i]
    return x

print(gauss_solve([[2, 1], [4, 5]], [5, 13]))  # [2.0, 1.0]`,
      mlApplication:
        'Solución rápida de ecuaciones normales y pasos de Newton sin formar la inversa explícita A⁻¹.',
    },
    checkpoint: {
      question: 'En cómputo científico, ¿por qué se prefiere resolver Ax = b mediante factorización LU en lugar de calcular primero la matriz inversa A⁻¹?',
      options: [
        'Porque LU cuesta menos operaciones, ofrece mejor estabilidad numérica y permite reutilizar factores para varios b.',
        'Porque la matriz inversa A⁻¹ no existe para matrices cuadradas cuyas entradas sean números decimales reales.',
        'Porque la factorización LU reduce la complejidad asintótica de resolver un sistema denso de O(n³) a O(n).',
        'Porque calcular A⁻¹ exige que la matriz A sea simétrica y diagonal antes de iniciar la eliminación.',
      ],
      correctIndex: 0,
      explanation: 'Invertir explícitamente realiza ~3× más operaciones, pierde precisión en matrices mal condicionadas y no aprovecha la estructura triangular.',
    },
    references: ['STR-ILA', 'OCW-1806', 'ILA', 'VMLS'],
  },

  {
    id: 'M20',
    number: 20,
    phaseId: 'phase-4',
    level: '4',
    crayon: 'sage',
    title: 'Espacios vectoriales, base, dimensión y los cuatro subespacios',
    shortLabel: 'Cuatro Subespacios',
    prerequisites: ['M19'],
    syllabus: [
      '20.1 Espacios y subespacios vectoriales',
      '20.2 Espacio nulo y espacio columna',
      '20.3 Independencia lineal',
      '20.4 Base y dimensión',
      '20.5 Rango de una matriz',
      '20.6 Los cuatro subespacios fundamentales',
    ],
    pureMathFocus:
      'Abstracción axiomática (LADR), teorema de rango-nulidad y la ortogonalidad perfecta en el diagrama de los cuatro subespacios de Strang.',
    appliedCsMlFocus:
      'Colinealidad de características en datasets, compresión de representaciones y grados de libertad de un modelo.',
    visualSpecs: [
      {
        concept: 'Cuatro subespacios',
        visualization: 'Diagrama interactivo de Strang',
        format: 'E',
        params: 'dimensiones m, n y rango r',
        intuition: 'Fila ⊥ Nulo en ℝⁿ y Columna ⊥ Nulo izquierdo en ℝᵐ; sus dimensiones siempre suman n y m.',
      },
      {
        concept: 'Independencia',
        visualization: 'Vectores 3D que forman volumen o colapsan',
        format: 'W',
        params: 'altura de v₃',
        intuition: 'Un vector dependiente es redundante y aplasta el volumen a cero.',
      },
      {
        concept: 'Espacio nulo',
        visualization: 'Direcciones aplastadas al origen',
        format: 'A',
        params: 'matriz singular',
        intuition: 'El espacio nulo recoge exactamente todo lo que la matriz borra al cero.',
      },
    ],
    concreteExample: {
      title: 'Contabilidad dimensional para una matriz 3×4 de rango 2',
      problem: 'Hallar las dimensiones de los cuatro subespacios de A ∈ ℝ³ˣ⁴ con rango r = 2.',
      steps: [
        'Espacio fila C(Aᵀ) ⊆ ℝ⁴ tiene dimensión r = 2.',
        'Espacio nulo N(A) ⊆ ℝ⁴ tiene dimensión n − r = 4 − 2 = 2 (ortogonal a C(Aᵀ)).',
        'Espacio columna C(A) ⊆ ℝ³ tiene dim r = 2; nulo izquierdo N(Aᵀ) ⊆ ℝ³ tiene dim m − r = 1.',
      ],
      latex: '\\dim C(A) + \\dim N(A) = n, \\qquad C(A^T) \\perp N(A), \\quad C(A) \\perp N(A^T)',
      formalDefinition:
        'Una base de un espacio vectorial V es un conjunto linealmente independiente que genera todo V; su cardinal es la dimensión de V.',
    },
    pythonLab: {
      title: 'Rango numérico con tolerancia sobre valores singulares',
      task: 'Detecta la colinealidad real distinguiendo ceros exactos de ruido flotante 1e-12.',
      code: `def rank_from_singular_values(sigmas, tol=1e-10):
    if not sigmas:
        return 0
    cutoff = max(sigmas) * tol
    return sum(1 for s in sigmas if s > cutoff)

print("Rango efectivo:", rank_from_singular_values([3.2, 1.4, 2e-15]))`,
      mlApplication:
        'Detección de features colineales redundantes y análisis del rango efectivo en adaptadores LoRA de modelos grandes.',
    },
    checkpoint: {
      question: 'Para una matriz A de tamaño 4×6 con rango r = 3, ¿cuáles son las dimensiones de su espacio nulo N(A) y de su espacio columna C(A)?',
      options: [
        'El espacio nulo N(A) tiene dimensión 3 y el espacio columna C(A) tiene dimensión 3.',
        'El espacio nulo N(A) tiene dimensión 1 y el espacio columna C(A) tiene dimensión 4.',
        'El espacio nulo N(A) tiene dimensión 6 y el espacio columna C(A) tiene dimensión 3.',
        'El espacio nulo N(A) tiene dimensión 4 y el espacio columna C(A) tiene dimensión 2.',
      ],
      correctIndex: 0,
      explanation: 'dim C(A) = r = 3 y por rango-nulidad dim N(A) = n − r = 6 − 3 = 3.',
    },
    references: ['STR-ILA', 'OCW-1806', 'LADR', 'ILA'],
    linked3DSceneId: 'lin-span',
  },

  {
    id: 'M21',
    number: 21,
    phaseId: 'phase-4',
    level: '4',
    crayon: 'ochre',
    title: 'Ortogonalidad, proyecciones y mínimos cuadrados',
    shortLabel: 'Mínimos Cuadrados',
    prerequisites: ['M20'],
    syllabus: [
      '21.1 Vectores y subespacios ortogonales',
      '21.2 Proyección ortogonal',
      '21.3 Mínimos cuadrados (ecuaciones normales)',
      '21.4 Proceso de Gram-Schmidt',
      '21.5 Factorización QR',
    ],
    pureMathFocus:
      'Cuando Ax = b no tiene solución exacta, la mejor aproximación posible es proyectar b ortogonalmente sobre el espacio columna.',
    appliedCsMlFocus:
      'Regresión lineal ordinaria (OLS), ajuste de modelos a datos ruidosos y estabilidad con factorización QR.',
    visualSpecs: [
      {
        concept: 'Mínimos cuadrados',
        visualization: 'Recta ajustable con residuos dibujados como cuadrados reales',
        format: 'W',
        params: 'pendiente m e intercepto c',
        intuition: 'Minimizar Σ(yᵢ − ŷᵢ)² equivale literalmente a minimizar el área total de esos cuadrados.',
      },
      {
        concept: 'Proyección',
        visualization: 'Vector b proyectado con error perpendicular e ⊥ a',
        format: 'W',
        params: 'vector b',
        intuition: 'El error más corto posible cae exactamente a 90° sobre el subespacio.',
      },
      {
        concept: 'Gram-Schmidt',
        visualization: 'Vectores enderezándose uno a uno',
        format: 'A',
        params: 'paso ortogonal',
        intuition: 'Restar la sombra ya cubierta deja únicamente la componente perpendicular nueva.',
      },
    ],
    concreteExample: {
      title: 'Ecuaciones normales AᵀAx̂ = Aᵀb en 3 puntos',
      problem: 'Ajustar y = m·x + c a los puntos (0, 1), (1, 2), (2, 4).',
      steps: [
        'Construye A = [[1,0],[1,1],[1,2]] y b = [1, 2, 4]ᵀ.',
        'AᵀA = [[3, 3], [3, 5]] y Aᵀb = [7, 10]ᵀ.',
        'Resolviendo: c = 5/6 ≈ 0.833 y m = 1.5; el error e = b − Ax̂ es ortogonal a las columnas de A ✓.',
      ],
      latex: 'A^T A\\hat{x} = A^T b, \\qquad \\hat{e} = b - A\\hat{x} \\perp C(A)',
      formalDefinition:
        'La matriz de proyección sobre C(A) (con columnas independientes) es P = A(AᵀA)⁻¹Aᵀ y satisface P² = P y Pᵀ = P.',
    },
    pythonLab: {
      title: 'Regresión por mínimos cuadrados y verificación de ortogonalidad',
      task: 'Calcula la recta OLS y comprueba que el vector residuo tiene producto punto 0 con las columnas.',
      code: `xs = [0.0, 1.0, 2.0, 3.0]
ys = [1.0, 2.1, 3.8, 5.2]
mx, my = sum(xs)/len(xs), sum(ys)/len(ys)
m = sum((x-mx)*(y-my) for x,y in zip(xs,ys)) / sum((x-mx)**2 for x in xs)
c = my - m * mx
res = [y - (m*x + c) for x, y in zip(xs, ys)]
print(f"y = {m:.3f}x + {c:.3f} | sum(res)={sum(res):.1e} | dot(x,res)={sum(x*r for x,r in zip(xs,res)):.1e}")`,
      mlApplication:
        'Base matemática de la regresión lineal, Ridge regression y ortogonalización estable de matrices en ML.',
    },
    checkpoint: {
      question: 'En el método de mínimos cuadrados para Ax ≈ b, ¿qué relación geométrica caracteriza al vector residuo óptimo e = b − Ax̂?',
      options: [
        'El residuo óptimo es estrictamente ortogonal a todas las columnas que generan el espacio columna C(A).',
        'El residuo óptimo es paralelo al vector de observaciones b y tiene exactamente la mitad de su longitud.',
        'El residuo óptimo pertenece al espacio columna C(A) para asegurar que la suma de errores sea positiva.',
        'El residuo óptimo anula únicamente el error en el último dato registrado dentro de la matriz A.',
      ],
      correctIndex: 0,
      explanation: 'Que e = b − Ax̂ sea perpendicular a C(A) significa Aᵀ(b − Ax̂) = 0, de donde surgen de inmediato las ecuaciones normales AᵀAx̂ = Aᵀb.',
    },
    references: ['STR-ILA', 'OCW-1806', 'VMLS', 'MML'],
  },

  {
    id: 'M22',
    number: 22,
    phaseId: 'phase-4',
    level: '4',
    crayon: 'plum',
    title: 'Determinantes, valores y vectores propios',
    shortLabel: 'Eigenvalores',
    prerequisites: ['M21'],
    syllabus: [
      '22.1 Determinante como volumen con signo',
      '22.2 Valores y vectores propios (Av = λv)',
      '22.3 Diagonalización A = SΛS⁻¹',
      '22.4 Potencias de matrices y cadenas de Markov',
      '22.5 Teorema espectral (matrices simétricas)',
      '22.6 Matrices definidas positivas',
    ],
    pureMathFocus:
      'Direcciones invariantes que no rotan bajo A y descomposición espectral ortogonal de matrices simétricas.',
    appliedCsMlFocus:
      'Algoritmo PageRank, estado estacionario de cadenas de Markov, estabilidad de sistemas dinámicos y análisis de curvatura.',
    visualSpecs: [
      {
        concept: 'Vector propio',
        visualization: 'Direcciones invariantes resaltadas en el plano',
        format: 'W',
        params: 'entradas de matriz A',
        intuition: 'Los autovectores no se desvían de su línea: solo se estiran o encogen por λ.',
      },
      {
        concept: 'A^k (Método de potencia)',
        visualization: 'Vector iterado convergiendo al eje dominante',
        format: 'A',
        params: 'iteraciones k',
        intuition: 'Multiplicar repetidamente por A alinea casi cualquier vector con el mayor |λ|.',
      },
      {
        concept: 'Determinante',
        visualization: 'Área deformada del cuadrado unitario',
        format: 'W',
        params: 'matriz A',
        intuition: 'det(A) = 0 indica aplastamiento dimensional; det < 0 invierte la orientación.',
      },
    ],
    concreteExample: {
      title: 'Autovalores de una matriz simétrica 2×2',
      problem: 'Hallar los eigenpares de A = [[3, 1], [1, 3]].',
      steps: [
        'Traza = λ₁ + λ₂ = 6 y determinante = λ₁·λ₂ = 9 − 1 = 8.',
        'Por inspección: λ₁ = 4 y λ₂ = 2.',
        'Autovectores ortogonales: v₁ = (1, 1) (se estira ×4) y v₂ = (1, −1) (se estira ×2).',
      ],
      latex: 'A\\vec{v} = \\lambda\\vec{v} \\iff \\det(A - \\lambda I) = 0, \\qquad A = Q\\Lambda Q^T\\;(A=A^T)',
      formalDefinition:
        'Teorema Espectral: toda matriz real simétrica A = Aᵀ posee autovalores reales y una base ortonormal completa de autovectores.',
    },
    pythonLab: {
      title: 'PageRank mediante iteración de potencia',
      task: 'Encuentra la distribución estacionaria de importancia en un mini-grafo web de 3 páginas.',
      code: `P = [
    [0.0, 0.5, 1.0],
    [0.5, 0.0, 0.0],
    [0.5, 0.5, 0.0],
]
v = [1/3, 1/3, 1/3]
for _ in range(25):
    v = [sum(P[i][j] * v[j] for j in range(3)) for i in range(3)]
print("PageRank estacionario:", [round(x, 4) for x in v])`,
      mlApplication:
        'Análisis espectral de grafos, estabilidad de redes recurrentes (explosión/desvanecimiento según |λ|) y matrices de covarianza.',
    },
    checkpoint: {
      question: 'Si una matriz cuadrada A tiene todos sus autovalores con magnitud |λ| < 1, ¿qué ocurre con el vector A^k·v cuando k tiende a infinito?',
      options: [
        'El vector iterado se contrae progresivamente hasta converger al vector nulo cero.',
        'El vector iterado crece indefinidamente en norma a lo largo de la dirección dominante.',
        'El vector iterado conserva exactamente su longitud original girando alrededor del origen.',
        'El vector iterado oscila entre los vectores de la base canónica sin acercarse a un límite.',
      ],
      correctIndex: 0,
      explanation: 'Al expresar v en la base propia, cada componente se multiplica por λᵢ^k → 0 cuando |λᵢ| < 1.',
    },
    references: ['STR-ILA', 'OCW-1806', '3B1B', 'ILA', 'IMP'],
    linked3DSceneId: 'lin-eigen',
  },

  {
    id: 'M23',
    number: 23,
    phaseId: 'phase-4',
    level: '4-5',
    crayon: 'cobalt',
    title: 'SVD, aproximación de bajo rango y PCA',
    shortLabel: 'SVD y PCA',
    prerequisites: ['M22'],
    syllabus: [
      '23.1 SVD como rotar, escalar y rotar',
      '23.2 Valores singulares σ₁ ≥ σ₂ ≥ … ≥ 0',
      '23.3 Teorema de Eckart-Young (mejor rango k)',
      '23.4 Pseudoinversa de Moore-Penrose',
      '23.5 PCA por covarianza y por SVD',
    ],
    pureMathFocus:
      'Toda matriz rectangular A se descompone en A = UΣVᵀ y su truncamiento a los k mayores valores singulares es la mejor aproximación posible de rango k.',
    appliedCsMlFocus:
      'Compresión de imágenes, reducción de dimensionalidad (PCA), sistemas de recomendación y búsqueda semántica latente.',
    visualSpecs: [
      {
        concept: 'Bajo rango',
        visualization: 'Reconstrucción interactiva de matriz/imagen con k valores singulares',
        format: 'W',
        params: 'rango k (1..6)',
        intuition: 'Pocas componentes principales capturan casi toda la energía estructural.',
      },
      {
        concept: 'SVD',
        visualization: 'Círculo a elipse en tres actos (Vᵀ → Σ → U)',
        format: 'A',
        params: 'etapa t_SVD',
        intuition: 'Toda transformación lineal es simplemente rotar, estirar ejes perpendiculares y volver a rotar.',
      },
      {
        concept: 'PCA',
        visualization: 'Nube 2D con ejes principales de máxima varianza',
        format: 'W',
        params: 'ángulo y dispersión de la nube',
        intuition: 'El primer componente principal sigue la dirección donde los datos más se extienden.',
      },
      {
        concept: 'Espectro',
        visualization: 'Barras decrecientes de valores singulares σᵢ',
        format: 'E',
        params: 'energía acumulada',
        intuition: 'Muestra cuánta información aporta cada nueva componente.',
      },
    ],
    concreteExample: {
      title: 'Energía capturada por truncamiento SVD de rango k',
      problem: 'Una matriz tiene valores singulares σ = [10, 4, 1, 0.2]. ¿Qué fracción de energía guarda rango k = 2?',
      steps: [
        'Energía total (norma Frobenius al cuadrado): 10² + 4² + 1² + 0.2² = 117.04.',
        'Energía en las 2 primeras componentes: 100 + 16 = 116.',
        'Fracción retenida: 116 / 117.04 = 99.1% usando la mitad de componentes ✓.',
      ],
      latex: 'A = U\\Sigma V^T = \\sum_{i=1}^{r} \\sigma_i\\,\\vec{u}_i\\vec{v}_i^T, \\qquad A_k = \\sum_{i=1}^{k} \\sigma_i\\,\\vec{u}_i\\vec{v}_i^T',
      formalDefinition:
        'Teorema de Eckart-Young: A_k minimiza ||A − B||_F entre todas las matrices B de rango a lo sumo k.',
    },
    pythonLab: {
      title: 'Compresión de bajo rango y energía acumulada por SVD',
      task: 'Calcula el porcentaje de varianza explicada al retener k componentes principales.',
      code: `sigmas = [10.0, 4.0, 1.0, 0.2]
total_energy = sum(s * s for s in sigmas)
acc = 0.0
for k, s in enumerate(sigmas, start=1):
    acc += s * s
    print(f"rango k={k} | sigma={s:>4.1f} | energia retenida={100*acc/total_energy:.2f}%")`,
      mlApplication:
        'Compresión de pesos de redes neuronales, PCA para visualización de embeddings y factorización de matrices en recomendadores.',
    },
    checkpoint: {
      question: 'Según el teorema de Eckart-Young, ¿cómo se construye la mejor aproximación de rango k a una matriz A en norma de Frobenius?',
      options: [
        'Conservando únicamente los k mayores valores singulares σᵢ junto con sus vectores singulares asociados.',
        'Eliminando las k columnas con menor promedio aritmético antes de multiplicar por la matriz identidad.',
        'Reemplazando todos los valores de la diagonal principal de A por el promedio de sus elementos.',
        'Conservando los k valores singulares más pequeños para reducir el ruido de alta magnitud en A.',
      ],
      correctIndex: 0,
      explanation: 'Cada término σᵢ·uᵢvᵢᵀ aporta energía σᵢ²; retener los k mayores minimiza exactamente el error residual √(Σ_{i>k} σᵢ²).',
    },
    references: ['OCW-18065', 'STR-LALD', 'MML', 'IMP', 'LADR', 'DL'],
    linked3DSceneId: 'lin-svd',
  },

  // ==================== FASE 5: PROBABILIDAD Y ESTADÍSTICA (M24–M27) ====================
  {
    id: 'M24',
    number: 24,
    phaseId: 'phase-5',
    level: '3',
    crayon: 'sage',
    title: 'Fundamentos de probabilidad',
    shortLabel: 'Probabilidad y Bayes',
    prerequisites: ['M11', 'M15'],
    syllabus: [
      '24.1 Espacio muestral y eventos',
      '24.2 Axiomas de Kolmogorov',
      '24.3 Probabilidad condicional',
      '24.4 Independencia de eventos',
      '24.5 Ley de probabilidad total',
      '24.6 Teorema de Bayes',
    ],
    pureMathFocus:
      'La probabilidad como medida axiomática sobre eventos y actualización rigurosa de creencias condicionales.',
    appliedCsMlFocus:
      'Clasificadores Naive Bayes y filtros de spam, pruebas A/B y algoritmos aleatorizados.',
    visualSpecs: [
      {
        concept: 'Teorema de Bayes',
        visualization: 'Cuadrado unidad de frecuencias (VP, FN, FP, VN)',
        format: 'W',
        params: 'prevalencia, sensibilidad y falsos positivos',
        intuition: 'Cuando la tasa base es muy baja, los falsos positivos pueden superar a los verdaderos positivos.',
      },
      {
        concept: 'Frecuencia empírica',
        visualization: 'Simulador Monte Carlo de lanzamientos',
        format: 'W',
        params: 'número de ensayos n y probabilidad p',
        intuition: 'La frecuencia relativa se estabiliza alrededor de p al crecer las repeticiones.',
      },
      {
        concept: 'Condicional',
        visualization: 'Universo restringido al evento B',
        format: 'A',
        params: 'evento condicionante',
        intuition: 'Condicionar en B equivale a hacer zoom descartando todo lo externo a B.',
      },
    ],
    concreteExample: {
      title: 'Paradoja de la tasa base en una prueba médica',
      problem: 'Prevalencia P(H) = 1%, sensibilidad P(+|H) = 95% y falsos positivos P(+|¬H) = 5%. Hallar P(H|+).',
      steps: [
        'En 1000 personas: 10 enfermas (9.5 dan +) y 990 sanas (49.5 dan +).',
        'Total de positivos: 9.5 + 49.5 = 59.',
        'P(H|+) = 9.5 / 59 ≈ 16.1% — ¡la mayoría de positivos son falsas alarmas por la baja prevalencia!',
      ],
      latex: 'P(H \\mid E) = \\frac{P(E \\mid H)\\,P(H)}{P(E \\mid H)\\,P(H) + P(E \\mid \\neg H)\\,P(\\neg H)}',
      formalDefinition:
        'Dos eventos A y B son independientes si y solo si P(A ∩ B) = P(A)·P(B).',
    },
    pythonLab: {
      title: 'Verificación de Bayes por fórmula exacta y simulación Monte Carlo',
      task: 'Simula 100 000 pruebas diagnósticas y compara la tasa posterior empírica con la fórmula de Bayes.',
      code: `import random

prev, sens, fpr = 0.01, 0.95, 0.05
exact = (sens * prev) / (sens * prev + fpr * (1 - prev))

tp = fp = 0
for _ in range(100_000):
    sick = random.random() < prev
    pos = (random.random() < sens) if sick else (random.random() < fpr)
    if pos:
        tp += int(sick)
        fp += int(not sick)
print(f"Bayes exacto={exact:.4f} | Monte Carlo={tp/(tp+fp):.4f}")`,
      mlApplication:
        'Clasificación probabilística, calibración de alertas de fraude y razonamiento bajo incertidumbre.',
    },
    checkpoint: {
      question: 'En una prueba diagnóstica con 95 % de sensibilidad para una condición muy rara (1 % de prevalencia), ¿por qué un resultado positivo suele tener probabilidad posterior baja?',
      options: [
        'Porque el 99 % sano genera un volumen grande de falsos positivos que diluye los verdaderos positivos.',
        'Porque la sensibilidad del 95 % indica que casi todas las personas enfermas obtienen un resultado negativo.',
        'Porque los axiomas de probabilidad prohíben que la probabilidad condicional supere el 50 % inicial.',
        'Porque los eventos verdadero positivo y falso positivo son siempre independientes entre sí.',
      ],
      correctIndex: 0,
      explanation: 'Al multiplicar el gran tamaño del grupo sano (99%) por la tasa de falsos positivos, el área FP fácilmente supera al área VP.',
    },
    references: ['BH', 'STAT110', 'CS109R', 'OCW-1805', 'ST', 'OCW-61200'],
  },

  {
    id: 'M25',
    number: 25,
    phaseId: 'phase-5',
    level: '3-4',
    crayon: 'cobalt',
    title: 'Variables aleatorias y distribuciones',
    shortLabel: 'Distribuciones',
    prerequisites: ['M24'],
    syllabus: [
      '25.1 Variables aleatorias discretas y continuas',
      '25.2 PMF, PDF y función acumulada CDF',
      '25.3 Esperanza y linealidad',
      '25.4 Varianza y desviación estándar',
      '25.5 Bernoulli, Binomial, Geométrica y Poisson',
      '25.6 Uniforme, Exponencial y Normal',
    ],
    pureMathFocus:
      'La variable aleatoria como función medible y cada familia de distribuciones entendida como una historia generativa (BH).',
    appliedCsMlFocus:
      'Modelado de tráfico web (Poisson), inicialización de pesos neuronales (Normal/Uniforme) y ruido en datos.',
    visualSpecs: [
      {
        concept: 'PMF / PDF y CDF',
        visualization: 'Distribución interactiva con umbral x y área acumulada F(x)',
        format: 'W',
        params: 'familia (Binomial, Poisson, Normal), parámetros y x',
        intuition: 'La CDF en x acumula toda la masa o área a la izquierda de x.',
      },
      {
        concept: 'Esperanza',
        visualization: 'Fulcro de equilibrio bajo el histograma',
        format: 'W',
        params: 'parámetros de la distribución',
        intuition: 'La esperanza E[X] es el centro de masa físico donde se equilibra la distribución.',
      },
      {
        concept: 'Varianza',
        visualization: 'Bandas ±σ de dispersión',
        format: 'W',
        params: 'desviación σ',
        intuition: 'Mide el promedio cuadrático de cuánto se alejan los valores de su centro.',
      },
    ],
    concreteExample: {
      title: 'Linealidad de la esperanza en una Binomial(n, p)',
      problem: 'Hallar el número esperado de éxitos en n = 20 lanzamientos con p = 0.3 sin sumar factoriales.',
      steps: [
        'Escribe X = I₁ + I₂ + … + I₂₀ donde cada I_k ∈ {0, 1} es una Bernoulli(0.3).',
        'Por linealidad (incluso si hubiese dependencia): E[X] = Σ E[I_k].',
        'E[X] = 20 × 0.3 = 6 éxitos esperados.',
      ],
      latex: 'E[aX + bY] = aE[X] + bE[Y], \\qquad \\operatorname{Var}(X) = E[(X - \\mu)^2] = E[X^2] - (E[X])^2',
      formalDefinition:
        'Para una variable continua X con densidad f, P(a ≤ X ≤ b) = ∫_a^b f(x) dx y F(x) = P(X ≤ x).',
    },
    pythonLab: {
      title: 'Distribución Binomial y verificación de media y varianza',
      task: 'Calcula la PMF exacta, la CDF acumulada y verifica que E[X]=np y Var(X)=np(1−p).',
      code: `import math

n, p = 10, 0.3
pmf = [math.comb(n, k) * (p ** k) * ((1 - p) ** (n - k)) for k in range(n + 1)]
mean = sum(k * pk for k, pk in enumerate(pmf))
var = sum(((k - mean) ** 2) * pk for k, pk in enumerate(pmf))
print(f"E[X]={mean:.2f} (np={n*p:.2f}) | Var={var:.2f} (npq={n*p*(1-p):.2f})")`,
      mlApplication:
        'Inicialización Xavier/He ajustando la varianza de pesos según el número de entradas para evitar saturación.',
    },
    checkpoint: {
      question: 'Para dos variables aleatorias cualesquiera X e Y con esperanza finita, ¿cuándo se cumple la igualdad E[X + Y] = E[X] + E[Y]?',
      options: [
        'Se cumple siempre sin excepción, tanto si X e Y son independientes como si están correlacionadas.',
        'Se cumple exclusivamente cuando las variables X e Y son estadísticamente independientes entre sí.',
        'Se cumple únicamente si ambas variables siguen una distribución normal con exactamente la misma varianza.',
        'Se cumple solo cuando todos los valores posibles de X e Y son números enteros estrictamente positivos.',
      ],
      correctIndex: 0,
      explanation: 'La linealidad de la esperanza nunca requiere independencia (a diferencia de Var(X+Y) = Var(X)+Var(Y), que sí requiere covarianza cero).',
    },
    references: ['BH', 'CS109R', 'ST', 'OCW-1805', 'OCW-61200'],
  },

  {
    id: 'M26',
    number: 26,
    phaseId: 'phase-5',
    level: '4',
    crayon: 'ochre',
    title: 'Distribuciones conjuntas y teoremas límite',
    shortLabel: 'TCL y Covarianza',
    prerequisites: ['M25', 'M17'],
    syllabus: [
      '26.1 Distribuciones conjuntas y marginales',
      '26.2 Covarianza y correlación ρ',
      '26.3 Distribución normal multivariada',
      '26.4 Desigualdades de Markov y Chebyshev',
      '26.5 Ley de los grandes números (LGN)',
      '26.6 Teorema central del límite (TCL)',
    ],
    pureMathFocus:
      'Estructura de dependencia entre variables aleatorias y leyes universales que rigen los promedios muestrales.',
    appliedCsMlFocus:
      'Matrices de covarianza hacia PCA, promedios de gradientes en mini-batches y dimensionamiento de muestras.',
    visualSpecs: [
      {
        concept: 'Teorema Central del Límite',
        visualization: 'Histograma vivo de medias muestrales convergiendo a campana',
        format: 'W',
        params: 'distribución base (Uniforme, Sesgada, Bimodal) y tamaño n',
        intuition: 'Promediar muestras independientes produce una campana normal sin importar la forma original.',
      },
      {
        concept: 'Normal multivariada',
        visualization: 'Elipse de covarianza con ejes propios y correlación ρ',
        format: 'W',
        params: 'correlación ρ y desviaciones',
        intuition: 'La matriz de covarianza define directamente la forma e inclinación de la nube de datos.',
      },
      {
        concept: 'LGN',
        visualization: 'Trayectoria de media acumulada',
        format: 'A',
        params: 'tamaño muestral',
        intuition: 'Al sumar más muestras, el promedio empírico se estabiliza alrededor de la media real μ.',
      },
    ],
    concreteExample: {
      title: 'Reducción de varianza al promediar un mini-batch de tamaño n',
      problem: 'Si cada gradiente individual tiene desviación σ = 4, ¿qué desviación tiene el promedio de n = 16 muestras?',
      steps: [
        'Var(X̄) = σ² / n = 16 / 16 = 1.',
        'Desviación estándar del promedio: σ / √n = 4 / 4 = 1.',
        'Para reducir el ruido a la mitad se necesita cuadruplicar el tamaño del mini-batch.',
      ],
      latex: '\\bar{X}_n \\xrightarrow{p} \\mu, \\qquad \\frac{\\bar{X}_n - \\mu}{\\sigma / \\sqrt{n}} \\xrightarrow{d} \\mathcal{N}(0, 1)',
      formalDefinition:
        'La covarianza Cov(X, Y) = E[(X − μ_X)(Y − μ_Y)] mide la asociación lineal; su versión normalizada es ρ ∈ [−1, 1].',
    },
    pythonLab: {
      title: 'Simulación del Teorema Central del Límite desde una distribución sesgada',
      task: 'Toma 2000 medias de tamaño n=30 de una exponencial y verifica media y desviación teórica.',
      code: `import random, statistics

def sample_means(n, trials=2000):
    return [sum(random.expovariate(1.0) for _ in range(n)) / n for _ in range(trials)]

means = sample_means(30)
print(f"Media empirica={statistics.mean(means):.3f} (teorica 1.000)")
print(f"Std empirica={statistics.stdev(means):.3f} (teorica {1/30**0.5:.3f})")`,
      mlApplication:
        'Estabilidad de gradientes en SGD por mini-batches y estimación de incertidumbre en evaluación de modelos.',
    },
    checkpoint: {
      question: 'Según el Teorema Central del Límite, ¿cómo cambia la desviación estándar del promedio muestral X̄ cuando multiplicas por cuatro el tamaño n de la muestra?',
      options: [
        'La desviación estándar del promedio muestral se reduce exactamente a la mitad (factor 1/√4).',
        'La desviación estándar del promedio muestral se reduce exactamente a la cuarta parte (factor 1/4).',
        'La desviación estándar del promedio muestral permanece constante porque solo cambia la forma.',
        'La desviación estándar del promedio muestral se duplica al acumular cuatro veces más variabilidad.',
      ],
      correctIndex: 0,
      explanation: 'El error estándar es σ / √n, por lo que cuadruplicar n divide la dispersión entre √4 = 2.',
    },
    references: ['BH', 'CS109R', 'ST', 'MML', 'OCW-61200'],
  },

  {
    id: 'M27',
    number: 27,
    phaseId: 'phase-5',
    level: '4',
    crayon: 'vermilion',
    title: 'Inferencia estadística y regresión',
    shortLabel: 'Inferencia y MLE/MAP',
    prerequisites: ['M26', 'M21'],
    syllabus: [
      '27.1 Estimación puntual',
      '27.2 Máxima verosimilitud (MLE)',
      '27.3 Intervalos de confianza',
      '27.4 Pruebas de hipótesis',
      '27.5 Bootstrap',
      '27.6 Inferencia bayesiana y MAP',
      '27.7 Regresión probabilística',
    ],
    pureMathFocus:
      'El puente inverso de los datos al modelo generativo, contrastando la visión frecuentista (MLE, intervalos) con la bayesiana (prior y posterior).',
    appliedCsMlFocus:
      'Entrenar un modelo es maximizar verosimilitud (MLE), la regularización L2/L1 equivale exactamente a estimación MAP, y pruebas A/B en producción.',
    visualSpecs: [
      {
        concept: 'Bayes: Prior → Posterior',
        visualization: 'Curvas superpuestas de Prior, Verosimilitud y Posterior',
        format: 'W',
        params: 'éxitos, fracasos y fuerza del prior',
        intuition: 'Los datos desplazan la creencia previa; el máximo posterior (MAP) regulariza el MLE.',
      },
      {
        concept: 'Intervalo de confianza',
        visualization: '20 intervalos simulados al 95 %',
        format: 'A',
        params: 'remuestreo',
        intuition: 'El 95 % describe la confiabilidad del procedimiento repetido, no una probabilidad del parámetro fijo.',
      },
      {
        concept: 'Verosimilitud',
        visualization: 'Curva L(θ) marcando la cima MLE',
        format: 'W',
        params: 'observaciones',
        intuition: 'El estimador MLE elige el parámetro que hace más plausibles los datos observados.',
      },
    ],
    concreteExample: {
      title: 'MLE frente a MAP con 3 caras en 4 lanzamientos',
      problem: 'Comparar θ_MLE con θ_MAP bajo un prior Beta(3, 3) centrado en moneda justa.',
      steps: [
        'MLE puro: θ_MLE = 3 / 4 = 0.75 (sigue ciegamente la muestra pequeña).',
        'Prior Beta(3, 3) aporta 2 pseudo-caras y 2 pseudo-sellos (α−1 = 2, β−1 = 2).',
        'MAP = (3 + 2) / (4 + 4) = 5 / 8 = 0.625 — suaviza el sobreajuste hacia 0.5.',
      ],
      latex: '\\hat{\\theta}_{\\text{MLE}} = \\arg\\max_{\\theta} \\log P(D \\mid \\theta), \\qquad \\hat{\\theta}_{\\text{MAP}} = \\arg\\max_{\\theta} \\big[\\log P(D \\mid \\theta) + \\log P(\\theta)\\big]',
      formalDefinition:
        'Un prior Gaussiano sobre los pesos de regresión lineal convierte la estimación MAP exactamente en regularización Ridge (L2).',
    },
    pythonLab: {
      title: 'Comparación entre estimación MLE, MAP y Bootstrap',
      task: 'Estima la media y un intervalo bootstrap al 95 % remuestreando con reemplazo.',
      code: `import random

data = [12.1, 11.8, 13.4, 12.6, 11.9, 14.0, 12.5, 13.1]
n = len(data)
boot_means = sorted(
    sum(random.choice(data) for _ in range(n)) / n
    for _ in range(1000)
)
print(f"Media={sum(data)/n:.2f} | IC 95% bootstrap=[{boot_means[25]:.2f}, {boot_means[975]:.2f}]")`,
      mlApplication:
        'Minimizar MSE equivale a MLE gaussiano; añadir penalización L2 equivale a un prior gaussiano (MAP).',
    },
    checkpoint: {
      question: 'En aprendizaje automático, ¿qué interpretación probabilística tiene añadir regularización L2 (weight decay) a una función de pérdida de verosimilitud?',
      options: [
        'Equivale a calcular la estimación MAP colocando un prior gaussiano centrado en cero sobre los pesos.',
        'Equivale a eliminar las observaciones atípicas del conjunto de entrenamiento antes de ajustar el modelo.',
        'Equivale a reemplazar la distribución de los datos por una uniforme sin modificar el estimador MLE.',
        'Equivale a garantizar que el intervalo de confianza del 95 % contenga siempre todos los datos futuros.',
      ],
      correctIndex: 0,
      explanation: '−log N(w; 0, σ²I) añade un término proporcional a ||w||₂², por lo que maximizar log posterior = minimizar pérdida + λ||w||₂².',
    },
    references: ['OCW-1805', 'ST', 'MML', 'CS109R', 'BH'],
  },

  // ==================== FASE 6: MATEMÁTICAS AVANZADAS PARA ML (M28–M32) ====================
  {
    id: 'M28',
    number: 28,
    phaseId: 'phase-6',
    level: '5',
    crayon: 'cobalt',
    title: 'Cálculo matricial, diferenciación automática y backpropagation',
    shortLabel: 'AutoDiff y Backprop',
    prerequisites: ['M12', 'M17', 'M19', 'M23'],
    syllabus: [
      '28.1 Gradientes respecto de vectores y matrices',
      '28.2 Identidades de cálculo matricial',
      '28.3 Grafo computacional (DAG)',
      '28.4 Diferenciación automática modo directo e inverso',
      '28.5 Backpropagation en un MLP',
    ],
    pureMathFocus:
      'La regla de la cadena multivariable aplicada en orden topológico inverso como multiplicación eficiente vector-Jacobiano.',
    appliedCsMlFocus:
      'Arquitectura interna de PyTorch y JAX (autograd) y depuración de gradientes desvanecidos o explosivos.',
    visualSpecs: [
      {
        concept: 'Grafo computacional y Backprop',
        visualization: 'Red/DAG interactivo con valores Forward (salvia) y culpas ∂L/∂w Backward (bermellón)',
        format: 'W',
        params: 'entrada x, pesos w₁, w₂ y objetivo y*',
        intuition: 'Forward evalúa la predicción y Backward reparte la culpa exacta de cada peso reutilizando parciales.',
      },
      {
        concept: 'Modo directo vs inverso',
        visualization: 'Comparación de costo computacional',
        format: 'E',
        params: 'millones de entradas → 1 pérdida escalar',
        intuition: 'Con una sola pérdida escalar y millones de pesos, el modo inverso calcula todo el gradiente en una sola pasada.',
      },
    ],
    concreteExample: {
      title: 'Una neurona de dos capas con pérdida cuadrática',
      problem: 'Para h = w₁·x, ŷ = w₂·h, L = ½(ŷ − y*)² con x=2, w₁=0.5, w₂=1.5, y*=2, calcular ∂L/∂w₁ y ∂L/∂w₂.',
      steps: [
        'Forward: h = 1.0 → ŷ = 1.5 → error e = ŷ − y* = −0.5 → L = 0.125.',
        'Backward: ∂L/∂ŷ = −0.5 → ∂L/∂w₂ = (−0.5)·h = −0.5.',
        'Propaga atrás: ∂L/∂h = (−0.5)·w₂ = −0.75 → ∂L/∂w₁ = (−0.75)·x = −1.5.',
      ],
      latex: '\\frac{\\partial L}{\\partial w_1} = \\frac{\\partial L}{\\partial \\hat{y}}\\cdot\\frac{\\partial \\hat{y}}{\\partial h}\\cdot\\frac{\\partial h}{\\partial w_1}',
      formalDefinition:
        'En modo inverso cada nodo acumula adjuntos v̄_i = Σ_{j ∈ hijos(i)} v̄_j · (∂v_j / ∂v_i) recorriendo el DAG en orden topológico inverso.',
    },
    pythonLab: {
      title: 'Mini motor Autodiff escalar en 25 líneas de Python',
      task: 'Implementa nodos con operación de multiplicación, suma y retropropagación automática.',
      code: `class Value:
    def __init__(self, data, prev=(), op=""):
        self.data, self.grad, self._prev, self._backward = data, 0.0, prev, lambda: None
    def __mul__(self, other):
        out = Value(self.data * other.data, (self, other), "*")
        def _b():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _b
        return out
    def backward(self):
        topo, seen = [], set()
        def build(v):
            if v not in seen:
                seen.add(v)
                for p in v._prev: build(p)
                topo.append(v)
        build(self)
        self.grad = 1.0
        for v in reversed(topo): v._backward()

x, w = Value(2.0), Value(3.0)
y = x * w
y.backward()
print("dy/dx =", x.grad, "| dy/dw =", w.grad)`,
      mlApplication:
        'Exactamente el mecanismo sobre el cual funcionan torch.autograd y jax.grad para entrenar redes profundas.',
    },
    checkpoint: {
      question: '¿Por qué los frameworks de Deep Learning utilizan diferenciación automática en modo inverso (backpropagation) en vez de modo directo para entrenar redes neuronales?',
      options: [
        'Porque las redes tienen millones de parámetros de entrada y una sola pérdida escalar, evaluándose en una pasada.',
        'Porque el modo directo solo puede derivar polinomios y falla completamente sobre funciones exponenciales o senos.',
        'Porque el modo inverso aproxima derivadas por diferencias finitas evitando almacenar activaciones intermedias.',
        'Porque el modo inverso elimina la necesidad de aplicar la regla de la cadena en capas ocultas profundas.',
      ],
      correctIndex: 0,
      explanation: 'El modo directo cuesta O(n_inputs) pasadas y el modo inverso cuesta O(n_outputs) pasadas; con 1 pérdida escalar, una sola pasada inversa basta.',
    },
    references: ['MML', 'DL', '3B1B', 'OCW-18065', 'STR-LALD'],
    linked3DSceneId: 'calc-autodiff',
    secondary3DSceneId: 'lin-manifold',
  },

  {
    id: 'M29',
    number: 29,
    phaseId: 'phase-6',
    level: '5',
    crayon: 'vermilion',
    title: 'Optimización y convexidad',
    shortLabel: 'Optimización',
    prerequisites: ['M28', 'M22'],
    syllabus: [
      '29.1 Descenso de gradiente',
      '29.2 Condicionamiento de valles estrechos',
      '29.3 Momentum e inercia',
      '29.4 Descenso estocástico (SGD)',
      '29.5 Conjuntos y funciones convexas',
      '29.6 Multiplicadores de Lagrange',
      '29.7 Dualidad',
    ],
    pureMathFocus:
      'Geometría de los paisajes de optimización, garantías globales en el caso convexo y optimalidad con restricciones.',
    appliedCsMlFocus:
      'Selección de hiperparámetros (tasa α, momentum β), regularización restringida y entrenamiento estable de redes.',
    visualSpecs: [
      {
        concept: 'Descenso y Momentum',
        visualization: 'Trayectorias sobre contornos elípticos comparando GD vs Momentum',
        format: 'W',
        params: 'tasa α, momentum β y condicionamiento',
        intuition: 'En valles estrechos GD rebota en zigzag mientras Momentum cancela oscilaciones y acelera el valle.',
      },
      {
        concept: 'Convexidad',
        visualization: 'Cuerda sobre la curva entre dos puntos',
        format: 'W',
        params: 'puntos x₁, x₂ y función convexa vs no convexa',
        intuition: 'Si toda cuerda queda arriba de la gráfica, cualquier mínimo local es automáticamente mínimo global.',
      },
      {
        concept: 'Lagrange',
        visualization: 'Contornos de f tangentes a la restricción g(x,y) = c',
        format: 'W',
        params: 'nivel c',
        intuition: 'En el óptimo restringido las curvas son tangentes y sus gradientes son paralelos (∇f = λ∇g).',
      },
    ],
    concreteExample: {
      title: 'Límite de estabilidad de GD en un valle elíptico f = ½(x² + 10y²)',
      problem: 'Determinar la tasa máxima α antes de divergir a lo largo del eje más curvo (L = 10).',
      steps: [
        'La curvatura máxima es λ_max = 10; el paso en y multiplica la coordenada por (1 − 10α).',
        'Para converger se exige |1 − 10α| < 1, es decir, α < 2 / 10 = 0.20.',
        'Con α = 0.22 la trayectoria rebota cada vez más lejos y diverge.',
      ],
      latex: 'v_t = \\beta v_{t-1} - \\alpha \\nabla f(\\theta_{t-1}), \\qquad \\nabla f(x^*) = \\lambda \\nabla g(x^*)',
      formalDefinition:
        'f es convexa si f(tx + (1−t)y) ≤ t·f(x) + (1−t)·f(y) para todo t ∈ [0, 1].',
    },
    pythonLab: {
      title: 'GD frente a Momentum en un valle mal condicionado',
      task: 'Compara el número de pasos necesarios para bajar la pérdida por debajo de 1e-4.',
      code: `def run_opt(alpha=0.14, beta=0.0, steps=25):
    x, y, vx, vy = 4.0, 1.0, 0.0, 0.0
    for _ in range(steps):
        gx, gy = x, 10.0 * y
        vx = beta * vx - alpha * gx
        vy = beta * vy - alpha * gy
        x += vx; y += vy
    return 0.5 * (x*x + 10.0*y*y)

print("GD puro:  loss =", round(run_opt(0.14, 0.0), 6))
print("Momentum: loss =", round(run_opt(0.14, 0.7), 6))`,
      mlApplication:
        'Entrenamiento eficiente con SGD+Momentum y Adam en paisajes de pérdida con alto número de condición.',
    },
    checkpoint: {
      question: 'En optimización con restricción de igualdad g(x, y) = c, ¿qué condición geométrica se cumple en el punto óptimo restringido (multiplicadores de Lagrange)?',
      options: [
        'La curva de nivel de f es tangente a la restricción y ambos gradientes ∇f y ∇g resultan paralelos.',
        'La curva de nivel de f corta perpendicularmente a la restricción formando un ángulo de noventa grados.',
        'El gradiente ∇f debe anularse exactamente en cero sin importar la forma geométrica de la restricción.',
        'El multiplicador λ toma siempre el valor cero cuando el óptimo cae sobre el borde de la restricción.',
      ],
      correctIndex: 0,
      explanation: 'Si ∇f tuviera una componente paralela a la restricción, podríamos movernos a lo largo de g = c y mejorar f; luego ∇f = λ∇g.',
    },
    references: ['CVX', 'MML', 'DIS-MOM', 'DL', 'OCW-18065'],
    linked3DSceneId: 'calc-optimizers',
    secondary3DSceneId: 'calc-symbolic',
  },

  {
    id: 'M30',
    number: 30,
    phaseId: 'phase-6',
    level: '4-5',
    crayon: 'ochre',
    title: 'Métodos numéricos',
    shortLabel: 'Métodos Numéricos',
    prerequisites: ['M14', 'M19'],
    syllabus: [
      '30.1 Punto flotante IEEE 754',
      '30.2 Overflow, underflow y cancelación',
      '30.3 Softmax y log-sum-exp estables',
      '30.4 Número de condición κ(A)',
      '30.5 Bisección frente a Newton',
      '30.6 Método de potencia',
      '30.7 Métodos iterativos',
      '30.8 Integración numérica',
    ],
    pureMathFocus:
      'El error de redondeo, el condicionamiento y la tasa de convergencia estudiados como objetos matemáticos de pleno derecho.',
    appliedCsMlFocus:
      'Por qué 0.1 + 0.2 ≠ 0.3 en JS/Python, estabilidad de softmax(z − max(z)) en Transformers y precisión mixta FP16/BF16.',
    visualSpecs: [
      {
        concept: 'Punto flotante IEEE 754',
        visualization: 'Recta con números representables (densidad logarítmica)',
        format: 'W',
        params: 'bits de exponente y mantisa',
        intuition: 'Los flotantes se apiñan cerca del cero y dejan huecos enormes en magnitudes grandes.',
      },
      {
        concept: 'Softmax estable',
        visualization: 'Comparador vivo de Softmax ingenuo vs desplazado',
        format: 'W',
        params: 'escala de logits z',
        intuition: 'Restar max(z) evita exp(1000) = ∞ sin cambiar en nada las probabilidades.',
      },
      {
        concept: 'Newton frente a Bisección',
        visualization: 'Caída de error en escala logarítmica',
        format: 'A',
        params: 'iteraciones',
        intuition: 'Convergencia cuadrática duplica los dígitos correctos en cada paso frente a 1 bit por paso de bisección.',
      },
    ],
    concreteExample: {
      title: 'Estabilidad numérica del truco log-sum-exp en Softmax',
      problem: 'Evaluar softmax([1000, 1001, 1002]) sin sufrir NaN por overflow.',
      steps: [
        'Ingenuo: exp(1000) excede el máximo float64 (~1.8×10³⁰⁸) → inf / inf = NaN.',
        'Resta m = max(z) = 1002: z − m = [−2, −1, 0].',
        'exp([−2, −1, 0]) = [0.135, 0.368, 1.0] → probabilidades exactas [0.090, 0.245, 0.665] ✓.',
      ],
      latex: '\\operatorname{softmax}(z)_i = \\frac{e^{z_i - m}}{\\sum_j e^{z_j - m}}, \\qquad m = \\max_j z_j',
      formalDefinition:
        'El número de condición κ(A) = σ_max / σ_min acota cuánto puede amplificarse un error relativo en los datos de entrada.',
    },
    pythonLab: {
      title: 'Softmax ingenuo frente a estable y precisión flotante',
      task: 'Demuestra el overflow en logits grandes y verifica la identidad tras restar el máximo.',
      code: `import math

def softmax_stable(zs):
    m = max(zs)
    exps = [math.exp(z - m) for z in zs]
    total = sum(exps)
    return [round(e / total, 4) for e in exps]

print("0.1 + 0.2 =", repr(0.1 + 0.2))
print("Softmax estable en [1000, 1001, 1002]:", softmax_stable([1000, 1001, 1002]))`,
      mlApplication:
        'Implementación segura de atención en Transformers, pérdida cross-entropy fusionada y entrenamiento en BF16/FP16.',
    },
    checkpoint: {
      question: '¿Por qué restar max(z) a todos los logits antes de aplicar la función softmax evita errores numéricos sin alterar el resultado matemático?',
      options: [
        'Porque exp(−max(z)) se factoriza en numerador y denominador cancelándose mientras mantiene los exponentes ≤ 0.',
        'Porque restar el máximo transforma la distribución exponencial en una distribución lineal con suma exacta uno.',
        'Porque los números negativos en punto flotante IEEE 754 tienen una precisión infinita libre de redondeo.',
        'Porque cancelar el valor máximo obliga a que todas las clases menos una reciban probabilidad cero.',
      ],
      correctIndex: 0,
      explanation: 'exp(zᵢ − m) / Σ exp(zⱼ − m) = [exp(−m)·exp(zᵢ)] / [exp(−m)·Σ exp(zⱼ)] = softmax(z), garantizando exp(zᵢ − m) ∈ (0, 1].',
    },
    references: ['DL', 'OCW-1806', 'OCW-18065', 'STR-ILA'],
  },

  {
    id: 'M31',
    number: 31,
    phaseId: 'phase-6',
    level: '5',
    crayon: 'plum',
    title: 'Teoría de la información para ML',
    shortLabel: 'Entropía y KL',
    prerequisites: ['M25'],
    syllabus: [
      '31.1 Información (sorpresa) de un evento',
      '31.2 Entropía de Shannon H(p)',
      '31.3 Entropía cruzada H(p, q)',
      '31.4 Divergencia de Kullback-Leibler D_KL(p || q)',
      '31.5 Información mutua y ganancia en árboles',
    ],
    pureMathFocus:
      'Cuantificar la incertidumbre promedio en bits mediante logaritmos y medir la distancia asimétrica entre distribuciones.',
    appliedCsMlFocus:
      'Función de pérdida cross-entropy en clasificadores y LLMs, ganancia de información en árboles de decisión y divergencia KL en VAEs y RLHF.',
    visualSpecs: [
      {
        concept: 'Entropía, Cruzada y KL',
        visualization: 'Barras interactivas de p frente a modelo q con medidor en bits',
        format: 'W',
        params: 'probabilidades verdaderas p y modelo q',
        intuition: 'H(p, q) = H(p) + D_KL(p || q): equivocarte con q siempre cuesta bits extra (KL ≥ 0).',
      },
      {
        concept: 'Máxima entropía',
        visualization: 'Medidor de incertidumbre frente a la distribución uniforme',
        format: 'W',
        params: 'concentración de p',
        intuition: 'La distribución uniforme maximiza la incertidumbre; una certeza total tiene 0 bits de entropía.',
      },
      {
        concept: 'Árbol de decisión',
        visualization: 'Ganancia de información por división',
        format: 'A',
        params: 'partición de clases',
        intuition: 'La mejor pregunta es la que más reduce la entropía promedio tras dividir los datos.',
      },
    ],
    concreteExample: {
      title: 'Costo en bits de predecir con un modelo imperfecto',
      problem: 'Con distribución real p = [0.5, 0.5] y modelo q = [0.8, 0.2], calcular H(p), H(p, q) y D_KL(p || q).',
      steps: [
        'Entropía real: H(p) = −0.5·log₂(0.5) − 0.5·log₂(0.5) = 1.000 bit.',
        'Entropía cruzada: H(p, q) = −0.5·log₂(0.8) − 0.5·log₂(0.2) ≈ 1.322 bits.',
        'Divergencia KL = H(p, q) − H(p) = 0.322 bits extra de penalización.',
      ],
      latex: 'H(p) = -\\sum_i p_i \\log_2 p_i, \\qquad H(p,q) = H(p) + D_{\\text{KL}}(p \\| q)',
      formalDefinition:
        'Por la desigualdad de Gibbs/Jensen, D_KL(p || q) ≥ 0 siempre, con igualdad si y solo si p = q en todo punto.',
    },
    pythonLab: {
      title: 'Entropía de Shannon, Entropía Cruzada y Divergencia KL',
      task: 'Comprueba numéricamente que minimizar la entropía cruzada minimiza exactamente D_KL(p || q).',
      code: `import math

def entropy(p):
    return -sum(pi * math.log2(pi) for pi in p if pi > 0)

def cross_entropy(p, q):
    return -sum(pi * math.log2(qi) for pi, qi in zip(p, q) if pi > 0)

p = [0.5, 0.25, 0.15, 0.10]
q = [0.4, 0.30, 0.20, 0.10]
h, ce = entropy(p), cross_entropy(p, q)
print(f"H(p)={h:.4f} | H(p,q)={ce:.4f} | KL={ce - h:.4f} bits")`,
      mlApplication:
        'Entrenamiento de LLMs (perplejidad = 2^H(p,q)), clasificación multiclase y regularización KL en alineamiento.',
    },
    checkpoint: {
      question: 'Dado un conjunto fijo de etiquetas verdaderas p, ¿por qué entrenar un clasificador minimizando la entropía cruzada H(p, q) equivale a minimizar la divergencia D_KL(p || q)?',
      options: [
        'Porque H(p, q) es igual a H(p) más D_KL(p || q), y la entropía real H(p) es constante respecto a los pesos.',
        'Porque la entropía cruzada H(p, q) es simétrica respecto a p y q y vale siempre cero en la uniforme.',
        'Porque la divergencia KL cancela automáticamente el logaritmo convirtiendo la pérdida en distancia lineal.',
        'Porque la entropía H(p) se hace negativa cuando las probabilidades del modelo q se acercan a los datos.',
      ],
      correctIndex: 0,
      explanation: 'Como H(p) no depende de los parámetros del modelo q, ∇_θ H(p, q_θ) = ∇_θ D_KL(p || q_θ).',
    },
    references: ['DL', 'CS109R', 'BH', 'MML'],
  },

  {
    id: 'M32',
    number: 32,
    phaseId: 'phase-6',
    level: '5',
    optional: true,
    crayon: 'sage',
    title: 'Puentes al rigor: análisis real, complejos y estructuras algebraicas',
    shortLabel: 'Estructuras y Rigor',
    prerequisites: ['M6', 'M10', 'M16'],
    syllabus: [
      '32.1 Completitud de los números reales',
      '32.2 Sucesiones y continuidad rigurosas',
      '32.3 Grupos, anillos y campos',
      '32.4 Campos finitos GF(p)',
      '32.5 Funciones complejas como transformaciones conformes',
    ],
    pureMathFocus:
      'Madurez matemática y unificación estructural: ℤ_p como campo finito, simetrías geométricas como grupos y funciones holomorfas que preservan ángulos.',
    appliedCsMlFocus:
      'Criptografía de curva elíptica y AES (campos finitos), códigos correctores de errores, redes equivariantes a grupos y anticipo de Fourier.',
    visualSpecs: [
      {
        concept: 'Grupo de simetrías D₄',
        visualization: 'Cuadrado interactivo con vértices coloreados y tabla de Cayley viva',
        format: 'W',
        params: 'rotación r y reflexión s',
        intuition: 'Las operaciones se componen formando un grupo cerrado y no conmutativo (r·s ≠ s·r).',
      },
      {
        concept: 'Función compleja',
        visualization: 'Malla ortogonal transformada por f(z) = z² o e^z',
        format: 'W',
        params: 'función f(z) e interpolación',
        intuition: 'Las funciones complejas derivables deforman el plano preservando ángulos rectos localmente.',
      },
      {
        concept: 'Completitud',
        visualization: 'Sucesión de racionales cayendo en el hueco de √2',
        format: 'A',
        params: 'aproximaciones',
        intuition: 'Los reales ℝ rellenan los huecos que dejan los racionales ℚ.',
      },
    ],
    concreteExample: {
      title: 'No conmutatividad en el grupo diédrico D₄',
      problem: 'Comprobar que rotar 90° (r) y luego reflejar (s) produce un cuadrado distinto que reflejar primero y rotar después.',
      steps: [
        'Vértices iniciales [A, B, C, D] en sentido horario.',
        'Primero r (90° horario): [D, A, B, C], luego s (espejo horizontal): [A, D, C, B].',
        'Al revés: primero s: [B, A, D, C], luego r: [C, B, A, D] ≠ [A, D, C, B] → r·s ≠ s·r.',
      ],
      latex: '(G, \\circ): \\text{cierre, asociatividad, identidad } e, \\text{ inverso } g^{-1}; \\qquad r \\circ s \\neq s \\circ r',
      formalDefinition:
        'Un campo F es un anillo conmutativo con identidad donde todo elemento no nulo posee inverso multiplicativo (ej. ℝ, ℂ, ℤ_p con p primo).',
    },
    pythonLab: {
      title: 'Aritmética en el campo finito GF(7) y composición de simetrías',
      task: 'Calcula el inverso multiplicativo de cada elemento no nulo en ℤ₇ usando Fermat a^(p−2) mod p.',
      code: `p = 7
inverses = {a: pow(a, p - 2, p) for a in range(1, p)}
for a, inv in inverses.items():
    assert (a * inv) % p == 1
print("Inversos en GF(7):", inverses)`,
      mlApplication:
        'Redes neuronales equivariantes a grupos de simetría (G-CNNs), AES en campos finitos y transformada de Fourier.',
    },
    checkpoint: {
      question: '¿Qué propiedad geométrica local distinguen las funciones complejas holomorfas f(z) con f′(z) ≠ 0 al transformar una cuadrícula ortogonal?',
      options: [
        'Preservan localmente los ángulos y la orientación entre curvas que se cruzan en cada punto.',
        'Mantienen constantes todas las áreas globales de cualquier polígono trazado sobre la cuadrícula.',
        'Transforman toda recta paralela a los ejes en una recta paralela sin introducir curvatura alguna.',
        'Colapsan toda la parte imaginaria proyectando los números complejos sobre la recta real horizontal.',
      ],
      correctIndex: 0,
      explanation: 'Localmente multiplicar por la derivada compleja f′(z₀) = r·e^(iφ) es solo rotar y escalar uniformemente, por lo que preserva ángulos (transformación conforme).',
    },
    references: ['JUD', 'NEED', 'HAM', 'LADR'],
  },
];
