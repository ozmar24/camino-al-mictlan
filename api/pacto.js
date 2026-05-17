import { Redis } from '@upstash/redis';

// Inicializamos la conexión con el inframundo (Redis)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // Forzar cabeceras de seguridad y evitar respuestas en caché
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido por las deidades.' });
    }

    const { accion, email, password, wallet } = req.body;

    // Validaciones básicas de entrada
    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan datos esenciales para sellar el pacto.' });
    }

    // Normalizar el email para evitar duplicados por formato
    const emailNormalizado = email.toLowerCase().trim();

    try {
        // --- CASO 1: REGISTRO DE NUEVA ALMA ---
        if (accion === 'registro') {
            if (!wallet || wallet.trim() === '') {
                return res.status(400).json({ success: false, error: 'Se requiere una dirección de Wallet para el tributo.' });
            }

            // Verificar si el email ya sacrificó su alma antes
            const usuarioExistente = await redis.hget(`usuario:${emailNormalizado}`, 'email');
            if (usuarioExistente) {
                return res.status(400).json({ success: false, error: 'Esta alma ya está vinculada a un pacto activo.' });
            }

            // Estructura inicial del usuario en Redis
            const nuevoUsuario = {
                email: emailNormalizado,
                password: password, // NOTA: Para producción real, considera usar bcrypt para encriptarla
                wallet: wallet.trim(),
                balance_soulgeist: 0, // Inicia en ceros en el flujo central
                creado_en: new Date().toISOString()
            };

            // Guardar el hash del usuario en Redis
            await redis.hmset(`usuario:${emailNormalizado}`, nuevoUsuario);

            return res.status(201).json({
                success: true,
                message: 'Pacto sellado con éxito. Tu alma ha sido registrada.',
                usuario: { email: emailNormalizado, wallet: nuevoUsuario.wallet }
            });
        }

        // --- CASO 2: INICIO DE SESIÓN (LOGIN) ---
        if (accion === 'login') {
            const usuario = await redis.hgetall(`usuario:${emailNormalizado}`);

            if (!usuario || Object.keys(usuario).length === 0) {
                return res.status(404).json({ success: false, error: 'El alma no se encuentra en el registro del Mictlán.' });
            }

            // Validar contraseña rudimentaria
            if (usuario.password !== password) {
                return res.status(401).json({ success: false, error: 'Contraseña incorrecta. Las deidades rechazan tu acceso.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Acceso concedido al inframundo.',
                usuario: {
                    email: usuario.email,
                    wallet: usuario.wallet,
                    balance: parseFloat(usuario.balance_soulgeist || 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción mística desconocida.' });

    } catch (error) {
        console.error('Error en el Mictlán Backend:', error);
        return res.status(500).json({ success: false, error: 'El servidor del inframundo ha colapsado temporalmente.' });
    }
}