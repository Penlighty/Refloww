import type { NextConfig } from "next";

// Disable static export on Vercel so dynamic routes (like /[id]) work correctly.
const isVercel = process.env.VERCEL === '1';
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true' || (process.env.NODE_ENV === 'production' && !isVercel);

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ['date-fns', 'clsx', 'uuid']
  },
  serverExternalPackages: ['firebase', '@grpc/proto-loader', 'protobufjs']
};

export default nextConfig;
