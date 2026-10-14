import * as THREE from "three";

export const GREEN = 0x4dff9e;
export const GREEN_DIM = 0x1f7a4d;
export const RED = 0xff3b5c;
export const BLUE = 0x3b7bff;
export const CYAN = 0x6cf0ff;

export const CARD_W = 2.2;
export const CARD_H = 1.375;
export const GRID_X = 2.5;
export const GRID_Y = 1.8;


export const ACCENTS = {
  apps: 0x6cf0ff,
  media: 0xff8f3b,
  websites: 0x8f7bff,
  platform: 0x4dff9e,
  homeassistant: 0x3bd1ff,
  build: 0xffd23b,
};

export const GLYPHS =
  "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function colorToCss(hex) {
  return "#" + hex.toString(16).padStart(6, "0");
}

export function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

// Shrink the font until the text fits, then ellipsize as a last resort so a
// long name never spills out of its card.
export function fitText(ctx, text, maxWidth, size, minSize, weight = 600) {
  let s = size;
  ctx.font = `${weight} ${s}px monospace`;
  while (s > minSize && ctx.measureText(text).width > maxWidth) {
    s -= 2;
    ctx.font = `${weight} ${s}px monospace`;
  }
  return { size: s, text: s <= minSize ? ellipsize(ctx, text, maxWidth) : text };
}

