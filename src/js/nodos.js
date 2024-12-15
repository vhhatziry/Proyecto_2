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

export { Nodo, ElemArreglo };
