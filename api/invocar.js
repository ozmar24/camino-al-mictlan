export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-flash-1.5",
                "messages": [{ "role": "user", "content": body.prompt }]
            })
        });

        const data = await response.json();

        // REVISIÓN CRÍTICA: ¿Qué nos respondió OpenRouter?
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return res.status(200).json({ texto: data.choices[0].message.content });
        } else {
            // Si llega aquí, es que OpenRouter nos dio un error (Key inválida, sin saldo, etc.)
            return res.status(500).json({ error: "Respuesta inválida de OpenRouter", detalles: data });
        }
    } catch (error) {
        return res.status(500).json({ error: "Error de servidor", detalles: error.message });
    }
}