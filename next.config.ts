import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["lowdb", "bcryptjs"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
