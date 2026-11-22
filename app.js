(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const TAU = Math.PI * 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- shapes */
// Every shape is drawn in a unit box (0..1) and scaled to the board with a small margin.
const fit = (S) => (u) => S * (0.04 + 0.92 * u);

function polygon(pts) {
  return (S) => {
    const f = fit(S), p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(f(x), f(y)) : p.moveTo(f(x), f(y))));
    p.closePath();
    return p;
  };
}
function curves(draw) {
  // draw(p, f) receives scaling helper f and a Path2D
  return (S) => { const p = new Path2D(); draw(p, fit(S), S); p.closePath(); return p; };
}
function regular(n, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([0.5 + 0.5 * Math.cos(rot + (i * TAU) / n), 0.5 + 0.5 * Math.sin(rot + (i * TAU) / n)]);
  return polygon(pts);
}
function starPts(n, inner) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner * 0.5 : 0.5, a = -Math.PI / 2 + (i * Math.PI) / n;
    pts.push([0.5 + r * Math.cos(a), 0.5 + r * Math.sin(a) + 0.02]);
  }
  return pts;
}

const SHAPES = [
  { id: 'circle', name: 'Circle', build: (S) => { const p = new Path2D(); p.arc(S / 2, S / 2, S * 0.46, 0, TAU); return p; } },
  { id: 'square', name: 'Square', build: curves((p, f) => {
      const a = f(0.04), b = f(0.96), r = f(0.2) - f(0);
      p.moveTo(a + r, a); p.arcTo(b, a, b, b, r); p.arcTo(b, b, a, b, r); p.arcTo(a, b, a, a, r); p.arcTo(a, a, b, a, r);
  }) },
  { id: 'triangle', name: 'Triangle', build: polygon([[0.5, 0.04], [0.98, 0.92], [0.02, 0.92]]) },
  { id: 'star', name: 'Star', build: polygon(starPts(5, 0.42)) },
  { id: 'heart', name: 'Heart', build: curves((p, f) => {
      p.moveTo(f(0.5), f(0.94));
      p.bezierCurveTo(f(0.1), f(0.64), f(0.0), f(0.4), f(0.08), f(0.22));
      p.bezierCurveTo(f(0.16), f(0.03), f(0.42), f(0.02), f(0.5), f(0.27));
      p.bezierCurveTo(f(0.58), f(0.02), f(0.84), f(0.03), f(0.92), f(0.22));
      p.bezierCurveTo(f(1.0), f(0.4), f(0.9), f(0.64), f(0.5), f(0.94));
  }) },
  { id: 'hexagon', name: 'Hexagon', build: regular(6) },
  { id: 'diamond', name: 'Diamond', build: polygon([[0.5, 0], [0.9, 0.5], [0.5, 1], [0.1, 0.5]]) },
  { id: 'house', name: 'House', build: polygon([[0.5, 0.02], [0.97, 0.45], [0.83, 0.45], [0.83, 0.97], [0.17, 0.97], [0.17, 0.45], [0.03, 0.45]]) },
  { id: 'arrow', name: 'Arrow', build: polygon([[0, 0.35], [0.55, 0.35], [0.55, 0.06], [1, 0.5], [0.55, 0.94], [0.55, 0.65], [0, 0.65]]) },
  { id: 'plus', name: 'Plus', build: polygon([[0.35, 0], [0.65, 0], [0.65, 0.35], [1, 0.35], [1, 0.65], [0.65, 0.65], [0.65, 1], [0.35, 1], [0.35, 0.65], [0, 0.65], [0, 0.35], [0.35, 0.35]]) },
  { id: 'bolt', name: 'Lightning', build: polygon([[0.62, 0], [0.12, 0.56], [0.44, 0.56], [0.32, 1], [0.88, 0.4], [0.55, 0.4], [0.74, 0]]) },
  { id: 'fish', name: 'Fish', build: curves((p, f) => {
      p.moveTo(f(0.0), f(0.5));
      p.bezierCurveTo(f(0.12), f(0.22), f(0.45), f(0.14), f(0.66), f(0.36));
      p.lineTo(f(1.0), f(0.16)); p.lineTo(f(0.9), f(0.5)); p.lineTo(f(1.0), f(0.84)); p.lineTo(f(0.66), f(0.64));
      p.bezierCurveTo(f(0.45), f(0.86), f(0.12), f(0.78), f(0.0), f(0.5));
  }) },
  { id: 'cat', name: 'Cat', build: curves((p, f) => {
      p.moveTo(f(0.12), f(0.06)); p.lineTo(f(0.36), f(0.26));
      p.quadraticCurveTo(f(0.5), f(0.22), f(0.64), f(0.26)); p.lineTo(f(0.88), f(0.06));
      p.bezierCurveTo(f(0.95), f(0.35), f(0.98), f(0.62), f(0.8), f(0.8));
      p.bezierCurveTo(f(0.7), f(0.92), f(0.58), f(0.96), f(0.5), f(0.96));
      p.bezierCurveTo(f(0.42), f(0.96), f(0.3), f(0.92), f(0.2), f(0.8));
      p.bezierCurveTo(f(0.02), f(0.62), f(0.05), f(0.35), f(0.12), f(0.06));
  }) },
];

