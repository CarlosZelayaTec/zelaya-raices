import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Zelaya Raíces, página de inicio">
      <span className="brand__mark" aria-hidden="true">
        ZR
      </span>
      <span className="brand__wordmark">
        <strong>Zelaya</strong>
        <span>Raíces</span>
      </span>
    </Link>
  );
}
