export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const API_KEY = process.env.GOOGLE_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ error: "Llave de API no configurada." });
        }

        // Usamos v1 que es la versión estable y compatible con gemini-1.5-flash
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: body.prompt }] }]
            } )
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return res.status(200).json({ texto: data.candidates[0].content.parts[0].text });
        } else {
            return res.status(500).json({ error: "Error de Gemini: " + (data.error ? data.error.message : "Respuesta vacía") });
        }
    } catch (e) {
        return res.status(500).json({ error: "Error fatal: " + e.message });
    }
}
