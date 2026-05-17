export default async function handler(req, res) {
    // 1. Configurar cabeceras CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Solo aceptamos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido en el inframundo' });
    }

    // 3. Extraemos los datos e incluimos la "pasarela" elegida por el usuario
    const { wallet, cripto, pasarela } = req.body;
    
    const rawIp = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || '';
    const ipLimpia = rawIp.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const country = req.headers['x-vercel-ip-country'] || 'XX';

    // Validación básica de la wallet y pasarela
    if (!wallet || wallet.length < 8) {
        return res.status(400).json({ error: 'La dirección de la wallet es demasiado corta para este ritual.' });
    }
    if (!pasarela) {
        return res.status(400).json({ error: 'No se ha especificado un portal de destino (pasarela).' });
    }

    // ==================================================================
    // TABLA DE CRYPTO-CONFIGURACIONES (Tasas del inframundo coincidentes con Frontend)
    // ==================================================================
    const CONFIG_CRIPTAS = {
        "Ethereum": { tasa: 0.00000045, simFP: "ETH" },
        "Litecoin": { tasa: 0.0012,       simFP: "LTC" },
        "Pepe":     { tasa: 15000,        simFP: "PEPE" },
        "Solana":   { tasa: 0.0008,       simFP: "SOL" },
        "Dogecoin": { tasa: 1.5,          simFP: "DOGE" },
        "USDT":     { tasa: 0.25,         simFP: "USDT" },
        "Bitcoin":  { tasa: 0.000002,     simFP: "BTC" }
    };

    const infoCripta = CONFIG_CRIPTAS[cripto];
    if (!infoCripta) {
        return res.status(400).json({ error: `La cripta de ${cripto} no se encuentra registrada en el mapa.` });
    }

    // ==================================================================
    // ESCUDO A: FILTRO GEOGRÁFICO DE PAÍSES
    // ==================================================================
    const countriesBanned = ['BD', 'PK', 'IN', 'VN', 'NG', 'ID', 'SI']; 
    if (countriesBanned.includes(country)) {
        await enviarAlertaTelegram(`💀 *MICTLÁN* - 🚫 *Bloqueo Geográfico*\n*IP:* \`${ipLimpia}\`\n*País:* ${country}\n*Cripto:* ${cripto}\n*Razón:* Región restringida por abuso.`);
        return res.status(403).json({ error: `Acceso denegado. Los espíritus de tu región (${country}) tienen prohibido pisar este cementerio.` });
    }

    // 4. Variables de control de Redis
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Las llaves del cofre de Redis no están configuradas.' });
    }

    const walletKey = `user:wallet:${wallet}:${cripto}`;
    const ipKey = `user:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`; 
    const balanceKey = `user:balance:${wallet}`; // Llave para limpiar o consultar el balance real si aplica

    try {
        // 5. PRIMER PASO: Consultar AMBAS llaves en Upstash en paralelo
        const [resWallet, resIp] = await Promise.all([
            fetch(`${redisUrl}/get/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json()),
            fetch(`${redisUrl}/get/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json())
        ]);

        // REGLA A: Bloqueo de Wallet
        if (resWallet.result !== null) {
            const ttlRes = await fetch(`${redisUrl}/ttl/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
            const horas = Math.floor(ttlRes.result / 3600);
            const minutos = Math.floor((ttlRes.result % 3600) / 60);
            return res.status(403).json({ error: `Tu billetera aún no está lista para otra cosecha de ${cripto}. Regresa en ${horas}h y ${minutos}m.` });
        }

        // REGLA B: Bloqueo de IP
        if (resIp.result !== null) {
            const ttlRes = await fetch(`${redisUrl}/ttl/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
            const horas = Math.floor(ttlRes.result / 3600);
            const minutos = Math.floor((ttlRes.result % 3600) / 60);
            return res.status(403).json({ error: `Este dispositivo ya canalizó energía para ${cripto} recientemente. El umbral se abrirá en ${horas}h y ${minutos}m.` });
        }

        // CONSULTA DE BALANCE DEL USUARIO DESDE REDIS
        const resBalance = await fetch(`${redisUrl}/get/${balanceKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
        const balanceUsuarioSG = parseInt(resBalance.result, 10) || 0;

        // Si el usuario intenta forzar un reclamo con 0 almas reales en Base de Datos
        if (balanceUsuarioSG <= 0) {
            return res.status(400).json({ error: 'No posees Poder SG acumulado en tus criptas para transmutar.' });
        }

        // Cálculo dinámico final de monedas a enviar según la tasa estricta
        const cantidadAEnviar = balanceUsuarioSG * infoCripta.tasa;

        // ==================================================================
        // ESCUDO B: VERIFICACIÓN ANTI-VPN CON PROXYCHECK
        // ==================================================================
        const auditoriaIP = await verificarFraudeIP(ipLimpia);
        if (auditoriaIP.bloquear) {
            await enviarAlertaTelegram(`💀 *MICTLÁN* - 🕵️‍♂️ *Intento de Fraude*\n*IP:* \`${ipLimpia}\`\n*Tipo:* ${auditoriaIP.tipo}\n*Wallet:* \`${wallet}\`\n*País:* ${country}\n*Cripto:* ${cripto}\n*Acción:* Petición neutralizada.`);
            return res.status(403).json({ error: 'Espíritu falso detectado (VPN, Proxy o Hosting activo). Apágalo para iniciar el ritual.' });
        }

        // ==================================================================
        // PROCESAMIENTO MULTI-BILLETERA (BIFURCACIÓN DE ENTRADA)
        // ==================================================================
        let pagoExitoso = false;
        let mensajeRetorno = "";

        if (pasarela === "faucetpay") {
            // INTERFAZ DIRECTA CON LA API DE FAUCETPAY
            const paramsFP = new URLSearchParams({
                api_key: process.env.FAUCETPAY_API_KEY,
                to: wallet,
                amount: cantidadAEnviar,
                currency: infoCripta.simFP,
                referral: "false",
                ip_address: ipLimpia
            });

            const respuestaFP = await fetch('https://faucetpay.io/api/v1/send', { method: 'POST', body: paramsFP });
            const resultadoFP = await respuestaFP.json();
            
            if (resultadoFP.status === 200) {
                pagoExitoso = true;
                mensajeRetorno = `Poder transferido. Cosecha de +${cantidadAEnviar} ${infoCripta.simFP} enviada a tu FaucetPay.`;
            } else {
                return res.status(502).json({ error: `El canal de FaucetPay rechazó el pacto: ${resultadoFP.message || 'Fondos del grifo insuficientes'}` });
            }

        } else if (pasarela === "bitso_lightning" && cripto === "Bitcoin") {
            // INTERFAZ DE RITUAL PARA BITSO LIGHTNING NETWORK ⚡
            // 'wallet' contiene el invoice lnbc... introducido por el usuario
            const respuestaLN = await ejecutarRetiroBitsoLightning(wallet, cantidadAEnviar);
            
            if (respuestaLN.success) {
                pagoExitoso = true;
                mensajeRetorno = `¡Energía canalizada instantáneamente a tu Bitso mediante la Red Lightning! (Enviados ${cantidadAEnviar} BTC).`;
            } else {
                return res.status(502).json({ error: `El nodo de Bitso Lightning rechazó el pago: ${respuestaLN.error}` });
            }

        } else if (["bitso", "binance", "coinbase"].includes(pasarela)) {
            // INTERFAZ PARA RETIROS ON-CHAIN A GRANDES EXCHANGES
            const respuestaOnChain = await procesarRetiroOnChain(pasarela, wallet, cantidadAEnviar, cripto);
            
            if (respuestaOnChain.success) {
                pagoExitoso = true;
                mensajeRetorno = `Cosecha autorizada. Transmisión enviada a la blockchain destino hacia ${pasarela.toUpperCase()}.`;
            } else {
                return res.status(502).json({ error: `La bóveda corporativa de ${pasarela} denegó la transacción en este bloque.` });
            }
        } else {
            return res.status(400).json({ error: 'El portal de pasarela seleccionado no es válido.' });
        }

        // ==================================================================
        // CIERRE DE CANDADOS Y LIMPIEZA (Sólo ocurre si el pago fue 100% Exitoso)
        // ==================================================================
        if (pagoExitoso) {
            const tiempoDeVida = 86400; // 24 horas en segundos
            
            await Promise.all([
                fetch(`${redisUrl}/set/${walletKey}/activo/EX/${tiempoDeVida}`, { headers: { Authorization: `Bearer ${redisToken}` } }),
                fetch(`${redisUrl}/set/${ipKey}/activo/EX/${tiempoDeVida}`, { headers: { Authorization: `Bearer ${redisToken}` } }),
                fetch(`${redisUrl}/set/${balanceKey}/0`, { headers: { Authorization: `Bearer ${redisToken}` } }) // Reseteamos sus almas a 0
            ]);

            // Alerta de éxito consolidada en Telegram para auditoría
            await enviarAlertaTelegram(`💀 *MICTLÁN* - 💰 *Retiro Multi-Pasarela*\n*Wallet/ID:* \`${wallet}\`\n*Pasarela:* \`${pasarela.toUpperCase()}\`\n*Cripto:* \`${cripto}\`\n*Cantidad:* \`${cantidadAEnviar}\` ${infoCripta.simFP}\n*IP:* \`${ipLimpia}\`\n*País:* ${country}`);

            return res.status(200).json({ 
                success: true, 
                mensaje: mensajeRetorno,
                balanceAlmas: 0 // Devolvemos el balance reseteado al frontend
            });
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo de Redis o Pasarelas.' });
    }
}

