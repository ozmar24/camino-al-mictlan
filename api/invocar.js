export default async function handler(req, res) {
    // Configuración de cabeceras CORS
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar petición OPTIONS (Preflight de CORS)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const promptText = body.prompt || body.pregunta; 

        if (!promptText) {
            return res.status(400).json({ error: "La ofrenda está vacía. Formula una pregunta." });
        }

        const API_KEY = process.env.GOOGLE_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: "Configuración incompleta: Falta GOOGLE_API_KEY en las variables de entorno de Vercel." });
        }

        // Endpoint oficial para Gemini 1.5 Flash
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        // Definimos la personalidad mística del Oráculo
        const instruccionSistema = `
        Eres el "Oráculo del Mictlán", una deidad ancestral y sabia del inframundo mexica en la web https://vercel.app.
        Responde a las dudas de las almas viajeras con un tono místico, poético y enigmático.
        Usa referencias al cempasúchil, el copal y el viaje espiritual. 
        Sé muy breve (máximo 2 o 3 líneas) para mantener el misticismo del altar.
        `;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                systemInstruction: {
                    parts: [{ text: instruccionSistema }]
                }
            })
        });

        const data = await response.json();

        // Si Google responde con un error directo de API (por ejemplo API Key inválida)
        if (data.error) {
            return res.status(response.status || 500).json({ 
                error: `Error de Google Gemini: ${data.error.message}`
            });
        }

        // VALIDACIÓN LIMPIA: Verificamos de forma segura que la respuesta exista paso a paso
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            const textoFinal = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ respuesta: textoFinal });
        } else {
            // Si la respuesta fue bloqueada por filtros de seguridad del propio Google
            return res.status(500).json({ 
                error: "Las deidades guardan silencio.", 
                debug: "La IA bloqueó el texto por seguridad o devolvió una estructura vacía.",
                dataRecibida: data 
            });
        }

    } catch (e) {
        return res.status(500).json({ error: "Error técnico en el servidor: " + e.message });
    }
}