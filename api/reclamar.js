import { ethers } from 'ethers';

// ABI mínimo ERC-20 para transferir SG
const ERC20_ABI = [
    "function transfer(address to, uint256 value) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido.' });
    }

    // ── Variables de entorno ───────────────────────────────────────────────────
    const redisUrl      = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
    const redisToken    = process.env.UPSTASH_REDIS_REST_TOKEN;
    const claveAdmin    = process.env.ADMIN_PRIVATE_KEY;       // wallet bóveda usuarios
    const contratoAddr  = process.env.SOULGEIST_CONTRACT_ADDRESS;
    const blockchainRPC = process.env.BLOCKCHAIN_RPC || 'https://rpc.ankr.com/polygon';

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Redis no configurado.' });
    }
    if (!claveAdmin || !contratoAddr) {
        return res.status(500).json({ error: 'Bóveda Web3 no configurada.' });
    }

    // ── Helper Redis ───────────────────────────────────────────────────────────
    const redisCmd = async (comando) => {
        const r = await fetch(redisUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(comando)
        });
        return r.json();
    };

    // ── Extraer body ───────────────────────────────────────────────────────────
    const { identidad, cripto, pasarela, sgAEnviar, saldoVisual } = req.body || {};
    const wallet = req.body?.wallet?.trim() || '';

    if (!identidad)  return res.status(400).json({ error: 'Falta la identidad del alma.' });
    if (!wallet || wallet.length < 8) return res.status(400).json({ error: 'Wallet inválida.' });
    if (!cripto)     return res.status(400).json({ error: 'Falta la cripto.' });
    if (!pasarela)   return res.status(400).json({ error: 'Falta la pasarela.' });

    const cantidadSG = parseFloat(sgAEnviar || 0);
    if (cantidadSG <= 0) {
        return res.status(400).json({ error: 'Cantidad de SG inválida.' });
    }

    // Validar wallet EVM
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({ error: 'Dirección de wallet inválida. Debe ser una dirección Ethereum/Polygon.' });
    }

    // ── IP y país ──────────────────────────────────────────────────────────────
    const rawIp    = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || '127.0.0.1';
    const country  = req.headers['x-vercel-ip-country'] || 'XX';

    // ── Filtro geográfico ──────────────────────────────────────────────────────
    const PAISES_BLOQUEADOS = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI'];
    if (PAISES_BLOQUEADOS.includes(country)) {
        return res.status(403).json({ error: 'Región no disponible.' });
    }

    // ── Mínimo de retiro: equivalente a 0.0000002 BTC en SG ──────────────────
    // Con precio actual ~$107,000 BTC y SG ~$0.0001868
    // 0.0000002 BTC = $0.0214 USD = ~114 SG
    const MINIMO_SG = 100; // 100 SG mínimo de retiro
    if (cantidadSG < MINIMO_SG) {
        return res.status(400).json({
            error: `Mínimo de retiro: ${MINIMO_SG} SG. Tienes ${cantidadSG.toFixed(2)} SG equivalentes.`
        });
    }

    // ── Claves Redis ───────────────────────────────────────────────────────────
    const identidadNorm = identidad.toLowerCase().trim();
    const balanceKey    = `usuario:${identidadNorm.replace(/[^a-zA-Z0-9@._-]/g, '_')}`;
    const walletKey     = `retiro:wallet:${wallet.toLowerCase()}:${cripto}`;
    const ipKey         = `retiro:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`;

    try {
        // ── 1. Verificar cooldown 24h ──────────────────────────────────────────
        const [resWallet, resIp] = await Promise.all([
            redisCmd(['GET', walletKey]),
            redisCmd(['GET', ipKey])
        ]);

        if (resWallet?.result || resIp?.result) {
            return res.status(429).json({ error: 'Debes esperar 24 horas para otro retiro.' });
        }

        // ── 2. Anti-VPN ────────────────────────────────────────────────────────
        const auditoriaIP = await verificarFraudeIP(ipLimpia);
        if (auditoriaIP.bloquear) {
            return res.status(403).json({ error: 'VPN/Proxy detectado. Retiro no permitido.' });
        }

        // ── 3. Verificar balance real en Redis ─────────────────────────────────
        const balanceRes  = await redisCmd(['GET', balanceKey]);
        const usuarioData = balanceRes?.result ? JSON.parse(balanceRes.result) : null;
        const balanceSG   = parseFloat(usuarioData?.balance_soulgeist || 0);

        if (balanceSG <= 0) {
            return res.status(400).json({ error: 'No tienes SG suficientes para retirar.' });
        }

        // ── 4. Transferir SG desde la bóveda al usuario ───────────────────────
        const resultado = await transferirSG(wallet, cantidadSG, claveAdmin, contratoAddr, blockchainRPC);

        if (!resultado.success) {
            return res.status(500).json({ error: resultado.error });
        }

        // ── 5. Cerrar candados y resetear balance ──────────────────────────────
        const usuarioActual = usuarioData || {};
        usuarioActual.balance_soulgeist = 0;

        await Promise.all([
            redisCmd(['SET', walletKey, 'activo', 'EX', 86400]),
            redisCmd(['SET', ipKey,     'activo', 'EX', 86400]),
            redisCmd(['SET', balanceKey, JSON.stringify(usuarioActual)])
        ]);

        // ── 6. Alerta Telegram ─────────────────────────────────────────────────
        await enviarAlertaTelegram(
            `💀 *RETIRO EXITOSO*\n` +
            `👤 *Usuario:* \`${identidadNorm}\`\n` +
            `📬 *Wallet:* \`${wallet}\`\n` +
            `💎 *SG enviados:* \`${cantidadSG.toFixed(4)}\`\n` +
            `🪙 *Cripto elegida:* ${cripto}\n` +
            `📊 *Saldo visual:* ${parseFloat(saldoVisual || 0).toFixed(8)}\n` +
            `🔗 *Tx:* \`${resultado.txHash}\``
        );

        return res.status(200).json({
            success: true,
            txHash: resultado.txHash,
            balanceAlmas: 0,
            mensaje: `✅ ${cantidadSG.toFixed(2)} SG enviados a tu MetaMask.\n` +
                     `Puedes convertirlos a ${cripto} en QuickSwap.\n` +
                     `Tx: ${resultado.txHash.slice(0, 14)}...`
        });

    } catch (err) {
        console.error('Error en reclamar:', err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo.' });
    }
}

