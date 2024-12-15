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
        const regla = grammar.Reglas[i]; // ElemArreglo con NombSimb y Lista
        const A = regla.NombSimb; // No terminal del lado izquierdo
        const alpha = regla.Lista; // Array de Nodos del lado derecho
        const firstAlpha = FIRSTdeSecuencia(alpha, FIRST); 

        const epsilonInFirst = firstAlpha.has('ε');

        for (let terminal of firstAlpha) {
            if (terminal !== 'ε') {
                const tToken = obtenerTokenDeTerminal(grammar, terminal);
                if (table[A][tToken] && table[A][tToken] !== i) {
                    console.warn(`Conflicto en LL(1): ${A}, token ${tToken}`);
                }
                table[A][tToken] = i;
            }
        }

        if (epsilonInFirst) {
            // FIRST(alpha) contiene ε, entonces por cada b en FOLLOW(A)
            for (let b of FOLLOW[A]) {
                const bToken = obtenerTokenDeTerminal(grammar, b, true);
                if (table[A][bToken] && table[A][bToken] !== i) {
                    console.warn(`Conflicto en LL(1): ${A}, token ${bToken}`);
                }
                table[A][bToken] = i;
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

// Devuelve el token correspondiente a un terminal, o el 'FIN' si es FOLLOW y b es 'FIN'
function obtenerTokenDeTerminal(grammar, symbol, esFollow = false) {
    if (symbol === 'ε') {
        // epsilon no se utiliza como entrada en la tabla LL(1), no se necesita token
        return 'ε'; 
    }
    if (symbol === 'FIN' && esFollow) {
        // Indicar el token especial de fin de entrada
        return 'FIN';
    }
    // Si existe en TerminalesTokens
    if (grammar.TerminalesTokens[symbol] !== undefined) {
        return grammar.TerminalesTokens[symbol];
    }
    // Si no está asignado un token, podemos usar el symbol directamente o lanzar advertencia
    console.warn(`No se encontró token asignado al terminal "${symbol}". Usando el lexema como llave.`);
    return symbol;
}

export {generarTablaLL1};