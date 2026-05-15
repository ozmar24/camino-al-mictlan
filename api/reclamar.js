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

    // 3. Extraemos la wallet y la cripto elegida que vienen desde el frontend
    const { wallet, cripto } = req.body;

    if (!wallet || wallet.length < 10) {
        return res.status(400).json({ error: 'La dirección de la wallet es inválida para este ritual.' });
    }

    // 4. Traemos las credenciales de Upstash Redis desde las variables de entorno de Vercel
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Las llaves del cofre de Redis no están configuradas.' });
    }

    // La llave única en Redis combinando la wallet y la cripto elegida
    const redisKey = `user:${wallet}:${cripto}`;

    try {
        // 5. PRIMER PASO: Revisar si la llave ya existe en Upstash (¿Está congelado?)
        const checkResponse = await fetch(`${redisUrl}/get/${redisKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });
        const checkData = await checkResponse.json();

        // Si el valor no es null, significa que el temporizador sigue activo
        if (checkData.result !== null) {
            // Le preguntamos a Redis cuántos segundos le quedan de vida a ese candado (TTL)
            const ttlResponse = await fetch(`${redisUrl}/ttl/${redisKey}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const ttlData = await ttlResponse.json();
            const segundosRestantes = ttlData.result;

            // Convertimos los segundos a horas y minutos para que el usuario entienda
            const horas = Math.floor(segundosRestantes / 3600);
            const minutos = Math.floor((segundosRestantes % 3600) / 60);

            return res.status(403).json({ 
                bloqueado: true,
                error: `Tu alma aún no está lista para otra cosecha de ${cripto}. Regresa en ${horas}h y ${minutos}m.` 
            });
        }

        // 6. SEGUNDO PASO: Si el camino está libre, guardamos la wallet y le ponemos el temporizador de 24 horas
        // 86400 segundos = 24 horas exactas
        const tiempoDeVida = 86400; 
        
        await fetch(`${redisUrl}/set/${redisKey}/activo/EX/${tiempoDeVida}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });

        // 7. RESPUESTA EXITOSA: El backend da luz verde para que el frontend mueva los saldos en la pantalla
        return res.status(200).json({ 
            success: true, 
            mensaje: `Poder transferido. Cosecha de ${cripto} completada con éxito.` 
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo de Redis.' });
    }
}