// Selección de elementos del DOM
const uploadButton = document.getElementById('upload');
const analyzeButton = document.getElementById('analyze');
const noTerminalesBody = document.getElementById('no-terminales-body');
const terminalesBody = document.getElementById('terminales-body');
const tokensLexemasBody = document.getElementById('tokens-lexemas-body');
const tablaLl1Body = document.getElementById('tabla-ll1-body');

// Eventos
uploadButton.addEventListener('click', () => {
  alert('Funcionalidad de subir archivo no implementada aún.');
});

analyzeButton.addEventListener('click', () => {
  alert('Funcionalidad de análisis sintáctico no implementada aún.');
});

// Función para agregar datos a las tablas dinámicamente
function agregarFila(idTabla, datos) {
  const tabla = document.getElementById(idTabla);
  const fila = document.createElement('tr');
  
  datos.forEach(dato => {
    const celda = document.createElement('td');
    celda.textContent = dato;
    fila.appendChild(celda);
  });

  tabla.appendChild(fila);
}

// Ejemplo: Agregar datos de prueba (puedes eliminarlo cuando implementes la lógica real)
function cargarDatosPrueba() {
  agregarFila('no-terminales-body', ['S']);
  agregarFila('terminales-body', ['a', 'TOKEN1']);
  agregarFila('tokens-lexemas-body', ['TOKEN1', 'valor']);
  agregarFila('tabla-ll1-body', ['Pila1', 'Cadena1', 'Acción1']);
}

// Cargar datos de prueba al inicio
cargarDatosPrueba();
