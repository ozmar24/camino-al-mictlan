// REQUIERE: npm install ethers
import { ethers } from 'ethers';

export default async function handler(req, res) {
    // 1. El control de CORS y OPTIONS ya lo maneja next.config.js globalmente.
    // Solo aseguramos que el método entrante sea estrictamente POST.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido.' });
    }

    // ── Variables de entorno ───────────────────────────────────────────────────
    const redisUrl     = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken   = process.env.UPSTASH_REDIS_REST_TOKEN;
    const claveAdmin   = process.env.ADMIN_PRIVATE_KEY;
    const contratoAddr = process.env.SOULGEIST_CONTRACT_ADDRESS;
    const blockchainRPC = process.env.BLOCKCHAIN_RPC || 'https://polygon-mainnet.infura.io';
    const blockchainEnv = process.env.BLOCKCHAIN_ENV || 'mainnet';

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Redis no configurado.' });
    }
    if (!claveAdmin || !contratoAddr) {
        return res.status(500).json({ error: 'Servidor Web3 no configurado completamente.' });
    }

    // ── Extraer datos del body ─────────────────────────────────────────────────
    const { identidad, cripto, pasarela, saldoCripto } = req.body || {};
    const wallet = req.body?.wallet?.toLowerCase().trim() || '';

    if (!identidad) return res.status(400).json({ error: 'Falta la identidad del alma.' });
    if (!wallet || wallet.length < 8) return res.status(400).json({ error: 'Wallet inválida.' });
    if (!cripto) return res.status(400).json({ error: 'Falta la cripto seleccionada.' });
    if (!pasarela) return res.status(400).json({ error: 'Falta la pasarela de retiro.' });

    // ── IP y país ──────────────────────────────────────────────────────────────
    const rawIp    = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
    const country  = req.headers['x-vercel-ip-country'] || 'XX';    // ── Configuración de tasas y mínimos por cripto ───────────────────────────
    const CONFIG_CRIPTAS = {
    Bitcoin:   { tasa: 0.000002, simFP: 'BTC',   minimoNativo: 0.000001 },
    Litecoin:  { tasa: 0.0012,   simFP: 'LTC',   minimoNativo: 0.0001 },
    Ethereum:  { tasa: 0.00000045, simFP: 'ETH', minimoNativo: 0.000001 },
    Pepe:      { tasa: 15000,    simFP: 'PEPE',  minimoNativo: 100 },
    MATIC:     { tasa: 0.015,    simFP: 'MATIC/POL', minimoNativo: 0.001 },
    BNB:       { tasa: 0.0018,   simFP: 'BNB',   minimoNativo: 0.001 },
    USDT:      { tasa: 0.25,     simFP: 'USDT',  minimoNativo: 0.01 }
};
    let nombreNormalizado = cripto;
if (nombreNormalizado === "MATIC/POL") {
    nombreNormalizado = "MATIC";
}

    const infoCripta = CONFIG_CRIPTAS[nombreNormalizado]; 

