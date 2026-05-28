export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://camino-al-mictlan.vercel.app/", // Opcional, ayuda a identificar tu app
                "X-Title": "El Oráculo del Mictlán"
            },
            body: JSON.stringify({
                "model": "google/gemini-flash-1.5",
                "messages": [{ "role": "user", "content": req.body.prompt }]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || "Error en OpenRouter");
        }

        return res.status(200).json({ texto: data.choices[0].message.content });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}