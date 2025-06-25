import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "spgeng.rosselcdn.net",
        pathname: "**", // อนุญาตทุก path
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "**",
      }
    ],
  },
}

export default nextConfig
