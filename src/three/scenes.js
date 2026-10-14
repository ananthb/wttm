import * as THREE from "three";
import * as util from "./util.js";

const { GREEN, RED, CYAN, box, cyl, layoutCategory } = util;

// One scene per group, joined end to end so the walker travels between them.
// Each scene is built in local space with its back wall at z = BACK and the
// camera entering from +z; buildWorld offsets a scene to its slot and cuts a
// doorway in that wall so the next one is reachable on foot.
const SPACING = 36;
const FIRST_Z = 6;
const CARD_X = 8;
const CARD_LOCAL_Z = -9;
const BACK = -28;

const CATEGORY_THEME = {
  apps: "street",
  media: "lobby",
  websites: "construct",
  platform: "ship",
  homeassistant: "oracle",
  build: "keymaker",
};

const THEME_ORDER = ["street", "construct", "keymaker", "oracle", "lobby", "ship"];

function windows(tint = 0xffd27a, density = 0.45) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#04070b";
  ctx.fillRect(0, 0, 128, 256);
  const css = "#" + tint.toString(16).padStart(6, "0");
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 16) {
      if (Math.random() < density) {
        ctx.globalAlpha = 0.25 + Math.random() * 0.75;
        ctx.fillStyle = css;
        ctx.fillRect(x, y, 9, 11);
      }
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function ground(size, color, y = -2) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

function floorPatch(color, { x = 0, z = -10, w = 40, d = 30 } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ color, roughness: 1 })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, -1.98, z);
  return mesh;
}

function sideWalls(color, { x = 20, h = 12, d = 34 } = {}) {
  const group = new THREE.Group();
  for (const sx of [-x, x]) {
    const w = box(0.6, h, d, color);
    w.position.set(sx, h / 2 - 2, -12);
    group.add(w);
  }
  return group;
}

// The wall between two scenes, with a 6-wide doorway at the centre.
function backWall(width, height, color) {
  const group = new THREE.Group();
  const gap = 6;
  const w = Math.max(0.1, (width - gap) / 2);
  for (const sx of [-1, 1]) {
    const panel = box(w, height, 0.6, color);
    panel.position.set(sx * (gap / 2 + w / 2), height / 2 - 2, BACK);
    group.add(panel);
  }
  return group;
}

function point(color, intensity, distance, x, y, z) {
  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  return light;
}

function prop(mesh, text) {
  mesh.userData = { kind: "prop", text };
  return mesh;
}

// 1. The Street: night, neon, rain.
function street() {
  const env = new THREE.Group();
  const tex = windows(0xffd27a);
  const neons = [0xff2f6d, 0x2ff5ff, 0xffd23b, 0x9b5cff];
  for (let i = 0; i < 7; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 12 + Math.random() * 20;
    const b = box(7, h, 7, 0x0a0e14);
    b.position.set(side * (21 + Math.random() * 8), h / 2 - 2, 2 - i * 4.5);
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, h - 1),
      new THREE.MeshBasicMaterial({ map: tex.clone(), transparent: true })
    );
    win.material.map.needsUpdate = true;
    win.position.set(0, 0, side < 0 ? 3.55 : -3.55);
    if (side > 0) win.rotation.y = Math.PI;
    b.add(win);
    if (i % 3 === 0) {
      const neon = box(0.3, 4, 0.3, neons[i % 4], { emissive: true });
      neon.position.set(side * 16, 5 + Math.random() * 4, 2 - i * 4.5);
      env.add(neon, point(neons[i % 4], 8, 30, neon.position.x, neon.position.y + 1, neon.position.z));
    }
    env.add(b);
  }
  for (let i = 0; i < 6; i++) {
    const x = i % 2 ? -14 : 14;
    const post = cyl(0.08, 0.08, 5, 0x1c2830);
    post.position.set(x, 0.5, 2 - i * 5.5);
    env.add(post, point(0x6cf0ff, 7, 24, x, 4.4, 2 - i * 5.5));
  }
  env.add(backWall(44, 16, 0x0a0e14));
  env.add(point(CYAN, 8, 34, CARD_X, 4.5, CARD_LOCAL_Z + 3));

  const rain = (() => {
    const count = 1400;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 32;
      pos[i * 3 + 2] = 4 - Math.random() * 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: 0x6cf0ff, size: 0.05, transparent: true, opacity: 0.5 })
    );
    env.add(p);
    return p;
  })();

  const booth = prop(box(1.1, 2.4, 1.1, 0x123040, { emissive: true }), "Follow the white rabbit. Knock, knock.");
  booth.position.set(CARD_X, 0.4, 3);
  env.add(booth);

  return {
    env,
    props: [booth],
    animate: (dt) => {
      const attr = rain.geometry.getAttribute("position");
      for (let i = 1; i < attr.count; i += 3) attr.array[i] -= dt * 8;
      attr.needsUpdate = true;
    },
  };
}

