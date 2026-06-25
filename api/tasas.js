import { ethers } from 'ethers';

export default async function handler(req, res) {
    // 1. Configuración de red y direcciones
    const RPC_URL = 'https://polygon-rpc.com'; 
    const PAIR_ADDRESS = '0x3dece26ca1f3635a38dac0400e9edd9bf116368f';
    
    // ABI mínimo para obtener reservas de un par Uniswap/Quickswap V2
    const ABI = [
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function token0() view returns (address)",
        "function token1() view returns (address)"
    ];

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const pairContract = new ethers.Contract(PAIR_ADDRESS, ABI, provider);

        // 2. Obtener reservas del par
        const reserves = await pairContract.getReserves();
        
        // Asumimos que reserve0 es SG y reserve1 es WPOL (basado en cómo se formó el par)
        // Precio de SG en POL = reserve1 / reserve0
        const reserveSG = Number(reserves.reserve0);
        const reservePOL = Number(reserves.reserve1);
        const priceInPOL = reservePOL / reserveSG;

        // 3. Construimos la respuesta dinámica
        // Aquí ajustas tus tasas basándote en el precio real de tu token contra POL
        const tasas = {
            "Soulgeist": { tasa: 1 },
            "Ethereum":  { tasa: priceInPOL * 0.0002 },
            "Litecoin":  { tasa: priceInPOL * 0.0005 },
            "Pepe":      { tasa: priceInPOL * 5000 },
            "MATIC/POL": { tasa: 1 }, // <--- Siendo el par base, su tasa es 1 respecto a sí mismo
            "BNB":       { tasa: priceInPOL * 0.0003 },
            "USDT":      { tasa: priceInPOL * 0.5 },
            "Bitcoin":   { tasa: priceInPOL * 0.00001 }
        };

        res.status(200).json(tasas);

    } catch (error) {
        console.error("Error consultando el Oráculo:", error);
        // Fallback de seguridad si falla la red
        res.status(500).json({ error: "No se pudo conectar al mercado en vivo." });
    }
}