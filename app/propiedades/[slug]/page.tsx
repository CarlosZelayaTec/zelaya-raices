import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyLocationMap } from "../../../modules/properties/components/property-location-map";
import { isLandPropertyType } from "../../../modules/properties/property-types";
import { getPublicPropertyBySlug } from "../../../modules/properties/public-data.server";
import type { Property, PropertyMedia } from "../../../modules/properties/types";
import { formatCurrency } from "../../../shared/lib/formatters";
import { SiteFooter } from "../../../shared/components/site-footer";
import { SiteHeader } from "../../../shared/components/site-header";
import { WhatsAppIcon } from "../../../shared/components/whatsapp-icon";

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

const areaUnitLabels = {
  acre: "acres",
  manzana: "manzanas",
  m2: "m²",
  sqft: "pies²",
  vara2: "varas²",
} as const;

const availabilityLabels = {
  available: "Disponible",
  reserved: "Reservada",
  sold: "Vendida",
  rented: "Alquilada",
  unavailable: "No disponible",
} as const;

function formatPropertyPrice(property: Property) {
  if (property.priceOnRequest || property.price === null) {
    return "Precio a consultar";
  }

  const price = formatCurrency(
    property.price,
    property.currencyCode ?? "HNL",
  );

  if (property.pricePeriod === "monthly") return `${price} / mes`;
  if (property.pricePeriod === "nightly") return `${price} / noche`;
  return price;
}

function getOrderedMedia(property: Property): PropertyMedia[] {
  if (property.media?.length) return property.media;

  return property.gallery.map((url, index) => ({
    altText:
      index === 0 ? property.title : `Vista ${index + 1} de ${property.title}`,
    id: `${property.slug}-${index}`,
    isPrimary: index === 0,
    sortOrder: index,
    type: "image",
    url,
  }));
}

function getInitials(value?: string) {
  if (!value) return "ZR";

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-HN");
}

function contactPhoneDigits(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? digits : undefined;
}

