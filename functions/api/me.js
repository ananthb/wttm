import defaultCatalog from "../catalog.json";

// The public catalog is served to everyone; the personal one is only reachable
// through Access (functions/api/me.js). Access sets
// Cf-Access-Authenticated-User-Email and Cloudflare strips it from client
// requests, so a client cannot spoof it. WTTM_CATALOG and WTTM_ACCESS are
// injected by the platform and never live in this repository.
const DEFAULT_AUDIENCE = "everyone";

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

// Which scene a person lands in. byAudience is an ordered list (owner first)
// rather than a map, because Terraform sorts object keys and the priority would
// be lost; a person in several groups gets the first matching entry.
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

// Access-gated. The header is present only for an authenticated user.
export async function onRequestGet({ request, env }) {
  const email = (
    request.headers.get("Cf-Access-Authenticated-User-Email") ?? ""
  ).toLowerCase();
  return catalogResponse(buildCatalog(env, email));
}
