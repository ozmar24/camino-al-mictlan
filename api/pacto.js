import bcrypt from 'bcryptjs';
import {
    verificarTurnstile,
    enviarAlertaTelegram,
    verificarLimitePeticion,
    verificarOrigen,
    claveUsuario,
    sanitizarIdentidad,
    redisGet,
    redisCmd,
    crearSesion,
    manejarError,
    obtenerIpLimpia,
    verificarBloqueoLogin,
    registrarIntentoFallidoLogin,
    limpiarIntentosLogin
} from '../lib/seguridad.js';

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
        if (!(await verificarLimitePeticion(req, { max: 10, ventanaSegundos: 60, prefijo: 'rl:pacto' }))) {
            return res.status(429).json({ success: false, error: 'Demasiadas peticiones. Por favor, espera un momento.' });
        }

        const { email, password, accion } = req.body || {};

        // Estado del contador de almas (opcional)
        if (accion === 'estado_pacto') {
            const data = await redisGet('contador_almas');
            return res.status(200).json({
                success: true,
                actual: parseInt(data || 0),
                limite: 50
            });
        }

        // Registro y Login necesitan email y password
        if (!email || !password || !accion) {
            return res.status(400).json({ success: false, error: 'Faltan email, password o acción' });
        }

        const emailSani = sanitizarIdentidad(email);
        if (!emailSani) {
            return res.status(400).json({ success: false, error: 'El formato del email es inválido.' });
        }
        const emailNormalizado = emailSani.toLowerCase().trim();
        const userKey = claveUsuario(emailNormalizado);

        // Obtener usuario
        const usuarioRaw = await redisGet(userKey);
        let usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null;

        // ==================== REGISTRO OPTIMIZADO ====================
        if (accion === 'registro') {
            if (usuario) {
                return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            }

            // Validar Turnstile para registro manual (código unificado con auth-google)
            const { turnstileToken } = req.body;
            if (!turnstileToken) {
                return res.status(400).json({ success: false, error: 'PUZZLE_REQUIRED' });
            }
            const isHuman = await verificarTurnstile(turnstileToken, ip);
            if (!isHuman) {
                return res.status(403).json({ success: false, error: 'PUZZLE_REQUIRED' });
            }

            // Consentimiento legal obligatorio: solo adultos (18+) que acepten
            // los Términos del Servicio y el Aviso de Privacidad verbalizados.
            const CLAUSULAS = 'He leído, soy mayor de 18 años y acepto los Términos del Servicio (https://www.caminoamictlan.com/Legal/terminos.html) y el Aviso de Privacidad (https://www.caminoamictlan.com/Legal/privacidad.html) de Camino al Mictlán.';
            if (req.body?.aceptaLegal !== CLAUSULAS) {
                return res.status(403).json({ success: false, error: 'CONSENT_REQUIRED' });
            }

            // 1. Incrementamos el contador ANTES de hacer nada más.
            const incrRes = await redisCmd('INCR', 'contador_almas');
            const numeroUsuario = parseInt(incrRes?.result || 0);

            // 2. Si el número es mayor a 50, ya no hay premio.
            const premio = numeroUsuario <= 50 ? 500 : 0;

            const hash = await bcrypt.hash(password, 12);

            const nuevoUsuario = {
                email: emailNormalizado,
                password: hash,
                balance_soulgeist: premio,
                creado_en: new Date().toISOString(),
                metodo: 'manual'
            };

            // 3. Guardamos al usuario
            await redisCmd('SET', userKey, JSON.stringify(nuevoUsuario));

            await enviarAlertaTelegram(`<b>👤 Nuevo Pacto (${numeroUsuario}/50):</b> ${emailNormalizado}`, 'HTML');

            return res.status(200).json({
                success: true,
                message: `Pacto sellado. ${premio > 0 ? 'Has recibido 500 SG de bienvenida.' : ''}`
            });
        }

        // ==================== LOGIN ====================
        if (accion === 'login') {
            // Sin puzzle en el login: el token de Turnstile es de un solo uso
            // y expira, lo que bloqueaba inicios de sesión legítimos.

            // Bloqueo por demasiados intentos fallidos (5 fallos → 15 minutos)
            if (await verificarBloqueoLogin(emailNormalizado, ip)) {
                return res.status(429).json({
                    success: false,
                    error: 'Demasiados intentos fallidos. Tu pacto queda bloqueado por 15 minutos.'
                });
            }

            if (!usuario || usuario.metodo === 'google') {
                await registrarIntentoFallidoLogin(emailNormalizado, ip);
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            const valida = await bcrypt.compare(password, usuario.password || '');
            if (!valida) {
                await registrarIntentoFallidoLogin(emailNormalizado, ip);
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            // Login exitoso: se limpian los intentos fallidos acumulados
            await limpiarIntentosLogin(emailNormalizado, ip);

            const sesion = await crearSesion(emailNormalizado);

            return res.status(200).json({
                success: true,
                sesion: sesion,
                usuario: {
                    email: usuario.email,
                    balance: parseFloat(usuario.balance_soulgeist ?? 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción inválida' });

    } catch (error) {
        console.error("Error en pacto:", error);
        return manejarError(res, error);
    }
}