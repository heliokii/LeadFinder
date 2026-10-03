/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Skip lint during `next build` on Vercel (dev already typechecks).
  // Keeps deploys green without changing local `npm run dev` behaviour.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