// ── Transferir SG desde la bóveda al usuario ─────────────────────────────────
async function transferirSG(walletUsuario, cantidadSG, claveAdmin, contratoAddr, rpcUrl) {
    try {
        const provider    = new ethers.JsonRpcProvider(rpcUrl);
        const walletAdmin = new ethers.Wallet(claveAdmin, provider);
        const contrato    = new ethers.Contract(contratoAddr, ERC20_ABI, walletAdmin);

        const decimals = await contrato.decimals();
        const cantidad = ethers.parseUnits(cantidadSG.toFixed(18).slice(0, cantidadSG.toFixed(18).indexOf('.') + 19), decimals);

        // Verificar saldo de la bóveda
        const saldoBoveda = await contrato.balanceOf(walletAdmin.address);
        if (saldoBoveda < cantidad) {
            return { success: false, error: 'La bóveda no tiene suficientes SG. Contacta al administrador.' };
        }

        console.log(`🤖 Enviando ${cantidadSG} SG a ${walletUsuario}`);

        const tx      = await contrato.transfer(walletUsuario, cantidad);
        const receipt = await tx.wait(1);

        console.log(`✅ Tx confirmada: ${receipt.hash}`);
        return { success: true, txHash: receipt.hash };

    } catch (error) {
        console.error('❌ Error blockchain:', error.message);
        if (error.message?.includes('insufficient funds')) {
            return { success: false, error: 'La bóveda no tiene MATIC para el gas. Contacta al administrador.' };
        }
        return { success: false, error: 'Error en la transferencia. Intenta de nuevo.' };
    }
}

// ── Anti-VPN ──────────────────────────────────────────────────────────────────
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

// ── Alerta Telegram ───────────────────────────────────────────────────────────
async function enviarAlertaTelegram(mensaje) {
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'Markdown' })
    });
}