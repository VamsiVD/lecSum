import type { NextConfig } from "next";

const securityHeaders = [
  // Block browsers from guessing content types
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Stop page being embedded in iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Don't send referrer to other origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features we don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Force HTTPS for 1 year (Vercel already enforces HTTPS, belt-and-suspenders)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Content Security Policy
  // - default-src: only same origin
  // - script-src: self + Clerk (requires unsafe-inline for Next.js hydration)
  // - style-src: self + unsafe-inline (Tailwind inline styles)
  // - img-src: self + data URIs + GitHub avatars (used in AccountMenu)
  // - connect-src: self + Clerk + AWS (S3 presigned PUTs from browser)
  // - frame-src: Clerk hosted pages
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.lecsum.app",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://github.com https://img.clerk.com",
      "connect-src 'self' https://*.clerk.accounts.dev https://*.amazonaws.com https://clerk.lecsum.app",
      "frame-src https://*.clerk.accounts.dev https://clerk.lecsum.app",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
