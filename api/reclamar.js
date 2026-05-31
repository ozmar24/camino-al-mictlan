// api/reclamar.js
// REQUIERE: npm install ethers
import { ethers } from 'ethers';

export default async function handler(req, res) {

    // ── CORS dinámico ──────────────────────────────────────────────────────────
    const ORIGENES_PERMITIDOS = [
        'https://camino-al-mictlan.vercel.app',
        'https://camino-al-mictlan.game-files.crazygames.com'
    ];
    const origin = req.headers.origin;
    if (ORIGENES_PERMITIDOS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });

    // ── Variables de entorno ───────────────────────────────────────────────────
    const redisUrl    = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken  = process.env.UPSTASH_REDIS_REST_TOKEN;
    const claveAdmin  = process.env.ADMIN_PRIVATE_KEY;
    const contratoAddr = process.env.SOULGEIST_CONTRACT_ADDRESS;

    // ✅ RPC configurable — cambia solo la variable en Vercel para pasar a mainnet
    // Testnet Amoy:  https://rpc-amoy.polygon.technology
    // Mainnet Polygon: https://polygon-rpc.com
    const blockchainRPC = process.env.BLOCKCHAIN_RPC || 'https://rpc-amoy.polygon.technology';
    const blockchainEnv = process.env.BLOCKCHAIN_ENV || 'testnet';

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Redis no configurado.' });
    }
    if (!claveAdmin || !contratoAddr) {
        return res.status(500).json({ error: 'Servidor Web3 no configurado completamente.' });
    }

    // ── Extraer datos del body ─────────────────────────────────────────────────
    const { identidad, wallet, cripto, pasarela } = req.body || {};

    if (!identidad) return res.status(400).json({ error: 'Falta la identidad del alma.' });
    if (!wallet || wallet.length < 8) return res.status(400).json({ error: 'Wallet inválida.' });
    if (!cripto) return res.status(400).json({ error: 'Falta la cripto seleccionada.' });
    if (!pasarela) return res.status(400).json({ error: 'Falta la pasarela de retiro.' });

    // ── IP y país ──────────────────────────────────────────────────────────────
    const rawIp  = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
    const country  = req.headers['x-vercel-ip-country'] || 'XX';

    // ── Configuración de tasas ─────────────────────────────────────────────────
    const CONFIG_CRIPTAS = {
        Ethereum: { tasa: 0.00000045, simFP: 'ETH',  minimoNativo: 0.00000005 },
        Litecoin: { tasa: 0.0012,     simFP: 'LTC',  minimoNativo: 0.000144   },
        Pepe:     { tasa: 15000,      simFP: 'PEPE', minimoNativo: 180         },
        Solana:   { tasa: 0.0008,     simFP: 'SOL',  minimoNativo: 0.000096   },
        Dogecoin: { tasa: 1.5,        simFP: 'DOGE', minimoNativo: 0.18        },
        USDT:     { tasa: 0.25,       simFP: 'USDT', minimoNativo: 0.03        },
        Bitcoin:  { tasa: 0.000002,   simFP: 'BTC',  minimoNativo: 0.0000002  }
    };

    const infoCripta = CONFIG_CRIPTAS[cripto];
    if (!infoCripta) return res.status(400).json({ error: 'Cripta no registrada.' });

    // ── Filtro geográfico ──────────────────────────────────────────────────────
    const PAISES_BLOQUEADOS = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI'];
    if (PAISES_BLOQUEADOS.includes(country)) {
        return res.status(403).json({ error: 'Región no disponible.' });
    }

    // ── Validar formato de wallet según pasarela ───────────────────────────────
    if (!validarDireccion(wallet, pasarela)) {
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

        // ── 3. Leer balance REAL desde Redis ───────────────────────────────────
        // ✅ FIX CRÍTICO: cantidadAEnviar se calcula aquí, no viene del cliente
        const balanceRes = await redisCmd(['GET', balanceKey]);
        const balanceSG  = parseInt(balanceRes?.result || 0);

        if (balanceSG <= 0) {
            return res.status(400).json({ error: 'No tienes almas suficientes para retirar.' });
        }

        // ── 4. Calcular cantidad a enviar según tasa ───────────────────────────
        const cantidadAEnviar = balanceSG * infoCripta.tasa;

        if (cantidadAEnviar < infoCripta.minimoNativo) {
            return res.status(400).json({
                error: `Mínimo no alcanzado. Necesitas más SG para retirar ${infoCripta.simFP}.`
            });
        }

        // ── 5. Procesar pago según pasarela ────────────────────────────────────
        let pagoExitoso  = false;
        let mensajeRetorno = '';

        if (pasarela === 'bitso_lightning' && cripto === 'Bitcoin') {
            // ⚠️ PENDIENTE DE IMPLEMENTAR: integración real con Bitso Lightning
            const resLN = await ejecutarRetiroBitsoLightning(wallet, cantidadAEnviar);
            if (resLN.success) {
                pagoExitoso    = true;
                mensajeRetorno = `¡Energía canalizada! Enviados ${cantidadAEnviar.toFixed(7)} BTC via Lightning.`;
            }

        } else if (['bitso', 'binance', 'coinbase'].includes(pasarela)) {
            // ✅ Retiro on-chain usando la red configurada en BLOCKCHAIN_RPC
            const resOC = await procesarRetiroOnChain(
                wallet,
                cantidadAEnviar,
                claveAdmin,
                contratoAddr,
                blockchainRPC,
                blockchainEnv
            );

            if (resOC.success) {
                pagoExitoso    = true;
                mensajeRetorno = `Cosecha autorizada${blockchainEnv === 'testnet' ? ' en Amoy (testnet)' : ''}. Tx: ${resOC.txHash.slice(0, 10)}...`;
            } else {
                return res.status(500).json({ error: resOC.error || 'La blockchain rechazó la transferencia.' });
            }

        } else {
            return res.status(400).json({ error: 'Pasarela no reconocida.' });
        }

        // ── 6. Cerrar candados y resetear balance ──────────────────────────────
        if (pagoExitoso) {
            await Promise.all([
                redisCmd(['SET', walletKey, 'activo', 'EX', '86400']),
                redisCmd(['SET', ipKey,     'activo', 'EX', '86400']),
                redisCmd(['SET', balanceKey, '0'])   // resetear saldo tras retiro exitoso
            ]);

            await enviarAlertaTelegram(
                `💀 *RETIRO EXITOSO* (${blockchainEnv.toUpperCase()})\n` +
                `*Hacia:* \`${wallet}\`\n` +
                `*Monto:* \`${cantidadAEnviar.toFixed(8)}\` ${infoCripta.simFP}\n` +
                `*Pasarela:* ${pasarela.toUpperCase()}`
            );

            return res.status(200).json({
                success: true,
                mensaje: mensajeRetorno,
                balanceAlmas: 0,
                red: blockchainEnv  // útil para mostrar en frontend si es testnet o mainnet
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

// ── Validar formato de wallet según pasarela ──────────────────────────────────
function validarDireccion(wallet, pasarela, cripto) {
    const regexEVM = /^0x[a-fA-F0-9]{40}$/;
    const regexBTC = /^(bc1[a-zA-Z0-9]{6,87}|[13][a-zA-HJ-NP-Z1-9]{25,34})$/;
    const regexLTC = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/;

    if (pasarela === 'binance' || pasarela === 'coinbase') {
        return regexEVM.test(wallet);
    }

    if (pasarela === 'bitso') {
        // ✅ Bitso acepta BTC, LTC y EVM según la cripto
        if (cripto === 'Bitcoin') return regexBTC.test(wallet);
        if (cripto === 'Litecoin') return regexLTC.test(wallet);
        return regexEVM.test(wallet); // USDT, ETH, etc.
    }

    if (pasarela === 'bitso_lightning') {
        return regexBTC.test(wallet);
    }

    return wallet.length > 5;
}

// ── Retiro on-chain (Amoy testnet ahora, mainnet después) ─────────────────────
async function procesarRetiroOnChain(walletUsuario, monto, claveAdmin, contratoAddr, rpcUrl, entorno) {
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const walletAdmin = new ethers.Wallet(claveAdmin, provider);

        const MIN_ABI = [
            'function transfer(address to, uint256 amount) returns (bool)'
        ];

        const contrato = new ethers.Contract(contratoAddr, MIN_ABI, walletAdmin);
        const cantidadConDecimales = ethers.parseUnits(monto.toString(), 18);

        console.log(`🤖 [${entorno}] Enviando ${monto} tokens a: ${walletUsuario}`);

        const tx      = await contrato.transfer(walletUsuario, cantidadConDecimales);
        const receipt = await tx.wait();

        return { success: true, txHash: receipt.hash };

    } catch (error) {
        console.error(`Fallo en blockchain [${entorno}]:`, error);
        return { success: false, error: error.message };
    }
}

// ── Bitso Lightning (⚠️ pendiente de implementación real) ────────────────────
async function ejecutarRetiroBitsoLightning(invoice, monto) {
    // TODO: Implementar integración real con API de Bitso cuando esté listo
    console.warn('⚠️ ejecutarRetiroBitsoLightning: implementación pendiente.');
    return { success: false, error: 'Bitso Lightning aún no implementado.' };
}

// ── Anti-VPN con proxycheck.io ────────────────────────────────────────────────
async function verificarFraudeIP(ip) {
    try {
        const apiKey = process.env.PROXYCHECK_API_KEY;
        if (!apiKey) return { bloquear: false }; // Si no hay key, no bloquear

        const res  = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1`);
        const data = await res.json();

        if (data?.[ip]?.proxy === 'yes' || data?.[ip]?.is_hosting === 'yes') {
            return { bloquear: true };
        }
        return { bloquear: false };

    } catch {
        return { bloquear: false }; // En caso de error, no bloquear
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