// Random "surprise" outlines, fully determined by the seed.
function randomShape(S, seed) {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const kind = Math.floor(r() * 3);
  const p = new Path2D();
  const pt = (rad, a) => [S / 2 + rad * S * Math.cos(a), S / 2 + rad * S * Math.sin(a)];
  let name = 'Surprise blob';
  if (kind === 0) {
    const terms = [2, 3, 4, 5].map((k) => ({ k, a: (0.04 + r() * 0.07) / (k * 0.55), ph: r() * TAU }));
    for (let i = 0; i <= 180; i++) {
      const th = (i / 180) * TAU;
      let rad = 0.33 + terms.reduce((s, t) => s + t.a * Math.cos(t.k * th + t.ph), 0);
      rad = Math.min(rad, 0.47);
      const [x, y] = pt(rad, th);
      i ? p.lineTo(x, y) : p.moveTo(x, y);
    }
  } else if (kind === 1) {
    name = 'Surprise star';
    const n = 5 + Math.floor(r() * 5), inner = 0.4 + r() * 0.35, rot = r() * TAU;
    for (let i = 0; i < n * 2; i++) {
      const [x, y] = pt(i % 2 ? inner * 0.46 : 0.46, rot + (i * Math.PI) / n);
      i ? p.lineTo(x, y) : p.moveTo(x, y);
    }
  } else {
    name = 'Surprise polygon';
    const n = 5 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const [x, y] = pt(0.3 + r() * 0.17, ((i + (r() - 0.5) * 0.5) * TAU) / n);
      i ? p.lineTo(x, y) : p.moveTo(x, y);
    }
  }
  p.closePath();
  return { path: p, name };
}

/* ------------------------------------------- raster shapes (animals, photos) */
function alphaOf(canvas) {
  const { width: w, height: h } = canvas;
  const d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
  return a;
}
// Trace an alpha grid into a clean single Path2D (largest blobs only).
function pathFromAlpha(alpha, W, H) {
  let polys = Geo.contours(alpha, W, H, 128).map((p) => Geo.simplify(p, 0.4));
  if (!polys.length) return null;
  const big = Math.max(...polys.map(Geo.area));
  polys = polys.filter((p) => Geo.area(p) >= big * 0.01);
  const path = new Path2D();
  polys.forEach((p) => { p.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath(); });
  path.area = big;
  return path;
}

const shapeCache = new Map();
function animalPath(a, B) {
  const key = a.id + '@' + B;
  if (!shapeCache.has(key)) shapeCache.set(key, pathFromAlpha(alphaOf(ANIMALS.render(a, B)), B, B));
  return shapeCache.get(key);
}

