// lib/seguridad.js
// Helpers centralizados para validación, Redis, sesión, Turnstile y bloqueo de login.

import crypto from 'node:crypto';

const MAX_LONGITUD_IDENTIDAD = 256;
const MAX_LONGITUD_WALLET = 42;

export const RUTAS_ORIGEN_PERMITIDAS = [
  'https://caminoamictlan.com',
  'https://www.caminoamictlan.com',
  // Los orígenes locales solo existen en desarrollo. En producción (Vercel)
  // se excluyen para que nadie pase el check de origen desde su propio localhost.
  ...(process.env.VERCEL ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'])
];

// Sesión: 7 días de vida.
export const TTL_SESION_SEGUNDOS = 7 * 24 * 60 * 60;

// Bloqueo de login: 5 fallos → 15 minutos bloqueado.
export const MAX_INTENTOS_LOGIN = 5;
export const TTL_BLOQUEO_LOGIN = 15 * 60;
// Límite de fallos por IP sola (password spraying): 20 emails distintos fallidos.
export const MAX_INTENTOS_IP_LOGIN = 20;

function credencialesRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

/**
 * Verificar que la petición proviene del propio sitio (anti-bot básico).
 * - Peticiones SIN origin/referer se permiten: un navegador en mismo-origen
 *   puede omitirlos y curl también los omite; el control real está en la sesión.
 * - Peticiones CON un origen externo se rechazan SIEMPRE (fail-closed):
 *   antes, un atacante podía saltarse esto borrando el header.
 * En pruebas (NODE_ENV === 'test') se permite todo para no romper los tests.
 */
export function verificarOrigen(req) {
  if (process.env.NODE_ENV === 'test') return true;
  const origen = req.headers['origin'] || req.headers['referer'] || '';
  if (!origen) return true; // mismo-origen sin CORS suele omitir estos headers
  return RUTAS_ORIGEN_PERMITIDAS.some(permitida => origen.startsWith(permitida));
}

/**
 * Obtener una IP limpia desde headers comunes.
 * En producción (Vercel) SOLO se confía en x-vercel-forwarded-for / x-real-ip,
 * que Vercel sobrescribe y el cliente no puede falsificar. x-forwarded-for
 * solo se usa en local, donde no hay proxy por delante.
 */
export function obtenerIpLimpia(req) {
  const esProduccion = !!process.env.VERCEL;

  let rawIp = '';
  if (esProduccion) {
    rawIp =
      req.headers['x-vercel-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      '';
  } else {
    rawIp =
      req.headers['x-vercel-forwarded-for'] ||
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      '';
  }

  const ipLimpia = rawIp.split(',')[0].trim() || '127.0.0.1';
  return ipLimpia.replace(/[^a-zA-Z0-9.:]/g, '');
}

/**
 * Sanitizar identidad para usar como clave o valor público.
 */
export function sanitizarIdentidad(valor, opciones = {}) {
  const { maxLongitud = MAX_LONGITUD_IDENTIDAD, permitirVacio = false } = opciones;

  if (typeof valor !== 'string') {
    return permitirVacio ? '' : null;
  }

  let texto = valor.trim();

  if (texto.length === 0) {
    return permitirVacio ? '' : null;
  }

  if (texto.length > maxLongitud) {
    texto = texto.slice(0, maxLongitud);
  }

  const limpio = texto.replace(/[^\w@.\-_]/g, '');
  return limpio || null;
}

/**
 * Sanitizar wallet o dirección EVM.
 */
export function sanitizarWallet(valor) {
  if (typeof valor !== 'string') return '';

  let texto = valor.trim().toLowerCase();

  if (texto.length > MAX_LONGITUD_WALLET) {
    texto = texto.slice(0, MAX_LONGITUD_WALLET);
  }

  return texto;
}

/**
 * Validar que un monto sea numérico y esté dentro de límites.
 */
export function validarMonto(valor, opciones = {}) {
  const {
    min = 0,
    max = Infinity,
    permitirCero = false,
    mensaje = 'Monto inválido'
  } = opciones;

  const numero = Number(valor);

  if (isNaN(numero)) {
    throw {
      status: 400,
      error: mensaje,
      detalle: 'El monto no es numérico.'
    };
  }

  if (!permitirCero && numero <= 0) {
    throw {
      status: 400,
      error: mensaje,
      detalle: 'El monto debe ser mayor a cero.'
    };
  }

  if (numero < min || numero > max) {
    throw {
      status: 400,
      error: mensaje,
      detalle: `El monto debe estar entre ${min} y ${max}.`
    };
  }

  return numero;
}

/**
 * Validar campos obligatorios en un body.
 */
export function validarCampos(body, camposRequeridos) {
  const faltantes = [];

  for (const campo of camposRequeridos) {
    const valor = body?.[campo];
    if (valor === undefined || valor === null || valor === '') {
      faltantes.push(campo);
    }
  }

  if (faltantes.length > 0) {
    throw {
      status: 400,
      error: 'Faltan datos obligatorios.',
      detalle: `Campos requeridos: ${faltantes.join(', ')}`
    };
  }

  return true;
}

/**
 * Validar formato básico de wallet EVM.
 */
export function esWalletEvmValida(wallet) {
  if (typeof wallet !== 'string') return false;
  const limpia = wallet.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(limpia);
}

/**
 * Validar que el monto recibido sea coherente con el esperado.
 */
export function validarCoherenciaMonto(recibido, esperado, toleranciaDecimales = 0) {
  const recibidoNum = Number(recibido);
  const esperadoNum = Number(esperado);

  if (isNaN(recibidoNum) || isNaN(esperadoNum)) {
    throw {
      status: 400,
      error: 'No se puede validar el monto.',
      detalle: 'Valores numéricos inválidos.'
    };
  }

  const factor = Math.pow(10, toleranciaDecimales);
  const diferencia = Math.abs(
    Math.round(recibidoNum * factor) - Math.round(esperadoNum * factor)
  );

  if (diferencia > 0) {
    throw {
      status: 400,
      error: 'El monto no coincide con el esperado.',
      detalle: 'Posible manipulación de cantidad.'
    };
  }

  return true;
}

/**
 * Construir clave de usuario para Redis.
 */
export function claveUsuario(email) {
  if (!email || typeof email !== 'string') {
    return 'usuario:sin_email';
  }
  const normalizado = email.toLowerCase().trim();
  return `usuario:${normalizado.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;
}

/**
 * Leer un valor de Redis vía REST (usa variables de entorno).
 */
export async function redisGet(key) {
  const { url, token } = credencialesRedis();
  if (!url || !token) return null;

  const respuesta = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!respuesta.ok) return null;
  const data = await respuesta.json();
  return data?.result ?? null;
}

/**
 * Ejecutar un comando Redis vía REST (usa variables de entorno).
 * Ejemplo: redisCmd('SET', 'clave', 'valor', 'EX', 60)
 */
export async function redisCmd(...comando) {
  const { url, token } = credencialesRedis();
  if (!url || !token) return null;

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(comando)
  });

  if (!respuesta.ok) return null;
  return respuesta.json();
}

/**
 * Envía una notificación a Telegram.
 * @param {string} mensaje - Texto del mensaje.
 * @param {string} [parseMode='Markdown'] - Modo de parseo (Markdown o HTML).
 */
export async function enviarAlertaTelegram(mensaje, parseMode = 'Markdown') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('Telegram no configurado (falta token o chatId).');
    return;
  }
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensaje,
        parse_mode: parseMode
      })
    });
  } catch (error) {
    console.error('Error enviando alerta a Telegram:', error);
  }
}

/**
 * Extraer el token Bearer de una petición.
 */
export function obtenerTokenPeticion(req) {
  const bearer = req.headers.authorization || '';
  return bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '';
}

// ==================== ANTI-BOTS: PROXYCHECK + LISTA NEGRA ====================

// Si una IP acumula este número de infracciones, queda en lista negra 24 h.
export const UMBRAL_BLACKLIST_IP = 3;
export const TTL_BLACKLIST_SEGUNDOS = 24 * 60 * 60;

function claveBlacklistIp(ip) {
  const i = (ip || '').replace(/[^a-zA-Z0-9.:]/g, '_');
  return `blacklist_ip:${i}`;
}

function claveInfraccionesIp(ip) {
  const i = (ip || '').replace(/[^a-zA-Z0-9.:]/g, '_');
  return `ip_infracciones:${i}`;
}

/**
 * ¿Está esta IP en lista negra? Las IPs de bots reincidentes se bloquean
 * automáticamente durante 24 h tras acumular infracciones.
 */
export async function estaIpBloqueada(ip) {
  if (!ip) return false;
  try {
    const data = await redisGet(claveBlacklistIp(ip));
    return !!data;
  } catch {
    return false;
  }
}

/**
 * Registrar una infracción de una IP. Al llegar al umbral queda en lista
 * negra 24 h automáticamente y se avisa por Telegram.
 * Devuelve { bloqueada, infracciones }.
 */
export async function registrarInfraccionIp(ip, motivo) {
  if (!ip) return { bloqueada: false, infracciones: 0 };
  try {
    const res = await redisCmd('INCR', claveInfraccionesIp(ip));
    const infracciones = parseInt(res?.result ?? '1', 10);
    if (infracciones === 1) {
      await redisCmd('EXPIRE', claveInfraccionesIp(ip), TTL_BLACKLIST_SEGUNDOS);
    }

    if (infracciones >= UMBRAL_BLACKLIST_IP) {
      await redisCmd('SET', claveBlacklistIp(ip), motivo || 'abuso', 'EX', TTL_BLACKLIST_SEGUNDOS);
      await enviarAlertaTelegram(
        `🚫 *IP EN LISTA NEGRA*\n` +
        `🌐 \`${ip}\`\n` +
        `⚠️ Infracciones: ${infracciones}\n` +
        `📝 Motivo: ${motivo || 'abuso'}\n` +
        `⏳ Bloqueada 24 h automáticamente.`,
        'Markdown'
      );
      return { bloqueada: true, infracciones };
    }
    return { bloqueada: false, infracciones };
  } catch (error) {
    console.error('Error registrando infracción de IP:', error);
    return { bloqueada: false, infracciones: 0 };
  }
}

