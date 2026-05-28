import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        
        // Diagnóstico: Verificar si la llave existe y cuántos caracteres tiene
        console.log("¿Existe API KEY?", !!apiKey);
        console.log("Longitud de la llave:", apiKey ? apiKey.length : 0);

        if (!apiKey) throw new Error("La variable GEMINI_API_KEY está vacía o no existe en Vercel.");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const { prompt, sistema } = req.body;
        const result = await model.generateContent(`${sistema || ''} Usuario: ${prompt}`);
        
        return res.status(200).json({ texto: result.response.text() });
    } catch (error) {
        console.error("ERROR DETALLADO:", error.message);
        return res.status(500).json({ error: "Error en el servidor: " + error.message });
    }
}