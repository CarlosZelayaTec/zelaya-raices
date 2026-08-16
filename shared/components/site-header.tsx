import Link from "next/link";

import { signOutAction } from "@/shared/lib/auth/actions";
import { getAuthIdentity } from "@/shared/lib/auth/context";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { Brand } from "./brand";

const navigation = [
  { label: "Propiedades", href: "/propiedades" },
  { label: "Comprar", href: "/propiedades?operacion=venta" },
  { label: "Alquilar", href: "/propiedades?operacion=alquiler" },
  { label: "Confianza", href: "/#confianza" },
  { label: "Nosotros", href: "/#fundador" },
];

type HeaderAccount = {
  alias: string | null;
  label: string;
};

async function getHeaderAccount(): Promise<HeaderAccount | null> {
  const identity = await getAuthIdentity().catch(() => null);

  if (!identity || identity.isAnonymous) return null;

  let displayName: string | null = null;
  let slug: string | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, slug")
      .eq("id", identity.id)
      .maybeSingle();

    displayName = data?.display_name?.trim() || null;
    slug = data?.slug?.trim() || null;
  } catch {
    // The verified session is still useful when the optional profile lookup
    // is temporarily unavailable.
  }

  const alias = slug ? `@${slug}` : null;

  return {
    alias: displayName ? alias : null,
    label: displayName || alias || identity.email || "Mi cuenta",
  };
}

function AccountIdentity({ account }: { account: HeaderAccount }) {
  return (
    <span className="header-account" title={account.label}>
      <span className="header-account__silhouette" aria-hidden="true" />
      <span className="header-account__copy">
        <strong>{account.label}</strong>
        {account.alias ? <small>{account.alias}</small> : null}
      </span>
    </span>
  );
}

export async function SiteHeader() {
  const account = await getHeaderAccount();

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
          {account ? (
            <>
              <AccountIdentity account={account} />
              <Link className="header-panel-link" href="/panel">
                Mi panel
              </Link>
              <form action={signOutAction} className="header-signout-form">
                <input name="next" type="hidden" value="/" />
                <button className="header-signout" type="submit">
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link className="text-link" href="/login">
              Iniciar sesión
            </Link>
          )}
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
            {account ? (
              <>
                <div className="mobile-menu__account">
                  <AccountIdentity account={account} />
                </div>
                <Link href="/panel">Mi panel</Link>
              </>
            ) : (
              <Link href="/login">Iniciar sesión</Link>
            )}
            <Link
              className="button button--primary"
              href="/panel/propiedades/nueva"
            >
              Publicar propiedad
            </Link>
            {account ? (
              <form
                action={signOutAction}
                className="mobile-menu__signout-form"
              >
                <input name="next" type="hidden" value="/" />
                <button type="submit">Cerrar sesión</button>
              </form>
            ) : null}
          </nav>
        </details>
      </div>
    </header>
  );
}
