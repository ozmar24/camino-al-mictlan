import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'MÉTODO NO PERMITIDO' });
    }

    // Extraemos las credenciales tal y como viajan desde el cuerpo limpio
    const { email, password, accion } = req.body || {};

    if (!email || !password || !accion) {
        return res.status(200).json({ success: false, error: 'FALTAN CREDENCIALES ESENCIALES.' });
    }

    // Usamos el limpiador de textos idéntico al de Void Onyx para evitar fallas de símbolos o minúsculas
    const emailNormalizado = email.toLowerCase().trim();

    try {
        // --- LÓGICA DE REGISTRO MANUAL ---
        if (accion === 'registro') {
            // Buscamos si ya existe el rastro usando la estructura de datos original
            const existe = await redis.hget(`usuario:${emailNormalizado}`, 'email');
            
            if (existe) {
                return res.status(200).json({ success: false, error: 'ESTA IDENTIDAD YA EXISTE.' });
            }

            // Sellar el nuevo registro
            await redis.hset(`usuario:${emailNormalizado}`, {
                email: emailNormalizado,
                password: password,
                wallet: "wallet-temp-" + Date.now(),
                balance_soulgeist: "0",
                creado_en: new Date().toISOString()
            });

            return res.status(200).json({
                success: true,
                message: 'Pacto sellado con éxito.'
            });
        } 

        // --- LÓGICA DE LOGIN ---
        if (accion === 'login') {
            const usuario = await redis.hgetall(`usuario:${emailNormalizado}`);

            if (!usuario || Object.keys(usuario).length === 0) {
                return res.status(200).json({ success: false, error: 'IDENTIDAD NO ENCONTRADA.' });
            }

            if (usuario.password !== password) {
                return res.status(200).json({ success: false, error: 'CONTRASEÑA INCORRECTA.' });
            }

            return res.status(200).json({
                success: true,
                usuario: {
                    email: usuario.email,
                    balance: parseFloat(usuario.balance_soulgeist || 0)
                }
            });
        }

        return res.status(200).json({ success: false, error: 'ACCCIÓN NO VÁLIDA.' });

    } catch (error) {
        console.error('ERROR CRÍTICO en pacto.js:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno en el abismo del servidor.' 
        });
    }
}