function formatContactPhone(value?: string) {
  const digits = contactPhoneDigits(value);
  if (!digits) return undefined;

  if (digits.startsWith("504") && digits.length === 11) {
    return `+504 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }

  return value?.trim();
}

function getWhatsAppUrl(phone: string, propertyTitle: string) {
  const message = `Hola, me interesa la propiedad \"${propertyTitle}\" que vi en Zelaya Raíces.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function propertySchemaType(property: Property) {
  if (property.propertyTypeValue) {
    if (
      property.propertyTypeValue === "house" ||
      property.propertyTypeValue === "villa"
    ) {
      return "SingleFamilyResidence";
    }
    if (
      property.propertyTypeValue === "apartment" ||
      property.propertyTypeValue === "condominium"
    ) {
      return "Apartment";
    }
    if (isLandPropertyType(property.propertyTypeValue)) return "Landform";
  }

  if (property.propertyType === "Casa" || property.propertyType === "Villa") {
    return "SingleFamilyResidence";
  }
  if (
    property.propertyType === "Apartamento" ||
    property.propertyType === "Condominio"
  ) {
    return "Apartment";
  }
  if (property.propertyType === "Terreno" || property.propertyType === "Finca") {
    return "Landform";
  }
  return "Place";
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);

  if (!property) {
    return { title: "Propiedad no encontrada" };
  }

  return {
    title: property.title,
    description: `${property.propertyType} en ${property.city}, ${property.department}. Consulta características, disponibilidad y datos actualizados del anuncio.`,
    alternates: { canonical: `/propiedades/${property.slug}` },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = await getPublicPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": propertySchemaType(property),
    name: property.title,
    description: property.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.city,
      addressRegion: property.department,
      addressCountry: "HN",
    },
    floorSize: {
      "@type": "QuantitativeValue",
      value: property.area,
      unitText: areaUnitLabels[property.areaUnit ?? "m2"],
    },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    offers: {
      "@type": "Offer",
      price: property.priceOnRequest ? undefined : property.price,
      priceCurrency: property.currencyCode ?? "HNL",
      availability:
        property.availabilityStatus === "available" ||
        !property.availabilityStatus
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `https://zelayaraices.com/propiedades/${property.slug}`,
    },
  };
  const orderedMedia = getOrderedMedia(property);
  const advertiserVerified =
    property.advertiserVerified ?? property.agentVerified;
  const seller = property.seller;
  const sellerName =
    seller?.name || property.advertiserName || "Anunciante de la propiedad";
  const whatsappPhone = contactPhoneDigits(seller?.whatsapp);
  const phone = contactPhoneDigits(seller?.phone);
  const visiblePhone = formatContactPhone(seller?.phone);
  const sellerEmail = seller?.email?.trim();
  const sellerVerified = seller?.verified ?? advertiserVerified;
  const hasSellerContact = Boolean(whatsappPhone || phone || sellerEmail);
  const locationLabel = property.locationConfirmed
    ? "Confirmada"
    : property.locationPrecision === "exact"
      ? "Exacta, pendiente de confirmación"
      : property.locationPrecision === "zone"
        ? "Zona indicada"
        : "Aproximada";

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="property-detail-page">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
        <div className="container">
          <nav className="breadcrumbs property-breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span aria-hidden="true">/</span>
            <Link href="/propiedades">Propiedades</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{property.city}</span>
          </nav>
          <header className="property-detail-header">
            <div>
              <p className="property-detail-header__location">
                {property.city} · {property.department}
              </p>
              <h1>{property.title}</h1>
              <p>{property.address}</p>
            </div>
            <div className="property-detail-header__price">
              <span>{property.operation}</span>
              <strong>{formatPropertyPrice(property)}</strong>
              {property.availabilityStatus ? (
                <small>
                  {availabilityLabels[property.availabilityStatus]}
                </small>
              ) : null}
              <small>Precio actualizado {property.priceUpdatedAt}</small>
            </div>
          </header>
          {hasSellerContact ? (
            <a
              className="button button--accent button--small property-detail-quick-contact"
              href="#contactar"
            >
              Contactar al vendedor
            </a>
          ) : null}
          <section className="property-gallery" aria-label="Galería de la propiedad">
            {orderedMedia.map((media, index) =>
              media.type === "video" ? (
                <video
                  aria-label={
                    media.altText || `Video ${index + 1} de ${property.title}`
                  }
                  controls
                  key={media.id}
                  playsInline
                  preload="metadata"
                  src={media.url}
                />
              ) : (
                <img
                  src={media.url}
                  alt={
                    media.altText ||
                    (index === 0
                      ? property.title
                      : `Vista ${index + 1} de ${property.title}`)
                  }
                  key={media.id}
                />
              ),
            )}
            {property.verified ? (
              <span className="verification-badge property-gallery__badge">
                <span aria-hidden="true">✓</span> Propiedad verificada
              </span>
            ) : null}
          </section>
          <div className="property-detail-layout">
            <div className="property-detail-main">
              <dl className="detail-facts">
                <div>
                  <dt>Habitaciones</dt>
                  <dd>{property.bedrooms ?? "No aplica"}</dd>
                </div>
                <div>
                  <dt>Baños</dt>
                  <dd>{property.bathrooms ?? "No aplica"}</dd>
                </div>
                <div>
                  <dt>Área</dt>
                  <dd>
                    {property.area > 0
                      ? `${property.area.toLocaleString("es-HN")} ${
                          areaUnitLabels[property.areaUnit ?? "m2"]
                        }`
                      : "Por confirmar"}
                  </dd>
                </div>
                <div>
                  <dt>Estacionamientos</dt>
                  <dd>{property.parking ?? "No indicado"}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{property.propertyType}</dd>
                </div>
              </dl>
              <section className="detail-section">
                <p className="eyebrow">Sobre la propiedad</p>
                <h2>Un espacio pensado para disfrutarlo.</h2>
                <p>{property.description}</p>
                <p>
                  La disponibilidad, medidas y condiciones finales deberán ser
                  confirmadas directamente con el anunciante antes de cualquier
                  decisión o transacción.
                </p>
              </section>
              {property.mapLocation ? (
                <PropertyLocationMap
                  location={property.mapLocation}
                  title={property.title}
                />
              ) : null}
              <section className="detail-section detail-verification" id="verificacion">
                <div className="detail-verification__heading">
                  <div>
                    <p className="eyebrow">Resumen de confianza</p>
                    <h2>Lo que verificamos en este anuncio.</h2>
                  </div>
                  {property.verified ? (
                    <span className="verification-badge">
                      <span aria-hidden="true">✓</span> Revisada
                    </span>
                  ) : null}
                </div>
                <dl>
                  <div>
                    <dt>Propiedad</dt>
                    <dd>{property.verified ? "Verificada" : "Sin verificar"}</dd>
                  </div>
                  <div>
                    <dt>Anunciante</dt>
                    <dd>
                      {advertiserVerified
                        ? "Identidad validada"
                        : "Verificación no disponible"}
                    </dd>
                  </div>
                  <div>
                    <dt>Ubicación</dt>
                    <dd>{locationLabel}</dd>
                  </div>
                  <div>
                    <dt>Última revisión</dt>
                    <dd>{property.reviewedAt}</dd>
                  </div>
                  <div>
                    <dt>Cambios publicados</dt>
                    <dd>{property.publishedChanges ?? "No disponible"}</dd>
                  </div>
                  <div>
                    <dt>Reportes recibidos</dt>
                    <dd>{property.reportCount}</dd>
                  </div>
                </dl>
                <p className="demo-note">
                  {property.source === "supabase"
                    ? "La información corresponde al registro público aprobado. Los datos no confirmados se indican expresamente."
                    : "Información demostrativa. En producción se alimentará del historial real de revisión y cambios."}
                </p>
              </section>
            </div>
            <aside className="contact-card" id="contactar">
              <p className="contact-card__label">
                {sellerVerified ? "Vendedor verificado" : "Vendedor registrado"}
              </p>
              <div className="contact-card__agent">
                <span aria-hidden="true">
                  {getInitials(sellerName)}
                </span>
                <div>
                  <strong>{sellerName}</strong>
                  <small>
                    {sellerVerified
                      ? "Identidad validada por Zelaya Raíces"
                      : "Anunciante registrado en Zelaya Raíces"}
                  </small>
                </div>
              </div>
              {seller?.bio ? <p className="contact-card__bio">{seller.bio}</p> : null}
              <p>
                Consulta disponibilidad, agenda una visita o solicita más
                información directamente al vendedor.
              </p>
              {hasSellerContact ? (
                <div className="contact-card__actions">
                  {whatsappPhone ? (
                    <a
                      className="button button--primary button--full contact-card__whatsapp"
                      href={getWhatsAppUrl(whatsappPhone, property.title)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <WhatsAppIcon />
                      Contactar por WhatsApp
                    </a>
                  ) : null}
                  {sellerEmail ? (
                    <a
                      className="button button--outline button--full"
                      href={`mailto:${sellerEmail}?subject=${encodeURIComponent(`Consulta sobre ${property.title}`)}`}
                    >
                      Enviar correo
                    </a>
                  ) : null}
                  {phone && visiblePhone ? (
                    <a className="contact-card__phone" href={`tel:+${phone}`}>
                      Llamar al {visiblePhone}
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="contact-card__unavailable">
                  El anunciante está actualizando sus datos de contacto. Vuelve
                  a intentarlo pronto.
                </p>
              )}
              <a className="contact-card__trust-link" href="#verificacion">
                Ver historial de confianza
              </a>
              <small className="contact-card__note">
                Nunca envíes anticipos sin validar la operación y la identidad de
                las partes.
              </small>
            </aside>
          </div>
        </div>
      </main>
      {hasSellerContact ? (
        <nav className="property-contact-dock" aria-label="Contactar al vendedor">
          {whatsappPhone ? (
            <a
              className="property-contact-dock__whatsapp"
              href={getWhatsAppUrl(whatsappPhone, property.title)}
              rel="noreferrer"
              target="_blank"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
          ) : null}
          {phone ? <a href={`tel:+${phone}`}>Llamar</a> : null}
          {sellerEmail ? (
            <a
              href={`mailto:${sellerEmail}?subject=${encodeURIComponent(`Consulta sobre ${property.title}`)}`}
            >
              Correo
            </a>
          ) : null}
        </nav>
      ) : null}
      <SiteFooter />
    </>
  );
}
