export default async function handler(req, res) {
    const origin = req.headers.origin;
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let wallet = req.query.wallet || (req.body && req.body.wallet);
    if (!wallet) return res.status(400).json({ error: "Falta la wallet/email" });

    try {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        
        // 1. GENERAR LA LLAVE EXACTA IGUAL QUE EN EL REGISTRO
        const emailLimpio = wallet.toLowerCase().trim();
        const walletKey = `usuario:${emailLimpio.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;

        // 2. CONSULTAR A REDIS
        const respuesta = await fetch(`${redisUrl}/get/${walletKey}`, {
            headers: { 'Authorization': `Bearer ${redisToken}` }
        });

        const data = await respuesta.json();
        
        // 3. PROCESAR EL JSON
        let balance = 0;
        if (data.result) {
            const usuario = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
            balance = parseFloat(usuario.balance_soulgeist || 0);
        }

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