export function rainTexture(repeatX = 6, repeatY = 3) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.font = "16px monospace";
  ctx.textBaseline = "top";
  const columns = 16;
  const step = size / columns;
  for (let c = 0; c < columns; c++) {
    const x = c * step + step * 0.15;
    const glyphs = 18;
    for (let i = 0; i < glyphs; i++) {
      const y = (i / glyphs) * size;
      const head = i / glyphs;
      const alpha = clamp(1 - head, 0.06, 1) * (0.35 + Math.random() * 0.65);
      ctx.fillStyle = head > 0.92 ? "rgba(220,255,235,0.95)" : `rgba(77,255,158,${alpha})`;
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function labelSprite(text, color, width = 3) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const f = fitText(ctx, text, 480, 60, 26);
  ctx.font = `600 ${f.size}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = colorToCss(color);
  ctx.shadowBlur = 26;
  ctx.fillStyle = colorToCss(color);
  ctx.fillText(f.text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  sprite.scale.set(width, width * 0.25, 1);
  return sprite;
}

// A card is drawn twice: collapsed shows the icon and name, expanded adds the
// description, so looking at one opens it the way the simple view does.
export function cardTexture(app, accent = GREEN, expanded = false) {
  const w = 640;
  const h = 400;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(8,26,32,0.96)");
  bg.addColorStop(1, "rgba(3,12,16,0.96)");
  ctx.fillStyle = bg;
  roundedRect(ctx, 6, 6, w - 12, h - 12, 30);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(77,255,158,0.35)";
  roundedRect(ctx, 6, 6, w - 12, h - 12, 30);
  ctx.stroke();

  ctx.fillStyle = colorToCss(accent);
  ctx.globalAlpha = 0.85;
  roundedRect(ctx, 0, 34, 8, h - 68, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (app.icon) {
    ctx.font = "110px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#eafff4";
    ctx.fillText(app.icon, 128, expanded ? 200 : 210);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  const title = fitText(ctx, app.title || "", 420, 60, 26);
  ctx.font = `600 ${title.size}px monospace`;
  ctx.fillStyle = "#d9ffe9";
  ctx.fillText(title.text, 248, expanded ? 182 : 210);
  ctx.shadowBlur = 0;

  if (expanded) {
    ctx.font = "30px monospace";
    ctx.fillStyle = "rgba(120,200,165,0.9)";
    ctx.fillText(ellipsize(ctx, app.description || "", 400), 248, 242);

    ctx.strokeStyle = "rgba(77,255,158,0.55)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(248, 280);
    ctx.lineTo(560, 280);
    ctx.stroke();

    ctx.font = "26px monospace";
    ctx.fillStyle = "rgba(120,200,165,0.7)";
    ctx.fillText("click to open", 248, 322);
  } else {
    ctx.textAlign = "right";
    ctx.font = "52px monospace";
    ctx.fillStyle = "rgba(77,255,158,0.6)";
    ctx.fillText("›", 596, 226);
    ctx.textAlign = "left";
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function gridFor(count) {
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  return { cols, rows: Math.ceil(count / cols) || 1 };
}

// One group's block of cards, facing +z and centred at (x, y, z). The world
// gives every group its own scene and lays that scene's cards out with this.
export function layoutCategory(category, { x = 0, y = 2, z = 0 } = {}) {
  const apps = category.apps ?? [];
  const { cols, rows } = gridFor(apps.length);
  const panels = apps.map((app, i) => {
    const col = i % cols;
    const row = (i / cols) | 0;
    return {
      app,
      categoryId: category.id,
      x: x + (col - (cols - 1) / 2) * GRID_X,
      y: y + ((rows - 1) / 2 - row) * GRID_Y,
      z,
    };
  });
  const headers = [
    {
      label: category.label,
      accentId: category.id,
      x,
      y: y + (rows / 2) * GRID_Y + 0.9,
      z,
    },
  ];
  return { panels, headers };
}

export function makeCard(app, accent) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W, CARD_H),
    new THREE.MeshBasicMaterial({
      map: cardTexture(app, accent),
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
}

export function loginTexture(subtitle) {
  const w = 640;
  const h = 400;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(6,30,34,0.97)");
  bg.addColorStop(1, "rgba(2,10,14,0.97)");
  ctx.fillStyle = bg;
  roundedRect(ctx, 6, 6, w - 12, h - 12, 30);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = colorToCss(CYAN);
  roundedRect(ctx, 6, 6, w - 12, h - 12, 30);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = colorToCss(CYAN);
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#eafffb";
  ctx.font = "700 92px monospace";
  ctx.fillText("LOG IN", w / 2, 160);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(150,220,235,0.9)";
  ctx.font = "30px monospace";
  ctx.fillText(subtitle, w / 2, 250);

  ctx.strokeStyle = colorToCss(CYAN);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 90, 300);
  ctx.lineTo(w / 2 + 90, 300);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeLoginPanel(subtitle) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 1.8),
    new THREE.MeshBasicMaterial({
      map: loginTexture(subtitle),
      transparent: true,
      side: THREE.DoubleSide,
    })
  );
  return mesh;
}

// A tiny helper for scenes: an unlit, possibly emissive-looking box.
export function box(w, h, d, color, { emissive = false, opacity = 1, map = null, roughness = 0.85, metalness = 0.15 } = {}) {
  const mat = emissive
    ? new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, map })
    : new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: opacity < 1, opacity, map });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function cyl(rt, rb, h, color, { emissive = false, opacity = 1, map = null, roughness = 0.7, metalness = 0.3 } = {}) {
  const mat = emissive
    ? new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, map })
    : new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: opacity < 1, opacity, map });
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), mat);
}

// Procedural surfaces. Nothing is loaded from disk: each is drawn once to a
// canvas and wrapped in a texture, so a scene reads as material rather than as
// flat-coloured boxes. The canvas is cached; the repeat is per call.
const surfaceCanvases = {};

function surface(key, size, draw, repeat) {
  let canvas = surfaceCanvases[key];
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    draw(canvas.getContext("2d"), size);
    surfaceCanvases[key] = canvas;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function speckle(ctx, size, count, spread = 0) {
  for (let i = 0; i < count; i++) {
    const g = spread ? Math.random() * spread : 0;
    ctx.fillStyle = `rgba(${150 + g},${160 + g},${170 + g},${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.6, 1.6);
  }
}

function drawAsphalt(ctx, s) {
  ctx.fillStyle = "#10151b";
  ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, 5000, 40);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = Math.random() * s;
    let y = Math.random() * s;
    ctx.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (Math.random() - 0.5) * 70;
      y += (Math.random() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawPlate(ctx, s) {
  ctx.fillStyle = "#20262e";
  ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, 1500, 30);
  ctx.strokeStyle = "#141920";
  ctx.lineWidth = 4;
  for (let i = 0; i <= s; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
  }
  ctx.fillStyle = "#39434e";
  for (let x = 32; x < s; x += 64)
    for (let y = 32; y < s; y += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
}

function drawPanel(ctx, s) {
  ctx.fillStyle = "#1a222b";
  ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, 2000, 20);
  ctx.strokeStyle = "#0e151c";
  ctx.lineWidth = 3;
  for (let i = 0; i <= s; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
  }
  ctx.fillStyle = "#2a3540";
  for (let x = 12; x < s; x += 64)
    for (let y = 12; y < s; y += 64) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 40, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.fillStyle = "rgba(90,200,160,0.12)";
  for (let i = 0; i < 10; i++) ctx.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 30 + Math.random() * 40, 6);
}

