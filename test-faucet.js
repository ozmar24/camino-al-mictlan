const URL_VERCEL = "https://camino-al-mictlan.vercel.app";
const ID_PRUEBA = "test_soul_" + Math.floor(Math.random() * 100000);

// Ruta corregida a tu archivo real
const ENDPOINT = `${URL_VERCEL}/api/reclamar`;

const datosDelRitual = {
    identidad: ID_PRUEBA,
    wallet: "0x47736b44094634836d847fd8df4ea09c11715b",
    cripto: "Dogecoin",
    pasarela: "binance",
    cantidadRetiro: "1.6"
};

async function ejecutarPrueba() {
    console.log("\u{1F480} Iniciando ritual de prueba hacia el inframundo...");
    console.log(`\u{1F4E1} Enviando petición a: ${ENDPOINT}`);

    try {
        const respuesta = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosDelRitual)
        });

        const text = await respuesta.text();
        
        console.log("\n==============================================");
        console.log(`\u{1F4CA} Estatus del Servidor: ${respuesta.status}`);
        console.log("\u{1F4E6} Respuesta del Servidor:");
        
        try {
            console.log(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
            console.log(text);
        }
        
        console.log("==============================================\n");

    } catch (error) {
        console.error("\u{1F4A5} Error de red o conexión al pegarle a Vercel:", error);
    }
}

ejecutarPrueba();