import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const GOOGLE_TAG_MANAGER_ID = "GTM-K77TWH4Z";

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
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');`,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body className={montserrat.variable}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
      </body>
    </html>
  );
}
