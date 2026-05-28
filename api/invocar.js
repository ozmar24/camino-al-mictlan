export default async function handler(req, res) {
    // Aseguramos que el navegador sepa que SIEMPRE enviamos JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // Validación básica de que recibimos algo
        if (!req.body) {
            return res.status(400).json({ error: "Cuerpo de solicitud vacío" });
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { pregunta, usuario } = body;

        if (!pregunta) {
            return res.status(400).json({ error: "La pregunta es obligatoria." });
        }

        const API_KEY = process.env.GOOGLE_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ error: "Llave de API de Gemini no configurada en servidor" });
        }

        // Construir el prompt con contexto del oráculo
        const promptOraculo = `Eres el Oráculo del Mictlán, una deidad ancestral del inframundo azteca. 
Responde a las preguntas con sabiduría ancestral, misterio y un tono poético y místico. 
Tus respuestas deben ser concisas (máximo 2-3 oraciones), en español, y reflejar la cosmología azteca.
El alma ${usuario} susurra: ${pregunta}

Responde como el Oráculo, con misterio y sabiduría.`;

        // Llamada REST directa a Gemini (Sin SDKs que causen 404s)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptOraculo }] }]
            })
        });

        const data = await response.json();

        // Si la respuesta de Google tiene texto, lo devolvemos limpio
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const respuestaOraculo = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ respuesta: respuestaOraculo });
        } else {
            // Si Google devuelve error, lo enviamos como JSON limpio para que el frontend no se rompa
            return res.status(500).json({ error: "El velo entre mundos es denso. Las deidades guardan silencio." });
        }
    } catch (e) {
        // CATCH: Si algo explota aquí, devolvemos JSON válido obligatoriamente
        return res.status(500).json({ error: "Error al consultar el oráculo: " + e.message });
    }
}
