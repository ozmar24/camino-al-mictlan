// api/auth-google.js
// REQUIERE: npm install google-auth-library
import { OAuth2Client } from 'google-auth-library';

export default async function handler(req, res) {

    // ── CORS dinámico ──────────────────────────────────────────────────────────
    const ORIGENES_PERMITIDOS = [
        'https://camino-al-mictlan.vercel.app',
        'http://localhost:3000'
    ];
    const origin = req.headers.origin;
    if (ORIGENES_PERMITIDOS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    // ── Validar variable de entorno ────────────────────────────────────────────
    // ✅ Client ID en variable de entorno, nunca hardcodeado en el código
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
        console.error('Falta GOOGLE_CLIENT_ID en las variables de entorno de Vercel.');
        return res.status(500).json({ success: false, error: 'Configuración del servidor incompleta.' });
    }

    // ── Extraer y validar token ────────────────────────────────────────────────
    let token;
    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        token = body?.token;
    } catch {
        return res.status(400).json({ success: false, error: 'Cuerpo de la petición inválido.' });
    }

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'El token místico está ausente.' });
    }

    // ── Verificar token con Google ─────────────────────────────────────────────
    try {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken:  token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        // Verificar que el token no esté expirado (Google lo verifica,
        // pero lo validamos explícitamente como capa extra)
        const ahora = Math.floor(Date.now() / 1000);
        if (payload.exp < ahora) {
            return res.status(401).json({ success: false, error: 'El token ha expirado. Vuelve a iniciar sesión.' });
        }

        // ✅ Datos garantizados por Google — no vienen del cliente
        const emailUsuario  = payload.email;
        const nombreUsuario = payload.name;
        const emailVerified = payload.email_verified;

        // Solo aceptar emails verificados por Google
        if (!emailVerified) {
            return res.status(401).json({ success: false, error: 'El email de Google no está verificado.' });
        }

        // ── Consultar balance en Redis ─────────────────────────────────────────
        const redisUrl   = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        let balanceSG = 0;

        if (redisUrl && redisToken) {
            try {
                const balanceKey = `user:balance:${emailUsuario.toLowerCase().trim()}`;
                const balanceRes = await fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${redisToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(['GET', balanceKey])
                }).then(r => r.json());

                balanceSG = parseInt(balanceRes?.result || 0);
            } catch (redisError) {
                // Si Redis falla, no bloqueamos el login — solo el balance queda en 0
                console.error('Error consultando balance en Redis:', redisError);
            }
        }

        return res.status(200).json({
            success: true,
            perfil: {
                email:      emailUsuario,
                nombre:     nombreUsuario,
                balanceSG
            }
        });

    } catch (error) {
        // Google lanza error si el token es inválido, manipulado o de otro proyecto
        console.error('Error validando token de Google:', error.message);
        return res.status(401).json({
            success: false,
            error: 'El inframundo rechazó la validación del token.'
        });
    }
}