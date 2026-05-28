import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // 1. Cabeceras obligatorias para evitar problemas de CORS y formato
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido" });
    }

    try {
        const { prompt } = JSON.parse(req.body);
        
        if (!process.env.GOOGLE_API_KEY) {
            return res.status(500).json({ error: "Configuración de servidor faltante" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // 2. Éxito: siempre devolvemos un objeto con la propiedad 'texto'
        return res.status(200).json({ texto: response.text() });
        
    } catch (error) {
        // 3. Error: siempre devolvemos un objeto JSON, nunca texto plano
        console.error("Error en API:", error);
        return res.status(500).json({ error: "El Oráculo no pudo procesar tu ofrenda" });
    }
}