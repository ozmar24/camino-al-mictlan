export default async function handler(req, res) {
    const { wallet } = req.query;
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    // Consultamos directo a Redis
    const respuesta = await fetch(`${redisUrl}/get/user:balance:${wallet}`, {
        headers: { Authorization: `Bearer ${redisToken}` }
    });
    const data = await respuesta.json();
    return res.status(200).json({ balance: parseFloat(data.result || 0) });
}