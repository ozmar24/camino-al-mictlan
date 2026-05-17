export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { wallet } = req.body;
    
    // Captura de IP para el escudo
    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!wallet) {
        return res.status(400).json({ error: 'Falta la credencial del alma (wallet).' });
    }

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Llaves de control para la acumulación
    const cooldownKey = `user:cooldown:video:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const balanceKey = `user:balance:${wallet}`;

    // CONFIGURACIÓN DE MONETIZACIÓN
    const TIEMPO_ESPERA_VIDEO = 60; // El usuario solo puede sumar cada 60 segundos (1 minuto)
    const RECOMPENSA_SG = 10;      // Cantidad de Poder SG que otorga cada video

    try {
        // 1. Verificar si la IP está en tiempo de espera (cooldown)
        const resCooldown = await fetch(`${redisUrl}/get/${cooldownKey}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        }).then(r => r.json());

        if (resCooldown.result !== null) {
            const ttlRes = await fetch(`${redisUrl}/ttl/${cooldownKey}`, { 
                headers: { Authorization: `Bearer ${redisToken}` } 
            }).then(r => r.json());
            
            return res.status(429).json({ 
                error: `Los ancestros exigen paciencia. Podrás absorber más Poder SG en ${ttlRes.result} segundos.` 
            });
        }

        // 2. Si el tiempo expiró, le sumamos el Poder SG a su cuenta usando el comando INCRBY de Redis
        // Esto evita problemas de concurrencia (raza de carrera) si abren varias pestañas
        await fetch(`${redisUrl}/incrby/${balanceKey}/${RECOMPENSA_SG}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        });

        // 3. Activamos el candado de tiempo para este dispositivo
        await fetch(`${redisUrl}/set/${cooldownKey}/bloqueado/EX/${TIEMPO_ESPERA_VIDEO}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        });

        // 4. Consultamos el nuevo balance total para devolvérselo al frontend
        const resNuevoBalance = await fetch(`${redisUrl}/get/${balanceKey}`, { 
            headers: { Authorization: `Bearer ${redisToken}` } 
        }).then(r => r.json());

        return res.status(200).json({
            success: true,
            mensaje: `Has absorbido +${RECOMPENSA_SG} de Poder SG.`,
            nuevoBalance: parseInt(resNuevoBalance.result, 10) || 0
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error en la matriz de acumulación.' });
    }
}