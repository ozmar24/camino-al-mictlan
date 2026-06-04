// api/reclamar.js
import { ethers } from 'ethers';

export default async function handler(req, res) {
    // CORS
    const ORIGENES_PERMITIDOS = ['https://camino-al-mictlan.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;
    if (ORIGENES_PERMITIDOS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

    const { identidad, wallet, cripto, pasarela } = req.body || {};

    if (!identidad || !wallet || !cripto || !pasarela) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const claveAdmin = process.env.ADMIN_PRIVATE_KEY;
    const contratoAddr = process.env.SOULGEIST_CONTRACT_ADDRESS;
    const rpcUrl = process.env.BLOCKCHAIN_RPC || 'https://rpc-amoy.polygon.technology';

    const CONFIG_CRIPTAS = {
    Bitcoin:   { tasa: 0.000002, simFP: 'BTC', minimoNativo: 0.000001 },
    Litecoin:  { tasa: 0.0012,   simFP: 'LTC', minimoNativo: 0.0001 },
    Ethereum:  { tasa: 0.00000045, simFP: 'ETH', minimoNativo: 0.000001 },   // Bajado para pruebas
    Dogecoin:  { tasa: 1.5, simFP: 'DOGE', minimoNativo: 0.1 },
    Pepe:      { tasa: 15000, simFP: 'PEPE', minimoNativo: 100 },
    Solana:    { tasa: 0.0008, simFP: 'SOL', minimoNativo: 0.00001 },
    USDT:      { tasa: 0.25, simFP: 'USDT', minimoNativo: 0.01 }
};

    const infoCripta = CONFIG_CRIPTAS[cripto];
    if (!infoCripta) return res.status(400).json({ error: 'Cripta no registrada.' });

    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || '127.0.0.1';
    const country = req.headers['x-vercel-ip-country'] || 'XX';

    const PAISES_BLOQUEADOS = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI'];
    if (PAISES_BLOQUEADOS.includes(country)) {
        return res.status(403).json({ error: 'Región no disponible.' });
    }

    if (!validarDireccion(wallet, pasarela, cripto)) {
        return res.status(400).json({ error: 'Formato de wallet inválido.' });
    }

    const identidadNorm = identidad.toLowerCase().trim();
    const balanceKey = `user:balance:${identidadNorm}`;
    const walletKey = `user:wallet:${wallet}:${cripto}`;
    const ipKey = `user:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`;

    const redisCmd = async (comando) => {
        const r = await fetch(redisUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(comando)
        });
        return r.json();
    };

    try {
        const [resWallet, resIp] = await Promise.all([
            redisCmd(['GET', walletKey]),
            redisCmd(['GET', ipKey])
        ]);

        if (resWallet?.result || resIp?.result) {
            return res.status(429).json({ error: 'Debes esperar 24 horas para otro retiro.' });
        }

        const auditoriaIP = await verificarFraudeIP(ipLimpia);
        if (auditoriaIP.bloquear) {
            return res.status(403).json({ error: 'VPN/Proxy detectado.' });
        }

        const balanceRes = await redisCmd(['GET', balanceKey]);
        const balanceSG = parseInt(balanceRes?.result || 0);

        if (balanceSG <= 0) return res.status(400).json({ error: 'No tienes balance suficiente.' });

        const cantidadAEnviar = balanceSG * infoCripta.tasa;

// === BYPASS TEMPORAL PARA PRUEBAS ===
if (cantidadAEnviar <= 0) {
    return res.status(400).json({ 
        error: `No tienes balance suficiente. Tienes ${balanceSG} SG.` 
    });
}

// Solo mostramos advertencia pero permitimos el retiro
if (cantidadAEnviar < infoCripta.minimoNativo) {
    console.log(`⚠️ Advertencia: Monto bajo (${cantidadAEnviar}), pero permitimos en pruebas`);
}

        let pagoExitoso = false;
        let mensajeRetorno = '';

        if (['bitso', 'binance', 'coinbase'].includes(pasarela)) {
            pagoExitoso = true;
            mensajeRetorno = `Retiro solicitado a ${pasarela.toUpperCase()} por ${cantidadAEnviar.toFixed(8)} ${infoCripta.simFP}.`;
        } else {
            const resOC = await procesarRetiroOnChain(wallet, cantidadAEnviar, claveAdmin, contratoAddr, rpcUrl);
            pagoExitoso = resOC.success;
            mensajeRetorno = resOC.success ? `Tx: ${resOC.txHash?.slice(0,12)}...` : resOC.error;
        }

        if (pagoExitoso) {
            await Promise.all([
                redisCmd(['SET', walletKey, 'activo', 'EX', '86400']),
                redisCmd(['SET', ipKey, 'activo', 'EX', '86400']),
                redisCmd(['SET', balanceKey, '0'])
            ]);

            await enviarAlertaTelegram(`💀 RETIRO EXITOSO | ${pasarela} | ${cantidadAEnviar} ${infoCripta.simFP}`);

            return res.status(200).json({
                success: true,
                mensaje: mensajeRetorno,
                balanceAlmas: 0
            });
        } else {
            return res.status(500).json({ error: mensajeRetorno || 'Fallo en el retiro.' });
        }

    } catch (err) {
        console.error('Error global en reclamar.js:', err);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
}

// ==================== FUNCIONES AUXILIARES ====================
function validarDireccion(wallet, pasarela, cripto) {
    const regexEVM = /^0x[a-fA-F0-9]{40}$/i;
    const regexBTC = /^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z1-9]{25,34}|t[b1][a-zA-Z0-9]{6,87}|[mn][a-zA-HJ-NP-Z1-9]{25,34})$/i;
    const regexLTC = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^tltc1[a-z0-9]{6,87}$/i;

    if (pasarela === 'binance' || pasarela === 'coinbase') return regexEVM.test(wallet);
    if (pasarela === 'bitso') {
        if (cripto === 'Bitcoin') return regexBTC.test(wallet);
        if (cripto === 'Litecoin') return regexLTC.test(wallet);
        return regexEVM.test(wallet);
    }
    if (pasarela === 'bitso_lightning') return regexBTC.test(wallet);
    return wallet.length > 5;
}

