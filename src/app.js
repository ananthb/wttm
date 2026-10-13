import "./scene.js";

let app = null;
const pending = [];

function forward(msg) {
  const scene = document.querySelector("wttm-scene");
  if (scene && scene.send) scene.send(msg);
  else pending.push(msg);
}

// The scene bubbles a CustomEvent on itself; Elm port messages come back down
// through toScene. The two are wired after Elm.init so the port subscribers
// exist first.
document.addEventListener("wttm", (event) => {
  if (app) app.ports.fromScene.send(event.detail);
});

app = Elm.Main.init({ node: document.getElementById("app") });
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
