import * as THREE from "three";

const GREEN = 0x4dff9e;
const GREEN_DIM = 0x1f7a4d;
const RED = 0xff3b5c;
const BLUE = 0x3b7bff;

const ACCENTS = {
  apps: 0x6cf0ff,
  media: 0xff8f3b,
  websites: 0x8f7bff,
  platform: 0x4dff9e,
  homeassistant: 0x3bd1ff,
  build: 0xffd23b,
};

const TIER_Z = { 0: -4, 1: -9, 2: -14 };
const EYE_Y = 1.7;
const CARD_W = 2.0;
const CARD_H = 1.25;
const GRID_X = 2.35;
const GRID_Y = 1.7;
const GLYPHS = "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

// The opening: over Neo's shoulder, then down to the desk and the pills.
const ATTRACT_START = new THREE.Vector3(1.05, 2.05, 3.4);
const ATTRACT_END = new THREE.Vector3(0.4, 1.74, 1.85);
const ATTRACT_LOOK = new THREE.Vector3(0.1, 1.4, 0.2);
const GALLERY_START = new THREE.Vector3(0, 1.6, -1);
const GALLERY_LOOK = new THREE.Vector3(0, 1.6, -9);
const ATTRACT_ZOOM = 3.5;
const ENTER_DURATION = 1.7;

// Movement stays small, but covers the whole gallery.
const BOUNDS = { x: 8.5, zMin: -15.5, zMax: 1.5 };
const SPEED = 6.5;
const LOOK = 0.0022;

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

