import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  return (
    <footer className="site-footer" id="footer">
      <div className="container site-footer__grid">
        <div className="site-footer__intro">
          <Brand />
          <p>
            Una forma más clara y confiable de descubrir propiedades en
            Honduras.
          </p>
        </div>
        <div>
          <h2>Explora</h2>
          <Link href="/propiedades">Propiedades</Link>
          <Link href="/propiedades?operacion=venta">Comprar</Link>
          <Link href="/propiedades?operacion=alquiler">Alquilar</Link>
        </div>
        <div>
          <h2>Zelaya Raíces</h2>
          <Link href="/#confianza">Cómo verificamos</Link>
          <Link href="/#historias">Historias de clientes</Link>
          <Link href="/#asesores">Nuestros asesores</Link>
          <Link href="/#para-agentes">Para agentes</Link>
          <a href="mailto:hola@zelayaraices.com">Contáctanos</a>
        </div>
        <div>
          <h2>Contacto</h2>
          <a href="mailto:hola@zelayaraices.com">hola@zelayaraices.com</a>
          <p>Honduras</p>
        </div>
      </div>
      <div className="container site-footer__bottom">
        <span>© 2026 Zelaya Raíces</span>
        <span>Privacidad · Términos</span>
      </div>
    </footer>
  );
}
