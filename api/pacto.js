import bcrypt from 'bcryptjs';

// --- Funciones Auxiliares ---
async function enviarAlertaTelegram(mensaje) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: mensaje, parse_mode: 'HTML' })
        });
    } catch (error) { console.error("Error Telegram:", error); }
}

async function validarTurnstile(token) {
    const SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY;
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: SECRET_KEY, response: token })
    });
    const data = await response.json();
    return data.success;
}

// --- Handler Principal ---
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!cleanUrl || !token) return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });

    const { email, password, accion, cfToken } = req.body || {}; // cfToken viene del frontend

    // Validación de origen
    const origenPeticion = req.headers.origin || req.headers.referer;
    if (!origenPeticion || (!origenPeticion.includes("caminoamictlan.com") && !origenPeticion.includes("localhost"))) {
        return res.status(403).json({ success: false, error: 'Acceso denegado.' });
    }

    if (accion === 'estado_pacto') {
        const resCont = await fetch(`${cleanUrl}/get/contador_almas`, { headers: { Authorization: `Bearer ${token}` }});
        const data = await resCont.json();
        return res.status(200).json({ success: true, actual: parseInt(data?.result || 0), limite: 50 });
    }

    if (!email || !password || !accion) return res.status(400).json({ success: false, error: 'Faltan datos' });

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        const getRes = await fetch(`${cleanUrl}/get/${userKey}`, { headers: { Authorization: `Bearer ${token}` }});
        const getData = await getRes.json();
        let usuario = getData.result ? JSON.parse(getData.result) : null;

        // REGISTRO
        if (accion === 'registro') {
            // 1. VALIDACIÓN DE SEGURIDAD (Turnstile)
            if (!cfToken || !(await validarTurnstile(cfToken))) {
                return res.status(403).json({ success: false, error: 'Verificación humana fallida.' });
            }

            if (usuario) return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });

            const incrRes = await fetch(`${cleanUrl}/incr/contador_almas`, { headers: { Authorization: `Bearer ${token}` }});
            const incrData = await incrRes.json();
            const numeroUsuario = parseInt(incrData?.result || 0);
            const premio = numeroUsuario <= 50 ? 1000 : 0;
            const hash = await bcrypt.hash(password, 12);

            await fetch(`${cleanUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(['SET', userKey, JSON.stringify({ email: emailNormalizado, password: hash, balance_soulgeist: premio, creado_en: new Date().toISOString(), metodo: 'manual' })])
            });
            
            await enviarAlertaTelegram(`<b>👤 Nuevo Pacto (${numeroUsuario}/50):</b> ${emailNormalizado}`);
            return res.status(200).json({ success: true, message: 'Pacto sellado.' });
        }

        // LOGIN
        if (accion === 'login') {
            if (!usuario || usuario.metodo === 'google') return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            const valida = await bcrypt.compare(password, usuario.password || '');
            if (!valida) return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            return res.status(200).json({ success: true, usuario: { email: usuario.email, balance: parseFloat(usuario.balance_soulgeist ?? 0) }});
        }

        return res.status(400).json({ success: false, error: 'Acción inválida' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error interno.' });
    }
}