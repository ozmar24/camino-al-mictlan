export default async function handler(req, res) {
    // CORS básico
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { wallet } = req.query;

    if (!wallet) {
        return res.status(400).json({ error: "Falta la wallet" });
    }

    try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        const respuesta = await fetch(`${redisUrl}/get/user:balance:${wallet}`, {
            headers: { Authorization: `Bearer ${redisToken}` }
        });

        const data = await respuesta.json();

        const balance = parseFloat(data.result || 0);

        console.log(`Balance consultado para ${wallet}: ${balance}`);

        return res.status(200).json({ 
            success: true,
            balance: balance 
        });

    } catch (error) {
        console.error("Error en obtener-balance:", error);
        return res.status(500).json({ 
            success: false,
            error: "Error al consultar el inframundo" 
        });
    }
}