export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { wallet, nuevoBalance, accion } = req.body;
    if (!wallet) return res.status(400).json({ error: 'Falta la wallet.' });

    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
    const cleanUrl = UPSTASH_REDIS_REST_URL.replace(/\/$/, "");

    // 1. LLAVE ÚNICA UNIFICADA (Igual que en pacto.js)
    const emailNormalizado = wallet.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
        // 2. LEER EL OBJETO COMPLETO
        const resUsuario = await fetch(`${cleanUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }).then(r => r.json());

        let usuario = resUsuario.result ? JSON.parse(resUsuario.result) : null;
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

        // 3. ACTUALIZAR BALANCE SEGÚN LA ACCIÓN
        if (accion === 'descontar_ritual') {
            usuario.balance_soulgeist = nuevoBalance.toString();
        } else {
            // Lógica de acumular (video)
            let balActual = parseInt(usuario.balance_soulgeist || 0);
            usuario.balance_soulgeist = (balActual + 10).toString();
        }

        // 4. GUARDAR EL OBJETO COMPLETO DE VUELTA EN REDIS
        await fetch(`${cleanUrl}/set/${userKey}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(usuario)
        });

        return res.status(200).json({ success: true, nuevoBalance: usuario.balance_soulgeist });

    } catch (e) {
        console.error("Error en Criptas:", e);
        return res.status(500).json({ error: "Error en el Inframundo." });
    }
}