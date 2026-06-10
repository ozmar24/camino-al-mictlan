import { NextResponse } from 'next/server';

export function middleware(request) {
    const ORIGENES_PERMITIDOS = [
        'https://camino-al-mictlan.vercel.app',
        'http://localhost:3000'
    ];

    const origin = request.headers.get('origin');
    
    // Si el origen está en nuestra lista, lo usamos. Si no, usamos el oficial por defecto.
    const originPermitido = ORIGENES_PERMITIDOS.includes(origin) 
        ? origin 
        : 'https://camino-al-mictlan.vercel.app';

    // Manejo de la petición previa del navegador (OPTIONS)
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': originPermitido,
                'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
                'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
                'Access-Control-Allow-Credentials': 'true',
            },
        });
    }

    // Para las peticiones normales (GET, POST, etc.)
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', originPermitido);
    response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    return response;
}

// Esto asegura que el código solo se ejecute para tus archivos dentro de la carpeta /api
export const config = {
    matcher: '/api/:path*',
};
