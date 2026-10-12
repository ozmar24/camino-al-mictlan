// diag-casino-retiro.cjs
// Diagnóstico del retiro del casino (READ-ONLY: no envía transacciones).
// Verifica, en este orden:
//   1. .env cargado con las claves necesarias
//   2. RPC de Polygon vivo
//   3. Wallet emisora ("Eventos y Marketing") derivada de MARKETING_PRIVATE_KEY
//   4. POL nativo de esa wallet (gas)   → necesita >= 0.03 POL
//   5. Saldo SG de esa wallet          → cubrir el retiro + 2% de quema
//   6. (Opcional) La wallet del usuario:  node diag-casino-retiro.cjs 0xTU_WALLET
//
// Uso:  node diag-casino-retiro.cjs [walletUsuarioOpcional]

require('dotenv').config();
const { ethers } = require('ethers');

const RPCS = [
    process.env.BLOCKCHAIN_RPC,
    'https://rpc.ankr.com/polygon',
    'https://polygon-bor-rpc.publicnode.com',
    'https://rpc-mainnet.matic.quiknode.pro'
].filter(Boolean);

const CONTRATO = process.env.SOULGEIST_CONTRACT_ADDRESS || '0x51Fb9B6b0e008eFC867492D2930D959879A5bCfB';
const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
];
const MIN_GAS_POL = ethers.parseEther('0.03');

(async () => {
    console.log('=== DIAGNÓSTICO DE RETIRO DEL CASINO (solo lectura) ===\n');

    // 1. Env
    const pk = process.env.MARKETING_PRIVATE_KEY;
    console.log('[1] Claves del .env:');
    console.log('    MARKETING_PRIVATE_KEY   :', pk ? '✅ presente' : '❌ FALTA (esa es la wallet emisora del retiro del casino)');
    console.log('    ADMIN_PRIVATE_KEY       :', process.env.ADMIN_PRIVATE_KEY ? '✅ presente' : '❌ falta (solo se usa para el barrido de recaudo)');
    console.log('    SOULGEIST_CONTRACT_ADDR :', CONTRATO);
    console.log('');
    if (!pk) {
        console.log('🛑 Sin MARKETING_PRIVATE_KEY no se puede diagnosticar la wallet emisora. Copia el .env de Vercel a local y reintenta.');
        return;
    }

    // 2. RPC vivo
    let provider = null;
    for (const rpc of RPCS) {
        try {
            const p = new ethers.JsonRpcProvider(rpc);
            const bn = await p.getBlockNumber();
            console.log(`[2] RPC OK: ${rpc} (bloque ${bn})`);
            provider = p;
            break;
        } catch (e) {
            console.log(`    RPC caído: ${rpc}`);
        }
    }
    if (!provider) { console.log('🛑 Ningún RPC de Polygon respondió.'); return; }
    console.log('');

    const wallet = new ethers.Wallet(pk, provider);
    const addr = wallet.address;

    // 3-4. POL nativo (gas)
    const pol = ethers.formatEther(await provider.getBalance(addr));
    console.log(`[3] Wallet emisora: ${addr}`);
    console.log(`[4] POL nativo (gas): ${pol}  ${Number(pol) >= 0.03 ? '✅ suficiente' : '❌ INSUFICIENTE (< 0.03) — CAUSA CLÁSICA del "Error en la transferencia"'}`);
    console.log('');

    // 5. SG
    const contrato = new ethers.Contract(CONTRATO, ERC20_ABI, provider);
    const [nombre, decimales, sg] = await Promise.all([
        contrato.name(), contrato.decimals(), contrato.balanceOf(addr)
    ]);
    const sgFmt = Number(ethers.formatUnits(sg, decimales));
    console.log(`[5] Token: ${nombre}`);
    console.log(`    Saldo SG de la emisora: ${sgFmt.toFixed(4)} SG`);
    console.log(`    → Con el 2% de quema, un retiro de X SG cuesta X/0.98 = (X*1.0204) SG. Con este saldo se pueden cubrir ~${(sgFmt * 0.98).toFixed(2)} SG de retiros.`);
    console.log('');

    // 6. Wallet del usuario (opcional)
    const destino = process.argv[2];
    if (destino) {
        try {
            const sgUser = await contrato.balanceOf(destino);
            console.log(`[6] Saldo SG del destino ${destino}: ${Number(ethers.formatUnits(sgUser, decimales)).toFixed(6)} SG`);
        } catch {
            console.log(`[6] ⚠️ No pude leer la wallet destino ${destino} (¿dirección válida?)`);
        }
        console.log('');
    }

    console.log('=== RESUMEN ===');
    console.log(`POL gas : ${Number(pol) >= 0.03 ? 'OK' : 'FALTA → esa es la causa del error'}`);
    console.log(`SG fondo: ${sgFmt > 0 ? 'hay fondo' : 'CERO → revisa el barrido de recaudo o recarga SG en esta wallet'}`);
    console.log('');
    console.log('Siguiente pista si ambas están OK: revisa los LOGS de Vercel (función /api/tragamonedas, ~1 h de retención) buscando "❌ Error blockchain marketing".');
})();
