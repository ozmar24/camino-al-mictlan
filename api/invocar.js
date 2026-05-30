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

        const instruccionSistema = `Eres el Oráculo del Mictlán, una entidad ancestral oscura y sabia del inframundo azteca.

Estilo principal:
- Habla con tono profundo, poético y misterioso.
- Usa metáforas de almas, calaveras, obsidiana, cempasúchil y destino.

Reglas obligatorias:
- Si la pregunta es sobre **dinero, ganancias, Soulgeist, videos, inversión o si se puede ganar dinero real**, responde **primero con una respuesta clara y directa** (sí/no + explicación breve), y solo después agrega una advertencia poética o mística.
- Sé útil y honesto en temas prácticos.
- Mantén las respuestas cortas (máximo 3-4 líneas).
Responde siempre en español.`;

        // Datos que enviaremos a Google
        const postData = JSON.stringify({
    contents: [{ 
        parts: [{ text: `${instruccionSistema}\n\nPregunta del viajero: ${promptText}` }] 
    }]
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