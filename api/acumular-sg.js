export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { wallet, accion } = req.body;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // 1. La LLAVE debe ser la misma que usas en pacto.js y obtener-balance.js
    const emailLimpio = wallet.toLowerCase().trim();
    const userKey = `usuario:${emailLimpio.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        // 2. OBTENER EL OBJETO DEL USUARIO
        const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });
        const data = await getRes.json();
        let usuario = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;

        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        // 3. LÓGICA DE SUMA (Vídeo)
        if (accion === 'sumar_ritual') {
            const balanceActual = parseFloat(usuario.balance_soulgeist || 0);
            usuario.balance_soulgeist = balanceActual + 10; // Sumamos 10 al total real

            // 4. GUARDAR EL OBJETO COMPLETO ACTUALIZADO
            await fetch(`${redisUrl}/set/${userKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(usuario)
            });

            return res.status(200).json({ success: true, nuevoBalance: usuario.balance_soulgeist });
        }

        return res.status(400).json({ error: 'Acción no reconocida' });

    } catch (e) {
        console.error("Error en acumular-sg:", e);
        return res.status(500).json({ error: "Error en las criptas." });
    }
}