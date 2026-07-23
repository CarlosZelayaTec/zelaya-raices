import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPropertyBySlug, properties } from "../../../modules/properties/data";
import { formatHNL } from "../../../shared/lib/formatters";
import { SiteFooter } from "../../../shared/components/site-footer";
import { SiteHeader } from "../../../shared/components/site-header";

type PropertyPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return properties.map((property) => ({ slug: property.slug }));
}

export async function generateMetadata({
  params,
}: PropertyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    return { title: "Propiedad no encontrada" };
  }

  return {
    title: property.title,
    description: `${property.propertyType} en ${property.city}, ${property.department}. ${property.bedrooms} habitaciones, ${property.bathrooms} baños y ${property.area} m².`,
    alternates: { canonical: `/propiedades/${property.slug}` },
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) {
    notFound();
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SingleFamilyResidence",
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
      unitCode: "MTK",
    },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "HNL",
      availability: "https://schema.org/InStock",
      url: `https://zelayaraices.com/propiedades/${property.slug}`,
    },
  };

  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="property-detail-page">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
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
              <strong>
                {formatHNL(property.price)}
                {property.pricePeriod === "monthly" ? " / mes" : null}
              </strong>
              <small>Precio actualizado {property.priceUpdatedAt}</small>
            </div>
          </header>
          <section className="property-gallery" aria-label="Galería de la propiedad">
            {property.gallery.map((image, index) => (
              <img
                src={image}
                alt={index === 0 ? property.title : `Vista ${index + 1} de ${property.title}`}
                key={image}
              />
            ))}
            <span className="verification-badge property-gallery__badge">
              <span aria-hidden="true">✓</span> Propiedad verificada
            </span>
          </section>
          <div className="property-detail-layout">
            <div className="property-detail-main">
              <dl className="detail-facts">
                <div>
                  <dt>Habitaciones</dt>
                  <dd>{property.bedrooms}</dd>
                </div>
                <div>
                  <dt>Baños</dt>
                  <dd>{property.bathrooms}</dd>
                </div>
                <div>
                  <dt>Construcción</dt>
                  <dd>{property.area} m²</dd>
                </div>
                <div>
                  <dt>Estacionamientos</dt>
                  <dd>{property.parking}</dd>
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
              <section className="detail-section detail-verification" id="verificacion">
                <div className="detail-verification__heading">
                  <div>
                    <p className="eyebrow">Resumen de confianza</p>
                    <h2>Lo que verificamos en este anuncio.</h2>
                  </div>
                  <span className="verification-badge">
                    <span aria-hidden="true">✓</span> Revisada
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Propiedad</dt>
                    <dd>Verificada</dd>
                  </div>
                  <div>
                    <dt>Anunciante</dt>
                    <dd>Identidad validada</dd>
                  </div>
                  <div>
                    <dt>Ubicación</dt>
                    <dd>Confirmada</dd>
                  </div>
                  <div>
                    <dt>Última revisión</dt>
                    <dd>{property.reviewedAt}</dd>
                  </div>
                  <div>
                    <dt>Cambios publicados</dt>
                    <dd>{property.publishedChanges}</dd>
                  </div>
                  <div>
                    <dt>Reportes recibidos</dt>
                    <dd>{property.reportCount}</dd>
                  </div>
                </dl>
                <p className="demo-note">
                  Información demostrativa. En producción se alimentará del
                  historial real de revisión y cambios.
                </p>
              </section>
            </div>
            <aside className="contact-card">
              <p className="contact-card__label">Anunciante verificado</p>
              <div className="contact-card__agent">
                <span aria-hidden="true">MZ</span>
                <div>
                  <strong>María Zelaya</strong>
                  <small>Agente inmobiliaria · Demostración</small>
                </div>
              </div>
              <p>
                Consulta disponibilidad, agenda una visita o solicita más
                información sobre esta propiedad.
              </p>
              <a
                className="button button--primary button--full"
                href={`mailto:hola@zelayaraices.com?subject=Consulta%20sobre%20${encodeURIComponent(property.title)}`}
              >
                Enviar consulta
              </a>
              <a className="button button--outline button--full" href="#verificacion">
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
      <SiteFooter />
    </>
  );
}
