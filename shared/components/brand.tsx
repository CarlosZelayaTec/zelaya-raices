import Link from "next/link";

type BrandProps = {
  tone?: "dark" | "light";
  variant?: "compact" | "lockup";
};

type BrandMarkProps = {
  className?: string;
  tone?: "dark" | "light";
};

export function Brand({
  tone = "dark",
  variant = "compact",
}: BrandProps = {}) {
  return (
    <Link
      className={`brand brand--${variant} brand--${tone}`}
      href="/"
      aria-label="Zelaya Raíces, página de inicio"
    >
      {variant === "lockup" ? (
        <span className="brand__lockup" aria-hidden="true" />
      ) : (
        <>
          <span className="brand__symbol" aria-hidden="true" />
          <span className="brand__wordmark" aria-hidden="true">
            <strong>Zelaya</strong>
            <span>Inmobiliaria</span>
          </span>
        </>
      )}
    </Link>
  );
}

export function BrandMark({
  className = "",
  tone = "dark",
}: BrandMarkProps) {
  return (
    <span
      className={`brand-mark brand-mark--${tone} ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
