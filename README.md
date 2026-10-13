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

## Scenes

After the red pill you land in one of six scenes, chosen per audience by the
catalog's `scenes.byAudience` map (in the platform) and overridable with
`?scene=<id>`:

| id | Scene |
|---|---|
| `ship` | The Nebuchadnezzar |
| `construct` | The Construct |
| `keymaker` | The Keymaker's Room |
| `oracle` | The Oracle's Apartment |
| `lobby` | The Lobby |
| `downtown` | The Street |

Each scene is a module in `src/three/scenes.js` with its own environment,
lighting and a signature interactive prop; the catalog entries are laid out by
a shared helper so every entry is present and reachable. Add one by exporting a
builder and listing it in `SCENE_ORDER`.

## Controls

The opening zooms in over Neo's shoulder to the desk; click the red pill. Once
inside it is first-person: **W A S D** or the **arrow keys** to move, **mouse**
to look (click once to capture the pointer), **click** to open what the
crosshair is on, **Esc** to release. After 30s still, the movement keys are
highlighted.

## Simple view

Not everyone wants a first-person scene. `?flat=1`, a browser without WebGL, or
the **Simple view** button shows an accessible, keyboard-navigable list of the
same links. **Enter the Matrix** switches back.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
