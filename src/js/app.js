// app.js

import { instanciarAnalizadorLexicoGramaticas, parseAFDFile } from './parser_utils.js';
import { Grammar } from './grammar.js';
import { AnalizadorLexico, SimbolosEspeciales } from './analizador_lexico.js';
import { leerArchivo } from './file_utils.js';
import { agregarFilaLexResults, limpiarTablasSimbolos } from './dom_utils.js';
import { generarTablaLL1 } from './sintactic_ll1.js';

const appState = {
    userAutomata: null,
    userLexAnalyzer: null,
    currentGrammar: null,
    grammarUpdateTimeout: null,
    currentMode: 'lex', // 'lex' o 'sintact'
    ll1Table: null
};

document.querySelectorAll('.info__sections__select input').forEach(input => {
    input.addEventListener('click', () => {
      document.querySelector('.result').scrollIntoView({ behavior: 'smooth' });
    });
  });  

document.addEventListener('DOMContentLoaded', async () => {
    const matrizInput = document.getElementById('matrizInput');
    const cargarAFDButton = document.getElementById('cargarAFD');
    const testLexButton = document.getElementById('testLex');
    const lexResultsTable = document.getElementById('lexResults');
    const grammarText = document.getElementById('grammarText');
    const asignarTokensBtn = document.getElementById('asignarTokens');
    const crearTablaLL1Btn = document.getElementById('crearTablaLL1');

    const analizLexRadio = document.getElementById('analizlex');
    const analizSintactRadio = document.getElementById('analizsintact');

    const lexSection = document.getElementById('lex');
    const sintactSection = document.getElementById('sintact');

    testLexButton.disabled = true;

    // Por defecto análisis léxico
    lexSection.style.display = 'block';
    sintactSection.style.display = 'none';
    testLexButton.textContent = "Analizar Léxicamente";
    appState.currentMode = 'lex';

    analizLexRadio.addEventListener('change', () => {
        if (analizLexRadio.checked) {
            lexSection.style.display = 'block';
            sintactSection.style.display = 'none';
            testLexButton.textContent = "Analizar Léxicamente";
            appState.currentMode = 'lex';
        }
    });

    analizSintactRadio.addEventListener('change', () => {
        if (analizSintactRadio.checked) {
            lexSection.style.display = 'none';
            sintactSection.style.display = 'block';
            testLexButton.textContent = "Analizar Sintácticamente";
            appState.currentMode = 'sintact';
        }
    });

    cargarAFDButton.addEventListener('click', () => {
        matrizInput.click(); 
    
        // Esperar a que el archivo se seleccione
        matrizInput.addEventListener('change', () => {
            // Aquí el archivo ya se ha cargado
            alert("AFD Cargado");
        });
    });

    matrizInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const contenido = await leerArchivo(file);
            appState.userAutomata = parseAFDFile(contenido);
            appState.userLexAnalyzer = new AnalizadorLexico('', appState.userAutomata);
            console.log('Autómata cargado exitosamente.');
            testLexButton.disabled = false; 
        } catch (error) {
            console.error('Error al cargar el autómata:', error);
            alert('Error al cargar el autómata. Ver consola para detalles.');
        }
    });

    testLexButton.addEventListener('click', () => {
        const sigma = document.getElementById('sigma').value.trim();

        if (appState.currentMode === 'lex') {
            if (!appState.userLexAnalyzer) {
                alert('Primero carga el AFD.');
                return;
            }

            lexResultsTable.innerHTML = '';
            appState.userLexAnalyzer.setSigma(sigma);

            let token;
            while ((token = appState.userLexAnalyzer.yylex()) !== 0 && token !== SimbolosEspeciales.ERROR) {
                const lexema = appState.userLexAnalyzer.getLexema();
                agregarFilaLexResults(lexResultsTable, lexema, token);
            }

            if (token === 0) {
                console.log("Fin de entrada (análisis usuario).");
                agregarFilaLexResults(lexResultsTable, 'FIN', '0');
            } else if (token === SimbolosEspeciales.ERROR) {
                agregarFilaLexResults(lexResultsTable, appState.userLexAnalyzer.getLexema(), 'ERROR');
            }
        } else {
            // Modo sintáctico
            if (!appState.userLexAnalyzer) {
                alert("No se ha cargado el AFD.");
                return;
            }
            if (!appState.ll1Table || !appState.currentGrammar) {
                alert("No se ha generado la tabla LL1. Por favor genera la tabla LL1 primero.");
                return;
            }

            const sintactTable = document.querySelector('#sintact .result__table');
            sintactTable.innerHTML = '';

            const steps = analizarSintacticamente(sigma, appState.currentGrammar, appState.ll1Table, appState.userAutomata);

            const header = sintactTable.insertRow();
            let h1 = header.insertCell(); h1.textContent = "Pila";
            let h2 = header.insertCell(); h2.textContent = "Sigma";
            let h3 = header.insertCell(); h3.textContent = "Operación";

            for (let step of steps) {
                const row = sintactTable.insertRow();
                let c1 = row.insertCell(); c1.textContent = step.stack;
                let c2 = row.insertCell(); c2.textContent = step.input;
                let c3 = row.insertCell(); c3.textContent = step.operation;
            }
        }
    });

    grammarText.addEventListener('input', () => {
        if (appState.grammarUpdateTimeout) clearTimeout(appState.grammarUpdateTimeout);
        appState.grammarUpdateTimeout = setTimeout(() => {
            actualizarGrammarDesdeTexto();
        }, 500);
    });

    asignarTokensBtn.addEventListener('click', () => {
        if (!appState.currentGrammar) {
            console.warn('No hay una gramática parseada actualmente.');
            return;
        }

        const term = document.getElementById('term');
        for (let i = 0; i < term.rows.length; i++) {
            const row = term.rows[i];
            const simboloTerminal = row.cells[0].textContent;
            const tokenInput = row.cells[1].querySelector('input[type="text"]');
            const tokenVal = tokenInput.value.trim();

            if (tokenVal !== '' && !isNaN(tokenVal)) {
                appState.currentGrammar.TerminalesTokens[simboloTerminal] = parseInt(tokenVal, 10);
            } else {
                delete appState.currentGrammar.TerminalesTokens[simboloTerminal];
            }
        }

        console.log("Asignaciones de tokens a terminales:");
        for (let [sym, tok] of Object.entries(appState.currentGrammar.TerminalesTokens)) {
            console.log(sym, "->", tok);
        }
        alert("Tokens asignados");
        
    });

    crearTablaLL1Btn.addEventListener('click', () => {
        if (!appState.currentGrammar) {
            alert("No hay una gramática parseada. Por favor, escribe una gramática válida.");
            return;
        }

        const terminalesSinToken = obtenerTerminalesSinToken(appState.currentGrammar);
        if (terminalesSinToken.length > 0) {
            alert("Los siguientes terminales no tienen token asignado: " + terminalesSinToken.join(", "));
            return;
        }

        if (!appState.userAutomata) {
            alert("No se ha cargado el archivo de la matriz de transición AFD.");
            return;
        }

        appState.currentGrammar.removeLeftRecursion();
        appState.ll1Table = generarTablaLL1(appState.currentGrammar);

        console.log("Tabla LL1 generada:");
        console.log(appState.ll1Table);
        mostrarTablaLL1EnInterfaz(appState.ll1Table);
        alert("Tabla LL1 generada con éxito. Revisa la sección de resultados para verla.Y despues seleccione una forma de análisis.");
        document.querySelector('.table-results').scrollIntoView({ behavior: 'smooth' });
    });
});