// Cut the subject out of a photo: use transparency if present, otherwise flood-fill
// the plain background from the picture's edges.
function cutoutPath(g, B, r) {
  const d = g.getImageData(0, 0, B, B).data;
  const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
  const x1 = Math.min(B - 1, Math.ceil(r.x + r.w) - 1), y1 = Math.min(B - 1, Math.ceil(r.y + r.h) - 1);
  const fg = new Uint8Array(B * B);
  let transp = 0, total = 0;
  for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = x0 + 2; x <= x1 - 2; x++) { total++; if (d[(y * B + x) * 4 + 3] < 200) transp++; }
  if (transp / total > 0.01) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fg[y * B + x] = d[(y * B + x) * 4 + 3] > 128 ? 255 : 0;
  } else {
    // background colour = mean of the four corner patches
    let R = 0, G = 0, Bc = 0, n = 0;
    for (const [cx, cy] of [[x0, y0], [x1 - 5, y0], [x0, y1 - 5], [x1 - 5, y1 - 5]]) {
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const k = ((cy + j) * B + cx + i) * 4; R += d[k]; G += d[k + 1]; Bc += d[k + 2]; n++; }
    }
    R /= n; G /= n; Bc /= n;
    const tol2 = state.tol * state.tol;
    const isBg = (x, y) => { const k = (y * B + x) * 4; return (d[k] - R) ** 2 + (d[k + 1] - G) ** 2 + (d[k + 2] - Bc) ** 2 < tol2; };
    const bg = new Uint8Array(B * B), stack = [];
    const push = (x, y) => { if (x < x0 || y < y0 || x > x1 || y > y1) return; const i = y * B + x; if (bg[i] || !isBg(x, y)) return; bg[i] = 1; stack.push(i); };
    for (let x = x0; x <= x1; x++) { push(x, y0); push(x, y1); }
    for (let y = y0; y <= y1; y++) { push(x0, y); push(x1, y); }
    while (stack.length) { const i = stack.pop(), x = i % B, y = (i / B) | 0; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fg[y * B + x] = bg[y * B + x] ? 0 : 255;
  }
  // soften jaggies: blur then re-threshold in the tracer
  const m = document.createElement('canvas'); m.width = m.height = B;
  const mg = m.getContext('2d', { willReadFrequently: true });
  const im = mg.createImageData(B, B);
  for (let i = 0; i < fg.length; i++) { im.data[i * 4 + 3] = fg[i]; }
  mg.putImageData(im, 0, 0);
  const m2 = document.createElement('canvas'); m2.width = m2.height = B;
  const m2g = m2.getContext('2d', { willReadFrequently: true });
  m2g.filter = 'blur(2px)';
  m2g.drawImage(m, 0, 0);
  const path = pathFromAlpha(alphaOf(m2), B, B);
  if (!path || path.area < B * B * 0.002 || path.area > r.w * r.h * 0.97) return null;
  return path;
}

function imageShape(B) {
  const img = state.img;
  const t = document.createElement('canvas');
  t.width = t.height = B;
  const g = t.getContext('2d', { willReadFrequently: true });
  const sc = Math.min((B * 0.92) / img.width, (B * 0.92) / img.height);
  const w = img.width * sc, h = img.height * sc, x = (B - w) / 2, y = (B - h) / 2;
  g.drawImage(img, x, y, w, h);
  let path = state.imgMode === 'cutout' ? cutoutPath(g, B, { x, y, w, h }) : null;
  if (!path) { path = new Path2D(); path.rect(x, y, w, h); }
  return { path, name: 'Your picture', pic: t };
}

function getShape(B) {
  const id = state.shapeId;
  if (id === 'random') { const r = randomShape(B, state.seed); return { path: r.path, name: r.name }; }
  if (id === 'image' && state.img) return imageShape(B);
  const an = ANIMALS.list.find((a) => a.id === id);
  if (an) return { path: animalPath(an, B), name: an.name };
  const s = SHAPES.find((x) => x.id === id) || SHAPES[3];
  return { path: s.build(B), name: s.name };
}

/* -------------------------------------------------------------- palettes */
const PALETTES = [
  { name: 'Rainbow', c: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff'] },
  { name: 'Ocean',   c: ['#0077b6', '#00b4d8', '#90e0ef', '#48cae4', '#023e8a'] },
  { name: 'Sunset',  c: ['#ff595e', '#ff924c', '#ffca3a', '#c77dff', '#8338ec'] },
  { name: 'Candy',   c: ['#ff9ecd', '#ffd1e8', '#b8f2e6', '#aed9e0', '#fbc4ab'] },
  { name: 'Forest',  c: ['#2d6a4f', '#52b788', '#95d5b2', '#d8f3dc', '#ffd166'] },
];

/* ------------------------------------------------------------ jigsaw path */
// One tab/blank along an edge. Coordinates are fractions of the edge length;
// u runs along the edge, v is the outward bulge. s=+1 tab out, -1 blank, 0 flat.
const KNOB = [
  [[0.40, 0.00], [0.42, 0.05], [0.40, 0.09]],
  [[0.31, 0.14], [0.38, 0.24], [0.50, 0.24]],
  [[0.62, 0.24], [0.69, 0.14], [0.60, 0.09]],
  [[0.58, 0.05], [0.60, 0.00], [0.65, 0.00]],
];
function edge(p, x0, y0, x1, y1, s) {
  if (!s) { p.lineTo(x1, y1); return; }
  const dx = x1 - x0, dy = y1 - y0;
  const P = (u, v) => [x0 + dx * u + dy * v * s, y0 + dy * u - dx * v * s];
  p.lineTo(...P(0.35, 0));
  for (const [a, b, c] of KNOB) p.bezierCurveTo(...P(...a), ...P(...b), ...P(...c));
  p.lineTo(x1, y1);
}
function jigsawPath(x, y, w, top, right, bottom, left) {
  const p = new Path2D();
  p.moveTo(x, y);
  edge(p, x, y, x + w, y, top);
  edge(p, x + w, y, x + w, y + w, right);
  edge(p, x + w, y + w, x, y + w, bottom);
  edge(p, x, y + w, x, y, left);
  p.closePath();
  return p;
}

/* ------------------------------------------------------------------ state */
const stage = $('#stage');
const state = {
  shapeId: 'lion',
  img: null,
  imgMode: 'whole',
  tol: 48,
  n: 5,
  palette: 0,
  seed: (Math.random() * 1e9) | 0,
  hint: false,
  mute: false,
  pieces: [],
  placed: 0,
  z: 10,
  drag: null,
  layoutKey: '',
};

/* ---------------------------------------------------------------- audio */
let audio;
function beep(freq, dur = 0.12, type = 'sine', vol = 0.15) {
  if (state.mute) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + dur);
  } catch (e) { /* audio is optional */ }
}

