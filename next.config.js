/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Next.js image optimization to fix 400 errors
  images: {
    unoptimized: true, // Use regular img tags instead of Next.js Image component
  },

  // Mange eksisterende ESLint-warnings – Vercel/CI skal ikke fejle på dem (next lint kører stadig lokalt)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Reduce build complexity
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig 