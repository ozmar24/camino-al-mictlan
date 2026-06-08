export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { wallet, accion } = req.body;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const emailLimpio = wallet.toLowerCase().trim();
    const userKey = `usuario:${emailLimpio.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
    // 1. Obtener objeto actual
    const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
    }).then(r => r.json());

    if (!getRes.result) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado en las sombras.' });
    }

    let usuario = JSON.parse(getRes.result);

    // 2. Aplicar lógica según la acción
    if (accion === 'sumar_ritual') {
        usuario.balance_soulgeist = parseFloat(usuario.balance_soulgeist || 0) + 10;
    } 
    else if (accion === 'descontar_ritual') {
        // Recibimos el balance exacto calculado por el frontend
        usuario.balance_soulgeist = parseFloat(req.body.nuevoBalance || 0);
    } 
    else {
        return res.status(400).json({ success: false, error: 'Acción no reconocida' });
    }

    // 3. GUARDAR EL OBJETO COMPLETO UNA SOLA VEZ
    await fetch(`${redisUrl}/set/${userKey}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(usuario)
    });

    return res.status(200).json({ 
        success: true, 
        nuevoBalance: usuario.balance_soulgeist,
        mensaje: accion === 'sumar_ritual' ? "+10 SG absorbidos" : "Ritual completado"
    });

} catch (e) {
    console.error("Error en acumular-sg:", e);
    return res.status(500).json({ success: false, error: "Error en las criptas." });
}