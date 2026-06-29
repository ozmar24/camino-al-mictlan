import bcrypt from 'bcryptjs';

async function verifyTurnstile(token, ip) {
    const SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY;
    if (!SECRET_KEY) return true; // Si no hay key configurada, no bloquear
    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: SECRET_KEY, response: token, remoteip: ip })
        });
        const data = await res.json();
        return data.success === true;
    } catch {
        return true; // Si falla la verificación, no bloquear al usuario
    }
}

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
    } catch (error) {
        console.error("Error enviando alerta a Telegram:", error);
    }
}

export default async function handler(req, res) {
    // 1. El control de CORS y OPTIONS ya lo maneja next.config.js de forma global.
    // Solo validamos que el método HTTP que entra a esta API sea estrictamente POST.
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!cleanUrl || !token) {
        return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });
    }
    
    const origenPeticion = req.headers.origin || req.headers.referer;
    const MI_DOMINIO = "caminoamictlan.com"; 

    if (!origenPeticion || (!origenPeticion.includes(MI_DOMINIO) && !origenPeticion.includes("localhost"))) {
        return res.status(403).json({ success: false, error: 'Acceso denegado desde portales externos.' });
    }

    const { email, password, accion } = req.body || {};

    // Estado del contador de almas (opcional)
    if (accion === 'estado_pacto') {
        try {
            const resCont = await fetch(`${cleanUrl}/get/contador_almas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await resCont.json();
            return res.status(200).json({ 
                success: true, 
                actual: parseInt(data?.result || 0), 
                limite: 50 
            });
        } catch (e) {
            return res.status(200).json({ success: true, actual: 0, limite: 50 });
        }
    }

    // Registro y Login necesitan email y password
    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan email, password o acción' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        // Obtener usuario
        const getRes = await fetch(`${cleanUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getData = await getRes.json();
        let usuario = getData.result ? JSON.parse(getData.result) : null;

        
        // ==================== REGISTRO OPTIMIZADO ====================
if (accion === 'registro') {
    if (usuario) {
        return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
    }

    // Validar Turnstile para registro manual
    const { turnstileToken } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    if (!turnstileToken) {
        return res.status(400).json({ success: false, error: 'Debes completar el puzzle de seguridad.' });
    }
    const isHuman = await verifyTurnstile(turnstileToken, userIp);
    if (!isHuman) {
        return res.status(403).json({ success: false, error: 'Verificación de seguridad fallida. Intenta de nuevo.' });
    }

    // 1. Incrementamos el contador ANTES de hacer nada más.
    // Esto nos da el número único y exacto que le corresponde a este usuario.
    const incrRes = await fetch(`${cleanUrl}/incr/contador_almas`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const incrData = await incrRes.json();
    const numeroUsuario = parseInt(incrData?.result || 0);

    // 2. Si el número es mayor a 50, ya no hay premio.
    const premio = numeroUsuario <= 50 ? 1000 : 0;
    
    // Si llegara a ser mayor a 50, quizás quieras decrementar o simplemente dejarlo ahí
    // pero el registro ya está protegido.

    const hash = await bcrypt.hash(password, 12);

    const nuevoUsuario = {
        email: emailNormalizado,
        password: hash,
        balance_soulgeist: premio,
        creado_en: new Date().toISOString(),
        metodo: 'manual'
    };

    // 3. Guardamos al usuario
    await fetch(`${cleanUrl}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', userKey, JSON.stringify(nuevoUsuario)])
    });
    
    await enviarAlertaTelegram(`<b>👤 Nuevo Pacto (${numeroUsuario}/50):</b> ${emailNormalizado}`);

    return res.status(200).json({ 
        success: true, 
        message: `Pacto sellado. ${premio > 0 ? 'Has recibido 1,000 SG de bienvenida.' : ''}` 
    });
}

        // ==================== LOGIN ====================
        if (accion === 'login') {
            if (!usuario || usuario.metodo === 'google') {
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

	    if (usuario.metodo === 'google') {
            return res.status(401).json({ success: false, error: 'Usa el acceso con Google.' });
    	    }

            const valida = await bcrypt.compare(password, usuario.password || '');
            if (!valida) {
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            return res.status(200).json({
                success: true,
                usuario: {
                    email: usuario.email,
                    balance: parseFloat(usuario.balance_soulgeist ?? 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción inválida' });

    } catch (error) {
        console.error("Error en pacto:", error);
        return res.status(500).json({ success: false, error: 'Error interno del inframundo.' });
    }
}