// 2. The Lobby: cold marble columns and slow bullets.
function lobby() {
  const env = new THREE.Group();
  env.add(floorPatch(0x12151b, { z: -10 }));
  for (const side of [-17, 17]) {
    for (let i = 0; i < 6; i++) {
      const column = cyl(0.7, 0.8, 11, 0xd8d2c4);
      column.position.set(side, 3.5 - 2, 2 - i * 5);
      env.add(column);
    }
  }
  env.add(backWall(40, 16, 0x1a1e26));
  env.add(point(0xbcd4ff, 18, 90, 0, 10, -8));

  const bullets = [];
  for (let i = 0; i < 40; i++) {
    const b = cyl(0.03, 0.03, 1.8, 0xfff2c0, { emissive: true });
    b.rotation.z = Math.PI / 2;
    b.position.set(-16 + (i % 10) * 3.4, 7 + ((i / 10) | 0) * 0.7, -20 + (i % 4) * 1.5);
    env.add(b);
    bullets.push({ b, phase: i * 0.4 });
  }

  const gun = prop(box(0.9, 0.25, 0.25, 0x141414, { emissive: true }), "Dodge. Do not let go of the link.");
  gun.position.set(CARD_X, 0.6, 3);
  env.add(gun);

  return {
    env,
    props: [gun],
    animate: (dt, t) => {
      for (const { b, phase } of bullets) b.position.x = Math.sin(t * 0.5 + phase) * 15;
    },
  };
}

// 3. The Construct: blinding white, a grid, nothing else.
function construct() {
  const env = new THREE.Group();
  const white = 0xf4f6f4;
  env.add(floorPatch(white, { z: -8 }));
  const grid = new THREE.GridHelper(80, 40, 0xcfd6d2, 0xcfd6d2);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = -1.96;
  env.add(grid);
  env.add(backWall(46, 20, white));
  env.add(point(0xffffff, 20, 70, 0, 7, -4));
  env.add(point(0xffffff, 14, 60, -14, 8, -14));
  env.add(point(0xffffff, 14, 60, 14, 8, -14));

  const cube = prop(box(0.5, 0.5, 0.5, 0x0a0a0a), "Anything you can imagine, we can put you in.");
  cube.position.set(CARD_X, 1, 3);
  env.add(cube);

  return { env, props: [cube], animate: () => {} };
}

// 4. The Nebuchadnezzar: cold hull, red alert, banks of green monitors.
function ship() {
  const env = new THREE.Group();
  env.add(floorPatch(0x090c10, { z: -10 }));
  env.add(sideWalls(0x0c1418, { x: 20, h: 12, d: 34 }));
  env.add(backWall(42, 12, 0x0a1116));

  for (const sx of [-19.4, 19.4]) {
    for (let i = 0; i < 4; i++) {
      const rib = box(0.5, 9, 0.5, 0x16242a);
      rib.position.set(sx, 2.5, 2 - i * 7);
      env.add(rib);
      const monitor = box(1.8, 6, 0.2, 0x04140c, { emissive: true });
      monitor.position.set(sx + (sx < 0 ? 0.6 : -0.6), 3, 2 - i * 7);
      monitor.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      env.add(monitor);
    }
    const pipe = cyl(0.22, 0.22, 44, 0x24363c);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx, 6.6, -10);
    env.add(pipe);
  }
  const alert = point(RED, 14, 60, 0, 6, -10);
  env.add(alert, point(GREEN, 6, 40, 0, 3, -22));

  const jack = prop(box(0.6, 0.9, 0.4, 0x11331f, { emissive: true }), "The jack goes in the back of the skull. Here, it is a button.");
  jack.position.set(CARD_X, 1, 3);
  env.add(jack);

  return {
    env,
    props: [jack],
    animate: (dt, t) => {
      alert.intensity = 8 + Math.sin(t * 2.2) * 6;
    },
  };
}

// 5. The Oracle's Apartment: warm and lived-in, the red phone.
function oracle() {
  const env = new THREE.Group();
  env.add(floorPatch(0x34261a, { z: -10 }));
  env.add(sideWalls(0x4a3826, { x: 18, h: 12, d: 32 }));
  env.add(backWall(36, 12, 0x5a4531));

  const counter = box(10, 1, 1.4, 0x4a3826);
  counter.position.set(-13, 0.6, -1);
  env.add(counter);
  const sofa = box(4.6, 1, 1.6, 0x5a3b2a);
  sofa.position.set(13, 0.6, -1);
  env.add(sofa);
  const lamp = cyl(0.12, 0.34, 1.8, 0xffd9a0, { emissive: true });
  lamp.position.set(-6, 0.9, 4);
  env.add(lamp);
  const lampLight = point(0xffc98a, 16, 50, -6, 3, 4);
  env.add(lampLight);
  const lamp2 = cyl(0.12, 0.34, 1.8, 0xffd9a0, { emissive: true });
  lamp2.position.set(9, 0.9, 4);
  env.add(lamp2, point(0xffc98a, 12, 40, 9, 3, 4));

  const phone = prop(box(0.5, 0.3, 0.4, RED, { emissive: true }), "It rings. You already know who it is.");
  phone.position.set(CARD_X, 1, 3);
  phone.rotation.y = -0.5;
  env.add(phone);

  return {
    env,
    props: [phone],
    animate: (dt, t) => {
      lampLight.intensity = 13 + Math.sin(t * 1.3) * 3;
    },
  };
}

