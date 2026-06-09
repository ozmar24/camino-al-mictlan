// api/acumular-sg.js
import crypto from 'crypto'; // Se mantiene listo para integraciones futuras

export default async function handler(req, res) {
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
      
        const origenPeticion = req.headers.origin || req.headers.referer;
        const MI_DOMINIO_OFICIAL = "https://camino-al-mictlan.vercel.app"; 
        
        if (!origenPeticion || !origenPeticion.includes(MI_DOMINIO_OFICIAL)) {
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
            usuario.balance_soulgeist = parseFloat(usuario.balance_soulgeist || 0) + 10;
        
        } else if (accion === 'descontar_ritual') {
            const costo = parseFloat(req.body.costoRitual || 0);
            if (costo <= 0) {
                return res.status(400).json({ success: false, error: 'Costo inválido' });
            }
            const balanceActual = parseFloat(usuario.balance_soulgeist || 0);
            if (balanceActual < costo) {
                return res.status(400).json({ success: false, error: 'SG insuficientes' });
            }
            usuario.balance_soulgeist = balanceActual - costo;
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
            nuevoBalance: usuario.balance_soulgeist,
            mensaje: accion === 'sumar_ritual' ? "+10 SG absorbidos" : "Balance actualizado correctamente"
        });

    } catch (e) {
        console.error("❌ Error en acumular-sg:", e);
        return res.status(500).json({ success: false, error: "Error interno en las criptas" });
    }
}
