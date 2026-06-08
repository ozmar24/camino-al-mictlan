import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const cleanUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!cleanUrl || !token) {
        return res.status(500).json({ success: false, error: 'Configuración Redis incompleta' });
    }

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método no permitido' });

    const { email, password, accion } = req.body || {};

    // 1. PRIMERO: Si es estado_pacto, se procesa aquí y termina (no necesita email ni pass)
    if (accion === 'estado_pacto') {
        const respuesta = await fetch(`${cleanUrl}/get/contador_almas`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        });
        const total = await respuesta.json();
        return res.status(200).json({ actual: parseInt(total?.result || 0), limite: 50 });
    }

    // 2. SEGUNDO: Para registro y login, SI necesitamos email y password
    if (!email || !password || !accion) {
        return res.status(400).json({ success: false, error: 'Faltan email, password o acción' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        const getRes = await fetch(`${cleanUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getData = await getRes.json();
        let usuario = null;
        if (getData.result) {
            usuario = typeof getData.result === 'string' ? JSON.parse(getData.result) : getData.result;
        }

        if (accion === 'registro') {
            if (usuario) return res.status(409).json({ success: false, error: 'Este email ya tiene un pacto activo.' });
            
            const resContador = await fetch(`${cleanUrl}/get/contador_almas`, { headers: { Authorization: `Bearer ${token}` }});
            const dataContador = await resContador.json();
            const cuentaActual = parseInt(dataContador?.result || 0);
            const premio = cuentaActual < 50 ? 1000 : 0;

            const hash = await bcrypt.hash(password, 12);
            const nuevoUsuario = { email: emailNormalizado, password: hash, balance_soulgeist: premio, creado_en: new Date().toISOString(), metodo: 'manual' };

            await fetch(`${cleanUrl}/set/${userKey}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevoUsuario)
            });
            await fetch(`${cleanUrl}/incr/contador_almas`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

            return res.status(200).json({ success: true, message: 'Pacto sellado. ' + (premio > 0 ? 'Has recibido 1,000 $SG.' : '') });
        }

        if (accion === 'login') {
            if (!usuario || usuario.metodo === 'google') return res.status(401).json({ success: false, error: 'Credenciales incorrectas o método inválido.' });
            const valida = await bcrypt.compare(password, usuario.password || '');
            if (!valida) return res.status(401).json({ success: false, error: 'Credenciales incorrectas.' });

            return res.status(200).json({ success: true, usuario: { email: usuario.email, balance: parseFloat(usuario.balance_soulgeist || 0) } });
        }

        return res.status(400).json({ success: false, error: 'Acción inválida' });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Error interno del inframundo.' });
    }
}