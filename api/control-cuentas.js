// api/control-cuentas.js
const { Redis } = require('@upstash/redis');

// Inicializamos el cliente con las variables que pondrás en Vercel
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const email = req.session.userEmail; // Asegúrate de obtener el email del usuario

        // Borrado usando el SDK de Upstash
        await redis.del(`user:session:${email}`);
        await redis.del(`user:data:${email}`);

        res.status(200).json({ message: "Perfil eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al conectar con Redis" });
    }
};