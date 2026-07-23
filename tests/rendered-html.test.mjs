import assert from "node:assert/strict";
import test from "node:test";

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
  assert.match(html, /Zelaya Raíces/);
  assert.match(html, /Bienvenidos a Zelaya Raíces/);
  assert.match(html, /Tu próximo hogar comienza con confianza/);
  assert.match(html, /name="precioMax"/);
  assert.match(html, /href="\/propiedades\?operacion=venta"/);
  assert.match(html, /href="\/propiedades\?operacion=alquiler"/);
  assert.match(html, /Historias de clientes Zelaya Raíces/);
  assert.match(html, /Conoce al equipo detrás de cada consulta/);
  assert.match(html, /Abrir WhatsApp para consultar a Zelaya Raíces/);
  assert.match(html, /href="\/propiedades"/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("renders property results", async () => {
  const response = await render("/propiedades");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Propiedades para vivir, invertir y crecer/);
  assert.match(html, /6(?:<!-- -->|\s)*propiedades/);
  assert.match(html, /Casa contemporánea en Lomas del Guijarro/);
  assert.match(html, /Villa caribeña a pasos de West Bay/);
  assert.match(html, /Apartamento amueblado en Lomas del Mayab/);
});

test("separates properties for sale and rent", async () => {
  const saleResponse = await render("/propiedades?operacion=venta");
  assert.equal(saleResponse.status, 200);
  const saleHtml = await saleResponse.text();
  assert.match(saleHtml, /propiedad para comprar en Honduras/);
  assert.match(saleHtml, /Casa contemporánea en Lomas del Guijarro/);
  assert.doesNotMatch(saleHtml, /Apartamento amueblado en Lomas del Mayab/);

  const rentResponse = await render(
    "/propiedades?operacion=alquiler&orden=precio-asc",
  );
  assert.equal(rentResponse.status, 200);
  const rentHtml = await rentResponse.text();
  assert.match(rentHtml, /lugar para alquilar en Honduras/);
  assert.match(rentHtml, /Apartamento amueblado en Lomas del Mayab/);
  assert.match(rentHtml, /Terreno comercial en Valle de Ángeles/);
  assert.match(rentHtml, /\/ mes/);
  assert.doesNotMatch(rentHtml, /Casa contemporánea en Lomas del Guijarro/);
  assert.ok(
    rentHtml.indexOf("Terreno comercial en Valle de Ángeles") <
      rentHtml.indexOf("Apartamento amueblado en Lomas del Mayab"),
  );
});

test("normalizes accents and preserves canonical property filters", async () => {
  const response = await render(
    "/propiedades?operacion=alquiler&ubicacion=Valle%20de%20Angeles&tipo=terreno&precio=30000",
  );
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /1(?:<!-- -->|\s)*propiedad/);
  assert.match(html, /Terreno comercial en Valle de Ángeles/);
  assert.match(html, /name="precioMax"/);
  assert.doesNotMatch(html, /Apartamento amueblado en Lomas del Mayab/);
});

test("renders a property detail with structured data", async () => {
  const response = await render(
    "/propiedades/casa-contemporanea-lomas-del-guijarro",
  );
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Casa contemporánea en Lomas del Guijarro/);
  assert.match(html, /Precio actualizado/);
  assert.match(html, /Resumen de confianza/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /SingleFamilyResidence/);
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
