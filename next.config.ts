import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "7pn4qtdrnj.ufs.sh" },
      { hostname: "maps.googleapis.com" },
    ],
  },
};

export default nextConfig;
