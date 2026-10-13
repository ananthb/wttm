import { buildCatalog, catalogResponse } from "./me.js";

// Public: the `everyone` catalog, no identity. The site is not gated, so this
// is what a visitor sees before (or without) logging in.
export async function onRequestGet({ env }) {
  return catalogResponse(buildCatalog(env, ""));
}
