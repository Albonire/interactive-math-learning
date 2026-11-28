/**
 * Question bank, modules M17-M32. See questionBank.ts for the format and the rules.
 * Every number in these items was checked by hand; distractors encode real misconceptions.
 */
import type { BankItem, CheckpointFeedback } from './questionBank';

export const CHECKPOINT_FEEDBACK_B: CheckpointFeedback = {
  M17: [
    'Tangente a la curva de nivel es la dirección en la que f no cambia; el gradiente indica dónde cambia más.',
    'El ángulo depende de la función y del punto; no hay un 45° universal.',
    'El gradiente no mira al origen; mira hacia donde f crece más deprisa.',
  ],
  M18: [
    'Una matriz puede estirar, rotar o cizallar; sus columnas no son ángulos sino vectores destino.',
    'Los valores propios no se leen en las columnas (salvo en matrices diagonales).',
    'Una transformación lineal no traslada: el origen siempre se queda en el origen.',
  ],
  M19: [
    'Una matriz con decimales puede ser perfectamente invertible; el problema es de costo y precisión.',
    'LU sigue costando O(n³) para factorizar; su ventaja es la constante, la estabilidad y la reutilización.',
    'Invertir no exige simetría ni diagonalidad; cualquier matriz con det ≠ 0 es invertible.',
  ],
  M20: [
    'El espacio columna vive en ℝ⁴ pero su dimensión es el rango, no 4.',
    'La dimensión del espacio nulo es n − r, no el número total de columnas.',
    'Rango-nulidad: dim C(A) + dim N(A) = número de columnas. Comprueba si tu par suma 6.',
  ],
  M21: [
    'Si el residuo fuera paralelo a b, la aproximación sería solo un múltiplo de b; no hay tal regla de "la mitad".',
    'Si el residuo estuviera en C(A), aún podría reducirse moviéndose dentro de C(A).',
    'Mínimos cuadrados minimiza la suma de todos los errores al cuadrado, no el de un dato concreto.',
  ],
  M22: [
    'Con |λ| > 1 crecería; aquí todos los factores de escala son menores que 1.',
    'Conservar la longitud exige |λ| = 1 (como una rotación).',
    'Una matriz fija no hace saltar el vector entre ejes: cada componente propia se escala por λᵢ en cada paso.',
  ],
  M23: [
    'Las columnas de menor promedio no tienen relación con la energía de la matriz.',
    'Promediar la diagonal destruye la estructura; la SVD ordena la información por σᵢ.',
    'Los valores singulares pequeños aportan poco; quedarse con ellos tira lo importante.',
  ],
  M24: [
    'La sensibilidad del 95 % dice que casi todos los enfermos dan positivo, no negativo.',
    'Ningún axioma limita la probabilidad condicional al 50 %; puede valer cualquier cosa entre 0 y 1.',
    'La independencia no es el punto: el efecto viene de cuántos sanos hay frente a cuántos enfermos.',
  ],
  M25: [
    'La linealidad de la esperanza no necesita independencia; la confusión viene de la varianza.',
    'No hace falta normalidad: la propiedad vale para cualquier distribución con esperanza finita.',
    'Vale para variables continuas, negativas o fraccionarias por igual.',
  ],
  M26: [
    'La varianza baja como 1/n, pero la desviación estándar es su raíz: baja como 1/√n.',
    'El tamaño de muestra sí cambia la dispersión del promedio; promediar más reduce el ruido.',
    'Promediar no acumula variabilidad: la reduce.',
  ],
  M27: [
    'La regularización no toca los datos; penaliza pesos grandes en la función objetivo.',
    'Un prior uniforme no añade ningún término; el término ||w||² viene de un prior específico.',
    'Los intervalos de confianza son otro tema; L2 cambia el estimador, no da garantías sobre datos futuros.',
  ],
  M28: [
    'El modo directo deriva exp y sen sin problema; su desventaja es el costo con muchas entradas.',
    'Backprop calcula derivadas exactas con la regla de la cadena, no diferencias finitas, y sí guarda activaciones.',
    'Backprop es la regla de la cadena aplicada de atrás hacia delante; no la elimina.',
  ],
  M29: [
    'Si la curva de nivel cortara a la restricción, podrías avanzar sobre g = c y mejorar f.',
    '∇f = 0 es la condición sin restricciones; con restricción, ∇f puede ser no nulo.',
    'λ mide cuánto cambia el óptimo al mover c; no tiene por qué ser 0.',
  ],
  M30: [
    'Restar una constante no linealiza nada; la exponencial sigue ahí.',
    'Ningún formato de punto flotante tiene precisión infinita, sean números negativos o positivos.',
    'Restar el máximo no cambia las probabilidades: todas las clases conservan su peso relativo.',
  ],
  M31: [
    'La entropía cruzada no es simétrica, y no vale cero en la uniforme.',
    'La divergencia KL sigue siendo logarítmica; no se convierte en distancia lineal.',
    'La entropía de una distribución discreta nunca es negativa.',
  ],
  M32: [
    'Las funciones conformes cambian áreas (escalan localmente por |f′|²); lo que conservan son ángulos.',
    'Las rectas pueden curvarse; lo que se conserva es el ángulo con que se cruzan.',
    'Una función holomorfa no colapsa la parte imaginaria; mueve el plano entero.',
  ],
};

