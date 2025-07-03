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
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
        pathname: "**", // ✅ อนุญาตโหลดรูปจาก WordPress
      },
      {
        protocol: "https",
        hostname: "*.wp.com",
        pathname: "**", // ✅ อนุญาตโหลดรูปจาก WordPress ทุกโดเมนย่อย
      },
      {
        protocol: "https",
        hostname: "www.xinhuathai.com",
        pathname: "**", // ✅ อนุญาตโหลดรูปจาก xinhuathai.com
      }
    ],
  },
}

export default nextConfig
