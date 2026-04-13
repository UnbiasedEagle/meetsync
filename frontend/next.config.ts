import type { NextConfig } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
// Extract hostname from the URL for allowedDevOrigins (strips the protocol)
const devOrigin = appUrl.replace(/^https?:\/\//, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigin ? [devOrigin] : [],
};

export default nextConfig;
