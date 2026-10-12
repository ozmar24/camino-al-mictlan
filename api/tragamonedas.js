import crypto from 'node:crypto';
import { ethers } from 'ethers';
import {
    autenticarPeticion,
    redisGet,
    redisCmd,
    claveUsuario,
    verificarLimitePeticion,
    verificarOrigen,
    manejarError,
    obtenerIpLimpia,
    escudoAntiBots,
    estaIpBloqueada,
    enviarAlertaTelegram
} from '../lib/seguridad.js';
import { obtenerTasas } from '../lib/tasas.js';
import {
    TRAGA,
    costoTirada,
    evaluarLinea
} from '../lib/traga-constantes.js';

const ERC20_ABI = [
    "function transfer(address to, uint256 value) returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
];

const CRIPTAS_VALIDAS = ['Soulgeist', 'Ethereum', 'Pepe', 'MATIC/POL', 'BNB', 'USDT'];
const TIRADAS_GRATIS_DIARIAS = 5;
const CLAVE_RECAUDO = 'casino:recaudo_pendiente';
const CLAVE_LOCK_RECAUDO = 'casino:recaudo_lock';
const UMBRAL_BARRIDO_SG = 500;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    try {
        // 0. Anti-bot: solo peticiones desde el sitio oficial
        if (!verificarOrigen(req)) {
            return res.status(403).json({ success: false, error: 'Origen no autorizado.' });
        }

        const ip = obtenerIpLimpia(req);
        if (!(await verificarLimitePeticion(req, { max: 40, ventanaSegundos: 60, prefijo: 'rl:traga' }))) {
            return res.status(429).json({ success: false, error: 'Demasiadas peticiones. Espera un momento.' });
        }

        // Lista negra global: IPs de bots reincidentes quedan fuera 24 h.
        if (await estaIpBloqueada(ip)) {
            return res.status(403).json({ success: false, error: 'Acceso denegado.' });
        }

        const email = await autenticarPeticion(req);
        if (!email) {
            return res.status(401).json({ success: false, error: 'Sesión no válida. Vuelve a entrar al Mictlán.' });
        }

        const emailLimpio = email.toLowerCase().trim();
        const userKey = claveUsuario(emailLimpio);

        const { accion } = req.body || {};
        if (!accion) {
            return res.status(400).json({ success: false, error: 'Falta la acción.' });
        }

        // LOCK por usuario: evita que peticiones paralelas con la misma sesión
        // (giros/retiros simultáneos) lean-escruban el saldo a la vez. 10 s de
        // auto-expiración por si un handler muere sin liberar el lock.
        const claveLock = `lock:casino:${userKey}`;
        const lock = await redisCmd('SET', claveLock, '1', 'EX', 10, 'NX');
        if (!lock?.result) {
            return res.status(429).json({ success: false, error: 'Operación anterior aún en curso. Espera un momento.' });
        }
        let lockLiberado = false;
        const liberarLock = async () => {
            if (lockLiberado) return;
            lockLiberado = true;
            try { await redisCmd('DEL', claveLock); } catch { }
        };

        try {
            switch (accion) {
                case 'girar':            return await girar(req, res, emailLimpio, userKey);
                case 'retirar':          return await retirar(req, res, emailLimpio, userKey);
                case 'canalizar':        return await canalizar(req, res, emailLimpio, userKey);
                case 'reclamar_gratis':  return await reclamarGratis(req, res, userKey);
                case 'saldo':            return await saldo(req, res, userKey);
                default:                 return res.status(400).json({ success: false, error: 'Acción no reconocida.' });
            }
        } finally {
            await liberarLock();
        }
    } catch (e) {
        console.error('❌ Error en tragamonedas:', e);
        return manejarError(res, e);
    }
}

