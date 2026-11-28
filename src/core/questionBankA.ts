/**
 * Question bank, modules M1-M16. See questionBank.ts for the format and the rules.
 * Every number in these items was checked by hand; distractors encode real misconceptions.
 */
import type { BankItem, CheckpointFeedback } from './questionBank';

export const CHECKPOINT_FEEDBACK_A: CheckpointFeedback = {
  M1: [
    'Sumar 1 sería escribir un 1 en la posición de 2⁰; añadir un 0 a la derecha mueve todos los bits una posición.',
    'Dividir entre dos sería quitar el último bit (desplazar a la derecha), no añadir uno.',
    'Un 0 a la derecha no es como un 0 a la izquierda: cambia la posición, y por tanto el peso, de todos los demás bits.',
  ],
  M2: [
    'El exponente 2 no actúa sobre un solo término: (a + b)² es (a + b)·(a + b), y hay que multiplicar todo por todo.',
    'Las áreas del cuadrado grande se suman, no se restan: dibuja el cuadrado de lado a + b y cuenta sus piezas.',
    'Con a y b positivos ningún término cambia de signo; mira de dónde salen los términos cruzados a·b.',
  ],
  M3: [
    'Bajar la curva una unidad es la transformación f(x) − 1, no la inversa.',
    'Multiplicar las y por −1 refleja sobre el eje x; la inversa intercambia los papeles de x e y.',
    'Eso es la recíproca 1/f(x), que no es lo mismo que la función inversa f⁻¹.',
  ],
  M4: [
    'Sumar r y φ sería una traslación; en forma polar, multiplicar actúa sobre el módulo y el ángulo.',
    'Reflejar sobre el eje horizontal es tomar el conjugado, no multiplicar por r·e^(iφ).',
    'Proyectar sobre el círculo unitario es dividir entre |z|; multiplicar no descarta el módulo, lo escala.',
  ],
  M5: [
    'Eso niega demasiado: para que "todos cumplen" sea falso no hace falta que todos fallen.',
    '"Existe exactamente uno que cumple" no contradice que todos cumplan; busca un testigo que falle.',
    'La negación no habla de pertenecer al dominio; cambia el cuantificador y niega la propiedad.',
  ],
  M6: [
    'Ningún número finito de casos cubre un dominio infinito; que el código no falle no prueba nada fuera de lo probado.',
    'Una demostración no ejecuta casos: razona sobre un elemento arbitrario y por eso vale para todos.',
    'Elegir casos al azar no cambia el problema: siguen siendo finitos frente a infinitos posibles.',
  ],
  M7: [
    'El paso inductivo solo dice "si vale para k, vale para k + 1": sin una primera ficha que caiga, no arranca nada.',
    'El buen orden justifica la inducción, pero no reemplaza el caso base: sigue haciendo falta un primer elemento verdadero.',
    'Comprobar un k grande no ayuda si no vale el caso base; la cadena debe empezar en algún punto concreto.',
  ],
  M8: [
    'No hace falta que los dígitos de d sean mayores; basta con que difiera de cada fila en una posición concreta.',
    'd tiene infinitos decimales como las filas; el argumento no depende de la periodicidad.',
    'La lista puede estar en cualquier orden; Cantor supone una lista arbitraria y aun así encuentra un número fuera.',
  ],
  M9: [
    'Las constantes deciden solo para n pequeños; a partir de cierto n, n² siempre supera a n·log n.',
    'n·log n crece más despacio que n²: no están en la misma clase Θ.',
    'La notación asintótica existe justamente para comparar órdenes ignorando constantes.',
  ],
  M10: [
    'El tamaño de a no importa; lo que importa es si comparte factores con n.',
    'Si a y n son pares comparten el factor 2, y entonces a no tiene inverso.',
    'Si a divide a n, mcd(a, n) = a > 1 (salvo a = 1), justo el caso sin inverso.',
  ],
  M11: [
    'Elegir sin reemplazo no quita k! elementos; k! cuenta los órdenes posibles de un mismo grupo.',
    'El orden no multiplica cada elemento por su posición; cada ordenación distinta se cuenta como una permutación aparte.',
    'El palomar no interviene aquí: se divide porque cada grupo aparece repetido varias veces en las permutaciones.',
  ],
  M12: [
    'BFS no ordena por peso (eso hace Dijkstra); su orden sale de la estructura donde guarda la frontera.',
    'Ambos funcionan en cualquier grafo; la diferencia está en qué vértice pendiente se visita primero.',
    'Con marcas de visitado, los dos visitan cada vértice una vez; lo que cambia es el orden.',
  ],
  M13: [
    'Los límites se calculan perfectamente en enteros; la exclusión es solo del punto a.',
    'Quitar el punto no arregla un salto: si los laterales difieren, el límite sigue sin existir.',
    'No hay relación fija entre δ y ε; δ se elige en función de ε.',
  ],
  M14: [
    'f′(w) puede ser positiva o negativa; el signo indica hacia dónde sube la curva.',
    'Sumar la derivada sí cambia w: lo mueve cuesta arriba, aumentando el error.',
    'Una sola iteración rara vez llega al mínimo exacto; con α grande incluso puede oscilar.',
  ],
  M15: [
    'F′ no es la pendiente de f; F acumula área, y su ritmo de cambio es otra cosa.',
    'Eso es el ancho de cada rectángulo en una suma de Riemann, no la derivada del área acumulada.',
    'El error del trapecio es un tema de aproximación numérica, no la derivada de F.',
  ],
  M16: [
    'Fórmula cerrada aparte, la serie solo converge donde |x| < 1; en 1,2 los términos no tienden a 0.',
    'Con x = 1,2 todas las potencias son positivas: no hay alternancia de signos.',
    'No toda función suave tiene serie convergente en todo ℝ; aquí la singularidad en x = 1 marca el límite.',
  ],
};

