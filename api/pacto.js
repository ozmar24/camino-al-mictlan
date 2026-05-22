export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Content-Type', 'application/json');

    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
    
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        return res.status(200).json({ success: false, error: "ERROR: Conexión al Abismo no configurada." });
    }

    const cleanUrl = UPSTASH_REDIS_REST_URL.replace(/\/$/, "");

    if (req.method !== 'POST') {
        return res.status(200).json({ success: false, error: 'MÉTODO NO PERMITIDO' });
    }

    // === TOLERANCIA DE VARIABLES (Estilo Onyx + Soulgeist) ===
    const { email, password, accion, action } = req.body || {};
    const accionReal = accion || action; // Acepta tanto 'accion' como 'action'

    if (!email || !password || !accionReal) {
        return res.status(200).json({ success: false, error: 'FALTAN CREDENCIALES EN EL FORMULARIO.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
        // === CONSULTAR ALMA VÍA FETCH ===
        const urlGet = `${cleanUrl}/hgetall/${userKey}`;
        const checkUser = await fetch(urlGet, {
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }).then(r => r.json());

        const arrayResultado = checkUser.result || [];
        const usuario = {};
        if (Array.isArray(arrayResultado)) {
            for (let i = 0; i < arrayResultado.length; i += 2) {
                usuario[arrayResultado[i]] = arrayResultado[i + 1];
            }
        }

        const existeUsuario = Object.keys(usuario).length > 0;

        // === LÓGICA DE REGISTRO ===
        if (accionReal === 'registro') {
            if (existeUsuario) {
                return res.status(200).json({ success: false, error: 'ESTE EMAIL YA TIENE UN PACTO ACTIVO.' });
            }

            const nuevosDatos = [
                "email", emailNormalizado,
                "password", password,
                "wallet", "wallet-temp-" + Date.now(),
                "balance_soulgeist", "0",
                "creado_en", new Date().toISOString()
            ];

            const urlSet = `${cleanUrl}/hset/${userKey}`;
            const writeResponse = await fetch(urlSet, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevosDatos)
            });

            if (!writeResponse.ok) throw new Error("Fallo al escribir en las criptas de Redis");

            return res.status(200).json({
                success: true,
                message: 'Pacto sellado con éxito.'
            });
        } 

        // === LÓGICA DE LOGIN ===
        if (accionReal === 'login') {
            if (!existeUsuario) {
                return res.status(200).json({ success: false, error: 'IDENTIDAD NO REGISTRADA.' });
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
        console.error('ERROR CRÍTICO EN EL BACKEND:', error);
        return res.status(200).json({ 
            success: false, 
            error: 'Fallo interno en el abismo del servidor.' 
        });
    }
}