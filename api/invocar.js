export default async function handler(req, res) {
    // 1. Cabeceras estándar
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        // 2. Parsear el prompt
        const body = JSON.parse(req.body);
        const API_KEY = process.env.GOOGLE_API_KEY;

        // 3. Petición HTTP pura y dura (Sin SDK)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: body.prompt }] }]
            })
        });

        const data = await response.json();

        // 4. Devolver respuesta
        if (data.candidates) {
            return res.status(200).json({ texto: data.candidates[0].content.parts[0].text });
        } else {
            return res.status(500).json({ error: "Google respondió con error: " + JSON.stringify(data) });
        }
    } catch (e) {
        return res.status(500).json({ error: "Error de ejecución: " + e.message });
    }
}