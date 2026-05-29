// api/auth-google.js
import { OAuth2Client } from 'google-auth-library';

// Inicializamos el cliente con el ID definitivo de tu proyecto
const client = new OAuth2Client("25093626964-mep6ihpq1gamn8hm59q2cf15rm8gd0ao.apps.googleusercontent.com");

export default async function handler(req, res) {
    // 1. Configuración de CORS obligatoria para que el iframe acepte la conexión
    res.setHeader('Access-Control-Allow-Origin', 'https://camino-al-mictlan.game-files.crazygames.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // 2. Manejo de la petición OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. El ritual solo acepta almas vía POST
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ success: false, error: 'El token místico está ausente.' });
        }

        // 1. Validamos el token directo con los servidores de Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: "25093626964-mep6ihpq1gamn8hm59q2cf15rm8gd0ao.apps.googleusercontent.com",
        });

        const payload = ticket.getPayload();
        
        // Datos reales garantizados por Google
        const emailUsuario = payload.email;
        const nombreUsuario = payload.name;

        // 2. Perfil de respuesta para el flujo de la Faucet
        // Aquí es donde después buscaremos en Redis. De momento, armamos la estructura real:
        const perfilUsuario = {
            email: emailUsuario,
            nombre: nombreUsuario,
            balanceSG: 0 // Bolsa inicial para el pago en SOULGEIST
        };

        // Devolvemos el éxito del pacto
        return res.status(200).json({
            success: true,
            perfil: perfilUsuario
        });

    } catch (error) {
        console.error("Error en el umbral de autenticación:", error);
        return res.status(500).json({ 
            success: false, 
            error: 'El inframundo rechazó la validación del token.' 
        });
    }
}