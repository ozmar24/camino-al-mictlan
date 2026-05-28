import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API KEY no configurada");

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // --- CAMBIO AQUÍ ---
        // Usaremos 'getGenerativeModel' con el nombre de modelo estándar
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const { prompt } = req.body;
        const result = await model.generateContent(prompt);
        
        return res.status(200).json({ texto: result.response.text() });
    } catch (error) {
        console.error("Error en servidor:", error);
        return res.status(500).json({ error: error.message });
    }
}