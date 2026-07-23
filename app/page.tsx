import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "../modules/properties/components/property-card";
import { featuredProperties } from "../modules/properties/data";
import { HeroSearch } from "../modules/search/components/hero-search";
import { SiteFooter } from "../shared/components/site-footer";
import { SiteHeader } from "../shared/components/site-header";

export const metadata: Metadata = {
  title: "Propiedades verificadas en Honduras",
  description:
    "Compra o alquila propiedades revisadas, con ubicación confirmada y precios actualizados en Honduras.",
  alternates: { canonical: "/" },
};

const markets = [
  {
    name: "Tegucigalpa",
    department: "Francisco Morazán",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1000&q=80",
  },
  {
    name: "San Pedro Sula",
    department: "Cortés",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80",
  },
  {
    name: "La Ceiba",
    department: "Atlántida",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
  },
  {
    name: "Roatán",
    department: "Islas de la Bahía",
    image:
      "https://images.unsplash.com/photo-1540202404-a2f29016b523?auto=format&fit=crop&w=1000&q=80",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">
        <section className="hero">
          <div className="container hero__grid">
            <div className="hero__content">
              <p className="eyebrow">
                <span aria-hidden="true" /> Propiedades confiables en Honduras
              </p>
              <h1>
                Tu próximo hogar, con datos que sí puedes <em>verificar.</em>
              </h1>
              <p className="hero__lead">
                Compra o alquila con propiedades revisadas, ubicaciones
                confirmadas y precios actualizados en toda Honduras.
              </p>
              <HeroSearch />
              <p className="hero__microcopy">
                Información clara antes de contactar. Sin anuncios automáticos.
              </p>
            </div>
            <figure className="hero-visual">
              <img
                src={featuredProperties[0].image}
                alt="Casa contemporánea rodeada de vegetación"
              />
              <div className="hero-visual__verified">
                <span className="verified-seal" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <strong>Propiedad verificada</strong>
                  Revisión completada el 21 jul 2026
                </span>
              </div>
              <figcaption>
                <span>Lomas del Guijarro · Tegucigalpa</span>
                <strong>L 8,950,000</strong>
              </figcaption>
            </figure>
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
                Sabes quién está detrás de la propiedad.
              </p>
            </div>
            <div>
              <span className="trust-strip__number">03</span>
              <p>
                <strong>Datos visibles</strong>
                Precio, ubicación y actualización a la vista.
              </p>
            </div>
          </div>
        </section>

        <section className="section section--properties" id="propiedades">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">Selección reciente</p>
                <h2>Propiedades que vale la pena conocer.</h2>
              </div>
              <Link className="arrow-link" href="/propiedades">
                Ver todas las propiedades <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="property-grid">
              {featuredProperties.map((property) => (
                <PropertyCard property={property} key={property.slug} />
              ))}
            </div>
            <p className="demo-note">
              Propiedades de demostración para visualizar la experiencia inicial.
            </p>
          </div>
        </section>

        <section className="section verification-section" id="confianza">
          <div className="container verification-section__grid">
            <div className="verification-copy">
              <p className="eyebrow eyebrow--light">Confianza visible</p>
              <h2>Más que un anuncio: un historial verificable.</h2>
              <p>
                Reunimos las señales que importan para que puedas evaluar cada
                oportunidad con mayor claridad. Toda modificación relevante deja
                registro y puede volver a revisión.
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
                  <dd>Actualizado el 20 jul 2026</dd>
                </div>
                <div>
                  <dt>Última revisión</dt>
                  <dd>21 jul 2026</dd>
                </div>
                <div>
                  <dt>Cambios publicados</dt>
                  <dd>2 cambios</dd>
                </div>
                <div>
                  <dt>Reportes recibidos</dt>
                  <dd>0 reportes</dd>
                </div>
              </dl>
              <p className="verification-panel__note">
                Datos de ejemplo. La insignia solo se mostrará tras una
                verificación real.
              </p>
            </div>
          </div>
        </section>

        <section className="section markets-section">
          <div className="container">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">Encuentra tu lugar</p>
                <h2>Honduras, mercado por mercado.</h2>
              </div>
              <p className="section-heading__copy">
                Comenzamos en los principales destinos residenciales del país y
                creceremos con información local.
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
                    <span>Explorar <span aria-hidden="true">→</span></span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="section process-section">
          <div className="container">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">Un proceso más claro</p>
              <h2>Explora, consulta y decide con respaldo.</h2>
            </div>
            <ol className="process-grid">
              <li>
                <span>01</span>
                <h3>Explora con contexto</h3>
                <p>
                  Compara precio, ubicación, características y señales de
                  verificación desde el primer vistazo.
                </p>
              </li>
              <li>
                <span>02</span>
                <h3>Consulta a alguien validado</h3>
                <p>
                  Contacta al agente o propietario responsable con información
                  clara sobre el anuncio.
                </p>
              </li>
              <li>
                <span>03</span>
                <h3>Decide con más respaldo</h3>
                <p>
                  Revisa cuándo cambió el precio, cuándo se confirmó la ubicación
                  y si hubo reportes.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="agent-section" id="para-agentes">
          <div className="container agent-section__inner">
            <div>
              <p className="eyebrow eyebrow--light">Para profesionales inmobiliarios</p>
              <h2>Publica con el respaldo de Zelaya Raíces.</h2>
              <p>
                Administra tus propiedades, consultas y contactos desde un solo
                lugar. Al inicio, cada publicación pasará por revisión para
                proteger la calidad de la plataforma.
              </p>
            </div>
            <div className="agent-flow" aria-label="Flujo de publicación">
              <span>Borrador</span>
              <i aria-hidden="true">→</i>
              <span>Revisión</span>
              <i aria-hidden="true">→</i>
              <span>Publicación</span>
            </div>
            <a className="button button--accent" href="mailto:hola@zelayaraices.com?subject=Quiero%20publicar%20en%20Zelaya%20Ra%C3%ADces">
              Solicitar acceso para agentes
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
