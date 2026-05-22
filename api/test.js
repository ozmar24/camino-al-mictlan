// api/test.js
async function testRegistro() {
  try {
    const respuesta = await fetch("https://camino-al-mictlan.vercel.app/api/pacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "prueba@example.com", password: "123456", accion: "registro" })
    });
    console.log("Status:", respuesta.status);
    const texto = await respuesta.text();
    console.log("Respuesta cruda:", texto);
  } catch (err) {
    console.error("Error en fetch:", err);
  }
}
testRegistro();
