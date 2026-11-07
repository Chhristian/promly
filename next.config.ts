import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is off: every page here reads the logged-in user's
  // cookies, and plain dynamic rendering is simpler and more reliable for the demo.
};

export default nextConfig;
