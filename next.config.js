/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'functionalfoods.dk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ketoliv.dk',
        port: '',
        pathname: '/**',
      },
    ],
    // Performance optimizations
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  // Enable compression
  compress: true,
  // Enable gzip compression
  poweredByHeader: false,
}

module.exports = nextConfig 