// 6. The Keymaker's Room: amber, shelves and hundreds of hanging keys.
function keymaker() {
  const env = new THREE.Group();
  env.add(floorPatch(0x1c1208, { z: -10 }));
  env.add(sideWalls(0x2a1a0d, { x: 19, h: 14, d: 34 }));
  env.add(backWall(40, 14, 0x241609));

  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b26a, metalness: 0.85, roughness: 0.28 });
  for (let i = 0; i < 5; i++) {
    for (const sx of [-18.4, 18.4]) {
      const shelf = box(0.6, 0.2, 24, 0x3a2717);
      shelf.position.set(sx, 1 + i * 1.6, -10);
      env.add(shelf);
    }
  }
  const keys = [];
  for (let i = 0; i < 90; i++) {
    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 14), gold);
    const shaft = box(0.05, 0.4, 0.05, 0xd9b26a, { emissive: true });
    shaft.position.y = -0.26;
    key.add(ring, shaft);
    const overhead = i < 60;
    key.position.set(
      overhead ? (Math.random() - 0.5) * 34 : (Math.random() < 0.5 ? -18 : 18),
      overhead ? 7 + Math.random() * 3 : 1 + (i % 5) * 1.6,
      -16 + Math.random() * 18
    );
    env.add(key);
    keys.push({ key, phase: i * 0.4 });
  }
  const glow = point(0xffb457, 12, 50, 0, 5, -8);
  env.add(glow);

  const key = prop(box(0.5, 0.5, 0.5, 0xd9b26a, { emissive: true }), "One of these opens a door you have not found yet.");
  key.position.set(CARD_X, 1, 3);
  env.add(key);

  return {
    env,
    props: [key],
    animate: (dt, t) => {
      glow.intensity = 9 + Math.sin(t * 5) * 3;
      for (const { key: k, phase } of keys) k.rotation.z = Math.sin(t + phase) * 0.15;
    },
  };
}

const THEMES = { street, lobby, construct, ship, oracle, keymaker };

function buildWorld(ctx) {
  const categories = (ctx.catalog.categories ?? []).filter((c) => (c.apps ?? []).length > 0);
  const env = new THREE.Group();
  const panels = [];
  const headers = [];
  const props = [];
  const animators = [];

  env.add(ground(500, 0x05080c));
  env.add(new THREE.AmbientLight(0x18202a, 1.2));

  categories.forEach((category, i) => {
    const z = FIRST_Z - i * SPACING;
    const side = i % 2 === 0 ? 1 : -1;
    const id = CATEGORY_THEME[category.id] ?? THEME_ORDER[i % THEME_ORDER.length];
    const scene = (THEMES[id] ?? THEMES.street)(ctx);
    scene.env.position.set(0, 0, z);
    env.add(scene.env);
    if (scene.animate) animators.push(scene.animate);
    for (const p of scene.props ?? []) props.push(p);

    const laid = layoutCategory(category, { x: side * CARD_X, y: 2.1, z: z + CARD_LOCAL_Z });
    panels.push(...laid.panels);
    headers.push(...laid.headers);
  });

  const lastZ = categories.length ? FIRST_Z - (categories.length - 1) * SPACING : FIRST_Z;

  return {
    env,
    layout: { panels, headers },
    spawn: [0, 1.7, FIRST_Z + 11],
    look: [0, 1.7, FIRST_Z - 8],
    bounds: { x: 14, zMin: lastZ - 34, zMax: FIRST_Z + 13 },
    fog: [0x02060a, 0.028],
    background: 0x01030a,
    props,
    animate: (dt, t) => {
      for (const fn of animators) fn(dt, t);
    },
  };
}

export const SCENE_ORDER = ["street", "lobby", "construct", "ship", "oracle", "keymaker"];

export const SCENE_NAMES = {
  street: "The Street",
  lobby: "The Lobby",
  construct: "The Construct",
  ship: "The Nebuchadnezzar",
  oracle: "The Oracle's Apartment",
  keymaker: "The Keymaker's Room",
};

// The world is one traversal of a scene per group, so the id only covers the
// `?scene=` override; the catalog decides the scenes.
export function getScene(_id) {
  return buildWorld;
}
