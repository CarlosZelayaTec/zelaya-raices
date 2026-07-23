import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/panel",
        "/login",
        "/actualizar-contrasena",
        "/activar-administracion",
        "/auth",
      ],
    },
    sitemap: "https://zelayaraices.com/sitemap.xml",
  };
}
