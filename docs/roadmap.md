# Plan de producto y arquitectura

## Principios

- Una propiedad pertenece a una agencia o propietario, no únicamente al usuario
  que creó el anuncio.
- Uno o varios agentes pueden administrarla mediante asignaciones explícitas.
- La autorización se aplicará en servidor y mediante RLS; ocultar botones no es
  una medida de seguridad.
- Los cambios sensibles conservan historial y pueden activar una nueva revisión.
- El producto crecerá como monolito modular hasta que existan razones operativas
  medibles para separar servicios.

## Módulos de dominio

1. `properties`: anuncios, características, multimedia, disponibilidad y cambios.
2. `users`: perfiles, roles, agentes, propietarios y agencias.
3. `search`: filtros, geografía PostGIS, orden y resultados en lista/mapa.
4. `messaging`: consultas, conversaciones, contactos y notificaciones.
5. `reviews`: reseñas, moderación, respuestas y reputación.
6. `payments`: planes, suscripciones, destacados, cobros y conciliación.
7. `admin`: moderación, verificaciones, reportes y trazabilidad.
8. `content`: páginas editoriales, ayuda, SEO y configuración pública.

## Fases

### 1. Descubrimiento público — implementada

- Inicio responsive con identidad visual.
- Listado y detalle de propiedades con datos demostrativos.
- Señales de confianza visibles y contenido local en lempiras.
- Metadatos, social card, sitemap, robots y datos estructurados.

### 2. Búsqueda y mapa

- Filtros controlados por URL y paginación.
- Vista lista/mapa accesible; el mapa nunca será obligatorio.
- Geocodificación y búsquedas por radio con PostGIS.
- Estados de carga, vacío, error y ubicación aproximada.

### 3. Identidad, agencias y permisos

- Supabase Auth con sesiones seguras en servidor.
- Roles: `super_admin`, `admin`, `moderator`, `agency_owner`, `agent`,
  `property_owner` y `customer`; `guest` representa a quien no inició sesión.
- Membresías de agencia y asignaciones de agentes a propiedades.
- RLS por recurso y acción, sin basarse en metadatos editables por el usuario.

### 4. Publicación moderada

- Flujo `draft → submitted → approved → published`.
- Alternativas `changes_requested`, `rejected` y `archived`.
- Fotografías y videos en Storage, límites de formato y procesamiento seguro.
- Cambios de precio, ubicación, titularidad o multimedia sujetos a nueva revisión.

### 5. Consultas y reputación

- Bandeja de consultas, contactos y seguimiento del agente.
- Reportes con categorías, evidencia y cola de moderación.
- Reseñas tras interacciones elegibles, con respuesta y apelación.
- Estadísticas de visitas, contactos y rendimiento del anuncio.

### 6. Monetización y administración

- Planes, suscripciones, anuncios destacados y comprobantes.
- Panel administrativo para usuarios, agencias, propiedades, categorías,
  contenido, verificaciones, reportes, reseñas y pagos.
- Registro auditable de decisiones administrativas y cambios críticos.

## Regla de revisión inicial

1. El anunciante crea un borrador.
2. Completa datos, ubicación y multimedia.
3. Envía el anuncio a revisión.
4. Zelaya Raíces aprueba, solicita cambios o rechaza.
5. Solo un anuncio aprobado puede publicarse.
6. Los cambios importantes crean una nueva versión pendiente sin perder el
   historial publicado.
