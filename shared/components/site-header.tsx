import Link from "next/link";
import { Brand } from "./brand";

const navigation = [
  { label: "Propiedades", href: "/propiedades" },
  { label: "Comprar", href: "/propiedades?operacion=venta" },
  { label: "Alquilar", href: "/propiedades?operacion=alquiler" },
  { label: "Confianza", href: "/#confianza" },
  { label: "Nosotros", href: "/#asesores" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Navegación principal">
          {navigation.map((item) => (
            <Link href={item.href} key={item.label}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="text-link" href="/login">
            Iniciar sesión
          </Link>
          <Link
            className="button button--primary button--small"
            href="/panel/propiedades/nueva"
          >
            Publicar propiedad
          </Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Abrir menú de navegación">
            <span />
            <span />
            <span />
          </summary>
          <nav aria-label="Navegación móvil">
            {navigation.map((item) => (
              <Link href={item.href} key={item.label}>
                {item.label}
              </Link>
            ))}
            <Link href="/login">Iniciar sesión</Link>
            <Link
              className="button button--primary"
              href="/panel/propiedades/nueva"
            >
              Publicar propiedad
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
