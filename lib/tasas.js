// lib/tasas.js
// Tasas de conversión SG → cripto calculadas SIEMPRE en el servidor.
// El cliente jamás puede alterarlas: /api/reclamar y la acción 'fusionar'
// usan estos valores como única fuente de verdad.
//
// Precio del SG (en POL), resuelto en este orden:
//   1. Reservas ON-CHAIN del par SG/WPOL en QuickSwap (la MISMA fuente que
//      usa QuickSwap; se actualiza solo con el mercado en cada tirada).
//   2. Variable de entorno SG_PRECIO_POL en Vercel (respaldo ajustable).
//   3. Constante de emergencia.

import { ethers } from 'ethers';

const SG_EN_POL_EMERGENCIA = 0.002638; // Verificado on-chain (reservas del par)

// Tasas de emergencia si falla CoinGecko
const FALLBACK_USD = {
    pol: 0.076, eth: 2500, ltc: 67, bnb: 560,
    btc: 107000, usdt: 1, pepe: 0.0000094
};

const CONTRATO_SG = '0x51Fb9B6b0e008eFC867492D2930D959879A5bCfB';
const PAR_SG_WPOL  = '0x3Dece26ca1F3635a38dac0400E9EDd9bF116368f'; // QuickSwap V2
const WPOL         = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
const PAR_ABI = [
    'function getReserves() view returns (uint112,uint112,uint32)',
    'function token0() view returns (address)'
];
const CACHE_MS = 60_000;
let cache = { datos: null, expiraEn: 0 };

/**
 * Precio del SG en POL: reservas on-chain del par → SG_PRECIO_POL → constante.
 */
async function obtenerPrecioSGEnPOL() {
    // 1. Precio REAL del mercado: ratio de reservas del par SG/WPOL
    try {
        const provider = new ethers.JsonRpcProvider(
            process.env.BLOCKCHAIN_RPC || 'https://polygon-bor-rpc.publicnode.com'
        );
        const par = new ethers.Contract(PAR_SG_WPOL, PAR_ABI, provider);
        const [r0, r1] = await par.getReserves();
        const token0 = await par.token0();
        const resSG  = parseFloat(ethers.formatUnits(token0 === CONTRATO_SG ? r0 : r1, 18));
        const resPOL = parseFloat(ethers.formatUnits(token0 === CONTRATO_SG ? r1 : r0, 18));
        if (resSG > 0 && resPOL > 0) {
            return resPOL / resSG;
        }
    } catch { /* seguimos con la siguiente fuente */ }

    // 2. Variable configurable en Vercel (sin redeploy)
    const env = parseFloat(process.env.SG_PRECIO_POL);
    if (env > 0) return env;

    // 3. Constante de emergencia
    return SG_EN_POL_EMERGENCIA;
}

function construirTasas(precioSGEnPOL, fuente) {
    const sgUSD = precioSGEnPOL * fuente.pol;
    return {
        "Soulgeist": { tasa: 1 },
        "Ethereum":  { tasa: sgUSD / fuente.eth },
        "Litecoin":  { tasa: sgUSD / fuente.ltc },
        "Pepe":      { tasa: sgUSD / fuente.pepe },
        "MATIC/POL": { tasa: precioSGEnPOL },
        "BNB":       { tasa: sgUSD / fuente.bnb },
        "USDT":      { tasa: sgUSD / fuente.usdt },
        "Bitcoin":   { tasa: sgUSD / fuente.btc }
    };
}

async function obtenerPreciosUSD() {
    const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,litecoin,binancecoin,bitcoin,pepe,tether&vs_currencies=usd',
        { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
    );
    if (!cgRes.ok) throw new Error('CoinGecko no respondió');

    const precios = await cgRes.json();
    return {
        pol:  precios['matic-network']?.usd || FALLBACK_USD.pol,
        eth:  precios['ethereum']?.usd      || FALLBACK_USD.eth,
        ltc:  precios['litecoin']?.usd      || FALLBACK_USD.ltc,
        bnb:  precios['binancecoin']?.usd   || FALLBACK_USD.bnb,
        btc:  precios['bitcoin']?.usd       || FALLBACK_USD.btc,
        pepe: precios['pepe']?.usd          || FALLBACK_USD.pepe,
        usdt: precios['tether']?.usd        || FALLBACK_USD.usdt
    };
}

/**
 * Devuelve { "Ethereum": { tasa }, ... } con cache de 60 s.
 */
export async function obtenerTasas() {
    if (cache.datos && cache.expiraEn > Date.now()) {
        return cache.datos;
    }

    try {
        const [fuenteUSD, precioSG] = await Promise.all([
            obtenerPreciosUSD(),
            obtenerPrecioSGEnPOL()
        ]);

        const tasas = construirTasas(precioSG, fuenteUSD);
        cache = { datos: tasas, expiraEn: Date.now() + CACHE_MS };
        return tasas;
    } catch (error) {
        console.warn('⚠️ Tasas: usando fallback de emergencia:', error.message);
        const precioSG = await obtenerPrecioSGEnPOL().catch(() => SG_EN_POL_EMERGENCIA);
        const tasas = construirTasas(precioSG, FALLBACK_USD);
        cache = { datos: tasas, expiraEn: Date.now() + 30_000 };
        return tasas;
    }
}