// api/pacto.js
// REQUIERE: npm install bcryptjs
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/json');

    // ── CORS dinámico ──────────────────────────────────────────────────────────
    const ORIGENES_PERMITIDOS = [
        'https://camino-al-mictlan.vercel.app',
        'https://camino-al-mictlan.game-files.crazygames.com'
    ];
    const origin = req.headers.origin;
    if (ORIGENES_PERMITIDOS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // ── Variables de entorno ───────────────────────────────────────────────────
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;

    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return res.status(500).json({ success: false, error: 'Conexión al Abismo no configurada.' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    const cleanUrl = UPSTASH_REDIS_REST_URL.replace(/\/$/, '');

    // ── Helpers Redis ──────────────────────────────────────────────────────────
    const redisGet = async (key) => {
        const r = await fetch(`${cleanUrl}/get/${key}`, {
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        });
        return r.json();
    };

    const redisSet = async (key, value, exSeconds = null) => {
        const url = exSeconds
            ? `${cleanUrl}/set/${key}/${encodeURIComponent(value)}/EX/${exSeconds}`
            : `${cleanUrl}/set/${key}`;

        const options = exSeconds
            ? { method: 'POST', headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` } }
            : {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(value)
              };

        return fetch(url, options).then(r => r.json());
    };

    const redisIncr = async (key) => {
        return fetch(`${cleanUrl}/incr/${key}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }).then(r => r.json());
    };

    const redisExpire = async (key, seconds) => {
        return fetch(`${cleanUrl}/expire/${key}/${seconds}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }).then(r => r.json());
    };

    // ── Validar body ───────────────────────────────────────────────────────────
    const { email, password, accion, action } = req.body || {};
    const accionReal = accion || action;

    if (!email || !password || !accionReal) {
        return res.status(400).json({ success: false, error: 'Faltan credenciales en el formulario.' });
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Formato de email inválido.' });
    }

    // Validación de contraseña (mínimo 8 caracteres)
    if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'La llave secreta debe tener al menos 8 caracteres.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._]/g, '_')}`;

    // ── Rate limiting (aplica solo a login) ───────────────────────────────────
    if (accionReal === 'login') {
        const intentosKey = `login:intentos:${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const intentosRes = await redisGet(intentosKey);
        const intentos = parseInt(intentosRes?.result || 0);

        if (intentos >= 5) {
            return res.status(429).json({
                success: false,
                error: 'Demasiados intentos fallidos. Espera 15 minutos antes de intentarlo de nuevo.'
            });
        }
    }

    try {
        // ── Leer usuario existente ─────────────────────────────────────────────
        const checkUser = await redisGet(userKey);
        let usuario = null;

        if (checkUser?.result) {
            try {
                usuario = typeof checkUser.result === 'string'
                    ? JSON.parse(checkUser.result)
                    : checkUser.result;
            } catch (e) {
                console.error('Error al parsear usuario:', e);
            }
        }

        const existeUsuario = usuario !== null;

        // ══════════════════════════════════════════════════════════════════════
        // REGISTRO
        // ══════════════════════════════════════════════════════════════════════
        if (accionReal === 'registro') {
            if (existeUsuario) {
                return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            }

            // ✅ Hash de contraseña — NUNCA se guarda en texto plano
            const passwordHash = await bcrypt.hash(password, 12);

            const nuevoUsuario = {
                email: emailNormalizado,
                password: passwordHash,               // hash, no texto plano
                wallet: `wallet-temp-${Date.now()}`,
                balance_soulgeist: '0',
                creado_en: new Date().toISOString()
            };

            await redisSet(userKey, JSON.stringify(nuevoUsuario));

            return res.status(200).json({
                success: true,
                message: 'Pacto sellado con éxito.'
            });
        }

        // ══════════════════════════════════════════════════════════════════════
        // LOGIN
        // ══════════════════════════════════════════════════════════════════════
        if (accionReal === 'login') {
            const intentosKey = `login:intentos:${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`;

            // Mismo mensaje para usuario inexistente o contraseña incorrecta
            // (evita enumeración de usuarios)
            if (!existeUsuario) {
                await redisIncr(intentosKey);
                await redisExpire(intentosKey, 900); // 15 minutos
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            // ✅ Comparación segura con bcrypt
            const passwordValida = await bcrypt.compare(password, usuario.password);

            if (!passwordValida) {
                await redisIncr(intentosKey);
                await redisExpire(intentosKey, 900);
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            // Login exitoso — limpiar contador de intentos
            await fetch(`${cleanUrl}/del/${intentosKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
            });

            return res.status(200).json({
                success: true,
                usuario: {
                    email: usuario.email,
                    balance: parseFloat(usuario.balance_soulgeist || 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción no válida.' });

    } catch (error) {
        console.error('Error crítico en pacto.js:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno. Intenta de nuevo.'
        });
    }
}