async function cargarUsuario(userKey) {
    const raw = await redisGet(userKey);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

function asegurarCasino(usuario) {
    if (!usuario.casino || typeof usuario.casino !== 'object') usuario.casino = {};
    if (typeof usuario.casino.saldo !== 'number' || !Number.isFinite(usuario.casino.saldo)) usuario.casino.saldo = 0;
    if (typeof usuario.casino.gratisRestantes !== 'number' || !Number.isFinite(usuario.casino.gratisRestantes)) usuario.casino.gratisRestantes = 0;
    if (typeof usuario.casino.fechaGratis !== 'string') usuario.casino.fechaGratis = '';
    return usuario.casino;
}

function estadoCasino(casino) {
    return {
        saldo: casino.saldo,
        gratisRestantes: casino.gratisRestantes,
        totalGratis: TIRADAS_GRATIS_DIARIAS
    };
}

async function girar(req, res, emailLimpio, userKey) {
    const lineasSolicitadas = parseInt(req.body?.lineas, 10);

    if (!Number.isInteger(lineasSolicitadas)
        || lineasSolicitadas < TRAGA.LINEAS_MIN
        || lineasSolicitadas > TRAGA.LINEAS_TOTALES
        || (lineasSolicitadas - TRAGA.LINEAS_MIN) % TRAGA.LINEAS_PASO !== 0) {
        return res.status(400).json({ success: false, error: 'Número de líneas inválido.' });
    }

    const costo = costoTirada(lineasSolicitadas);
    const usuario = await cargarUsuario(userKey);
    if (!usuario) {
        return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const casino = asegurarCasino(usuario);
    let usadaGratis = false;
    const hoy = new Date().toISOString().slice(0, 10);
    if (casino.gratisRestantes > 0 && casino.fechaGratis === hoy) {
        usadaGratis = true;
        casino.gratisRestantes -= 1;
    } else {
        const balance = parseFloat(usuario.balance_soulgeist || 0);
        if (costo > balance) {
            return res.status(400).json({
                success: false,
                error: `No tienes suficientes SG. Necesitas ${costo} SG y tienes ${balance.toFixed(2)}.`
            });
        }
        usuario.balance_soulgeist = balance - costo;
    }

    if (!usadaGratis) {
        try {
            await redisCmd('INCRBYFLOAT', CLAVE_RECAUDO, costo);
            await intentarBarridoRecaudo();
        } catch (e) {
            console.warn('⚠️ Recaudo no crítico:', e.message);
        }
    }

    const PESO_TOTAL = TRAGA.SIMBOLOS.reduce((a, s) => a + s.peso, 0);
    const grid = [];

    for (let c = 0; c < TRAGA.COLUMNAS; c++) {
        const columna = [];
        for (let f = 0; f < TRAGA.FILAS; f++) {
            let r = crypto.randomInt(0, PESO_TOTAL);
            let simbolo = TRAGA.SIMBOLOS[0].nombre;
            for (const s of TRAGA.SIMBOLOS) {
                r -= s.peso;
                if (r < 0) { simbolo = s.nombre; break; }
            }
            columna.push(simbolo);
        }
        if (crypto.randomInt(0, 20) === 0) {
            columna[crypto.randomInt(0, TRAGA.FILAS)] = TRAGA.SCATTER_NOMBRE;
        }
        grid.push(columna);
    }

    const lineasActivas = TRAGA.LINEAS.slice(0, lineasSolicitadas);
    const costoLinea = costo / lineasSolicitadas;
    let premioTotal = 0;
    const ganancias = [];

    for (let i = 0; i < lineasActivas.length; i++) {
        const L = lineasActivas[i];
        const celdas = L.map((fila, col) => grid[col][fila]);
        const { simbolo, coincidencias } = evaluarLinea(celdas);
        const mult = TRAGA.PAGOS[simbolo]?.[coincidencias];
        if (mult) {
            // Premios enteros, sin decimales
            const monto = Math.round(mult * costoLinea);
            if (monto > 0) {
                premioTotal += monto;
                ganancias.push({
                    linea: i + 1,
                    celdas: L.map((fila, col) => col * 5 + fila),
                    simbolo,
                    coincidencias,
                    monto
                });
            }
        }
    }

    const celdasSG = [];
    grid.forEach((columna, col) => {
        columna.forEach((sim, fila) => {
            if (sim === TRAGA.SCATTER_NOMBRE) celdasSG.push(col * 5 + fila);
        });
    });
    const sgCount = celdasSG.length;
    const scatterMult = TRAGA.SCATTER_PAGOS[sgCount];
    let scatterMonto = 0;
    if (scatterMult) {
        scatterMonto = Math.round(scatterMult * costo); // entero, sin decimales
        premioTotal += scatterMonto;
    }

    premioTotal = Math.round(premioTotal);
    casino.saldo = +(casino.saldo + premioTotal).toFixed(4);
    await redisCmd('SET', userKey, JSON.stringify(usuario));

    if (sgCount >= 4) {
        await alertarJackpot(emailLimpio, sgCount, premioTotal);
    }

    return res.status(200).json({
        success: true,
        grid,
        ganancias,
        premio: premioTotal,
        scatter: { cantidad: sgCount, monto: scatterMonto, celdas: celdasSG },
        costo,
        usadaGratis,
        casino: estadoCasino(casino),
        balanceSG: Math.floor(parseFloat(usuario.balance_soulgeist || 0))
    });
}

async function reclamarGratis(req, res, userKey) {
    const usuario = await cargarUsuario(userKey);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

    const casino = asegurarCasino(usuario);
    const hoy = new Date().toISOString().slice(0, 10);

    if (casino.fechaGratis === hoy) {
        return res.status(429).json({
            success: false,
            error: 'Ya reclamaste las tiradas gratis de hoy. Vuelve mañana.',
            casino: estadoCasino(casino)
        });
    }

    casino.fechaGratis = hoy;
    casino.gratisRestantes = TIRADAS_GRATIS_DIARIAS;
    await redisCmd('SET', userKey, JSON.stringify(usuario));

    return res.status(200).json({
        success: true,
        casino: estadoCasino(casino),
        balanceSG: Math.floor(parseFloat(usuario.balance_soulgeist || 0)),
        mensaje: `🎁 Recibiste ${TIRADAS_GRATIS_DIARIAS} tiradas gratis para hoy.`
    });
}

async function retirar(req, res, emailLimpio, userKey) {
    const wallet = String(req.body?.wallet || '').trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
        return res.status(400).json({ success: false, error: 'Wallet inválida.' });
    }

    const usuario = await cargarUsuario(userKey);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

    const casino = asegurarCasino(usuario);
    const monto = casino.saldo;

    if (monto < TRAGA.MINIMO_RETIRO) {
        return res.status(400).json({
            success: false,
            error: `Mínimo de retiro: ${TRAGA.MINIMO_RETIRO} SG.`
        });
    }

    const claveMarketing = process.env.MARKETING_PRIVATE_KEY;
    const contratoAddr   = process.env.SOULGEIST_CONTRACT_ADDRESS;
    const rpcUrl         = process.env.BLOCKCHAIN_RPC || 'https://rpc.ankr.com/polygon';

    if (!claveMarketing) return res.status(500).json({ success: false, error: 'Cuenta de Eventos y Marketing no configurada.' });
    if (!contratoAddr)   return res.status(500).json({ success: false, error: 'Contrato SG no configurado.' });

    // Anti-bots: retiros de dinero real exigen IP limpia (sin VPN/proxy/hosting).
    const escudo = await escudoAntiBots(obtenerIpLimpia(req));
    if (!escudo.permitir) {
        return res.status(403).json({ success: false, error: 'VPN/Proxy o actividad sospechosa detectada.' });
    }

    try {
        // REGLA DE RETIRO ÍNTEGRO: el 2% de quema del contrato lo absorbe la
        // cuenta emisora, NO el usuario. PERO si el DESTINO está excluido de
        // la quema (isExcludedFromBurn) el contrato NO quema nada y
        // compensar con /0.98 pagaría de más (incidente 2026-10-12: retiro
        // de 102 SG llegó como 104.0816 a una wallet excluida). Se pregunta
        // al contrato y se compensa SOLO si la quema aplica.
        let destinoExcluido = false;
        try {
            const sonda = new ethers.Contract(
                contratoAddr,
                ['function isExcludedFromBurn(address) view returns (bool)'],
                new ethers.JsonRpcProvider(rpcUrl)
            );
            destinoExcluido = await sonda.isExcludedFromBurn(wallet);
        } catch (e) { destinoExcluido = false; } // ante duda, compensa (conservador)
        const cantidadAEnviar = destinoExcluido
            ? Math.ceil(monto * 1e6) / 1e6
            : Math.ceil((monto / 0.98) * 1e6) / 1e6;
        const tx = await transferirSG(wallet, cantidadAEnviar, claveMarketing, contratoAddr, rpcUrl);
        if (!tx.success) {
            return res.status(500).json({ success: false, error: tx.error });
        }

        casino.saldo = 0;
        await redisCmd('SET', userKey, JSON.stringify(usuario));

        // La transferencia YA SE CONFIRMÓ y el saldo YA SE VACIÓ: a partir de
        // aquí nada puede convertir este retiro en "error" para el usuario.
        // Telegram va encapsulado: una caída de Telegram jamás debe provocar
        // que el jugador reintente un retiro ya pagado (riesgo de doble pago).
        try {
            await enviarTelegram(
                `🎰 *RETIRO DE TRAGAMONEDAS*\n` +
                `👤 \`${emailLimpio}\`\n` +
                `📬 \`${wallet}\`\n` +
                `💎 \`${monto.toFixed(4)} SG\` (enviados: ${cantidadAEnviar.toFixed(6)} SG, el 2% de quema lo absorbe la cuenta emisora)\n` +
                `📤 Cuenta: Eventos y Marketing\n` +
                `🔗 Tx: \`${tx.txHash}\``
            );
        } catch (eTelegram) {
            console.error('⚠️ Telegram falló tras un retiro CONFIRMADO (no crítico):', eTelegram?.message);
        }

        return res.status(200).json({
            success: true,
            monto,
            txHash: tx.txHash,
            casino: estadoCasino(casino),
            balanceSG: Math.floor(parseFloat(usuario.balance_soulgeist || 0)),
            mensaje: `✅ ${monto.toFixed(2)} SG enviados a tu MetaMask.`
        });
    } catch (e) {
        console.error('❌ Error retirar tragamonedas:', e);
        return res.status(500).json({ success: false, error: 'Error en la transferencia.' });
    }
}

async function canalizar(req, res, emailLimpio, userKey) {
    const cripta = String(req.body?.cripta || '').trim();
    if (!CRIPTAS_VALIDAS.includes(cripta)) {
        return res.status(400).json({ success: false, error: 'Cripta de destino inválida.' });
    }

    const usuario = await cargarUsuario(userKey);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

    const casino = asegurarCasino(usuario);
    const monto = casino.saldo;

    if (monto < TRAGA.MINIMO_RETIRO) {
        return res.status(400).json({
            success: false,
            error: `Mínimo para canalizar: ${TRAGA.MINIMO_RETIRO} SG.`
        });
    }

    casino.saldo = 0;
    let mensaje = '';
    let montoNative = null;

    if (cripta === 'Soulgeist') {
        usuario.balance_soulgeist = parseFloat(usuario.balance_soulgeist || 0) + monto;
        mensaje = `✅ ${monto.toFixed(2)} SG absorbidos por tu poder Soulgeist.`;
    } else {
        if (!usuario.casino_tumbas || typeof usuario.casino_tumbas !== 'object') usuario.casino_tumbas = {};
        const tasas = await obtenerTasas();
        const tasa = tasas?.[cripta]?.tasa;
        if (!(tasa > 0)) {
            casino.saldo = monto;
            await redisCmd('SET', userKey, JSON.stringify(usuario));
            return res.status(503).json({ success: false, error: 'Tasa no disponible.' });
        }
        montoNative = +(monto * tasa).toFixed(8);
        usuario.casino_tumbas[cripta] = parseFloat(usuario.casino_tumbas[cripta] || 0) + montoNative;
        mensaje = `✅ ${monto.toFixed(2)} SG canalizados a la cripta ${cripta}.`;
    }

    await redisCmd('SET', userKey, JSON.stringify(usuario));

    return res.status(200).json({
        success: true,
        monto,
        destino: cripta,
        ...(montoNative !== null && { montoNative }),
        casino: estadoCasino(casino),
        balanceSG: Math.floor(parseFloat(usuario.balance_soulgeist || 0)),
        mensaje
    });
}

async function saldo(req, res, userKey) {
    const usuario = await cargarUsuario(userKey);
    if (!usuario) return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });

    const casino = asegurarCasino(usuario);
    const hoy = new Date().toISOString().slice(0, 10);
    if (casino.fechaGratis !== hoy) casino.gratisRestantes = 0;

    return res.status(200).json({
        success: true,
        casino: estadoCasino(casino),
        balanceSG: Math.floor(parseFloat(usuario.balance_soulgeist || 0))
    });
}

