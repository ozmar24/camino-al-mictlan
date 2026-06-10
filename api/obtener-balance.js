export default async function handler(req, res) {
    // 1. El control de CORS y OPTIONS ya lo maneja next.config.js de forma global.
    // Permitimos tanto GET como POST según la lógica de tu aplicación.
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    let wallet = req.query.wallet || (req.body && req.body.wallet);
    if (!wallet) {
        return res.status(400).json({ success: false, error: "Falta la wallet/email" });
    }

    try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!redisUrl || !redisToken) {
            return res.status(500).json({ success: false, error: "Configuración Redis incompleta" });
        }

        const emailLimpio = wallet.toLowerCase().trim();
        const userKey = `usuario:${emailLimpio.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

        const respuesta = await fetch(`${redisUrl}/get/${userKey}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });

        const data = await respuesta.json();

        let balance = 0;
        if (data.result) {
            const usuario = typeof data.result === 'string' 
                ? JSON.parse(data.result) 
                : data.result;
            balance = parseFloat(usuario.balance_soulgeist || 0);
        }

        console.log(`✅ Balance consultado para ${userKey}: ${balance}`);

        return res.status(200).json({
            success: true,
            balance: balance
        });

    } catch (error) {
        console.error("❌ Error en obtener-balance:", error);
        return res.status(500).json({ 
            success: false, 
            error: "Error de conexión con el Inframundo" 
        });
    }
}
