import { ethers } from 'ethers';
import {
    autenticarPeticion,
    redisCmd,
    redisGet,
    verificarLimitePeticion,
    verificarOrigen,
    claveUsuario,
    obtenerIpLimpia,
    enviarAlertaTelegram,
    manejarError,
    escudoAntiBots
} from '../lib/seguridad.js';
import { obtenerTasas } from '../lib/tasas.js';

// ABI mínimo ERC-20 para transferir SG
const ERC20_ABI = [
    "function transfer(address to, uint256 value) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido.' });
    }

    try {
        // 0. Anti-bot: solo peticiones desde el sitio oficial
        if (!verificarOrigen(req)) {
            return res.status(403).json({ error: 'Origen no autorizado.' });
        }

        // 1. Rate Limiting
        const ipLimpia = obtenerIpLimpia(req);
        if (!(await verificarLimitePeticion(req, { max: 5, ventanaSegundos: 3600, prefijo: 'rl:reclamar' }))) {
            return res.status(429).json({ error: 'Límite de retiros alcanzado. Intenta mañana.' });
        }

        // 2. Variables de entorno
        const claveAdmin    = process.env.ADMIN_PRIVATE_KEY;
        const contratoAddr  = process.env.SOULGEIST_CONTRACT_ADDRESS;
        const blockchainRPC = process.env.BLOCKCHAIN_RPC || 'https://rpc.ankr.com/polygon';

        if (!claveAdmin || !contratoAddr) {
            return res.status(500).json({ error: 'Bóveda Web3 no configurada.' });
        }

        // 3. Sesión OBLIGATORIA: la identidad la da el servidor, nunca el navegador.
        // (Antes se aceptaba 'identidad' del body, lo que permitía reclamar la
        // cripta de cualquier usuario conociendo solo su email.)
        const identidad = await autenticarPeticion(req);
        if (!identidad) {
            return res.status(401).json({ error: 'Sesión no válida. Vuelve a entrar al Mictlán.' });
        }

        // 4. Extraer body
        const { cripto, pasarela } = req.body || {};
        const wallet = String(req.body?.wallet || '').trim();

        if (!cripto) {
            return res.status(400).json({ error: 'Falta la cripto.' });
        }

        // 5. Cripta del SERVIDOR (única fuente de verdad): es lo que el usuario
        // fusionó. Se IGNORA cualquier saldo que mande el cliente (anti-F12).
        const identidadNorm = identidad.toLowerCase().trim();
        const balanceKey = claveUsuario(identidadNorm);
        const usuarioRaw = await redisGet(balanceKey);
        const usuarioData = usuarioRaw ? JSON.parse(usuarioRaw) : null;
        if (!usuarioData) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const criptaSG = parseFloat(usuarioData.tumbas?.[cripto] || 0);
        if (!(criptaSG > 0)) {
            return res.status(400).json({
                error: 'Tu cripta está vacía. Primero fusiona Soulgeist para poder cosechar.'
            });
        }

        // 6. Validar destino
        if (!wallet || wallet.length < 8) return res.status(400).json({ error: 'Wallet inválida.' });
        if (!pasarela)   return res.status(400).json({ error: 'Falta la pasarela.' });
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({ error: 'Dirección de wallet inválida.' });
        }

        // 7. Filtro geográfico
        const country = req.headers['x-vercel-ip-country'] || 'XX';
        const PAISES_BLOQUEADOS = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI'];
        if (PAISES_BLOQUEADOS.includes(country)) {
            return res.status(403).json({ error: 'Región no disponible.' });
        }

        // 8. Monto desde el servidor: SG equivalentes a lo que hay en la cripta
        const tasas = await obtenerTasas();
        const tasa = tasas?.[cripto]?.tasa;
        if (!(tasa > 0)) {
            return res.status(503).json({ error: 'Tasa no disponible. Intenta más tarde.' });
        }
        const cantidadSG = +(criptaSG / tasa).toFixed(4);

        // 9. Mínimo de retiro
        const MINIMO_SG = 100;
        if (cantidadSG < MINIMO_SG) {
            return res.status(400).json({
                error: `Mínimo de retiro: ${MINIMO_SG} SG. Tienes ${cantidadSG.toFixed(2)} SG en tu cripta.`
            });
        }

        // 10. Claves Redis
        const walletKey = `retiro:wallet:${wallet.toLowerCase()}:${cripto}`;
        const ipKey     = `retiro:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`;

        // 11. Verificar cooldown 24h
        const [resWallet, resIp] = await Promise.all([
            redisGet(walletKey),
            redisGet(ipKey)
        ]);

        if (resWallet || resIp) {
            return res.status(429).json({ error: 'Debes esperar 24 horas para otro retiro.' });
        }

        // 12. Escudo anti-bots: lista negra (fail-closed) + ProxyCheck con riesgo.
        const escudo = await escudoAntiBots(ipLimpia);
        if (!escudo.permitir) {
            return res.status(403).json({ error: 'VPN/Proxy o actividad sospechosa detectada. Retiro no permitido.' });
        }

        // 12b. RESERVA ATÓMICA del cooldown ANTES de transferir (anti doble-gasto).
        // Si dos peticiones idénticas llegan a la vez, solo la primera gana la
        // reserva; la segunda se detiene aquí y NUNCA llega a la blockchain.
        const [reservaWallet, reservaIp] = await Promise.all([
            redisCmd('SET', walletKey, 'activo', 'EX', 86400, 'NX'),
            redisCmd('SET', ipKey, 'activo', 'EX', 86400, 'NX')
        ]);
        if (!reservaWallet?.result || !reservaIp?.result) {
            return res.status(429).json({ error: 'Debes esperar 24 horas para otro retiro.' });
        }

        // 13. Transferir SG desde la bóveda al usuario
        // Compensamos la quema automática del 2% del contrato para que el usuario
        // reciba la cantidad íntegra en su MetaMask.
        const cantidadCompensada = cantidadSG / 0.98;
        const resultado = await transferirSG(wallet, cantidadCompensada, claveAdmin, contratoAddr, blockchainRPC);

        if (!resultado.success) {
            // La transferencia falló: liberamos la reserva para no bloquear al usuario.
            await Promise.all([
                redisCmd('DEL', walletKey),
                redisCmd('DEL', ipKey)
            ]);
            return res.status(500).json({ error: resultado.error });
        }

        // 14. Actualizar estado: la cripta se vacía (el SG ya viajó a la wallet)
        const usuarioActual = usuarioData;
        if (usuarioActual.tumbas && usuarioActual.tumbas[cripto] !== undefined) {
            usuarioActual.tumbas[cripto] = 0;
        }

        // ⚠️ CRÍTICO: redisCmd espera argumentos sueltos, NO un array. Con el
        // array anidado Upstash devolvía null silenciosamente y la cripta
        // NUNCA se vaciaba → doble pago real tras el cooldown de 24 h.
        await redisCmd('SET', balanceKey, JSON.stringify(usuarioActual));

        // 12. Alerta Telegram
        await enviarAlertaTelegram(
            `💀 *RETIRO EXITOSO*\n` +
            `👤 *Usuario:* \`${identidadNorm}\`\n` +
            `📬 *Wallet:* \`${wallet}\`\n` +
            `💎 *SG enviados:* \`${cantidadSG.toFixed(4)}\`\n` +
            `🪙 *Cripto elegida:* ${cripto}\n` +
            `🔗 *Tx:* \`${resultado.txHash}\``,
            'Markdown'
        );

        return res.status(200).json({
            success: true,
            txHash: resultado.txHash,
            balanceAlmas: usuarioActual.balance_soulgeist,
            mensaje: `✅ ${cantidadSG.toFixed(2)} SG enviados a tu MetaMask.`
        });

    } catch (err) {
        console.error('Error en reclamar:', err);
        return manejarError(res, err);
    }
}

