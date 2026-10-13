import "./scene.js";

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

let app = null;
const pending = [];

function forward(msg) {
  const scene = document.querySelector("wttm-scene");
  if (scene && scene.send) scene.send(msg);
  else {
    pending.push(msg);
    if (pending.length > 50) pending.shift();
  }
}

// The scene bubbles a CustomEvent on itself; Elm port messages come back down
// through toScene. Wiring happens before init so the port subscribers exist.
document.addEventListener("wttm", (event) => {
  if (app) app.ports.fromScene.send(event.detail);
});

const params = new URLSearchParams(location.search);

app = Elm.Main.init({
  node: document.getElementById("app"),
  flags: {
    flat: params.has("flat"),
    webgl: hasWebGL(),
    scene: params.get("scene") || null,
  },
});

app.ports.toScene.subscribe(forward);
app.ports.openUrl.subscribe((url) =>
  window.open(url, "_blank", "noopener,noreferrer")
);

const flush = () => {
  const scene = document.querySelector("wttm-scene");
  if (scene && scene.send && pending.length) {
    for (const msg of pending.splice(0)) scene.send(msg);
  }
};
new MutationObserver(flush).observe(document.getElementById("app"), {
  childList: true,
  subtree: true,
});
