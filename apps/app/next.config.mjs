import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: true, // Temporarily disabled for debugging 404
  register: false,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@wrelik/auth",
    "@wrelik/db",
    "@wrelik/storage",
    "@wrelik/analytics",
    "@wrelik/errors",
    "@wrelik/email",
    "@wrelik/jobs",
    "@wrelik/config",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,
  },
  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.resolve.fallback = {
  //       ...config.resolve.fallback,
  //       fs: false,
  //       net: false,
  //       tls: false,
  //       child_process: false,
  //       async_hooks: false,
  //       inspector: false,
  //     };
  //   }
  //   return config;
  // },
  // turbopack: {},
};

export default withPWA(nextConfig);
// export default nextConfig;
