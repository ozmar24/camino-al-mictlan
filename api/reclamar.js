export default async function handler(req, res) {
    // 1. Configurar cabeceras para que tu frontend pueda comunicarse con el backend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Solo aceptamos peticiones POST para proteger el reclamo
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido en el inframundo' });
    }

    // 3. Extraemos los datos del frontend y capturamos la IP real en Vercel
    const { wallet, cripto } = req.body;
    
    // Mejoramos la detección usando primero x-vercel-forwarded-for (nativo de Vercel)
    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';

    if (!wallet || wallet.length < 10) {
        return res.status(400).json({ error: 'La dirección de la wallet es inválida para este ritual.' });
    }

    // 4. Traemos las credenciales de Upstash Redis desde las variables de entorno de Vercel
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Las llaves del cofre de Redis no están configuradas.' });
    }

    // Creamos DOS llaves de control independientes para el doble candado
    const walletKey = `user:wallet:${wallet}:${cripto}`;
    const ipKey = `user:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`; 

    try {
        // 5. PRIMER PASO: Consultar AMBAS llaves en Upstash en paralelo
        const [resWallet, resIp] = await Promise.all([
            fetch(`${redisUrl}/get/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json()),
            fetch(`${redisUrl}/get/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json())
        ]);

        // REGLA A: Si la WALLET ya está registrada en las últimas 24 horas
        if (resWallet.result !== null) {
            const ttlRes = await fetch(`${redisUrl}/ttl/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
            const horas = Math.floor(ttlRes.result / 3600);
            const minutos = Math.floor((ttlRes.result % 3600) / 60);

            return res.status(403).json({ 
                bloqueado: true,
                error: `Tu billetera aún no está lista para otra cosecha de ${cripto}. Regresa en ${horas}h y ${minutos}m.` 
            });
        }

        // REGLA B: Si la IP ya realizó un reclamo (Frase corregida para evitar abusos)
        if (resIp.result !== null) {
            const ttlRes = await fetch(`${redisUrl}/ttl/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
            const horas = Math.floor(ttlRes.result / 3600);
            const minutos = Math.floor((ttlRes.result % 3600) / 60);

            return res.status(403).json({ 
                bloqueado: true,
                error: `Este dispositivo o dirección ya canalizó energía para ${cripto} recientemente. El umbral se abrirá de nuevo en ${horas}h y ${minutos}m.` 
            });
        }

        // 6. SEGUNDO PASO: Si ambos candados están libres, activamos el bloqueo de 24 horas para AMBOS
        const tiempoDeVida = 86400; // 24 horas exactas en segundos
        
        await Promise.all([
            fetch(`${redisUrl}/set/${walletKey}/activo/EX/${tiempoDeVida}`, { headers: { Authorization: `Bearer ${redisToken}` } }),
            fetch(`${redisUrl}/set/${ipKey}/activo/EX/${tiempoDeVida}`, { headers: { Authorization: `Bearer ${redisToken}` } })
        ]);

        // 7. RESPUESTA EXITOSA: El backend da luz verde
        return res.status(200).json({ 
            success: true, 
            mensaje: `Poder transferido. Cosecha de ${cripto} completada con éxito.` 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo de Redis.' });
    }
}