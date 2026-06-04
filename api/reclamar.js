// api/reclamar.js
import { ethers } from 'ethers';

export default async function handler(req, res) {
    // ── CORS ─────────────────────────────────────────────────────────────
    const ORIGENES_PERMITIDOS = ['https://camino-al-mictlan.vercel.app', 'http://localhost:3000'];
    const origin = req.headers.origin;
    if (ORIGENES_PERMITIDOS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

    // ── Datos del body ───────────────────────────────────────────────────
    const { identidad, wallet, cripto, pasarela } = req.body || {};
    if (!identidad || !wallet || !cripto || !pasarela) {
        return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    // ── Configuración ────────────────────────────────────────────────────
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const claveAdmin = process.env.ADMIN_PRIVATE_KEY;
    const contratoAddr = process.env.SOULGEIST_CONTRACT_ADDRESS;
    const rpcUrl = process.env.BLOCKCHAIN_RPC || 'https://rpc-amoy.polygon.technology';

    // ── Configuración de criptas ─────────────────────────────────────────
    const CONFIG_CRIPTAS = {
        Bitcoin:   { tasa: 0.000002, simFP: 'BTC', minimoNativo: 0.0000002 },
        Litecoin:  { tasa: 0.0012,   simFP: 'LTC', minimoNativo: 0.000144 },
        Ethereum:  { tasa: 0.00000045, simFP: 'ETH', minimoNativo: 0.00000005 },
        Dogecoin:  { tasa: 1.5, simFP: 'DOGE', minimoNativo: 0.18 },
        Pepe:      { tasa: 15000, simFP: 'PEPE', minimoNativo: 180 },
        Solana:    { tasa: 0.0008, simFP: 'SOL', minimoNativo: 0.000096 },
        USDT:      { tasa: 0.25, simFP: 'USDT', minimoNativo: 0.03 }
    };

    const infoCripta = CONFIG_CRIPTAS[cripto];
    if (!infoCripta) return res.status(400).json({ error: 'Cripta no registrada.' });

    // ── IP y seguridad ───────────────────────────────────────────────────
    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || '127.0.0.1';
    const country = req.headers['x-vercel-ip-country'] || 'XX';

    const PAISES_BLOQUEADOS = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI'];
    if (PAISES_BLOQUEADOS.includes(country)) {
        return res.status(403).json({ error: 'Región no disponible.' });
    }

    // ── Validaciones ─────────────────────────────────────────────────────
    if (!validarDireccion(wallet, pasarela, cripto)) {
        return res.status(400).json({ error: 'Formato de wallet inválido.' });
    }

    // ── Redis keys ───────────────────────────────────────────────────────
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
        // Cooldowns
        const [resWallet, resIp] = await Promise.all([
            redisCmd(['GET', walletKey]),
            redisCmd(['GET', ipKey])
        ]);
        if (resWallet?.result || resIp?.result) {
            return res.status(429).json({ error: 'Debes esperar 24 horas para otro retiro.' });
        }

        // Anti-VPN
        const auditoriaIP = await verificarFraudeIP(ipLimpia);
        if (auditoriaIP.bloquear) {
            return res.status(403).json({ error: 'VPN/Proxy detectado.' });
        }

        // Balance
        const balanceRes = await redisCmd(['GET', balanceKey]);
        const balanceSG = parseInt(balanceRes?.result || 0);
        if (balanceSG <= 0) return res.status(400).json({ error: 'Sin balance suficiente.' });

        const cantidadAEnviar = balanceSG * infoCripta.tasa;
        if (cantidadAEnviar < infoCripta.minimoNativo) {
            return res.status(400).json({ error: `Monto mínimo no alcanzado para ${cripto}.` });
        }

        // ====================== PROCESAMIENTO SEGÚN PASAarela ======================
        let pagoExitoso = false;
        let mensajeRetorno = '';

        if (['bitso', 'binance', 'coinbase'].includes(pasarela)) {
            // Retiros a exchanges externos (futuro: integrar APIs reales)
            pagoExitoso = true;
            mensajeRetorno = `Retiro solicitado a ${pasarela.toUpperCase()} por ${cantidadAEnviar.toFixed(8)} ${infoCripta.simFP}.`;
        } 
        else if (pasarela === 'bitso_lightning' && cripto === 'Bitcoin') {
            const resLN = await ejecutarRetiroBitsoLightning(wallet, cantidadAEnviar);
            pagoExitoso = resLN.success;
            mensajeRetorno = resLN.success ? 'Retiro Lightning procesado.' : resLN.error;
        } 
        else {
            // Retiro On-Chain (Polygon)
            const resOC = await procesarRetiroOnChain(wallet, cantidadAEnviar, claveAdmin, contratoAddr, blockchainRPC);
            pagoExitoso = resOC.success;
            mensajeRetorno = resOC.success ? `Tx: ${resOC.txHash.slice(0,12)}...` : resOC.error;
        }

        if (pagoExitoso) {
            await Promise.all([
                redisCmd(['SET', walletKey, 'activo', 'EX', '86400']),
                redisCmd(['SET', ipKey, 'activo', 'EX', '86400']),
                redisCmd(['SET', balanceKey, '0'])
            ]);

            await enviarAlertaTelegram(`💀 RETIRO EXITOSO | ${pasarela} | ${cantidadAEnviar} ${infoCripta.simFP} | Wallet: ${wallet}`);

            return res.status(200).json({
                success: true,
                mensaje: mensajeRetorno,
                balanceAlmas: 0
            });
        }

        return res.status(500).json({ error: 'No se pudo procesar el retiro.' });

    } catch (err) {
        console.error('Error en reclamar:', err);
        return res.status(500).json({ error: 'Error interno.' });
    }
}

// ====================== FUNCIONES AUXILIARES ======================
function validarDireccion(wallet, pasarela, cripto) {
    const regexEVM = /^0x[a-fA-F0-9]{40}$/i;
    
    // Bitcoin (mainnet + testnet)
    const regexBTC = /^(bc1[a-z0-9]{6,87}|[13][a-zA-HJ-NP-Z1-9]{25,34}|t[b1][a-zA-Z0-9]{6,87}|[mn][a-zA-HJ-NP-Z1-9]{25,34})$/i;
    
    // Litecoin (mainnet + testnet)
    const regexLTC = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^tltc1[a-z0-9]{6,87}$/i;

    if (pasarela === 'binance' || pasarela === 'coinbase') {
        return regexEVM.test(wallet);
    }

    if (pasarela === 'bitso') {
        if (cripto === 'Bitcoin') return regexBTC.test(wallet);
        if (cripto === 'Litecoin') return regexLTC.test(wallet);
        return regexEVM.test(wallet); // Para otras criptos
    }

    if (pasarela === 'bitso_lightning') {
        return regexBTC.test(wallet);
    }

    return wallet.length > 5;
}

async function procesarRetiroOnChain(walletUsuario, monto, claveAdmin, contratoAddr, rpcUrl, entorno = 'testnet') {
    try {
        console.log(`🔄 [${entorno}] Iniciando retiro on-chain...`);
        console.log(`   → Wallet destino: ${walletUsuario}`);
        console.log(`   → Monto: ${monto}`);

        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // Limpieza segura de clave privada
        let privateKey = claveAdmin.trim();
        if (!privateKey.startsWith('0x')) {
            privateKey = '0x' + privateKey;
        }

        const walletAdmin = new ethers.Wallet(privateKey, provider);

        const MIN_ABI = [
            "function transfer(address to, uint256 amount) returns (bool)"
        ];

        const contrato = new ethers.Contract(contratoAddr, MIN_ABI, walletAdmin);

        // Convertir monto
        const amountParsed = ethers.parseUnits(monto.toFixed(18), 18);

        // Validar dirección destino
        const direccionDestino = ethers.getAddress(walletUsuario);

        console.log(`   → Enviando ${ethers.formatUnits(amountParsed, 18)} tokens a ${direccionDestino}`);

        // Enviar transacción
        const tx = await contrato.transfer(direccionDestino, amountParsed);
        console.log(`   → Tx enviada: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`   → Tx confirmada en bloque: ${receipt.blockNumber}`);

        return { 
            success: true, 
            txHash: receipt.hash 
        };

    } catch (error) {
        console.error(`❌ Error en procesarRetiroOnChain:`, error);
        return { 
            success: false, 
            error: error.reason || error.message || 'Error desconocido en blockchain' 
        };
    }
}