export const BANK_A: Record<string, BankItem[]> = {
  M1: [
    {
      prompt: '¿Cuánto vale el número binario 1101₂ en base 10?',
      correct: '13, porque se suman los pesos 8 + 4 + 0 + 1 de las posiciones ocupadas.',
      wrong: [
        ['11, porque los dígitos se leen de derecha a izquierda como 1011₂.', 'Leíste el número al revés: el bit de la izquierda es el de mayor peso.'],
        ['1101, porque los dígitos binarios conservan su valor en base diez.', 'Los mismos dígitos significan otra cantidad en otra base: cada posición vale una potencia de 2.'],
        ['4, porque se cuentan los dígitos del número y no sus pesos posicionales.', 'Contar dígitos da la longitud, no el valor: cada 1 aporta el peso de su posición.'],
      ],
      explanation: '1101₂ = 1·2³ + 1·2² + 0·2¹ + 1·2⁰ = 8 + 4 + 0 + 1 = 13.',
    },
    {
      prompt: 'Un registro sin signo de 8 bits vale 255 y se le suma 1. ¿Qué valor queda guardado?',
      correct: '0, porque 256 necesita un noveno bit y ese acarreo se pierde.',
      wrong: [
        ['256, porque el procesador amplía el registro cuando el resultado lo exige.', 'El ancho del registro es fijo: con 8 bits el mayor valor representable es 255.'],
        ['255, porque el registro se satura en su máximo y descarta lo que sobra.', 'La saturación existe en instrucciones especiales, pero la suma entera usual se reduce módulo 2⁸.'],
        ['−1, porque superar el máximo convierte el número en un valor negativo.', 'Eso mezcla enteros con signo: en un registro sin signo no hay negativos.'],
      ],
      explanation: '255 = 11111111₂; al sumar 1 se obtiene 100000000₂, y los 8 bits bajos son 0 (255 + 1 ≡ 0 mod 256).',
    },
  ],
  M2: [
    {
      prompt: '¿Cuál es el conjunto solución de la inecuación |x − 3| ≤ 2?',
      correct: '[1, 5]: todos los x cuya distancia a 3 es como mucho 2.',
      wrong: [
        ['{1, 5}: solo los dos puntos cuya distancia a 3 es justo 2.', 'Eso resuelve |x − 3| = 2; la desigualdad ≤ incluye todo lo que está entre ellos.'],
        ['(−∞, 1] ∪ [5, ∞): los puntos que quedan lejos del 3.', 'Eso resuelve |x − 3| ≥ 2: invertiste el sentido de la desigualdad.'],
        ['(−∞, 5]: se quita el valor absoluto y se despeja x ≤ 5.', 'Quitar el valor absoluto pierde la mitad del problema: también hay que acotar por debajo.'],
      ],
      explanation: '|x − 3| ≤ 2 ⇔ −2 ≤ x − 3 ≤ 2 ⇔ 1 ≤ x ≤ 5.',
    },
    {
      prompt: '¿Cuántas soluciones tiene el sistema x + y = 2, 2x + 2y = 5?',
      correct: 'Ninguna: son rectas paralelas distintas, la segunda es x + y = 2,5.',
      wrong: [
        ['Infinitas: la segunda ecuación es múltiplo exacto de la primera.', 'Solo el lado izquierdo es múltiplo; el derecho daría 4, no 5.'],
        ['Una: dos ecuaciones lineales con dos incógnitas siempre se cortan en un punto.', 'Dos rectas en el plano pueden ser paralelas; mira sus pendientes.'],
        ['Dos: cada ecuación aporta su propio punto de intersección.', 'Dos rectas distintas se cortan como mucho en un punto, nunca en dos.'],
      ],
      explanation: 'Dividiendo la segunda entre 2 queda x + y = 2,5: misma pendiente que x + y = 2 y distinta ordenada, así que no se cortan.',
    },
  ],
  M3: [
    {
      prompt: 'Con dominio ℝ, ¿es inyectiva la función f(x) = x²?',
      correct: 'No: f(2) = f(−2) = 4, dos entradas distintas comparten salida.',
      wrong: [
        ['Sí: cada entrada x produce exactamente una salida x².', 'Eso dice que f es función; inyectiva pide además que salidas iguales vengan de entradas iguales.'],
        ['Sí: su gráfica pasa la prueba de la recta vertical en todo el dominio ℝ.', 'La recta vertical prueba que es función; para inyectividad mira las rectas horizontales.'],
        ['No: la entrada 0 no tiene ninguna salida definida en ℝ.', 'f(0) = 0 está perfectamente definida; el problema está en otro par de entradas.'],
      ],
      explanation: 'Inyectiva exige f(a) = f(b) ⇒ a = b. Como (−2)² = 2², falla. Restringida a [0, ∞) sí sería inyectiva.',
    },
    {
      prompt: 'Si f(x) = x + 1 y g(x) = 2x, ¿cuánto vale f(g(3))?',
      correct: '7: primero g(3) = 6 y después f(6) = 7.',
      wrong: [
        ['8: primero f(3) = 4 y después g(4) = 8.', 'Eso es g(f(3)): en f(g(x)) la máquina de dentro, g, actúa primero.'],
        ['10: se suman los resultados f(3) = 4 y g(3) = 6.', 'Componer no es sumar: la salida de una función entra en la otra.'],
        ['24: se multiplican los resultados f(3) = 4 y g(3) = 6.', 'Componer no es multiplicar: encadena las dos máquinas.'],
      ],
      explanation: 'f(g(3)) = f(2·3) = f(6) = 7. En cambio g(f(3)) = g(4) = 8: el orden importa.',
    },
  ],
  M4: [
    {
      prompt: 'Un arco de circunferencia mide exactamente lo mismo que el radio. ¿Qué ángulo central abarca?',
      correct: '1 radián, unos 57,3°, que es justo la definición de radián.',
      wrong: [
        ['π radianes, porque π relaciona el radio con la longitud de la circunferencia.', 'π radianes abarcan media circunferencia, un arco de longitud π·r, no r.'],
        ['1 grado, porque arco y radio iguales significan una unidad angular.', 'Un grado es 1/360 de vuelta; la unidad que nace de "arco = radio" es otra.'],
        ['60°, porque el triángulo formado con la cuerda resulta equilátero.', 'Con 60° la cuerda mide r, pero el arco es algo más largo que la cuerda.'],
      ],
      explanation: 'θ = arco / radio = r / r = 1 rad = 180°/π ≈ 57,3°.',
    },
    {
      prompt: '¿De dónde sale geométricamente la identidad sen²θ + cos²θ = 1?',
      correct: 'De Pitágoras: el punto (cos θ, sen θ) está a distancia 1 del origen.',
      wrong: [
        ['De que seno y coseno valen siempre 1/√2, sea cual sea el ángulo elegido.', 'Eso solo ocurre en 45°; la identidad vale para todo θ.'],
        ['De que al sumar las dos ondas se cancelan en cada punto.', 'sen θ + cos θ no vale 1; la identidad habla de sus cuadrados.'],
        ['De que los ángulos se miden en radianes y no en grados.', 'La identidad vale en cualquier unidad angular; su origen es un triángulo rectángulo.'],
      ],
      explanation: 'El punto (cos θ, sen θ) forma con los ejes un triángulo rectángulo de hipotenusa 1: cos²θ + sen²θ = 1².',
    },
  ],
  M5: [
    {
      prompt: 'Es verdad que "si llueve, el suelo está mojado". ¿Qué otra afirmación es necesariamente verdadera?',
      correct: 'Si el suelo no está mojado, entonces no está lloviendo.',
      wrong: [
        ['Si el suelo está mojado, entonces está lloviendo.', 'Esa es la recíproca: el suelo pudo mojarse por un aspersor.'],
        ['Si no está lloviendo, entonces el suelo no está mojado.', 'Esa es la inversa, equivalente a la recíproca, no al enunciado original.'],
        ['Está lloviendo y el suelo está mojado al mismo tiempo.', 'Una implicación no afirma que su hipótesis ocurra; solo qué pasa si ocurre.'],
      ],
      explanation: 'P → Q equivale a su contrapositiva ¬Q → ¬P. La recíproca Q → P y la inversa ¬P → ¬Q no son equivalentes a P → Q.',
    },
    {
      prompt: '¿Qué expresión es lógicamente equivalente a ¬(A ∧ B)?',
      correct: '¬A ∨ ¬B: basta que una de las dos falle para que la conjunción falle.',
      wrong: [
        ['¬A ∧ ¬B: deben fallar las dos a la vez para que la conjunción sea falsa.', 'Eso es demasiado fuerte: con que A falle, A ∧ B ya es falsa.'],
        ['A ∨ B: la negación cambia la conjunción por una disyunción.', 'De Morgan cambia el conectivo y además niega cada término.'],
        ['¬A ∧ B: la negación solo afecta al primer término.', 'La negación de fuera se reparte sobre ambos términos.'],
      ],
      explanation: 'De Morgan: ¬(A ∧ B) ≡ ¬A ∨ ¬B. En Venn, el complemento de la intersección es la unión de los complementos.',
    },
  ],
  M6: [
    {
      prompt: 'Para probar "si n² es par, entonces n es par", ¿qué estrategia es válida?',
      correct: 'Probar la contrapositiva: si n = 2k + 1 es impar, entonces n² también es impar.',
      wrong: [
        ['Probar la recíproca: si n es par, n² es par, y de ahí concluir el enunciado pedido.', 'La recíproca es otra afirmación; probarla no demuestra la original.'],
        ['Comprobar n = 2, 4 y 6, porque el patrón de los pares se repite.', 'Unos pocos casos no cubren todos los enteros; hace falta un argumento general.'],
        ['Suponer que n² es impar y deducir que n es impar.', 'Eso es la inversa (¬P → ¬Q), que no equivale al enunciado.'],
      ],
      explanation: 'P → Q equivale a ¬Q → ¬P. Si n es impar, n² es impar; por tanto, si n² es par, n tiene que ser par.',
    },
    {
      prompt: 'Para refutar la afirmación "todo número primo es impar", ¿qué basta?',
      correct: 'Un único contraejemplo: 2 es primo y es par.',
      wrong: [
        ['Mostrar que la mayoría de los primos son impares, lo que la contradice.', 'Que la mayoría cumpla no refuta nada; para eso hace falta uno que no cumpla.'],
        ['Encontrar un número impar que no sea primo, por ejemplo 9.', 'Eso va en la dirección contraria: la afirmación habla de primos, no de impares.'],
        ['Demostrar por inducción que los primos mayores que 2 son impares.', 'Eso apoya la afirmación para p > 2; para refutarla busca dónde falla.'],
      ],
      explanation: 'Un enunciado "para todo" cae con un solo testigo: ¬∀p P(p) ≡ ∃p ¬P(p). El primo 2 es ese testigo.',
    },
  ],
  M7: [
    {
      prompt: '¿Por qué memoizar fib(n) reduce tanto el trabajo de la versión recursiva ingenua?',
      correct: 'Porque cada fib(k) se calcula una vez y las repeticiones se leen del caché.',
      wrong: [
        ['Porque usa una fórmula cerrada que evita por completo llamar a la función recursiva.', 'La memoización sigue siendo recursiva; lo que cambia es que no repite cálculos.'],
        ['Porque reduce la pila a la mitad al llamar solo a fib(n − 2).', 'Se siguen haciendo las dos llamadas; la segunda simplemente ya tiene la respuesta.'],
        ['Porque elimina el caso base y deja terminar antes a la recursión.', 'Sin caso base la recursión no terminaría nunca.'],
      ],
      explanation: 'El árbol ingenuo de fib(n) tiene un número exponencial de nodos (fib(5) hace 15 llamadas); con caché solo hay n + 1 valores distintos.',
    },
    {
      prompt: 'Un bucle suma una lista y mantiene "s = suma de los i primeros elementos". ¿Para qué sirve esa propiedad?',
      correct: 'Es un invariante: se mantiene en cada paso y al final da la suma total.',
      wrong: [
        ['Es un caso base: solo se comprueba antes de entrar en el bucle.', 'Un invariante se mantiene en cada iteración, no solo al principio.'],
        ['Es la condición de parada: el bucle termina cuando deja de cumplirse.', 'Si dejara de cumplirse, el resultado sería incorrecto; la parada la decide i.'],
        ['Es una optimización: permite que el bucle recorra la lista en menos pasos de los necesarios.', 'No cambia el número de pasos; sirve para razonar que el resultado es correcto.'],
      ],
      explanation: 'Al inicio i = 0 y s = 0; cada paso suma el elemento i y avanza i. Cuando i = n, el invariante dice que s es la suma total.',
    },
  ],
  M8: [
    {
      prompt: '"a ~ b si a − b es múltiplo de 3" sobre ℤ. ¿En cuántas clases parte a los enteros?',
      correct: 'En 3 clases, según el resto 0, 1 o 2 al dividir entre 3.',
      wrong: [
        ['En infinitas clases, una por entero, porque cada entero es distinto.', 'La relación agrupa: 1, 4 y −2 quedan en la misma clase.'],
        ['En 2 clases: los múltiplos de 3 y todos los demás números.', 'Los "demás" se separan: 1 y 2 no están relacionados, porque 1 − 2 = −1.'],
        ['En ninguna, porque la relación no es reflexiva en los negativos.', 'a − a = 0 es múltiplo de 3 para todo a, también los negativos.'],
      ],
      explanation: 'Es una relación de equivalencia (reflexiva, simétrica, transitiva) y sus clases son los restos módulo 3: [0], [1], [2].',
    },
    {
      prompt: '¿Por qué hay "tantos" números pares positivos como enteros positivos?',
      correct: 'Porque n ↦ 2n los empareja uno a uno, sin repetir ni dejar a nadie.',
      wrong: [
        ['Porque ambos son infinitos y todos los infinitos tienen el mismo tamaño.', 'No todos los infinitos son iguales: los reales no caben en ninguna lista (Cantor).'],
        ['Porque la mitad de infinito sigue siendo infinito, sin más.', 'Esa intuición no es una prueba; el tamaño se compara con biyecciones.'],
        ['Porque cada número par aparece dos veces en la lista de enteros.', 'Cada par aparece una sola vez; lo que importa es poder emparejarlos.'],
      ],
      explanation: 'f(n) = 2n es inyectiva y sobreyectiva sobre los pares, luego es una biyección: mismo cardinal ℵ₀.',
    },
  ],
  M9: [
    {
      prompt: '¿Cuánto vale 1 + 2 + 3 + ⋯ + 100?',
      correct: '5050, porque n(n + 1)/2 con n = 100 da 100·101/2.',
      wrong: [
        ['10 000, porque son cien números de tamaño cercano a cien.', 'Los sumandos no valen todos 100; su promedio está cerca de 50.'],
        ['5000, porque son cien términos con promedio exacto de cincuenta.', 'El promedio exacto es (1 + 100)/2 = 50,5, no 50.'],
        ['10 100, porque se emparejan cien parejas que suman ciento uno.', 'Duplicar la escalera da 100·101; la suma pedida es la mitad.'],
      ],
      explanation: 'Dos copias de la escalera forman un rectángulo 100 × 101 = 10 100; una sola vale 5050.',
    },
    {
      prompt: 'La recurrencia de merge sort T(n) = 2T(n/2) + n, ¿en qué clase está?',
      correct: 'Θ(n log n): hay unos log₂ n niveles y cada nivel trabaja n en total.',
      wrong: [
        ['Θ(n): las dos mitades se procesan y el costo se reparte entre ellas.', 'Cada nivel del árbol cuesta n, y hay más de un nivel.'],
        ['Θ(n²): cada nivel duplica las llamadas y también duplica el trabajo de cada una.', 'Las llamadas se duplican, pero cada una es de la mitad del tamaño: el trabajo por nivel sigue siendo n.'],
        ['Θ(log n): el tamaño se divide a la mitad en cada llamada.', 'Eso cuenta los niveles, pero olvida el trabajo n de mezclar en cada nivel.'],
      ],
      explanation: 'En el árbol de recursión el nivel j tiene 2ʲ llamadas de tamaño n/2ʲ: trabajo n por nivel, log₂ n niveles.',
    },
  ],
  M10: [
    {
      prompt: '¿Cuál es el inverso multiplicativo de 3 módulo 7?',
      correct: '5, porque 3·5 = 15 = 2·7 + 1 ≡ 1 (mod 7).',
      wrong: [
        ['4, porque 3 + 4 = 7 ≡ 0 (mod 7).', 'Ese es el inverso aditivo; el multiplicativo cumple a·x ≡ 1.'],
        ['1/3, porque el inverso de un número es su recíproco.', 'En ℤ₇ solo hay enteros 0 a 6; el inverso es uno de ellos.'],
        ['No existe, porque 7 no es múltiplo de 3.', 'Justo al revés: existe porque mcd(3, 7) = 1.'],
      ],
      explanation: 'Prueba 3·x para x = 1…6: 3, 6, 2, 5, 1, 4. El 1 aparece con x = 5.',
    },
    {
      prompt: 'En RSA con n = p·q, ¿qué hace difícil obtener la clave privada a partir de la pública?',
      correct: 'Que calcular φ(n) exige conocer p y q, es decir, factorizar n.',
      wrong: [
        ['Que el exponente público e es secreto y solo lo conoce el receptor.', 'e es público por diseño; lo secreto es d, que se deduce de φ(n).'],
        ['Que la exponenciación modular no puede calcularse rápido sin clave.', 'Exponenciar módulo n es rápido (cuadrados repetidos); cifrar es fácil para todos.'],
        ['Que n es un primo muy grande del que nadie conoce ningún divisor.', 'n es compuesto (p·q); si fuera primo, φ(n) = n − 1 sería trivial.'],
      ],
      explanation: 'd es el inverso de e módulo φ(n). Con p y q se calcula al instante; sin ellos hay que factorizar n, lo que no se sabe hacer eficientemente para n grandes.',
    },
  ],
  M11: [
    {
      prompt: '¿Cuántas contraseñas de 4 dígitos (0 a 9) hay si se permite repetir?',
      correct: '10⁴ = 10 000: cuatro posiciones con diez opciones cada una.',
      wrong: [
        ['C(10, 4) = 210: se eligen cuatro dígitos sin importar el orden.', 'En una contraseña el orden importa y se puede repetir: 1234 no es 4321.'],
        ['10·9·8·7 = 5040: no se puede repetir ningún dígito.', 'Eso es sin repetición; aquí 1111 también vale.'],
        ['4¹⁰: cada uno de los diez dígitos elige una de cuatro posiciones.', 'Invertiste base y exponente: cada posición elige un dígito.'],
      ],
      explanation: 'Principio del producto: 10 · 10 · 10 · 10 = 10⁴ = 10 000.',
    },
    {
      prompt: 'En un grupo de 13 personas, ¿por qué al menos dos nacieron el mismo mes?',
      correct: 'Porque hay 12 meses: 13 personas en 12 cajas obligan a repetir una caja.',
      wrong: [
        ['Porque con más de 12 personas la probabilidad de coincidir supera el 50 %.', 'Aquí no es probable, es seguro: no hace falta probabilidad.'],
        ['Porque los cumpleaños se concentran en ciertos meses del año.', 'El argumento no depende de cómo se repartan; vale para cualquier reparto.'],
        ['Porque 13 es primo y no puede repartirse en partes iguales.', 'La primalidad no influye; con 14 o 20 personas pasa lo mismo.'],
      ],
      explanation: 'Palomar: n + 1 objetos en n cajas fuerzan una caja con al menos dos objetos.',
    },
  ],
  M12: [
    {
      prompt: 'Un árbol tiene 10 vértices. ¿Cuántas aristas tiene?',
      correct: '9, porque un árbol con V vértices tiene siempre V − 1 aristas.',
      wrong: [
        ['10, porque cada vértice aporta exactamente una arista propia.', 'La raíz no necesita arista hacia arriba: sobra una.'],
        ['45, porque hay una arista por cada par de vértices.', 'Ese es el grafo completo, lleno de ciclos; un árbol no tiene ninguno.'],
        ['Depende de su forma, porque un árbol puede tener cualquier número.', 'Conexo y sin ciclos fija el número: cambia la forma, no la cuenta.'],
      ],
      explanation: 'Añadir un vértice a un árbol exige exactamente una arista nueva para conectarlo sin cerrar ciclos: de 1 vértice y 0 aristas se llega a V y V − 1.',
    },
    {
      prompt: '¿Cuándo tiene un grafo dirigido un orden topológico?',
      correct: 'Exactamente cuando no tiene ciclos dirigidos (es un DAG).',
      wrong: [
        ['Siempre que sea conexo, aunque contenga ciclos dirigidos.', 'En un ciclo A → B → A, ninguno de los dos puede ir antes que el otro.'],
        ['Solo cuando es un árbol con una única raíz de la que cuelgan los demás.', 'Muchos DAG no son árboles (un nodo puede tener varios padres) y sí tienen orden.'],
        ['Cuando todas sus aristas tienen el mismo peso positivo.', 'Los pesos no intervienen: el orden depende solo de la dirección de las aristas.'],
      ],
      explanation: 'Sin ciclos siempre existe un nodo sin aristas entrantes; se coloca primero, se quita, y se repite (algoritmo de Kahn).',
    },
  ],
  M13: [
    {
      prompt: '¿Cuánto vale el límite de sen(x)/x cuando x tiende a 0?',
      correct: '1, porque cerca de 0 se cumple que sen x ≈ x.',
      wrong: [
        ['0, porque el numerador sen(0) vale 0 y anula el cociente.', 'El denominador también tiende a 0; hay que comparar a qué ritmo lo hacen.'],
        ['No existe, porque la expresión 0/0 no tiene ningún sentido.', '0/0 es indeterminado, no imposible: el límite puede existir aunque f(0) no.'],
        ['∞, porque dividir por un número muy pequeño da algo enorme.', 'El numerador también es pequeño: ambos se encogen juntos.'],
      ],
      explanation: 'Para x pequeño, sen x y x casi coinciden (la recta tangente a sen en 0 es y = x), así que su cociente tiende a 1.',
    },
    {
      prompt: '¿Cuándo es continua una función f en un punto a?',
      correct: 'Cuando f(a) existe y coincide con el límite de f(x) cuando x → a.',
      wrong: [
        ['Cuando f(a) existe, aunque el límite en a sea un valor distinto.', 'Si el límite y f(a) difieren, hay un salto o un punto desplazado.'],
        ['Cuando el límite en a existe, aunque f(a) no esté definida.', 'Eso es una discontinuidad removible: falta el valor en el punto.'],
        ['Cuando la gráfica no tiene picos ni esquinas cerca de a.', 'Las esquinas tienen que ver con la derivada: |x| es continua con un pico en 0.'],
      ],
      explanation: 'Continuidad en a = tres cosas: f(a) existe, el límite existe, y son iguales.',
    },
  ],
  M14: [
    {
      prompt: 'Si h(x) = sen(x²), ¿cuánto vale h′(x)?',
      correct: '2x·cos(x²): la derivada de fuera, en x², por la derivada de dentro.',
      wrong: [
        ['cos(x²): basta con derivar la función exterior.', 'Falta multiplicar por cómo cambia el argumento x²: regla de la cadena.'],
        ['cos(2x): se deriva primero el argumento y después se aplica el coseno.', 'La derivada interior multiplica; no sustituye al argumento.'],
        ['2x·sen(x²): se multiplica por la derivada interior sin derivar el seno.', 'La función exterior también se deriva: sen pasa a cos.'],
      ],
      explanation: 'Regla de la cadena: (f∘g)′(x) = f′(g(x))·g′(x) = cos(x²)·2x.',
    },
    {
      prompt: 'Si f′(c) = 0 en un punto c, ¿qué se puede asegurar?',
      correct: 'Que la tangente es horizontal, sin decidir si hay máximo, mínimo o ninguno.',
      wrong: [
        ['Que c es un mínimo local, porque la pendiente solo se anula en el fondo de un valle.', 'También se anula en las cimas; y en x³ no hay ni fondo ni cima.'],
        ['Que c es un máximo local, porque la función deja de crecer.', 'Dejar de crecer un instante no implica empezar a bajar: mira x³.'],
        ['Que f es constante en todo un intervalo alrededor de c.', 'f′ = 0 en un solo punto no dice nada de los puntos cercanos.'],
      ],
      explanation: 'f′(c) = 0 es necesario para un extremo interior, no suficiente. Hay que mirar el cambio de signo de f′ o la segunda derivada.',
    },
  ],
  M15: [
    {
      prompt: 'Al aumentar el número n de rectángulos de una suma de Riemann de una función continua en [a, b], ¿qué ocurre?',
      correct: 'La suma se acerca al valor de la integral definida de a a b.',
      wrong: [
        ['La suma crece sin límite porque se agregan más rectángulos.', 'Más rectángulos, pero cada uno más estrecho: el total se estabiliza.'],
        ['La suma se acerca a cero porque cada rectángulo es más delgado.', 'Cada uno se adelgaza, pero hay más: lo que importa es el área total.'],
        ['La suma no cambia, porque el área total ya estaba fijada.', 'Con pocos rectángulos hay error; al refinar, ese error se reduce.'],
      ],
      explanation: 'Para f continua, las sumas de Riemann convergen a ∫ₐᵇ f(x) dx cuando el ancho máximo de los rectángulos tiende a 0.',
    },
    {
      prompt: '¿Cuánto vale la integral de 3x² entre 0 y 2?',
      correct: '8, porque una antiderivada es x³ y 2³ − 0³ = 8.',
      wrong: [
        ['12, porque se evalúa la derivada 6x en el extremo x = 2.', 'Integrar no es derivar: busca una función cuya derivada sea 3x².'],
        ['24, porque se evalúa 3x² en x = 2 y se multiplica por el ancho.', 'Eso supone altura constante 12; la curva es más baja en casi todo el intervalo.'],
        ['0, porque el área bajo una parábola centrada en cero se cancela.', '3x² es positiva en todo [0, 2]: no hay nada que se cancele.'],
      ],
      explanation: 'Teorema fundamental: ∫₀² 3x² dx = [x³]₀² = 8 − 0 = 8.',
    },
  ],
  M16: [
    {
      prompt: '¿Converge la serie armónica 1 + 1/2 + 1/3 + 1/4 + ⋯?',
      correct: 'No: aunque sus términos tienden a 0, la suma crece sin cota.',
      wrong: [
        ['Sí: sus términos tienden a cero, y eso ya basta para que la suma converja.', 'Que los términos tiendan a 0 es necesario, no suficiente.'],
        ['Sí: converge a 2, igual que la serie 1 + 1/2 + 1/4 + ⋯', 'Esa es geométrica; la armónica decrece mucho más despacio.'],
        ['No: porque sus términos crecen a partir de cierto n.', 'Sus términos siempre decrecen; diverge por otro motivo.'],
      ],
      explanation: 'Agrupando: 1/3 + 1/4 > 1/2, 1/5 + ⋯ + 1/8 > 1/2, … se suman infinitos bloques mayores que 1/2.',
    },
    {
      prompt: '¿Qué polinomio de Taylor de grado 2 aproxima eˣ cerca de 0?',
      correct: '1 + x + x²/2, porque todas las derivadas de eˣ valen 1 en x = 0.',
      wrong: [
        ['1 + x + x², usando la segunda derivada sin dividir entre 2!.', 'El término de grado k lleva f⁽ᵏ⁾(0)/k!; falta dividir entre 2.'],
        ['x + x²/2, porque el término constante de eˣ en 0 es cero.', 'e⁰ = 1, no 0: el término constante es 1.'],
        ['1 + 2x + x², que es el desarrollo del binomio (1 + x)².', 'Ese polinomio no tiene que ver con eˣ: su derivada en 0 es 2, no 1.'],
      ],
      explanation: 'P₂(x) = f(0) + f′(0)x + f″(0)x²/2! = 1 + x + x²/2.',
    },
  ],
};
