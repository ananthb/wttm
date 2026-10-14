// The falling-glyph canvas behind the simple view. One instance at a time,
// sized to the element it is dropped into. Callers stop it when the view leaves,
// and reduced motion never starts it.
const GLYPHS =
  "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

const SPEED = 0.3; // rows per frame; a glyph appears only as its column advances
const FADE = 0.07; // trail persistence

export function matrixRain(canvas, { occluders } = {}) {
  const ctx = canvas.getContext("2d");
  const fontSize = 16;
  let columns = 0;
  let drops = [];
  let acc = [];
  let dpr = 1;
  let raf = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    columns = Math.max(1, Math.floor(canvas.width / (fontSize * dpr)));
    drops = new Array(columns).fill(0).map(() => Math.random() * -50);
    acc = new Array(columns).fill(0);
  };

  // Erase the rain under whatever the reader is meant to read, so the glyphs
  // stay in the gutters and around the boxes rather than behind them.
  const clearOccluders = () => {
    if (!occluders) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    for (const el of occluders()) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const pad = 3;
      ctx.clearRect(
        (r.left - rect.left - pad) * sx,
        (r.top - rect.top - pad) * sy,
        (r.width + pad * 2) * sx,
        (r.height + pad * 2) * sy
      );
    }
  };

  const draw = () => {
    ctx.fillStyle = `rgba(2, 6, 10, ${FADE})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize * dpr}px monospace`;
    ctx.textBaseline = "top";
    const row = fontSize * dpr;
    for (let c = 0; c < columns; c++) {
      acc[c] += SPEED;
      if (acc[c] < 1) continue;
      acc[c] -= 1;
      drops[c] += 1;
      const x = c * row + 2 * dpr;
      const y = drops[c] * row;
      if (y > canvas.height && Math.random() > 0.975) {
        drops[c] = 0;
        continue;
      }
      ctx.fillStyle = "#dcffeb";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y);
      ctx.fillStyle = "#4dff9e";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y - row);
    }
    clearOccluders();
    raf = requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener("resize", resize);
  raf = requestAnimationFrame(draw);

  return {
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    },
  };
}
