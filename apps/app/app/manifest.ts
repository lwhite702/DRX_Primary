import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deelrx CRM",
    short_name: "DRX",
    description: "Privacy-first POS & CRM for small businesses",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
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
        src: "/brand/drx-mark-primary.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
