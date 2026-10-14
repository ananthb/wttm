import * as THREE from "three";
import * as util from "./three/util.js";
import { getScene } from "./three/scenes.js";

const { GREEN, RED, BLUE, ACCENTS, clamp, lerp, easeOut, makeCard, makeLoginPanel, labelSprite, rainTexture, box } = util;

// The opening is fixed: over Neo's shoulder, down to his desk and the pills.
const ATTRACT_START = new THREE.Vector3(1.15, 2.1, 3.5);
const ATTRACT_END = new THREE.Vector3(0.45, 1.78, 1.9);
const ATTRACT_LOOK = new THREE.Vector3(0.1, 1.4, 0.2);
const ATTRACT_ZOOM = 4.0;
const ENTER_DURATION = 1.7;

const SPEED = 7.0;
const LOOK = 0.0024;

const reduced =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

class WttmScene extends HTMLElement {
  constructor() {
    super();
    this.stage = "attract";
    this.sceneId = "downtown";
    this.catalog = null;
    this.def = null;
    this.env = null;
    this.panels = [];
    this.headers = [];
    this.pills = [];
    this.interactives = [];
    this.cardTextures = new Map();
    this.minimapEl = null;
    this.minimapYou = null;
    this.minimapSpan = null;
    this.colliders = [];
    this.loop = null;
    this.hovered = null;
    this.pointer = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0;
    this.keys = {};
    this.vel = new THREE.Vector2();
    this.time = 0;
    this.introT = 0;
    this.enterT = 0;
    this.locked = false;
    this.suppressClick = false;
    this.lastActive = -1;
    this.loggedIn = false;
    this.loginPanel = null;
    this.touchDrag = null;
    this.gyroEnabled = false;
    this.gyroBase = null;
  }

