const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let balanceSG = 0;

if (redisUrl && redisToken) {
    try {
        // ✅ Misma llave que pacto.js y obtener-balance.js
        const userKey = `usuario:${emailUsuario.toLowerCase().trim().replace(/[^a-zA-Z0-9@._-]/g, '_')}`;
        
        const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });
        const getData = await getRes.json();
        
        let usuario = null;
        if (getData.result) {
            usuario = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
        }

        if (!usuario) {
            // Usuario nuevo — verificar bono de fundador
            const resContador = await fetch(`${redisUrl}/get/contador_almas`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const dataContador = await resContador.json();
            const cuentaActual = parseInt(dataContador?.result || 0);
            balanceSG = cuentaActual < 50 ? 1000 : 0;

            // Crear usuario en Redis con la misma estructura que pacto.js
            const nuevoUsuario = {
                email: emailUsuario.toLowerCase(),
                password: null,
                balance_soulgeist: balanceSG,
                creado_en: new Date().toISOString(),
                metodo: 'google',
                nombre: nombreUsuario
            };

            await fetch(`${redisUrl}/set/${userKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoUsuario)
            });

            // Incrementar contador
            await fetch(`${redisUrl}/incr/contador_almas`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}` }
            });

        } else {
            // Usuario existente — leer su balance
            balanceSG = parseFloat(usuario.balance_soulgeist || 0);
        }

    } catch (redisError) {
        console.error('Error en Redis:', redisError);
    }
}