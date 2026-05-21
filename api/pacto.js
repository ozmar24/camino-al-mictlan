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

    // 1. Extraemos los datos de forma segura (añadimos 'correo' por si el frontend lo manda en español)
    const { accion, email, correo, password, wallet } = req.body || {};
    const emailRecibido = email || correo;

    // 2. CORRECCIÓN CLAVE: Validamos primero si existen antes de aplicar funciones de texto
    if (!emailRecibido || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan datos esenciales (Email, Contraseña o Acción).' });
    }

    // 3. Ahora que estamos 100% seguros de que hay texto, normalizamos sin riesgo de romper el servidor
    const emailNormalizado = emailRecibido.toLowerCase().trim();

    try {
        console.log(`[pacto] Acción: ${accion} | Email: ${emailNormalizado}`);

        if (accion === 'registro') {
            if (!wallet) {
                return res.status(400).json({ success: false, error: 'Se requiere wallet para registro.' });
            }

            const existe = await redis.hget(`usuario:${emailNormalizado}`, 'email');
            if (existe) {
                return res.status(400).json({ success: false, error: 'Este email ya está registrado.' });
            }

            await redis.hset(`usuario:${emailNormalizado}`, {
                email: emailNormalizado,
                password: password,
                wallet: wallet.trim(),
                balance_soulgeist: "0",
                creado_en: new Date().toISOString()
            });

            console.log(`[pacto] Registro exitoso: ${emailNormalizado}`);

            return res.status(201).json({
                success: true,
                message: 'Pacto sellado con éxito.',
                usuario: { email: emailNormalizado, wallet: wallet.trim(), balance: 0 }
            });
        } 

        // LOGIN
        if (accion === 'login') {
            const usuario = await redis.hgetall(`usuario:${emailNormalizado}`);

            if (!usuario || Object.keys(usuario).length === 0) {
                return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
            }

            if (usuario.password !== password) {
                return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Acceso concedido.',
                usuario: {
                    email: usuario.email,
                    wallet: usuario.wallet,
                    balance: parseFloat(usuario.balance_soulgeist || 0)
                }
            });
        }

        return res.status(400).json({ success: false, error: 'Acción inválida.' });

    } catch (error) {
        console.error('ERROR CRÍTICO en pacto.js:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor.' 
        });
    }
}