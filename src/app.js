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

const params = new URLSearchParams(location.search);
const touch = "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;

// URL override, then the device's remembered choice, then the server default.
function resolveFlat(serverDefault) {
  if (params.get("flat") === "1") return true;
  if (params.get("flat") === "0") return false;
  try {
    const stored = localStorage.getItem("wttm.mode");
    if (stored === "flat") return true;
    if (stored === "three") return false;
  } catch {
    /* ignore */
  }
  return serverDefault === "flat";
}

let app = null;
const pending = [];

function sceneEl() {
  return document.querySelector("wttm-scene");
}

function forward(msg) {
  const scene = sceneEl();
  if (scene && scene.send) scene.send(msg);
  else {
    pending.push(msg);
    if (pending.length > 50) pending.shift();
  }
}

// The scene bubbles a CustomEvent on itself; Elm port messages come back down
// through toScene.
document.addEventListener("wttm", (event) => {
  if (app) app.ports.fromScene.send(event.detail);
});

async function fetchCatalog() {
  // /api/me returns the public catalog when anonymous and the personal one when
  // the Access cookie verifies, so one call covers both. The static example is a
  // fallback if the Function is unreachable (e.g. mid-reconfiguration).
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (res.ok) return await res.json();
  } catch {
    /* fall through */
  }
  try {
    return await fetch("/catalog.json").then((r) => (r.ok ? r.json() : null));
  } catch {
    return null;
  }
}

function setupGyro() {
  const attach = () =>
    window.addEventListener("deviceorientation", (e) => {
      const scene = sceneEl();
      if (scene && scene.gyro) scene.gyro(e.alpha, e.beta, e.gamma);
    });
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === "function") {
    DOE.requestPermission()
      .then((state) => state === "granted" && attach())
      .catch(() => {});
  } else if (DOE) {
    attach();
  }
}

async function boot() {
  const webgl = hasWebGL();
  const catalog = await fetchCatalog();
  const flat = !webgl || resolveFlat(catalog?.defaultView);

  app = Elm.Main.init({
    node: document.getElementById("app"),
    flags: {
      flat,
      webgl,
      touch,
      scene: params.get("scene") || null,
      catalog: catalog ? JSON.stringify(catalog) : "",
    },
  });

  app.ports.toScene.subscribe(forward);
  app.ports.openUrl.subscribe((url) =>
    window.open(url, "_blank", "noopener,noreferrer")
  );
  app.ports.navigate.subscribe((url) => {
    window.location.href = url;
  });
  app.ports.setMode.subscribe((mode) => {
    try {
      localStorage.setItem("wttm.mode", mode);
    } catch {
      /* ignore */
    }
  });
  app.ports.enableGyro.subscribe(setupGyro);

  const flush = () => {
    const scene = sceneEl();
    if (scene && scene.send && pending.length) {
      for (const msg of pending.splice(0)) scene.send(msg);
    }
  };
  new MutationObserver(flush).observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
  });
  flush();
}

boot();
