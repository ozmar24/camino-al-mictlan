export default async function handler(req, res) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    // LOG DE SEGURIDAD: Esto aparecerá en los Logs de Vercel (no en la consola del navegador)
    console.log("¿Existe API Key?:", !!apiKey); 

    if (!apiKey) {
        return res.status(500).json({ error: "API Key no detectada por Vercel" });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "google/gemini-flash-1.5",
                "messages": [{ "role": "user", "content": req.body.prompt }]
            })
        });

        const data = await response.json();
        return res.status(200).json({ texto: data.choices[0].message.content });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}