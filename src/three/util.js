import * as THREE from "three";

export const GREEN = 0x4dff9e;
export const GREEN_DIM = 0x1f7a4d;
export const RED = 0xff3b5c;
export const BLUE = 0x3b7bff;
export const CYAN = 0x6cf0ff;

export const CARD_W = 2.5;
export const CARD_H = 1.55;
export const GRID_X = 2.85;
export const GRID_Y = 2.0;

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

export function cardTexture(app, accent = GREEN) {
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
    ctx.fillText(app.icon, 128, 200);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  const title = fitText(ctx, app.title || "", 420, 60, 26);
  ctx.font = `600 ${title.size}px monospace`;
  ctx.fillStyle = "#d9ffe9";
  ctx.fillText(title.text, 248, 180);

  ctx.shadowBlur = 0;
  ctx.font = "30px monospace";
  ctx.fillStyle = "rgba(120,200,165,0.9)";
  ctx.fillText(ellipsize(ctx, app.description || "", 400), 248, 236);

  ctx.strokeStyle = "rgba(77,255,158,0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(248, 268);
  ctx.lineTo(560, 268);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
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

// Categories in tiers; every entry is placed so the whole catalog is present
// and reachable. A scene tunes depth, height and arc.
export function layoutCatalog(catalog, opts = {}) {
  const { zForTier = (t) => -4 - t * 5, y = 1.75, arc = 0 } = opts;
  const panels = [];
  const headers = [];
  const byTier = new Map();
  for (const category of catalog.categories) {
    const tier = category.tier ?? 0;
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier).push(category);
  }
  for (const [tier, categories] of byTier) {
    const z = zForTier(tier);
    categories.forEach((category, ci) => {
      const apps = category.apps ?? [];
      const cols = apps.length <= 1 ? 1 : apps.length <= 4 ? 2 : 3;
      const rows = Math.ceil(apps.length / cols);
      const gridW = cols * GRID_X;
      const baseX = (ci - (categories.length - 1) / 2) * (gridW + 3.2);
      apps.forEach((app, i) => {
        const col = i % cols;
        const row = (i / cols) | 0;
        const x = baseX + (col - (cols - 1) / 2) * GRID_X;
        const zz = z + (arc ? Math.abs(baseX) * arc : 0);
        panels.push({ app, categoryId: category.id, x, y: y + ((rows - 1) / 2 - row) * GRID_Y, z: zz });
      });
      headers.push({
        label: category.label,
        accentId: category.id,
        x: baseX,
        y: y + (rows / 2) * GRID_Y + 0.9,
        z,
      });
    });
  }
  return { panels, headers };
}

// A tiny helper for scenes: an unlit, possibly emissive-looking box.
export function box(w, h, d, color, { emissive = false, opacity = 1 } = {}) {
  const mat = emissive
    ? new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.15, transparent: opacity < 1, opacity });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function cyl(rt, rb, h, color, { emissive = false, opacity = 1 } = {}) {
  const mat = emissive
    ? new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3, transparent: opacity < 1, opacity });
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 20), mat);
}
