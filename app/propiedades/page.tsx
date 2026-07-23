import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "../../modules/properties/components/property-card";
import { properties } from "../../modules/properties/data";
import { SiteFooter } from "../../shared/components/site-footer";
import { SiteHeader } from "../../shared/components/site-header";

export const metadata: Metadata = {
  title: "Propiedades en venta y alquiler",
  description:
    "Explora casas, apartamentos, villas y terrenos con información clara en Honduras.",
  alternates: { canonical: "/propiedades" },
};

export default function PropertiesPage() {
  return (
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="listing-page">
        <section className="listing-hero">
          <div className="container">
            <nav className="breadcrumbs" aria-label="Migas de pan">
              <Link href="/">Inicio</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Propiedades</span>
            </nav>
            <div className="listing-hero__heading">
              <div>
                <p className="eyebrow">Descubre Honduras</p>
                <h1>Propiedades para vivir, invertir y crecer.</h1>
              </div>
              <p>
                Resultados de demostración con la estructura de confianza que
                tendrá cada publicación real.
              </p>
            </div>
            <form className="filter-bar" action="/propiedades" method="get">
              <label>
                <span>Operación</span>
                <select name="operacion" defaultValue="">
                  <option value="">Comprar o alquilar</option>
                  <option value="venta">Comprar</option>
                  <option value="alquiler">Alquilar</option>
                </select>
              </label>
              <label className="filter-bar__wide">
                <span>Ubicación</span>
                <input
                  type="search"
                  name="ubicacion"
                  placeholder="Ciudad, colonia o zona"
                />
              </label>
              <label>
                <span>Tipo</span>
                <select name="tipo" defaultValue="">
                  <option value="">Toda propiedad</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="villa">Villa</option>
                </select>
              </label>
              <label>
                <span>Precio máximo</span>
                <select name="precio" defaultValue="">
                  <option value="">Sin límite</option>
                  <option value="5000000">L 5 millones</option>
                  <option value="10000000">L 10 millones</option>
                  <option value="20000000">L 20 millones</option>
                </select>
              </label>
              <button className="button button--primary" type="submit">
                Aplicar filtros
              </button>
            </form>
          </div>
        </section>
        <section className="section listing-results">
          <div className="container">
            <div className="results-toolbar">
              <p>
                <strong>{properties.length} propiedades</strong> de demostración
              </p>
              <label>
                <span>Ordenar por</span>
                <select defaultValue="recientes" aria-label="Ordenar propiedades">
                  <option value="recientes">Más recientes</option>
                  <option value="precio-asc">Menor precio</option>
                  <option value="precio-desc">Mayor precio</option>
                </select>
              </label>
            </div>
            <div className="property-grid">
              {properties.map((property) => (
                <PropertyCard property={property} key={property.slug} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
