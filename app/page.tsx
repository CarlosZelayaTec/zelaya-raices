import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "../modules/properties/components/property-card";
import { featuredProperties, properties } from "../modules/properties/data";
import { HeroSearch } from "../modules/search/components/hero-search";
import { SiteFooter } from "../shared/components/site-footer";
import { SiteHeader } from "../shared/components/site-header";
import { WhatsAppIcon } from "../shared/components/whatsapp-icon";

export const metadata: Metadata = {
  title: "Compra y alquila propiedades verificadas en Honduras",
  description:
    "Encuentra casas, apartamentos, terrenos y villas con ubicación confirmada, precios actualizados y anunciantes verificados en Honduras.",
  alternates: { canonical: "/" },
};

const markets = [
  {
    name: "Tegucigalpa",
    department: "Francisco Morazán",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=82",
  },
  {
    name: "San Pedro Sula",
    department: "Cortés",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=82",
  },
  {
    name: "La Ceiba",
    department: "Atlántida",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=82",
  },
  {
    name: "Roatán",
    department: "Islas de la Bahía",
    image:
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1000&q=82",
  },
];

const heroImage =
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1800&q=88";

const purchaseProperty =
  properties.find((property) => property.operation === "Venta") ??
  featuredProperties[0];
const rentalProperty =
  properties.find((property) => property.operation === "Alquiler") ??
  featuredProperties[1];

