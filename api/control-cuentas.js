// api/control-cuentas.js - Eliminacion de cuenta del portal
// La identidad del alma es el email con el que entro (misma clave que auth-google.js)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo no permitido.' });
    }

    const redisUrl   = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Redis no configurado.' });
    }

    const identidad = (req.body?.identidad || req.body?.email || '').toLowerCase().trim();

    if (!identidad) {
        return res.status(400).json({ error: 'Falta la identidad del alma.' });
    }

    // Misma convencion de clave que auth-google / acumular-sg / reclamar
    const userKey = `usuario:${identidad.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

    try {
        const r = await fetch(redisUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(['DEL', userKey])
        });

        if (!r.ok) {
            throw new Error(`Upstash respondio ${r.status}`);
        }

        return res.status(200).json({
            message: 'Perfil eliminado correctamente. Tus tokens en tu billetera siguen siendo tuyos.'
        });

    } catch (error) {
        console.error('Error en control-cuentas:', error);
        return res.status(500).json({ error: 'Error al conectar con el inframundo.' });
    }
}