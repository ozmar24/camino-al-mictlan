/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Aplica estos encabezados a todas las rutas dentro de la carpeta /api
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // Cambiado * por tu dominio oficial para que el navegador no bloquee las credenciales
          { key: "Access-Control-Allow-Origin", value: "https://camino-al-mictlan.vercel.app" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          // Una sola línea unificada que incluye tu firma x-enlace-mistico
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-enlace-mistico" }
        ]
      }
    ]
  }
}

module.exports = nextConfig
