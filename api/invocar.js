import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo acepto ofrendas POST' });
    }

    const { modelo, prompt, sistema } = req.body;
    const apiKey = process.env[`${modelo.toUpperCase()}_API_KEY`];

    if (!apiKey) {
        return res.status(500).json({ error: 'La deidad elegida no tiene llave de acceso.' });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(`${sistema} Usuario: ${prompt}`);
        const response = await result.response;
        const textoRespuesta = response.text();

        return res.status(200).json({ texto: textoRespuesta });
    } catch (error) {
        console.error("Error en el Mictlán:", error);
        return res.status(500).json({ error: 'El abismo no ha respondido.' });
    }
}