// api/auth-google.js
import { OAuth2Client } from 'google-auth-library';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

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

            // Verificar si el usuario ya existe
            const getRes = await fetch(`${redisUrl}/get/${userKey}`, {
                headers: { Authorization: `Bearer ${redisToken}` }
            });
            const getData = await getRes.json();
            let usuario = getData.result ? JSON.parse(getData.result) : null;

            if (!usuario) {
                // === BONO PARA PRIMEROS 50 USUARIOS ===
                const contadorRes = await fetch(`${redisUrl}/get/contador_almas`, {
                    headers: { Authorization: `Bearer ${redisToken}` }
                });
                const contadorData = await contadorRes.json();
                const contadorActual = parseInt(contadorData?.result || 0);

                usuario = {
                    email: emailUsuario,
                    balance_soulgeist: (contadorActual < 50) ? 1000 : 0,
                    metodo: 'google',
                    fecha_registro: new Date().toISOString()
                };

                // Guardar usuario nuevo
                await fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${redisToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(['SET', userKey, JSON.stringify(usuario)])
                });

                // Incrementar contador si es de los primeros 50
                if (contadorActual < 50) {
                    await fetch(`${redisUrl}/incr/contador_almas`, {
                        headers: { Authorization: `Bearer ${redisToken}` }
                    });
                }
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