// Backend alternativo usando Puter (100% gratuito y sin configurar llaves)
import puter from "@heyputer/puter.js";

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const promptText = body.prompt || body.pregunta; 

        if (!promptText) {
            return res.status(400).json({ error: "La ofrenda está vacía. Formula una pregunta." });
        }

        // Definimos la personalidad mística del Oráculo
        const instruccionSistema = `
        Eres el "Oráculo del Mictlán", una deidad ancestral y sabia del inframundo mexica en la web https://vercel.app.
        Responde a las dudas de las almas viajeras con un tono místico, poético y enigmático.
        Usa referencias al cempasúchil, el copal y el viaje espiritual. 
        Sé muy breve (máximo 2 o 3 líneas) para mantener el misticismo del altar.
        `;

        // Petición directa a través del ecosistema de Puter
        const respuestaIA = await puter.ai.chat(
            `${instruccionSistema}\n\nUn alma te pregunta: "${promptText}"`
        );

        if (respuestaIA) {
            return res.status(200).json({ respuesta: respuestaIA });
        } else {
            return res.status(500).json({ error: "Las deidades guardan silencio temporalmente." });
        }

    } catch (e) {
        return res.status(500).json({ error: "Error en el inframundo técnico: " + e.message });
    }
}