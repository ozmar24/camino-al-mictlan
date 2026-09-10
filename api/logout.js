// api/logout.js — Cierra la sesión REAL: borra el token de Redis para que
// deje de ser válido en todos los dispositivos (no solo se limpia localStorage).

import {
    borrarSesion,
    obtenerTokenPeticion,
    verificarOrigen,
    manejarError
} from '../lib/seguridad.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    try {
        if (!verificarOrigen(req)) {
            return res.status(403).json({ success: false, error: 'Origen no autorizado.' });
        }

        const token = obtenerTokenPeticion(req);
        if (token) {
            await borrarSesion(token);
        }

        return res.status(200).json({ success: true, message: 'Sesión disuelta.' });
    } catch (error) {
        return manejarError(res, error);
    }
}