  connectedCallback() {
    if (this.renderer) return;
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      this.emit({ type: "nogl" });
      return;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 260);
    this.camera.position.copy(ATTRACT_START);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);
    this.scene.fog = new THREE.FogExp2(0x02060a, 0.03);

    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock();

    this.buildIntro();

    this.onResize = () => this.resize();
    this.onPointerMove = (e) => this.handlePointerMove(e);
    this.onPointerDown = (e) => this.handlePointerDown(e);
    this.onPointerUp = (e) => this.handlePointerUp(e);
    this.onKeyDown = (e) => {
      this.keys[e.code] = true;
      this.active();
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
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

  // --- messaging -----------------------------------------------------------

  emit(detail) {
    this.dispatchEvent(new CustomEvent("wttm", { detail, bubbles: true, composed: true }));
  }

  active() {
    if (this.time - this.lastActive > 0.5) {
      this.lastActive = this.time;
      this.emit({ type: "active" });
    }
  }

  send(msg) {
    if (!msg || !this.scene) return;
    if (msg.type === "catalog") {
      this.catalog = msg;
      if (this.stage === "inside" || this.stage === "entering") this.loadScene(this.sceneId);
    } else if (msg.type === "scene") {
      this.sceneId = msg.id;
      if (this.stage === "inside" || this.stage === "entering") this.loadScene(this.sceneId);
    } else if (msg.type === "auth") {
      this.loggedIn = !!msg.loggedIn;
      if (this.stage === "inside" || this.stage === "entering") this.loadScene(this.sceneId);
    } else if (msg.type === "input") {
      this.keys[msg.key] = !!msg.down;
      if (msg.down) this.active();
    } else if (msg.type === "enter") {
      this.enter();
    } else if (msg.type === "reset") {
      this.reset();
    }
  }

  // --- intro ---------------------------------------------------------------

  buildIntro() {
    const group = new THREE.Group();
    this.introGroup = group;
    this.scene.add(group);

    const rain = rainTexture();
    this.rain = rain;
    const rainPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 80),
      new THREE.MeshBasicMaterial({ map: rain, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    rainPlane.position.set(0, 8, -28);
    group.add(rainPlane);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    group.add(floor);
    group.add(new THREE.AmbientLight(0x223a2c, 1.3));
    const key = new THREE.PointLight(GREEN, 14, 60);
    key.position.set(0, 6, -4);
    group.add(key);

    const dark = new THREE.MeshStandardMaterial({ color: 0x0b1418, roughness: 0.85, metalness: 0.1 });
    const desk = box(3.4, 0.08, 1.3, 0x0e1a1c);
    desk.position.set(0, 1.0, 0.35);
    group.add(desk);
    for (const lx of [-1.5, 1.5]) {
      const leg = box(0.1, 1.0, 1.1, 0x0b1418);
      leg.position.set(lx, 0.5, 0.35);
      group.add(leg);
    }
    const monitor = box(1.6, 1.05, 0.1, 0x0b1418);
    monitor.position.set(0, 1.58, 0.0);
    group.add(monitor);
    const stand = box(0.2, 0.6, 0.2, 0x0b1418);
    stand.position.set(0, 1.3, 0.02);
    group.add(stand);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 340;
    const sctx = canvas.getContext("2d");
    sctx.fillStyle = "#020806";
    sctx.fillRect(0, 0, 512, 340);
    sctx.font = "22px monospace";
    sctx.fillStyle = "#4dff9e";
    ["Wake up, Neo...", "The Matrix has you...", "Follow the white rabbit.", "Knock, knock, Neo."].forEach((line, i) =>
      sctx.fillText(line, 28, 74 + i * 48)
    );
    const screenTex = new THREE.CanvasTexture(canvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 0.9), new THREE.MeshBasicMaterial({ map: screenTex }));
    screen.position.set(0, 1.58, 0.06);
    group.add(screen);
    const screenGlow = new THREE.PointLight(GREEN, 3, 6);
    screenGlow.position.set(0, 1.5, 0.6);
    group.add(screenGlow);

    const figure = new THREE.Group();
    figure.position.set(0, 0, 1.25);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 12, 20), dark);
    torso.position.set(0, 1.0, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), dark);
    head.position.set(0, 1.52, -0.04);
    figure.add(torso, head);
    group.add(figure);

    this.pills = [this.makePill(RED, "red", -0.78), this.makePill(BLUE, "blue", 0.78)];
    for (const pill of this.pills) group.add(pill.group);
  }

  makePill(color, id, x) {
    const group = new THREE.Group();
    group.position.set(x, 1.18, 0.62);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.85, roughness: 0.28, metalness: 0.4 });
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.44, 12, 24), mat);
    mesh.rotation.z = Math.PI / 2;
    mesh.userData = { kind: "pill", id };
    group.add(mesh);
    group.add(new THREE.PointLight(color, 5, 7));
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 24, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    group.add(halo);
    const label = labelSprite(id.toUpperCase() + " PILL", color, 2.3);
    label.position.set(0, -0.62, 0);
    group.add(label);
    this.interactives.push(mesh);
    return { group, mesh, halo, id };
  }

  // --- scene ---------------------------------------------------------------

  disposeScene() {
    for (const panel of this.panels) {
      this.scene.remove(panel.mesh);
      panel.mesh.geometry.dispose();
      panel.mesh.material.map?.dispose();
      panel.mesh.userData.collapsedMap?.dispose();
      panel.mesh.material.dispose();
    }
    for (const tex of this.cardTextures.values()) tex.dispose();
    this.cardTextures.clear();
    if (this.minimapEl) {
      this.minimapEl.remove();
      this.minimapEl = null;
      this.minimapYou = null;
      this.minimapSpan = null;
    }
    for (const header of this.headers) this.scene.remove(header);
    this.panels = [];
    this.headers = [];
    if (this.loginPanel) {
      this.scene.remove(this.loginPanel);
      this.loginPanel.geometry.dispose();
      this.loginPanel.material.map?.dispose();
      this.loginPanel.material.dispose();
      this.loginPanel = null;
    }
    if (this.env) {
      this.scene.remove(this.env);
      this.env.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose?.();
      });
      this.env = null;
    }
  }

  loadScene(id) {
    this.disposeScene();
    const catalog = this.catalog ?? { categories: [] };
    const def = getScene(id)({ THREE, catalog, util });
    this.def = def;
    this.colliders = def.colliders ?? [];
    this.loop = def.loop ?? null;
    this.env = def.env;
    this.scene.add(def.env);
    this.scene.background = new THREE.Color(def.background);
    this.scene.fog = new THREE.FogExp2(def.fog[0], def.fog[1]);

    this.interactives = this.pills.map((p) => p.mesh);
    for (const prop of def.props ?? []) this.interactives.push(prop);

    const { panels, headers } = def.layout;
    for (const header of headers) {
      const sprite = labelSprite(header.label.toUpperCase(), ACCENTS[header.accentId] ?? GREEN, 3.2);
      sprite.position.set(header.x, header.y, header.z);
      sprite.visible = this.stage === "inside";
      this.scene.add(sprite);
      this.headers.push(sprite);
    }
    for (const p of panels) {
      const mesh = makeCard(p.app, ACCENTS[p.categoryId] ?? GREEN);
      mesh.position.set(p.x, p.y, p.z);
      mesh.scale.setScalar(0.001);
      mesh.visible = false;
      mesh.userData = {
        kind: "app",
        id: p.app.id,
        baseY: p.y,
        app: p.app,
        accent: ACCENTS[p.categoryId] ?? GREEN,
        collapsedMap: mesh.material.map,
        expanded: false,
      };
      const ring = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(util.CARD_W, util.CARD_H)),
        new THREE.LineBasicMaterial({ color: ACCENTS[p.categoryId] ?? GREEN, transparent: true, opacity: 0 })
      );
      mesh.add(ring);
      this.scene.add(mesh);
      this.interactives.push(mesh);
      this.panels.push({ mesh, ring, base: { x: p.x, y: p.y, z: p.z } });
    }

    this.buildMinimap();
    if (!this.loggedIn) this.addLoginPanel();
  }

  addLoginPanel() {
    const panel = makeLoginPanel("See everything you can reach");
    const spawn = this.def.spawn;
    panel.position.set(0, spawn[1], spawn[2] - 2.6);
    panel.scale.setScalar(0.001);
    panel.userData = { kind: "login", id: "login" };
    this.scene.add(panel);
    this.interactives.push(panel);
    this.loginPanel = panel;
  }

  enter() {
    if (this.stage === "inside" || this.stage === "entering") return;
    this.loadScene(this.sceneId);
    this.stage = "entering";
    this.enterT = 0;
    this.introGroup.visible = false;
    this.emit({ type: "entered" });
  }

  reset() {
    this.stage = "attract";
    this.introT = 0;
    this.enterT = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.introGroup.visible = true;
    this.disposeScene();
    this.scene.background = new THREE.Color(0x02040a);
    this.scene.fog = new THREE.FogExp2(0x02060a, 0.03);
    for (const pill of this.pills) pill.group.visible = true;
    this.camera.position.copy(ATTRACT_START);
    if (this.locked) document.exitPointerLock();
  }

  // --- input ---------------------------------------------------------------

  resize() {
    if (!this.renderer) return;
    const w = this.clientWidth || innerWidth;
    const h = this.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setPointerFrom(e) {
    const rect = this.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    );
  }

  handlePointerMove(e) {
    if (this.locked) {
      this.yaw -= e.movementX * LOOK;
      this.pitch = clamp(this.pitch - e.movementY * LOOK, -1.15, 1.15);
    } else if (e.pointerType === "touch" && this.touchDrag) {
      const dx = e.clientX - this.touchDrag.x;
      const dy = e.clientY - this.touchDrag.y;
      this.touchDrag.x = e.clientX;
      this.touchDrag.y = e.clientY;
      this.touchDrag.moved += Math.hypot(dx, dy);
      this.yaw -= dx * 0.005;
      this.pitch = clamp(this.pitch - dy * 0.005, -1.15, 1.15);
      this.setPointerFrom(e);
    } else {
      this.setPointerFrom(e);
      this.yaw = -this.pointer.x * 1.1;
      this.pitch = clamp(this.pointer.y * 0.6, -0.7, 0.7);
    }
    this.active();
  }

  handlePointerDown(e) {
    if (e.pointerType === "touch") {
      this.touchDrag = { x: e.clientX, y: e.clientY, moved: 0 };
      this.setPointerFrom(e);
      return;
    }
    if (this.stage === "inside" && !this.locked) {
      this.renderer.domElement.requestPointerLock();
      this.suppressClick = true;
    }
  }

  handlePointerUp() {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    const dragged = this.touchDrag && this.touchDrag.moved > 12;
    this.touchDrag = null;
    if (dragged) return;
    const hit = this.pick();
    if (!hit) return;
    const kind = hit.userData.kind;
    if (kind === "pill") {
      if (hit.userData.id === "red") this.renderer.domElement.requestPointerLock();
      this.emit({ type: "pill", pill: hit.userData.id });
    } else if (kind === "app" && this.stage === "inside") {
      this.emit({ type: "open", id: hit.userData.id });
    } else if (kind === "login") {
      this.emit({ type: "login" });
    } else if (kind === "prop") {
      this.emit({ type: "note", text: hit.userData.text });
    }
  }

  gyro(alpha, beta) {
    if (alpha == null || beta == null) return;
    if (!this.gyroEnabled || !this.gyroBase) {
      this.gyroEnabled = true;
      this.gyroBase = { alpha, beta };
      return;
    }
    const wrap = (d) => ((d + 540) % 360) - 180;
    const da = wrap(alpha - this.gyroBase.alpha);
    this.yaw = -(da * Math.PI) / 180;
    this.pitch = clamp((((beta - this.gyroBase.beta) * Math.PI) / 180) * 0.6, -1.0, 1.0);
  }

  pick() {
    const ndc = this.locked ? new THREE.Vector2(0, 0) : this.pointer;
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactives, false);
    for (const hit of hits) {
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

  // --- frame ---------------------------------------------------------------

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
    this.updateMinimap();

    this.renderer.render(this.scene, this.camera);
  }

  animatePills(dt) {
    if (this.stage !== "attract") return;
    for (const pill of this.pills) {
      pill.group.position.y = 1.18 + Math.sin(this.time * 1.6 + (pill.id === "red" ? 0 : 1.5)) * 0.07;
      pill.group.rotation.y += dt * 0.6;
      const hot = this.hovered === pill.id;
      pill.group.scale.setScalar(lerp(pill.group.scale.x, hot ? 1.16 : 1, 0.15));
      pill.mesh.material.emissiveIntensity = lerp(pill.mesh.material.emissiveIntensity, hot ? 1.5 : 0.85, 0.15);
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
      if (this.loginPanel) {
        this.loginPanel.visible = reveal > 0;
        this.loginPanel.scale.setScalar(Math.max(0.001, easeOut(reveal)));
      }
      if (this.enterT >= 1) this.stage = "inside";
    }
    if (this.stage !== "inside") return;
    for (const panel of this.panels) {
      const { mesh, ring, base } = panel;
      mesh.quaternion.copy(this.camera.quaternion);
      const hot = hit === mesh;
      this.setCardExpanded(mesh, hot);
      mesh.position.y = base.y + Math.sin(this.time * 1.1 + base.x * 1.7) * 0.05;
      mesh.position.z = base.z + (hot ? 0.7 : 0);
      mesh.scale.setScalar(lerp(mesh.scale.x, hot ? 1.28 : 1, 0.12));
      ring.material.opacity = lerp(ring.material.opacity, hot ? 0.9 : 0, 0.15);
    }
    if (this.loginPanel) {
      this.loginPanel.quaternion.copy(this.camera.quaternion);
      const target = hit === this.loginPanel ? 1.08 : 1;
      this.loginPanel.scale.setScalar(lerp(this.loginPanel.scale.x, target, 0.12));
    }
    if (this.def?.animate) this.def.animate(dt, this.time);
  }

  // Looking at a card swaps in a texture with the description, so it opens the
  // way the simple view's cards do. The bigger texture is built once and kept.
  setCardExpanded(mesh, expanded) {
    if (expanded === mesh.userData.expanded) return;
    mesh.userData.expanded = expanded;
    if (expanded) {
      const { app, accent } = mesh.userData;
      let tex = this.cardTextures.get(app.id);
      if (!tex) {
        tex = util.cardTexture(app, accent, true);
        this.cardTextures.set(app.id, tex);
      }
      mesh.material.map = tex;
    } else {
      mesh.material.map = mesh.userData.collapsedMap;
    }
    mesh.material.needsUpdate = true;
  }

  // A vertical strip of the corridor: one marker per group, and a dot for where
  // the walker is. Clicking a marker teleports to that group.
  buildMinimap() {
    if (this.minimapEl) this.minimapEl.remove();
    const places = this.def?.places ?? [];
    const el = document.createElement("div");
    el.className = "minimap";
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    el.addEventListener("pointerup", (e) => e.stopPropagation());
    const track = document.createElement("div");
    track.className = "minimap-track";

    const zMax = this.def.bounds.zMax;
    const zMin = this.def.bounds.zMin;
    const span = zMax - zMin || 1;
    for (const place of places) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "minimap-place";
      dot.style.top = `${((zMax - place.z) / span) * 100}%`;
      const label = document.createElement("span");
      label.className = "minimap-label";
      label.textContent = place.label;
      dot.appendChild(label);
      dot.addEventListener("click", (event) => {
        event.stopPropagation();
        this.teleport(place);
      });
      track.appendChild(dot);
    }

    const you = document.createElement("div");
    you.className = "minimap-you";
    track.appendChild(you);
    el.appendChild(track);
    this.appendChild(el);
    this.minimapEl = el;
    this.minimapYou = you;
    this.minimapSpan = { zMax, span };
    this.updateMinimap();
  }

  updateMinimap() {
    if (!this.minimapYou || !this.minimapSpan) return;
    const { zMax, span } = this.minimapSpan;
    this.minimapYou.style.top = `${clamp(((zMax - this.camera.position.z) / span) * 100, 0, 100)}%`;
  }

  teleport(place) {
    this.vel.set(0, 0);
    this.camera.position.x = place.x;
    this.camera.position.z = place.z + 11;
    this.yaw = 0;
    this.pitch = 0;
    this.active();
  }

  animateCamera(dt) {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, "YXZ"));

    if (this.stage === "attract") {
      this.introT = clamp(this.introT + dt / ATTRACT_ZOOM, 0, 1);
      const t = easeOut(this.introT);
      this.camera.position.lerpVectors(ATTRACT_START, ATTRACT_END, t);
      if (!reduced) this.camera.position.y += Math.sin(this.time * 0.7) * 0.03;
      this.camera.lookAt(ATTRACT_LOOK);
      this.camera.quaternion.multiply(q);
      return;
    }

    if (this.stage === "entering") {
      const t = easeOut(this.enterT);
      const spawn = this.def.spawn;
      this.camera.position.lerpVectors(ATTRACT_END, new THREE.Vector3(spawn[0], spawn[1], spawn[2]), t);
      const look = ATTRACT_LOOK.clone().lerp(new THREE.Vector3(this.def.look[0], this.def.look[1], this.def.look[2]), t);
      this.camera.lookAt(look);
      this.camera.quaternion.multiply(q);
      return;
    }

    this.move(dt, q);
  }

  move(dt, q) {
    const up = this.keys.KeyW || this.keys.ArrowUp ? 1 : 0;
    const down = this.keys.KeyS || this.keys.ArrowDown ? 1 : 0;
    const right = this.keys.KeyD || this.keys.ArrowRight ? 1 : 0;
    const left = this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0;
    const forward = up - down;
    const strafe = right - left;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);

    const ax = (-sin * forward + cos * strafe) * SPEED;
    const az = (-cos * forward - sin * strafe) * SPEED;
    this.vel.x = lerp(this.vel.x, ax, 0.18);
    this.vel.y = lerp(this.vel.y, az, 0.18);

    const bounds = this.def.bounds;
    const radius = 0.55;
    const cx = this.camera.position.x;
    const cz = this.camera.position.z;
    let nx = clamp(cx + this.vel.x * dt, -bounds.x, bounds.x);
    let nz = cz + this.vel.y * dt;

    // Resolve each axis on its own so a wall stops the walker without sticking.
    if (this.blocked(nx, cz, radius)) nx = cx;
    if (this.blocked(nx, nz, radius)) nz = cz;

    // The corridor loops: past the far end you come back in at the near end.
    if (this.loop) {
      const period = this.loop.near - this.loop.far;
      while (nz < this.loop.far) nz += period;
      while (nz > this.loop.near) nz -= period;
    }

    this.camera.position.x = nx;
    this.camera.position.z = nz;
    const bob = reduced ? 0 : Math.sin(this.time * 8) * Math.min(0.04, Math.hypot(this.vel.x, this.vel.y) * 0.006);
    this.camera.position.y = this.def.spawn[1] + bob;
    this.camera.quaternion.copy(q);
  }

  blocked(x, z, r) {
    for (const c of this.colliders) {
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    }
    return false;
  }
}

customElements.define("wttm-scene", WttmScene);
