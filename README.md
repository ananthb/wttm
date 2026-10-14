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
| `src/Main.elm` | The single-page app: runs the pill/enter/inside state machine, drives the scene over `toScene`, opens links on `openUrl`, and handles simple mode |
| `src/three/scenes.js` | The scene library: six environments, each with its own look and a signature interactive prop |
| `src/scene.js` | The `wttm-scene` custom element: the intro, pills, floating app cards, camera, raycasting and input |
| `src/app.js` | Glue: loads the catalog, defines the element, boots Elm, connects the ports |
| `functions/api/me.js` | Pages Function: returns the catalog, personal when the Access cookie verifies |
| `functions/login.js` | The Access-protected path that starts the login flow |

## Who sees what

The site is public. `/api/me` returns the `everyone` catalog to a visitor, and
the personal one when the request carries a `CF_Authorization` cookie the
Function can verify against the Access team certs (`WTTM_TEAM_DOMAIN`). Logging
in happens at `/login`, the one Access-protected path.

The personal side is `WTTM_ACCESS` (email → audiences) and `WTTM_CATALOG` (the
apps, each tagged with the audiences that may see it), injected by the platform
and never committed here. Both are absent in a clone, so a visitor gets the
example catalog in `functions/catalog.json`. No emails and no infra hostnames
live in this repository.

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

On a touch device: **drag** to look, **tap** to open, the on-screen **pad** to
move, and **enable tilt** to look with the gyroscope. A **LOG IN** panel sits
dead-ahead until you sign in.

## Simple view

Not everyone wants a first-person scene. `?flat=1`, a browser without WebGL, or
the **Simple view** button shows an accessible, keyboard-navigable board of the
same links: groups side by side while there is room and one below the other when
there is not, cards that expand to show their description, and each app's own
favicon (overridable with a `favicon` on the catalog entry). **Enter the Matrix**
switches back, and the choice is remembered on the device.

The simple view's background is a Matrix rain effect. A site sets the default
with `matrixRain` in the catalog; each device can turn it off in the settings
panel, and a visitor whose system asks for reduced motion never sees it.

## License

AGPL-3.0-only. See [LICENSE](LICENSE).
