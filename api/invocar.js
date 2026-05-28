export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const promptText = body.prompt || body.pregunta; 

        if (!promptText) {
            return res.status(400).json({ error: "La ofrenda está vacía." });
        }

        const API_KEY = process.env.GOOGLE_API_KEY;
        // Llamada REST directa, evitando el SDK que causa el 404
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return res.status(200).json({ respuesta: data.candidates[0].content.parts[0].text });
        } else {
            return res.status(500).json({ error: "Las deidades guardan silencio." });
        }
    } catch (e) {
        return res.status(500).json({ error: "Error técnico: " + e.message });
    }
}