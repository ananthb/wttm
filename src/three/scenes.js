import * as THREE from "three";
import * as util from "./util.js";

const { GREEN, RED, BLUE, CYAN, box, cyl, labelSprite, layoutCatalog, TIER_STEP } = util;

// Cards live in roughly x[-14,14], y[-0.5,4.5], z[-20,-2]. Every scene keeps its
// props outside that: sides at |x| >= 18, back at z <= -25, overhead at y >= 7,
// and near-field dressing at z >= 2.

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

function sign(text, color) {
  const sprite = labelSprite(text, color, 9);
  sprite.position.set(0, 10, -6);
  return sprite;
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

function sideWalls(color, { x = 20, z = -12, h = 12, d = 34 } = {}) {
  const group = new THREE.Group();
  for (const sx of [-x, x]) {
    const w = box(0.6, h, d, color);
    w.position.set(sx, h / 2 - 2, z);
    group.add(w);
  }
  return group;
}

// 1. Nebuchadnezzar: cold hull, red alert, banks of green monitors.
function ship(ctx) {
  const env = new THREE.Group();
  env.add(ground(80, 0x090c10));
  env.add(sideWalls(0x0c1418, { x: 20, d: 40 }));
  const back = box(42, 12, 0.6, 0x0a1116);
  back.position.set(0, 4, -28);
  env.add(back);
  env.add(new THREE.AmbientLight(0x1c2a30, 1.5));

  for (const sx of [-19.4, 19.4]) {
    for (let i = 0; i < 5; i++) {
      const rib = box(0.5, 9, 0.5, 0x16242a);
      rib.position.set(sx, 2.5, 2 - i * 7);
      env.add(rib);
      const monitor = box(1.8, 6, 0.2, 0x04140c, { emissive: true });
      monitor.position.set(sx + (sx < 0 ? 0.6 : -0.6), 3, 0 - i * 7);
      monitor.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      env.add(monitor);
    }
    const pipe = cyl(0.22, 0.22, 44, 0x24363c);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx, 6.6, -8);
    env.add(pipe);
  }
  const alert = new THREE.PointLight(RED, 14, 60);
  alert.position.set(0, 6, -10);
  env.add(alert);
  const ghost = new THREE.PointLight(GREEN, 6, 40);
  ghost.position.set(0, 3, -22);
  env.add(ghost);
  env.add(sign("NEBUCHADNEZZAR", RED));

  const jack = box(0.6, 0.9, 0.4, 0x11331f, { emissive: true });
  jack.position.set(3.5, 1, 2);
  jack.userData = { kind: "prop", text: "The jack goes in the back of the skull. Here, it is a button." };
  env.add(jack);

  return {
    id: "ship",
    name: "The Nebuchadnezzar",
    env,
    layout: layoutCatalog(ctx.catalog),
    spawn: [0, 1.8, 8],
    look: [0, 1.8, -8],
    bounds: { x: 16, zMin: -21, zMax: 10 },
    fog: [0x040a10, 0.03],
    background: 0x01040a,
    props: [jack],
    animate: (dt, t) => {
      alert.intensity = 8 + Math.sin(t * 2.2) * 6;
    },
  };
}

// 2. The Construct: blinding white, nothing but the chairs and the TV.
function construct(ctx) {
  const env = new THREE.Group();
  const white = 0xf4f6f4;
  env.add(ground(80, white));
  const back = box(60, 20, 0.6, white);
  back.position.set(0, 6, -30);
  env.add(back);
  env.add(new THREE.AmbientLight(0xffffff, 2.6));
  for (const [x, y, z] of [[-14, 10, 4], [14, 10, 4], [0, 12, -20]]) {
    const light = new THREE.PointLight(0xffffff, 9, 80);
    light.position.set(x, y, z);
    env.add(light);
  }
  const grid = new THREE.GridHelper(80, 40, 0xcfd6d2, 0xcfd6d2);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  grid.position.y = -1.99;
  env.add(grid);

  const chair = (x) => {
    const g = new THREE.Group();
    const seat = box(1.1, 0.2, 1.0, 0x111111);
    seat.position.y = 0.6;
    const backrest = box(1.1, 1.2, 0.2, 0x111111);
    backrest.position.set(0, 1.2, -0.4);
    g.add(seat, backrest);
    g.position.set(x, 0, 3);
    return g;
  };
  env.add(chair(-1.2), chair(1.2));
  const tv = box(1.6, 1.1, 0.6, 0x0a0a0a);
  tv.position.set(0, 0.9, 4.6);
  env.add(tv);
  env.add(sign("THE CONSTRUCT", 0x2b3a33));

  const prop = box(0.5, 0.5, 0.5, 0x0a0a0a);
  prop.position.set(4, 1, 3);
  prop.userData = { kind: "prop", text: "Anything you can imagine, we can put you in." };
  env.add(prop);

  return {
    id: "construct",
    name: "The Construct",
    env,
    layout: layoutCatalog(ctx.catalog),
    spawn: [0, 1.8, 11],
    look: [0, 1.8, -8],
    bounds: { x: 16, zMin: -22, zMax: 14 },
    fog: [0xe4e8e6, 0.018],
    background: 0xe8ece9,
    props: [prop],
    animate: () => {},
  };
}

