/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignorer ESLint pendant le build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuration output
  output: 'standalone',
}

module.exports = nextConfig