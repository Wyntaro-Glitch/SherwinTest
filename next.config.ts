import type { NextConfig } from "next";
import bundleAnalyzerInit from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default withBundleAnalyzer(nextConfig);
