import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    const { wallet, accion } = req.body || {};
    if (!wallet) {
        return res.status(400).json({ success: false, error: 'Falta wallet' });
    }

    let redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    if (redisUrl) redisUrl = redisUrl.replace(/\/$/, '');
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });
    }

    const emailLimpio = wallet.toLowerCase().trim();
    const userKey = `usuario:${emailLimpio.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        const origenPeticion = req.headers.origin || req.headers.referer;
        const MI_DOMINIO = "caminoamictlan.com";

        if (!origenPeticion || (!origenPeticion.includes(MI_DOMINIO) && !origenPeticion.includes("localhost"))) {
            return res.status(403).json({ success: false, error: 'Acceso denegado.' });
        }

        const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });
        const getData = await getRes.json();

        if (!getData.result) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        let usuario = JSON.parse(getData.result);

        if (accion === 'sumar_ritual') {
            // ... (todo tu código de sumar_ritual se queda igual)
            const llaveCooldown = `cooldown_video:${emailLimpio}`;
            const llaveLimiteDiario = `limite_diario_video:${emailLimpio}`;

            const checkCooldownRes = await fetch(`${redisUrl}/get/${llaveCooldown}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const checkCooldownData = await checkCooldownRes.json();

            if (checkCooldownData.result) {
                return res.status(429).json({ success: false, error: 'Espera 30 segundos.' });
            }

            const checkLimiteRes = await fetch(`${redisUrl}/get/${llaveLimiteDiario}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const checkLimiteData = await checkLimiteRes.json();
            const videosVistosHoy = parseInt(checkLimiteData.result || "0");

            if (videosVistosHoy >= 10) {
                return res.status(403).json({ success: false, error: 'Límite diario alcanzado.' });
            }

            await fetch(`${redisUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(['SET', llaveCooldown, 'activo', 'EX', 30])
            });

            if (videosVistosHoy === 0) {
                await fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(['SET', llaveLimiteDiario, '1', 'EX', 86400])
                });
            } else {
                await fetch(`${redisUrl}/incr/${llaveLimiteDiario}`, {
                    headers: { Authorization: `Bearer ${redisToken}` }
                });
            }

            usuario.balance_soulgeist = parseFloat(usuario.balance_soulgeist || 0) + 10;

        } else if (accion === 'descontar_ritual') {
            const nuevoBalance = parseFloat(req.body.nuevoBalance);
            if (isNaN(nuevoBalance) || nuevoBalance < 0) {
                return res.status(400).json({ success: false, error: 'Nuevo balance inválido' });
            }
            usuario.balance_soulgeist = Math.floor(nuevoBalance);
        } else if (accion === 'guardar_tumbas') {
            usuario.tumbas = req.body.tumbas || {};
            await fetch(`${redisUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(['SET', userKey, JSON.stringify(usuario)])
            });
            return res.status(200).json({ success: true });
        } else if (accion === 'cargar_tumbas') {
            return res.status(200).json({
                success: true,
                tumbas: usuario.tumbas || null
            });
        } else {
            return res.status(400).json({ success: false, error: 'Acción no reconocida' });
        }

        // Guardar usuario actualizado
        await fetch(`${redisUrl}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(['SET', userKey, JSON.stringify(usuario)])
        });

        console.log(`✅ Balance actualizado para ${userKey}: ${usuario.balance_soulgeist}`);

        const nuevoBalanceFinal = Math.floor(parseFloat(usuario.balance_soulgeist || 0));

        return res.status(200).json({
            success: true,
            nuevoBalance: nuevoBalanceFinal,
            mensaje: accion === 'sumar_ritual' ? "+10 SG absorbidos" : "Balance actualizado correctamente"
        });

    } catch (e) {
        console.error("❌ Error en acumular-sg:", e);
        return res.status(500).json({ success: false, error: "Error interno en las criptas" });
    }
}