/* ----------------------------------------------------------------- layout */
function layout() {
  const sw = stage.clientWidth, sh = stage.clientHeight;
  const landscape = sw >= sh * 1.2;
  let B, bx, by, tray;
  if (landscape) {
    const bw = sw * 0.56;
    B = Math.max(160, Math.min(sh - 28, bw - 28));
    bx = (bw - B) / 2; by = (sh - B) / 2;
    tray = { x: bw, y: 0, w: sw - bw, h: sh };
  } else {
    const bh = Math.max(sh * 0.55, 0);
    B = Math.max(160, Math.min(sw - 24, bh - 24));
    bx = (sw - B) / 2; by = (bh - B) / 2 + 4;
    tray = { x: 0, y: bh, w: sw, h: sh - bh };
  }
  return { sw, sh, B: Math.floor(B), bx: Math.round(bx), by: Math.round(by), tray };
}

/* ------------------------------------------------------------------ build */
function buildPuzzle() {
  stage.innerHTML = '';
  state.pieces = []; state.placed = 0; state.z = 10;
  $('#win').hidden = true;

  const L = layout();
  state.layoutKey = `${L.sw}x${L.sh}`;
  const { B, bx, by } = L;

  // outline of the chosen shape
  const shape = getShape(B);
  const shapePath = shape.path, shapeName = shape.name;

  // rasterise the outline to find its bounds and which cells are inside
  const mask = document.createElement('canvas');
  mask.width = mask.height = B;
  const mctx = mask.getContext('2d', { willReadFrequently: true });
  mctx.fill(shapePath);
  const px = mctx.getImageData(0, 0, B, B).data;
  const inside = (x, y) => x >= 0 && y >= 0 && x < B && y < B && px[((y | 0) * B + (x | 0)) * 4 + 3] > 128;
  let x0 = B, y0 = B, x1 = 0, y1 = 0;
  for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
    if (px[(y * B + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;

  // grid of square cells over the bounding box
  const cell = Math.max(bw, bh) / state.n;
  const cols = Math.ceil(bw / cell - 1e-6), rows = Math.ceil(bh / cell - 1e-6);
  const gx = x0 + bw / 2 - (cols * cell) / 2, gy = y0 + bh / 2 - (rows * cell) / 2;

  const keep = [];
  for (let r = 0; r < rows; r++) {
    keep.push([]);
    for (let c = 0; c < cols; c++) {
      let hit = 0;
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        if (inside(gx + (c + (i + 0.5) / 5) * cell, gy + (r + (j + 0.5) / 5) * cell)) hit++;
      }
      keep[r].push(hit / 25 >= 0.25);
    }
  }
  const has = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols && keep[r][c];

  // random tab directions for shared edges
  const rng = mulberry32(state.seed + 7);
  const hE = [], vE = [];
  for (let r = 0; r <= rows; r++) { hE.push([]); for (let c = 0; c < cols; c++) hE[r].push(has(r - 1, c) && has(r, c) ? (rng() < 0.5 ? 1 : -1) : 0); }
  for (let r = 0; r < rows; r++) { vE.push([]); for (let c = 0; c <= cols; c++) vE[r].push(has(r, c - 1) && has(r, c) ? (rng() < 0.5 ? 1 : -1) : 0); }

  // coloured picture the pieces are cut from
  const pic = makePicture(B, shapePath, { x0, y0, bw, bh }, PALETTES[state.palette].c, rng, shape.pic);

  // board backdrop: faint outline + piece seams
  const boardC = makeCanvas(B, B);
  boardC.className = 'board';
  place(boardC, bx, by);
  const bctx = boardC.getContext('2d');
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.fillStyle = 'rgba(255,255,255,.7)';
  bctx.fill(shapePath);
  const pad = Math.ceil(cell * 0.26) + 3;
  const defs = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!keep[r][c]) continue;
    const cx = gx + c * cell, cy = gy + r * cell;
    const jp = jigsawPath(cx, cy, cell, hE[r][c], -hE[r + 1][c], -vE[r][c + 1], vE[r][c]);
    defs.push({ r, c, cx, cy, jp });
  }
  bctx.save();
  bctx.clip(shapePath);
  bctx.strokeStyle = 'rgba(60,40,110,.28)'; bctx.lineWidth = 1.5; bctx.setLineDash([5, 4]);
  defs.forEach((d) => bctx.stroke(d.jp));
  bctx.restore();
  bctx.strokeStyle = 'rgba(60,40,110,.55)'; bctx.lineWidth = 3; bctx.setLineDash([]);
  bctx.stroke(shapePath);

  // hint picture (ghost) shown on the board
  const hintC = makeCanvas(B, B);
  hintC.className = 'hintpic' + (state.hint ? '' : ' off');
  place(hintC, bx, by);
  hintC.getContext('2d').drawImage(pic, 0, 0);

  const label = document.createElement('div');
  label.className = 'tray-label';
  label.textContent = 'Pieces';
  label.style.left = L.tray.x + 14 + 'px'; label.style.top = L.tray.y + 8 + 'px';
  stage.appendChild(label);

  // draw every piece
  const size = cell + pad * 2;
  const sorted = defs.map((d) => ({ ...d, order: rng() }));
  sorted.forEach((d) => {
    const cv = makeCanvas(size, size);
    cv.className = 'piece';
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(dpr, 0, 0, dpr, -(d.cx - pad) * dpr, -(d.cy - pad) * dpr);
    ctx.save();
    ctx.clip(d.jp);
    ctx.save();
    ctx.clip(shapePath);
    ctx.drawImage(pic, 0, 0, B, B);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,15,60,.3)'; ctx.stroke(d.jp);
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(d.jp);
    ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(45,34,80,.95)'; ctx.stroke(shapePath);
    ctx.restore();
    const piece = {
      el: cv, ctx, size, x: 0, y: 0,
      tx: bx + d.cx - pad, ty: by + d.cy - pad,
      placed: false, z: 1,
    };
    state.pieces.push(piece);
    stage.appendChild(cv);
  });
  state.exp = { defs, pad, cell, shapePath, bb: { x0, y0, bw, bh }, name: shapeName };
  updateExportNote();
  state.snap = Math.max(16, cell * 0.38);
  state.cell = cell;
  state.tray = L.tray;
  state.shapeName = shapeName;
  scatter();
  updateProgress();
  $('#levelLabel').textContent = `${state.pieces.length} pieces · ${shapeName}`;
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
  c.style.width = w + 'px'; c.style.height = h + 'px';
  if (!c.className) stage.appendChild(c);
  return c;
}
function place(el, x, y) { el.style.left = x + 'px'; el.style.top = y + 'px'; }
function move(p, x, y) { p.x = x; p.y = y; p.el.style.left = x + 'px'; p.el.style.top = y + 'px'; }

