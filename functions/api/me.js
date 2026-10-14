import defaultCatalog from "../catalog.json";

// The catalog is public. A visitor may also log in (Access, at /login); the
// Function then verifies the Access JWT from the CF_Authorization cookie itself,
// so /api/me needs no gate and the whole site stays open. WTTM_CATALOG and
// WTTM_ACCESS are injected by the platform and never live in this repository.
const DEFAULT_AUDIENCE = "everyone";
const CERTS_TTL = 60 * 60 * 1000;
const jwksCache = { at: 0, keys: [] };

function parse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function audiencesFor(email, access) {
  if (email && access[email]) return access[email];
  return [DEFAULT_AUDIENCE];
}

function visible(entry, fallback, audiences) {
  const list = entry.audience ?? fallback;
  return list.some((a) => audiences.includes(a));
}

function filter(catalog, audiences) {
  return {
    title: catalog.title,
    subtitle: catalog.subtitle,
    categories: catalog.categories
      .map((category) => {
        const categoryAudience = category.audience ?? [DEFAULT_AUDIENCE];
        return {
          id: category.id,
          label: category.label,
          icon: category.icon ?? "",
          tier: category.tier ?? 0,
          apps: (category.apps ?? []).filter((app) =>
            visible(app, categoryAudience, audiences)
          ),
        };
      })
      .filter((category) => category.apps.length > 0),
  };
}

// byAudience is an ordered list (owner first); Terraform sorts object keys, so a
// map would lose the priority. A person in several groups gets the first match.
function resolveScene(catalog, audiences) {
  const scenes = catalog.scenes ?? {};
  const list = Array.isArray(scenes.byAudience) ? scenes.byAudience : [];
  const match = list.find((entry) => audiences.includes(entry.audience));
  return match ? match.scene : scenes.default ?? null;
}

export function buildCatalog(env, email) {
  const access = parse(env.WTTM_ACCESS, {});
  const catalog = parse(env.WTTM_CATALOG, null) ?? defaultCatalog;
  const audiences = audiencesFor(email, access);
  return {
    ...filter(catalog, audiences),
    scene: resolveScene(catalog, audiences),
    defaultView: catalog.defaultView === "flat" ? "flat" : "three",
    matrixRain: catalog.matrixRain !== false,
    blurb: catalog.blurb ?? "",
    email: email || null,
  };
}

export function catalogResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, max-age=0, no-store",
    },
  });
}

function b64urlToBytes(value) {
  let s = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  s += "=".repeat(pad);
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToString(value) {
  return new TextDecoder().decode(b64urlToBytes(value));
}

async function keysFor(team) {
  if (jwksCache.keys.length && Date.now() - jwksCache.at < CERTS_TTL) {
    return jwksCache.keys;
  }
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const data = await res.json();
  const keys = data.keys ?? [];
  jwksCache.at = Date.now();
  jwksCache.keys = keys;
  return keys;
}

// Verifies an Access JWT against the team's certs and the application audience.
export async function verifyToken(token, team, aud) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(b64urlToString(h));
    payload = JSON.parse(b64urlToString(p));
  } catch {
    return null;
  }

  let keys;
  try {
    keys = await keysFor(team);
  } catch {
    return null;
  }
  const jwk = keys.find((k) => k.kid === header.kid) ?? keys[0];
  if (!jwk) return null;

  let key;
  try {
    key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch {
    return null;
  }

  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(sig),
    new TextEncoder().encode(`${h}.${p}`)
  );
  if (!ok) return null;

  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (aud && !auds.includes(aud)) return null;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

async function emailFrom(request, env) {
  if (!env.WTTM_TEAM_DOMAIN) return "";
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
  if (!match) return "";
  try {
    const payload = await verifyToken(match[1], env.WTTM_TEAM_DOMAIN, env.WTTM_ACCESS_AUD);
    if (payload && payload.email) return String(payload.email).toLowerCase();
  } catch {
    /* treat as anonymous */
  }
  return "";
}

export async function onRequestGet({ request, env }) {
  return catalogResponse(buildCatalog(env, await emailFrom(request, env)));
}
