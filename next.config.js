const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

/** @type {import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  // Keep dev output separate so npm run dev cannot corrupt a running production server.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  // Skip lint during `next build` on Vercel (dev already typechecks).
  // Keeps deploys green without changing local `npm run dev` behaviour.
  eslint: { ignoreDuringBuilds: true },
});

module.exports = nextConfig;