function labelSprite(text, color, width = 2.6) {
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
  sprite.scale.set(width, width * 0.25, 1);
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
    this.stage = "attract";
    this.catalog = null;
    this.panels = [];
    this.headers = [];
    this.pills = [];
    this.interactives = [];
    this.hovered = null;
    this.pointer = new THREE.Vector2();
    this.look = new THREE.Vector2();
    this.keys = {};
    this.vel = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0;
    this.time = 0;
    this.introT = 0;
    this.enterT = 0;
    this.locked = false;
    this.suppressClick = false;
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

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
    this.camera.position.copy(ATTRACT_START);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x02060a, 0.026);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    this.buildWorld();
    this.buildIntro();

    this.onResize = () => this.resize();
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.onPointerDown = (e) => this.handlePointerDown(e);
    this.onPointerUp = (e) => this.handlePointerUp(e);
    this.onKeyDown = (e) => {
      this.keys[e.code] = true;
    };
    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    this.onLockChange = () => {
      this.locked = document.pointerLockElement === this.renderer.domElement;
      this.style.cursor = this.locked ? "none" : "default";
    };

    addEventListener("resize", this.onResize);
    addEventListener("pointerup", this.onPointerUp);
    addEventListener("keydown", this.onKeyDown);
    addEventListener("keyup", this.onKeyUp);
    document.addEventListener("pointerlockchange", this.onLockChange);
    this.addEventListener("pointermove", this.onPointerMove);
    this.addEventListener("pointerdown", this.onPointerDown);
    this.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

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
    removeEventListener("keydown", this.onKeyDown);
    removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("pointerlockchange", this.onLockChange);
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
    this.scene.add(new THREE.AmbientLight(0x223a2c, 1.4));

    const key = new THREE.PointLight(GREEN, 16, 60);
    key.position.set(0, 6, -4);
    this.scene.add(key);

    this.rain = rainTexture();
    const rainMat = new THREE.MeshBasicMaterial({
      map: this.rain,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rainPlane = new THREE.Mesh(new THREE.PlaneGeometry(140, 70), rainMat);
    rainPlane.position.set(0, 8, -30);
    this.scene.add(rainPlane);

    const grid = new THREE.GridHelper(120, 60, GREEN_DIM, 0x0a2a1c);
    grid.material.transparent = true;
    grid.material.opacity = 0.26;
    grid.position.y = -2;
    this.scene.add(grid);

    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 - 4;
      positions[i * 3 + 2] = -Math.random() * 50;
    }
    const pgeo = new THREE.BufferGeometry();
    pgeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.scene.add(
      new THREE.Points(
        pgeo,
        new THREE.PointsMaterial({
          color: GREEN,
          size: 0.06,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        })
      )
    );
  }

  buildIntro() {
    const group = new THREE.Group();
    this.introGroup = group;

    const dark = new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.85, metalness: 0.1 });
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x0e1a1c, roughness: 1 });

    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.2), deskMat);
    desk.position.set(0, 1.0, 0.35);
    group.add(desk);
    for (const lx of [-1.45, 1.45]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 1.0), dark);
      leg.position.set(lx, 0.5, 0.35);
      group.add(leg);
    }

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 0.1), dark);
    monitor.position.set(0, 1.55, 0.0);
    group.add(monitor);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), dark);
    stand.position.set(0, 1.28, 0.02);
    group.add(stand);

    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 512;
    screenCanvas.height = 340;
    const sctx = screenCanvas.getContext("2d");
    sctx.fillStyle = "#020806";
    sctx.fillRect(0, 0, 512, 340);
    sctx.font = "22px monospace";
    sctx.fillStyle = "#4dff9e";
    const lines = [
      "> wake up, neo...",
      "> the matrix has you",
      "> follow the white rabbit",
      "> knock, knock, neo.",
    ];
    lines.forEach((line, i) => sctx.fillText(line, 28, 70 + i * 46));
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.34, 0.86),
      new THREE.MeshBasicMaterial({ map: screenTex })
    );
    screen.position.set(0, 1.55, 0.06);
    group.add(screen);
    const screenGlow = new THREE.PointLight(GREEN, 3, 6);
    screenGlow.position.set(0, 1.5, 0.6);
    group.add(screenGlow);

    const figure = new THREE.Group();
    figure.position.set(0, 0, 1.25);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 12, 20), dark);
    torso.position.set(0, 1.0, 0);
    figure.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), dark);
    head.position.set(0, 1.52, -0.04);
    figure.add(head);
    group.add(figure);

    this.scene.add(group);

    this.pills = [this.makePill(RED, "red", -0.72), this.makePill(BLUE, "blue", 0.72)];
    for (const pill of this.pills) group.add(pill.group);
    this.pillsGroup = group;
  }

  makePill(color, id, x) {
    const group = new THREE.Group();
    group.position.set(x, 1.16, 0.62);

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      roughness: 0.28,
      metalness: 0.4,
      transparent: true,
    });
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.44, 12, 24), mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.userData = { kind: "pill", id };
    group.add(mesh);

    const glow = new THREE.PointLight(color, 5, 7);
    group.add(glow);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    group.add(halo);

    const label = labelSprite(id.toUpperCase() + " PILL", color, 2.2);
    label.position.set(0, -0.62, 0);
    group.add(label);

    this.interactives.push(mesh);
    return { group, mesh, halo, label, id };
  }

  buildPanels() {
    for (const panel of this.panels) {
      this.scene.remove(panel.mesh);
      panel.mesh.geometry.dispose();
      panel.mesh.material.map?.dispose();
      panel.mesh.material.dispose();
    }
    for (const header of this.headers) this.scene.remove(header);
    this.panels = [];
    this.headers = [];
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
        const cx = (ci - (categories.length - 1) / 2) * (gridW + 2.6);
        const accent = ACCENTS[category.id] ?? GREEN;

        const header = labelSprite(category.label.toUpperCase(), accent, 3.0);
        header.position.set(cx, EYE_Y + (rows / 2) * GRID_Y + 0.7, z);
        header.visible = false;
        this.scene.add(header);
        this.headers.push(header);

        apps.forEach((app, i) => {
          const col = i % cols;
          const row = (i / cols) | 0;
          const x = cx + (col - (cols - 1) / 2) * GRID_X;
          const y = EYE_Y + ((rows - 1) / 2 - row) * GRID_Y;
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
          this.panels.push({ mesh, ring, base: { x, y, z }, appId: app.id });
        });
      });
    }
  }

  makeCard(app, accent) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, CARD_H),
      new THREE.MeshBasicMaterial({ map: cardTexture(app), transparent: true, side: THREE.DoubleSide })
    );
    mesh.userData = { accent, appId: app.id };
    return mesh;
  }

  enter() {
    if (this.stage === "inside" || this.stage === "entering") return;
    this.stage = "entering";
    this.enterT = 0;
    this.introGroup.visible = false;
    this.emit({ type: "entered" });
  }

  reset() {
    this.stage = "attract";
    this.introT = 0;
    this.enterT = 0;
    this.introGroup.visible = true;
    for (const panel of this.panels) panel.mesh.visible = false;
    for (const header of this.headers) header.visible = false;
    for (const pill of this.pills) pill.group.visible = true;
    this.camera.position.copy(ATTRACT_START);
    if (this.locked) document.exitPointerLock();
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
    if (this.locked) {
      this.yaw -= e.movementX * LOOK;
      this.pitch = clamp(this.pitch - e.movementY * LOOK, -0.9, 0.9);
      return;
    }
    const rect = this.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );
  }

  handlePointerDown() {
    if (this.stage === "inside" && !this.locked) {
      this.renderer.domElement.requestPointerLock();
      this.suppressClick = true;
    }
  }

  handlePointerUp(e) {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const hit = this.pick();
    if (!hit) return;
    if (hit.userData.kind === "pill") {
      if (hit.userData.id === "red") this.renderer.domElement.requestPointerLock();
      this.emit({ type: "pill", pill: hit.userData.id });
    } else if (hit.userData.kind === "app" && this.stage === "inside") {
      this.emit({ type: "open", id: hit.userData.id });
    }
  }

  pick() {
    const ndc = this.locked ? new THREE.Vector2(0, 0) : this.pointer;
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactives, false);
    for (const hit of hits) {
      // Raycaster ignores ancestors, so a card in an invisible group would
      // still be picked without this walk.
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
    const hitId = hit ? hit.userData.id : null;
    if (hitId !== this.hovered) {
      this.hovered = hitId;
      if (!this.locked) this.style.cursor = hitId ? "pointer" : "default";
      if (hitId) this.emit({ type: "hover", id: hitId });
    }

    this.animatePills(dt);
    this.animateStage(dt, hit);
    this.animateCamera(dt);

    this.renderer.render(this.scene, this.camera);
  }

  animatePills(dt) {
    for (const pill of this.pills) {
      if (this.stage !== "attract") continue;
      pill.group.position.y = 1.16 + Math.sin(this.time * 1.6 + (pill.id === "red" ? 0 : 1.5)) * 0.07;
      pill.group.rotation.y += dt * 0.6;
      const hot = this.hovered === pill.id;
      const target = hot ? 1.16 : 1;
      pill.group.scale.setScalar(lerp(pill.group.scale.x, target, 0.15));
      pill.mesh.material.emissiveIntensity = lerp(
        pill.mesh.material.emissiveIntensity,
        hot ? 1.5 : 0.8,
        0.15
      );
      pill.halo.material.opacity = lerp(pill.halo.material.opacity, hot ? 0.28 : 0.12, 0.15);
    }
  }

  animateStage(dt, hit) {
    if (this.stage === "entering") {
      this.enterT = clamp(this.enterT + dt / ENTER_DURATION, 0, 1);
      const reveal = clamp((this.enterT - 0.35) / 0.65, 0, 1);
      for (const header of this.headers) header.visible = reveal > 0;
      for (const panel of this.panels) {
        panel.mesh.visible = reveal > 0;
        panel.mesh.scale.setScalar(Math.max(0.001, easeOut(reveal)));
      }
      if (this.enterT >= 1) this.stage = "inside";
    }
    if (this.stage !== "inside") return;
    for (const panel of this.panels) {
      const { mesh, ring, base } = panel;
      mesh.quaternion.copy(this.camera.quaternion);
      const hot = hit === mesh;
      mesh.position.y = base.y + Math.sin(this.time * 1.1 + base.x * 1.7) * 0.05;
      mesh.scale.setScalar(lerp(mesh.scale.x, hot ? 1.12 : 1, 0.12));
      ring.material.opacity = lerp(ring.material.opacity, hot ? 0.9 : 0, 0.15);
    }
  }

  animateCamera(dt) {
    if (this.stage === "attract") {
      this.introT = clamp(this.introT + dt / ATTRACT_ZOOM, 0, 1);
      const t = easeOut(this.introT);
      const sway = reduced ? 0 : Math.sin(this.time * 0.7) * 0.04;
      this.camera.position.lerpVectors(ATTRACT_START, ATTRACT_END, t);
      this.camera.position.y += sway;
      this.camera.lookAt(ATTRACT_LOOK);
      return;
    }

    if (this.stage === "entering") {
      const t = easeOut(this.enterT);
      this.camera.position.lerpVectors(ATTRACT_END, GALLERY_START, t);
      const look = ATTRACT_LOOK.clone().lerp(GALLERY_LOOK, t);
      this.camera.lookAt(look);
      return;
    }

    this.move(dt);
  }

  move(dt) {
    const forward = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0);
    const strafe = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);

    const ax = (-sin * forward + cos * strafe) * SPEED;
    const az = (-cos * forward - sin * strafe) * SPEED;

    this.vel.x = lerp(this.vel.x, ax, 0.18);
    this.vel.y = lerp(this.vel.y, az, 0.18);

    this.camera.position.x = clamp(
      this.camera.position.x + this.vel.x * dt,
      -BOUNDS.x,
      BOUNDS.x
    );
    this.camera.position.z = clamp(
      this.camera.position.z + this.vel.y * dt,
      BOUNDS.zMin,
      BOUNDS.zMax
    );

    const bob = reduced ? 0 : Math.sin(this.time * 8) * Math.min(0.04, Math.hypot(this.vel.x, this.vel.y) * 0.006);
    this.camera.position.y = 1.6 + bob;
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));
  }
}

customElements.define("wttm-scene", WttmScene);
