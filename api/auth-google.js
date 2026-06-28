import { OAuth2Client } from 'google-auth-library';

// --- Función de verificación Turnstile ---
async function verifyTurnstile(token, ip) {
    const SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY;
    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: SECRET_KEY,
            response: token,
            remoteip: ip
        })
    });
    
    const outcome = await response.json();
    return outcome.success;
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
    if (req.method !== 'POST') { 
        return res.status(405).json({ success: false, error: 'Método no permitido' }); 
    }

    // 1. Extraemos tokens del body
    const { token, turnstileToken } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 2. Validación de seguridad (Turnstile)
    if (!turnstileToken) {
        return res.status(400).json({ success: false, error: 'Verificación humana faltante' });
    }

    const isHuman = await verifyTurnstile(turnstileToken, userIp);
    if (!isHuman) {
        return res.status(403).json({ success: false, error: 'Bot detectado o verificación fallida' });
    }

    // 3. Validación de Google Auth
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ success: false, error: 'Configuración de Google incompleta' });
    }

    if (!token) {
        return res.status(400).json({ success: false, error: 'Falta el token de Google' });
    }

    try {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const emailUsuario = payload.email.toLowerCase().trim();

        const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        let balanceSG = 0;

        if (redisUrl && redisToken) {
            const userKey = `usuario:${emailUsuario.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

            // Verificamos si el usuario YA existe
            const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const getData = await getRes.json();
            let usuario = getData.result ? JSON.parse(getData.result) : null;

            if (!usuario) {
                // INCREMENTAMOS CONTADOR (Solo si pasó Turnstile y Google Auth)
                const incrRes = await fetch(`${redisUrl}/incr/contador_almas`, {
                    headers: { Authorization: `Bearer ${redisToken}` }
                });
                const incrData = await incrRes.json();
                const posicion = parseInt(incrData?.result || 0);

                const premio = (posicion <= 50) ? 1000 : 0;

                usuario = {
                    email: emailUsuario,
                    balance_soulgeist: premio,
                    metodo: 'google',
                    fecha_registro: new Date().toISOString()
                };

                await fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${redisToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(['SET', userKey, JSON.stringify(usuario)])
                });
                
                await enviarAlertaTelegram(`<b>🚀 Nuevo Registro #${posicion} en el Mictlán</b>\n👤 Email: ${emailUsuario}`);
            }

            balanceSG = usuario.balance_soulgeist || 0;
        }

        return res.status(200).json({
            success: true,
            perfil: {
                email: emailUsuario,
                nombre: payload.name || 'Alma del Mictlán',
                balanceSG: balanceSG
            }
        });

    } catch (error) {
        console.error("Error en auth-google:", error);
        return res.status(500).json({ success: false, error: 'Error al verificar con Google' });
    }
}