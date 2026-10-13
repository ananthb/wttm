import defaultCatalog from "../catalog.json";

// Who may see what. The map is injected by the platform as WTTM_ACCESS
// (email -> audiences); the catalog as WTTM_CATALOG. Both are empty in a
// clone, so a public visitor gets the committed example catalog.
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

export async function onRequestGet({ request, env }) {
  const email = (
    request.headers.get("Cf-Access-Authenticated-User-Email") ?? ""
  ).toLowerCase();

  const access = parse(env.WTTM_ACCESS, {});
  const catalog =
    parse(env.WTTM_CATALOG, null) ?? defaultCatalog;

  const body = {
    ...filter(catalog, audiencesFor(email, access)),
    email: email || null,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, max-age=0, no-store",
    },
  });
}
