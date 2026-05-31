import { ethers } from "ethers"; // Inyectamos ethers para conectar con Amoy

export default async function handler(req, res) {
    // 1. Configurar cabeceras CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    // 2. Extraer datos del ritual
    const { identidad, wallet, cripto, pasarela, cantidadRetiro } = req.body;
    if (!identidad) return res.status(400).json({ error: 'Falta la identidad del alma.' });
        
    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const country = req.headers['x-vercel-ip-country'] || 'XX';

    if (!wallet || wallet.length < 8) return res.status(400).json({ error: 'Wallet inválida.' });

    // 3. Configuración de Tasas (Sincronizadas con script.js)
    const CONFIG_CRIPTAS = {
        "Ethereum": { tasa: 0.00000045, simFP: "ETH", minimoNativo: 0.00000005 }, 
        "Litecoin": { tasa: 0.0012,       simFP: "LTC", minimoNativo: 0.000144 },     
        "Pepe":     { tasa: 15000,        simFP: "PEPE", minimoNativo: 180 }, 
        "Solana":   { tasa: 0.0008,       simFP: "SOL", minimoNativo: 0.000096 },     
        "Dogecoin": { tasa: 1.5,          simFP: "DOGE", minimoNativo: 0.18 },     
        "USDT":     { tasa: 0.25,         simFP: "USDT", minimoNativo: 0.03 },     
        "Bitcoin":  { tasa: 0.000002,     simFP: "BTC", minimoNativo: 0.0000002 } 
    };

    const infoCripta = CONFIG_CRIPTAS[cripto];
    if (!infoCripta) return res.status(400).json({ error: 'Cripta no registrada.' });

    // 4. Filtro Geográfico
    const countriesBanned = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI']; 
    if (countriesBanned.includes(country)) return res.status(403).json({ error: 'Región bloqueada.' });

    // 5. Configuración Redis
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    const balanceKey = `user:balance:${identidad.toLowerCase().trim()}`;
    const walletKey = `user:wallet:${wallet}:${cripto}`;
    const ipKey = `user:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`;

    try {
        // 6. Verificar Cooldowns (24h)
        const [resWallet, resIp] = await Promise.all([
            fetch(`${redisUrl}/get/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json()),
            fetch(`${redisUrl}/get/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json())
        ]);

        if (resWallet.result || resIp.result) {
            return res.status(403).json({ error: 'Debes esperar 24h para otro retiro de esta cripto.' });
        }

        // --- Lógica de validación mejorada ---
function validarDireccion(wallet, pasarela) {
    // Ejemplo de Regex para direcciones (puedes ajustar según la red)
    const regexEVM = /^0x[a-fA-F0-9]{40}$/; // Para Binance/Coinbase/Metamask (Ethereum/Polygon)
    const regexBTC = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/; // Para Bitcoin
    const regexLTC = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/; // Para Litecoin

    if (pasarela === 'bitso') {
        // Si Bitso usa un identificador específico (ej. un formato corto), valídalo aquí.
        // Si Bitso usa direcciones on-chain, usa el regex correspondiente.
        return wallet.length > 5; // Ajusta según el formato real de Bitso
    } 
    
    if (pasarela === 'binance' || pasarela === 'coinbase') {
        return regexEVM.test(wallet); // Todas estas aceptan direcciones de red (EVM)
    }

    return true; // Si es genérico
}

// En tu handler, antes de procesar el pago:
if (!validarDireccion(wallet, pasarela)) {
    return res.status(400).json({ error: 'El formato de la billetera no coincide con la pasarela seleccionada.' });
}

        // 8. Escudo Anti-VPN
        const auditoriaIP = await verificarFraudeIP(ipLimpia);
        if (auditoriaIP.bloquear) return res.status(403).json({ error: 'VPN/Proxy detectado.' });

        // 9. Procesamiento de Pago
        let pagoExitoso = false;
        let mensajeRetorno = "";

        if (pasarela === "bitso_lightning" && cripto === "Bitcoin") {
            const resLN = await ejecutarRetiroBitsoLightning(wallet, cantidadAEnviar);
            if (resLN.success) { 
                pagoExitoso = true; 
                mensajeRetorno = `¡Energía canalizada! Enviados ${cantidadAEnviar.toFixed(7)} BTC via Lightning.`; 
            }
        } else if (["bitso", "binance", "coinbase"].includes(pasarela)) {
            // El backend procesará el envío usando el contrato inteligente en Amoy
            const resOC = await procesarRetiroOnChain(pasarela, wallet, cantidadAEnviar, cripto);
            if (resOC.success) { 
                pagoExitoso = true; 
                mensajeRetorno = `Cosecha autorizada en Amoy. Tx: ${resOC.txHash.slice(0,10)}...`; 
            } else {
                return res.status(500).json({ error: resOC.error || 'La blockchain rechazó la transferencia.' });
            }
        }

        // 10. Cierre de Candados y Reseteo de Balance
        if (pagoExitoso) {
            await Promise.all([
                fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(["SET", walletKey, "activo", "EX", "86400"])
                }),
                fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(["SET", ipKey, "activo", "EX", "86400"])
                }),
                fetch(`${redisUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(["SET", balanceKey, "0"]) 
                })
            ]);

            await enviarAlertaTelegram(`💀 *RETIRO EN AMOY EXITOSO*\n*Hacia:* \`${wallet}\`\n*Monto simulado:* \`${cantidadAEnviar.toFixed(8)}\` ${infoCripta.simFP}\n*Pasarela:* ${pasarela.toUpperCase()}`);
            
            return res.status(200).json({ success: true, mensaje: mensajeRetorno, balanceAlmas: 0 });
        }

    } catch (err) {
        console.error("Error global del backend:", err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo.' });
    }
}

