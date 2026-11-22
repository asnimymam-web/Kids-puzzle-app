/* Animal silhouettes, composed from simple primitives in a unit square (facing right).
   Each entry draws filled primitives onto a canvas context; the union is later
   traced into a single clean outline (see Geo.contours). */
const ANIMALS = (() => {
  'use strict';
  const TAU = Math.PI * 2;

  // g: drawing helper scaled to the board. All inputs are in 0..1 units.
  function helper(ctx, S) {
    const f = (u) => S * (0.04 + 0.92 * u), k = S * 0.92;
    return {
      circle(x, y, r) { ctx.beginPath(); ctx.arc(f(x), f(y), r * k, 0, TAU); ctx.fill(); },
      ell(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(f(x), f(y), rx * k, ry * k, rot, 0, TAU); ctx.fill(); },
      poly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(f(x), f(y)) : ctx.moveTo(f(x), f(y)))); ctx.closePath(); ctx.fill(); },
      // thick smooth stroke through points with per-point radius
      sweep(pts, radii) {
        const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
        const r = Array.isArray(radii) ? radii : pts.map(() => radii);
        for (let i = 0; i < pts.length - 1; i++) {
          const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
          const steps = 60;
          for (let s = 0; s <= steps; s++) {
            const t = s / steps, t2 = t * t, t3 = t2 * t;
            const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
            ctx.beginPath();
            ctx.arc(f(cr(a[0], b[0], c[0], d[0])), f(cr(a[1], b[1], c[1], d[1])), (r[i] + (r[i + 1] - r[i]) * t) * k, 0, TAU);
            ctx.fill();
          }
        }
      },
    };
  }

  const list = [
    { id: 'lion', name: 'Lion', draw(g) {
      g.circle(0.7, 0.4, 0.2);
      for (let i = 0; i < 14; i++) g.circle(0.7 + 0.2 * Math.cos((i * TAU) / 14), 0.4 + 0.2 * Math.sin((i * TAU) / 14), 0.075);
      g.ell(0.9, 0.5, 0.085, 0.07);
      g.ell(0.36, 0.56, 0.27, 0.16);
      [[0.16, 0.68], [0.28, 0.7], [0.5, 0.7], [0.6, 0.66]].forEach(([x, y]) => g.sweep([[x, y], [x, 0.93]], 0.04));
      g.sweep([[0.12, 0.5], [0.05, 0.42], [0.06, 0.2]], [0.025, 0.025, 0.02]);
      g.circle(0.06, 0.17, 0.05);
    } },
    { id: 'sheep', name: 'Sheep', draw(g) {
      [[0.2, 0.45], [0.29, 0.34], [0.43, 0.3], [0.56, 0.36], [0.61, 0.5], [0.53, 0.62], [0.38, 0.65], [0.24, 0.6]].forEach(([x, y]) => g.circle(x, y, 0.15));
      g.circle(0.41, 0.48, 0.2);
      g.sweep([[0.6, 0.48], [0.76, 0.5]], 0.08);
      g.ell(0.82, 0.54, 0.075, 0.13, -0.25);
      g.ell(0.74, 0.4, 0.04, 0.08, 0.9);
      [[0.28, 0.65], [0.52, 0.65]].forEach(([x, y]) => g.sweep([[x, y], [x, 0.94]], 0.035));
    } },
    { id: 'rabbit', name: 'Rabbit', draw(g) {
      g.ell(0.4, 0.7, 0.28, 0.19, -0.08);
      g.circle(0.27, 0.78, 0.15);
      g.circle(0.73, 0.5, 0.14);
      g.ell(0.85, 0.56, 0.065, 0.05);
      g.sweep([[0.68, 0.4], [0.6, 0.2], [0.6, 0.05]], [0.06, 0.06, 0.045]);
      g.sweep([[0.78, 0.4], [0.85, 0.2], [0.9, 0.06]], [0.06, 0.06, 0.045]);
      g.circle(0.11, 0.68, 0.075);
      g.ell(0.33, 0.9, 0.15, 0.055);
      g.sweep([[0.62, 0.74], [0.66, 0.93]], 0.045);
    } },
    { id: 'lizard', name: 'Lizard', draw(g) {
      g.sweep([[0.93, 0.5], [0.76, 0.5], [0.55, 0.52], [0.38, 0.58], [0.2, 0.74], [0.08, 0.7], [0.03, 0.55]], [0.07, 0.09, 0.1, 0.07, 0.04, 0.025, 0.012]);
      g.ell(0.88, 0.5, 0.09, 0.07);
      g.sweep([[0.7, 0.45], [0.78, 0.28], [0.9, 0.22]], 0.032);
      g.sweep([[0.7, 0.56], [0.78, 0.74], [0.9, 0.8]], 0.032);
      g.sweep([[0.42, 0.5], [0.34, 0.28], [0.22, 0.22]], 0.032);
      g.sweep([[0.42, 0.62], [0.36, 0.8], [0.24, 0.84]], 0.032);
    } },
    { id: 'snake', name: 'Snake', draw(g) {
      g.sweep([[0.06, 0.88], [0.25, 0.92], [0.5, 0.8], [0.52, 0.55], [0.3, 0.42], [0.3, 0.2], [0.55, 0.12], [0.82, 0.2]],
        [0.012, 0.04, 0.07, 0.075, 0.075, 0.07, 0.065, 0.065]);
      g.ell(0.87, 0.22, 0.09, 0.065, 0.2);
    } },
    { id: 'elephant', name: 'Elephant', draw(g) {
      g.ell(0.45, 0.5, 0.29, 0.2);
      g.circle(0.77, 0.42, 0.15);
      g.ell(0.68, 0.45, 0.07, 0.14, 0.2);
      g.sweep([[0.86, 0.5], [0.95, 0.65], [0.9, 0.85], [0.84, 0.88]], [0.055, 0.045, 0.035, 0.025]);
      [[0.26, 0.6], [0.4, 0.65], [0.55, 0.65], [0.66, 0.6]].forEach(([x, y]) => g.sweep([[x, y], [x, 0.94]], 0.06));
      g.sweep([[0.22, 0.46], [0.09, 0.5], [0.07, 0.68]], [0.03, 0.022, 0.018]);
    } },
    { id: 'duck', name: 'Duck', draw(g) {
      g.ell(0.45, 0.66, 0.3, 0.2);
      g.sweep([[0.62, 0.6], [0.72, 0.42], [0.72, 0.25]], [0.1, 0.09, 0.08]);
      g.circle(0.74, 0.22, 0.1);
      g.ell(0.9, 0.26, 0.085, 0.03);
      g.poly([[0.28, 0.58], [0.03, 0.4], [0.12, 0.72]]);
      g.sweep([[0.42, 0.8], [0.4, 0.94]], 0.025);
    } },
    { id: 'turtle', name: 'Turtle', draw(g) {
      g.ell(0.47, 0.5, 0.3, 0.26);
      g.sweep([[0.7, 0.5], [0.88, 0.5]], [0.08, 0.075]);
      g.circle(0.9, 0.5, 0.085);
      [[0.3, 0.26, 0.2, 0.08], [0.62, 0.26, 0.72, 0.08], [0.3, 0.74, 0.2, 0.92], [0.62, 0.74, 0.72, 0.92]].forEach(([x, y, ex, ey]) => g.sweep([[x, y], [ex, ey]], [0.06, 0.05]));
      g.poly([[0.2, 0.46], [0.02, 0.5], [0.2, 0.56]]);
    } },
    { id: 'butterfly', name: 'Butterfly', draw(g) {
      g.ell(0.3, 0.3, 0.2, 0.2, 0.4); g.ell(0.7, 0.3, 0.2, 0.2, -0.4);
      g.ell(0.34, 0.7, 0.14, 0.17, -0.5); g.ell(0.66, 0.7, 0.14, 0.17, 0.5);
      g.sweep([[0.5, 0.2], [0.5, 0.9]], 0.04);
      g.sweep([[0.49, 0.2], [0.4, 0.04]], 0.012); g.sweep([[0.51, 0.2], [0.6, 0.04]], 0.012);
    } },
  ];

  // Render an animal into a size x size alpha canvas.
  function render(a, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#000';
    a.draw(helper(ctx, size));
    return c;
  }

  return { list, render };
})();