async function transferirSG(walletUsuario, cantidadSG, claveMarketing, contratoAddr, rpcUrl) {
    const RPCS = [
        rpcUrl,
        'https://rpc.ankr.com/polygon',
        'https://polygon-bor-rpc.publicnode.com',
        'https://rpc-mainnet.matic.quiknode.pro'
    ].filter(Boolean);

    let provider = null;
    for (const rpc of RPCS) {
        try {
            const p = new ethers.JsonRpcProvider(rpc);
            await p.getBlockNumber();
            provider = p;
            break;
        } catch { }
    }
    if (!provider) return { success: false, error: 'No se pudo conectar a Polygon.' };

    try {
        const wallet = new ethers.Wallet(claveMarketing, provider);
        const contrato = new ethers.Contract(contratoAddr, ERC20_ABI, wallet);
        const cantidad = ethers.parseUnits(cantidadSG.toFixed(6), 18);
        const saldoMarketing = await contrato.balanceOf(wallet.address);
        if (saldoMarketing < cantidad) {
            return { success: false, error: 'La cuenta de marketing no tiene fondos.' };
        }
        const tx = await contrato.transfer(walletUsuario, cantidad);
        const receipt = await tx.wait(1);
        return { success: true, txHash: receipt.hash };
    } catch (error) {
        console.error('❌ Error blockchain:', error.message);
        return { success: false, error: 'Error en la transferencia.' };
    }
}

