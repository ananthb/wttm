import * as THREE from "three";
import * as util from "./util.js";

const { GREEN, RED, BLUE, CYAN, box, cyl, labelSprite, layoutCatalog } = util;

function windowTexture(tint = 0xffd27a) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#05080c";
  ctx.fillRect(0, 0, 128, 256);
  const css = "#" + tint.toString(16).padStart(6, "0");
  for (let y = 8; y < 248; y += 16) {
    for (let x = 8; x < 120; x += 16) {
      if (Math.random() < 0.45) {
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

function sign(text, color, y = 6.4, z = -2) {
  const sprite = labelSprite(text, color, 7.5);
  sprite.position.set(0, y, z);
  return sprite;
}

function floor(size, color, { y = -2, grid = null } = {}) {
  const group = new THREE.Group();
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size * 2), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = y;
  group.add(plane);
  if (grid != null) {
    const g = new THREE.GridHelper(size * 2, size, grid, grid);
    g.material.transparent = true;
    g.material.opacity = 0.14;
    g.position.y = y + 0.01;
    group.add(g);
  }
  return group;
}

// 1. The ship: the Nebuchadnezzar's interior, cold metal and red alert light.
function ship(ctx) {
  const env = new THREE.Group();

  env.add(floor(30, 0x0a0d10, { grid: 0x1f7a4d }));
  for (let i = -3; i <= 3; i++) {
    const wall = box(0.4, 8, 44, 0x0c1215);
    wall.position.set(i * 6, 2, -8);
    env.add(wall);
    const rib = box(0.5, 0.5, 0.5, 0x1a2a2e, { emissive: true });
    rib.position.set(i * 6, 4.5, -8);
    env.add(rib);
  }
  for (const side of [-9, 9]) {
    const pipe = cyl(0.18, 0.18, 40, 0x26383c);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(side, 1.2, -8);
    env.add(pipe);
  }
  const panels = [];
  for (let i = 0; i < 6; i++) {
    const monitor = box(2.2, 1.4, 0.1, 0x04120c, { emissive: true });
    monitor.position.set(-9.6, 2.6 + (i % 2) * 2, -3 - i * 4);
    monitor.rotation.y = Math.PI / 2;
    env.add(monitor);
  }
  const alert = new THREE.PointLight(RED, 12, 40);
  alert.position.set(0, 5, -12);
  env.add(alert);
  env.add(sign("NEBUCHADNEZZAR", RED, 6.6));

  const jack = box(0.6, 0.9, 0.4, 0x11331f, { emissive: true });
  jack.position.set(3, 1, 2);
  jack.userData = { kind: "prop", text: "The jack goes in the back of the skull. Here, it is a button." };
  env.add(jack);

  return {
    id: "ship",
    name: "The Nebuchadnezzar",
    env,
    layout: layoutCatalog(ctx.catalog, { zForTier: (t) => -3 - t * 5, arc: 0.12 }),
    spawn: [0, 1.75, 7],
    look: [0, 1.75, -8],
    bounds: { x: 9, zMin: -17, zMax: 3 },
    fog: [0x02060a, 0.03],
    background: 0x02040a,
    props: [jack],
    animate: (dt, t) => {
      alert.intensity = 8 + Math.sin(t * 2.2) * 6;
    },
  };
}

// 2. The construct: the white training room.
function construct(ctx) {
  const env = new THREE.Group();
  const white = 0xf2f4f2;

  env.add(floor(40, white));
  for (const [x, z] of [[-16, -6], [16, -6], [0, -30]]) {
    const wall = box(x === 0 ? 44 : 0.4, 14, x === 0 ? 0.4 : 20, white);
    wall.position.set(x, 4, z);
    env.add(wall);
  }
  env.add(new THREE.AmbientLight(0xffffff, 2.2));
  for (const [x, y, z] of [[0, 8, 4], [-10, 6, -6], [10, 6, -6]]) {
    const light = new THREE.PointLight(0xffffff, 8, 60);
    light.position.set(x, y, z);
    env.add(light);
  }

  const chair = (x) => {
    const g = new THREE.Group();
    const seat = box(1.1, 0.2, 1.0, 0x141414);
    seat.position.y = 0.6;
    const back = box(1.1, 1.2, 0.2, 0x141414);
    back.position.set(0, 1.2, -0.4);
    g.add(seat, back);
    g.position.set(x, 0, 2);
    return g;
  };
  env.add(chair(-1.1), chair(1.1));
  const tv = box(1.6, 1.1, 0.5, 0x0a0a0a);
  tv.position.set(0, 0.9, 4.2);
  env.add(tv);
  env.add(sign("THE CONSTRUCT", 0x2b3a33, 6.6));

  const switchProp = box(0.5, 0.5, 0.5, 0x0a0a0a);
  switchProp.position.set(3.5, 1, 2);
  switchProp.userData = { kind: "prop", text: "Load the program. Anything you can imagine, we can put you in." };
  env.add(switchProp);

  return {
    id: "construct",
    name: "The Construct",
    env,
    layout: layoutCatalog(ctx.catalog, { zForTier: (t) => -2 - t * 5, arc: 0.08 }),
    spawn: [0, 1.75, 9],
    look: [0, 1.75, -8],
    bounds: { x: 12, zMin: -18, zMax: 4 },
    fog: [0xdadfe0, 0.02],
    background: 0xdfe4e2,
    props: [switchProp],
    animate: () => {},
  };
}

// 3. The Keymaker's room: shelves of keys, warm candlelight.
function keymaker(ctx) {
  const env = new THREE.Group();
  env.add(floor(26, 0x241811, { grid: 0x5a3a1c }));
  env.add(new THREE.AmbientLight(0x2a1c10, 1.6));

  for (let i = 0; i < 5; i++) {
    const shelf = box(9, 0.2, 0.6, 0x3a2717);
    shelf.position.set(-10, 1 + i * 1.4, -6);
    shelf.rotation.y = Math.PI / 2;
    env.add(shelf);
  }
  const keys = [];
  for (let i = 0; i < 40; i++) {
    const key = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), new THREE.MeshStandardMaterial({ color: 0xd9b26a, metalness: 0.8, roughness: 0.3 }));
    const shaft = box(0.04, 0.35, 0.04, 0xd9b26a, { emissive: true });
    shaft.position.y = -0.24;
    key.add(ring, shaft);
    key.position.set(-10, 2.4 - (i % 5) * 1.4, -12 + (i % 8) * 1.4);
    key.userData = { kind: "prop", text: "One of these opens a door you have not found yet." };
    env.add(key);
    keys.push({ key, phase: i });
  }
  const candle = cyl(0.08, 0.1, 0.5, 0xffb347, { emissive: true });
  candle.position.set(0, 0.25, 2);
  env.add(candle);
  const glow = new THREE.PointLight(0xffa94d, 8, 26);
  glow.position.set(0, 2, 0);
  env.add(glow);
  env.add(sign("THE KEYMAKER", 0xd9b26a, 6.6));

  return {
    id: "keymaker",
    name: "The Keymaker's Room",
    env,
    layout: layoutCatalog(ctx.catalog, { zForTier: (t) => -3 - t * 5, arc: 0.1 }),
    spawn: [0, 1.75, 8],
    look: [0, 1.75, -8],
    bounds: { x: 10, zMin: -17, zMax: 4 },
    fog: [0x140b06, 0.035],
    background: 0x120a05,
    props: keys.slice(0, 6).map((k) => k.key),
    animate: (dt, t) => {
      glow.intensity = 6 + Math.sin(t * 6) * 2;
      for (const { key, phase } of keys) key.rotation.z = Math.sin(t + phase) * 0.12;
    },
  };
}

