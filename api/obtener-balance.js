// api/obtener-balance.js
export default async function handler(req, res) {
    // 1. Definición de orígenes permitidos
    const ORIGENES_PERMITIDOS = [
        'https://camino-al-mictlan.vercel.app',
        'http://localhost:3000'
    ];

    const origin = req.headers.origin;

    // 2. Bloqueo estricto de origen
    if (!origin || !ORIGENES_PERMITIDOS.includes(origin)) {
        return res.status(403).json({ success: false, error: 'Origen no autorizado.' });
    }

    // 3. CORS seguro (sin asterisco)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

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