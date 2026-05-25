export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: "Falta la wallet/email" });

    try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        
        // Forzamos minúsculas para que siempre coincida
        const walletKey = `user:balance:${wallet.toLowerCase().trim()}`;

        // USAMOS EL MÉTODO POST HACIA REDIS (Más seguro para emails)
        const respuesta = await fetch(redisUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["GET", walletKey])
        });

        const data = await respuesta.json();

        // Upstash devuelve el valor en data.result
        const balance = parseFloat(data.result || 0);

        console.log(`✅ Balance consultado para ${walletKey}: ${balance}`);

        return res.status(200).json({ 
            success: true,
            balance: balance 
        });

    } catch (error) {
        console.error("❌ Error en obtener-balance:", error);
        return res.status(500).json({ error: "Error de conexión con el Inframundo" });
    }
}