async function actualizarGrammarDesdeTexto() {
    const grammarText = document.getElementById('grammarText').value.trim();

    if (grammarText === "") {
        limpiarTablasSimbolos();
        return;
    }

    const analizadorLexico = await instanciarAnalizadorLexicoGramaticas(grammarText);
    if (!analizadorLexico) {
        limpiarTablasSimbolos();
        return;
    }

    const grammar = new Grammar(analizadorLexico);
    const resultado = await grammar.parse();
    if (!resultado) {
        limpiarTablasSimbolos();
        return;
    }

    actualizarTablasDeSimbolos(grammar);
}

function actualizarTablasDeSimbolos(grammar) {
    grammar.updateNodos();

    appState.currentGrammar = grammar;

    const noterm = document.getElementById('noterm');
    const term = document.getElementById('term');

    noterm.innerHTML = '';
    term.innerHTML = '';

    const noTerminales = new Set(grammar.SimbNoTerm);
    const terminales = new Set();

    for (let i = 0; i < grammar.NumReglas; i++) {
        for (let nodo of grammar.Reglas[i].Lista) {
            if (nodo.EsTerminal && nodo.NombSimb !== 'ε') {
                terminales.add(nodo.NombSimb);
            }
        }
    }

    noTerminales.forEach(nt => {
        const row = noterm.insertRow();
        const cell = row.insertCell();
        cell.textContent = nt;
    });

    terminales.forEach(t => {
        const row = term.insertRow();
        const cellSym = row.insertCell();
        cellSym.textContent = t;

        const cellTok = row.insertCell();
        const input = document.createElement('input');
        input.type = 'text';
        input.size = 5;
        input.placeholder = 'Token';

        if (appState.currentGrammar.TerminalesTokens[t]) {
            input.value = appState.currentGrammar.TerminalesTokens[t];
        }
        cellTok.appendChild(input);
    });
}

