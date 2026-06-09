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

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!cleanUrl || !token) {
        return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });
    }

    const { email, password, accion } = req.body || {};

    // Estado del contador de almas (opcional)
    if (accion === 'estado_pacto') {
        try {
            const resCont = await fetch(`${cleanUrl}/get/contador_almas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await resCont.json();
            return res.status(200).json({ 
                success: true, 
                actual: parseInt(data?.result || 0), 
                limite: 50 
            });
        } catch (e) {
            return res.status(200).json({ success: true, actual: 0, limite: 50 });
        }
    }

    // Registro y Login necesitan email y password
    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan email, password o acción' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        // Obtener usuario
        const getRes = await fetch(`${cleanUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getData = await getRes.json();
        let usuario = getData.result ? JSON.parse(getData.result) : null;

        // ==================== REGISTRO ====================
        if (accion === 'registro') {
            if (usuario) {
                return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            }

            const contadorRes = await fetch(`${cleanUrl}/get/contador_almas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const contadorData = await contadorRes.json();
            const cuentaActual = parseInt(contadorData?.result || 0);

            const premio = cuentaActual < 50 ? 1000 : 0;
            const hash = await bcrypt.hash(password, 12);

            const nuevoUsuario = {
                email: emailNormalizado,
                password: hash,
                balance_soulgeist: premio,
                creado_en: new Date().toISOString(),
                metodo: 'manual'
            };

            // Guardar
            await fetch(`${cleanUrl}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['SET', userKey, JSON.stringify(nuevoUsuario)])
            });

            // Incrementar contador
            if (cuentaActual < 50) {
                await fetch(`${cleanUrl}/incr/contador_almas`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            return res.status(200).json({ 
                success: true, 
                message: `Pacto sellado. ${premio > 0 ? 'Has recibido 1,000 SG de bienvenida.' : ''}` 
            });
        }

        // ==================== LOGIN ====================
        if (accion === 'login') {
            if (!usuario || usuario.metodo === 'google') {
                return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
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
        console.error("Error en pacto:", error);
        return res.status(500).json({ success: false, error: 'Error interno del inframundo.' });
    }
}