async function procesarRetiroOnChain(walletUsuario, monto, claveAdmin, contratoAddr, rpcUrl) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        let privateKey = claveAdmin.trim();
        if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;

        const walletAdmin = new ethers.Wallet(privateKey, provider);
        const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
        const contrato = new ethers.Contract(contratoAddr, abi, walletAdmin);

        const amount = ethers.parseUnits(monto.toFixed(18), 18);
        const tx = await contrato.transfer(ethers.getAddress(walletUsuario), amount);
        const receipt = await tx.wait();

        return { success: true, txHash: receipt.hash };
    } catch (error) {
        console.error("Error OnChain:", error);
        return { success: false, error: error.message };
    }
}

async function verificarFraudeIP(ip) {
    try {
        const apiKey = process.env.PROXYCHECK_API_KEY;
        if (!apiKey) return { bloquear: false };
        const res = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1`);
        const data = await res.json();
        if (data?.[ip]?.proxy === 'yes' || data?.[ip]?.is_hosting === 'yes') {
            return { bloquear: true };
        }
        return { bloquear: false };
    } catch {
        return { bloquear: false };
    }
}

async function enviarAlertaTelegram(pasarela, cripto, cantidad, wallet, identidad) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const mensaje = `💀 *RETIRO EXITOSO* 💀

*Pasarela:* ${pasarela.toUpperCase()}
*Cripto:* ${cripto}
*Monto:* \`${cantidad.toFixed(8)}\`
*Wallet:* \`${wallet}\`
*Usuario:* ${identidad}

🕒 ${new Date().toLocaleString('es-MX')}`;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });
        console.log("✅ Alerta Telegram enviada correctamente");
    } catch (err) {
        console.error("Error enviando Telegram:", err);
    }
}