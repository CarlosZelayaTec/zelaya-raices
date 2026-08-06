import type { Metadata } from "next";
import Link from "next/link";
import { PropertyCard } from "../../modules/properties/components/property-card";
import { getPublicProperties } from "../../modules/properties/public-data.server";
import { SiteFooter } from "../../shared/components/site-footer";
import { SiteHeader } from "../../shared/components/site-header";

type SearchParams = Record<string, string | string[] | undefined>;

type PropertiesPageProps = {
  searchParams?: Promise<SearchParams>;
};

export const dynamic = "force-dynamic";

const operationValues = new Set(["venta", "alquiler"]);
const propertyTypeValues = new Set([
  "apartamento",
  "casa",
  "terreno",
  "villa",
  "bodega",
  "condominio",
  "edificio",
  "finca",
  "local comercial",
  "oficina",
]);
const orderValues = new Set(["recientes", "precio-asc", "precio-desc"]);
const priceValues = new Set([
  15000, 30000, 60000, 100000, 3000000, 5000000, 6000000, 10000000,
  20000000,
]);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-HN");
}

function allowedValue(
  value: string | string[] | undefined,
  allowed: Set<string>,
) {
  const normalized = normalizeText(firstValue(value) ?? "");
  return allowed.has(normalized) ? normalized : "";
}

function readFilters(searchParams: SearchParams) {
  const operation = allowedValue(searchParams.operacion, operationValues);
  const propertyType = allowedValue(searchParams.tipo, propertyTypeValues);
  const order =
    allowedValue(searchParams.orden, orderValues) || ("recientes" as const);
  const location = (firstValue(searchParams.ubicacion) ?? "").trim().slice(0, 80);
  const requestedPrice = Number(
    firstValue(searchParams.precioMax) ??
      firstValue(searchParams.precio) ??
      "",
  );
  const maximumPrice = priceValues.has(requestedPrice) ? requestedPrice : null;

  return {
    operation,
    propertyType,
    order,
    location,
    normalizedLocation: normalizeText(location),
    maximumPrice,
  };
}

function pageCopy(operation: string) {
  if (operation === "venta") {
    return {
      eyebrow: "Propiedades en venta",
      title: "Encuentra una propiedad para comprar en Honduras.",
      description:
        "Compara casas, apartamentos, villas y terrenos verificados para tomar una decisión de compra con confianza.",
    };
  }

  if (operation === "alquiler") {
    return {
      eyebrow: "Propiedades en alquiler",
      title: "Encuentra un lugar para alquilar en Honduras.",
      description:
        "Descubre opciones disponibles para mudarte, emprender o vivir una temporada, con precios mensuales claros.",
    };
  }

  return {
    eyebrow: "Descubre Honduras",
    title: "Propiedades para vivir, invertir y crecer.",
    description:
      "Explora propiedades en venta y alquiler con información clara y señales de confianza en cada publicación.",
  };
}

export async function generateMetadata({
  searchParams,
}: PropertiesPageProps): Promise<Metadata> {
  const filters = readFilters((await searchParams) ?? {});
  const title =
    filters.operation === "venta"
      ? "Propiedades en venta"
      : filters.operation === "alquiler"
        ? "Propiedades en alquiler"
        : "Propiedades en venta y alquiler";

  return {
    title,
    description:
      "Explora casas, apartamentos, villas y terrenos con información clara en Honduras.",
    alternates: { canonical: "/propiedades" },
  };
}

