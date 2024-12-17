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
    ll1Table: null,
    tokensAssigned: false
};

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

    let goToTokensBtn = document.createElement('button');
    goToTokensBtn.textContent = "Ir a asignación de tokens";
    goToTokensBtn.className = "info__button";
    goToTokensBtn.style.display = "none";
    document.getElementById('lex').appendChild(goToTokensBtn);

    analizSintactRadio.disabled = true; 
    testLexButton.disabled = true;
    asignarTokensBtn.disabled = true; 
    crearTablaLL1Btn.disabled = true;

    lexSection.style.display = 'block';
    sintactSection.style.display = 'none';
    testLexButton.textContent = "Analizar Léxicamente";
    appState.currentMode = 'lex';

    analizLexRadio.checked = true;
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
            alert("AFD Cargado. Ahora puede realizar análisis léxico.");
            testLexButton.classList.add('highlight');
            const lexSection = document.getElementById('lex');
            if (lexSection) {
              lexSection.scrollIntoView({ behavior: 'smooth' });
            }
    
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
                alert("Análisis léxico completado. Ahora asigne tokens a los terminales.");
                goToTokensBtn.style.display = "block";
                testLexButton.classList.remove('highlight');
                goToTokensBtn.classList.add('highlight');
            } else if (token === SimbolosEspeciales.ERROR) {
                agregarFilaLexResults(lexResultsTable, appState.userLexAnalyzer.getLexema(), 'ERROR');
                alert("Error léxico encontrado, revise su cadena sigma.");
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

            const steps = analizarSintacticamente(
                sigma, 
                appState.currentGrammar, 
                appState.ll1Table, 
                appState.userAutomata
            );

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

    goToTokensBtn.addEventListener('click', () => {
        document.querySelector('.info').scrollIntoView({ behavior: 'smooth' });
        goToTokensBtn.classList.remove('highlight');
        asignarTokensBtn.disabled = false;
        asignarTokensBtn.classList.add('highlight');
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
        let allAssigned = true;
        for (let i = 0; i < term.rows.length; i++) {
            const row = term.rows[i];
            const simboloTerminal = row.cells[0].textContent;
            const tokenInput = row.cells[1].querySelector('input[type="text"]');
            const tokenVal = tokenInput.value.trim();

            if (tokenVal !== '' && !isNaN(tokenVal)) {
                appState.currentGrammar.TerminalesTokens[simboloTerminal] = parseInt(tokenVal, 10);
            } else {
                delete appState.currentGrammar.TerminalesTokens[simboloTerminal];
                allAssigned = false;
            }
        }

        console.log("Asignaciones de tokens a terminales:");
        for (let [sym, tok] of Object.entries(appState.currentGrammar.TerminalesTokens)) {
            console.log(sym, "->", tok);
        }

        if (!allAssigned) {
            alert("Algunos terminales no tienen token asignado.");
        } else {
            alert("Tokens asignados correctamente.");
            appState.tokensAssigned = true;
            asignarTokensBtn.classList.remove('highlight');
            crearTablaLL1Btn.disabled = false;
            crearTablaLL1Btn.classList.add('highlight');
        }
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
        alert("Tabla LL1 generada con éxito. Ahora puede realizar el análisis sintáctico.");
        crearTablaLL1Btn.classList.remove('highlight');
        analizSintactRadio.disabled = false;
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

    const noterm = document.getElementById('noterm');
    const term = document.getElementById('term');

    noterm.innerHTML = '';
    term.innerHTML = '';

    appState.currentGrammar = grammar;

    const noTerminales = grammar.SimbNoTerm;
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

    // Obtener no terminales y terminales
    const noTerminales = Array.from(grammar.SimbNoTerm);
    const terminalesSet = new Set();
    for (let i = 0; i < grammar.NumReglas; i++) {
        for (let nodo of grammar.Reglas[i].Lista) {
            if (nodo.EsTerminal && nodo.NombSimb !== 'ε') {
                terminalesSet.add(nodo.NombSimb);
            }
        }
    }

    const terminales = Array.from(terminalesSet);
    // Agregar FIN a la lista de columnas
    const columnas = [...terminales, 'FIN'];

    // Filas: no terminales + terminales
    const filas = [...noTerminales, ...terminales];

    // Encabezado
    const headerRow = tableContainer.insertRow();
    let th = headerRow.insertCell();
    th.textContent = 'Simb/Term';
    for (let col of columnas) {
        const cell = headerRow.insertCell();
        cell.textContent = col;
    }

    // Llenar la tabla
    for (let rowSymbol of filas) {
        const row = tableContainer.insertRow();
        const cellRowSym = row.insertCell();
        cellRowSym.textContent = rowSymbol;

        if (grammar.SimbNoTerm.has(rowSymbol)) {
            // Es un no terminal (mostrar reglas LL1)
            for (let colTerm of columnas) {
                const cell = row.insertCell();
                const productionIndex = table[rowSymbol][colTerm];
                if (productionIndex !== undefined) {
                    cell.textContent = reglasTexto[productionIndex];
                } else {
                    cell.textContent = 'error';
                }
            }
        } else {
            // Es un terminal (pop/error)
            for (let colTerm of columnas) {
                const cell = row.insertCell();
                if (colTerm === rowSymbol) {
                    cell.textContent = 'pop';
                } else {
                    cell.textContent = 'error';
                }
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
    lexemas.push('$'); 

    const startSymbol = grammar.Reglas[0].NombSimb;
    let stack = ['FIN', startSymbol];

    let steps = [];
    let pos = 0;

    function stackString() {
        return stack.slice().reverse().join(" ");
    }

    function inputString() {
        return lexemas.slice(pos).join(" ");
    }

    steps.push({stack: stackString(), input: inputString(), operation: "Iniciar"});

    // Función auxiliar para obtener el símbolo terminal asociado a un token
    function symbolForToken(tokenVal) {
        // Buscamos el terminal que tenga este token
        for (let [sym, tkn] of Object.entries(grammar.TerminalesTokens)) {
            if (tkn === tokenVal) return sym;
        }
        // Si tokenVal es FIN:
        if (tokenVal === 'FIN') return 'FIN';
        return null;
    }

    while (true) {
        let X = stack[stack.length - 1];
        let a = tokens[pos];
        let aLex = lexemas[pos];

        if (X === 'FIN' && a === 'FIN') {
            steps.push({stack: stackString(), input: inputString(), operation: "aceptar"});
            break;
        }

        if (X === 'ε') {
            stack.pop();
            steps.push({stack: stackString(), input: inputString(), operation:"Desapilar ε"});
            continue;
        }

        // Determinar si X es terminal
        let XesTerminal = esTerminal(X, grammar);

        if (XesTerminal) {
            // X es terminal. Comprobamos con el token 'a'.
            let Xtoken = grammar.TerminalesTokens[X];
            if (X === 'FIN') Xtoken = 'FIN'; 
            if (X === '$') Xtoken = 'FIN'; 

            if ((Xtoken === a) || (X === '$' && a === 'FIN')) {
                stack.pop();
                pos++;
                steps.push({stack: stackString(), input: inputString(), operation:"pop"});
            } else {
                steps.push({stack: stackString(), input: inputString(), operation:"error"});
                break;
            }
        } else {
            // X es no terminal
            // Encontrar el símbolo terminal de la entrada actual a partir del token 'a'
            let aSymbol = symbolForToken(a);
            if (!aSymbol) {
                // Si no encontramos el símbolo, es error
                steps.push({stack: stackString(), input: inputString(), operation:"error"});
                break;
            }

            let produccionIndex = ll1Table[X][aSymbol];
            if (produccionIndex === undefined) {
                // Intentar con FIN
                if (a === 'FIN') produccionIndex = ll1Table[X]['FIN'];
            }

            if (produccionIndex === undefined) {
                steps.push({stack: stackString(), input: inputString(), operation:"error"});
                break;
            }

            stack.pop();
            const regla = grammar.Reglas[produccionIndex];
            const ladoDer = regla.Lista.map(n => n.NombSimb).join(" ");

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