function makePicture(B, shapePath, bb, colors, rng, photo) {
  const c = document.createElement('canvas');
  c.width = c.height = Math.ceil(B * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (photo) {
    g.save(); g.clip(shapePath); g.drawImage(photo, 0, 0, B, B); g.restore();
    return c;
  }
  g.save();
  g.clip(shapePath);
  const grad = g.createLinearGradient(bb.x0, bb.y0, bb.x0 + bb.bw, bb.y0 + bb.bh);
  colors.slice(0, 4).forEach((col, i, a) => grad.addColorStop(i / (a.length - 1), col));
  g.fillStyle = grad; g.fillRect(0, 0, B, B);
  // big soft blobs, dots and stripes so each piece looks different
  for (let i = 0; i < 14; i++) {
    g.fillStyle = colors[Math.floor(rng() * colors.length)] + 'aa';
    g.beginPath(); g.arc(bb.x0 + rng() * bb.bw, bb.y0 + rng() * bb.bh, B * (0.06 + rng() * 0.12), 0, TAU); g.fill();
  }
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = B * 0.012;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    const yy = bb.y0 + rng() * bb.bh;
    g.moveTo(bb.x0, yy);
    for (let x = 0; x <= bb.bw; x += B / 20) g.lineTo(bb.x0 + x, yy + Math.sin(x / (B * 0.06) + i) * B * 0.03);
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.75)';
  for (let i = 0; i < 30; i++) {
    g.beginPath(); g.arc(bb.x0 + rng() * bb.bw, bb.y0 + rng() * bb.bh, B * (0.004 + rng() * 0.012), 0, TAU); g.fill();
  }
  // a friendly face in the middle
  const fx = bb.x0 + bb.bw / 2, fy = bb.y0 + bb.bh / 2, fs = Math.min(bb.bw, bb.bh) * 0.16;
  g.fillStyle = '#fff';
  [-1, 1].forEach((s) => { g.beginPath(); g.ellipse(fx + s * fs * 1.1, fy - fs * 0.4, fs * 0.55, fs * 0.7, 0, 0, TAU); g.fill(); });
  g.fillStyle = '#2d2250';
  [-1, 1].forEach((s) => { g.beginPath(); g.arc(fx + s * fs * 1.1 + fs * 0.08, fy - fs * 0.3, fs * 0.28, 0, TAU); g.fill(); });
  g.strokeStyle = '#2d2250'; g.lineWidth = fs * 0.22; g.lineCap = 'round';
  g.beginPath(); g.arc(fx, fy + fs * 0.35, fs * 1.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,90,120,.45)';
  [-1, 1].forEach((s) => { g.beginPath(); g.arc(fx + s * fs * 2, fy + fs * 0.5, fs * 0.42, 0, TAU); g.fill(); });
  g.restore();
  return c;
}

