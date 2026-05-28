import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: "Método no permitido" });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(body.prompt);
        const response = await result.response;
        
        return res.status(200).json({ texto: response.text() });
    } catch (error) {
        return res.status(500).json({ error: "Error al consultar al Oráculo", detalles: error.message });
    }
}