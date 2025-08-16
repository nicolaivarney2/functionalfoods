/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for problematic pages
  experimental: {
    optimizeCss: false, // Disable the CSS optimization that might be causing issues
  },
  
  // Configure image optimization for Supabase Storage
  images: {
    domains: [
      'najaxycfjgultwdwffhv.supabase.co', // Supabase Storage domain
      'localhost'
    ],
    formats: ['image/webp', 'image/jpeg', 'image/png'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Reduce build complexity
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimize webpack
  webpack: (config, { isServer }) => {
    // Reduce bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
}

module.exports = nextConfig 