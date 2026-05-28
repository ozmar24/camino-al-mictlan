import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY no configurada en Vercel");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest"   // ← CAMBIO: gemini-1.5-flash-latest
        });

        const { prompt, sistema } = req.body;

        const result = await model.generateContent(
            `${sistema || ''}\n\nUsuario: ${prompt}`
        );

        // ✅ Acceder correctamente al texto de la respuesta
        const textoRespuesta = result.response.text();

        return res.status(200).json({ 
            texto: textoRespuesta
        });

    } catch (error) {
        console.error("ERROR ORÁCULO:", error.message);
        return res.status(500).json({ 
            error: "Error en el servidor: " + error.message 
        });
    }
}
