import https from 'https';

export default async function handler(req, res) {
    // Configuración de cabeceras CORS
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const promptText = body.prompt || body.pregunta; 

        if (!promptText) {
            return res.status(400).json({ error: "La ofrenda está vacía. Formula una pregunta." });
        }

        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en tu panel de Vercel." });
        }

        // Configuración mística del Oráculo
        const instruccionSistema = `
        Eres el "Oráculo del Mictlán", una deidad ancestral y sabia del inframundo mexica en la web https://vercel.app.
        Responde a las dudas de las almas viajeras con un tono místico, poético y enigmático.
        Usa referencias al cempasúchil, el copal y el viaje de los muertos. 
        Sé muy breve (máximo 2 o 3 líneas) para mantener el misterio.
        `;

        // Datos que enviaremos a Google
        const postData = JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            systemInstruction: {
                parts: [{ text: instruccionSistema }]
            }
        });

        // 👁️ CORRECCIÓN: El hostname va completamente limpio, sin "https://" ni diagonales
        const URL_API = `/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
        
        const respuestaGoogle = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'generativelanguage.googleapis.com', 
    path: URL_API,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
                }
            };

            const reqGoogle = https.request(options, (resGoogle) => {
                let dataChunks = '';
                resGoogle.on('data', (chunk) => { dataChunks += chunk; });
                resGoogle.on('end', () => {
                    try {
                        resolve(JSON.parse(dataChunks));
                    } catch (e) {
                        reject(new Error("La respuesta de los dioses no pudo ser leída."));
                    }
                });
            });

            reqGoogle.on('error', (e) => { reject(e); });
            reqGoogle.write(postData);
            reqGoogle.end();
        });

        // Validamos si Google reportó un error
        if (respuestaGoogle.error) {
            return res.status(500).json({ error: `Google Gemini dice: ${respuestaGoogle.error.message}` });
        }

        // Mapeo seguro del texto final
        if (respuestaGoogle && respuestaGoogle.candidates && respuestaGoogle.candidates[0] && respuestaGoogle.candidates[0].content && respuestaGoogle.candidates[0].content.parts && respuestaGoogle.candidates[0].content.parts[0]) {
            const respuestaTexto = respuestaGoogle.candidates[0].content.parts[0].text;
            return res.status(200).json({ respuesta: respuestaTexto });
        } else {
            return res.status(500).json({ error: "Las deidades guardan silencio místico.", debug: respuestaGoogle });
        }

    } catch (e) {
        return res.status(500).json({ error: "Error en el inframundo técnico: " + e.message });
    }
}