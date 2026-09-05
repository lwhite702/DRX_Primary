import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deelrx CRM",
    short_name: "DRX",
    description: "Operator-first POS, inventory, CRM, and reporting",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0A0A0A",
    theme_color: "#0A0A0A",
    categories: ["business", "finance", "productivity"],
    icons: [
      {
        src: "/brand/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/brand/favicon-16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/brand/apple-touch-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/brand/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
