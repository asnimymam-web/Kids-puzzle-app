/* Geometry helpers: raster outline tracing, polygon simplification,
   triangulation and binary STL writing. No dependencies. */
const Geo = (() => {
  'use strict';

  // Trace the outlines of a W*H alpha grid (values 0..255) with sub-pixel
  // marching squares. Returns polygons [[x,y],...] in grid coordinates (pixel
  // centres at +0.5). Only outer outlines are returned (holes are dropped).
  function contours(a, W, H, level = 128) {
    const val = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : a[y * W + x]);
    const W2 = W + 2;
    const hid = (x, y) => ((y + 1) * W2 + (x + 1)) * 2;      // edge (x,y)-(x+1,y)
    const vid = (x, y) => ((y + 1) * W2 + (x + 1)) * 2 + 1;  // edge (x,y)-(x,y+1)
    const next = new Map();

    const pointOn = (id, x, y, e) => {
      // e: 'T','B','L','R' of cell (x,y)
      let x0, y0, horiz;
      if (e === 'T') { x0 = x; y0 = y; horiz = true; }
      else if (e === 'B') { x0 = x; y0 = y + 1; horiz = true; }
      else if (e === 'L') { x0 = x; y0 = y; horiz = false; }
      else { x0 = x + 1; y0 = y; horiz = false; }
      const v0 = val(x0, y0), v1 = horiz ? val(x0 + 1, y0) : val(x0, y0 + 1);
      const t = (level - v0) / (v1 - v0);
      return horiz ? [x0 + t, y0] : [x0, y0 + t];
    };
    const edgeId = (x, y, e) => (e === 'T' ? hid(x, y) : e === 'B' ? hid(x, y + 1) : e === 'L' ? vid(x, y) : vid(x + 1, y));

    for (let y = -1; y < H; y++) {
      for (let x = -1; x < W; x++) {
        const tl = val(x, y), tr = val(x + 1, y), br = val(x + 1, y + 1), bl = val(x, y + 1);
        const idx = (tl >= level ? 1 : 0) | (tr >= level ? 2 : 0) | (br >= level ? 4 : 0) | (bl >= level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        let pairs;
        switch (idx) {
          case 1: case 14: pairs = [['L', 'T']]; break;
          case 2: case 13: pairs = [['T', 'R']]; break;
          case 4: case 11: pairs = [['R', 'B']]; break;
          case 8: case 7: pairs = [['B', 'L']]; break;
          case 3: case 12: pairs = [['L', 'R']]; break;
          case 6: case 9: pairs = [['T', 'B']]; break;
          default: {
            const centre = (tl + tr + br + bl) / 4 >= level;
            if (idx === 5) pairs = centre ? [['T', 'R'], ['B', 'L']] : [['L', 'T'], ['R', 'B']];
            else pairs = centre ? [['L', 'T'], ['R', 'B']] : [['T', 'R'], ['B', 'L']];
          }
        }
        for (const [e1, e2] of pairs) {
          let p = pointOn(0, x, y, e1), q = pointOn(0, x, y, e2);
          let s = e1, t = e2;
          // keep "inside" on the right of travel; probe with the cell's bilinear field
          // Travel with "inside" on the right. Whether we ENTER the cell through an edge
          // depends only on which of that edge's two ends is inside.
          const I = (v) => v >= level;
          const enters = e1 === 'T' ? I(tl) : e1 === 'B' ? I(br) : e1 === 'L' ? I(bl) : I(tr);
          if (!enters) { [p, q] = [q, p]; [s, t] = [t, s]; }
          next.set(edgeId(x, y, s), { p, q, end: edgeId(x, y, t) });
        }
      }
    }

    const out = [], seen = new Set();
    for (const [start, seg0] of next) {
      if (seen.has(start)) continue;
      const poly = [];
      let id = start, seg = seg0, guard = 0;
      while (seg && !seen.has(id) && guard++ < 5e6) {
        seen.add(id);
        poly.push([seg.p[0] + 0.5, seg.p[1] + 0.5]);
        id = seg.end; seg = next.get(id);
      }
      if (poly.length > 3 && area(poly) > 0) out.push(poly); // positive = outer
    }
    return out;
  }

  function area(p) {
    let s = 0;
    for (let i = 0, n = p.length; i < n; i++) { const a = p[i], b = p[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; }
    return s / 2;
  }

  // Douglas-Peucker on a closed polygon.
  function simplify(pts, eps) {
    const n = pts.length;
    if (n < 8) return pts;
    let far = 1, fd = 0;
    for (let i = 1; i < n; i++) { const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2; if (d > fd) { fd = d; far = i; } }
    const arr = pts.concat([pts[0]]);
    const out = [];
    const rec = (i, j) => {
      const [ax, ay] = arr[i], [bx, by] = arr[j];
      const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
      let md = 0, mi = -1;
      for (let k = i + 1; k < j; k++) {
        const d = Math.abs((arr[k][0] - ax) * dy - (arr[k][1] - ay) * dx) / L;
        if (d > md) { md = d; mi = k; }
      }
      if (md > eps) { rec(i, mi); rec(mi, j); } else out.push(arr[j]);
    };
    out.push(arr[0]);
    rec(0, far); rec(far, n);
    out.pop(); // last equals first
    return out;
  }

  // Ear-clipping triangulation of a simple CCW polygon. Returns index triples.
  function triangulate(p) {
    const idx = p.map((_, i) => i), tris = [];
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inTri = (q, a, b, c) => cross(a, b, q) >= 0 && cross(b, c, q) >= 0 && cross(c, a, q) >= 0;
    let i = 0, fails = 0;
    while (idx.length > 3) {
      const n = idx.length;
      i %= n;
      const a = idx[(i + n - 1) % n], b = idx[i], c = idx[(i + 1) % n];
      let ear = cross(p[a], p[b], p[c]) > 1e-9;
      if (ear) {
        for (const j of idx) {
          if (j === a || j === b || j === c) continue;
          const q = p[j];
          if ((q[0] === p[a][0] && q[1] === p[a][1]) || (q[0] === p[b][0] && q[1] === p[b][1]) || (q[0] === p[c][0] && q[1] === p[c][1])) continue;
          if (inTri(q, p[a], p[b], p[c])) { ear = false; break; }
        }
      }
      if (ear) { tris.push([a, b, c]); idx.splice(i, 1); fails = 0; }
      else {
        i++;
        if (++fails > n) { // no ear found (degenerate input): drop the flattest vertex
          let best = 0, bv = Infinity;
          for (let k = 0; k < n; k++) {
            const v = Math.abs(cross(p[idx[(k + n - 1) % n]], p[idx[k]], p[idx[(k + 1) % n]]));
            if (v < bv) { bv = v; best = k; }
          }
          idx.splice(best, 1); fails = 0;
        }
      }
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  }

  // Extrude CCW polygons (mm, y up) into triangles pushed onto `out` (flat xyz arrays of 9 floats each).
  function extrude(poly, z0, z1, out) {
    const tris = triangulate(poly);
    const V = (p, z) => [p[0], p[1], z];
    for (const [a, b, c] of tris) {
      out.push(...V(poly[a], z1), ...V(poly[b], z1), ...V(poly[c], z1));
      out.push(...V(poly[a], z0), ...V(poly[c], z0), ...V(poly[b], z0));
    }
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      out.push(...V(a, z0), ...V(b, z0), ...V(b, z1));
      out.push(...V(a, z0), ...V(b, z1), ...V(a, z1));
    }
  }

  function stlBlob(tri, name = 'puzzle') {
    const n = tri.length / 9;
    const buf = new ArrayBuffer(84 + n * 50);
    const dv = new DataView(buf);
    const head = `Binary STL ${name}`;
    for (let i = 0; i < head.length && i < 80; i++) dv.setUint8(i, head.charCodeAt(i));
    dv.setUint32(80, n, true);
    let o = 84;
    for (let t = 0; t < n; t++) {
      const b = t * 9;
      const ux = tri[b + 3] - tri[b], uy = tri[b + 4] - tri[b + 1], uz = tri[b + 5] - tri[b + 2];
      const vx = tri[b + 6] - tri[b], vy = tri[b + 7] - tri[b + 1], vz = tri[b + 8] - tri[b + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true);
      for (let k = 0; k < 9; k++) dv.setFloat32(o + 12 + k * 4, tri[b + k], true);
      dv.setUint16(o + 48, 0, true);
      o += 50;
    }
    return new Blob([buf], { type: 'model/stl' });
  }

  return { contours, simplify, area, triangulate, extrude, stlBlob };
})();
