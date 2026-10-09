/** @type {import('next').NextConfig} */

// Adresse du backend utilisée par le proxy /api de Next.js.
// - Si BACKEND_URL est définie sur Vercel (recommandé : l'adresse HTTPS de votre API,
//   sans "/api" à la fin), elle est utilisée.
// - Sinon on garde EXACTEMENT le comportement actuel (rien ne casse).
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://85.31.238.112:3001'
).replace(/\/+$/, '')

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',

  // Ne pas annoncer "X-Powered-By: Next.js" dans les réponses
  poweredByHeader: false,

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ]
  },

  // En-têtes de sécurité simples (aucun ne bloque la géolocalisation ni les scripts)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Empêche le navigateur de deviner le type des fichiers
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Empêche d'afficher votre site dans une iframe d'un autre site (clickjacking)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Limite les informations envoyées aux autres sites via le Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig