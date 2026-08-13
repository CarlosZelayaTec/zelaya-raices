import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const REAL_LISTING_TITLE = /Terreno en venta - Residencial Villas del pinar/i;
const REAL_LISTING_PATH =
  "/propiedades/terreno-en-venta-residencial-villas-del-pinar-eb7b1ce3";
const PROPERTY_TYPE_FILTER_VALUES = [
  "casa",
  "apartamento",
  "terreno",
  "villa",
  "condominio",
  "local comercial",
  "oficina",
  "bodega",
  "finca",
  "edificio",
];

test("keeps the location search from submitting the publication wizard", async () => {
  const pickerSource = await readFile(
    new URL("../features/listings/location-map-picker.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(
    pickerSource,
    /<form[^>]+className=\{styles\.search\}/,
  );
  assert.match(pickerSource, /className=\{styles\.search\} role="search"/);
  assert.match(pickerSource, /onClick=\{\(\) => void handleSearch\(\)\}/);
  assert.match(pickerSource, /type="button"/);
  assert.match(pickerSource, /import\("leaflet"\)/);
});

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Zelaya Raíces public homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /lang="es-HN"/i);
  const headEnd = html.indexOf("</head>");
  const bodyStart = html.indexOf("<body");
  const bodyOpeningEnd = html.indexOf(">", bodyStart);
  const gtmScript = html.indexOf(
    "googletagmanager.com/gtm.js?id='+i+dl",
  );
  const gtmNoScript = html.indexOf(
    '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K77TWH4Z"',
  );
  assert.ok(gtmScript > 0 && gtmScript < headEnd);
  assert.ok(gtmNoScript > bodyOpeningEnd);
  assert.match(html.slice(bodyOpeningEnd + 1, gtmNoScript), /^\s*$/);
  assert.match(html, /Zelaya Raíces/);
  assert.match(html, /Bienvenidos a Zelaya Raíces/);
  assert.match(html, /Tu próximo hogar comienza con confianza/);
  assert.match(html, /brand__symbol/);
  assert.match(html, /brand--lockup brand--light/);
  assert.match(html, /zelaya-favicon\.png/);
  assert.match(html, /name="precioMax"/);
  for (const propertyType of PROPERTY_TYPE_FILTER_VALUES) {
    assert.match(html, new RegExp(`value="${propertyType}"`));
  }
  assert.match(html, /href="\/propiedades\?operacion=venta"/);
  assert.match(html, /href="\/propiedades\?operacion=alquiler"/);
  assert.match(html, /Historias de clientes Zelaya Raíces/);
  assert.match(html, /Conoce al equipo detrás de cada consulta/);
  assert.match(html, /Abrir WhatsApp para consultar a Zelaya Raíces/);
  assert.match(html, /viewBox="0 0 24 24"/);
  assert.match(html, /href="\/propiedades"/);
  assert.match(html, REAL_LISTING_TITLE);
  for (const propertyType of PROPERTY_TYPE_FILTER_VALUES) {
    assert.match(html, new RegExp(`value="${propertyType}"`));
  }
  assert.doesNotMatch(html, /propiedades de demostración/i);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("renders only approved real property results", async () => {
  const response = await render("/propiedades");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Propiedades para vivir, invertir y crecer/);
  const countMatch = html.match(/(\d+)(?:<!-- -->|\s)*propiedad(?:es)?/);
  assert.ok(countMatch, "the rendered catalog should expose its result count");
  assert.ok(Number(countMatch[1]) >= 1, "the approved listing should be public");
  assert.match(html, REAL_LISTING_TITLE);
  assert.doesNotMatch(html, /Casa contemporánea en Lomas del Guijarro/);
});

test("separates properties for sale and rent", async () => {
  const saleResponse = await render("/propiedades?operacion=venta");
  assert.equal(saleResponse.status, 200);
  const saleHtml = await saleResponse.text();
  assert.match(saleHtml, /propiedad para comprar en Honduras/);
  assert.match(saleHtml, REAL_LISTING_TITLE);

  const rentResponse = await render(
    "/propiedades?operacion=alquiler&orden=precio-asc",
  );
  assert.equal(rentResponse.status, 200);
  const rentHtml = await rentResponse.text();
  assert.match(rentHtml, /lugar para alquilar en Honduras/);
  assert.match(rentHtml, /No encontramos propiedades con esos filtros/);
  assert.doesNotMatch(rentHtml, REAL_LISTING_TITLE);
});

test("normalizes location filters for the approved listing", async () => {
  const response = await render(
    "/propiedades?operacion=venta&ubicacion=Villas%20del%20Pinar&tipo=terreno",
  );
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /1(?:<!-- -->|\s)*propiedad/);
  assert.match(html, REAL_LISTING_TITLE);
  assert.match(html, /name="precioMax"/);
});

test("renders the approved property with safe structured data", async () => {
  const response = await render(REAL_LISTING_PATH);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, REAL_LISTING_TITLE);
  assert.match(html, /Precio actualizado/);
  assert.match(html, /Resumen de confianza/);
  assert.match(html, /id="contactar"/);
  assert.match(html, /Vendedor (?:verificado|registrado)/);
  assert.match(html, /Contactar por WhatsApp/);
  assert.match(html, /href="https:\/\/wa\.me\//);
  assert.doesNotMatch(html, /href="tel:/);
  assert.doesNotMatch(html, /Llamar al/);
  assert.match(html, /C.mo llegar/);
  assert.match(html, /Abrir en mapas/);
  assert.match(html, /no se guarda/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /Landform/);
  assert.doesNotMatch(html, /Información demostrativa/i);
});

test("renders ordered video media for an approved Supabase publication", async () => {
  const response = await render(REAL_LISTING_PATH);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, REAL_LISTING_TITLE);
  assert.match(html, /<video\b/i);
  assert.match(html, /registro público aprobado/i);
});

test("renders Supabase login without caching private responses", async () => {
  const response = await render("/login");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/i);

  const html = await response.text();
  assert.match(html, /Inicia sesión|Iniciar sesión/);
  assert.match(html, /Crear cuenta/);
  assert.match(html, /Correo electrónico/);
});

test("redirects anonymous users away from protected panels", async () => {
  const panelResponse = await render("/panel");
  assert.equal(panelResponse.status, 307);
  assert.equal(
    panelResponse.headers.get("location"),
    "http://localhost/login?next=%2Fpanel",
  );

  const adminResponse = await render("/admin");
  assert.equal(adminResponse.status, 307);
  assert.equal(
    adminResponse.headers.get("location"),
    "http://localhost/login?next=%2Fadmin",
  );
});
