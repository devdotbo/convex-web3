import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    // Allow SWC transforms even with a custom Babel config (needed for next/font)
    forceSwcTransforms: true,
  },
  webpack: (config) => {
    // Avoid bundling optional pretty-printer dependency for pino/WalletConnect
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'pino-pretty': false,
      'worker_threads': false,
      'diagnostics_channel': false,
    };
    return config;
  },
};

export default nextConfig;