const whatsappMessage = encodeURIComponent(
  "Hola, visité zelayaraices.com y quisiera recibir ayuda para encontrar una propiedad.",
);
const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(
  /\D/g,
  "",
);
const whatsappHref = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
  : `https://wa.me/?text=${whatsappMessage}`;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="home-page">
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="container landing-hero__frame">
            <div className="landing-hero__copy">
              <p className="landing-kicker">Bienes raíces en Honduras</p>
              <h1 id="hero-title">
                Bienvenidos a Zelaya Raíces.
                <span> Tu próximo hogar comienza con confianza.</span>
              </h1>
              <p>
                Descubre propiedades revisadas para comprar o alquilar, con
                información clara antes de tomar una decisión.
              </p>
              <div className="landing-hero__actions">
                <Link className="button button--accent" href="/propiedades">
                  Ver propiedades
                </Link>
                <a
                  className="button button--hero-outline"
                  href="mailto:hola@zelayaraices.com?subject=Quiero%20hablar%20con%20un%20asesor"
                >
                  Contactar asesor
                </a>
              </div>
            </div>
            <figure className="landing-hero__visual">
              <img
                src={heroImage}
                alt="Sala luminosa y acogedora de una vivienda contemporánea"
              />
              <figcaption>
                <span className="verified-seal" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <strong>Confianza visible</strong>
                  Propiedad, agente y datos revisados
                </span>
              </figcaption>
            </figure>
          </div>
          <div className="container landing-search">
            <HeroSearch />
          </div>
        </section>

        <section className="trust-strip" aria-label="Compromisos de confianza">
          <div className="container trust-strip__grid">
            <div>
              <span className="trust-strip__number">01</span>
              <p>
                <strong>Revisión antes de publicar</strong>
                Cada anuncio pasa por nuestro equipo.
              </p>
            </div>
            <div>
              <span className="trust-strip__number">02</span>
              <p>
                <strong>Identidad validada</strong>
                Conoce quién está detrás de la propiedad.
              </p>
            </div>
            <div>
              <span className="trust-strip__number">03</span>
              <p>
                <strong>Datos actualizados</strong>
                Precio, ubicación y cambios siempre a la vista.
              </p>
            </div>
          </div>
        </section>

        <section className="section section--properties" id="destacadas">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">Propiedades destacadas</p>
                <h2>Opciones seleccionadas para empezar tu búsqueda.</h2>
              </div>
              <Link className="arrow-link" href="/propiedades">
                Ver todas <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="property-grid">
              {featuredProperties.slice(0, 3).map((property) => (
                <PropertyCard property={property} key={property.slug} />
              ))}
            </div>
            <p className="demo-note">
              Propiedades de demostración para visualizar la experiencia inicial.
            </p>
          </div>
        </section>

        <section className="section intent-section" aria-labelledby="intent-title">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">Dos búsquedas, dos experiencias</p>
              <h2 id="intent-title">¿Quieres comprar o prefieres alquilar?</h2>
              <p className="section-heading__intro">
                Separamos cada recorrido para mostrarte precios, propiedades y
                decisiones relevantes para tu objetivo.
              </p>
            </div>
            <div className="intent-grid">
              <article className="intent-card intent-card--buy">
                <img src={purchaseProperty.image} alt="" loading="lazy" />
                <span className="intent-card__overlay" />
                <div className="intent-card__content">
                  <span className="intent-card__label">Para construir patrimonio</span>
                  <h3>Comprar una propiedad</h3>
                  <p>
                    Explora casas, apartamentos, terrenos y oportunidades de
                    inversión disponibles para venta.
                  </p>
                  <Link
                    className="button button--light"
                    href="/propiedades?operacion=venta"
                  >
                    Ver propiedades en venta
                  </Link>
                </div>
              </article>
              <article className="intent-card intent-card--rent">
                <img src={rentalProperty.image} alt="" loading="lazy" />
                <span className="intent-card__overlay" />
                <div className="intent-card__content">
                  <span className="intent-card__label">Para tu próxima etapa</span>
                  <h3>Alquilar un espacio</h3>
                  <p>
                    Encuentra opciones mensuales con disponibilidad y condiciones
                    de alquiler claramente identificadas.
                  </p>
                  <Link
                    className="button button--accent"
                    href="/propiedades?operacion=alquiler"
                  >
                    Ver propiedades en alquiler
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section verification-section" id="confianza">
          <div className="container verification-section__grid">
            <div className="verification-copy">
              <p className="eyebrow eyebrow--light">Confianza visible</p>
              <h2>Más que un anuncio: información que puedes comprobar.</h2>
              <p>
                Reunimos las señales que importan para que evalúes cada
                oportunidad con mayor claridad. Los cambios relevantes dejan
                registro y pueden volver a revisión.
              </p>
              <Link className="button button--light" href="/propiedades">
                Explorar propiedades
              </Link>
            </div>
            <div className="verification-panel">
              <div className="verification-panel__header">
                <span>Resumen de confianza</span>
                <span className="verification-badge">
                  <span aria-hidden="true">✓</span> Revisada
                </span>
              </div>
              <dl>
                <div>
                  <dt>Propiedad</dt>
                  <dd>
                    <span className="status-dot" /> Verificada
                  </dd>
                </div>
                <div>
                  <dt>Anunciante</dt>
                  <dd>
                    <span className="status-dot" /> Identidad validada
                  </dd>
                </div>
                <div>
                  <dt>Ubicación</dt>
                  <dd>
                    <span className="status-dot" /> Confirmada
                  </dd>
                </div>
                <div>
                  <dt>Precio</dt>
                  <dd>Actualizado recientemente</dd>
                </div>
                <div>
                  <dt>Historial</dt>
                  <dd>Cambios publicados</dd>
                </div>
                <div>
                  <dt>Reportes</dt>
                  <dd>Visibles en el anuncio</dd>
                </div>
              </dl>
              <p className="verification-panel__note">
                Datos de ejemplo. La insignia solo aparecerá tras una verificación
                real.
              </p>
            </div>
          </div>
        </section>

        <section className="section markets-section">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">Encuentra tu lugar</p>
                <h2>Explora Honduras, ciudad por ciudad.</h2>
              </div>
              <p className="section-heading__copy">
                Comenzamos en los principales mercados residenciales y creceremos
                con información local.
              </p>
            </div>
            <div className="market-grid">
              {markets.map((market) => (
                <Link
                  className="market-card"
                  href={`/propiedades?ubicacion=${encodeURIComponent(market.name)}`}
                  key={market.name}
                >
                  <img src={market.image} alt="" loading="lazy" />
                  <span className="market-card__overlay" />
                  <span className="market-card__content">
                    <small>{market.department}</small>
                    <strong>{market.name}</strong>
                    <span>
                      Explorar <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section stories-section" id="historias">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">Historias reales</p>
                <h2>La confianza también se cuenta en primera persona.</h2>
              </div>
              <p className="section-heading__copy">
                Este espacio está preparado para el futuro carrusel de clientes
                reales recibiendo las llaves de su nuevo hogar.
              </p>
            </div>
            <div
              className="testimonial-placeholder"
              aria-label="Próximo carrusel de testimonios"
              aria-roledescription="carrusel"
            >
              <div className="testimonial-placeholder__media" aria-hidden="true">
                <span>Fotografía real del cliente</span>
              </div>
              <div className="testimonial-placeholder__copy">
                <span className="placeholder-pill">Próximamente</span>
                <h3>Historias de clientes Zelaya Raíces</h3>
                <p>
                  Aquí mostraremos testimonios autorizados, fotografías reales y
                  la experiencia de cada familia, sin reseñas ficticias.
                </p>
                <div className="carousel-controls" aria-label="Controles del carrusel">
                  <button aria-label="Testimonio anterior" disabled type="button">
                    ←
                  </button>
                  <span>Contenido en preparación</span>
                  <button aria-label="Testimonio siguiente" disabled type="button">
                    →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section team-section" id="asesores">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">Personas que te acompañan</p>
              <h2>Conoce al equipo detrás de cada consulta.</h2>
              <p className="section-heading__intro">
                Dejamos listo el espacio para presentar rostros, experiencia y
                datos de verificación de cada asesor.
              </p>
            </div>
            <div className="team-placeholder-grid">
              {["Asesor de compra", "Asesor de alquiler", "Especialista local"].map(
                (role) => (
                  <article className="team-placeholder-card" key={role}>
                    <div className="team-placeholder-card__portrait" aria-hidden="true">
                      <span>Foto</span>
                    </div>
                    <span className="placeholder-pill">Perfil próximo</span>
                    <h3>{role}</h3>
                    <p>Nombre, zona de atención y credenciales verificadas.</p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="agent-section" id="para-agentes">
          <div className="container agent-section__inner">
            <div>
              <p className="eyebrow eyebrow--light">
                Para profesionales inmobiliarios
              </p>
              <h2>Publica con el respaldo de Zelaya Raíces.</h2>
              <p>
                Administra propiedades, consultas y contactos desde un solo
                lugar. Cada publicación pasa por revisión para proteger la
                calidad de la plataforma.
              </p>
            </div>
            <div className="agent-flow" aria-label="Flujo de publicación">
              <span>Borrador</span>
              <i aria-hidden="true">→</i>
              <span>Revisión</span>
              <i aria-hidden="true">→</i>
              <span>Publicación</span>
            </div>
            <Link
              className="button button--accent"
              href="/panel/propiedades/nueva"
            >
              Publicar una propiedad
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
      <a
        className="whatsapp-float"
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir WhatsApp para consultar a Zelaya Raíces"
      >
        <span className="whatsapp-float__mark" aria-hidden="true">
          <WhatsAppIcon />
        </span>
        <span>¿Te ayudamos?</span>
      </a>
    </>
  );
}
