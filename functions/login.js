// A path Access protects so a browser can start the login flow. Access runs
// first, then this redirects back to the app with the session cookie set.
export function onRequestGet({ request }) {
  return Response.redirect(new URL("/", request.url).toString(), 302);
}
