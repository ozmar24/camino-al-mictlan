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

        // 7. Validación de Saldo (CORREGIDO: El juego ya envía el saldo convertido)
        const balanceReal = parseFloat(cantidadRetiro || 0);
        if (balanceReal <= 0) return res.status(400).json({ error: 'La cripta está vacía.' });

        // CORRECCIÓN CRÍTICA: No multiplicamos de nuevo, usamos el valor directo
        const cantidadAEnviar = balanceReal; 

        if (cantidadAEnviar < infoCripta.minimoNativo) {
            return res.status(400).json({ 
                error: `Monto insuficiente. Mínimo: ${infoCripta.minimoNativo} ${infoCripta.simFP}. Tienes: ${cantidadAEnviar.toFixed(8)}.` 
            });
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
            const resOC = await procesarRetiroOnChain(pasarela, wallet, cantidadAEnviar, cripto);
            if (resOC.success) { 
                pagoExitoso = true; 
                mensajeRetorno = "Cosecha autorizada y enviada a la blockchain."; 
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

            await enviarAlertaTelegram(`💀 *RETIRO EXITOSO*\n*Wallet:* \`${wallet}\`\n*Monto:* \`${cantidadAEnviar.toFixed(8)}\` ${infoCripta.simFP}\n*Pasarela:* ${pasarela.toUpperCase()}`);
            
            return res.status(200).json({ success: true, mensaje: mensajeRetorno, balanceAlmas: 0 });
        }

    } catch (err) {
        console.error("Error:", err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo.' });
    }
}

// --- FUNCIONES AUXILIARES ---
async function ejecutarRetiroBitsoLightning(invoice, monto) { return { success: true }; }
async function procesarRetiroOnChain(plat, add, monto, token) { return { success: true }; }

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
