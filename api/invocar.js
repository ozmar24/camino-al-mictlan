import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        
        // 1. Verificación explícita de la llave
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({ error: "DEBUG: GOOGLE_API_KEY no detectada" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(body.prompt);
        return res.status(200).json({ texto: result.response.text() });
        
    } catch (error) {
        // 2. Reporte detallado del error
        return res.status(500).json({ error: "DEBUG: " + error.message });
    }
}