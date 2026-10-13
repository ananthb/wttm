import * as THREE from "three";

const GREEN = 0x4dff9e;
const GREEN_DIM = 0x1f7a4d;
const RED = 0xff3b5c;
const BLUE = 0x3b7bff;
const CYAN = 0x6cf0ff;

const ACCENTS = {
  apps: 0x6cf0ff,
  media: 0xff8f3b,
  websites: 0x8f7bff,
  platform: 0x4dff9e,
  homeassistant: 0x3bd1ff,
  build: 0xffd23b,
};

const TIER_Z = { 0: 0, 1: -6, 2: -12 };
const CARD_W = 2.0;
const CARD_H = 1.25;
const GRID_X = 2.35;
const GRID_Y = 1.7;
const GLYPHS = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

const reduced =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function colorToCss(hex) {
  return "#" + hex.toString(16).padStart(6, "0");
}

function rainTexture() {
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
  tex.repeat.set(6, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelSprite(text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.font = "600 54px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = colorToCss(color);
  ctx.shadowBlur = 26;
  ctx.fillStyle = colorToCss(color);
  ctx.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  sprite.scale.set(2.6, 0.65, 1);
  return sprite;
}

function cardTexture(app) {
  const w = 512;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(8,26,32,0.96)");
  bg.addColorStop(1, "rgba(3,12,16,0.96)");
  ctx.fillStyle = bg;
  roundedRect(ctx, 6, 6, w - 12, h - 12, 26);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(77,255,158,0.35)";
  roundedRect(ctx, 6, 6, w - 12, h - 12, 26);
  ctx.stroke();

  if (app.icon) {
    ctx.font = "96px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "#eafff4";
    ctx.fillText(app.icon, 104, h / 2 + 4);
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6;
  ctx.font = "600 46px monospace";
  ctx.fillStyle = "#d9ffe9";
  ctx.fillText(app.title.slice(0, 16), 190, 150);

  ctx.shadowBlur = 0;
  ctx.font = "26px monospace";
  ctx.fillStyle = "rgba(120,200,165,0.9)";
  const desc = app.description || "";
  ctx.fillText(desc.slice(0, 26), 190, 200);

  ctx.strokeStyle = "rgba(77,255,158,0.6)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(190, 232);
  ctx.lineTo(190 + Math.min(desc.length, 26) * 15.6, 232);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

class WttmScene extends HTMLElement {
  constructor() {
    super();
    this.phase = "attract";
    this.catalog = null;
    this.panels = [];
    this.pills = [];
    this.interactives = [];
    this.hovered = null;
    this.pointer = new THREE.Vector2();
    this.parallax = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.depth = 0;
    this.drag = null;
    this.intro = 0;
    this.visible = false;
    this.time = 0;
  }

  connectedCallback() {
    if (this.renderer) return;
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      this.emit({ type: "ready" });
      return;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);
    this.camera.position.set(0, 1.6, 6);
    this.lookTarget = new THREE.Vector3(0, 1.5, -2);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x02060a, 0.028);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    this.buildWorld();
    this.buildPills();

    this.onResize = () => this.resize();
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.onPointerDown = (e) => this.handlePointerDown(e);
    this.onPointerUp = (e) => this.handlePointerUp(e);
    this.onWheel = (e) => this.handleWheel(e);

    addEventListener("resize", this.onResize);
    this.addEventListener("pointermove", this.onPointerMove);
    this.addEventListener("pointerdown", this.onPointerDown);
    addEventListener("pointerup", this.onPointerUp);
    this.addEventListener("wheel", this.onWheel, { passive: true });

    this.resize();
    this.emit({ type: "ready" });
    this.loop = () => {
      this.raf = requestAnimationFrame(this.loop);
      this.frame();
    };
    this.loop();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    removeEventListener("resize", this.onResize);
    removeEventListener("pointerup", this.onPointerUp);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  emit(detail) {
    this.dispatchEvent(new CustomEvent("wttm", { detail, bubbles: true, composed: true }));
  }

  send(msg) {
    if (!msg || !this.scene) return;
    if (msg.type === "catalog") {
      this.catalog = msg;
      this.buildPanels();
    } else if (msg.type === "enter") {
      this.enter();
    } else if (msg.type === "reset") {
      this.reset();
    }
  }

  buildWorld() {
    const ambient = new THREE.AmbientLight(0x223a2c, 1.4);
    this.scene.add(ambient);

    const key = new THREE.PointLight(GREEN, 18, 60);
    key.position.set(0, 6, -4);
    this.scene.add(key);

    this.rain = rainTexture();
    const rainMat = new THREE.MeshBasicMaterial({
      map: this.rain,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rainPlane = new THREE.Mesh(new THREE.PlaneGeometry(140, 70), rainMat);
    rainPlane.position.set(0, 8, -30);
    this.scene.add(rainPlane);
    this.rainPlane = rainPlane;

    const grid = new THREE.GridHelper(120, 60, GREEN_DIM, 0x0a2a1c);
    grid.material.transparent = true;
    grid.material.opacity = 0.28;
    grid.position.y = -2;
    this.scene.add(grid);
    this.grid = grid;

    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 - 4;
      positions[i * 3 + 2] = -Math.random() * 50;
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pmat = new THREE.PointsMaterial({
      color: GREEN,
      size: 0.06,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.scene.add(new THREE.Points(pgeo, pmat));
  }

  buildPills() {
    this.pills = [
      this.makePill(RED, "red", -1.5),
      this.makePill(BLUE, "blue", 1.5),
    ];
  }

  makePill(color, id, x) {
    const group = new THREE.Group();
    group.position.set(x, 1.25, 0);

    const geo = new THREE.CapsuleGeometry(0.26, 0.5, 12, 24);
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.4,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = Math.PI / 2;
    group.add(mesh);

    const glow = new THREE.PointLight(color, 6, 8);
    group.add(glow);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 24, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(halo);

    const label = labelSprite(id.toUpperCase() + " PILL", color);
    label.position.set(0, -0.75, 0);
    group.add(label);

    mesh.userData = { kind: "pill", id };
    this.interactives.push(mesh);
    this.scene.add(group);
    return { group, mesh, halo, label, glow, id };
  }

  buildPanels() {
    for (const p of this.panels) {
      this.scene.remove(p.group);
      p.mesh.geometry.dispose();
      p.mesh.material.map?.dispose();
      p.mesh.material.dispose();
    }
    this.panels = [];
    this.interactives = this.pills.map((p) => p.mesh);
    if (!this.catalog) return;

    const byTier = new Map();
    for (const category of this.catalog.categories) {
      const tier = category.tier ?? 0;
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(category);
    }

    for (const [tier, categories] of byTier) {
      const z = TIER_Z[tier] ?? 0;
      categories.forEach((category, ci) => {
        const apps = category.apps ?? [];
        const cols = apps.length <= 1 ? 1 : apps.length <= 4 ? 2 : 3;
        const rows = Math.ceil(apps.length / cols);
        const gridW = cols * GRID_X;
        const gridH = rows * GRID_Y;
        const cx = (ci - (categories.length - 1) / 2) * (gridW + 2.6);

        const accent = ACCENTS[category.id] ?? GREEN;
        const header = labelSprite(category.label.toUpperCase(), accent);
        header.position.set(cx, 0.95 + (rows / 2) * GRID_Y + 0.55, z);
        header.userData = { kind: "header" };
        this.scene.add(header);

        apps.forEach((app, i) => {
          const col = i % cols;
          const row = (i / cols) | 0;
          const x = cx + (col - (cols - 1) / 2) * GRID_X;
          const y = 0.95 + ((rows - 1) / 2 - row) * GRID_Y;
          const mesh = this.makeCard(app, accent);
          mesh.position.set(x, y, z);
          mesh.scale.setScalar(0.001);
          mesh.visible = false;
          mesh.userData = { kind: "app", id: app.id, baseY: y, accent };
          const ring = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.PlaneGeometry(CARD_W, CARD_H)),
            new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0 })
          );
          mesh.add(ring);
          this.scene.add(mesh);
          this.interactives.push(mesh);
          this.panels.push({ group: mesh, mesh, ring, base: { x, y, z }, appId: app.id });
        });
      });
    }
  }

  makeCard(app, accent) {
    const geo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const mat = new THREE.MeshBasicMaterial({
      map: cardTexture(app),
      transparent: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { accent, appId: app.id };
    return mesh;
  }

  enter() {
    if (this.phase === "inside") return;
    this.phase = "inside";
    this.intro = 1;
    for (const panel of this.panels) {
      panel.mesh.visible = true;
      panel.mesh.scale.setScalar(0.001);
    }
  }

  reset() {
    this.phase = "attract";
    this.intro = 0;
    for (const pill of this.pills) pill.group.visible = true;
    for (const panel of this.panels) panel.mesh.visible = false;
  }

  resize() {
    if (!this.renderer) return;
    const w = this.clientWidth || innerWidth;
    const h = this.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  handlePointerMove(e) {
    const rect = this.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    this.pointer.set(nx, -ny);
    if (!reduced) {
      this.parallax.set(nx * 0.7, -ny * 0.4);
    }
    if (this.drag) {
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.look.set(
        clamp(this.drag.lx + dx * 0.0016, -0.22, 0.22),
        clamp(this.drag.ly - dy * 0.0016, -0.16, 0.16)
      );
    }
  }

  handlePointerDown(e) {
    this.drag = { x: e.clientX, y: e.clientY, lx: this.look.x, ly: this.look.y, moved: 0 };
  }

  handlePointerUp(e) {
    if (!this.drag) return;
    const moved = Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y);
    this.drag = null;
    if (moved > 8) return;
    const hit = this.pick();
    if (!hit) return;
    if (hit.userData.kind === "pill") {
      this.emit({ type: "pill", pill: hit.userData.id });
    } else if (hit.userData.kind === "app") {
      if (this.phase === "inside") this.emit({ type: "open", id: hit.userData.id });
    }
  }

  handleWheel(e) {
    if (this.phase !== "inside") return;
    this.depth = clamp(this.depth + e.deltaY * 0.0012, -1, 1);
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactives, false);
    for (const hit of hits) {
      // Raycaster ignores an object's ancestors, so a card hidden inside an
      // invisible group would still be picked without this walk.
      let node = hit.object;
      let shown = true;
      while (node) {
        if (!node.visible) {
          shown = false;
          break;
        }
        node = node.parent;
      }
      if (shown) return hit.object;
    }
    return null;
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt;

    if (this.rain) this.rain.offset.y -= dt * 0.35;

    const hit = this.pick();
    const hitId = hit ? hit.userData.id ?? hit.userData.appId : null;
    if (hitId !== this.hovered) {
      this.hovered = hitId;
      this.style.cursor = hitId ? "pointer" : "default";
      if (hitId) this.emit({ type: "hover", id: hitId });
    }

    this.animatePills(dt);
    this.animatePanels(dt, hit);
    this.animateCamera(dt);

    this.renderer.render(this.scene, this.camera);
  }

  animatePills(dt) {
    for (const pill of this.pills) {
      const visible = this.phase === "attract";
      pill.group.visible = visible;
      if (!visible) continue;
      pill.group.position.y = 1.25 + Math.sin(this.time * 1.6 + (pill.id === "red" ? 0 : 1.5)) * 0.12;
      pill.group.rotation.y += dt * 0.6;
      const hot = this.hovered === pill.id;
      const target = hot ? 1.18 : 1;
      pill.group.scale.setScalar(lerp(pill.group.scale.x, target, 0.15));
      pill.mesh.material.emissiveIntensity = lerp(
        pill.mesh.material.emissiveIntensity,
        hot ? 1.4 : 0.75,
        0.15
      );
      pill.halo.material.opacity = lerp(pill.halo.material.opacity, hot ? 0.28 : 0.12, 0.15);
    }
  }

  animatePanels(dt, hit) {
    this.intro = clamp(this.intro - dt * 0.7, 0, 1);
    const reveal = 1 - easeOut(this.intro);
    for (const panel of this.panels) {
      const { mesh, ring, base } = panel;
      mesh.quaternion.copy(this.camera.quaternion);
      const hot = hit === mesh;
      const bob = Math.sin(this.time * 1.1 + base.x * 1.7) * 0.05;
      mesh.position.y = base.y + bob;
      const target = hot ? 1.12 : 1;
      mesh.scale.setScalar(lerp(mesh.scale.x, target * reveal, 0.12));
      ring.material.opacity = lerp(ring.material.opacity, hot ? 0.9 : 0, 0.15);
    }
  }

  animateCamera(dt) {
    const bob = reduced ? 0 : Math.sin(this.time * 0.8) * 0.03;
    const rush = this.intro * -3;
    const targetX = this.parallax.x * 0.5;
    const targetY = 1.6 + this.parallax.y * 0.35 + bob;
    const targetZ = 6 - this.depth * 4.5 + rush;

    this.camera.position.x = lerp(this.camera.position.x, targetX, 0.06);
    this.camera.position.y = lerp(this.camera.position.y, targetY, 0.06);
    this.camera.position.z = lerp(this.camera.position.z, targetZ, 0.06);

    const yaw = this.look.x + this.parallax.x * 0.04;
    const pitch = this.look.y + this.parallax.y * 0.04;
    this.camera.lookAt(
      this.lookTarget.x + yaw * 8,
      this.lookTarget.y + pitch * 8,
      this.lookTarget.z
    );
  }
}

customElements.define("wttm-scene", WttmScene);