// ==================================================================
// FUNCIONES CONTROLADORAS MOCK (Listas para rellenar con tus SDKs/API Keys)
// ==================================================================

async function ejecutarRetiroBitsoLightning(invoice, montoCripto) {
    // TODO: Conectar con tu endpoint corporativo de Bitso, Zebedee, OpenNode o LNBits.
    // Usando las llaves del proceso: process.env.BITSO_API_SECRET
    return { success: true }; // Cambiar a falso si la pasarela falla
}

async function procesarRetiroOnChain(plataforma, address, monto, token) {
    // TODO: Implementar la API de retiros masivos de Binance, Bitso o Coinbase
    // Ej: Binance API Endpoint -> /api/v3/capital/withdraw/apply
    return { success: true };
}

async function verificarFraudeIP(ip) {
    try {
        const apiKey = process.env.PROXYCHECK_API_KEY; 
        if (!apiKey) return { bloquear: false }; 

        const respuesta = await fetch(`https://proxycheck.io/v2/${ip}?key=${apiKey}&vpn=1&asn=1`);
        const data = await respuesta.json();

        if (data && data[ip]) {
            const infoIP = data[ip];
            if (infoIP.proxy === "yes") {
                return { bloquear: true, tipo: `VPN/Proxy comercial (${infoIP.type || 'Desconocido'})` }; 
            }
            if (infoIP.is_hosting === "yes") {
                return { bloquear: true, tipo: 'Granja de Servidores (Hosting/Bot)' };
            }
        }
        return { bloquear: false };
    } catch (error) {
        console.error("Fallo ProxyCheck API:", error);
        return { bloquear: false }; 
    }
}

async function enviarAlertaTelegram(mensaje) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) return;

    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: mensaje,
                parse_mode: 'Markdown'
            })
        });
    } catch (err) {
        console.error("Fallo al enviar notificación a Telegram:", err);
    }
}