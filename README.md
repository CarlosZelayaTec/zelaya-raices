# Zelaya Raíces

Plataforma inmobiliaria de confianza para Honduras. La experiencia pública está
orientada a mostrar información verificable: propiedad y anunciante validados,
ubicación confirmada, precio actualizado, historial de cambios y reportes.

## Stack de la plataforma

- Next.js + TypeScript
- PostgreSQL + PostGIS en Supabase (fase de datos)
- Supabase Auth y Storage (fase de acceso y archivos)
- Mapbox (fase de búsqueda geográfica)
- Monolito modular antes de separar servicios

## Primera entrega frontend

- `/` — inicio, búsqueda, confianza, mercados y flujo para agentes
- `/propiedades` — resultados y filtros visuales
- `/propiedades/[slug]` — detalle, galería y resumen de verificación
- SEO base: metadatos, Open Graph, `robots.txt`, `sitemap.xml` y JSON-LD
- Diseño responsive desde 320 px y navegación accesible por teclado

Los anuncios actuales son datos demostrativos. La insignia de verificación solo
deberá mostrarse en producción cuando exista una revisión real aprobada.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm test
```

La lógica de dominio vive en `modules/`; `app/` se limita a componer rutas y
`shared/` contiene componentes y utilidades reutilizables.

Consulta [el plan de producto](docs/roadmap.md) para las siguientes fases.
