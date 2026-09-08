// lib/traga-constantes.js
// ⚠️ ÚNICA FUENTE DE VERDAD de la tragamonedas. El servidor evalúa y paga con
// estas reglas; el cliente solo las usa para MOSTRAR (grid, historial, tabla).
// El resultado del giro y los créditos SIEMPRE los decide el servidor.

export const TRAGA = {
    FILAS: 5,
    COLUMNAS: 5,
    LINEAS_TOTALES: 20,
    LINEAS_MIN: 5,
    LINEAS_PASO: 5,
    // Costo por línea: 2 SG cuando juegas 5 líneas (2 × 5 = 10... no:
    // el costo de la TIRADA es proporcional: tirada = 2 SG × (líneas / 5)).
    COSTO_POR_5_LINEAS: 2,
    MINIMO_RETIRO: 100, // SG: tanto para MetaMask como para canalizar a cripta

    // Peso de cada símbolo en el rodillo (probabilidad relativa).
    // Soulgeist (scatter/jackpot) se inserta con probabilidad 1/20 por celda.
    SIMBOLOS: [
        { nombre: 'Vela',            peso: 16, img: 'img/Vela.jpeg' },
        { nombre: 'Hueso',           peso: 16, img: 'img/Hueso.png' },
        { nombre: 'Cempasuchil',     peso: 12, img: 'img/Cempasuchil.webp' },
        { nombre: 'Calavera',        peso: 8,  img: 'img/Calavera.jpeg' },
        { nombre: 'Xoloit',         peso: 7,  img: 'img/Xoloit.jpeg' },
        { nombre: 'Macuahuitl',      peso: 4,  img: 'img/Macuahuitl.png' },
        { nombre: 'Mictlantecuhtli', peso: 1,  img: 'img/Mictlantecuhtli.png' } // comodín
    ],
    // Soulgeist (scatter): con probabilidad 1/20 por columna REEMPLAZA una celda
    // aleatoria → el grid siempre queda exactamente 5×5. Al ser parte del grid,
    // si cae en una línea activa ROMPE la combinación (no paga línea), pero
    // 3+/4+/5 Soulgeist en el grid pagan sobre la apuesta total (ver abajo).
    SCATTER: { nombre: 'Soulgeist', probabilidad: 1 / 20, img: 'img/Soulgeist.png' },

    // Multiplicador sobre el costo de CADA línea activa (apuesta / líneas).
    // RTP global ≈ 93% (simulación Monte Carlo, 3M de giros).
    PAGOS: {
        'Vela':            { 3: 10, 4: 29, 5: 95 },
        'Hueso':           { 3: 10, 4: 29, 5: 95 },
        'Cempasuchil':     { 3: 10, 4: 29, 5: 95 },
        'Calavera':        { 3: 24, 4: 73, 5: 244 },
        'Xoloit':          { 3: 24, 4: 73, 5: 244 },
        'Macuahuitl':      { 3: 24, 4: 73, 5: 244 },
        'Mictlantecuhtli': { 3: 19, 4: 49, 5: 121 } // comodín
    },

    // Soulgeist es scatter: paga sobre la APUESTA TOTAL de la tirada.
    // 3 → ×2 · 4 → ×10 · 5 → ×500 (JACKPOT)
    SCATTER_PAGOS: { 3: 2, 4: 10, 5: 500 },

    // 20 líneas: [fila col0, fila col1, ... fila col4]
    LINEAS: [
        [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [3, 3, 3, 3, 3], [4, 4, 4, 4, 4],
        [0, 1, 2, 3, 4], [4, 3, 2, 1, 0],
        [1, 1, 2, 2, 3], [3, 3, 2, 2, 1], [2, 1, 2, 3, 2], [2, 3, 2, 1, 2],
        [0, 0, 1, 2, 3], [4, 4, 3, 2, 1], [1, 2, 3, 4, 4], [3, 2, 1, 0, 0],
        [0, 2, 0, 2, 0], [4, 2, 4, 2, 4],
        [1, 0, 1, 0, 1], [3, 4, 3, 4, 3],
        [2, 2, 3, 2, 2]
    ],

    COMODIN: 'Mictlantecuhtli',
    SCATTER_NOMBRE: 'Soulgeist'
};

/** Costo de una tirada según las líneas activas (2 SG con 5 líneas). */
export function costoTirada(lineas) {
    const l = Math.max(TRAGA.LINEAS_MIN, Math.min(TRAGA.LINEAS_TOTALES, Number(lineas) || TRAGA.LINEAS_MIN));
    return 2 * (l / TRAGA.LINEAS_MIN);
}

/** Evaluar una línea de 5 celdas con comodín. Devuelve { simbolo, coincidencias }. */
export function evaluarLinea(celdas) {
    const COMODIN = TRAGA.COMODIN;
    const noComodines = celdas.filter(s => s !== COMODIN);

    // Línea 100% comodines: se paga como comodín ×5.
    if (noComodines.length === 0) {
        return { simbolo: COMODIN, coincidencias: 5 };
    }

    const simbolo = noComodines[0];
    let n = 0;
    let iniciado = false;

    for (const celda of celdas) {
        if (celda === simbolo) { n++; iniciado = true; }
        else if (celda === COMODIN && iniciado) n++;
        else if (!iniciado && celda === COMODIN) continue; // comodín inicial: no rompe
        else break;
    }

    return { simbolo, coincidencias: n };
}

/** Imagen de un símbolo (para el cliente). */
export function imgSimbolo(nombre) {
    if (nombre === TRAGA.SCATTER_NOMBRE) return TRAGA.SCATTER.img;
    const s = TRAGA.SIMBOLOS.find(x => x.nombre === nombre);
    return s ? s.img : TRAGA.SIMBOLOS[0].img;
}
