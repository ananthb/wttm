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

function crate(x, y, z, s, color = 0x16242a) {
  const m = box(s, s, s, color);
  m.position.set(x, y, z);
  m.rotation.y = Math.random() * Math.PI;
  return m;
}

// A pipe running along z, for the corridor overhead and machine rooms.
function pipe(z, { x = 0, y = 7, len = 30, r = 0.15, color = 0x17202a } = {}) {
  const p = cyl(r, r, len, color);
  p.rotation.x = Math.PI / 2;
  p.position.set(x, y, z);
  return p;
}

// A cable slung across the corridor (along x).
function cable(x, y, z, len, color = 0x1a222a) {
  const c = cyl(0.03, 0.03, len, color);
  c.rotation.z = Math.PI / 2;
  c.position.set(x, y, z);
  return c;
}

function plant(x, z, scale = 1) {
  const g = new THREE.Group();
  const pot = cyl(0.36, 0.3, 0.7, 0x4a3826);
  pot.position.y = -1.55;
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x1f4d2a, roughness: 1 })
  );
  leaves.position.y = -1;
  g.add(pot, leaves);
  g.scale.setScalar(scale);
  g.position.set(x, 0, z);
  return g;
}

function screen(w, h, lines, tint = "#4dff9e") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const c = canvas.getContext("2d");
  c.fillStyle = "#03120c";
  c.fillRect(0, 0, 256, 160);
  c.strokeStyle = tint;
  c.lineWidth = 4;
  c.strokeRect(4, 4, 248, 152);
  c.fillStyle = tint;
  c.font = "20px monospace";
  lines.forEach((t, i) => c.fillText(t, 16, 42 + i * 34));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

function marbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  c.fillStyle = "#c9c4b6";
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = "rgba(90,86,74,0.55)";
  c.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    c.beginPath();
    c.moveTo(i, 0);
    c.lineTo(i, 256);
    c.stroke();
    c.beginPath();
    c.moveTo(0, i);
    c.lineTo(256, i);
    c.stroke();
  }
  for (let i = 0; i < 30; i++) {
    c.strokeStyle = `rgba(120,116,104,${0.08 + Math.random() * 0.18})`;
    c.beginPath();
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    c.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Matrix metal that runs the whole length: floor guide strips, overhead beams
// and pipes, and pillars, so the walk between scenes is never a void.
function corridor(env, zTop, zBottom) {
  const length = zTop - zBottom;
  const midZ = (zTop + zBottom) / 2;
  for (const x of [-4.6, 4.6]) {
    const strip = box(0.1, 0.05, length, 0x123a2c, { emissive: true });
    strip.position.set(x, -1.93, midZ);
    env.add(strip);
  }
  for (const x of [-13, -12.4, 12.4, 13]) {
    env.add(pipe(midZ, { x, y: x < 0 ? 7.3 : 6.9, len: length, r: 0.16, color: 0x1a242e }));
  }
  let n = 0;
  for (let z = zTop - 6; z > zBottom + 2; z -= 9) {
    const beam = box(31, 0.35, 0.55, 0x11161e);
    beam.position.set(0, 8.9, z);
    env.add(beam);
    const bar = box(15, 0.12, 0.26, CYAN, { emissive: true });
    bar.position.set(0, 8.5, z);
    env.add(bar);
    if (n % 3 === 0) env.add(point(0x6cf0ff, 7, 26, 0, 8.1, z));
    for (const x of [-11.6, 11.6]) {
      const post = cyl(0.13, 0.16, 9.6, 0x161d26);
      post.position.set(x, 2.9, z);
      env.add(post);
    }
    if (n % 2 === 0) env.add(cable(0, 7.7, z - 4, 26, 0x1c2630));
    n++;
  }
  for (let z = zTop - 13; z > zBottom; z -= 17) {
    const grate = box(5.2, 0.06, 2.2, 0x0a0e12);
    grate.position.set(0, -1.9, z);
    env.add(grate);
    for (let i = 0; i < 5; i++) {
      const slat = box(5.2, 0.08, 0.08, 0x04070a);
      slat.position.set(0, -1.87, z - 0.9 + i * 0.45);
      env.add(slat);
    }
  }
}

function dust(env, zTop, zBottom, color = 0x9fd8c0) {
  const count = 900;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 42;
    pos[i * 3 + 1] = -1 + Math.random() * 10;
    pos[i * 3 + 2] = zBottom + Math.random() * (zTop - zBottom);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  env.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color, size: 0.045, transparent: true, opacity: 0.32 })
    )
  );
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
      env.add(neon, point(neons[i % 4], 13, 36, neon.position.x, neon.position.y + 1, neon.position.z));
    }
    env.add(b);
  }
  for (let i = 0; i < 6; i++) {
    const x = i % 2 ? -14 : 14;
    const post = cyl(0.08, 0.08, 5, 0x1c2830);
    post.position.set(x, 0.5, 2 - i * 5.5);
    env.add(post);
    if (i % 2 === 0) env.add(point(0x6cf0ff, 11, 30, x, 4.4, 2 - i * 5.5));
  }
  // storefronts with lit windows along both kerbs
  for (let i = 0; i < 7; i++) {
    const sx = i % 2 === 0 ? -1 : 1;
    const z = 1 - i * 4.5;
    const shop = box(0.7, 3.6, 9, 0x0c1218);
    shop.position.set(sx * 17.5, -0.2, z);
    env.add(shop);
    for (let w = 0; w < 3; w++) {
      const win = box(0.14, 2.1, 2.1, 0x1c3340, { emissive: true });
      win.position.set(sx * 17.1, 0.1, z - 2.6 + w * 2.6);
      env.add(win);
    }
    const awning = box(1.6, 0.18, 9.4, i % 2 ? 0x5a1030 : 0x0f3a44);
    awning.position.set(sx * 16.7, 1.8, z);
    env.add(awning);
  }
  for (let i = 0; i < 4; i++) env.add(cable(0, 7.6 + i * 0.35, 0 - i * 6, 34, 0x1a222a));
  for (let i = 0; i < 5; i++) {
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(1.4 + Math.random(), 18),
      new THREE.MeshStandardMaterial({ color: 0x0a1a24, metalness: 0.9, roughness: 0.15 })
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set((Math.random() - 0.5) * 18, -1.9, -3 - i * 5);
    env.add(puddle);
  }
  env.add(backWall(44, 16, 0x0a0e14));
  env.add(point(0x8fc8ff, 11, 80, 0, 9, -6));
  env.add(point(CYAN, 13, 42, CARD_X, 4.5, CARD_LOCAL_Z + 3));

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
  const marble = new THREE.Mesh(
    new THREE.PlaneGeometry(42, 36),
    new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.45, metalness: 0.1 })
  );
  marble.rotation.x = -Math.PI / 2;
  marble.position.set(0, -1.97, -10);
  env.add(marble);
  for (const side of [-17, 17]) {
    for (let i = 0; i < 6; i++) {
      const column = cyl(0.7, 0.8, 11, 0xd8d2c4);
      column.position.set(side, 3.5 - 2, 2 - i * 5);
      env.add(column);
      const base = box(1.4, 0.4, 1.4, 0xb8b2a4);
      base.position.set(side, -1.8, 2 - i * 5);
      env.add(base);
    }
  }
  env.add(backWall(40, 16, 0x1a1e26));
  env.add(point(0xbcd4ff, 28, 120, 0, 10, -8));
  env.add(point(0x9fb8e0, 11, 90, 0, 4, 2));

  // chandelier over the middle of the hall
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.09, 8, 36),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, metalness: 0.7, roughness: 0.3 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 7, -8);
  env.add(ring);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bulb = box(0.16, 0.42, 0.16, 0xfff2c0, { emissive: true });
    bulb.position.set(Math.cos(a) * 2.4, 6.6, -8 + Math.sin(a) * 2.4);
    env.add(bulb);
  }
  env.add(point(0xfff2c0, 26, 70, 0, 6.4, -8));
  env.add(plant(-13.5, -13), plant(13.5, -13), plant(-13.5, 1), plant(13.5, 1));

  for (const sx of [-18.5, 18.5]) {
    for (let i = 0; i < 3; i++) {
      const frame = box(0.16, 2.4, 1.8, 0x4a4436);
      frame.position.set(sx, 2.4, -2 - i * 6);
      env.add(frame);
      const art = box(0.1, 2, 1.4, i % 2 ? 0x3a5a7a : 0x6a4a3a, { emissive: true });
      art.position.set(sx + (sx < 0 ? 0.1 : -0.1), 2.4, -2 - i * 6);
      env.add(art);
    }
  }
  for (const x of [-6, 6]) {
    const post = cyl(0.09, 0.09, 1.1, 0x2a2418);
    post.position.set(x, -1.4, -12);
    env.add(post);
  }
  env.add(cable(0, -0.9, -12, 12, 0x5a1f1f));

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
  env.add(point(0xffffff, 32, 110, 0, 7, -4));
  env.add(point(0xffffff, 22, 90, -16, 9, -14));
  env.add(point(0xffffff, 22, 90, 16, 9, -14));

  const cgrid = new THREE.GridHelper(80, 40, 0xcfd6d2, 0xcfd6d2);
  cgrid.material.transparent = true;
  cgrid.material.opacity = 0.22;
  cgrid.position.y = 9;
  env.add(cgrid);

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

  const prims = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.7, 20, 20),
    new THREE.TetrahedronGeometry(0.95),
    new THREE.TorusGeometry(0.7, 0.2, 8, 20),
  ];
  const floaters = [];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(
      prims[i % prims.length],
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })
    );
    m.position.set((Math.random() - 0.5) * 34, 2.5 + Math.random() * 6, -5 - Math.random() * 22);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    env.add(m);
    floaters.push({ m, spin: (Math.random() - 0.5) * 0.5 });
  }

  const cube = prop(box(0.5, 0.5, 0.5, 0x0a0a0a), "Anything you can imagine, we can put you in.");
  cube.position.set(CARD_X, 1, 3);
  env.add(cube);

  return {
    env,
    props: [cube],
    animate: (dt) => {
      for (const { m, spin } of floaters) m.rotation.y += spin * dt;
    },
  };
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
  for (let i = 0; i < 8; i++) {
    env.add(
      crate(
        (Math.random() < 0.5 ? -1 : 1) * (13 + Math.random() * 4),
        -1.2,
        -3 - i * 3,
        1 + Math.random() * 0.9,
        0x16242a
      )
    );
  }
  for (const sx of [-15.5, 15.5]) {
    for (let i = 0; i < 3; i++) {
      const bank = box(1.2, 3, 4.5, 0x0a1418);
      bank.position.set(sx, 1, -4 - i * 8);
      env.add(bank);
      const scr = screen(3.6, 2.2, ["LINK 98%", "HULL OK", "O2 21%"]);
      scr.position.set(sx + (sx < 0 ? 0.65 : -0.65), 1.6, -4 - i * 8);
      scr.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      env.add(scr);
    }
  }
  env.add(pipe(-8, { x: -9, y: 6.6, len: 34, r: 0.22, color: 0x1a262e }));
  env.add(pipe(-8, { x: 9, y: 6.6, len: 34, r: 0.22, color: 0x1a262e }));
  for (let i = 0; i < 5; i++) env.add(cable(0, 8 + i * 0.3, -4 - i * 5, 30, 0x1b242c));

  const alert = point(RED, 20, 70, 0, 6, -10);
  env.add(alert, point(GREEN, 12, 50, 0, 3, -22));
  env.add(point(0x3a5a66, 11, 80, 0, 7, -2));

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
  const lampLight = point(0xffc98a, 24, 64, -6, 3, 4);
  env.add(lampLight);
  const lamp2 = cyl(0.12, 0.34, 1.8, 0xffd9a0, { emissive: true });
  lamp2.position.set(9, 0.9, 4);
  env.add(lamp2, point(0xffc98a, 18, 54, 9, 3, 4), point(0xffdcae, 11, 70, 0, 5, -4));

  const shelf = box(0.7, 5.2, 6, 0x3a2717);
  shelf.position.set(-16.5, 0.5, -4);
  env.add(shelf);
  for (let i = 0; i < 5; i++) {
    const row = box(0.4, 0.5, 5.2, [0x6a4a3a, 0x4a5a3a, 0x5a3b2a, 0x3a4a5a, 0x6a5a3a][i]);
    row.position.set(-16.1, -0.7 + i * 1.1, -4);
    env.add(row);
  }
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 5),
    new THREE.MeshStandardMaterial({ color: 0x6a2f2a, roughness: 1 })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(5, -1.92, -4);
  env.add(rug);
  env.add(plant(-13, -12, 1.1), plant(13, -12, 1.1));
  for (const sx of [-17.5, 17.5]) {
    for (let i = 0; i < 3; i++) {
      const frame = box(0.16, 2, 1.5, 0x3a2717);
      frame.position.set(sx, 2.2, 0 - i * 6);
      env.add(frame);
      const art = box(0.1, 1.6, 1.1, [0x7a4a3a, 0x4a6a5a, 0x5a4a7a][i], { emissive: true });
      art.position.set(sx + (sx < 0 ? 0.1 : -0.1), 2.2, 0 - i * 6);
      env.add(art);
    }
  }
  const counter2 = box(8, 1.1, 1.6, 0x4a3826);
  counter2.position.set(-10, 0.5, -13);
  env.add(counter2);
  for (let i = 0; i < 5; i++) {
    const jar = cyl(0.18, 0.18, 0.5, 0xbfb06a, { emissive: true });
    jar.position.set(-13 + i * 1.4, 1.3, -13);
    env.add(jar);
  }

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
  const glow = point(0xffb457, 20, 64, 0, 5, -8);
  env.add(glow, point(0xffcf8a, 11, 70, 0, 6, -4));

  const bench = box(6, 1, 2, 0x3a2717);
  bench.position.set(-14, 0.4, -6);
  env.add(bench);
  for (let i = 0; i < 4; i++) {
    const lock = box(0.9, 0.9, 0.5, 0x6a5030);
    lock.position.set(-16.5, 1.2 + i * 1, -6);
    env.add(lock);
  }
  for (let i = 0; i < 5; i++) {
    const bulb = box(0.18, 0.3, 0.18, 0xffd9a0, { emissive: true });
    bulb.position.set((Math.random() - 0.5) * 28, 6.6, -5 - i * 4);
    env.add(bulb);
    if (i < 2) env.add(point(0xffd9a0, 6, 18, bulb.position.x, bulb.position.y, bulb.position.z));
  }

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
  const places = [];
  const animators = [];

  env.add(ground(500, 0x0b1018));
  env.add(new THREE.AmbientLight(0x2b3644, 1.5));
  env.add(new THREE.HemisphereLight(0x53617c, 0x0b0f14, 0.75));

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
    places.push({ id: category.id, label: category.label, x: side * CARD_X, z: z + CARD_LOCAL_Z });
  });

  const lastZ = categories.length ? FIRST_Z - (categories.length - 1) * SPACING : FIRST_Z;
  const zTop = FIRST_Z + 12;
  const zBottom = lastZ - 30;
  corridor(env, zTop, zBottom);
  dust(env, zTop, zBottom);

  return {
    env,
    layout: { panels, headers },
    places,
    spawn: [0, 1.7, FIRST_Z + 11],
    look: [0, 1.7, FIRST_Z - 8],
    bounds: { x: 14, zMin: lastZ - 34, zMax: FIRST_Z + 13 },
    fog: [0x02060a, 0.024],
    background: 0x03060c,
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
