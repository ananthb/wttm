import "./scene.js";
import { matrixRain } from "./matrix.js";

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
const reducedMotion =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

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

// The site default, then the device's remembered choice. Reduced motion does not
// change the stored preference; it only stops the rain from rendering.
function resolveRain(siteOn) {
  if (!siteOn) return false;
  try {
    const stored = localStorage.getItem("wttm.rain");
    if (stored === "off") return false;
    if (stored === "on") return true;
  } catch {
    /* ignore */
  }
  return true;
}

let rainDesired = false;
let rainInstance = null;
let rainCanvas = null;

// The rain stays out of these so the text over it stays readable.
function flatOccluders() {
  return document.querySelectorAll(
    ".flat .hud, .flat .settings, .flat .card, .flat .flat-category h2"
  );
}

// Start, stop or move the rain to match the current flat view and settings.
function applyRain() {
  const canvas = document.querySelector(".flat .rain");
  const on = rainDesired && !reducedMotion && !!canvas;
  if (!on) {
    if (rainInstance) {
      rainInstance.stop();
      rainInstance = null;
      rainCanvas = null;
    }
    return;
  }
  if (rainInstance && rainCanvas === canvas) return;
  if (rainInstance) rainInstance.stop();
  rainInstance = matrixRain(canvas, { occluders: flatOccluders });
  rainCanvas = canvas;
}

function setRain(desired) {
  rainDesired = !!desired;
  try {
    localStorage.setItem("wttm.rain", rainDesired ? "on" : "off");
  } catch {
    /* ignore */
  }
  applyRain();
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
  const rainEnabled = catalog?.matrixRain !== false;

  app = Elm.Main.init({
    node: document.getElementById("app"),
    flags: {
      flat,
      webgl,
      touch,
      scene: params.get("scene") || null,
      catalog: catalog ? JSON.stringify(catalog) : "",
      reducedMotion,
      rain: resolveRain(rainEnabled),
      rainEnabled,
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
  app.ports.setRain.subscribe(setRain);

  const flush = () => {
    const scene = sceneEl();
    if (scene && scene.send && pending.length) {
      for (const msg of pending.splice(0)) scene.send(msg);
    }
  };
  new MutationObserver(() => {
    flush();
    applyRain();
  }).observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
    attributes: true,
  });
  flush();
  applyRain();
}

// A favicon that will not load falls back to the emoji underneath. Image error
// events do not bubble, so listen in the capture phase.
document.addEventListener(
  "error",
  (event) => {
    const img = event.target;
    if (img && img.tagName === "IMG" && img.classList.contains("card-favicon")) {
      img.classList.add("failed");
    }
  },
  true
);

boot();
