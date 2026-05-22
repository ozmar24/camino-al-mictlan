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

    const { email, password, accion, action } = req.body || {};
    const accionReal = accion || action;

    if (!email || !password || !accionReal) {
        return res.status(200).json({ success: false, error: 'FALTAN CREDENCIALES EN EL FORMULARIO.' });
    }

    const emailNormalizado = email.toLowerCase().trim();
    // Creamos la llave limpia idéntica al formato de Void Onyx
    const userKey = `usuario:${emailNormalizado.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
        // === 1. LEER USUARIO (Método String plano estilo Onyx) ===
        const urlGet = `${cleanUrl}/get/${userKey}`;
        const checkUser = await fetch(urlGet, {
            headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` }
        }).then(r => r.json());

        let usuario = null;
        
        // Si hay un resultado, lo parseamos de JSON a objeto JS
        if (checkUser && checkUser.result) {
            try {
                usuario = typeof checkUser.result === 'string' ? JSON.parse(checkUser.result) : checkUser.result;
            } catch (e) {
                console.error("Error al parsear usuario existente:", e);
            }
        }

        const existeUsuario = usuario !== null;

        // === 2. LÓGICA DE REGISTRO ===
        if (accionReal === 'registro') {
            if (existeUsuario) {
                return res.status(200).json({ success: false, error: 'ESTE EMAIL YA TIENE UN PACTO ACTIVO.' });
            }

            // Creamos el objeto del espíritu completo
            const nuevoUsuarioObjeto = {
                email: emailNormalizado,
                password: password,
                wallet: "wallet-temp-" + Date.now(),
                balance_soulgeist: "0",
                creado_en: new Date().toISOString()
            };

            // Lo guardamos directo como un String JSON usando /set/ igual que en Onyx
            const urlSet = `${cleanUrl}/set/${userKey}`;
            const writeResponse = await fetch(urlSet, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevoUsuarioObjeto) // Guardado directo sin arreglos raros
            });

            if (!writeResponse.ok) throw new Error("Fallo en la respuesta REST de Upstash");

            return res.status(200).json({
                success: true,
                message: 'Pacto sellado con éxito.'
            });
        } 

        // === 3. LÓGICA DE LOGIN ===
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
            error: 'Error interno de comunicación con las criptas de Upstash.' 
        });
    }
}