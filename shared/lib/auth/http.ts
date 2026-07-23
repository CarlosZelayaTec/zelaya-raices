type ResponseWithHeaders = {
  headers: Headers;
};

export const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
} as const;

export function applyResponseHeaders(
  response: ResponseWithHeaders,
  headers: Record<string, string>,
) {
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
}

export function applyPrivateNoStore<T extends ResponseWithHeaders>(
  response: T,
): T {
  applyResponseHeaders(response, PRIVATE_NO_STORE_HEADERS);
  return response;
}
