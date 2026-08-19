import type { NextConfig } from "next";

const isBuild = process.env.NODE_ENV === 'production' || process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  ...(isBuild ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  }
};

export default nextConfig;

