//dom_utils.js

function agregarFilaLexResults(table, lexema, token) {
    const row = table.insertRow();
    const cellLex = row.insertCell();
    const cellTok = row.insertCell();
    cellLex.textContent = lexema;
    cellTok.textContent = token;
}

function limpiarTablasSimbolos() {
    const noterm = document.getElementById('noterm');
    const term = document.getElementById('term');
    noterm.innerHTML = '';
    term.innerHTML = '';
}

export { agregarFilaLexResults, limpiarTablasSimbolos };