// --- FUNCIONES AUXILIARES REPARADAS ---
async function ejecutarRetiroBitsoLightning(invoice, monto) { return { success: true }; }

// EJECUCIÓN BLOCKCHAIN REAL (TU BILLETERA FIRMA TRAS BAMBALINAS)
async function procesarRetiroOnChain(pasarela, walletUsuario, monto, tokenOriginal) { 
    try {
        // 1. Configuramos el nodo RPC de Polygon Amoy
        // Usamos una RPC pública estable para testnet
        const RPC_AMOY = "https://rpc-amoy.polygon.technology";
        const provider = new ethers.JsonRpcProvider(RPC_AMOY);

        // 2. Extraemos las credenciales secretas desde las variables de entorno de Vercel
        const CLAVE_PRIVADA_ADMIN = process.env.ADMIN_PRIVATE_KEY; 
        const CONTRATO_ADDRESS = process.env.SOULGEIST_CONTRACT_ADDRESS;

        if (!CLAVE_PRIVADA_ADMIN || !CONTRATO_ADDRESS) {
            console.error("Faltan variables de entorno Web3 en Vercel.");
            return { success: false, error: "Servidor Web3 no configurado completamente." };
        }

        // 3. Inicializamos tu billetera de deidad para firmar en automático
        const walletAdministradora = new ethers.Wallet(CLAVE_PRIVADA_ADMIN, provider);

        // 4. El mapa JSON mínimo (ABI) de tu token de Remix para ejecutar 'transfer'
        const MIN_ABI = [
            "function transfer(address to, uint256 amount) returns (bool)"
        ];

        // 5. Conectamos al contrato desplegado
        const contratoToken = new ethers.Contract(CONTRATO_ADDRESS, MIN_ABI, walletAdministradora);

        // 6. Convertimos la cantidad a formato blockchain (18 decimales)
        // Puedes ajustar si deseas mandar el equivalente directo o un valor fijo por prueba
        const cantidadConDecimales = ethers.parseUnits(monto.toString(), 18);

        console.log(`🤖 Servidor enviando ${monto} tokens a la dirección: ${walletUsuario}`);

        // 7. Ejecutamos la transacción real en Polygon Amoy
        const tx = await contratoToken.transfer(walletUsuario, cantidadConDecimales);
        
        // Esperamos a que el bloque sea minado por la red de pruebas
        const receipt = await tx.wait();

        return { success: true, txHash: receipt.hash };

    } catch (error) {
        console.error("Fallo crítico en la blockchain de Amoy:", error);
        return { success: false, error: error.message };
    }
}

async function verificarFraudeIP(ip) {
    try {
        const apiKey = process.env.PROXYCHECK_API_KEY; 
        if (!apiKey) return { bloquear: false }; 
        const res = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1` );
        const data = await res.json();
        if (data && data[ip] && (data[ip].proxy === "yes" || data[ip].is_hosting === "yes")) {
            return { bloquear: true };
        }
        return { bloquear: false };
    } catch { return { bloquear: false }; }
}

async function enviarAlertaTelegram(msg) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' } )
    });
}