export const BANK_B: Record<string, BankItem[]> = {
  M17: [
    {
      prompt: 'Si f(x, y) = x²y, ¿cuánto vale la derivada parcial ∂f/∂x?',
      correct: '2xy, porque se deriva respecto a x tratando y como una constante.',
      wrong: [
        ['x², porque se deriva respecto a y por error de variable.', 'Eso es ∂f/∂y; la parcial en x mantiene fija a y.'],
        ['2x, porque se deriva x² y se descarta el factor constante y.', 'Una constante multiplicativa no se descarta: se mantiene como factor.'],
        ['2xy + x², porque se suman las derivadas en ambas variables.', 'Sumar las parciales no da ninguna de ellas; cada parcial va por separado.'],
      ],
      explanation: '∂/∂x (x²·y) = y·∂/∂x(x²) = 2xy.',
    },
    {
      prompt: 'En un punto crítico, la Hessiana tiene un autovalor positivo y otro negativo. ¿Qué es ese punto?',
      correct: 'Un punto de silla: sube en una dirección y baja en otra.',
      wrong: [
        ['Un mínimo local, porque hay al menos una dirección de subida.', 'Un mínimo exige subir en todas las direcciones, no solo en una.'],
        ['Un máximo local, porque hay al menos una dirección de bajada.', 'Un máximo exige bajar en todas las direcciones.'],
        ['No se puede saber nada sin evaluar f en otros puntos.', 'Con autovalores no nulos de signos opuestos el criterio es concluyente.'],
      ],
      explanation: 'Cerca del punto, f ≈ f(p) + ½(λ₁u² + λ₂v²) en la base propia: con λ₁ > 0 > λ₂ es una silla, como x² − y².',
    },
  ],
  M18: [
    {
      prompt: '¿Qué hace la matriz A = [[2, 0], [0, 3]] con el cuadrado unidad?',
      correct: 'Lo estira a un rectángulo 2 × 3: î va a (2, 0) y ĵ a (0, 3), área 6.',
      wrong: [
        ['Lo gira 90° sin cambiar su área, porque la diagonal es positiva.', 'Una rotación de 90° tiene ceros en la diagonal; esta no mezcla los ejes.'],
        ['Lo traslada al punto (2, 3) sin deformarlo en ninguna dirección.', 'Una matriz no traslada: el origen se queda fijo y la forma cambia.'],
        ['Lo deja igual, porque los ceros fuera de la diagonal anulan el efecto.', 'Los ceros solo dicen que no hay mezcla; la diagonal sí estira.'],
      ],
      explanation: 'Las columnas (2, 0) y (0, 3) son las imágenes de î y ĵ; el área se multiplica por det A = 6.',
    },
    {
      prompt: 'Para dos vectores no nulos se cumple u · v = 0. ¿Qué significa?',
      correct: 'Que son perpendiculares: forman un ángulo de 90°.',
      wrong: [
        ['Que son paralelos y apuntan en sentidos opuestos.', 'Opuestos darían un producto punto negativo, no cero.'],
        ['Que tienen exactamente la misma longitud.', 'El producto punto mezcla longitudes y ángulo; que sea 0 depende del ángulo.'],
        ['Que uno de los dos tiene que ser el vector cero.', 'Los dos son no nulos por hipótesis; el cero sale de otra causa.'],
      ],
      explanation: 'u · v = |u||v|cos θ; con |u|, |v| > 0, se anula solo si cos θ = 0, es decir θ = 90°.',
    },
  ],
  M19: [
    {
      prompt: 'Resolver Ax = b en la "imagen de columnas" significa…',
      correct: 'Encontrar los pesos con los que las columnas de A se combinan para formar b.',
      wrong: [
        ['Encontrar el punto donde se cortan las columnas de A dibujadas como rectas.', 'Las rectas que se cortan son las filas; las columnas son vectores que se combinan.'],
        ['Multiplicar b por cada columna de A y sumar todos los resultados.', 'b es el objetivo, no un factor; las incógnitas son los pesos.'],
        ['Elegir la columna de A más parecida a b y descartar las demás.', 'En general hacen falta todas las columnas, cada una con su peso.'],
      ],
      explanation: 'Ax = x₁·a₁ + x₂·a₂ + ⋯ + xₙ·aₙ. Resolver es hallar la receta (x₁, …, xₙ) que lleva a b.',
    },
    {
      prompt: 'Si A y B son invertibles, ¿cuánto vale (AB)⁻¹?',
      correct: 'B⁻¹A⁻¹: para deshacer "primero B, luego A" se deshace A primero.',
      wrong: [
        ['A⁻¹B⁻¹: se invierte cada factor manteniendo el orden.', 'Como al quitarse calcetín y zapato: se deshace en orden inverso.'],
        ['A⁻¹ + B⁻¹: la inversa se reparte sobre el producto.', 'La inversa no es lineal sobre productos; comprueba que (AB)(A⁻¹ + B⁻¹) ≠ I.'],
        ['1/(AB): se divide la identidad entre el producto de las dos matrices.', 'No existe la división de matrices; la inversa se define por M·M⁻¹ = I.'],
      ],
      explanation: '(AB)(B⁻¹A⁻¹) = A(BB⁻¹)A⁻¹ = AA⁻¹ = I.',
    },
  ],
  M20: [
    {
      prompt: 'Tres vectores de ℝ³ son linealmente dependientes. ¿Qué indica geométricamente?',
      correct: 'Que caben en un plano o una recta por el origen: forman un volumen 0.',
      wrong: [
        ['Que son perpendiculares dos a dos y forman una base ortogonal.', 'Tres vectores perpendiculares no nulos son independientes.'],
        ['Que tienen la misma longitud aunque apunten en direcciones distintas.', 'La longitud no decide la dependencia; la dirección sí.'],
        ['Que uno de los tres tiene que ser el vector cero.', 'Puede pasar, pero no es necesario: (1,0,0), (0,1,0) y (1,1,0) son dependientes.'],
      ],
      explanation: 'Dependientes ⇔ uno es combinación de los otros ⇔ det[v₁ v₂ v₃] = 0 ⇔ el paralelepípedo se aplasta.',
    },
    {
      prompt: 'Una matriz 5 × 5 tiene espacio nulo de dimensión 2. ¿Cuál es su rango?',
      correct: '3, porque rango + dim N(A) es igual al número de columnas, 5.',
      wrong: [
        ['2, porque el rango coincide con la dimensión del espacio nulo.', 'Rango y nulidad se reparten las columnas; no son iguales en general.'],
        ['5, porque una matriz cuadrada siempre tiene rango completo.', 'Si su espacio nulo no es solo {0}, no puede tener rango completo.'],
        ['7, porque se suman las filas y la dimensión del espacio nulo.', 'La suma de rango y nulidad da el número de columnas, no lo supera.'],
      ],
      explanation: 'Teorema de rango-nulidad: r + dim N(A) = n ⇒ r = 5 − 2 = 3.',
    },
  ],
  M21: [
    {
      prompt: '¿Qué se obtiene al proyectar b = (3, 4) sobre la recta generada por a = (1, 0)?',
      correct: '(3, 0): la componente de b en la dirección de a.',
      wrong: [
        ['(0, 4): la componente de b perpendicular a la recta.', 'Ese es el error e = b − p; la proyección es lo que queda sobre la recta.'],
        ['(5, 0): la longitud completa de b colocada sobre la recta.', 'Proyectar no conserva la longitud: toma solo la parte en la dirección de a.'],
        ['(1, 0): el propio vector a, que genera la recta.', 'a solo da la dirección; la proyección depende de b.'],
      ],
      explanation: 'p = (a·b / a·a)·a = (3/1)·(1, 0) = (3, 0), y e = (0, 4) cumple e·a = 0.',
    },
    {
      prompt: 'En Gram-Schmidt, ¿qué se le resta a cada nuevo vector antes de normalizarlo?',
      correct: 'Sus proyecciones sobre los vectores ya construidos.',
      wrong: [
        ['El promedio de todos los vectores que ya se construyeron.', 'Restar el promedio no garantiza ortogonalidad con cada uno.'],
        ['Solo el primer vector de la base, una única vez.', 'Hay que quitar la componente en cada dirección ya construida, no solo la primera.'],
        ['Su propia longitud, para dejarlo con norma uno.', 'Normalizar es dividir por la longitud, y viene después de ortogonalizar.'],
      ],
      explanation: 'vₖ′ = vₖ − Σᵢ (qᵢ·vₖ)qᵢ quita lo ya cubierto; luego qₖ = vₖ′/|vₖ′|.',
    },
  ],
  M22: [
    {
      prompt: 'Una matriz 2 × 2 tiene det(A) = 0. ¿Qué hace con el plano?',
      correct: 'Lo aplasta sobre una recta o un punto: el área pasa a 0.',
      wrong: [
        ['Lo gira 180° sin cambiar ninguna de las áreas.', 'Girar conserva el área: su determinante es 1.'],
        ['Lo refleja respecto a una recta, invirtiendo la orientación.', 'Una reflexión tiene det = −1: invierte orientación pero conserva el área.'],
        ['Lo deja intacto, porque un determinante nulo significa que no transforma nada.', 'Dejarlo intacto es la identidad, con det = 1.'],
      ],
      explanation: '|det A| es el factor de escala de áreas; si es 0, el cuadrado unidad se colapsa y se pierde información.',
    },
    {
      prompt: 'Para A = [[2, 0], [0, 3]], ¿qué vectores son propios?',
      correct: 'Los múltiplos no nulos de (1, 0) y de (0, 1).',
      wrong: [
        ['Solo (1, 1), porque se estira en ambas direcciones a la vez.', 'A(1, 1) = (2, 3), que no es múltiplo de (1, 1): cambió de dirección.'],
        ['Cualquier vector no nulo, porque A no tiene rotación.', 'Sin rotación pura, igual cambia la dirección de vectores oblicuos al estirar distinto cada eje.'],
        ['Ninguno, porque una matriz diagonal no tiene autovalores reales.', 'Al contrario: sus autovalores son justo los de la diagonal.'],
      ],
      explanation: 'A(1, 0) = 2(1, 0) y A(0, 1) = 3(0, 1). Como 2 ≠ 3, ningún otro eje se conserva.',
    },
  ],
  M23: [
    {
      prompt: '¿Qué hace A = UΣVᵀ con la circunferencia unitaria?',
      correct: 'La gira, la estira en ejes ortogonales y la vuelve a girar: una elipse.',
      wrong: [
        ['La traslada al punto definido por los valores singulares.', 'Una matriz no traslada: el centro se queda en el origen.'],
        ['La convierte en un cuadrado de lados σ₁ y σ₂.', 'Las transformaciones lineales llevan circunferencias a elipses, no a polígonos.'],
        ['La deja como circunferencia y solo cambia su radio, multiplicándolo por det A.', 'Solo pasa si todos los σᵢ son iguales; en general estira distinto cada eje.'],
      ],
      explanation: 'U y V son ortogonales (giran o reflejan) y Σ es diagonal (estira): la imagen es una elipse de semiejes σ₁ ≥ σ₂.',
    },
    {
      prompt: '¿Qué es la primera componente principal de una nube de datos centrados?',
      correct: 'La dirección en la que los datos tienen máxima varianza.',
      wrong: [
        ['La dirección del dato más alejado del origen.', 'Un único dato extremo no define la dirección donde se dispersan todos.'],
        ['El eje x, porque es el primero de la base canónica.', 'PCA no se fija en los ejes originales; busca la mejor dirección para estos datos.'],
        ['La dirección de mínima varianza, que es la que concentra la señal útil.', 'Es al revés: la mínima varianza suele ser la que se descarta.'],
      ],
      explanation: 'Maximizar la varianza wᵀΣw con |w| = 1 da el autovector de Σ con mayor autovalor (igual al primer vector singular derecho de X).',
    },
  ],
  M24: [
    {
      prompt: 'Se lanza un dado justo. Si sabes que salió par, ¿cuál es la probabilidad de que sea 6?',
      correct: '1/3: condicionar reduce el universo a {2, 4, 6}.',
      wrong: [
        ['1/6: saber que salió par no cambia la probabilidad de cada cara.', 'La información sí cambia el universo: las caras impares ya no son posibles.'],
        ['1/2: los números pares son la mitad de los resultados.', 'Eso es P(par); la pregunta es P(6 | par).'],
        ['1/12: se multiplican P(par) = 1/2 y P(6) = 1/6.', 'Multiplicar sería para eventos independientes y no da una condicional.'],
      ],
      explanation: 'P(6 | par) = P(6 ∩ par)/P(par) = (1/6)/(1/2) = 1/3.',
    },
    {
      prompt: 'A y B son eventos independientes. ¿Qué se cumple?',
      correct: 'P(A ∩ B) = P(A)·P(B): conocer B no altera P(A).',
      wrong: [
        ['P(A ∩ B) = 0, porque dos eventos independientes no pueden ocurrir juntos.', 'Eso es ser disjuntos (excluyentes), que es casi lo contrario de independientes.'],
        ['P(A ∪ B) = P(A) + P(B), sin restar nada.', 'Esa suma vale para eventos disjuntos; con independencia hay que restar P(A ∩ B).'],
        ['P(A | B) = P(B | A), si ambas son positivas.', 'Con independencia P(A | B) = P(A) y P(B | A) = P(B), que en general difieren.'],
      ],
      explanation: 'Independencia: P(A | B) = P(A), equivalente a P(A ∩ B) = P(A)P(B).',
    },
  ],
  M25: [
    {
      prompt: 'X ~ Binomial(n = 10, p = 0,3). ¿Cuánto vale E[X]?',
      correct: '3, porque la esperanza de una binomial es n·p.',
      wrong: [
        ['2,1, porque se calcula n·p·(1 − p).', 'Esa es la varianza de la binomial, no su esperanza.'],
        ['0,3, porque la esperanza coincide con la probabilidad de éxito.', 'p es la esperanza de un solo ensayo; aquí hay diez.'],
        ['5, porque en promedio la mitad de los ensayos son éxito.', 'La mitad sería con p = 0,5; aquí p = 0,3.'],
      ],
      explanation: 'X es suma de 10 Bernoulli(0,3); por linealidad E[X] = 10·0,3 = 3.',
    },
    {
      prompt: 'Si Var(X) = 4, ¿cuánto vale Var(3X)?',
      correct: '36, porque al multiplicar por 3 la varianza se multiplica por 9.',
      wrong: [
        ['12, porque la varianza se multiplica por 3 igual que la esperanza.', 'La varianza mide desvíos al cuadrado: la constante sale al cuadrado.'],
        ['4, porque multiplicar por una constante no cambia la dispersión.', 'Eso le pasa a sumar una constante, no a multiplicar.'],
        ['7, porque se le suma 3 a la varianza original.', 'Multiplicar la variable no suma nada a la varianza.'],
      ],
      explanation: 'Var(aX) = E[(aX − aμ)²] = a²·E[(X − μ)²] = 9·4 = 36.',
    },
  ],
  M26: [
    {
      prompt: 'Cov(X, Y) = 0. ¿Qué se puede concluir?',
      correct: 'Que no hay relación lineal, aunque puede haber otra clase de dependencia.',
      wrong: [
        ['Que X e Y son independientes en cualquier caso.', 'Independencia implica covarianza 0, pero no al revés.'],
        ['Que X e Y tienen exactamente la misma media.', 'La covarianza no compara medias; mide cómo varían juntas.'],
        ['Que una de las dos variables tiene que ser constante en todos los casos.', 'Puede pasar, pero también con dos variables muy aleatorias sin relación lineal.'],
      ],
      explanation: 'Con X simétrica en 0, Cov(X, X²) = E[X³] − E[X]E[X²] = 0, y sin embargo X² depende por completo de X.',
    },
    {
      prompt: 'Lanzas una moneda justa 10 000 veces. ¿Qué dice la ley de los grandes números?',
      correct: 'Que la proporción de caras estará muy probablemente cerca de 0,5.',
      wrong: [
        ['Que saldrán exactamente 5000 caras y 5000 cruces.', 'La ley habla de proporciones aproximadas, no de conteos exactos.'],
        ['Que tras una racha de cruces las caras se vuelven más probables para compensar.', 'Es la falacia del jugador: cada lanzamiento sigue siendo 50/50.'],
        ['Que la diferencia entre caras y cruces se acerca a cero.', 'Esa diferencia suele crecer, del orden de √n; lo que se estabiliza es la proporción.'],
      ],
      explanation: 'X̄ₙ → 0,5 en probabilidad. La diferencia absoluta caras − cruces típicamente vale unos √n = 100, pero dividida entre n tiende a 0.',
    },
  ],
  M27: [
    {
      prompt: 'En 10 lanzamientos de una moneda salen 7 caras. ¿Cuál es el estimador de máxima verosimilitud de p?',
      correct: '0,7: el valor de p que hace más probable lo observado.',
      wrong: [
        ['0,5: la moneda se supone justa antes de mirar los datos observados.', 'Eso es un supuesto previo; la MLE sale solo de los datos.'],
        ['0,3: la proporción de cruces que se observaron.', 'p es la probabilidad de cara; 0,3 corresponde a cruz.'],
        ['1,0: con p = 1 las caras observadas son seguras.', 'Con p = 1 las 3 cruces observadas serían imposibles: verosimilitud 0.'],
      ],
      explanation: 'L(p) = p⁷(1 − p)³; derivando ln L e igualando a 0: 7/p − 3/(1 − p) = 0 ⇒ p̂ = 0,7.',
    },
    {
      prompt: '¿Qué significa un intervalo de confianza del 95 % para la media μ?',
      correct: 'Que el método acierta, es decir, contiene a μ, en el 95 % de las muestras.',
      wrong: [
        ['Que μ tiene un 95 % de probabilidad de estar dentro de este intervalo ya calculado.', 'En el enfoque frecuentista μ es fija: este intervalo concreto la contiene o no.'],
        ['Que el 95 % de los datos observados caen dentro del intervalo.', 'El intervalo es para la media, no para los datos individuales.'],
        ['Que la estimación tiene un error menor que el 5 %.', 'El 95 % es de cobertura, no un porcentaje de error.'],
      ],
      explanation: 'La probabilidad del 95 % describe al método al repetir el muestreo, no a un intervalo concreto (para eso está el enfoque bayesiano).',
    },
  ],
  M28: [
    {
      prompt: 'Si L = (w·x − y)² con x = 2, y = 1 y w = 1, ¿cuánto vale ∂L/∂w?',
      correct: '4, porque ∂L/∂w = 2(w·x − y)·x = 2·1·2.',
      wrong: [
        ['2, porque ∂L/∂w = 2(w·x − y) sin multiplicar por x.', 'Falta el último eslabón de la cadena: ∂(wx)/∂w = x.'],
        ['1, porque es el valor de la pérdida L = (2 − 1)².', 'Ese es el valor de L, no cuánto cambia L al mover w.'],
        ['8, porque se multiplica por x en dos ocasiones.', 'x aparece una sola vez en la cadena de derivadas.'],
      ],
      explanation: 'z = wx − y = 1; ∂L/∂z = 2z = 2; ∂z/∂w = x = 2; producto: 4.',
    },
    {
      prompt: '¿Por qué backpropagation guarda las activaciones del paso hacia delante?',
      correct: 'Porque las derivadas locales de cada nodo dependen de esos valores.',
      wrong: [
        ['Para repetir el paso hacia delante sin necesitar los datos de entrada.', 'Se guardan para el paso hacia atrás, no para repetir el de ida.'],
        ['Porque los pesos se actualizan con las activaciones y no con gradientes.', 'La actualización usa gradientes; las activaciones sirven para calcularlos.'],
        ['Para evitar aplicar la regla de la cadena en las capas ocultas.', 'Al contrario: las necesita justamente para aplicar la regla de la cadena.'],
      ],
      explanation: 'Por ejemplo, ∂(w·a)/∂w = a: sin la activación a guardada no se puede calcular ese factor de la cadena.',
    },
  ],
  M29: [
    {
      prompt: 'Descenso de gradiente sobre f(w) = w² con tasa α = 1,5. ¿Qué ocurre?',
      correct: 'Diverge oscilando: cada paso hace w ← −2w y |w| se duplica.',
      wrong: [
        ['Converge en un solo paso, porque la tasa es grande.', 'Un paso grande se pasa del mínimo: w − 1,5·2w = −2w.'],
        ['Converge lentamente, porque una tasa mayor que 1 frena cada paso del descenso.', 'Para f = w² converge si 0 < α < 1; con α = 1,5 el factor −2 amplifica.'],
        ['Se queda quieto, porque la derivada en el mínimo es cero.', 'Solo estaría quieto si empezara en w = 0.'],
      ],
      explanation: 'w ← w − α·2w = (1 − 2α)w = −2w: el factor tiene módulo 2 > 1, así que oscila y crece.',
    },
    {
      prompt: 'Para una función convexa diferenciable, ¿qué garantiza un punto con ∇f = 0?',
      correct: 'Que es un mínimo global de la función.',
      wrong: [
        ['Que es un máximo global de la función.', 'Las convexas curvan hacia arriba: sus puntos críticos son fondos, no cimas.'],
        ['Que es solo un mínimo local y puede haber otros más bajos.', 'En una convexa no hay valles separados: todo mínimo local es global.'],
        ['Que es un punto de silla de la superficie.', 'Una silla baja en alguna dirección, cosa imposible en una convexa.'],
      ],
      explanation: 'Convexidad: f(y) ≥ f(x) + ∇f(x)·(y − x). Con ∇f(x) = 0 queda f(y) ≥ f(x) para todo y.',
    },
  ],
  M30: [
    {
      prompt: '¿Por qué 0,1 + 0,2 no da exactamente 0,3 en punto flotante binario?',
      correct: 'Porque 0,1 y 0,2 no tienen representación binaria finita y se redondean.',
      wrong: [
        ['Porque el procesador suma con un pequeño error aleatorio distinto en cada operación.', 'El redondeo IEEE 754 es determinista: siempre da el mismo resultado.'],
        ['Porque los decimales se truncan a una sola cifra significativa.', 'Se guardan unas 15 a 17 cifras decimales; el problema es la base 2.'],
        ['Porque la suma en punto flotante no es conmutativa.', 'Sí es conmutativa; lo que falla es la asociatividad.'],
      ],
      explanation: '0,1 en binario es 0,000110011…₂ (periódico). Al cortar a 52 bits de mantisa, 0,1 + 0,2 = 0,30000000000000004.',
    },
    {
      prompt: 'Cerca de una raíz simple, ¿cómo se compara la convergencia de Newton con la de bisección?',
      correct: 'Newton duplica los dígitos correctos por paso; bisección gana solo un bit.',
      wrong: [
        ['Ambas son lineales y ganan aproximadamente un dígito correcto por cada iteración.', 'Newton usa la derivada y, cerca de la raíz, va mucho más rápido.'],
        ['Bisección es cuadrática y Newton es solo lineal.', 'Los papeles están invertidos: bisección divide el intervalo a la mitad cada vez.'],
        ['Newton converge siempre, desde cualquier punto inicial.', 'Lejos de la raíz Newton puede diverger u oscilar; bisección no.'],
      ],
      explanation: 'Newton: eₖ₊₁ ≈ C·eₖ². Bisección: eₖ₊₁ = eₖ/2. Bisección es más lenta pero siempre converge con un cambio de signo.',
    },
  ],
  M31: [
    {
      prompt: '¿Cuánta entropía tiene una moneda justa?',
      correct: '1 bit: hay dos resultados igual de probables.',
      wrong: [
        ['0 bits: el resultado es aleatorio, así que no informa.', '0 bits sería un resultado seguro; la incertidumbre es máxima aquí.'],
        ['0,5 bits: cada resultado aporta medio bit.', 'Cada resultado aporta −log₂(½) = 1 bit, y el promedio es 1.'],
        ['2 bits: porque hay dos resultados posibles.', '2 bits serían cuatro resultados equiprobables: log₂ 4 = 2.'],
      ],
      explanation: 'H = −(½ log₂ ½ + ½ log₂ ½) = 1 bit.',
    },
    {
      prompt: '¿Es D_KL(p ‖ q) igual a D_KL(q ‖ p)?',
      correct: 'No en general: la divergencia KL no es simétrica.',
      wrong: [
        ['Sí, siempre, porque mide la distancia entre dos distribuciones cualesquiera.', 'Precisamente no es una distancia: falla la simetría.'],
        ['Sí, siempre que ambas sean distribuciones discretas.', 'La asimetría aparece también en el caso discreto.'],
        ['No, porque una de las dos siempre vale cero.', 'Ambas valen 0 solo si p = q; en otro caso las dos son positivas.'],
      ],
      explanation: 'Ejemplo: p = (½, ½), q = (0,9; 0,1): D_KL(p‖q) ≈ 0,737 bits y D_KL(q‖p) ≈ 0,531 bits.',
    },
  ],
  M32: [
    {
      prompt: '¿Por qué ℤ₆ con suma y producto módulo 6 no es un cuerpo?',
      correct: 'Porque 2·3 = 0 en ℤ₆, así que 2 no tiene inverso.',
      wrong: [
        ['Porque ℤ₆ tiene infinitos elementos.', 'ℤ₆ tiene exactamente 6 elementos: 0, 1, 2, 3, 4 y 5.'],
        ['Porque la suma en ℤ₆ no es conmutativa.', 'La suma módulo n siempre es conmutativa.'],
        ['Porque 6 es par, y los cuerpos solo existen con módulo impar.', 'ℤ₂ es un cuerpo; lo que importa es que el módulo sea primo.'],
      ],
      explanation: 'ℤₙ es cuerpo si y solo si n es primo. Con n = 6 = 2·3, los factores 2 y 3 no tienen inverso.',
    },
    {
      prompt: '¿Qué falla en los números racionales que obliga a construir los reales?',
      correct: 'Hay sucesiones de racionales cuyo límite, como √2, no es racional.',
      wrong: [
        ['La suma de dos racionales no siempre es un número racional.', 'p/q + r/s = (ps + rq)/(qs) siempre es racional.'],
        ['Entre dos racionales distintos no siempre existe otro número racional intermedio.', 'Siempre existe: su punto medio. Los racionales son densos.'],
        ['Los racionales no pueden ordenarse de menor a mayor.', 'Están perfectamente ordenados; lo que les falta es completitud.'],
      ],
      explanation: '1; 1,4; 1,41; 1,414; … es de Cauchy en ℚ pero su límite √2 no está en ℚ: ℚ tiene "huecos" que ℝ rellena.',
    },
  ],
};
