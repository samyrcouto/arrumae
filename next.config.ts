import type { NextConfig } from "next";

// Security headers applied to every response. The Content-Security-Policy is
// set per request in src/proxy.ts (it carries a fresh nonce for scripts).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

// GitHub Codespaces acessa o app por *.app.github.dev. Liberado SOMENTE
// quando o app roda dentro de um Codespace (variável CODESPACES=true).
const codespaceOrigins = process.env.CODESPACES === "true" ? ["*.app.github.dev"] : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: codespaceOrigins,
  // Cache Components disabled on purpose: almost every page depends on the
  // session, and classic dynamic rendering keeps the MVP simpler.
  // See docs/DECISIONS.md (D-004).
  cacheComponents: false,
  poweredByHeader: false,
  serverExternalPackages: ["@node-rs/argon2", "sharp"],
  experimental: {
    serverActions: {
      // Photos/documents are uploaded through Server Actions. Files are also
      // validated individually in src/server/security/uploads.ts.
      bodySizeLimit: "26mb",
      allowedOrigins: codespaceOrigins,
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    const headers = [...securityHeaders];
    if (process.env.NODE_ENV === "production") {
      headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
