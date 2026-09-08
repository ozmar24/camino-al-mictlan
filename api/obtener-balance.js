import {
    autenticarPeticion,
    claveUsuario,
    redisGet,
    verificarLimitePeticion,
    verificarOrigen,
    manejarError,
    obtenerIpLimpia
} from '../lib/seguridad.js';

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    try {
        // 0. Anti-bot: solo peticiones desde el sitio oficial
        if (!verificarOrigen(req)) {
            return res.status(403).json({ success: false, error: 'Origen no autorizado.' });
        }

        // 1. Rate Limiting
        const ip = obtenerIpLimpia(req);
        if (!(await verificarLimitePeticion(req, { max: 60, ventanaSegundos: 60, prefijo: 'rl:balance' }))) {
            return res.status(429).json({ success: false, error: 'Demasiadas peticiones. Espera un momento.' });
        }

        // 2. Sesión Real: no aceptamos la wallet por query/body por seguridad
        const email = await autenticarPeticion(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Sesión no válida. Vuelve a entrar al Mictlán.' });
        }

        const emailLimpio = email.toLowerCase().trim();
        const userKey = claveUsuario(emailLimpio);

        const usuarioRaw = await redisGet(userKey);
        let balance = 0;
        if (usuarioRaw) {
            const usuario = typeof usuarioRaw === 'string' ? JSON.parse(usuarioRaw) : usuarioRaw;
            balance = parseFloat(usuario.balance_soulgeist || 0);
        }

        // (log retirado: no exponer balances en la consola del servidor)

        return res.status(200).json({
            success: true,
            balance: balance
        });

    } catch (error) {
        console.error("❌ Error en obtener-balance:", error);
        return manejarError(res, error);
    }
}