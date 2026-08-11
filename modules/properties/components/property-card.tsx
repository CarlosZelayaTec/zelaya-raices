import Link from "next/link";
import type { Property } from "../types";
import {
  isLandPropertyType,
  isResidentialPropertyType,
} from "../property-types";
import { formatCurrency } from "../../../shared/lib/formatters";

type PropertyCardProps = {
  property: Property;
};

const availabilityLabels = {
  available: "Disponible",
  reserved: "Reservada",
  sold: "Vendida",
  rented: "Alquilada",
  unavailable: "No disponible",
} as const;

const areaUnitLabels = {
  acre: "acres",
  manzana: "manzanas",
  m2: "m²",
  sqft: "pies²",
  vara2: "varas²",
} as const;

function propertyPrice(property: Property) {
  if (property.priceOnRequest || property.price === null) {
    return "Precio a consultar";
  }

  const formatted = formatCurrency(
    property.price,
    property.currencyCode ?? "HNL",
  );

  if (property.pricePeriod === "monthly") return `${formatted} / mes`;
  if (property.pricePeriod === "nightly") return `${formatted} / noche`;
  return formatted;
}

export function PropertyCard({ property }: PropertyCardProps) {
  const isLand = property.propertyTypeValue
    ? isLandPropertyType(property.propertyTypeValue)
    : property.propertyType === "Terreno" || property.propertyType === "Finca";
  const isResidential = property.propertyTypeValue
    ? isResidentialPropertyType(property.propertyTypeValue)
    : ["Casa", "Apartamento", "Villa", "Condominio"].includes(
        property.propertyType,
      );

  const firstMedia = property.media?.[0];

  return (
    <article className="property-card">
      <Link
        className="property-card__media"
        href={`/propiedades/${property.slug}`}
        aria-label={`Ver ${property.title}`}
      >
        {firstMedia?.type === "video" ? (
          <video
            aria-label={`Video de ${property.title}`}
            muted
            playsInline
            preload="metadata"
            src={firstMedia.url}
          />
        ) : (
          <img src={property.image} alt={property.title} loading="lazy" />
        )}
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
        {property.availabilityStatus &&
        property.availabilityStatus !== "available" ? (
          <p className="property-card__availability">
            {availabilityLabels[property.availabilityStatus]}
          </p>
        ) : null}
        <h3>
          <Link href={`/propiedades/${property.slug}`}>{property.title}</Link>
        </h3>
        <p className="property-card__price">
          {propertyPrice(property)}
        </p>
        <dl className="property-facts" aria-label="Características principales">
          {isLand ? (
            <div>
              <dt>Tipo</dt>
              <dd>{property.propertyType}</dd>
            </div>
          ) : isResidential ? (
            <>
              <div>
                <dt>Habitaciones</dt>
                <dd>
                  {property.bedrooms === null
                    ? "Por confirmar"
                    : `${property.bedrooms} hab.`}
                </dd>
              </div>
              <div>
                <dt>Baños</dt>
                <dd>
                  {property.bathrooms === null
                    ? "Por confirmar"
                    : `${property.bathrooms} baños`}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Tipo</dt>
                <dd>{property.propertyType}</dd>
              </div>
              <div>
                <dt>Baños</dt>
                <dd>
                  {property.bathrooms === null
                    ? "Por confirmar"
                    : `${property.bathrooms} baños`}
                </dd>
              </div>
            </>
          )}
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
          {isLand ? (
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
