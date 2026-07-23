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
  assert.match(html, /Tu próximo hogar/);
  assert.match(html, /Propiedades confiables en Honduras/);
  assert.match(html, /Más que un anuncio/);
  assert.match(html, /href="\/propiedades"/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("renders property results", async () => {
  const response = await render("/propiedades");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Propiedades para vivir, invertir y crecer/);
  assert.match(html, /3(?:<!-- -->)? propiedades/);
  assert.match(html, /Casa contemporánea en Lomas del Guijarro/);
  assert.match(html, /Villa caribeña a pasos de West Bay/);
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
