export default async function handler(req, res) {
    // 1. Manejo seguro y dinámico de CORS para entornos de videojuegos en iframes
    const origin = req.headers.origin;
    onst permitidos = ['https://camino-al-mictlan.vercel.app', 'http://localhost:3000'];

if (origin && (permitidos.includes(origin) || origin.includes('vercel.app'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*'); // Respaldo global
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. Extraer la wallet/email sin importar si viene por GET (query) o POST (body)
    let wallet = req.query.wallet;
    if (req.method === 'POST' && req.body) {
        wallet = req.body.wallet;
    }

    if (!wallet) return res.status(400).json({ error: "Falta la wallet/email" });

    try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        
        const walletKey = `user:balance:${wallet.toLowerCase().trim()}`;

        // Conexión interna segura hacia Upstash Redis
        const respuesta = await fetch(redisUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(["GET", walletKey])
        });

        const data = await respuesta.json();
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
