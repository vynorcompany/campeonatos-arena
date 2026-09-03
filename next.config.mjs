/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
