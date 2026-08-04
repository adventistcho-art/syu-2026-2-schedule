/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  // Windows + 한글 경로에서 .next 청크 open UNKNOWN(-4094) 완화
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};
module.exports = nextConfig;