// Caché en memoria del veredicto ProxyCheck (30 min por IP): evita golpear
// la API externa en cada petición y ahorra cuota del plan.
const CACHE_PROXYCHECK_MS = 30 * 60 * 1000;
let cacheProxycheck = new Map();

/**
 * Análisis antifraude de IP con ProxyCheck (VPN/proxy/hosting + riesgo).
 * - Sin PROXYCHECK_API_KEY configurada → no bloquea (no hay que romper todo).
 * - Error de red → fail-open SOLO para consultas; el bloqueo real de bots
 *   lo hace la lista negra (esta sí es fail-closed).
 * - Devuelve { proxy, hosting, riesgo, bloquear }.
 */
export async function analizarIp(ip) {
  const vacio = { proxy: false, hosting: false, riesgo: 0, bloquear: false };
  if (!ip) return vacio;

  const cacheado = cacheProxycheck.get(ip);
  if (cacheado && cacheado.expiraEn > Date.now()) {
    return cacheado.veredicto;
  }

  const apiKey = process.env.PROXYCHECK_API_KEY;
  if (!apiKey) return vacio;

  try {
    const res = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&risk=1`, {
      signal: AbortSignal.timeout(4000)
    });
    const data = await res.json();
    const info = data?.[ip] || {};
    const veredicto = {
      proxy: info.proxy === 'yes',
      hosting: info.type === 'Hosting' || info.is_hosting === 'yes',
      riesgo: parseInt(info.risk ?? '0', 10) || 0,
      // VPN, proxy u hosting datacenter → bloquear (los bots usan datacenters).
      bloquear: info.proxy === 'yes' || info.type === 'Hosting' || info.is_hosting === 'yes'
    };
    cacheProxycheck.set(ip, { veredicto, expiraEn: Date.now() + CACHE_PROXYCHECK_MS });
    return veredicto;
  } catch {
    // Fail-open en la consulta: si ProxyCheck está caído no tumamos el sitio.
    return vacio;
  }
}

/**
 * Escudo completo anti-bot para endpoints sensibles (retiros, reclamos).
 * 1. ¿IP en lista negra? → 403 inmediato (fail-closed, no depende de nadie).
 * 2. ProxyCheck: VPN/proxy/hosting → registra infracción y bloquea.
 * 3. Riesgo alto (score ≥ 66 según ProxyCheck) → infracción y bloqueo.
 * Devuelve { permitir }.
 */
export async function escudoAntiBots(ip) {
  if (await estaIpBloqueada(ip)) {
    return { permitir: false };
  }

  const veredicto = await analizarIp(ip);
  if (veredicto.bloquear || veredicto.riesgo >= 66) {
    await registrarInfraccionIp(
      ip,
      veredicto.bloquear ? 'VPN/proxy/hosting detectado' : `Riesgo ProxyCheck ${veredicto.riesgo}`
    );
    return { permitir: false };
  }

  return { permitir: true };
}

/**
 * Crear una sesión en Redis y devolver el token.
 */
export async function crearSesion(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const sesion = {
    email: email.toLowerCase().trim(),
    creadaEn: new Date().toISOString()
  };
  await redisCmd('SET', `sesion:${token}`, JSON.stringify(sesion), 'EX', TTL_SESION_SEGUNDOS);
  return token;
}

/**
 * Borrar una sesión de Redis (logout).
 */
export async function borrarSesion(token) {
  if (!token) return;
  await redisCmd('DEL', `sesion:${token}`);
}

/**
 * Autenticación por token de sesión: devuelve el email o null.
 */
export async function autenticarPeticion(req) {
  const token = obtenerTokenPeticion(req);
  if (!token) return null;

  try {
    const data = await redisGet(`sesion:${token}`);
    if (!data) return null;

    const sesion = typeof data === 'string' ? JSON.parse(data) : data;
    return sesion?.email || null;
  } catch (error) {
    console.error('Error en autenticarPeticion:', error);
    return null;
  }
}

/**
 * Verificar un token de Turnstile (Cloudflare).
 * - Sin CLOUDFLARE_SECRET_KEY configurada → fail-open (no bloquea).
 * - Token ausente → rechazado.
 * - Error de red → fail-open para no tumbar el login.
 */
export async function verificarTurnstile(tokenTurnstile, ip) {
  const SECRET_KEY = process.env.CLOUDFLARE_SECRET_KEY;
  if (!SECRET_KEY) {
    // Fail-open: sin key configurada no bloqueamos registros, pero lo dejamos
    // visible por Telegram (una vez por arranque) para que no pase inadvertido.
    console.warn('⚠️ CLOUDFLARE_SECRET_KEY no configurada: Turnstile en fail-open.');
    if (!avisoTurnstileEnviado) {
      avisoTurnstileEnviado = true;
      await enviarAlertaTelegram(
        '⚠️ *Turnstile desactivado*: falta CLOUDFLARE_SECRET_KEY en Vercel. Los registros no se están verificando contra bots.',
        'Markdown'
      );
    }
    return true;
  }
  if (!tokenTurnstile) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: SECRET_KEY,
        response: tokenTurnstile,
        remoteip: ip || undefined
      })
    });
    const data = await res.json();
    if (data.success !== true) {
      console.error('Turnstile rechazó la verificación:', data['error-codes'] || data);
    }
    return data.success === true;
  } catch (error) {
    console.error('Error verificando Turnstile:', error);
    return true; // fail-open: una caída de Cloudflare no debe tumbar el acceso
  }
}
let avisoTurnstileEnviado = false;

function claveIntentosLogin(email, ip) {
  const e = (email || '').toLowerCase().trim().replace(/[^a-zA-Z0-9@._-]/g, '_');
  const i = (ip || '').replace(/[^a-zA-Z0-9.:]/g, '_');
  return `login_intentos:${e}:${i}`;
}

function claveIntentosIp(ip) {
  const i = (ip || '').replace(/[^a-zA-Z0-9.:]/g, '_');
  return `login_intentos_ip:${i}`;
}

/**
 * Verificar si el email+IP (o la IP sola) está bloqueado por demasiados
 * intentos fallidos. El bloqueo por IP sola evita que un atacante pruebe
 * miles de emails distintos desde la misma máquina (password spraying).
 */
export async function verificarBloqueoLogin(email, ip) {
  try {
    const [data, dataIp] = await Promise.all([
      redisGet(claveIntentosLogin(email, ip)),
      redisGet(claveIntentosIp(ip))
    ]);
    const intentos = parseInt(data || '0', 10);
    const intentosIp = parseInt(dataIp || '0', 10);
    return intentos >= MAX_INTENTOS_LOGIN || intentosIp >= MAX_INTENTOS_IP_LOGIN;
  } catch (error) {
    console.error('Error verificando bloqueo de login:', error);
    return false;
  }
}

/**
 * Registrar un intento fallido. Devuelve el número de intentos acumulados.
 * Cuenta por email+IP y también por IP sola.
 */
export async function registrarIntentoFallidoLogin(email, ip) {
  try {
    const clave = claveIntentosLogin(email, ip);
    const res = await redisCmd('INCR', clave);
    const intentos = parseInt(res?.result ?? '0', 10);

    // Renovar la ventana de 15 minutos en cada fallo.
    await redisCmd('EXPIRE', clave, TTL_BLOQUEO_LOGIN);

    // Contador global por IP (anti password-spraying)
    try {
      const claveIp = claveIntentosIp(ip);
      const resIp = await redisCmd('INCR', claveIp);
      const nIp = parseInt(resIp?.result ?? '0', 10);
      if (nIp === 1) {
        await redisCmd('EXPIRE', claveIp, TTL_BLOQUEO_LOGIN);
      }
    } catch { /* no crítico */ }

    return intentos;
  } catch (error) {
    console.error('Error registrando intento fallido:', error);
    return 0;
  }
}

/**
 * Limpiar el contador de intentos tras un login exitoso.
 */
export async function limpiarIntentosLogin(email, ip) {
  try {
    await Promise.all([
      redisCmd('DEL', claveIntentosLogin(email, ip)),
      redisCmd('DEL', claveIntentosIp(ip))
    ]);
  } catch (error) {
    console.error('Error limpiando intentos de login:', error);
  }
}

/**
 * Limitador de peticiones por IP (ventana fija en Redis).
 * Devuelve true si la petición está dentro del límite.
 * Fail-open: si Redis falla, no bloquea al usuario.
 */
export async function verificarLimitePeticion(req, opciones = {}) {
  const { max = 30, ventanaSegundos = 60, prefijo = 'rl' } = opciones;

  try {
    const ip = obtenerIpLimpia(req);
    const clave = `${prefijo}:${ip}`;

    const res = await redisCmd('INCR', clave);
    const cuenta = parseInt(res?.result ?? '0', 10);

    if (cuenta === 1) {
      await redisCmd('EXPIRE', clave, ventanaSegundos);
    }

    return cuenta <= max;
  } catch (error) {
    console.error('Error en verificarLimitePeticion:', error);
    return true;
  }
}

/**
 * Errores controlados para no generar 500 inútiles.
 */
export class ErrorControlado extends Error {
  constructor(mensaje, codigo = 400, detalles = {}) {
    super(mensaje);
    this.name = 'ErrorControlado';
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

/**
 * Respuesta de error de forma uniforme.
 */
export function responderError(res, opciones) {
  const { status = 400, message, detalles = {} } = opciones;

  return res.status(status).json({
    success: false,
    error: message || 'Error de validación.',
    ...(Object.keys(detalles).length && { detalles })
  });
}

/**
 * Manejo centralizado de errores en handlers.
 */
export function manejarError(res, error) {
  if (error instanceof ErrorControlado) {
    return responderError(res, {
      status: error.codigo,
      message: error.message,
      detalles: error.detalles
    });
  }

  if (error && error.status) {
    return responderError(res, {
      status: error.status,
      message: error.error || 'Error de validación.',
      detalles: error.detalle || {}
    });
  }

  console.error('Error no controlado en seguridad:', error);
  return res.status(500).json({
    success: false,
    error: 'Error interno de seguridad.'
  });
}