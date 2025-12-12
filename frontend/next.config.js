/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "export",           // <- MUST be here
  images: {
    unoptimized: true,        // optional, safe for static hosting
  },
};

module.exports = nextConfig;
