import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const out = "dist";
const staticFiles = ["index.html", "styles.css", "favicon.svg"];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// elm.js is loaded as a classic script before app.js; app.js relies on the
// global `Elm` it defines, so the two cannot be bundled together.
execFileSync("elm", ["make", "src/Main.elm", "--optimize", "--output", `${out}/elm.js`], {
  stdio: "inherit",
});

await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: `${out}/app.js`,
  logLevel: "info",
});

await Promise.all(staticFiles.map((f) => cp(`public/${f}`, `${out}/${f}`)));

// The example catalog is the Function's default and, served statically, the
// client's fallback when /api/me is unreachable.
await cp("functions/catalog.json", `${out}/catalog.json`);
