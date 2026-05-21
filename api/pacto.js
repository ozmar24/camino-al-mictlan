import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    const { accion, email, password, wallet } = req.body;

    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan datos esenciales.' });
    }

    const emailNormalizado = email.toLowerCase().trim();

    try {
        // ==================== REGISTRO ====================
        if (accion === 'registro') {
            if (!wallet || wallet.trim() === '') {
                return res.status(400).json({ success: false, error: 'Se requiere una dirección de Wallet para registrar.' });
            }

            const existe = await redis.hget(`usuario:${emailNormalizado}`, 'email');
            if (existe) {
                return res.status(400).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            }

            const nuevoUsuario = {
                email: emailNormalizado,
                password: password,           // TODO: Encriptar con bcrypt en producción
                wallet: wallet.trim(),
                balance_soulgeist: 0,
                creado_en: new Date().toISOString()
            };

            await redis.hmset(`usuario:${emailNormalizado}`, nuevoUsuario);

            return res.status(201).json({
                success: true,
                message: 'Pacto sellado. Tu alma ha sido registrada.',
                usuario: { 
                    email: emailNormalizado, 
                    wallet: nuevoUsuario.wallet 
                }
            });
        }

        // ==================== LOGIN ====================
        if (accion === 'login') {
            const usuario = await redis.hgetall(`usuario:${emailNormalizado}`);

            if (!usuario || Object.keys(usuario).length === 0) {
                return res.status(404).json({ success: false, error: 'El alma no se encuentra registrada.' });
            }

            if (usuario.password !== password) {
                return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Acceso concedido al Mictlán.',
                usuario: {
                    email: usuario.email,
                    wallet: usuario.wallet,
                    balance: parseFloat(usuario.balance_soulgeist || 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción desconocida.' });

    } catch (error) {
        console.error('Error en pacto.js:', error);
        return res.status(500).json({ success: false, error: 'Error interno del inframundo.' });
    }
}