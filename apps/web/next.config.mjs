const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const securityHeadersFrameable = securityHeaders.map((h) =>
  h.key === 'X-Frame-Options' ? { key: 'X-Frame-Options', value: 'SAMEORIGIN' } : h,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@school/shared'],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: '/api/html-preview/:path*', headers: securityHeadersFrameable },
      { source: '/((?!api/html-preview).*)', headers: securityHeaders },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
