import fetch from "node-fetch";

async function testRegistro() {
    const respuesta = await fetch("https://camino-al-mictlan.vercel.app/api/pacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: "prueba@example.com",
            password: "123456",
            accion: "registro"
        })
    });

    const texto = await respuesta.text();
    console.log("Respuesta cruda:", texto);

    try {
        const json = JSON.parse(texto);
        console.log("JSON válido:", json);
    } catch {
        console.error("No es JSON válido");
    }
}

testRegistro();
