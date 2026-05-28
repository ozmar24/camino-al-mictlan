export default async function handler(req, res) {
    // Configuración de cabeceras CORS
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

        // Consumo directo del servicio de IA de Puter por HTTP libre de bloqueos
        const urlPuter = 'https://puter.com';
        const responsePuter = await fetch(urlPuter, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: instruccionSistema },
                    { role: 'user', content: promptText }
                ]
            })
        });

        // Validamos si la respuesta del servidor externo es correcta
        if (!responsePuter.ok) {
            const textoError = await responsePuter.text();
            return res.status(500).json({ error: "El Oráculo no pudo canalizar la energía.", detalles: textoError });
        }

        const dataPuter = await responsePuter.json();
        
        // Extraemos el texto de la respuesta según el formato oficial de Puter
        if (dataPuter && dataPuter.message && dataPuter.message.content) {
            return res.status(200).json({ respuesta: dataPuter.message.content });
        } else {
            return res.status(500).json({ error: "Las deidades guardan silencio místico.", debug: dataPuter });
        }

    } catch (e) {
        return res.status(500).json({ error: "Error en el inframundo técnico: " + e.message });
    }
}