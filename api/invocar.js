export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const API_KEY = process.env.GOOGLE_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ error: "La llave GOOGLE_API_KEY no aparece en el servidor. ¿Ya hiciste un nuevo Deploy?" });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
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
            // Aquí nos dirá el error real de Google
            return res.status(500).json({ error: "Respuesta inesperada de Google: " + (data.error ? data.error.message : JSON.stringify(data)) });
        }
    } catch (e) {
        return res.status(500).json({ error: "Error fatal en el servidor: " + e.message });
    }
}
