import { ethers } from 'ethers';

export default async function handler(req, res) {
    // RPC gratuito y estable para Polygon Mainnet
    const RPC_URL = 'https://rpc.ankr.com/polygon/';
    const PAIR_ADDRESS = '0x3dece26ca1f3635a38dac0400e9edd9bf116368f';

    const ABI = [
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() view returns (address)",
        "function token1() view returns (address)"
    ];

    // Tasas de fallback si falla la red
    const FALLBACK = {
        "Soulgeist": { tasa: 1 },
        "Ethereum":  { tasa: 0.00000045 },
        "Litecoin":  { tasa: 0.0012 },
        "Pepe":      { tasa: 15000 },
        "MATIC/POL": { tasa: 0.015 },
        "BNB":       { tasa: 0.0018 },
        "USDT":      { tasa: 0.25 },
        "Bitcoin":   { tasa: 0.000002 }
    };

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const pairContract = new ethers.Contract(PAIR_ADDRESS, ABI, provider);

        const reserves = await pairContract.getReserves();

        const reserveSG  = Number(reserves.reserve0);
        const reservePOL = Number(reserves.reserve1);

        if (reserveSG === 0) throw new Error("Reservas vacías");

        const priceInPOL = reservePOL / reserveSG;

        const tasas = {
            "Soulgeist": { tasa: 1 },
            "Ethereum":  { tasa: priceInPOL * 0.0002 },
            "Litecoin":  { tasa: priceInPOL * 0.0005 },
            "Pepe":      { tasa: priceInPOL * 5000 },
            "MATIC/POL": { tasa: priceInPOL },
            "BNB":       { tasa: priceInPOL * 0.0003 },
            "USDT":      { tasa: priceInPOL * 0.5 },
            "Bitcoin":   { tasa: priceInPOL * 0.00001 }
        };

        // Cache de 60 segundos en Vercel
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
        return res.status(200).json(tasas);

    } catch (error) {
        console.error("Error consultando el Oráculo, usando fallback:", error.message);
        res.setHeader('Cache-Control', 's-maxage=30');
        return res.status(200).json(FALLBACK);
    }
}