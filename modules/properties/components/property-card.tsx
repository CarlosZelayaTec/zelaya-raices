import Link from "next/link";
import type { Property } from "../types";
import { formatHNL } from "../../../shared/lib/formatters";

type PropertyCardProps = {
  property: Property;
};

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <article className="property-card">
      <Link
        className="property-card__media"
        href={`/propiedades/${property.slug}`}
        aria-label={`Ver ${property.title}`}
      >
        <img src={property.image} alt={property.title} loading="lazy" />
        <span className="property-card__operation">{property.operation}</span>
        {property.verified ? (
          <span className="verification-badge verification-badge--floating">
            <span aria-hidden="true">✓</span> Verificada
          </span>
        ) : null}
      </Link>
      <div className="property-card__body">
        <p className="property-card__location">
          {property.city} · {property.department}
        </p>
        <h3>
          <Link href={`/propiedades/${property.slug}`}>{property.title}</Link>
        </h3>
        <p className="property-card__price">
          {formatHNL(property.price)}
          {property.pricePeriod === "monthly" ? " / mes" : null}
        </p>
        <dl className="property-facts" aria-label="Características principales">
          {property.propertyType === "Terreno" ? (
            <div>
              <dt>Tipo</dt>
              <dd>Terreno</dd>
            </div>
          ) : (
            <>
              <div>
                <dt>Habitaciones</dt>
                <dd>{property.bedrooms} hab.</dd>
              </div>
              <div>
                <dt>Baños</dt>
                <dd>{property.bathrooms} baños</dd>
              </div>
            </>
          )}
          <div>
            <dt>Área</dt>
            <dd>{property.area} m²</dd>
          </div>
          {property.propertyType === "Terreno" ? (
            <div>
              <dt>Operación</dt>
              <dd>{property.operation}</dd>
            </div>
          ) : null}
        </dl>
        <div className="property-card__footer">
          <span>Precio actualizado {property.priceUpdatedAt}</span>
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}
