import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  /**
   * The Studio previews the draft by embedding the client portal inside an
   * iframe. That portal is served from the project's own origin (or, in
   * development, from this machine), so no rewrite is needed for production.
   *
   * `NEXT_PUBLIC_API_URL` is read at build time by the API client, exactly as
   * the console app does.
   */
  async headers() {
    return [
      {
        // The preview iframe runs a full third-party site, so it must not be
        // able to reach back into the Studio's own authenticated API surface
        // via ambient credentials. These headers scope it deliberately.
        source: "/preview",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
