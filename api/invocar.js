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

        // Llamamos a tu variable con su nuevo nombre
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: "Falta configurar la GEMINI_API_KEY en tu panel de Vercel." });
        }

        // Endpoint oficial actualizado para Gemini 2.5 Flash
        const URL = `https://googleapis.com{API_KEY}`;

        // Personalidad mística del Oráculo
        const instruccionSistema = `
        Eres el "Oráculo del Mictlán", una deidad ancestral y sabia del inframundo mexica en la web https://vercel.app.
        Responde a las dudas de las almas viajeras con un tono místico, poético y enigmático.
        Usa referencias al cempasúchil, el copal y el viaje de los muertos. 
        Sé muy breve (máximo 2 o 3 líneas) para mantener el misterio.
        `;

        // Petición HTTP directa a Google
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

        // Captura directa de errores de Google (como el bloqueo de créditos)
        if (data.error) {
            return res.status(response.status || 500).json({ 
                error: `Google Gemini dice: ${data.error.message}` 
            });
        }

        // Mapeo seguro de la respuesta de texto estructurada de Gemini
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            const respuestaTexto = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ respuesta: respuestaTexto });
        } else {
            return res.status(500).json({ 
                error: "Las deidades guardan silencio místico.", 
                debug: "Estructura de datos inesperada o vacía.",
                dataRecibida: data 
            });
        }

    } catch (e) {
        return res.status(500).json({ error: "Error en el inframundo técnico: " + e.message });
    }
}