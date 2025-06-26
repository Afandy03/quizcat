import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "spgeng.rosselcdn.net",
        pathname: "**", // ✅ อนุญาตโหลดรูปจากทุก path ของโดเมนนี้
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "**", // ✅ fallback image จาก Pinterest
      }
    ],
  },
}

export default nextConfig
