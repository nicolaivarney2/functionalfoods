/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mindre / mere stabile lucide-chunks (kan afhjælpe webpack "originalFactory" fejl i browser).
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Undgå at Webpack splitter @supabase/* til en vendor-chunk der kan mangle (ENOENT) i dev/server.
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
  serverExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],

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