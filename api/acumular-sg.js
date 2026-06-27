import crypto from 'crypto';

export default async function handler(req, res) {
    // 1. El control de CORS y OPTIONS ya lo maneja next.config.js de forma global.
    // Solo aseguramos que el método entrante sea estrictamente POST.
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    const { wallet, accion } = req.body || {}; 
    if (!wallet) {
        return res.status(400).json({ success: false, error: 'Falta wallet' });
    }

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });
    }

    const emailLimpio = wallet.toLowerCase().trim();
    const userKey = `usuario:${emailLimpio.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        // Validación de Referer para seguridad extra en la acumulación de puntos (Candado de backend)
        const origenPeticion = req.headers.origin || req.headers.referer;
        const MI_DOMINIO = "caminoamictlan.com"; 
        
        // En desarrollo local puedes agregar: || origenPeticion?.includes("localhost")
        if (!origenPeticion || (!origenPeticion.includes(MI_DOMINIO) && !origenPeticion.includes("localhost"))) {
            return res.status(403).json({ success: false, error: 'Acceso denegado desde portales externos.' });
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
            const llaveCooldown = `cooldown_video:${emailLimpio}`;
            const llaveLimiteDiario = `limite_diario_video:${emailLimpio}`;

            // CANDADO A: Verificar si el usuario está en tiempo de espera (30 segundos)
            const checkCooldownRes = await fetch(`${redisUrl}/get/${llaveCooldown}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const checkCooldownData = await checkCooldownRes.json();
            if (checkCooldownData.result) {
                return res.status(429).json({ success: false, error: 'La energía visual aún se está canalizando. Espera 30 segundos.' });
            }

            // CANDADO B: Verificar el límite diario de 10 videos
            const checkLimiteRes = await fetch(`${redisUrl}/get/${llaveLimiteDiario}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const checkLimiteData = await checkLimiteRes.json();
            const videosVistosHoy = parseInt(checkLimiteData.result || "0");

            if (videosVistosHoy >= 10) {
                return res.status(403).json({ success: false, error: 'Has alcanzado el límite diario de 10 ofrendas visuales.' });
            }

            // 1. Activar Cooldown de 30 segundos
            await fetch(`${redisUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(['SET', llaveCooldown, 'activo', 'EX', 30])
            });

            // 2. Incrementar el contador diario (expira en 24 horas)
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
    usuario.balance_soulgeist = Math.floor(parseFloat(nuevoBalance));
        } else if (accion === 'guardar_tumbas') {
            // Guardar saldos de tumbas en el objeto del usuario
            const tumbas = req.body.tumbas || {};
            usuario.tumbas = tumbas;
            await fetch(`${redisUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(['SET', userKey, JSON.stringify(usuario)])
            });
            return res.status(200).json({ success: true });

        } else if (accion === 'cargar_tumbas') {
            // Devolver saldos de tumbas guardados en Redis
            return res.status(200).json({ 
                success: true, 
                tumbas: usuario.tumbas || null 
            });

        } else {
            return res.status(400).json({ success: false, error: 'Acción no reconocida' });
        }

        await fetch(`${redisUrl}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(['SET', userKey, JSON.stringify(usuario)])
        });

        console.log(`✅ Balance actualizado para ${userKey}: ${usuario.balance_soulgeist}`);

        return res.status(200).json({
            success: true,
            usuario.balance_soulgeist = Math.floor(parseFloat(usuario.balance_soulgeist || 0));
            mensaje: accion === 'sumar_ritual' ? "+10 SG absorbidos" : "Balance actualizado correctamente"
        });

    } catch (e) {
        console.error("❌ Error en acumular-sg:", e);
        return res.status(500).json({ success: false, error: "Error interno en las criptas" });
    }
}