import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here shows per-user data behind a login, so pages render on each request.
  // Cache Components is left off to keep data loading simple.
  reactCompiler: true,
  // Lets the dev server be opened at http://127.0.0.1:<port> as well as localhost
  // (useful when other local projects fill the localhost cookies). Dev only.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
