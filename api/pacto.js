// api/pacto.js
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!cleanUrl || !token) return res.status(500).json({ success: false, error: 'Configuración incompleta' });

    const { email, password, accion } = req.body || {};

    if (accion === 'estado_pacto') {
        // ... (mantén tu código de contador si lo tienes)
    }

    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan datos' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        const getRes = await fetch(`${cleanUrl}/get/${userKey}`, { headers: { Authorization: `Bearer ${token}` } });
        const getData = await getRes.json();
        let usuario = getData.result ? JSON.parse(getData.result) : null;

        if (accion === 'registro') {
            if (usuario) return res.status(409).json({ success: false, error: 'Email ya registrado' });

            const contadorRes = await fetch(`${cleanUrl}/get/contador_almas`, { headers: { Authorization: `Bearer ${token}` } });
            const contadorData = await contadorRes.json();
            const contador = parseInt(contadorData?.result || 0);

            const premio = contador < 50 ? 1000 : 0;
            const hash = await bcrypt.hash(password, 12);

            const nuevoUsuario = {
                email: emailNormalizado,
                password: hash,
                balance_soulgeist: premio,
                metodo: 'manual',
                fecha_registro: new Date().toISOString()
            };

            await fetch(`${cleanUrl}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(['SET', userKey, JSON.stringify(nuevoUsuario)])
            });

            if (contador < 50) {
                await fetch(`${cleanUrl}/incr/contador_almas`, { headers: { Authorization: `Bearer ${token}` } });
            }

            return res.status(200).json({ success: true, message: `Registro exitoso. ${premio ? 'Recibiste 1000 SG de bienvenida.' : ''}` });
        }

        // Login (mantén tu código actual)
        if (accion === 'login') {
            if (!usuario || usuario.metodo === 'google') return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });
            const valida = await bcrypt.compare(password, usuario.password || '');
            if (!valida) return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });

            return res.status(200).json({ success: true, usuario: { email: usuario.email, balance: parseFloat(usuario.balance_soulgeist || 0) } });
        }
    } catch (error) {
        console.error("Error en pacto:", error);
        return res.status(500).json({ success: false, error: 'Error interno' });
    }
}