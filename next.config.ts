import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