export default async function PropertiesPage({
  searchParams,
}: PropertiesPageProps) {
  const filters = readFilters((await searchParams) ?? {});
  const copy = pageCopy(filters.operation);
  const properties = await getPublicProperties();

  const filteredProperties = properties
    .filter((property) => property.status === "published")
    .filter(
      (property) =>
        !filters.operation ||
        normalizeText(property.operation) === filters.operation,
    )
    .filter(
      (property) =>
        !filters.propertyType ||
        normalizeText(property.propertyType) === filters.propertyType,
    )
    .filter((property) => {
      if (!filters.normalizedLocation) return true;

      return normalizeText(
        [
          property.city,
          property.department,
          property.address,
          property.title,
        ].join(" "),
      ).includes(filters.normalizedLocation);
    })
    .filter(
      (property) =>
        filters.maximumPrice === null ||
        property.priceOnRequest ||
        (property.currencyCode !== "USD" &&
          property.price !== null &&
          property.price <= filters.maximumPrice),
    )
    .sort((first, second) => {
      if (filters.order === "recientes") return 0;

      if (first.price === null || first.priceOnRequest) return 1;
      if (second.price === null || second.priceOnRequest) return -1;

      const firstCurrency = first.currencyCode ?? "HNL";
      const secondCurrency = second.currencyCode ?? "HNL";
      if (firstCurrency !== secondCurrency) {
        return firstCurrency === "HNL" ? -1 : 1;
      }

      if (filters.order === "precio-asc") return first.price - second.price;
      if (filters.order === "precio-desc") return second.price - first.price;
      return 0;
    });

  const priceOptions =
    filters.operation === "alquiler"
      ? [
          [15000, "L 15,000 / mes"],
          [30000, "L 30,000 / mes"],
          [60000, "L 60,000 / mes"],
          [100000, "L 100,000 / mes"],
        ]
      : [
          [3000000, "L 3 millones"],
          [5000000, "L 5 millones"],
          [6000000, "L 6 millones"],
          [10000000, "L 10 millones"],
          [20000000, "L 20 millones"],
        ];

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
              <span aria-current="page">
                {filters.operation === "venta"
                  ? "Comprar"
                  : filters.operation === "alquiler"
                    ? "Alquilar"
                    : "Propiedades"}
              </span>
            </nav>
            <div className="listing-hero__heading">
              <div>
                <p className="eyebrow">{copy.eyebrow}</p>
                <h1>{copy.title}</h1>
              </div>
              <p>{copy.description}</p>
            </div>
            <form className="filter-bar" action="/propiedades" method="get">
              <label>
                <span>Operación</span>
                <select name="operacion" defaultValue={filters.operation}>
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
                  defaultValue={filters.location}
                  placeholder="Ciudad, colonia o zona"
                />
              </label>
              <label>
                <span>Tipo</span>
                <select name="tipo" defaultValue={filters.propertyType}>
                  <option value="">Toda propiedad</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="terreno">Terreno</option>
                   <option value="villa">Villa</option>
                   <option value="condominio">Condominio</option>
                   <option value="local comercial">Local comercial</option>
                   <option value="oficina">Oficina</option>
                   <option value="bodega">Bodega</option>
                   <option value="finca">Finca</option>
                   <option value="edificio">Edificio</option>
                </select>
              </label>
              <label>
                <span>Precio máximo</span>
                <select
                  name="precioMax"
                  defaultValue={filters.maximumPrice?.toString() ?? ""}
                >
                  <option value="">Sin límite</option>
                  {priceOptions.map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <input type="hidden" name="orden" value={filters.order} />
              <button className="button button--primary" type="submit">
                Aplicar filtros
              </button>
            </form>
          </div>
        </section>
        <section className="section listing-results">
          <div className="container">
            <div className="results-toolbar">
              <p aria-live="polite">
                <strong>
                  {filteredProperties.length}{" "}
                  {filteredProperties.length === 1
                    ? "propiedad"
                    : "propiedades"}
                </strong>{" "}
                encontradas
              </p>
              <form action="/propiedades" method="get">
                {filters.operation ? (
                  <input
                    type="hidden"
                    name="operacion"
                    value={filters.operation}
                  />
                ) : null}
                {filters.location ? (
                  <input
                    type="hidden"
                    name="ubicacion"
                    value={filters.location}
                  />
                ) : null}
                {filters.propertyType ? (
                  <input
                    type="hidden"
                    name="tipo"
                    value={filters.propertyType}
                  />
                ) : null}
                {filters.maximumPrice !== null ? (
                  <input
                    type="hidden"
                    name="precioMax"
                    value={filters.maximumPrice}
                  />
                ) : null}
                <label>
                  <span>Ordenar por</span>
                  <select
                    name="orden"
                    defaultValue={filters.order}
                    aria-label="Ordenar propiedades"
                  >
                    <option value="recientes">Más recientes</option>
                    <option value="precio-asc">Menor precio</option>
                    <option value="precio-desc">Mayor precio</option>
                  </select>
                </label>
                <button className="button button--secondary" type="submit">
                  Ordenar
                </button>
              </form>
            </div>

            {filteredProperties.length ? (
              <div className="property-grid">
                {filteredProperties.map((property) => (
                  <PropertyCard property={property} key={property.slug} />
                ))}
              </div>
            ) : (
              <div className="empty-state" role="status">
                <p className="eyebrow">Sin coincidencias</p>
                <h2>No encontramos propiedades con esos filtros.</h2>
                <p>
                  Prueba otra ubicación, amplía el precio máximo o consulta
                  todas las propiedades disponibles.
                </p>
                <Link className="button button--primary" href="/propiedades">
                  Limpiar filtros
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
