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

The site is public. `/api/me` returns the `everyone` catalog to a visitor — the
public apps — and the personal one when the request carries a `CF_Authorization`
cookie the Function can verify against the Access team certs
(`WTTM_TEAM_DOMAIN`). Anything beyond the public apps is tagged `members` and
needs that cookie; logging in happens at `/login`, the one Access-protected path.

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

After the red pill you walk a continuous world with one scene per group:

| group | scene | theme id |
|---|---|---|
| Apps | The Street | `street` |
| Media | The Lobby | `lobby` |
| Websites | The Construct | `construct` |
| Platform | The Nebuchadnezzar | `ship` |
| Home | The Oracle's Apartment | `oracle` |
| Build | The Keymaker's Room | `keymaker` |

The mapping is `CATEGORY_THEME` in `src/three/scenes.js`; a group with no entry
cycles the themes. Scenes sit end to end along the corridor and each back wall
has a doorway, so the groups are reached on foot.

Each scene is a module in `src/three/scenes.js` with its own environment,
lighting and a signature interactive prop; `buildWorld` offsets it to its slot
and lays that group's cards inside it. Add one by exporting a builder and
listing it in `THEME_ORDER`.

## Controls

The opening zooms in over Neo's shoulder to the desk; click the red pill. Once
inside it is first-person: **W A S D** or the **arrow keys** to move, **mouse**
to look (click once to capture the pointer), **click** to open what the
crosshair is on, **Esc** to release. Looking at a card expands its description;
looking away closes it. A mini-map down the right edge shows the groups as
markers; click one to teleport there. Walls and large objects block the walker,
and the corridor loops: past the last scene you come back in at the first.
After 30s still, the movement keys are highlighted.

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
