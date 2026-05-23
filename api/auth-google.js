import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client("25093626964-mep6ihpq1gamn8hm59q2cf15rm8gd0ao.apps.googleusercontent.com");

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({ idToken: token, audience: "..." });
        const payload = ticket.getPayload();
        
        const emailNormalizado = payload.email.toLowerCase().trim();
        const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
        const cleanUrl = UPSTASH_REDIS_REST_URL.replace(/\/$/, "");

        // 1. Verificamos si el usuario ya existe en Redis
        const checkUser = await fetch(`${cleanUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }).then(r => r.json());

        // 2. Si NO existe (es nuevo), lo creamos igual que en pacto.js
        if (!checkUser.result) {
            const nuevoUsuario = {
                email: emailNormalizado,
                nombre: payload.name,
                balance_soulgeist: "0",
                creado_en: new Date().toISOString()
            };
            
            await fetch(`${cleanUrl}/set/${userKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoUsuario)
            });
        }

        // 3. Devolvemos el perfil (ya sea recién creado o existente)
        return res.status(200).json({
            success: true,
            perfil: {
                email: emailNormalizado,
                balance: 0 // Aquí el frontend lo recibirá y hará el fetch real a Redis
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, error: 'El inframundo rechazó el acceso.' });
    }
}