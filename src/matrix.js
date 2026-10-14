// The falling-glyph canvas behind the simple view. One instance at a time,
// sized to the element it is dropped into. Callers stop it when the view leaves,
// and reduced motion never starts it.
const GLYPHS =
  "ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";

export function matrixRain(canvas) {
  const ctx = canvas.getContext("2d");
  const fontSize = 16;
  let columns = 0;
  let drops = [];
  let dpr = 1;
  let raf = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
    columns = Math.max(1, Math.floor(canvas.width / (fontSize * dpr)));
    drops = new Array(columns).fill(0).map(() => Math.random() * -50);
  };

  const draw = () => {
    ctx.fillStyle = "rgba(2, 6, 10, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontSize * dpr}px monospace`;
    ctx.textBaseline = "top";
    for (let c = 0; c < columns; c++) {
      const x = c * fontSize * dpr + 2 * dpr;
      const y = drops[c] * fontSize * dpr;
      ctx.fillStyle = "#dcffeb";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y);
      ctx.fillStyle = "#4dff9e";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], x, y - fontSize * dpr);
      drops[c] += 1;
      if (y > canvas.height && Math.random() > 0.975) drops[c] = 0;
    }
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