if (!infoCripta) {
    console.error("Cripta no encontrada en configuración:", nombreNormalizado); // Muy útil para los logs
    return res.status(400).json({ error: 'Cripta no registrada.' });
}

    // ── Filtro geográfico ──────────────────────────────────────────────────────
    const PAISES_BLOQUEADOS = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI'];
    if (PAISES_BLOQUEADOS.includes(country)) {
        return res.status(403).json({ error: 'Región no disponible.' });
    }

    // ── Validar formato de wallet según pasarela Y cripto ─────────────────────
    if (!validarDireccion(wallet, pasarela, cripto)) {
        return res.status(400).json({ error: 'El formato de la billetera no coincide con la pasarela seleccionada.' });
    }

    // ── Claves Redis ───────────────────────────────────────────────────────────
    const identidadNorm = identidad.toLowerCase().trim();
    const balanceKey    = `user:balance:${identidadNorm}`;
    const walletKey     = `user:wallet:${wallet}:${cripto}`;
    const ipKey         = `user:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`;

    // ── Helper Redis ───────────────────────────────────────────────────────────
    const redisCmd = async (comando) => {
        const r = await fetch(redisUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${redisToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(comando)
        });
        return r.json();
    };

    try {
        // ── 1. Verificar cooldowns (24h por wallet y por IP) ───────────────────
        const [resWallet, resIp] = await Promise.all([
            redisCmd(['GET', walletKey]),
            redisCmd(['GET', ipKey])
        ]);

        if (resWallet?.result || resIp?.result) {
            return res.status(429).json({ error: 'Debes esperar 24 horas para otro retiro de esta cripto.' });
        }

        // ── 2. Escudo Anti-VPN ─────────────────────────────────────────────────
        const auditoriaIP = await verificarFraudeIP(ipLimpia);
        if (auditoriaIP.bloquear) {
            return res.status(403).json({ error: 'VPN/Proxy detectado. Retiro no permitido.' });
        }

        // ── 3. Determinar cantidad a enviar ────────────────────────────────────
        // ✅ NUEVO: Si viene saldoCripto del frontend (retiro de tumba),
        // lo usamos directamente. Si no, calculamos desde el balance SG de Redis.
        let cantidadAEnviar = 0;

        if (saldoCripto && parseFloat(saldoCripto) > 0) {
            // Retiro de cripta acumulada en tumba (Bitso, Binance, Coinbase)
            cantidadAEnviar = parseFloat(saldoCripto);
            console.log(`💎 Retiro de tumba: ${cantidadAEnviar} ${infoCripta.simFP}`);
        } else {
            // Retiro basado en balance SG de Redis
            const balanceRes = await redisCmd(['GET', balanceKey]);
            const balanceSG  = parseInt(balanceRes?.result || 0);

            if (balanceSG <= 0) {
                return res.status(400).json({ error: 'No tienes almas suficientes para retirar.' });
            }

            cantidadAEnviar = balanceSG * infoCripta.tasa;
            console.log(`⚗️ Retiro por SG: ${balanceSG} SG → ${cantidadAEnviar} ${infoCripta.simFP}`);
        }

        // ── 4. Validar mínimo de retiro ────────────────────────────────────────
        if (cantidadAEnviar < infoCripta.minimoNativo) {
            return res.status(400).json({
                error: `Mínimo no alcanzado. Necesitas al menos ${infoCripta.minimoNativo} ${infoCripta.simFP} para retirar.`
            });
        }

        // ── 5. Procesar pago según pasarela ────────────────────────────────────
       let pagoExitoso = false;
let mensajeRetorno = '';

// AQUÍ ES DONDE REEMPLAZAS LO QUE TENÍAS POR ESTO:

if (pasarela === 'bitso_lightning' && cripto === 'Bitcoin') {
    const resLN = await ejecutarRetiroBitsoLightning(wallet, cantidadAEnviar);
    if (resLN.success) {
        pagoExitoso = true;
        mensajeRetorno = `¡Energía canalizada! Enviados ${cantidadAEnviar.toFixed(7)} BTC via Lightning.`;
    }

} else if (pasarela === 'metamask') {
    // ESTA ES LA NUEVA PARTE: Solo registramos, no ejecutamos OnChain aquí
    pagoExitoso = true;
    mensajeRetorno = "Cosecha registrada en el libro del inframundo.";

} else if (['binance', 'coinbase'].includes(pasarela)) {
    // Las pasarelas centrales siguen usando tu lógica original de servidor
    const resOC = await procesarRetiroOnChain(
        wallet,
        cantidadAEnviar,
        claveAdmin,
        contratoAddr,
        blockchainRPC,
        blockchainEnv
    );

    if (resOC.success) {
        pagoExitoso = true;
        mensajeRetorno = `Cosecha autorizada. Tx: ${resOC.txHash.slice(0, 10)}...`;
    } else {
        return res.status(500).json({ error: resOC.error || 'La blockchain rechazó la transferencia.' });
    }

} else {
    return res.status(400).json({ error: 'Pasarela no reconocida.' });
}

        // ── 6. Cerrar candados y resetear balance si aplica ───────────────────
        if (pagoExitoso) {
            const operaciones = [
                redisCmd(['SET', walletKey, 'activo', 'EX', '86400']),
                redisCmd(['SET', ipKey,     'activo', 'EX', '86400'])
            ];

            // Solo resetear balance SG si el retiro fue por SG (no por tumba)
            if (!saldoCripto || parseFloat(saldoCripto) <= 0) {
                operaciones.push(redisCmd(['SET', balanceKey, '0']));
            }

            await Promise.all(operaciones);

            await enviarAlertaTelegram(
                `💀 *RETIRO EXITOSO* (${blockchainEnv.toUpperCase()})\n` +
                `*Hacia:* \`${wallet}\`\n` +
                `*Monto:* \`${cantidadAEnviar.toFixed(8)}\` ${infoCripta.simFP}\n` +
                `*Pasarela:* ${pasarela.toUpperCase()}\n` +
                `*Tipo:* ${saldoCripto ? 'Tumba acumulada' : 'Balance SG'}`
            );

            return res.status(200).json({
                success: true,
                mensaje: mensajeRetorno,
                balanceAlmas: (!saldoCripto || parseFloat(saldoCripto) <= 0) ? 0 : undefined,
                red: blockchainEnv
            });
        }

    } catch (err) {
        console.error('Error global en reclamar.js:', err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo.' });
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ══════════════════════════════════════════════════════════════════════════════

// ── Validar formato de wallet según pasarela Y cripto ────────────────────────
function validarDireccion(wallet, pasarela, cripto) {
    const regexEVM = /^0x[a-fA-F0-9]{40}$/;
    const regexBTC = /^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z1-9]{25,34})$/;
    const regexLTC = /^[LMm3][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

    if (pasarela === 'binance' || pasarela === 'coinbase') {
        return regexEVM.test(wallet);
    }

    if (pasarela === 'bitso') {
        if (cripto === 'Bitcoin')  return regexBTC.test(wallet);
        if (cripto === 'Litecoin') return regexLTC.test(wallet);
        return regexEVM.test(wallet);
    }

    if (pasarela === 'bitso_lightning') {
        return regexBTC.test(wallet);
    }

    return wallet.length > 5;
}

import contractABI from '../contractABI.json'; 

async function procesarRetiroOnChain(walletUsuario, monto, claveAdmin, contratoAddr, rpcUrl, entorno) {
    try {
        // 1. Inicializar el proveedor con tu URL de Alchemy (Mainnet)
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // 2. Inicializar la billetera del administrador
        const walletAdmin = new ethers.Wallet(claveAdmin, provider);

        // 3. Crear instancia del contrato usando el ABI completo
        const contrato = new ethers.Contract(contratoAddr, contractABI, walletAdmin);
        
        // 4. Convertir el monto a unidades (asumiendo 18 decimales como en tu tesoreria.js)
        const cantidadConDecimales = ethers.parseUnits(monto.toString(), 18);

        console.log(`🤖 [${entorno}] Enviando ${monto} tokens a: ${walletUsuario}`);

        // 5. Ejecutar la transferencia
        // Nota: Asegúrate de que tu contrato tenga una función 'transfer' 
        // o la función que corresponda para mover los tokens desde el admin/contrato
        const tx = await contrato.transfer(walletUsuario, cantidadConDecimales);
        
        // 6. Esperar confirmación en la red (clave para Mainnet)
        const receipt = await tx.wait(1); 

        return { success: true, txHash: receipt.hash };

    } catch (error) {
        console.error(`❌ Fallo en blockchain [${entorno}]:`, error);
        return { success: false, error: error.message };
    }
}

// ── Bitso Lightning (⚠️ pendiente de implementación real) ────────────────────
async function ejecutarRetiroBitsoLightning(invoice, monto) {
    console.warn('⚠️ ejecutarRetiroBitsoLightning: implementación pendiente.');
    return { success: false, error: 'Bitso Lightning aún no implementado.' };
}

// ── Anti-VPN con proxycheck.io ────────────────────────────────────────────────
async function verificarFraudeIP(ip) {
    try {
        const apiKey = process.env.PROXYCHECK_API_KEY;
        if (!apiKey) return { bloquear: false };

        const res  = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1`);
        const data = await res.json();

        if (data?.[ip]?.proxy === 'yes' || data?.[ip]?.is_hosting === 'yes') {
            return { bloquear: true };
        }
        return { bloquear: false };

    } catch {
        return { bloquear: false };
    }
}

// ── Alerta Telegram ────────────────────────────────────────────────────────────
async function enviarAlertaTelegram(mensaje) {
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id:    chatId,
            text:       mensaje,
            parse_mode: 'Markdown'
        })
    });
}