async function intentarBarridoRecaudo() {
    const potRes = await redisGet(CLAVE_RECAUDO);
    const pot = parseFloat(potRes || 0);
    if (!(pot >= UMBRAL_BARRIDO_SG)) return;

    const lock = await redisCmd('SET', CLAVE_LOCK_RECAUDO, 'activo', 'EX', 180, 'NX');
    if (!lock?.result) return;

    try {
        const claveBoveda    = process.env.ADMIN_PRIVATE_KEY;
        const claveMarketing = process.env.MARKETING_PRIVATE_KEY;
        const contratoAddr   = process.env.SOULGEIST_CONTRACT_ADDRESS;
        const rpcUrl         = process.env.BLOCKCHAIN_RPC || 'https://rpc.ankr.com/polygon';

        if (!claveBoveda || !claveMarketing || !contratoAddr) return;

        const direccionMarketing = new ethers.Wallet(claveMarketing).address;
        // Tope hacia arriba: que la tesorería nunca reciba menos que lo recaudado
        const cantidadNeta = Math.ceil((pot / 0.98) * 1e6) / 1e6;
        const tx = await transferirSG(direccionMarketing, cantidadNeta, claveBoveda, contratoAddr, rpcUrl);
        if (!tx.success) return;

        await redisCmd('SET', CLAVE_RECAUDO, '0');
        await enviarTelegram(
            `🎰💰 *RECAUDACIÓN DE TRAGAMONEDAS*\n` +
            `💎 \`${pot.toFixed(2)} SG\` Bóveda → Eventos y Marketing\n` +
            `🔗 Tx: \`${tx.txHash}\``
        );
    } finally {
        await redisCmd('DEL', CLAVE_LOCK_RECAUDO);
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
        // Diagnóstico del gas: los transfers ERC-20 pagan el gas en POL nativo.
        // Sin POL la firma de la tx falla con "insufficient funds" y el
        // retiro muere con un error genérico. Detectarlo ANTES da un mensaje
        // accionable (recargar POL en la wallet emisora).
        const gasDisponible = await provider.getBalance(wallet.address);
        if (gasDisponible < ethers.parseEther('0.03')) {
            return {
                success: false,
                error: 'La cuenta de envíos no tiene POL para pagar el gas de Polygon. Añádele un poco de POL a esa wallet y reintenta.'
            };
        }
        const tx = await contrato.transfer(walletUsuario, cantidad);
        const receipt = await tx.wait(1);
        return { success: true, txHash: receipt.hash };
    } catch (error) {
        console.error('❌ Error blockchain marketing:', error.message);
        // Traducir los errores con causa conocida a mensajes accionables.
        const msg = String(error?.shortMessage || error?.message || '');
        if (/insufficient funds/i.test(msg)) {
            return { success: false, error: 'La cuenta de envíos no tiene POL suficiente para el gas. Añádele POL y reintenta.' };
        }
        if (/transfer amount exceeds balance/i.test(msg)) {
            return { success: false, error: 'La cuenta de envíos no tiene SG suficientes para cubrir este retiro.' };
        }
        if (/(timeout|TIMEOUT|network|ETIMEDOUT|ECONNRESET)/i.test(msg)) {
            return { success: false, error: 'Polygon no respondió a tiempo. Reintenta en un minuto.' }; 
        }
        return { success: false, error: 'Error en la transferencia.' };
    }
}

async function enviarTelegram(mensaje) {
    await enviarAlertaTelegram(mensaje, 'Markdown');
}

async function alertarJackpot(email, cantidadSG, monto) {
    await enviarTelegram(
        `🚨🎰 *PREMIO MAYOR EN LA TRAGAMONEDAS*\n` +
        `👤 \`${email}\`\n` +
        `💠 ${cantidadSG}× Soulgeist\n` +
        `💎 \`${monto.toFixed(2)} SG\`\n` +
        `⚡ Revisar actividad si hay algo sospechoso.`
    );
}