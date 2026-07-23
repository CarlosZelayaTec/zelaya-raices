import { headers } from "next/headers";

const CANONICAL_ORIGIN = "https://zelayaraices.com";
const MAX_REDIRECT_LENGTH = 2048;
const PRODUCTION_HOSTS = new Set([
  "zelayaraices.com",
  "www.zelayaraices.com",
]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function firstHeaderValue(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim();
  return first || null;
}

function trustedOrigin(candidate: string | null): string | null {
  if (!candidate) return null;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  if (
    url.protocol === "https:" &&
    PRODUCTION_HOSTS.has(url.hostname.toLowerCase()) &&
    !url.port &&
    !url.username &&
    !url.password
  ) {
    return url.origin;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (url.protocol === "http:" || url.protocol === "https:") &&
    LOCAL_HOSTS.has(url.hostname.toLowerCase()) &&
    !url.username &&
    !url.password
  ) {
    return url.origin;
  }

  return null;
}

function originFromHeaders(requestHeaders: Headers): string | null {
  const origin = trustedOrigin(firstHeaderValue(requestHeaders.get("origin")));
  if (origin) return origin;

  const forwardedHost = firstHeaderValue(
    requestHeaders.get("x-forwarded-host"),
  );
  const host = forwardedHost ?? firstHeaderValue(requestHeaders.get("host"));
  const forwardedProto =
    firstHeaderValue(requestHeaders.get("x-forwarded-proto")) ?? "https";

  return host ? trustedOrigin(`${forwardedProto}://${host}`) : null;
}

export async function getTrustedRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  return originFromHeaders(requestHeaders) ?? CANONICAL_ORIGIN;
}

export function getTrustedOriginFromRequest(request: Request): string {
  const headerOrigin = originFromHeaders(request.headers);
  if (headerOrigin) return headerOrigin;

  try {
    return trustedOrigin(new URL(request.url).origin) ?? CANONICAL_ORIGIN;
  } catch {
    return CANONICAL_ORIGIN;
  }
}

export function safeRelativePath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (
    !value ||
    value.length > MAX_REDIRECT_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(value, CANONICAL_ORIGIN);
  } catch {
    return fallback;
  }

  if (url.origin !== CANONICAL_ORIGIN) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}

export function safeAfterSignInPath(
  value: string | null | undefined,
  fallback = "/panel",
): string {
  const destination = safeRelativePath(value, fallback);
  const pathname = new URL(destination, CANONICAL_ORIGIN).pathname;

  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    return fallback;
  }

  return destination;
}

export function safeSignedOutPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  const destination = safeRelativePath(value, fallback);
  const pathname = new URL(destination, CANONICAL_ORIGIN).pathname;

  if (
    pathname === "/actualizar-contrasena" ||
    pathname.startsWith("/activar-administracion") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/panel")
  ) {
    return fallback;
  }

  return destination;
}

export function buildLoginPath(returnTo: string): string {
  const safeReturnTo = safeAfterSignInPath(returnTo);
  return `/login?next=${encodeURIComponent(safeReturnTo)}`;
}

export function buildAuthCallbackUrl(
  origin: string,
  destination: string,
): string {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set(
    "next",
    safeAfterSignInPath(destination, "/panel"),
  );
  return callback.toString();
}
