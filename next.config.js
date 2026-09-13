const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

const venuePhotoPatterns = [];
try {
  const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (project.protocol === 'https:') venuePhotoPatterns.push({
    protocol: 'https',
    hostname: project.hostname,
    port: project.port,
    pathname: '/storage/v1/object/public/ars-venue-photos/**',
  });
} catch { /* Storage is optional until Supabase is configured. */ }

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { authInterrupts: true },
  poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "X-Frame-Options", value: "DENY" }] }]; },
  images: {
    remotePatterns: [
      ...venuePhotoPatterns,
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
};

module.exports = (phase) => ({
  ...nextConfig,
  // Keep production builds from overwriting a running dev server's chunks.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
});
