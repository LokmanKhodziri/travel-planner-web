import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { hostname: "7pn4qtdrnj.ufs.sh" },
      { hostname: "maps.googleapis.com" },
    ],
  },
};

export default nextConfig;
