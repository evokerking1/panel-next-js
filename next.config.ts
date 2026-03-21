import type { NextConfig } from 'next';

const config: NextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
      bodySizeLimit: '100mb',
    },
  },
};

export default config;
