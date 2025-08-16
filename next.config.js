/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for problematic pages
  experimental: {
    optimizeCss: false, // Disable the CSS optimization that might be causing issues
  },
  
  // Disable Next.js image optimization to fix 400 errors
  images: {
    unoptimized: true, // Use regular img tags instead of Next.js Image component
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