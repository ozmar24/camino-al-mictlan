import { OAuth2Client } from 'google-auth-library';

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
    if (req.method !== 'POST') { 
        return res.status(405).json({ success: false, error: 'Método no permitido' }); 
    }
    
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ success: false, error: 'Configuración de Google incompleta' });
    }

    let token;
    try {
        token = req.body?.token;
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Token inválido' });
    }

    if (!token) {
        return res.status(400).json({ success: false, error: 'Falta el token de Google' });
    }

    const { turnstileToken } = req.body || {};
    const userIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

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

            const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const getData = await getRes.json();
            let usuario = getData.result ? JSON.parse(getData.result) : null;

            if (!usuario) {
                // ES UN REGISTRO NUEVO -> validamos el puzzle, igual que en pacto.js
                if (!turnstileToken) {
                    return res.status(400).json({ success: false, error: 'PUZZLE_REQUIRED' });
                }
                const isHuman = await verifyTurnstile(turnstileToken, userIp);
                if (!isHuman) {
                    return res.status(403).json({ success: false, error: 'PUZZLE_REQUIRED' });
                }

                const incrRes = await fetch(`${redisUrl}/incr/contador_almas`, {
                    headers: { Authorization: `Bearer ${redisToken}` }
                });
                const incrData = await incrRes.json();
                const posicion = parseInt(incrData?.result || 0);

                const premio = (posicion <= 50) ? 500 : 0;

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