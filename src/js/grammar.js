//grammar.js

import { Nodo, ElemArreglo } from './nodos.js';
import { SimbolosEspeciales } from './analizador_lexico.js';

class Grammar {
    constructor(lexico) {
        this.Lexic = lexico;
        this.Reglas = [];
        this.NumReglas = 0;
        this.SimbNoTerm = new Set(); // conjunto de símbolos no terminales
        this.TerminalesTokens = {}; // { terminal: tokenNumber }
    }

    async parse() {
        const resultado = await this.LlenarArreglo();
        return resultado;
    }

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
                // El usuario escribió "| epsilon"
                let l = [];
                let nodo = new Nodo("ε", true);
                l.push(nodo);

                let e = new ElemArreglo();
                e.NombSimb = SimbIzq;
                e.Lista = l;
                e.EsTerminal = false;
                this.Reglas[this.NumReglas++] = e;

                return this.LadosDerechosPrime(SimbIzq);
            } else {
                // Ni LadoDerecho ni EPSI, error
                return false;
            }
        }

        // epsilon interno
        this.Lexic.undoToken();
        return true; 
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
            l.push(nodo); // Agregamos el símbolo inmediatamente para mantener el orden
            if (this.SimbolosPrime(l)) {
                return true;
            }
            return false;
        }

        // epsilon interno
        this.Lexic.undoToken();
        return true; 
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
            l.push(nodo); // Agregamos inmediatamente el símbolo para mantener el orden
            if (this.SimbolosPrime(l)) {
                return true;
            }
            return false;
        }

        // epsilon interno
        this.Lexic.undoToken();
        return true;
    }

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

    // Método para eliminar la recursión por la izquierda directa en cada no terminal
    removeLeftRecursion() {
        // Agrupar las producciones por no terminal
        const produccionesPorNT = new Map();
        for (let i = 0; i < this.NumReglas; i++) {
            const regla = this.Reglas[i];
            const nt = regla.NombSimb;
            if (!produccionesPorNT.has(nt)) {
                produccionesPorNT.set(nt, []);
            }
            produccionesPorNT.get(nt).push(regla);
        }

        // Limpia las reglas, las volveremos a insertar sin recursión por la izquierda
        this.Reglas = [];
        this.NumReglas = 0;

        for (let [nt, producciones] of produccionesPorNT.entries()) {
            // Separamos las producciones en las que el lado derecho inicia con nt (recursivas)
            // y las que no.
            let recursivas = [];
            let noRecursivas = [];

            for (let regla of producciones) {
                if (regla.Lista.length > 0 && regla.Lista[0].NombSimb === nt && !regla.Lista[0].EsTerminal) {
                    // Producción recursiva: A -> A α
                    recursivas.push(regla);
                } else {
                    // Producción no recursiva: A -> β
                    noRecursivas.push(regla);
                }
            }

            if (recursivas.length === 0) {
                // No hay recursión por la izquierda, dejamos las producciones tal cual
                for (let r of noRecursivas) {
                    this.Reglas.push(r);
                    this.NumReglas++;
                }
            } else {
                // Hay recursión por la izquierda
                // Crear un nuevo no terminal A' (nt')
                let ntPrima = nt + "'"; 
                // Asegurar que ntPrima no exista ya:
                while (this.SimbNoTerm.has(ntPrima)) {
                    ntPrima += "'";
                }
                this.SimbNoTerm.add(ntPrima);

                // Nuevas producciones sin recursión:
                // A -> β1 A' | β2 A' | ...
                for (let reglaNoRec of noRecursivas) {
                    let nuevaProd = new ElemArreglo();
                    nuevaProd.NombSimb = nt;
                    // Lado derecho: β + A'
                    nuevaProd.Lista = [...reglaNoRec.Lista, new Nodo(ntPrima, false)];
                    this.Reglas.push(nuevaProd);
                    this.NumReglas++;
                }

                // A' -> α1 A' | α2 A' | ... | ε
                // Donde cada αi se obtiene quitando el nt inicial de las recursivas
                let algunaRec = false;
                for (let reglaRec of recursivas) {
                    // reglaRec: A -> A α
                    // α es reglaRec.Lista.slice(1)
                    let nuevaProd = new ElemArreglo();
                    nuevaProd.NombSimb = ntPrima;
                    // Lado derecho: α + A'
                    let alfa = reglaRec.Lista.slice(1);
                    alfa.push(new Nodo(ntPrima, false));
                    nuevaProd.Lista = alfa;
                    this.Reglas.push(nuevaProd);
                    this.NumReglas++;
                    algunaRec = true;
                }

                // Agregar la producción epsilon para A'
                // A' -> ε
                let epsilonProd = new ElemArreglo();
                epsilonProd.NombSimb = ntPrima;
                epsilonProd.Lista = [new Nodo("ε", true)];
                this.Reglas.push(epsilonProd);
                this.NumReglas++;
            }
        }
    }
}

export { Grammar };