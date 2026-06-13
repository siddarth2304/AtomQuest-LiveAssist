import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "livekit-server-sdk"]
};

export default nextConfig;
