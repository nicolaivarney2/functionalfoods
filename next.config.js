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

  // ASCII-venlige URL'er: /niche/vaegttab → samme side som /niche/vægttab (mapper med æ på disk).
  // Rod-/vaegttab er et direkte route (src/app/vaegttab) og skal ikke rewrites.
  async rewrites() {
    return [
      { source: '/5-2-diet/vaegttab', destination: '/5-2-diet/vægttab' },
      { source: '/anti-inflammatory/vaegttab', destination: '/anti-inflammatory/vægttab' },
      { source: '/familie/vaegttab', destination: '/familie/vægttab' },
      { source: '/flexitarian/vaegttab', destination: '/flexitarian/vægttab' },
      { source: '/keto/vaegttab', destination: '/keto/vægttab' },
      { source: '/lchf-paleo/vaegttab', destination: '/lchf-paleo/vægttab' },
      { source: '/proteinrig-kost/vaegttab', destination: '/proteinrig-kost/vægttab' },
      { source: '/sense/vaegttab', destination: '/sense/vægttab' },
      { source: '/GLP-1/vaegttab', destination: '/GLP-1/vægttab' },
    ]
  },
}

module.exports = nextConfig 