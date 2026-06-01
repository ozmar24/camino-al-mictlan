// api/validar-ad.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    
    const { identidad } = req.body; // Identidad del alma
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // Generamos el "Sello de Energía" válido por 30 minutos
    const adKey = `user:ad_token:${identidad.toLowerCase().trim()}`;
    
    await fetch(`${redisUrl}/set/${adKey}/valido/EX/1800`, {
        headers: { Authorization: `Bearer ${redisToken}` }
    });
    
    return res.status(200).json({ success: true, mensaje: "Energía canalizada." });
}