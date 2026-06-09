// api/auth-google.js
import { OAuth2Client } from 'google-auth-library';

export default async function handler(req, res) {
    console.log("🔥 auth-google llamado");

    // CORS básico
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (!GOOGLE_CLIENT_ID) {
        console.error("❌ Falta GOOGLE_CLIENT_ID en Vercel");
        return res.status(500).json({ success: false, error: 'Configuración de Google incompleta' });
    }

    let token;
    try {
        token = req.body?.token;
    } catch (e) {
        return res.status(400).json({ success: false, error: 'Token inválido' });
    }

    if (!token) {
        return res.status(400).json({ success: false, error: 'Falta token de Google' });
    }

    try {
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email.toLowerCase().trim();

        // TODO: Aquí puedes agregar la lógica de Redis más adelante
        // Por ahora devolvemos éxito básico para que entre
        return res.status(200).json({
            success: true,
            perfil: {
                email: email,
                nombre: payload.name || 'Alma del Mictlán',
                balanceSG: 0
            }
        });

    } catch (error) {
        console.error("❌ Error en Google Auth:", error);
        return res.status(500).json({ success: false, error: 'Error al verificar con Google' });
    }
}