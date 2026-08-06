import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zelayaraices.com"),
  title: {
    default: "Zelaya Raíces | Inmobiliaria de confianza en Honduras",
    template: "%s | Zelaya Raíces",
  },
  description:
    "Descubre propiedades verificadas, ubicaciones confirmadas y precios actualizados en Honduras.",
  applicationName: "Zelaya Raíces",
  icons: {
    icon: [
      {
        url: "/brand/zelaya-favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    shortcut: "/brand/zelaya-favicon.png",
    apple: [
      {
        url: "/brand/zelaya-apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  keywords: [
    "bienes raíces Honduras",
    "propiedades Honduras",
    "casas en venta Honduras",
    "alquiler Honduras",
    "inmobiliaria Honduras",
  ],
  openGraph: {
    type: "website",
    locale: "es_HN",
    siteName: "Zelaya Raíces",
    title: "Zelaya Raíces | Propiedades confiables en Honduras",
    description:
      "Compra o alquila con información clara, propiedades revisadas y datos actualizados.",
    images: [
      {
        url: "/og-v2.png",
        width: 1734,
        height: 907,
        alt: "Zelaya Raíces — Propiedades confiables en Honduras",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zelaya Raíces | Propiedades confiables en Honduras",
    description:
      "Compra o alquila con información clara, propiedades revisadas y datos actualizados.",
    images: ["/og-v2.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-HN">
      <body className={montserrat.variable}>{children}</body>
    </html>
  );
}
