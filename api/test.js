// api/test.js
// ⚠️ DESACTIVADO: este archivo era un script de prueba que ejecutaba un
// registro real contra producción cada vez que alguien lo invocaba
// (creaba usuarios "prueba@example.com" e incrementaba el contador de almas,
// consumiendo premios de bienvenida). Se reemplaza por un stub inofensivo.

export default async function handler(req, res) {
    return res.status(404).json({ success: false, error: 'Endpoint no disponible.' });
}
