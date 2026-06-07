// api/pacto.js
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    const { email, password, accion } = req.body || {};
    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });
    }

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!cleanUrl || !token) {
        return res.status(500).json({ success: false, error: 'Configuración de Redis incompleta.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        // Helper Redis
        const redisFetch = async (cmd) => {
            const r = await fetch(`${cleanUrl}`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cmd)
            });
            return r.json();
        };

        const usuarioRaw = await redisFetch(["GET", userKey]);
        const usuario = usuarioRaw?.result ? 
            (typeof usuarioRaw.result === 'string' ? JSON.parse(usuarioRaw.result) : usuarioRaw.result) 
            : null;

        const accionReal = accion;

        // REGISTRO
        if (accionReal === 'registro') {
            if (usuario) {
                return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            }

            const passwordHash = await bcrypt.hash(password, 12);
            const nuevoUsuario = {
                email: emailNormalizado,
                password: passwordHash,
                balance_soulgeist: 0,
                creado_en: new Date().toISOString(),
                metodo: 'manual'
            };

            await redisFetch(["SET", userKey, JSON.stringify(nuevoUsuario)]);
            return res.status(200).json({ success: true, message: 'Pacto sellado con éxito.' });
        }

        // LOGIN
        if (accionReal === 'login') {
            if (!usuario) {
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            }

            if (usuario.metodo === 'google') {
                return res.status(401).json({ success: false, error: 'Usa el botón de Google.' });
            }

            const passwordValida = await bcrypt.compare(password, usuario.password);
            if (!passwordValida) {
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

    } catch (error) {
        console.error("Error en pacto:", error);
        return res.status(500).json({ success: false, error: 'Error interno del inframundo.' });
    }
}