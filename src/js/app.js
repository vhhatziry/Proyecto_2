class AnalizadorLexico {
    constructor(sigma = "", matrizTransicionAFD = null) {
        this.token = -1;
        this.EdoActual = 0;
        this.EdoTransicion = 0;
        this.CadenaSigma = sigma;
        this.Lexema = "";
        this.PasoPorEdoAcept = false;
        this.IniLexema = 0;
        this.FinLexema = -1;
        this.IndiceCaracterActual = 0;
        this.CaracterActual = '';
        this.Pila = [];
        this.matrizTransicionAFD = matrizTransicionAFD;
    }

    getEstadoAnalizadorLexico() {
        return {
            CaracterActual: this.CaracterActual,
            EdoActual: this.EdoActual,
            EdoTransicion: this.EdoTransicion,
            FinLexema: this.FinLexema,
            IndiceCaracterActual: this.IndiceCaracterActual,
            IniLexema: this.IniLexema,
            Lexema: this.Lexema,
            PasoPorEdoAcept: this.PasoPorEdoAcept,
            token: this.token,
            Pila: [...this.Pila]
        };
    }

    setEstadoAnalizadorLexico(estado) {
        this.CaracterActual = estado.CaracterActual;
        this.EdoActual = estado.EdoActual;
        this.EdoTransicion = estado.EdoTransicion;
        this.FinLexema = estado.FinLexema;
        this.IndiceCaracterActual = estado.IndiceCaracterActual;
        this.IniLexema = estado.IniLexema;
        this.Lexema = estado.Lexema;
        this.PasoPorEdoAcept = estado.PasoPorEdoAcept;
        this.token = estado.token;
        this.Pila = [...estado.Pila];
        return true;
    }

    setSigma(sigma) {
        this.CadenaSigma = sigma;
        this.PasoPorEdoAcept = false;
        this.IniLexema = 0;
        this.FinLexema = -1;
        this.IndiceCaracterActual = 0;
        this.token = -1;
        this.Pila = [];
    }

    getLexema() {
        return this.Lexema;
    }

    getIndiceCaracterActual() {
        return this.IndiceCaracterActual;
    }

    cadenaXAnalizar() {
        return this.CadenaSigma.substring(this.IndiceCaracterActual);
    }

    getEstadoActual() {
        return this.EdoActual;
    }

    getTamSigma() {
        return this.CadenaSigma.length;
    }

    getIniLexema() {
        return this.IniLexema;
    }

    getLongLexema() {
        return this.Lexema.length;
    }

    yylex() {
        while (true) {
            this.Pila.push(this.IndiceCaracterActual);
            if (this.IndiceCaracterActual >= this.CadenaSigma.length) {
                this.Lexema = "";
                return SimbolosEspeciales.FIN;
            }
            this.IniLexema = this.IndiceCaracterActual;
            this.EdoActual = 0;
            this.PasoPorEdoAcept = false;
            this.FinLexema = -1;
            this.token = -1;
    
            while (this.IndiceCaracterActual < this.CadenaSigma.length) {
                this.CaracterActual = this.CadenaSigma[this.IndiceCaracterActual];
                const charCode = this.CadenaSigma.charCodeAt(this.IndiceCaracterActual);
    
                const columnaTransicion = charCode + 1; // Ajuste del índice de columna
    
                // Verificar si existe una transición desde el estado actual con el carácter actual
                if (this.matrizTransicionAFD[this.EdoActual][columnaTransicion] !== -1 && this.matrizTransicionAFD[this.EdoActual][columnaTransicion] !== undefined) {
                    this.EdoTransicion = this.matrizTransicionAFD[this.EdoActual][columnaTransicion];
    
                    // Verificar si el estado de transición es estado de aceptación
                    const indiceToken = 257; // Índice del token (columna 257)
                    if (this.matrizTransicionAFD[this.EdoTransicion][indiceToken] !== -1 && this.matrizTransicionAFD[this.EdoTransicion][indiceToken] !== undefined) {
                        this.PasoPorEdoAcept = true;
                        this.token = this.matrizTransicionAFD[this.EdoTransicion][indiceToken];
                        this.FinLexema = this.IndiceCaracterActual;
                    }
    
                    this.IndiceCaracterActual++;
                    this.EdoActual = this.EdoTransicion;
                } else {
                    break;
                }
            }
    
            if (!this.PasoPorEdoAcept) {
                // No se encontró un estado de aceptación, error léxico
                this.IndiceCaracterActual = this.IniLexema + 1;
                this.Lexema = this.CadenaSigma.substring(this.IniLexema, this.IndiceCaracterActual);
                this.token = SimbolosEspeciales.ERROR;
                return this.token;
            }
    
            // Construir el lexema reconocido
            this.Lexema = this.CadenaSigma.substring(this.IniLexema, this.FinLexema + 1);
            this.IndiceCaracterActual = this.FinLexema + 1;
    
            if (this.token === SimbolosEspeciales.OMITIR) {
                // Si el token es de tipo OMITIR, reiniciar y continuar
                continue;
            } else {
                return this.token;
            }
        }
    }
    
    
    

    undoToken() {
        if (this.Pila.length === 0) return false;
        this.IndiceCaracterActual = this.Pila.pop();
        return true;
    }
}

