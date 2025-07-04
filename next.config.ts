import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true, // ✅ เพิ่มเพื่อให้ทำงานกับ static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // ✅ อนุญาตทุกโดเมน HTTPS
      },
      {
        protocol: "http",
        hostname: "**", // ✅ อนุญาตทุกโดเมน HTTP (สำหรับ dev)
      }
    ],
  },
}

export default nextConfig
