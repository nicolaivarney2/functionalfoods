/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable static optimization for problematic pages
  experimental: {
    optimizeCss: false, // Disable the CSS optimization that might be causing issues
  },
  
  // Optimize build process
  swcMinify: true,
  
  // Disable image optimization if not needed
  images: {
    unoptimized: true,
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