function scatter() {
  const t = state.tray;
  state.pieces.forEach((p) => {
    if (p.placed) return;
    const maxX = Math.max(0, t.w - p.size), maxY = Math.max(0, t.h - p.size - 24);
    move(p, t.x + Math.random() * maxX, t.y + 24 + Math.random() * maxY);
    p.z = ++state.z; p.el.style.zIndex = p.z;
  });
}

/* --------------------------------------------------------------- dragging */
function pieceAt(x, y) {
  const list = state.pieces.filter((p) => !p.placed).sort((a, b) => b.z - a.z);
  for (const p of list) {
    const lx = x - p.x, ly = y - p.y;
    if (lx < 0 || ly < 0 || lx >= p.size || ly >= p.size) continue;
    const a = p.ctx.getImageData(Math.floor(lx * dpr), Math.floor(ly * dpr), 1, 1).data[3];
    if (a > 30) return p;
  }
  return null;
}
function pos(e) { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

stage.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  const [x, y] = pos(e);
  const p = pieceAt(x, y);
  if (!p) return;
  stage.setPointerCapture(e.pointerId);
  p.z = ++state.z; p.el.style.zIndex = p.z; p.el.classList.add('lift');
  state.drag = { p, dx: x - p.x, dy: y - p.y, id: e.pointerId };
  stage.classList.add('dragging');
  beep(520, 0.05, 'triangle', 0.08);
  e.preventDefault();
});
stage.addEventListener('pointermove', (e) => {
  const d = state.drag;
  if (!d || e.pointerId !== d.id) return;
  const [x, y] = pos(e);
  const m = d.p.size * 0.3;
  move(d.p,
    Math.min(Math.max(x - d.dx, -m), stage.clientWidth - d.p.size + m),
    Math.min(Math.max(y - d.dy, -m), stage.clientHeight - d.p.size + m));
});
function endDrag(e) {
  const d = state.drag;
  if (!d || e.pointerId !== d.id) return;
  state.drag = null;
  stage.classList.remove('dragging');
  const p = d.p;
  p.el.classList.remove('lift');
  if (Math.hypot(p.x - p.tx, p.y - p.ty) <= state.snap) {
    move(p, p.tx, p.ty);
    p.placed = true; p.z = 1; p.el.style.zIndex = 1;
    p.el.classList.add('placed');
    state.placed++;
    updateProgress();
    beep(660, 0.1, 'sine', 0.18); setTimeout(() => beep(880, 0.12, 'sine', 0.15), 80);
    if (state.placed === state.pieces.length) win();
  }
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

function updateProgress() {
  const n = state.pieces.length;
  $('#count').textContent = `${state.placed} / ${n}`;
  $('#bar').style.width = n ? (state.placed / n) * 100 + '%' : '0';
}

/* -------------------------------------------------------------------- win */
function win() {
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.2), i * 140));
  confetti();
  setTimeout(() => {
    $('#winText').textContent = `You finished the ${state.pieces.length}-piece ${state.shapeName.toLowerCase()} puzzle!`;
    $('#win').hidden = false;
  }, 900);
}
function confetti() {
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  const w = stage.clientWidth, h = stage.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  stage.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff', '#ff9ecd'];
  const bits = Array.from({ length: 140 }, () => ({
    x: Math.random() * w, y: -20 - Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4,
    s: 5 + Math.random() * 7, r: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0],
  }));
  const t0 = performance.now();
  (function frame(now) {
    g.clearRect(0, 0, w, h);
    bits.forEach((b) => {
      b.x += b.vx; b.y += b.vy; b.r += b.vr;
      g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); g.restore();
    });
    if (now - t0 < 4000 && stage.contains(cv)) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

/* --------------------------------------------------------------------- UI */
/* ------------------------------------------------------------ STL export */
function exportParams() {
  const num = (id, d) => { const v = parseFloat($(id).value); return v > 0 ? v : d; };
  return { size: num('#mmSize', 120), thick: num('#mmThick', 4), gap: Math.max(0, parseFloat($('#mmGap').value) || 0), spread: $('#layout').value === 'spread' };
}
function updateExportNote() {
  const X = state.exp; if (!X) return;
  const p = exportParams();
  const cellMM = (X.cell * p.size) / Math.max(X.bb.bw, X.bb.bh);
  let msg = `${X.defs.length} pieces, about ${cellMM.toFixed(1)} mm each.`;
  if (cellMM < 9) msg += ' ⚠ Small pieces may be hard to print: raise the size or lower the difficulty.';
  else if (p.gap > cellMM * 0.08) msg += ' ⚠ Large gap: pieces may fit loosely.';
  $('#exportNote').textContent = msg;
}
function exportSTL() {
  const X = state.exp; if (!X) return;
  const { size, thick, gap, spread } = exportParams();
  const mmPx = size / Math.max(X.bb.bw, X.bb.bh);
  const m = Math.min(5, Math.max(1.5, 120 / X.cell));          // mask pixels per board pixel
  const W = Math.ceil((X.cell + 2 * X.pad) * m);
  const SP = 4;                                                  // extra spacing (mm) for "spread out"
  const tri = [];
  let pieces = 0;
  for (const d of X.defs) {
    const c = document.createElement('canvas');
    c.width = c.height = W;
    const g = c.getContext('2d', { willReadFrequently: true });
    const ox = d.cx - X.pad, oy = d.cy - X.pad;
    g.setTransform(m, 0, 0, m, -ox * m, -oy * m);
    g.fillStyle = '#000';
    g.save(); g.clip(d.jp); g.clip(X.shapePath); g.fillRect(ox, oy, W / m, W / m); g.restore();
    if (gap > 0) { // shave half the gap off every seam so neighbours never fuse
      g.globalCompositeOperation = 'destination-out';
      g.lineWidth = gap / mmPx; g.lineJoin = 'round'; g.stroke(d.jp);
    }
    let any = false;
    for (let poly of Geo.contours(alphaOf(c), W, W, 128)) {
      poly = Geo.simplify(poly, 0.5);
      if (poly.length < 3) continue;
      const pts = poly.map(([px, py]) => [
        (px / m + ox - X.bb.x0) * mmPx + (spread ? d.c * SP : 0),
        -((py / m + oy - X.bb.y0) * mmPx) - (spread ? d.r * SP : 0),
      ]);
      if (Math.abs(Geo.area(pts)) < 0.5) continue;
      if (Geo.area(pts) < 0) pts.reverse();
      Geo.extrude(pts, 0, thick, tri);
      any = true;
    }
    if (any) pieces++;
  }
  const blob = Geo.stlBlob(new Float32Array(tri), 'puzzle');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `puzzle-${X.name.toLowerCase().replace(/\W+/g, '-')}-${pieces}pcs.stl`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  $('#exportNote').textContent = `Saved ${a.download}: ${pieces} pieces, ${(tri.length / 9).toLocaleString()} triangles. Open it in your slicer (Cura, PrusaSlicer, Bambu Studio…).`;
}

function thumb(path, S, drawSize) {
  const c = document.createElement('canvas');
  c.width = c.height = drawSize;
  const g = c.getContext('2d');
  g.scale(drawSize / S, drawSize / S);
  g.fillStyle = '#ffb347'; g.fill(path);
  g.strokeStyle = '#2d2250'; g.lineWidth = 3 * (S / drawSize); g.lineJoin = 'round'; g.stroke(path);
  return c;
}

function buildUI() {
  const addChoice = (wrap, id, name, path, S, label) => {
    const b = document.createElement('button');
    b.className = 'shape'; b.title = name; b.dataset.id = id; b.setAttribute('aria-label', name);
    b.appendChild(thumb(path, S, 72));
    if (label) { const s = document.createElement('span'); s.textContent = name; b.appendChild(s); }
    b.addEventListener('click', () => { state.shapeId = id; state.seed = (Math.random() * 1e9) | 0; refreshUI(); buildPuzzle(); });
    wrap.appendChild(b);
  };
  SHAPES.forEach((s) => addChoice($('#shapes'), s.id, s.name, s.build(72), 72, false));
  ANIMALS.list.forEach((a) => addChoice($('#animals'), a.id, a.name, animalPath(a, 160), 160, true));
  // cat and fish are shapes, but kids will look for them under animals
  ['cat', 'fish'].forEach((id) => { const s = SHAPES.find((x) => x.id === id); addChoice($('#animals'), id, s.name, s.build(72), 72, true); });

  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === t));
    document.querySelectorAll('.tabpane').forEach((p) => { p.hidden = p.id !== 'tab-' + t.dataset.tab; });
  }));
  $('#file').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const img = new Image();
    img.onload = () => { state.img = img; state.shapeId = 'image'; state.seed = (Math.random() * 1e9) | 0; refreshUI(); buildPuzzle(); };
    img.onerror = () => alert('Sorry, that file could not be opened as a picture.');
    img.src = URL.createObjectURL(f);
  });
  document.querySelectorAll('input[name=imgmode]').forEach((r) => r.addEventListener('change', () => {
    state.imgMode = r.value; $('#tolWrap').hidden = r.value !== 'cutout';
    if (state.img) { state.shapeId = 'image'; buildPuzzle(); }
  }));
  let tt;
  $('#tol').addEventListener('input', (e) => {
    state.tol = +e.target.value;
    clearTimeout(tt); tt = setTimeout(() => { if (state.img) buildPuzzle(); }, 200);
  });
  ['#mmSize', '#mmThick', '#mmGap', '#layout'].forEach((s) => $(s).addEventListener('input', updateExportNote));
  $('#exportBtn').addEventListener('click', exportSTL);

  PALETTES.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'pal'; b.title = p.name; b.setAttribute('aria-label', p.name);
    b.style.background = `conic-gradient(${p.c.join(',')}, ${p.c[0]})`;
    b.addEventListener('click', () => { state.palette = i; refreshUI(); buildPuzzle(); });
    $('#palettes').appendChild(b);
  });

  $('#surprise').addEventListener('click', () => { state.shapeId = 'random'; state.seed = (Math.random() * 1e9) | 0; refreshUI(); buildPuzzle(); });
  document.querySelectorAll('.lvl').forEach((b) => b.addEventListener('click', () => {
    state.n = +b.dataset.n; $('#slider').value = state.n; refreshUI(); buildPuzzle();
  }));
  let t;
  $('#slider').addEventListener('input', (e) => {
    state.n = +e.target.value; refreshUI();
    clearTimeout(t); t = setTimeout(buildPuzzle, 150);
  });
  $('#again').addEventListener('click', () => { state.seed = (Math.random() * 1e9) | 0; buildPuzzle(); });
  $('#shuffle').addEventListener('click', scatter);
  $('#hint').addEventListener('click', () => {
    state.hint = !state.hint;
    const h = stage.querySelector('.hintpic');
    if (h) h.classList.toggle('off', !state.hint);
    refreshUI();
  });
  $('#sound').addEventListener('click', () => { state.mute = !state.mute; $('#sound').textContent = state.mute ? '🔇' : '🔊'; });
  $('#winAgain').addEventListener('click', () => { state.seed = (Math.random() * 1e9) | 0; buildPuzzle(); });
  $('#winHarder').addEventListener('click', () => {
    state.n = Math.min(14, state.n + 2); $('#slider').value = state.n;
    state.seed = (Math.random() * 1e9) | 0; refreshUI(); buildPuzzle();
  });
}
function refreshUI() {
  document.querySelectorAll('.shape').forEach((b) => b.classList.toggle('on', b.dataset.id === state.shapeId));
  document.querySelectorAll('.lvl').forEach((b) => b.classList.toggle('on', +b.dataset.n === state.n));
  document.querySelectorAll('.pal').forEach((b, i) => b.classList.toggle('on', i === state.palette));
  $('#surprise').style.borderColor = state.shapeId === 'random' ? 'var(--accent-2)' : '';
  $('#slider').value = state.n;
  const h = $('#hint');
  h.setAttribute('aria-pressed', state.hint);
  h.textContent = state.hint ? '💡 Hide picture hint' : '💡 Show picture hint';
  if (!state.pieces.length) $('#levelLabel').textContent = `about ${state.n} pieces across`;
}

let rt;
window.addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const key = `${stage.clientWidth}x${stage.clientHeight}`;
    if (key !== state.layoutKey) buildPuzzle();
  }, 250);
});

buildUI();
refreshUI();
buildPuzzle();
window.__puzzle = state; state.dbg = { cutoutPath, imageShape, pathFromAlpha };
})();
