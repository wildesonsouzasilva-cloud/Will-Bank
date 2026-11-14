import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

if (process.env.NEXT_DIST_DIR) {
  nextConfig.distDir = process.env.NEXT_DIST_DIR;
}

export default nextConfig;