// 4. The Oracle's apartment: warm, domestic, the red phone.
function oracle(ctx) {
  const env = new THREE.Group();
  env.add(floor(24, 0x3b2a1e, { grid: 0x6a4a2c }));
  env.add(new THREE.AmbientLight(0x3a2a18, 1.8));

  const backWall = box(24, 9, 0.4, 0x6a5137);
  backWall.position.set(0, 3, -12);
  env.add(backWall);
  const counter = box(10, 1, 1.2, 0x4a3826);
  counter.position.set(-6, 0.4, -10);
  env.add(counter);
  const sofa = box(4, 1, 1.6, 0x5a3b2a);
  sofa.position.set(5, 0.5, -6);
  env.add(sofa);
  const lamp = cyl(0.1, 0.3, 1.6, 0xffd9a0, { emissive: true });
  lamp.position.set(8, 0.8, -9);
  env.add(lamp);
  const lampLight = new THREE.PointLight(0xffc98a, 10, 30);
  lampLight.position.set(8, 2, -8);
  env.add(lampLight);
  env.add(sign("THE ORACLE", 0xffc98a, 6.6));

  const phone = new THREE.Group();
  const base = box(0.5, 0.3, 0.4, RED, { emissive: true });
  const handset = box(0.5, 0.14, 0.16, 0x1a0000);
  handset.position.y = 0.22;
  phone.add(base, handset);
  phone.position.set(2, 1, 1);
  phone.rotation.y = -0.5;
  phone.userData = { kind: "prop", text: "It rings. You already know who it is." };
  env.add(phone);

  return {
    id: "oracle",
    name: "The Oracle's Apartment",
    env,
    layout: layoutCatalog(ctx.catalog, { zForTier: (t) => -3 - t * 5, arc: 0.1 }),
    spawn: [0, 1.75, 8],
    look: [0, 1.75, -8],
    bounds: { x: 10, zMin: -16, zMax: 5 },
    fog: [0x1a120a, 0.03],
    background: 0x180f08,
    props: [phone],
    animate: (dt, t) => {
      lampLight.intensity = 8 + Math.sin(t * 1.3) * 2;
    },
  };
}