function drawBrick(ctx, s) {
  ctx.fillStyle = "#241f1a";
  ctx.fillRect(0, 0, s, s);
  const bw = 64;
  const bh = 26;
  for (let row = 0, y = 0; y < s; y += bh, row++) {
    const off = row % 2 ? -bw / 2 : 0;
    for (let x = off; x < s; x += bw) {
      const v = 60 + Math.random() * 40;
      ctx.fillStyle = `rgb(${v + 20},${v},${v - 10})`;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
  speckle(ctx, s, 1500, 15);
}

function drawPlaster(ctx, s) {
  ctx.fillStyle = "#574636";
  ctx.fillRect(0, 0, s, s);
  speckle(ctx, s, 4000, 10);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let i = 0; i < 40; i++) ctx.fillRect(Math.random() * s, Math.random() * s, 20 + Math.random() * 60, 8 + Math.random() * 20);
}

function drawStone(ctx, s) {
  ctx.fillStyle = "#1e1509";
  ctx.fillRect(0, 0, s, s);
  const bw = 84;
  const bh = 42;
  for (let row = 0, y = 0; y < s; y += bh, row++) {
    const off = row % 2 ? -bw / 2 : 0;
    for (let x = off; x < s; x += bw) {
      const v = 40 + Math.random() * 35;
      ctx.fillStyle = `rgb(${v + 30},${v + 12},${v - 6})`;
      ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
  speckle(ctx, s, 2000, 20);
}

function drawWood(ctx, s) {
  ctx.fillStyle = "#3a2717";
  ctx.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 42) {
    const v = 45 + Math.random() * 25;
    ctx.fillStyle = `rgb(${v + 30},${v + 10},${v - 4})`;
    ctx.fillRect(x + 1, 0, 40, s);
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, 0, 40, s);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * s;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 8, s);
    ctx.stroke();
  }
}

function drawGrid(ctx, s) {
  ctx.fillStyle = "#eef1ee";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#c6ccc7";
  ctx.lineWidth = 2;
  for (let i = 0; i <= s; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(s, i);
    ctx.stroke();
  }
}

export function asphaltTexture(repeat = [1, 1]) {
  return surface("asphalt", 256, drawAsphalt, repeat);
}

export function plateTexture(repeat = [1, 1]) {
  return surface("plate", 256, drawPlate, repeat);
}

export function panelTexture(repeat = [1, 1]) {
  return surface("panel", 256, drawPanel, repeat);
}

export function brickTexture(repeat = [1, 1]) {
  return surface("brick", 256, drawBrick, repeat);
}

export function plasterTexture(repeat = [1, 1]) {
  return surface("plaster", 256, drawPlaster, repeat);
}

export function stoneTexture(repeat = [1, 1]) {
  return surface("stone", 256, drawStone, repeat);
}

export function woodTexture(repeat = [1, 1]) {
  return surface("wood", 256, drawWood, repeat);
}

export function gridTexture(repeat = [1, 1]) {
  return surface("grid", 256, drawGrid, repeat);
}
