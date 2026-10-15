// Drop the bridge cookie before Access ends the session, or the app would keep
// treating the visitor as signed in.
export function onRequestGet() {
  const headers = new Headers({ location: "/cdn-cgi/access/logout" });
  headers.append("set-cookie", "WTTM_SESSION=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return new Response(null, { status: 302, headers });
}
