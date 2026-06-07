/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
  webpack: (config) => {
    // Suppress canvas module warning from react-flow
    config.externals = [...(config.externals || [])];
    return config;
  },
};

module.exports = nextConfig;
