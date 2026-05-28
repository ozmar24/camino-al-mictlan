import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        
        // CAMBIO AQUÍ: Usaremos 'gemini-pro' que es el estándar más estable
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const result = await model.generateContent(body.prompt);
        const response = await result.response;
        
        return res.status(200).json({ texto: response.text() });
        
    } catch (error) {
        return res.status(500).json({ error: "DEBUG: " + error.message });
    }
}