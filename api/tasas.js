import { ethers } from 'ethers';

export default async function handler(req, res) {

    // Precio fijo de SG en POL desde el par de QuickSwap
    // Actualizar este valor manualmente si el precio cambia mucho
    // Valor actual: 1 SG = 0.002458 POL (DEXTools 25/06/2026)
    const SG_EN_POL = 0.002458;

    // Tasas de emergencia si falla CoinGecko
    const FALLBACK_USD = {
        pol: 0.076, eth: 2500, ltc: 67, bnb: 560,
        btc: 107000, usdt: 1, pepe: 0.0000094
    };

    try {
        // CoinGecko API - gratuita, sin API key, muy estable
        const cgRes = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=matic-network,ethereum,litecoin,binancecoin,bitcoin,pepe,tether&vs_currencies=usd',
            { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) }
        );

        if (!cgRes.ok) throw new Error('CoinGecko no respondió');
        const precios = await cgRes.json();

        const polUSD  = precios['matic-network']?.usd  || FALLBACK_USD.pol;
        const ethUSD  = precios['ethereum']?.usd        || FALLBACK_USD.eth;
        const ltcUSD  = precios['litecoin']?.usd        || FALLBACK_USD.ltc;
        const bnbUSD  = precios['binancecoin']?.usd     || FALLBACK_USD.bnb;
        const btcUSD  = precios['bitcoin']?.usd         || FALLBACK_USD.btc;
        const pepeUSD = precios['pepe']?.usd            || FALLBACK_USD.pepe;
        const usdtUSD = precios['tether']?.usd          || FALLBACK_USD.usdt;

        // Precio de SG en USD
        const sgUSD = SG_EN_POL * polUSD;

        // Tasas: cuánto de cada cripto vale 1 SG
        const tasas = {
            "Soulgeist": { tasa: 1 },
            "Ethereum":  { tasa: sgUSD / ethUSD },
            "Litecoin":  { tasa: sgUSD / ltcUSD },
            "Pepe":      { tasa: sgUSD / pepeUSD },
            "MATIC/POL": { tasa: SG_EN_POL },
            "BNB":       { tasa: sgUSD / bnbUSD },
            "USDT":      { tasa: sgUSD / usdtUSD },
            "Bitcoin":   { tasa: sgUSD / btcUSD }
        };

        console.log(`✅ Tasas calculadas | SG=$${sgUSD.toFixed(8)} | POL=$${polUSD}`);

        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        return res.status(200).json(tasas);

    } catch (error) {
        console.error("⚠️ Error en tasas, usando fallback:", error.message);

        const sgUSD = SG_EN_POL * FALLBACK_USD.pol;
        const fallback = {
            "Soulgeist": { tasa: 1 },
            "Ethereum":  { tasa: sgUSD / FALLBACK_USD.eth },
            "Litecoin":  { tasa: sgUSD / FALLBACK_USD.ltc },
            "Pepe":      { tasa: sgUSD / FALLBACK_USD.pepe },
            "MATIC/POL": { tasa: SG_EN_POL },
            "BNB":       { tasa: sgUSD / FALLBACK_USD.bnb },
            "USDT":      { tasa: sgUSD / FALLBACK_USD.usdt },
            "Bitcoin":   { tasa: sgUSD / FALLBACK_USD.btc }
        };

        res.setHeader('Cache-Control', 's-maxage=30');
        return res.status(200).json(fallback);
    }
}