function obtenerTerminalesSinToken(grammar) {
    const terminales = new Set();
    for (let i = 0; i < grammar.NumReglas; i++) {
        for (let nodo of grammar.Reglas[i].Lista) {
            if (nodo.EsTerminal && nodo.NombSimb !== 'ε') {
                terminales.add(nodo.NombSimb);
            }
        }
    }

    const sinToken = [];
    for (let t of terminales) {
        if (grammar.TerminalesTokens[t] === undefined) {
            sinToken.push(t);
        }
    }

    return sinToken;
}

function mostrarTablaLL1EnInterfaz(table) {
    const tableContainer = document.querySelector('.table-results__table');
    tableContainer.innerHTML = '';

    const grammar = appState.currentGrammar;
    const reglasTexto = grammar.Reglas.map((r, i) => {
        const ladoDerecho = r.Lista.map(n => n.NombSimb).join(" ");
        return r.NombSimb + " -> " + ladoDerecho;
    });

    const noTerminales = Object.keys(table);
    const tokensSet = new Set();

    for (let A of noTerminales) {
        for (let tToken of Object.keys(table[A])) {
            tokensSet.add(tToken);
        }
    }

    const tokens = Array.from(tokensSet);

    const headerRow = tableContainer.insertRow();
    headerRow.classList.add('ll1-header-row');
    let th = headerRow.insertCell();
    th.textContent = 'NT/TOK';
    th.classList.add('ll1-header-cell');

    for (let tok of tokens) {
        const cell = headerRow.insertCell();
        cell.textContent = tok;
        cell.classList.add('ll1-header-cell');
    }

    for (let A of noTerminales) {
        const row = tableContainer.insertRow();
        row.classList.add('ll1-row');
        const cellNT = row.insertCell();
        cellNT.textContent = A;
        cellNT.classList.add('ll1-nonterminal-cell');

        for (let tok of tokens) {
            const cell = row.insertCell();
            cell.classList.add('ll1-cell');
            if (table[A][tok] !== undefined) {
                const reglaIndex = table[A][tok]; 
                cell.textContent = reglasTexto[reglaIndex];
                cell.classList.add('ll1-rule-cell');
            } else {
                cell.textContent = ''; 
                cell.classList.add('ll1-empty-cell');
            }
        }
    }

    const terminales = new Set();
    for (let i = 0; i < grammar.NumReglas; i++) {
        for (let nodo of grammar.Reglas[i].Lista) {
            if (nodo.EsTerminal && nodo.NombSimb !== 'ε') {
                terminales.add(nodo.NombSimb);
            }
        }
    }

    const terminalList = Array.from(terminales);

    const expandDiv = document.querySelector('.table-results__expand');
    expandDiv.innerHTML = '';

    const secondTable = document.createElement('table');
    secondTable.classList.add('table-results__table', 'll1-second-table');
    expandDiv.appendChild(secondTable);

    const secHeader = secondTable.insertRow();
    let secTh = secHeader.insertCell();
    secTh.textContent = "Term/Term";
    secTh.classList.add('ll1-header-cell');

    for (let t1 of terminalList) {
        const cell = secHeader.insertCell();
        cell.textContent = t1;
        cell.classList.add('ll1-header-cell');
    }

    for (let tTop of terminalList) {
        const row = secondTable.insertRow();
        const cellTerm = row.insertCell();
        cellTerm.textContent = tTop;
        cellTerm.classList.add('ll1-terminal-cell');

        for (let tInput of terminalList) {
            const cell = row.insertCell();
            cell.classList.add('ll1-action-cell');
            if (tTop === tInput) {
                cell.textContent = 'pop';
                cell.classList.add('ll1-pop-cell');
            } else {
                cell.textContent = 'error';
                cell.classList.add('ll1-error-cell');
            }
        }
    }
}

