import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence multi-lockfile warning by pinning root for Turbopack
  // See: https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
