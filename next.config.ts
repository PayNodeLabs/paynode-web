import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.2.50"],
  // eslint: {
  //   // This ensures production builds correctly fail if
  //   // your project has ESLint errors.
  //   ignoreDuringBuilds: false,
  // },
  // typescript: {
  //   // This ensures production builds correctly fail if
  //   // your project has type errors.
  //   ignoreBuildErrors: false,
  // },
  trailingSlash: false,
};

export default nextConfig;
