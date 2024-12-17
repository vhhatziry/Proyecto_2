// sintactic_ll1.js

// sintactic_ll1.js

function generarTablaLL1(grammar) {
    grammar.removeLeftRecursion();
    const FIRST = calcularFIRST(grammar);
    const FOLLOW = calcularFOLLOW(grammar, FIRST);

    const table = {};
    // Inicializar estructura para cada no terminal
    for (let nt of grammar.SimbNoTerm) {
        table[nt] = {};
    }

    for (let i = 0; i < grammar.NumReglas; i++) {
        const regla = grammar.Reglas[i]; 
        const A = regla.NombSimb; 
        const alpha = regla.Lista; 
        const firstAlpha = FIRSTdeSecuencia(alpha, FIRST); 

        const epsilonInFirst = firstAlpha.has('ε');

        // Para cada terminal en FIRST(alpha) distinto de ε:
        for (let terminal of firstAlpha) {
            if (terminal !== 'ε') {
                // Usar directamente el nombre del símbolo terminal (sin tokens)
                const colKey = terminal;
                if (table[A][colKey] && table[A][colKey] !== i) {
                    console.warn(`Conflicto en LL(1): ${A}, terminal ${colKey}`);
                }
                table[A][colKey] = i;
            }
        }

        // Si epsilon está en FIRST(alpha), agregar las producciones para cada símbolo en FOLLOW(A)
        if (epsilonInFirst) {
            for (let b of FOLLOW[A]) {
                const colKey = (b === 'FIN') ? 'FIN' : b; 
                if (table[A][colKey] && table[A][colKey] !== i) {
                    console.warn(`Conflicto en LL(1): ${A}, terminal ${colKey}`);
                }
                table[A][colKey] = i;
            }
        }
    }

    return table;
}

function calcularFIRST(grammar) {
    const FIRST = {};

    for (let nt of grammar.SimbNoTerm) {
        FIRST[nt] = new Set();
    }

    let cambio = true;
    while (cambio) {
        cambio = false;
        for (let i = 0; i < grammar.NumReglas; i++) {
            const regla = grammar.Reglas[i];
            const A = regla.NombSimb;
            const alpha = regla.Lista;

            const tamAntes = FIRST[A].size;
            const firstAlpha = FIRSTdeSecuencia(alpha, FIRST);
            for (let x of firstAlpha) {
                FIRST[A].add(x);
            }
            if (FIRST[A].size > tamAntes) {
                cambio = true;
            }
        }
    }

    return FIRST;
}

// Calcula FOLLOW para todos los no terminales de la gramática
function calcularFOLLOW(grammar, FIRST) {
    const FOLLOW = {};
    for (let nt of grammar.SimbNoTerm) {
        FOLLOW[nt] = new Set();
    }

    const start = grammar.Reglas[0].NombSimb;
    FOLLOW[start].add('FIN'); // Marca de fin de entrada

    let cambio = true;
    while (cambio) {
        cambio = false;
        for (let i = 0; i < grammar.NumReglas; i++) {
            const regla = grammar.Reglas[i];
            const A = regla.NombSimb;
            const alpha = regla.Lista;

            for (let index = 0; index < alpha.length; index++) {
                const X = alpha[index];
                if (!X.EsTerminal) {
                    // X es no terminal
                    const beta = alpha.slice(index+1);
                    const firstBeta = FIRSTdeSecuencia(beta, FIRST);
                    const tamAntes = FOLLOW[X.NombSimb].size;

                    // Todo FIRST(beta)\{ε} en FOLLOW(X)
                    for (let t of firstBeta) {
                        if (t !== 'ε') {
                            FOLLOW[X.NombSimb].add(t);
                        }
                    }

                    // Si FIRST(beta) contiene ε, entonces FOLLOW(A) se agrega a FOLLOW(X)
                    if (firstBeta.has('ε') || beta.length === 0) {
                        for (let f of FOLLOW[A]) {
                            FOLLOW[X.NombSimb].add(f);
                        }
                    }

                    if (FOLLOW[X.NombSimb].size > tamAntes) {
                        cambio = true;
                    }
                }
            }
        }
    }

    return FOLLOW;
}

// Devuelve FIRST(α) para una secuencia α de nodos
function FIRSTdeSecuencia(alpha, FIRST) {
    const result = new Set();
    // α puede estar vacía -> FIRST(ε) = {ε}
    if (alpha.length === 0) {
        result.add('ε');
        return result;
    }

    for (let i = 0; i < alpha.length; i++) {
        const X = alpha[i];
        if (X.EsTerminal) {
            // FIRST(X) = {X.NombSimb}, excepto si X es ε
            result.add(X.NombSimb);
            break;
        } else {
            // X es no terminal
            const firstX = FIRST[X.NombSimb];
            for (let s of firstX) {
                result.add(s);
            }
            if (!firstX.has('ε')) {
                // Si no hay epsilon en FIRST(X), se detiene
                break;
            }
            // Si FIRST(X) tiene ε, seguir con el siguiente símbolo
            if (i === alpha.length - 1) {
                // Al final, si todos tienen ε, agregar ε
                result.add('ε');
            }
        }
    }

    return result;
}

export {generarTablaLL1};