// Definición de símbolos especiales
const SimbolosEspeciales = {
    FIN: 0,
    ERROR: -2,
    OMITIR: 10000
};


async function cargarAutomataGramaticas() {
    // Evitar cargar la matriz más de una vez
    if (window.gramaticaAutomata) {
        return window.gramaticaAutomata;
    }

    try {
        const response = await fetch('build/utils/matriz.txt');
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo: ${response.statusText}`);
        }
        const contenido = await response.text();

        // Parsear el contenido del archivo para obtener la matriz
        const matrizTransicionAFD = parseAFDFile(contenido);

        window.gramaticaAutomata = matrizTransicionAFD;
        return matrizTransicionAFD;
    } catch (error) {
        console.error('Error al cargar el autómata de gramáticas:', error);
        throw error;
    }
}

// Función genérica para parsear el contenido a una matriz (ya utilizado en tus ejemplos previos)
function parseAFDFile(contenido) {
    const lines = contenido.split('\n').filter(line => line.trim() !== '');
    const matrizTransicionAFD = [];

    for (let i = 0; i < lines.length; i++) {
        const valoresFila = lines[i].split(',');

        // Suponiendo que cada fila debe tener 258 columnas (0-256 transiciones, 257 token)
        if (valoresFila.length !== 258) {
            throw new Error(`La línea ${i + 1} no tiene 258 columnas.`);
        }

        const fila = valoresFila.map(valor => parseInt(valor.trim()));
        if (fila.some(v => isNaN(v))) {
            throw new Error(`Valores inválidos en la línea ${i + 1}.`);
        }

        matrizTransicionAFD.push(fila);
    }

    return matrizTransicionAFD;
}

async function instanciarAnalizadorLexicoGramaticas(cadena) {
    try {
        const matriz = await cargarAutomataGramaticas();
        const analizador = new AnalizadorLexico(cadena, matriz);
        return analizador;
    } catch (error) {
        console.error('No se pudo instanciar el analizador léxico de gramáticas:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const cadenaPrueba =    "<G> -> <Reglas>; epsilon" +
                            "<Reglas> -> <Regla> <SEMICOLON> <ReglasP>;" +
                            "<ReglasP> -> <Regla> <SEMICOLON> <ReglasP> | <epsilon>;" +
                            "<Regla> -> <LadoIzq> <flecha> <LadosDerechos>;" +
                            "<LadoIzq> -> <SIMBOLO>;" +
                            "<LadosDerechos> -> <LadoDerecho> <LadosDerechosP>;" +
                            "<LadosDerechosP> -> <OR> <LadoDerecho> <LadosDerechosP> | <epsilon>;" +
                            "<LadoDerecho> -> <Simbolos>;" +
                            "<Simbolos> -> <SIMBOLO> <SimbolosP>;" +
                            "<SimbolosP> -> <SIMBOLO> <SimbolosP> | <epsilon>;"
    const analizadorLexico = await instanciarAnalizadorLexicoGramaticas(cadenaPrueba);

    if (analizadorLexico) {
        let token;
        while ((token = analizadorLexico.yylex()) !== 0 && token !== SimbolosEspeciales.ERROR) {
            console.log("Token:", token, "Lexema:", analizadorLexico.getLexema());
        }
        if (token === 0) {
            console.log("Fin de entrada.");
        } else {
            console.error("Error léxico en:", analizadorLexico.getLexema());
        }
    }
});
class Nodo {
    constructor(nombSimb, esTerminal = false) {
        this.NombSimb = nombSimb;
        this.EsTerminal = esTerminal;
    }
}

class ElemArreglo {
    constructor() {
        this.NombSimb = "";
        this.Lista = []; // Array de Nodos
        this.EsTerminal = false;
    }
}

class Grammar {
    constructor(lexico) {
        this.Lexic = lexico;
        this.Reglas = [];
        this.NumReglas = 0;
        this.SimbNoTerm = new Set(); // conjunto de no terminales
    }

    async parse() {
        const resultado = await this.LlenarArreglo();
        return resultado;
    }

    // LlenarArreglo -> G # luego verifica FIN
    async LlenarArreglo() {
        if (this.G()) {
            let token = this.Lexic.yylex();
            if (token === 0) { // END
                this.updateNodos();
                return true;
            }
        }
        return false;
    }

    // G -> Reglas
    G() {
        return this.Reglas_();
    }

    // Reglas -> Regla; Reglas'
    Reglas_() {
        if (this.Regla()) {
            let t = this.Lexic.yylex();
            if (t === 50) { // SEMICOLON
                return this.ReglasPrime();
            }
        }
        return false;
    }

    // Reglas' -> Regla; Reglas' | ε
    ReglasPrime() {
        let t = this.Lexic.yylex();
        if (t === 0) {
            // FIN de entrada
            this.Lexic.undoToken();
            return true; // ε interno
        }

        if (t === 40) { // SIMBOLO
            // posible inicio de otra Regla
            this.Lexic.undoToken();
            if (this.Regla()) {
                let t2 = this.Lexic.yylex();
                if (t2 === 50) { // ";"
                    return this.ReglasPrime();
                }
                return false;
            }
            return false;
        }

        // Si no es símbolo ni fin, regresar token y aceptar epsilon interno
        this.Lexic.undoToken();
        return true; // ε interno
    }

    // Regla -> LadoIzq FLECHA LadosDerechos
    Regla() {
        let simbIzq = { value: "" };
        if (this.LadoIzq(simbIzq)) {
            let t = this.Lexic.yylex();
            if (t === 20) { // FLECHA
                return this.LadosDerechos(simbIzq.value);
            }
        }
        return false;
    }

    // LadoIzq -> SIMBOLO
    LadoIzq(refObj) {
        let t = this.Lexic.yylex();
        if (t === 40) {
            let lex = this.Lexic.getLexema();
            if (lex.startsWith("<") && lex.endsWith(">")) {
                lex = lex.substring(1, lex.length - 1);
            }
            refObj.value = lex;
            this.SimbNoTerm.add(lex); 
            return true;
        }
        return false;
    }

    // LadosDerechos -> LadoDerecho LadosDerechos'
    LadosDerechos(SimbIzq) {
        let l = [];
        if (this.LadoDerecho(l)) {
            let e = new ElemArreglo();
            e.NombSimb = SimbIzq;
            e.Lista = l;
            e.EsTerminal = false;
            this.Reglas[this.NumReglas++] = e;
            return this.LadosDerechosPrime(SimbIzq);
        }
        return false;
    }

    // LadosDerechos' -> OR LadoDerecho LadosDerechos' | OR EPSI | ε
    LadosDerechosPrime(SimbIzq) {
        let t = this.Lexic.yylex();
        if (t === 30) { // OR
            // Después de OR pueden pasar dos cosas: LadoDerecho ... o EPSI
            let t2 = this.Lexic.yylex();
            if (t2 === 40) {
                // Es un SIMBOLO, volver atrás para que LadoDerecho lo procese
                this.Lexic.undoToken();
                let l = [];
                if (this.LadoDerecho(l)) {
                    let e = new ElemArreglo();
                    e.NombSimb = SimbIzq;
                    e.Lista = l;
                    e.EsTerminal = false;
                    this.Reglas[this.NumReglas++] = e;
                    return this.LadosDerechosPrime(SimbIzq);
                }
                return false;
            } else if (t2 === 10) { 
                // OR EPSI
                // Aquí el usuario escribió "| epsilon"
                // Creamos una regla que representa la producción vacía explícita del usuario
                let l = [];
                // Creamos un nodo para EPSI
                let nodo = new Nodo("ε", true); // El usuario verá este epsilon como terminal
                l.push(nodo);

                let e = new ElemArreglo();
                e.NombSimb = SimbIzq;
                e.Lista = l;
                e.EsTerminal = false;
                this.Reglas[this.NumReglas++] = e;

                // Después de OR EPSI ya no hay más LadosDerechos'
                // pero la producción dice volver a LadosDerechosPrime (por si hay más OR)
                return this.LadosDerechosPrime(SimbIzq);
            } else {
                // Ni LadoDerecho ni EPSI, error
                return false;
            }
        }

        // Si no hay OR, deshacer token y aceptar epsilon interno
        this.Lexic.undoToken();
        return true; // ε interno
    }

    // LadoDerecho -> Simbolos
    LadoDerecho(l) {
        return this.Simbolos(l);
    }

    // Simbolos -> SIMBOLO Simbolos' | ε
    Simbolos(l) {
        let t = this.Lexic.yylex();
        if (t === 40) {
            // SIMBOLO
            let simb = this.Lexic.getLexema();
            if (simb.startsWith("<") && simb.endsWith(">")) {
                simb = simb.substring(1, simb.length - 1);
            }
            let nodo = new Nodo(simb, false);
            if (this.SimbolosPrime(l)) {
                l.push(nodo);
                return true;
            }
            return false;
        }

        // Si no es SIMBOLO, epsilon interno
        this.Lexic.undoToken();
        return true; // ε interno
    }

    // Simbolos' -> SIMBOLO Simbolos' | ε
    SimbolosPrime(l) {
        let t = this.Lexic.yylex();
        if (t === 40) {
            let simb = this.Lexic.getLexema();
            if (simb.startsWith("<") && simb.endsWith(">")) {
                simb = simb.substring(1, simb.length - 1);
            }
            let nodo = new Nodo(simb, false);
            if (this.SimbolosPrime(l)) {
                l.push(nodo);
                return true;
            }
            return false;
        }

        // epsilon interno
        this.Lexic.undoToken();
        return true;
    }

    // updateNodos: determina cuáles nodos son terminales
    updateNodos() {
        for (let i = 0; i < this.NumReglas; i++) {
            for (let k of this.Reglas[i].Lista) {
                if (!this.SimbNoTerm.has(k.NombSimb)) {
                    k.EsTerminal = true;
                } else {
                    k.EsTerminal = false;
                }
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const cadenaPrueba =    "<G> -> <Reglas>;" +
                            "<Reglas> -> <Regla> <SEMICOLON> <ReglasP>;" +
                            "<ReglasP> -> <Regla> <SEMICOLON> <ReglasP> | <hola>;" +
                            "<Regla> -> <LadoIzq> <flecha> <LadosDerechos>;" +
                            "<LadoIzq> -> <SIMBOLO>;" +
                            "<LadosDerechos> -> <LadoDerecho> <LadosDerechosP>;" +
                            "<LadosDerechosP> -> <OR> <LadoDerecho> <LadosDerechosP> | <hola>;" +
                            "<LadoDerecho> -> <Simbolos>;" +
                            "<Simbolos> -> <SIMBOLO> <SimbolosP>;" +
                            "<SimbolosP> -> <SIMBOLO> <SimbolosP> | epsilon;"
                            ;
    const analizadorLexico = await instanciarAnalizadorLexicoGramaticas(cadenaPrueba);

    if (analizadorLexico) {
        const grammar = new Grammar(analizadorLexico);
        const resultado = await grammar.parse();
        if (resultado) {
            console.log("Gramática analizada correctamente.");
            console.log("Número de reglas:", grammar.NumReglas);
            for (let i = 0; i < grammar.NumReglas; i++) {
                const regla = grammar.Reglas[i];
                const ladoDerecho = regla.Lista.map(n => n.NombSimb + (n.EsTerminal ? "(T)" : "(NT)")).join(" ");
                console.log(`${regla.NombSimb} -> ${ladoDerecho}`);
            }
        } else {
            console.error("Error al analizar la gramática.");
        }
    } else {
        console.error("No se pudo instanciar el analizador léxico.");
    }
});