// 3. The Keymaker's Room: amber, shelves and hundreds of hanging keys.
function keymaker(ctx) {
  const env = new THREE.Group();
  env.add(ground(60, 0x1c1208));
  env.add(sideWalls(0x2a1a0d, { x: 19, h: 14, d: 36 }));
  const back = box(40, 14, 0.6, 0x241609);
  back.position.set(0, 5, -28);
  env.add(back);
  env.add(new THREE.AmbientLight(0x2a1a0d, 1.7));

  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b26a, metalness: 0.85, roughness: 0.28 });
  for (let i = 0; i < 5; i++) {
    for (const sx of [-18.4, 18.4]) {
      const shelf = box(0.6, 0.2, 24, 0x3a2717);
      shelf.position.set(sx, 1 + i * 1.6, -8);
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
      -14 + Math.random() * 18
    );
    key.userData = { kind: "prop", text: "One of these opens a door you have not found yet." };
    env.add(key);
    keys.push({ key, phase: i * 0.4 });
  }
  const glow = new THREE.PointLight(0xffb457, 12, 50);
  glow.position.set(0, 5, -6);
  env.add(glow);
  env.add(sign("THE KEYMAKER", 0xd9b26a));

  return {
    id: "keymaker",
    name: "The Keymaker's Room",
    env,
    layout: layoutCatalog(ctx.catalog),
    spawn: [0, 1.8, 9],
    look: [0, 1.8, -8],
    bounds: { x: 16, zMin: -22, zMax: 12 },
    fog: [0x150b04, 0.036],
    background: 0x120803,
    props: keys.slice(0, 8).map((k) => k.key),
    animate: (dt, t) => {
      glow.intensity = 9 + Math.sin(t * 5) * 3;
      for (const { key, phase } of keys) key.rotation.z = Math.sin(t + phase) * 0.15;
    },
  };
}

// 4. The Oracle's Apartment: warm and lived-in, the red phone.
function oracle(ctx) {
  const env = new THREE.Group();
  env.add(ground(50, 0x34261a));
  env.add(sideWalls(0x4a3826, { x: 18, h: 12, d: 32 }));
  const back = box(36, 12, 0.6, 0x5a4531);
  back.position.set(0, 3, -27);
  env.add(back);
  env.add(new THREE.AmbientLight(0x3a2a18, 2));

  const counter = box(10, 1, 1.4, 0x4a3826);
  counter.position.set(-12, 0.6, 0);
  env.add(counter);
  const sofa = box(4.6, 1, 1.6, 0x5a3b2a);
  sofa.position.set(11, 0.6, 0);
  env.add(sofa);
  const lamp = cyl(0.12, 0.34, 1.8, 0xffd9a0, { emissive: true });
  lamp.position.set(-6, 0.9, 6);
  env.add(lamp);
  const lampLight = new THREE.PointLight(0xffc98a, 16, 50);
  lampLight.position.set(-6, 3, 6);
  env.add(lampLight);
  const lamp2 = cyl(0.12, 0.34, 1.8, 0xffd9a0, { emissive: true });
  lamp2.position.set(9, 0.9, 6);
  env.add(lamp2);
  const lampLight2 = new THREE.PointLight(0xffc98a, 12, 40);
  lampLight2.position.set(9, 3, 6);
  env.add(lampLight2);
  env.add(sign("THE ORACLE", 0xffc98a));

  const phone = new THREE.Group();
  phone.add(box(0.5, 0.3, 0.4, RED, { emissive: true }), (() => {
    const h = box(0.5, 0.14, 0.16, 0x2a0000);
    h.position.y = 0.22;
    return h;
  })());
  phone.position.set(2.5, 1, 3);
  phone.rotation.y = -0.5;
  phone.userData = { kind: "prop", text: "It rings. You already know who it is." };
  env.add(phone);

  return {
    id: "oracle",
    name: "The Oracle's Apartment",
    env,
    layout: layoutCatalog(ctx.catalog),
    spawn: [0, 1.8, 9],
    look: [0, 1.8, -8],
    bounds: { x: 16, zMin: -22, zMax: 12 },
    fog: [0x1a120a, 0.03],
    background: 0x160e07,
    props: [phone],
    animate: (dt, t) => {
      lampLight.intensity = 13 + Math.sin(t * 1.3) * 3;
    },
  };
}

