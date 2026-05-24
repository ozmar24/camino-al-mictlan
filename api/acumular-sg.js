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

    // ====================== DESCONTAR RITUAL (FORMA DIRECTA A URL) ======================
    if (accion === 'descontar_ritual') {
        if (typeof nuevoBalance === 'undefined') {
            return res.status(400).json({ error: 'Falta el nuevo balance.' });
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

  export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const { wallet, nuevoBalance, accion } = req.body;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const cleanUrl = redisUrl?.replace(/\/$/, "");
    const balanceKey = `user:balance:${wallet}`;

    // 1. LÓGICA DE DESCONTAR RITUAL (Para retiros)
    if (accion === 'descontar_ritual') {
        try {
            // Obtenemos el objeto actual
            const resActual = await fetch(`${cleanUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(["GET", balanceKey])
            }).then(r => r.json());

            let usuario = resActual.result ? JSON.parse(resActual.result) : { balance_soulgeist: 0 };
            
            // Actualizamos balance
            usuario.balance_soulgeist = nuevoBalance;

            // Guardamos el objeto completo
            await fetch(`${cleanUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(["SET", balanceKey, JSON.stringify(usuario)])
            });

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: "Error en el Inframundo." });
        }
    }

    // 2. LÓGICA DE ACUMULAR (La que activa el video)
    const RECOMPENSA_SG = 10;
    try {
        // Obtenemos el objeto del usuario
        const resActual = await fetch(`${cleanUrl}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(["GET", balanceKey])
        }).then(r => r.json());

        // Parseamos o inicializamos si es usuario nuevo
        let usuario = resActual.result ? JSON.parse(resActual.result) : { 
            balance_soulgeist: 0, 
            saldos_criptas: { "Bitcoin": 0, "Ethereum": 0, "Solana": 0 } 
        };

        // Sumamos la recompensa
        usuario.balance_soulgeist = parseInt(usuario.balance_soulgeist || 0) + RECOMPENSA_SG;

        // Guardamos el objeto completo de vuelta en Redis
        await fetch(`${cleanUrl}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(["SET", balanceKey, JSON.stringify(usuario)])
        });

        return res.status(200).json({ success: true, nuevoBalance: usuario.balance_soulgeist });
    } catch (e) {
        return res.status(500).json({ error: "Error en las criptas." });
    }
}