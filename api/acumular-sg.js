import crypto from 'node:crypto';
import {
    autenticarPeticion,
    claveUsuario,
    redisCmd,
    redisGet,
    verificarLimitePeticion,
    verificarOrigen,
    manejarError,
    obtenerIpLimpia,
    estaIpBloqueada,
    registrarInfraccionIp
} from '../lib/seguridad.js';
import { obtenerTasas } from '../lib/tasas.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    try {
        // 0. Anti-bot: solo peticiones desde el sitio oficial
        if (!verificarOrigen(req)) {
            return res.status(403).json({ success: false, error: 'Origen no autorizado.' });
        }

        // 1. Rate Limiting
        const ip = obtenerIpLimpia(req);
        if (!(await verificarLimitePeticion(req, { max: 20, ventanaSegundos: 60, prefijo: 'rl:acumular' }))) {
            return res.status(429).json({ success: false, error: 'Demasiadas peticiones. Espera un momento.' });
        }

        // Lista negra global: IPs de bots reincidentes quedan fuera 24 h.
        if (await estaIpBloqueada(ip)) {
            return res.status(403).json({ success: false, error: 'Acceso denegado.' });
        }

        // 2. Sesión Real
        const email = await autenticarPeticion(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Sesión no válida. Vuelve a entrar al Mictlán.' });
        }

        const emailLimpio = email.toLowerCase().trim();
        const userKey = claveUsuario(emailLimpio);
        const { accion } = req.body || {};

        if (!accion) {
            return res.status(400).json({ success: false, error: 'Falta la acción.' });
        }

        // Cargar usuario
        const usuarioRaw = await redisGet(userKey);
        if (!usuarioRaw) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }
        let usuario = JSON.parse(usuarioRaw);

        if (accion === 'obtener_nonce') {
            // El servidor emite un nonce de un solo uso cuando el usuario ABRE
            // el portal de anuncios. Solo se puede reclamar presentando este
            // nonce, y cada uno vale para un único video.
            const nonce = crypto.randomBytes(16).toString('hex');
            await redisCmd('SET', `nonce_video:${emailLimpio}:${nonce}`, '1', 'EX', 600);
            return res.status(200).json({ success: true, nonce });
        }

        if (accion === 'sumar_ritual') {
            // ANTI-FUERZA-BRUTA: el reclamo exige un nonce emitido por el
            // servidor al abrir el portal (10 min de validez, un solo uso).
            // Sin nonce válido no hay SG, sin importar lo que mande la consola.
            const nonce = String(req.body?.nonce || '').trim();
            if (!nonce) {
                // Sello ausente = petición forjada (bot/script). Infracción a la IP.
                await registrarInfraccionIp(ip, 'Reclamo de video sin sello del portal');
                return res.status(403).json({ success: false, error: 'Ritual sin sello del portal. Abre el anuncio desde el botón oficial.' });
            }
            const claveNonce = `nonce_video:${emailLimpio}:${nonce}`;
            const nonceValido = await redisGet(claveNonce);
            if (!nonceValido) {
                // Sello falsificado/repetido/expirado = firma clara de bot.
                await registrarInfraccionIp(ip, 'Reclamo de video con sello inválido');
                return res.status(403).json({ success: false, error: 'Sello del portal inválido o expirado. Vuelve a abrir el anuncio.' });
            }
            await redisCmd('DEL', claveNonce); // un solo uso

            const llaveCooldown = `cooldown_video:${emailLimpio}`;
            const llaveLimiteDiario = `limite_diario_video:${emailLimpio}`;

            const cooldown = await redisGet(llaveCooldown);
            if (cooldown) {
                return res.status(429).json({ success: false, error: 'Espera 30 segundos.' });
            }

            const limiteDiario = await redisGet(llaveLimiteDiario);
            const videosVistosHoy = parseInt(limiteDiario || "0");

            if (videosVistosHoy >= 10) {
                return res.status(403).json({ success: false, error: 'Límite diario alcanzado.' });
            }

            await redisCmd('SET', llaveCooldown, 'activo', 'EX', 30);

            if (videosVistosHoy === 0) {
                await redisCmd('SET', llaveLimiteDiario, '1', 'EX', 86400);
            } else {
                await redisCmd('INCR', llaveLimiteDiario);
            }

            usuario.balance_soulgeist = parseFloat(usuario.balance_soulgeist || 0) + 10;

        } else if (accion === 'fusionar') {
            // FUSIÓN 100% SERVER-SIDE: el servidor descuenta el SG del balance
            // real y acredita la cripta con su propia tasa. El cliente no puede
            // alterar balance ni tumbas (anti-F12).
            const cripto = String(req.body.cripto || '').trim();
            const cantidadSG = parseFloat(req.body.cantidadSG);

            if (isNaN(cantidadSG) || cantidadSG <= 0) {
                return res.status(400).json({ success: false, error: 'Cantidad de SG inválida.' });
            }

            if (cripto === 'Soulgeist') {
                return res.status(400).json({ success: false, error: 'Soulgeist no es una cripta de destino válida.' });
            }

            const tasas = await obtenerTasas();
            const tasa = tasas?.[cripto]?.tasa;
            if (!(tasa > 0)) {
                return res.status(400).json({ success: false, error: 'Cripto de destino inválida.' });
            }

            const balanceActual = parseFloat(usuario.balance_soulgeist || 0);
            if (cantidadSG > balanceActual) {
                return res.status(400).json({
                    success: false,
                    error: `No tienes suficientes SG. Tienes ${balanceActual.toFixed(2)} SG.`
                });
            }

            const ganancia = +(cantidadSG * tasa).toFixed(8);
            if (!usuario.tumbas || typeof usuario.tumbas !== 'object') usuario.tumbas = {};
            usuario.tumbas[cripto] = +(parseFloat(usuario.tumbas[cripto] || 0) + ganancia).toFixed(8);
            usuario.balance_soulgeist = Math.floor(balanceActual - cantidadSG);

            await redisCmd('SET', userKey, JSON.stringify(usuario));

            return res.status(200).json({
                success: true,
                nuevoBalance: usuario.balance_soulgeist,
                ganancia,
                cripta: usuario.tumbas[cripto],
                tumbas: usuario.tumbas,
                mensaje: `Fusión completada: ${cantidadSG} SG → ${cripto}`
            });
        } else if (accion === 'cargar_tumbas') {
            return res.status(200).json({
                success: true,
                tumbas: usuario.tumbas || null
            });
        } else {
            return res.status(400).json({ success: false, error: 'Acción no reconocida' });
        }

        // Guardar usuario actualizado
        await redisCmd('SET', userKey, JSON.stringify(usuario));

        const nuevoBalanceFinal = Math.floor(parseFloat(usuario.balance_soulgeist || 0));

        return res.status(200).json({
            success: true,
            nuevoBalance: nuevoBalanceFinal,
            mensaje: accion === 'sumar_ritual' ? "+10 SG absorbidos" : "Balance actualizado correctamente"
        });

    } catch (e) {
        console.error("❌ Error en acumular-sg:", e);
        return manejarError(res, e);
    }
}