import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
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
        url: "/og.png",
        width: 1733,
        height: 909,
        alt: "Zelaya Raíces — Propiedades confiables en Honduras",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zelaya Raíces | Propiedades confiables en Honduras",
    description:
      "Compra o alquila con información clara, propiedades revisadas y datos actualizados.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-HN">
      <body className={`${manrope.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
