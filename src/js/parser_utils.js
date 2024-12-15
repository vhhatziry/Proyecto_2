//parser_utils.js

import { AnalizadorLexico } from './analizador_lexico.js';

async function cargarAutomataGramaticas() {
    if (window.gramaticaAutomata) {
        return window.gramaticaAutomata;
    }

    const response = await fetch('build/utils/matriz.txt');
    if (!response.ok) {
        throw new Error(`Error al cargar el archivo: ${response.statusText}`);
    }

    const contenido = await response.text();
    const matrizTransicionAFD = parseAFDFile(contenido);
    window.gramaticaAutomata = matrizTransicionAFD;
    return matrizTransicionAFD;
}

function parseAFDFile(contenido) {
    const lines = contenido.split('\n').filter(line => line.trim() !== '');
    const matrizTransicionAFD = [];

    for (let i = 0; i < lines.length; i++) {
        const valoresFila = lines[i].split(',');
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

export { cargarAutomataGramaticas, parseAFDFile, instanciarAnalizadorLexicoGramaticas };
