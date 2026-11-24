import type { MetadataRoute } from "next";
import { APP } from "@/config/app";

/** Web app manifest, served at /manifest.webmanifest. Lets phones install the app to the home screen.
 *  Icons live in public/icons/ (made from public/logo.svg). Replace them when you change the logo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP.name,
    short_name: APP.shortName,
    description: APP.description,
    lang: "th",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // The manifest cannot read CSS variables, so these two repeat values from src/app/globals.css:
    // theme_color = --brand, background_color = --bg. Change them together with globals.css.
    theme_color: "#cf391a",
    background_color: "#f6f4f1",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