function analizarSintacticamente(sigma, grammar, ll1Table, automata) {

    const lexAnalyzer = new AnalizadorLexico(sigma, automata);
    let tokens = [];
    let lexemas = [];
    let tk;
    while ((tk = lexAnalyzer.yylex()) !== 0 && tk !== SimbolosEspeciales.ERROR) {
        tokens.push(tk);
        lexemas.push(lexAnalyzer.getLexema());
    }
    if (tk === SimbolosEspeciales.ERROR) {
        return [{stack:"", input:sigma, operation:"Error léxico"}];
    }

    tokens.push('FIN');
    lexemas.push('$'); // '$' para indicar fin de entrada

    // Pila: poner símbolo inicial
    const startSymbol = grammar.Reglas[0].NombSimb;
    let stack = ['FIN', startSymbol];

    let steps = [];
    let pos = 0; // índice en tokens

    function stackString() {
        // La pila se muestra de arriba hacia abajo, top al final
        return stack.slice().reverse().join(" ");
    }

    function inputString() {
        // Mostrar lexemas desde pos en adelante
        return lexemas.slice(pos).join(" ");
    }

    steps.push({stack: stackString(), input: inputString(), operation: "Iniciar"});

    while (true) {
        let X = stack[stack.length - 1]; // tope
        let a = tokens[pos]; // token actual
        let aLex = lexemas[pos];

        if (X === 'FIN' && a === 'FIN') {
            steps.push({stack: stackString(), input: inputString(), operation: "aceptar"});
            break;
        }

        if (X === 'ε') {
            // desapilar epsilon sin consumir
            stack.pop();
            steps.push({stack: stackString(), input: inputString(), operation:"Desapilar ε"});
            continue;
        }

        if (esTerminal(X, grammar)) {
            if (X === aLex || X === '$' || grammar.TerminalesTokens[X] === a) {
                // Coincide terminal
                stack.pop();
                pos++;
                steps.push({stack: stackString(), input: inputString(), operation:"pop"});
            } else {
                steps.push({stack: stackString(), input: inputString(), operation:"error"});
                break;
            }
        } else {
            // X es no terminal
            let tokenEntrada = a;
            let produccionIndex = ll1Table[X][tokenEntrada];
            if (produccionIndex === undefined) {
                steps.push({stack: stackString(), input: inputString(), operation:"error"});
                break;
            }

            // Desapilar X
            stack.pop();
            const regla = grammar.Reglas[produccionIndex];
            const ladoDer = regla.Lista.map(n => n.NombSimb).join(" ");

            // Apilar en orden normal (izq->der) para que el último simbolo de la producción quede arriba
            for (let i = regla.Lista.length - 1; i >= 0; i--) {
                let simb = regla.Lista[i].NombSimb;
                stack.push(simb);
            }

            steps.push({stack: stackString(), input: inputString(), operation: X + " -> " + ladoDer});
        }
    }

    return steps;
}

function esTerminal(simb, grammar) {
    if (simb === 'FIN') return false; 
    if (simb === 'ε') return true;
    return !grammar.SimbNoTerm.has(simb);
}
