export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { wallet, nuevoBalance, accion } = req.body;
    
    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!wallet) {
        return res.status(400).json({ error: 'Falta la credencial del alma (wallet).' });
    }

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const cleanUrl = redisUrl?.replace(/\/$/, "");

    const balanceKey = `user:balance:${wallet}`;

    // ==========================================
    // OPERACIÓN: DESCONTAR SALDO DEL RITUAL (CORREGIDO)
    // ==========================================
    if (accion === 'descontar_ritual') {
        if (typeof nuevoBalance === 'undefined') {
            return res.status(400).json({ error: 'Falta el nuevo balance para actualizar.' });
        }
        try {
            // Enviamos el comando como un arreglo POST para evitar problemas de URL en Upstash
            const respuestaUpstash = await fetch(`${cleanUrl}`, { 
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${redisToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(["SET", balanceKey, String(nuevoBalance)])
            }).then(r => r.json());

            console.log("[REDIS SET RESULT]:", respuestaUpstash);

            return res.status(200).json({
                success: true,
                mensaje: "Balance del pacto sincronizado en el abismo.",
                nuevoBalance: nuevoBalance
            });
        } catch (error) {
            console.error("Error al descontar en Redis:", error);
            return res.status(500).json({ error: "Fallo interno al alterar las criptas." });
        }
    }

    // ==========================================
    // LÓGICA ORIGINAL: ACUMULAR POR VIDEO
    // ==========================================
    const cooldownKey = `user:cooldown:video:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const TIEMPO_ESPERA_VIDEO = 60; 
    const RECOMPENSA_SG = 10;      

    try {
        const checkCooldown = await fetch(`${cleanUrl}/get/${cooldownKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        }).then(r => r.json());

        if (checkCooldown && checkCooldown.result) {
            const ttlRes = await fetch(`${cleanUrl}/ttl/${cooldownKey}`, {
                headers: { Authorization: `Bearer ${redisToken}` } 
            }).then(r => r.json());
            
            return res.status(429).json({ 
                error: `Los ancestros exigen paciencia. Podrás absorber más Poder SG en ${ttlRes.result} segundos.` 
            });
        }

        await fetch(`${cleanUrl}/incrby/${balanceKey}/${RECOMPENSA_SG}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        });

        await fetch(`${cleanUrl}/set/${cooldownKey}/bloqueado/EX/${TIEMPO_ESPERA_VIDEO}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        });

        const resNuevoBalance = await fetch(`${cleanUrl}/get/${balanceKey}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        }).then(r => r.json());

        return res.status(200).json({
            success: true,
            mensaje: `Has absorbido +${RECOMPENSA_SG} de Poder SG.`,
            nuevoBalance: parseInt(resNuevoBalance.result, 10)
        });

    } catch (e) {
        console.error("Error acumulando:", e);
        return res.status(500).json({ error: "Error en las criptas de Upstash." });
    }
}