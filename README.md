# Welcome To The Matrix

A first-person landing page. You look at a terminal in the dark, choose the red
pill, and the room fills with the things you can reach — apps, media and
websites up close, then the platform and home automation further back, then the
things you build with, furthest of all.

Elm owns the page and the state machine. A `<wttm-scene>` web component owns the
3D, written against [Three.js](https://threejs.org/). They talk over two ports.

## How it works

| Layer | What it does |
|---|---|
| `src/Main.elm` | The single-page app: fetches the catalog, runs the pill/enter/inside state machine, drives the scene over the `toScene` port, opens links on `openUrl` |
| `src/scene.js` | The `wttm-scene` custom element: room, matrix rain, pills, the floating app cards, camera and raycasting |
| `src/app.js` | Glue: defines the element, boots Elm, connects the ports |
| `functions/api/me.js` | Pages Function that returns the signed-in user's catalog |

## Who sees what

Cloudflare Access puts `Cf-Access-Authenticated-User-Email` on every request.
The function reads it, looks the email up in `WTTM_ACCESS` (email → audiences,
injected by the platform, never committed here), and returns the apps whose
audience the user is in. `WTTM_CATALOG` holds the real catalog. Both are absent
in a clone, so a visitor gets the example catalog in `functions/catalog.json`.

No emails and no infra hostnames ever live in this repository.

## Build

```
npm install
npm run build      # elm make + esbuild -> dist/
npm run dev        # build, then wrangler pages dev dist
```

Cloudflare Pages runs `npm run build` and serves `dist/` with `functions/`.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
