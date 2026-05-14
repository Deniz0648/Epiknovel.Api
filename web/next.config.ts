import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [150, 300, 600],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "epiknovel_api",
        port: "8080",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "epiknovel.com",
        pathname: "/**",
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
      {
        source: "/api/:path*",
        destination: "http://epiknovel_api:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
