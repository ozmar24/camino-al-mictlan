import { Redis } from '@upstash/redis';

let redisClient = null;
function getRedis() {
  if (redisClient) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Variables de entorno de Redis faltantes');
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

export default async function handler(req, res) {
  console.log("Entró a /api/pacto - ENV present:",
    !!process.env.UPSTASH_REDIS_REST_URL, !!process.env.UPSTASH_REDIS_REST_TOKEN);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'MÉTODO NO PERMITIDO' });
  }

  const { email, password, accion } = req.body || {};

  if (!email || !password || !accion) {
    return res.status(400).json({ success: false, error: 'FALTAN CREDENCIALES EN EL FORMULARIO.' });
  }

  const emailNormalizado = String(email).toLowerCase().trim();

  try {
    const redis = getRedis();

    if (accion === 'registro') {
      const existe = await redis.hget(`usuario:${emailNormalizado}`, 'email');
      if (existe) {
        return res.status(200).json({ success: false, error: 'ESTE EMAIL YA TIENE UN PACTO ACTIVO.' });
      }

      await redis.hset(`usuario:${emailNormalizado}`, {
        email: emailNormalizado,
        password,
        wallet: "wallet-temp-" + Date.now(),
        balance_soulgeist: "0",
        creado_en: new Date().toISOString()
      });

      return res.status(200).json({ success: true, message: 'Pacto sellado con éxito.' });
    }

    if (accion === 'login') {
      const usuario = await redis.hgetall(`usuario:${emailNormalizado}`);
      if (!usuario || Object.keys(usuario).length === 0) {
        return res.status(404).json({ success: false, error: 'IDENTIDAD NO REGISTRADA.' });
      }

      if (usuario.password !== password) {
        return res.status(401).json({ success: false, error: 'CONTRASEÑA INCORRECTA.' });
      }

      return res.status(200).json({
        success: true,
        usuario: {
          email: usuario.email,
          balance: parseFloat(usuario.balance_soulgeist || 0)
        }
      });
    }

    return res.status(400).json({ success: false, error: 'ACCIÓN NO VÁLIDA.' });

  } catch (error) {
    console.error('ERROR CRÍTICO en pacto.js:', error);
    return res.status(500).json({
      success: false,
      error: 'Fallo interno en el abismo del servidor.',
      detalle: error.message || 'Error desconocido'
    });
  }
}