// 5. The lobby shootout: marble columns, slow bullets, the surround hallway.
function lobby(ctx) {
  const env = new THREE.Group();
  env.add(floor(30, 0x14161a, { grid: 0x223040 }));
  env.add(new THREE.AmbientLight(0x2b3440, 1.7));

  for (const side of [-7, 7]) {
    for (let i = 0; i < 5; i++) {
      const column = cyl(0.6, 0.7, 9, 0xd8d2c4);
      column.position.set(side, 2.5, -2 - i * 5);
      env.add(column);
    }
  }
  const keyLight = new THREE.PointLight(0xbcd4ff, 10, 60);
  keyLight.position.set(0, 8, -6);
  env.add(keyLight);

  const bullets = [];
  for (let i = 0; i < 30; i++) {
    const b = cyl(0.03, 0.03, 1.6, 0xfff2c0, { emissive: true });
    b.rotation.z = Math.PI / 2;
    b.position.set(-10 + (i % 10) * 2, 1 + ((i / 10) | 0) * 0.6, -14 + (i % 3) * 0.2);
    env.add(b);
    bullets.push({ b, phase: i * 0.4 });
  }
  env.add(sign("THE LOBBY", 0xbcd4ff, 7.2, -4));

  const gun = box(0.9, 0.25, 0.25, 0x1b1b1b, { emissive: true });
  gun.position.set(3, 0.6, 2);
  gun.userData = { kind: "prop", text: "Dodge. Do not let go of the link." };
  env.add(gun);

  return {
    id: "lobby",
    name: "The Lobby",
    env,
    layout: layoutCatalog(ctx.catalog, { zForTier: (t) => -4 - t * 5, arc: 0 }),
    spawn: [0, 1.75, 10],
    look: [0, 1.75, -8],
    bounds: { x: 8, zMin: -18, zMax: 5 },
    fog: [0x05070b, 0.028],
    background: 0x04060a,
    props: [gun],
    animate: (dt, t) => {
      for (const { b, phase } of bullets) b.position.x = Math.sin(t * 0.6 + phase) * 9;
    },
  };
}

// 6. Downtown: a city street at night, rain, neon, a phone booth.
function downtown(ctx) {
  const env = new THREE.Group();
  env.add(floor(40, 0x080a0d, { grid: 0x14202a }));
  env.add(new THREE.AmbientLight(0x1a2230, 1.5));

  const tex = windowTexture();
  for (let i = 0; i < 14; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const h = 8 + Math.random() * 18;
    const b = box(6, h, 6, 0x0a0e14);
    b.position.set(side * (12 + Math.random() * 6), h / 2 - 2, -6 - i * 4 + Math.random() * 2);
    const windows = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, h - 1),
      new THREE.MeshBasicMaterial({ map: tex.clone(), transparent: true })
    );
    windows.material.map.needsUpdate = true;
    windows.position.set(0, 0, side < 0 ? 3.05 : -3.05);
    if (side > 0) windows.rotation.y = Math.PI;
    b.add(windows);
    env.add(b);
  }
  for (let i = 0; i < 6; i++) {
    const lamp = cyl(0.08, 0.08, 4, 0x1c2830);
    lamp.position.set(i % 2 ? -5 : 5, 0, -4 - i * 6);
    const bulb = new THREE.PointLight(0x6cf0ff, 6, 20);
    bulb.position.set(i % 2 ? -5 : 5, 3.4, -4 - i * 6);
    env.add(lamp, bulb);
  }
  env.add(sign("DOWNTOWN", CYAN, 7.5, -6));

  const booth = box(1.2, 2.4, 1.2, 0x123040, { emissive: true });
  booth.position.set(4, 0.2, 1);
  booth.userData = { kind: "prop", text: "Follow the white rabbit. Knock, knock." };
  env.add(booth);

  const rain = (() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = Math.random() * 30;
      pos[i * 3 + 2] = -Math.random() * 50;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x6cf0ff, size: 0.05, transparent: true, opacity: 0.6 }));
    env.add(p);
    return p;
  })();

  return {
    id: "downtown",
    name: "The Street",
    env,
    layout: layoutCatalog(ctx.catalog, { zForTier: (t) => -3 - t * 5, arc: 0.1 }),
    spawn: [0, 1.75, 9],
    look: [0, 1.75, -8],
    bounds: { x: 9, zMin: -17, zMax: 5 },
    fog: [0x03060b, 0.03],
    background: 0x02040a,
    props: [booth],
    animate: (dt, t) => {
      const attr = rain.geometry.getAttribute("position");
      for (let i = 1; i < attr.count; i += 3) attr.array[i * 1] -= dt * 6;
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
