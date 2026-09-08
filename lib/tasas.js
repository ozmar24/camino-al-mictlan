// lib/tasas.js
// Tasas de conversión SG → cripto calculadas SIEMPRE en el servidor.
// El cliente jamás puede alterarlas: /api/reclamar y la acción 'fusionar'
// usan estos valores como única fuente de verdad.

const SG_EN_POL = 0.002458; // 1 SG en POL (par de QuickSwap). Actualizar si cambia mucho.

// Tasas de emergencia si falla CoinGecko
const FALLBACK_USD = {
    pol: 0.076, eth: 2500, ltc: 67, bnb: 560,
    btc: 107000, usdt: 1, pepe: 0.0000094
};

const CACHE_MS = 60_000;
let cache = { datos: null, expiraEn: 0 };

function construirTasas(fuente) {
    const sgUSD = SG_EN_POL * fuente.pol;
    return {
        "Soulgeist": { tasa: 1 },
        "Ethereum":  { tasa: sgUSD / fuente.eth },
        "Litecoin":  { tasa: sgUSD / fuente.ltc },
        "Pepe":      { tasa: sgUSD / fuente.pepe },
        "MATIC/POL": { tasa: SG_EN_POL },
        "BNB":       { tasa: sgUSD / fuente.bnb },
        "USDT":      { tasa: sgUSD / fuente.usdt },
        "Bitcoin":   { tasa: sgUSD / fuente.btc }
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
        const cgRes = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,litecoin,binancecoin,bitcoin,pepe,tether&vs_currencies=usd',
            { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
        );

        if (!cgRes.ok) throw new Error('CoinGecko no respondió');
        const precios = await cgRes.json();

        const fuente = {
            pol:  precios['matic-network']?.usd || FALLBACK_USD.pol,
            eth:  precios['ethereum']?.usd      || FALLBACK_USD.eth,
            ltc:  precios['litecoin']?.usd      || FALLBACK_USD.ltc,
            bnb:  precios['binancecoin']?.usd   || FALLBACK_USD.bnb,
            btc:  precios['bitcoin']?.usd       || FALLBACK_USD.btc,
            pepe: precios['pepe']?.usd          || FALLBACK_USD.pepe,
            usdt: precios['tether']?.usd        || FALLBACK_USD.usdt
        };

        const tasas = construirTasas(fuente);
        cache = { datos: tasas, expiraEn: Date.now() + CACHE_MS };
        return tasas;
    } catch (error) {
        console.warn('⚠️ Tasas: usando fallback de emergencia:', error.message);
        const tasas = construirTasas(FALLBACK_USD);
        cache = { datos: tasas, expiraEn: Date.now() + 30_000 };
        return tasas;
    }
}