// 5. The Lobby: cold marble columns, slow bullets, the surround hallway.
function lobby(ctx) {
  const env = new THREE.Group();
  env.add(ground(60, 0x12151b));
  env.add(new THREE.AmbientLight(0x2b3440, 1.9));
  for (const side of [-17, 17]) {
    for (let i = 0; i < 6; i++) {
      const column = cyl(0.7, 0.8, 11, 0xd8d2c4);
      column.position.set(side, 3.5, 0 - i * 5);
      env.add(column);
    }
  }
  const back = box(40, 16, 0.6, 0x1a1e26);
  back.position.set(0, 6, -28);
  env.add(back);
  const key = new THREE.PointLight(0xbcd4ff, 18, 90);
  key.position.set(0, 10, -8);
  env.add(key);

  const bullets = [];
  for (let i = 0; i < 40; i++) {
    const b = cyl(0.03, 0.03, 1.8, 0xfff2c0, { emissive: true });
    b.rotation.z = Math.PI / 2;
    b.position.set(-16 + (i % 10) * 3.4, 7 + ((i / 10) | 0) * 0.7, -20 + (i % 4) * 1.5);
    env.add(b);
    bullets.push({ b, phase: i * 0.4 });
  }
  env.add(sign("THE LOBBY", 0xbcd4ff));

  const gun = box(0.9, 0.25, 0.25, 0x141414, { emissive: true });
  gun.position.set(3.5, 0.6, 3);
  gun.userData = { kind: "prop", text: "Dodge. Do not let go of the link." };
  env.add(gun);

  return {
    id: "lobby",
    name: "The Lobby",
    env,
    layout: layoutCatalog(ctx.catalog),
    spawn: [0, 1.8, 11],
    look: [0, 1.8, -8],
    bounds: { x: 16, zMin: -23, zMax: 13 },
    fog: [0x070c14, 0.026],
    background: 0x03060c,
    props: [gun],
    animate: (dt, t) => {
      for (const { b, phase } of bullets) b.position.x = Math.sin(t * 0.5 + phase) * 15;
    },
  };
}

// 6. Downtown: night street, neon, rain, a phone booth.
function downtown(ctx) {
  const env = new THREE.Group();
  env.add(ground(80, 0x070a0e));
  env.add(new THREE.AmbientLight(0x1a2230, 1.6));

  const tex = windows(0xffd27a);
  const neons = [0xff2f6d, 0x2ff5ff, 0xffd23b, 0x9b5cff];
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 12 + Math.random() * 22;
    const b = box(7, h, 7, 0x0a0e14);
    b.position.set(side * (21 + Math.random() * 10), h / 2 - 2, -6 - i * 4 + Math.random() * 3);
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, h - 1),
      new THREE.MeshBasicMaterial({ map: tex.clone(), transparent: true })
    );
    win.material.map.needsUpdate = true;
    win.position.set(0, 0, side < 0 ? 3.55 : -3.55);
    if (side > 0) win.rotation.y = Math.PI;
    b.add(win);
    if (i % 3 === 0) {
      const neon = box(0.3, 4, 0.3, neons[i % neons.length], { emissive: true });
      neon.position.set(side * 16, 5 + Math.random() * 4, -6 - i * 4);
      env.add(neon);
      const nl = new THREE.PointLight(neons[i % neons.length], 8, 30);
      nl.position.copy(neon.position);
      env.add(nl);
    }
    env.add(b);
  }
  for (let i = 0; i < 6; i++) {
    const x = i % 2 ? -14 : 14;
    const post = cyl(0.08, 0.08, 5, 0x1c2830);
    post.position.set(x, 0.5, -4 - i * 6);
    const bulb = new THREE.PointLight(0x6cf0ff, 7, 24);
    bulb.position.set(x, 4.4, -4 - i * 6);
    env.add(post, bulb);
  }
  env.add(sign("DOWNTOWN", CYAN));

  const booth = box(1.2, 2.6, 1.2, 0x123040, { emissive: true });
  booth.position.set(5, 0.3, 3);
  booth.userData = { kind: "prop", text: "Follow the white rabbit. Knock, knock." };
  env.add(booth);

  const rain = (() => {
    const count = 1600;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80;
      pos[i * 3 + 1] = Math.random() * 34;
      pos[i * 3 + 2] = -Math.random() * 60;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(
      g,
      new THREE.PointsMaterial({ color: 0x6cf0ff, size: 0.05, transparent: true, opacity: 0.55 })
    );
    env.add(p);
    return p;
  })();

  return {
    id: "downtown",
    name: "The Street",
    env,
    layout: layoutCatalog(ctx.catalog),
    spawn: [0, 1.8, 10],
    look: [0, 1.8, -8],
    bounds: { x: 16, zMin: -22, zMax: 13 },
    fog: [0x03060e, 0.028],
    background: 0x02030a,
    props: [booth],
    animate: (dt) => {
      const attr = rain.geometry.getAttribute("position");
      for (let i = 1; i < attr.count; i += 3) attr.array[i] -= dt * 8;
      attr.needsUpdate = true;
    },
  };
}

const BUILDERS = { ship, construct, keymaker, oracle, lobby, downtown };

export const SCENE_ORDER = ["ship", "construct", "keymaker", "oracle", "lobby", "downtown"];

export const SCENE_NAMES = {
  ship: "The Nebuchadnezzar",
  construct: "The Construct",
  keymaker: "The Keymaker's Room",
  oracle: "The Oracle's Apartment",
  lobby: "The Lobby",
  downtown: "The Street",
};

export function getScene(id) {
  return BUILDERS[id] ?? BUILDERS.downtown;
}
