export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const API_KEY = process.env.GOOGLE_API_KEY;
        const MODEL = "gemini-1.5-flash";
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

        const response = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: body.prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return res.status(200).json({ texto: data.candidates[0].content.parts[0].text });
        } else {
            throw new Error(JSON.stringify(data));
        }
    } catch (error) {
        return res.status(500).json({ error: "DEBUG: " + error.message });
    }
}