// api/pacto.js
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    const { email, password, accion } = req.body || {};
    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan email, password o acción' });
    }

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!cleanUrl || !token) {
        return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        // GET usuario
        const getRes = await fetch(`${cleanUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getData = await getRes.json();
        let usuario = null;
        if (getData.result) {
            usuario = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
        }

        // REGISTRO
        if (accion === 'registro') {
            if (usuario) {
                return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            }

            const hash = await bcrypt.hash(password, 12);
            const nuevoUsuario = {
                email: emailNormalizado,
                password: hash,
                balance_soulgeist: 0,
                creado_en: new Date().toISOString(),
                metodo: 'manual'
            };

            await fetch(`${cleanUrl}/set/${userKey}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevoUsuario)
            });

            return res.status(200).json({ success: true, message: 'Pacto sellado con éxito.' });
        }

        // LOGIN
        if (accion === 'login') {
            if (!usuario) {
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }
            if (usuario.metodo === 'google') {
                return res.status(401).json({ success: false, error: 'Usa el botón de Google.' });
            }

            const valida = await bcrypt.compare(password, usuario.password || '');
            if (!valida) {
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            return res.status(200).json({
                success: true,
                usuario: {
                    email: usuario.email,
                    balance: parseFloat(usuario.balance_soulgeist || 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción inválida' });

    } catch (error) {
        console.error("Error en /api/pacto:", error);
        return res.status(500).json({ success: false, error: 'Error interno del inframundo.' });
    }
}