/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@deelrx/ui", "@deelrx/brand"],
};

export default nextConfig;
