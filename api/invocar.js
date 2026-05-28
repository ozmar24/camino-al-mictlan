export default async function handler(req, res) {
    // CORS necesario
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') return res.status(405).json({ error: "Solo POST" });

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
        
        // DEPURACIÓN: Si hay error, lo devolvemos para verlo en la consola
        if (!data.choices) {
            return res.status(500).json({ error: "Error de OpenRouter", raw: data });
        }

        return res.status(200).json({ texto: data.choices[0].message.content });
        
    } catch (error) {
        return res.status(500).json({ error: "Error interno", details: error.message });
    }
}