/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.POS_API_BASE_URL || "http://127.0.0.1:4000";
    const base = apiBase.replace(/\/$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
