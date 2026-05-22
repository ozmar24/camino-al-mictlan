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

    // 3. Extraemos los datos
    const { identidad, wallet, cripto, pasarela, cantidadRetiro, cantidadSG } = req.body;
    if (!identidad) {
        return res.status(400).json({ error: 'La identidad del alma no fue enviada al ritual.' });
    }
        
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
    // TABLA DE CRYPTO-CONFIGURACIONES CALIBRADA CON MÍNIMOS EQUIVALENTES
    // ==================================================================
    const CONFIG_CRIPTAS = {
        "Ethereum": { tasa: 0.00000045, simFP: "ETH", minimoNativo: 0.00000005 }, 
        "Litecoin": { tasa: 0.0012,       simFP: "LTC", minimoNativo: 0.000144 },     
        "Pepe":     { tasa: 15000,        simFP: "PEPE", minimoNativo: 180 }, 
        "Solana":   { tasa: 0.0008,       simFP: "SOL", minimoNativo: 0.000096 },     
        "Dogecoin": { tasa: 1.5,          simFP: "DOGE", minimoNativo: 0.18 },     
        "USDT":     { tasa: 0.25,         simFP: "USDT", minimoNativo: 0.03 },      
        "Bitcoin":  { tasa: 0.00000166,   simFP: "BTC", minimoNativo: 0.0000002 } // 0.0000002 BTC Exacto (6 ceros)
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
    const cleanUrl = redisUrl?.replace(/\/$/, "");

    if (!redisUrl || !redisToken) {
        return res.status(500).json({ error: 'Las llaves del cofre de Redis no están configuradas.' });
    }

    const walletKey = `user:wallet:${wallet}:${cripto}`;
    const ipKey = `user:ip:${ipLimpia.replace(/[^a-zA-Z0-9]/g, '_')}:${cripto}`; 
    const balanceKey = `user:balance:${identidad}`;

    try {
        // 5. Consultar candados de Wallet e IP en paralelo en Upstash
        const [resWallet, resIp] = await Promise.all([
            fetch(`${cleanUrl}/get/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json()),
            fetch(`${cleanUrl}/get/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json())
        ]);

        // REGLA A: Bloqueo de Wallet (24 Horas)
        if (resWallet.result !== null) {
            const ttlRes = await fetch(`${cleanUrl}/ttl/${walletKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
            const horas = Math.floor(ttlRes.result / 3600);
            const minutos = Math.floor((ttlRes.result % 3600) / 60);
            return res.status(403).json({ error: `Tu billetera aún no está lista para otra cosecha de ${cripto}. Regresa en ${horas}h y ${minutos}m.` });
        }

        // REGLA B: Bloqueo de IP (24 Horas)
        if (resIp.result !== null) {
            const ttlRes = await fetch(`${cleanUrl}/ttl/${ipKey}`, { headers: { Authorization: `Bearer ${redisToken}` } }).then(r => r.json());
            const horas = Math.floor(ttlRes.result / 3600);
            const minutos = Math.floor((ttlRes.result % 3600) / 60);
            return res.status(403).json({ error: `Este dispositivo ya canalizó energía para ${cripto} recientemente. El umbral se abrirá en ${horas}h y ${minutos}m.` });
        }

        // 6. Validamos la cantidad enviada de la tumba
        const balanceUsuarioSG = parseFloat(cantidadSG) || 0;

        if (balanceUsuarioSG <= 0) {
            return res.status(400).json({ 
                error: `La cripta de ${cripto} está completamente vacía en el abismo.` 
            });
        }

        // 7. Calculamos la transmutación final a enviar a la pasarela
        const cantidadAEnviar = balanceUsuarioSG * infoCripta.tasa;

        // ==================================================================
        // ESCUDO DE MONTO MÍNIMO NATIVO EQUIVALENTE (CORREGIDO)
        // ==================================================================
        if (cantidadAEnviar < infoCripta.minimoNativo) {
            const sgNecesariosParaMinimo = infoCripta.minimoNativo / infoCripta.tasa;

            return res.status(400).json({
                error: `Monto insuficiente en la cripta. El mínimo para retirar ${cripto} es de ${infoCripta.minimoNativo.toFixed(7)} ${infoCripta.simFP} (Tienes equivalencia a ${cantidadAEnviar.toFixed(7)} ${infoCripta.simFP}). Necesitas acumular al menos ${sgNecesariosParaMinimo.toFixed(0)} SG en esta tumba.`
            });
        }

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
            return res.status(400).json({ 
                error: "Retiros por FaucetPay están temporalmente desactivados por seguridad." 
            });
        } 
        else if (pasarela === "bitso_lightning" && cripto === "Bitcoin") {
            const respuestaLN = await ejecutarRetiroBitsoLightning(wallet, cantidadAEnviar);
            if (respuestaLN.success) {
                pagoExitoso = true;
                mensajeRetorno = `¡Energía canalizada instantáneamente a tu Bitso mediante la Red Lightning! (Enviados ${cantidadAEnviar.toFixed(7)} BTC).`;
            } else {
                return res.status(502).json({ error: `El nodo de Bitso Lightning rechazó el pago: ${respuestaLN.error}` });
            }
        } 
        else if (["bitso", "binance", "coinbase"].includes(pasarela)) {
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
        // CIERRE DE CANDADOS Y LIMPIEZA SEGURA EN REDIS (SIN BARRAS EN URL)
        // ==================================================================
        if (pagoExitoso) {
            const tiempoDeVida = 86400; // 24 horas exactas en segundos
            
            await Promise.all([
                fetch(`${cleanUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(["SET", walletKey, "activo", "EX", String(tiempoDeVida)])
                }),
                fetch(`${cleanUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(["SET", ipKey, "activo", "EX", String(tiempoDeVida)])
                }),
                fetch(`${cleanUrl}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(["SET", balanceKey, "0"]) // Seteo del balance a cero impecable
                })
            ]);

            await enviarAlertaTelegram(`💀 *MICTLÁN* - 💰 *Retiro Multi-Pasarela*\n*Wallet/ID:* \`${wallet}\`\n*Pasarela:* \`${pasarela.toUpperCase()}\`\n*Cripto:* \`${cripto}\`\n*Cantidad:* \`${cantidadAEnviar.toFixed(7)}\` ${infoCripta.simFP}\n*IP:* \`${ipLimpia}\`\n*País:* ${country}`);

            return res.status(200).json({ 
                success: true, 
                mensaje: mensajeRetorno,
                balanceAlmas: 0 
            });
        }

    } catch (err) {
        console.error("Error crítico en reclamar:", err);
        return res.status(500).json({ error: 'Error de conexión con el inframundo de Redis o Pasarelas.' });
    }
}

// FUNCIONES CONTROLADORAS MOCK MANTENIDAS
async function ejecutarRetiroBitsoLightning(invoice, montoCripto) {
    return { success: true };
}

async function procesarRetiroOnChain(plataforma, address, monto, token) {
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
            body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'Markdown' })
        });
    } catch (err) {
        console.error("Fallo al enviar notificación a Telegram:", err);
    }
}