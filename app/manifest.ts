import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RubyOrbit Messages",
    short_name: "RubyOrbit",
    description: "Two-way SMS inbox for RubyOrbit teams.",
    id: "/",
    start_url: "/inbox",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#B0123B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
