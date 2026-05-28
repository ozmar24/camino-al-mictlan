export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        // Aceptamos 'prompt' (del frontend actual) o 'pregunta' (por si acaso)
        const mensaje = body.prompt || body.pregunta;

        if (!mensaje) {
            return res.status(400).json({ error: "La ofrenda (pregunta) está vacía." });
        }

        const API_KEY = process.env.GOOGLE_API_KEY;
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: mensaje }] }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            // Devolvemos el texto en la clave 'texto' para que coincida con tu frontend (data.texto)
            return res.status(200).json({ texto: data.candidates[0].content.parts[0].text });
        } else {
            return res.status(500).json({ error: "Las deidades no pueden leer este mensaje." });
        }
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}