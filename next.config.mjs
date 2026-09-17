/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: "/alexandria",
  assetPrefix: "/alexandria/",
  images: { unoptimized: true },
};

export default nextConfig;
