// Access protects this path, so Access hands the origin the verified JWT. The
// Access cookie itself is scoped to /login, so /api/me never sees it; re-issue
// the JWT as a first-party cookie on the whole host instead.
export function onRequestGet({ request }) {
  const cookie = request.headers.get("Cookie") ?? "";
  const jwt =
    request.headers.get("Cf-Access-Jwt-Assertion") ??
    ((cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/) ?? [])[1] || null);
  const headers = new Headers({ location: new URL("/", request.url).toString() });
  if (jwt) {
    headers.append(
      "set-cookie",
      `WTTM_SESSION=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`
    );
  }
  return new Response(null, { status: 302, headers });
}
