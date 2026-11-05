// A procedural textile sculpture inspired by Uyghur doppa embroidery.
// Geometry, stitch paths and lighting are drawn locally; no image or 3D library.
(function () {
  'use strict';
  const canvas = document.getElementById('heritage-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const card = canvas.closest('.heritage-card');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pauseButton = document.getElementById('heritage-pause');
  const description = document.getElementById('heritage-description');
  const palettes = {
    badam: { cloth: [19, 43, 39], thread: '#e9e2bf', detail: '#8aa894', trim: '#d0a85f', title: 'بادام كەشتىسى', subtitle: 'قېنىق مەخمەل. نەپىس يىپلار.', label: 'بادام كەشتىسىدىن ئىلھاملانغان، تۆت بۆلەكلىك رەقەملىك دوپپا' },
    atlas: { cloth: [24, 31, 49], thread: '#68d3cc', detail: '#ed729c', trim: '#edc36e', title: 'ئەتلەس رەڭلىرى', subtitle: 'رەڭلەر ئۇچرىشىدۇ، نەقىشلەر جانلىنىدۇ.', label: 'ئەتلەس رەڭلىرى ۋە سوزۇلما نەقىشلىرىدىن ئىلھاملانغان رەقەملىك دوپپا' },
    golden: { cloth: [45, 24, 40], thread: '#ecc97b', detail: '#ac7655', trim: '#f9e6b8', title: 'زەر يىپلار', subtitle: 'يورۇقلۇق بىلەن توقۇلغان تەسەۋۋۇر.', label: 'زەر رەڭلىك كەشتە يىپلىرىدىن ئىلھاملانغان رەقەملىك دوپپا' },
  };
  let paletteName = 'badam';
  let palette = palettes.badam;
  let width = 0, height = 0, ratio = 1;
  let yaw = 0.56, elevation = 0.68;
  let paused = false, visible = true, dragging = false;
  let pointer = null, lastFrame = 0, raf = 0, time = 0;
  let reveal = motion.matches ? 1 : 0;
  const TAU = Math.PI * 2;
  const RADIUS = 0.94;
  const POWER = 4.5;
  const surfaces = [];
  const paths = [];
  const textures = [];

  const rgba = (rgb, light = 1) => `rgb(${rgb.map((c) => Math.round(Math.min(255, c * light))).join(' ')})`;
  const perimeter = (angle, scale = 1, z = 0.16) => ({
    x: Math.sign(Math.cos(angle)) * Math.pow(Math.abs(Math.cos(angle)), 2 / POWER) * RADIUS * scale,
    y: Math.sign(Math.sin(angle)) * Math.pow(Math.abs(Math.sin(angle)), 2 / POWER) * RADIUS * scale,
    z,
  });
  function crown(x, y, lift = 0.006) {
    const r = Math.min(1, Math.pow(Math.pow(Math.abs(x / RADIUS), POWER) + Math.pow(Math.abs(y / RADIUS), POWER), 1 / POWER));
    return { x, y, z: 0.16 + 0.48 * Math.pow(Math.max(0, 1 - r * r), 0.68) + lift };
  }
  function transformedPoint(x, y, angle) {
    return crown(x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle));
  }
  function bezier(a, b, c, d, t) {
    const s = 1 - t;
    return { x: s ** 3 * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t ** 3 * d[0], y: s ** 3 * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t ** 3 * d[1] };
  }
  function curve(points, count = 34) {
    return Array.from({ length: count + 1 }, (_, i) => bezier(...points, i / count));
  }
  function addPath(points, color, weight = 1, closed = false, phase = 0) {
    paths.push({ points, color, weight, closed, phase });
  }
  function leaf(cx, cy, sx, sy, angle, rotation = 0) {
    const points = [...curve([[0, -1], [-1, -0.2], [-0.8, 0.65], [0, 1]], 15), ...curve([[0, 1], [0.8, 0.65], [1, -0.2], [0, -1]], 15)];
    return points.map((p) => {
      const x = p.x * sx, y = p.y * sy;
      return transformedPoint(cx + x * Math.cos(rotation) - y * Math.sin(rotation), cy + x * Math.sin(rotation) + y * Math.cos(rotation), angle);
    });
  }

  // A rounded four-sided crown, with a separate embroidered velvet band.
  const segments = 72, rows = 15;
  for (let row = 0; row < rows; row++) {
    const r0 = row / rows, r1 = (row + 1) / rows;
    for (let i = 0; i < segments; i++) {
      const a = i / segments * TAU, b = (i + 1) / segments * TAU;
      const points = [perimeter(a, r0), perimeter(b, r0), perimeter(b, r1), perimeter(a, r1)].map((p) => crown(p.x, p.y, 0));
      surfaces.push({ points, angle: (a + b) / 2, radius: (r0 + r1) / 2, band: false });
    }
  }
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < segments; i++) {
      const a = i / segments * TAU, b = (i + 1) / segments * TAU;
      surfaces.push({ points: [perimeter(a, 1, 0.16 - row * 0.075), perimeter(b, 1, 0.16 - row * 0.075), perimeter(b, 1, 0.085 - row * 0.075), perimeter(a, 1, 0.085 - row * 0.075)], angle: (a + b) / 2, band: true, radius: 1 });
    }
  }
  // Four original almond-shaped compositions, each made of individual stitches.
  for (let panel = 0; panel < 4; panel++) {
    const angle = panel * Math.PI / 2;
    const outline = [...curve([[0, 0.12], [-0.32, 0.35], [-0.2, 0.69], [0, 0.83]], 48), ...curve([[0, 0.83], [0.2, 0.69], [0.32, 0.35], [0, 0.12]], 48)];
    [1, 0.91, 0.79].forEach((scale, index) => {
      addPath(outline.map((p) => transformedPoint(p.x * scale, 0.475 + (p.y - 0.475) * scale, angle)), index === 2 ? 'detail' : 'thread', index === 0 ? 1.3 : 0.7, true, panel * 0.1);
    });
    const stem = curve([[0, 0.24], [-0.15, 0.45], [0.16, 0.5], [0, 0.73]], 70);
    addPath(stem.map((p) => transformedPoint(p.x, p.y, angle)), 'trim', 1.05, false, panel * 0.1 + 0.06);
    for (let i = 0; i < 7; i++) {
      const y = 0.31 + i * 0.052;
      const side = i % 2 ? -1 : 1;
      const x = side * (0.047 + Math.sin(i * 0.6) * 0.016);
      addPath(leaf(x, y, 0.031, 0.057, angle, side * -0.55), i % 2 ? 'thread' : 'detail', 0.85, true, panel * 0.1 + i * 0.016);
    }
    // Fan-like seam details separate the four embroidered panels.
    const seamAngle = angle + Math.PI / 4;
    const seam = Array.from({ length: 73 }, (_, i) => {
      const p = perimeter(seamAngle, i / 72 * 0.99);
      return crown(p.x, p.y, 0.008);
    });
    addPath(seam, 'trim', 0.7, false, 0.12);
    for (let i = 0; i < 6; i++) {
      const r = 0.25 + i * 0.112;
      const p = perimeter(seamAngle, r);
      const points = Array.from({ length: 33 }, (_, j) => {
        const a = j / 32 * TAU;
        return crown(p.x + Math.cos(a) * 0.022, p.y + Math.sin(a) * 0.022);
      });
      addPath(points, 'trim', 0.75, true, 0.18 + i * 0.02);
    }
  }
  // Double braided borders and a continuous diamond stitch around the brim.
  [0.155, 0.123, -0.105, -0.135].forEach((z, row) => {
    addPath(Array.from({ length: 289 }, (_, i) => perimeter(i / 288 * TAU, 1.006, z + Math.sin(i / 288 * TAU * 44 + row) * 0.005)), row % 2 ? 'detail' : 'trim', row % 2 ? 0.7 : 1.2, true, 0.08);
  });
  for (let i = 0; i < 52; i++) {
    const a = i / 52 * TAU;
    addPath([perimeter(a - 0.033, 1.008, 0.008), perimeter(a, 1.008, 0.083), perimeter(a + 0.033, 1.008, 0.008), perimeter(a, 1.008, -0.065), perimeter(a - 0.033, 1.008, 0.008)], i % 2 ? 'thread' : 'detail', 0.85, true, 0.06);
  }
  // A small central embroidered blossom, not an assigned cultural symbol.
  addPath(Array.from({ length: 129 }, (_, i) => {
    const a = i / 128 * TAU, r = 0.055 + Math.cos(a * 8) * 0.012;
    return crown(Math.cos(a) * r, Math.sin(a) * r, 0.014);
  }), 'trim', 1.2, true);

  // Deterministic fine threads give the fabric a woven, rather than plastic, finish.
  let seed = 241;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < 670; i++) {
    const x = (random() - 0.5) * 1.84, y = (random() - 0.5) * 1.84;
    if ((Math.abs(x / RADIUS) ** POWER + Math.abs(y / RADIUS) ** POWER) > 0.96) continue;
    textures.push([crown(x, y, 0.002), crown(x + 0.009, y + 0.005, 0.002)]);
  }

  let sceneScale = 1, sceneX = 0, sceneY = 0;
  function cameraPoint(p) {
    const x = p.x * Math.cos(yaw) - p.y * Math.sin(yaw);
    const y = p.x * Math.sin(yaw) + p.y * Math.cos(yaw);
    const depth = -y * Math.cos(elevation) - p.z * Math.sin(elevation);
    const perspective = 4.8 / (4.8 + depth);
    return { x: x * perspective, y: (y * Math.sin(elevation) - p.z * Math.cos(elevation)) * perspective, depth };
  }
  function fitScene() {
    const samples = [crown(0, 0)];
    [0.25, 0.5, 0.75, 1].forEach((radius) => {
      for (let i = 0; i < 48; i++) {
        const p = perimeter(i / 48 * TAU, radius);
        samples.push(crown(p.x, p.y, 0));
        if (radius === 1) samples.push({ ...p, z: -0.14 });
      }
    });
    const projected = samples.map(cameraPoint);
    const xs = projected.map((p) => p.x), ys = projected.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    sceneScale = Math.min(width * 0.82 / (maxX - minX), height * 0.81 / (maxY - minY));
    sceneX = width / 2 - (minX + maxX) / 2 * sceneScale;
    sceneY = height * 0.46 - (minY + maxY) / 2 * sceneScale;
  }
  function project(p) {
    const point = cameraPoint(p);
    return { x: sceneX + point.x * sceneScale, y: sceneY + point.y * sceneScale + (motion.matches ? 0 : Math.sin(time * 0.7) * 2), depth: point.depth };
  }
  function surfaceNormal(p) {
    const step = 0.001;
    return { x: -(crown(p.x + step, p.y).z - crown(p.x - step, p.y).z) / (step * 2), y: -(crown(p.x, p.y + step).z - crown(p.x, p.y - step).z) / (step * 2) };
  }
  paths.forEach((path) => path.points.forEach((p) => { if (p.z >= 0.17) p.normal = surfaceNormal(p); }));
  textures.forEach((thread) => thread.forEach((p) => { p.normal = surfaceNormal(p); }));
  function facesCamera(p) {
    if (!p.normal) return p.x * Math.sin(yaw) + p.y * Math.cos(yaw) >= -0.08;
    const normalY = p.normal.x * Math.sin(yaw) + p.normal.y * Math.cos(yaw);
    return normalY * Math.cos(elevation) + Math.sin(elevation) > 0.015;
  }
  function trace(points, close = false) {
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    if (close) ctx.closePath();
  }
  function draw() {
    if (!width || !height) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    fitScene();
    const shadow = ctx.createRadialGradient(width / 2, height * 0.86, 0, width / 2, height * 0.86, width * 0.37);
    shadow.addColorStop(0, 'rgba(0,0,0,.46)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(0, height * 0.67);
    ctx.scale(1, 0.22);
    ctx.fillStyle = shadow;
    ctx.fillRect(0, -height * 3, width, height * 5);
    ctx.restore();

    const items = [];
    const stitches = [];
    surfaces.forEach((face) => {
      const points = face.points.map(project);
      const orientation = face.angle + yaw;
      if (face.band && Math.sin(orientation) < -0.1) return;
      const light = (face.band ? 0.6 : 0.95) + Math.cos(orientation - 3.7) * (face.band ? 0.27 : 0.22) + (1 - face.radius) * 0.16;
      items.push({ type: 'face', points, depth: points.reduce((sum, p) => sum + p.depth, 0) / points.length, light, face });
    });
    paths.forEach((path, pathIndex) => {
      const progress = Math.max(0, Math.min(1, (reveal - path.phase) / (1 - path.phase)));
      const length = Math.floor(path.points.length * progress);
      // Short stitch segments participate in depth sorting with the fabric.
      for (let i = 1; i < length; i++) {
        const a = project(path.points[i - 1]), b = project(path.points[i]);
        if (!facesCamera(path.points[i]) || !facesCamera(path.points[i - 1])) continue;
        stitches.push({ type: 'stitch', points: [a, b], depth: (a.depth + b.depth) / 2, color: palette[path.color], weight: path.weight, glint: (i + pathIndex * 7) % 13 === 0 });
      }
    });
    items.sort((a, b) => b.depth - a.depth);
    stitches.sort((a, b) => b.depth - a.depth);
    items.push(...stitches);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    items.forEach((item) => {
      trace(item.points, item.type === 'face');
      if (item.type === 'face') {
        let color = rgba(palette.cloth, item.light);
        if (paletteName === 'atlas') {
          const stripe = Math.floor((item.face.points[0].x + 1) * 15 + Math.sin(item.face.points[0].y * 19) * 0.9);
          const colors = [[24, 58, 66], [62, 30, 59], [80, 46, 39], [31, 70, 65], [23, 30, 48]];
          color = rgba(colors[((stripe % colors.length) + colors.length) % colors.length], item.light);
        }
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.6;
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = item.color;
        ctx.globalAlpha = item.glint ? 1 : 0.82;
        ctx.lineWidth = item.weight * Math.max(0.65, width / 440);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    ctx.strokeStyle = palette.thread;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 0.45;
    textures.forEach((thread) => { if (facesCamera(thread[0])) { trace(thread.map(project)); ctx.stroke(); } });
    ctx.globalAlpha = 1;

    // Four distant stitch sparks complement the object without orbiting it.
    [0.22, 0.72, 1.62, 2.6].forEach((a, i) => {
      const x = width * (0.17 + i * 0.22), y = height * (i % 2 ? 0.12 : 0.78);
      const alpha = motion.matches ? 0.3 : 0.2 + (Math.sin(time + a) + 1) * 0.12;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = palette.trim;
      ctx.lineWidth = 0.8;
      trace([{ x: x - 3, y }, { x: x + 3, y }]); ctx.stroke();
      trace([{ x, y: y - 3 }, { x, y: y + 3 }]); ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }

  function shouldAnimate() { return !paused && !motion.matches && visible && !document.hidden && !dragging; }
  function frame(now) {
    raf = 0;
    if (!shouldAnimate()) { lastFrame = 0; return; }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0;
    if (dt && dt < 1 / 32) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now;
    time += dt;
    yaw += dt * 0.10;
    reveal = Math.min(1, reveal + dt * 0.5);
    draw();
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastFrame = 0;
    draw();
    if (shouldAnimate()) raf = requestAnimationFrame(frame);
  }
  function resize() {
    const box = canvas.getBoundingClientRect();
    width = box.width; height = box.height;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    schedule();
  }
  function updatePause() {
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'دوپپا ھەرىكىتىنى داۋاملاشتۇرۇش' : 'دوپپا ھەرىكىتىنى توختىتىش');
    pauseButton.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
    schedule();
  }
  document.querySelectorAll('[data-heritage-palette]').forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.heritagePalette;
      if (!palettes[next]) return;
      paletteName = next;
      palette = palettes[next];
      card.dataset.palette = next;
      document.querySelectorAll('[data-heritage-palette]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      document.getElementById('heritage-title').textContent = palette.title;
      description.textContent = palette.subtitle;
      canvas.setAttribute('aria-label', palette.label);
      reveal = motion.matches || paused ? 1 : 0.35;
      schedule();
    });
  });
  pauseButton.addEventListener('click', () => { paused = !paused; reveal = 1; updatePause(); });
  document.getElementById('heritage-reset').addEventListener('click', () => { yaw = 0.56; elevation = 0.68; reveal = 1; schedule(); });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    dragging = true;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
    reveal = 1;
    schedule();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    yaw += (event.clientX - pointer.x) * 0.009;
    elevation = Math.max(0.42, Math.min(1.12, elevation - (event.clientY - pointer.y) * 0.004));
    pointer.x = event.clientX; pointer.y = event.clientY;
    draw();
  });
  function endDrag(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    pointer = null; dragging = false;
    canvas.classList.remove('is-dragging');
    schedule();
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('lostpointercapture', endDrag);
  canvas.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', ' '].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') yaw -= 0.18;
    if (event.key === 'ArrowRight') yaw += 0.18;
    if (event.key === 'ArrowUp') elevation = Math.min(1.12, elevation + 0.08);
    if (event.key === 'ArrowDown') elevation = Math.max(0.42, elevation - 0.08);
    if (event.key === 'Home') { yaw = 0.56; elevation = 0.68; }
    if (event.key === ' ') { paused = !paused; updatePause(); }
    reveal = 1;
    schedule();
  });
  motion.addEventListener('change', () => { reveal = 1; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); }).observe(canvas);
  resize();
})();
