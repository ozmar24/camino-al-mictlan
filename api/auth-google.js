import { OAuth2Client } from 'google-auth-library';
import {
    verificarTurnstile,
    verificarLimitePeticion,
    verificarOrigen,
    claveUsuario,
    redisGet,
    redisCmd,
    crearSesion,
    enviarAlertaTelegram,
    manejarError,
    obtenerIpLimpia
} from '../lib/seguridad.js';

async function handler(req, res) {
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
        if (!(await verificarLimitePeticion(req, { max: 20, ventanaSegundos: 60, prefijo: 'rl:auth-google' }))) {
            return res.status(429).json({ success: false, error: 'Demasiadas peticiones. Espera un momento.' });
        }

        const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
        if (!GOOGLE_CLIENT_ID) {
            return res.status(500).json({ success: false, error: 'Configuración de Google incompleta' });
        }

        const token = req.body?.token;
        if (!token) {
            return res.status(400).json({ success: false, error: 'Falta el token de Google' });
        }

        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const emailUsuario = payload.email.toLowerCase().trim();
        const userKey = claveUsuario(emailUsuario);

        // 1. Verificamos si el usuario YA existe
        const usuarioRaw = await redisGet(userKey);
        let usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

        if (!usuario) {
            // Registro nuevo: el puzzle es obligatorio SOLO aquí (el login no
            // lo pide). Validamos ANTES de incrementar para no quemar plazas
            // de fundador con intentos fallidos.
            const { turnstileToken } = req.body || {};
            if (!turnstileToken) {
                return res.status(400).json({ success: false, error: 'PUZZLE_REQUIRED' });
            }
            const isHuman = await verificarTurnstile(turnstileToken, ip);
            if (!isHuman) {
                return res.status(403).json({ success: false, error: 'PUZZLE_REQUIRED' });
            }

            // Consentimiento legal obligatorio para NUEVAS cuentas con Google.
            // Los logins de cuentas ya existentes ignoran este campo.
            const CLAUSULAS = 'He leído, soy mayor de 18 años y acepto los Términos del Servicio (https://caminoamictlan.com/Legal/terminos.html) y el Aviso de Privacidad (https://caminoamictlan.com/Legal/privacidad.html) de Camino al Mictlán.';
            if (req.body?.aceptaLegal !== CLAUSULAS) {
                return res.status(403).json({ success: false, error: 'CONSENT_REQUIRED' });
            }

            // 2. INCREMENTAMOS PRIMERO. Esto nos da el número de orden exacto.
            const incrRes = await redisCmd('INCR', 'contador_almas');
            const posicion = parseInt(incrRes?.result || 0);

            // 3. Calculamos premio BASADO en la posición atómica
            const premio = (posicion <= 50) ? 500 : 0;

            usuario = {
                email: emailUsuario,
                balance_soulgeist: premio,
                metodo: 'google',
                fecha_registro: new Date().toISOString()
            };

            // 4. Guardar usuario
            await redisCmd('SET', userKey, JSON.stringify(usuario));
            await enviarAlertaTelegram(`<b>🚀 Nuevo Registro #${posicion} en el Mictlán (Google)</b>\n👤 Email: ${emailUsuario}`, 'HTML');
        }

        const balanceSG = usuario.balance_soulgeist || 0;
        const sesion = await crearSesion(emailUsuario);

        return res.status(200).json({
            success: true,
            sesion: sesion,
            perfil: {
                email: emailUsuario,
                nombre: payload.name || 'Alma del Mictlán',
                balanceSG: balanceSG
            }
        });

    } catch (error) {
        console.error("Error en auth-google:", error);
        return manejarError(res, error);
    }
}

export default handler;