import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/uploads/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://epiknovel_api:8080/uploads/:path*",
      },
      {
        source: "/hubs/:path*",
        destination: "http://epiknovel_api:8080/hubs/:path*",
      },
    ];
  },
};

export default nextConfig;
