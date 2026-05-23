export default async function handler(req, res) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const cleanUrl = redisUrl?.replace(/\/$/, "");

    // 1. MANEJO DE CONSULTA DE SALDO (GET)
    if (req.method === 'GET') {
        const { wallet } = req.query;
        if (!wallet) return res.status(400).json({ error: 'Falta la wallet para consultar.' });
        
        try {
            const respuesta = await fetch(`${cleanUrl}/get/user:balance:${wallet}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const data = await respuesta.json();
            return res.status(200).json({ balance: parseFloat(data.result || 0) });
        } catch (e) {
            return res.status(500).json({ error: "Error al consultar Redis" });
        }
    }

    // 2. MANEJO DE ACCIONES (POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { wallet, nuevoBalance, accion } = req.body;
    const balanceKey = `user:balance:${wallet}`;

    if (!wallet) {
        return res.status(400).json({ error: 'Falta la credencial del alma (wallet).' });
    }

    // ====================== DESCONTAR RITUAL (FORMA DIRECTA A URL) ======================
    if (accion === 'descontar_ritual') {
        if (typeof nuevoBalance === 'undefined') {
            return res.status(400).json({ error: 'Falta el nuevo balance.' });
	return;
        }
        try {
            // CONSTRUIMOS EL COMANDO EN LA URL: /set/llave/valor
            // Esto evita enviar cualquier JSON que esté causando el 400
            const urlRedis = `${cleanUrl}/set/${balanceKey}/${nuevoBalance}`;
            
            const response = await fetch(urlRedis, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${redisToken}`
                }
            });

            const data = await response.json();

            // Si Upstash devuelve un error, lo veremos en el log
            if (data.error) {
                console.error("Upstash rechazó el comando:", data.error);
                return res.status(500).json({ error: "Redis rechazó el cambio: " + data.error });
            }

            return res.status(200).json({ success: true, nuevoBalance: nuevoBalance });
            
        } catch (error) {
            console.error("Error crítico en la comunicación con Redis:", error);
            return res.status(500).json({ error: "No se pudo contactar con el Inframundo." });
        }
    }

    // ====================== ACUMULAR VIDEO ======================
  const cooldownKey = `user:cooldown:video:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const TIEMPO_ESPERA_VIDEO = 60;
    const RECOMPENSA_SG = 10;

    try {
        // 1. Verificar Cooldown
        const checkCooldown = await fetch(`${cleanUrl}/get/${cooldownKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        }).then(r => r.json());

        if (checkCooldown && checkCooldown.result) {
            const ttlRes = await fetch(`${cleanUrl}/ttl/${cooldownKey}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            }).then(r => r.json());
            return res.status(429).json({ error: `Espera ${ttlRes.result}s.` });
        }

        // 2. Acumular y Bloquear
        await fetch(`${cleanUrl}/incrby/${balanceKey}/${RECOMPENSA_SG}`, { headers: { Authorization: `Bearer ${redisToken}` } });
        await fetch(`${cleanUrl}/set/${cooldownKey}/bloqueado/EX/${TIEMPO_ESPERA_VIDEO}`, { headers: { Authorization: `Bearer ${redisToken}` } });

        // 3. Obtener nuevo balance
        const resNuevoBalance = await fetch(`${cleanUrl}/get/${balanceKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());

        return res.status(200).json({
            success: true,
            mensaje: `Has absorbido +${RECOMPENSA_SG} SG.`,
            nuevoBalance: parseInt(resNuevoBalance.result || 0, 10)
        });

    } catch (e) {
        console.error("Error acumulando:", e);
        return res.status(500).json({ error: "Fallo en las criptas." });
    }
}