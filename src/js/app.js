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

document.addEventListener('DOMContentLoaded', async () => {
    // PRIMERA PRUEBA DE LÉXICO (opcional)
    const cadenaPrueba1 = "<G> -> <Reglas>; epsilon" +
                          "<Reglas> -> <Regla> <SEMICOLON> <ReglasP>;" +
                          "<ReglasP> -> <Regla> <SEMICOLON> <ReglasP> | <epsilon>;" +
                          "<Regla> -> <LadoIzq> <flecha> <LadosDerechos>;" +
                          "<LadoIzq> -> <SIMBOLO>;" +
                          "<LadosDerechos> -> <LadoDerecho> <LadosDerechosP>;" +
                          "<LadosDerechosP> -> <OR> <LadoDerecho> <LadosDerechosP> | <epsilon>;" +
                          "<LadoDerecho> -> <Simbolos>;" +
                          "<Simbolos> -> <SIMBOLO> <SimbolosP>;" +
                          "<SimbolosP> -> <SIMBOLO> <SimbolosP> | <epsilon>;";

    const analizadorLexico1 = await instanciarAnalizadorLexicoGramaticas(cadenaPrueba1);
    if (analizadorLexico1) {
        let token;
        while ((token = analizadorLexico1.yylex()) !== 0 && token !== SimbolosEspeciales.ERROR) {
            console.log("Token:", token, "Lexema:", analizadorLexico1.getLexema());
        }
        if (token === 0) {
            console.log("Fin de entrada (primer análisis).");
        } else {
            console.error("Error léxico en:", analizadorLexico1.getLexema());
        }
    } else {
        console.error("No se pudo instanciar el analizador léxico (primer análisis).");
    }

    // SEGUNDA PRUEBA DE GRAMÁTICA (opcional)
    const cadenaPrueba2 = "<G> -> <Reglas>;" +
                          "<Reglas> -> <Regla> <SEMICOLON> <ReglasP>;" +
                          "<ReglasP> -> <Regla> <SEMICOLON> <ReglasP> | epsilon;" +
                          "<Regla> -> <LadoIzq> <flecha> <LadosDerechos>;" +
                          "<LadoIzq> -> <SIMBOLO>;" +
                          "<LadosDerechos> -> <LadoDerecho> <LadosDerechosP>;" +
                          "<LadosDerechosP> -> <OR> <LadoDerecho> <LadosDerechosP> | epsilon;" +
                          "<LadoDerecho> -> <Simbolos>;" +
                          "<Simbolos> -> <SIMBOLO> <SimbolosP>;" +
                          "<SimbolosP> -> <SIMBOLO> <SimbolosP> | epsilon;";
    const analizadorLexico2 = await instanciarAnalizadorLexicoGramaticas(cadenaPrueba2);

    if (analizadorLexico2) {
        const grammar = new Grammar(analizadorLexico2);
        const resultado = await grammar.parse();
        grammar.removeLeftRecursion();
        if (resultado) {
            console.log("Gramática analizada correctamente (segunda prueba).");
            console.log("Número de reglas:", grammar.NumReglas);
            for (let i = 0; i < grammar.NumReglas; i++) {
                const regla = grammar.Reglas[i];
                const ladoDerecho = regla.Lista.map(n => n.NombSimb + (n.EsTerminal ? "(T)" : "(NT)")).join(" ");
                console.log(`${regla.NombSimb} -> ${ladoDerecho}`);
            }
        } else {
            console.error("Error al analizar la gramática (segunda prueba).");
        }
    } else {
        console.error("No se pudo instanciar el analizador léxico (segunda prueba).");
    }

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

    // Modo por defecto: análisis léxico
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
        if (!appState.userLexAnalyzer) {
            alert('Primero carga el AFD.');
            return;
        }

        lexResultsTable.innerHTML = '';
        const sigma = document.getElementById('sigma').value.trim();
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
        alert("Tabla LL1 generada con éxito. Revisa la sección de resultados para verla.");
    });
});

// Funciones auxiliares
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

    // Obtener no terminales y tokens
    const noTerminales = Object.keys(table);
    const tokensSet = new Set();

    for (let A of noTerminales) {
        for (let tToken of Object.keys(table[A])) {
            tokensSet.add(tToken);
        }
    }

    const tokens = Array.from(tokensSet);

    // Crear encabezado
    const headerRow = tableContainer.insertRow();
    let th = headerRow.insertCell();
    th.textContent = 'NT/TOK';

    for (let tok of tokens) {
        const cell = headerRow.insertCell();
        cell.textContent = tok;
    }

    // Llenar filas para cada no terminal
    for (let A of noTerminales) {
        const row = tableContainer.insertRow();
        const cellNT = row.insertCell();
        cellNT.textContent = A;

        for (let tok of tokens) {
            const cell = row.insertCell();
            if (table[A][tok] !== undefined) {
                cell.textContent = table[A][tok];
            } else {
                cell.textContent = ''; 
            }
        }
    }
}
