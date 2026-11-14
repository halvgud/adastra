// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Short first-person cutscenes (10 s) after winning a room puzzle. Old-school "fake 3D", everything drawn by code:
//   outside (trip, clean, regolith): the airlock opens and you walk on the Moon or Mars; the ground is drawn row by row
//     in perspective, rocks and your partner are flat pictures that grow as you get closer.
//   inside (lab, fix, tend): you walk down a base corridor (a tiny ray caster: walls, floor and ceiling in perspective),
//     the door at the end slides open, and then a close-up of the work.
// Called from js/game.js → playMini (JAMT_EVA.has(job), JAMT_EVA.play). Skipped when the player prefers less motion.
// opt.at = draw one fixed moment (ms) without animating: used to check the pictures.
(function (root) {
  'use strict';
  const W = 192, H = 120, F = 120, CAM = 1.6, DUR = 10000;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1), ease = x => x * x * (3 - 2 * x);
  const mkRnd = seed => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
  const rgb = (c, m, fog, fc) => `rgb(${(c[0] * m * (1 - fog) + fc[0] * fog) | 0},${(c[1] * m * (1 - fog) + fc[1] * fog) | 0},${(c[2] * m * (1 - fog) + fc[2] * fog) | 0})`;

  // ---------- ground texture (outside): soft noise, craters with a bright rim, pebbles ----------
  const TEX = {};
  function makeTex(seed) {
    if (TEX[seed]) return TEX[seed];
    const N = 128, t = new Float32Array(N * N), rnd = mkRnd(seed * 7919 + 1), g = []; for (let i = 0; i < 256; i++) g.push(rnd());
    const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = ease(x - xi), fy = ease(y - yi), at = (a, b) => g[((b & 15) * 16) + (a & 15)];
      return (at(xi, yi) * (1 - fx) + at(xi + 1, yi) * fx) * (1 - fy) + (at(xi, yi + 1) * (1 - fx) + at(xi + 1, yi + 1) * fx) * fy; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) t[y * N + x] = 0.55 + 0.25 * vn(x / 16, y / 16) + 0.12 * vn(x / 5, y / 5) + 0.08 * (rnd() - 0.5);
    for (let c = 0; c < 14; c++) { const cx = rnd() * N, cy = rnd() * N, r = 3 + rnd() * 9;
      for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) { const d = Math.hypot(x, y) / r, i = (((cy + y) | 0) & (N - 1)) * N + (((cx + x) | 0) & (N - 1));
        if (d < 0.85) t[i] -= 0.22 * (1 - d / 0.85) + 0.06; else if (d < 1.15) t[i] += 0.18 * (1 - Math.abs(d - 1) / 0.15); } }
    for (let p = 0; p < 260; p++) { const i = ((rnd() * N) | 0) * N + ((rnd() * N) | 0); t[i] += rnd() < 0.5 ? 0.3 : -0.25; }
    return (TEX[seed] = { N, t });
  }

  // ---------- outside: sky, hills and ground in perspective, then things standing on the ground ----------
  function outsideWorld(moon, path, clear) { // path(s) = x of the walking line at distance s; clear = keep rocks this far off it
    const rnd = mkRnd(moon ? 99 : 131), rocks = [];
    for (let i = 0; i < 60; i++) { const y = -2 + rnd() * 34, x = (rnd() - 0.5) * 18; if (Math.abs(x - path(y)) < (clear || 1.1)) continue; rocks.push({ x, y, r: 0.15 + rnd() * 0.45, k: 'rock' }); }
    return { moon, tex: makeTex(moon ? 7 : 11), rocks, stars: Array.from({ length: 70 }, () => ({ a: rnd() * 6.283, y: rnd() * 44, b: rnd() })),
      ground: moon ? [150, 150, 156] : [178, 98, 58], fogC: moon ? [8, 8, 14] : [214, 160, 118], fogD: moon ? 40 : 22,
      skyTop: moon ? [2, 2, 8] : [196, 128, 92], skyLow: moon ? [10, 10, 22] : [232, 186, 140] };
  }
  const ridge = a => 4 + 3 * Math.sin(a * 3.1) + 2 * Math.sin(a * 7.3 + 1) + 1.2 * Math.sin(a * 17.9);
  function drawOutside(g, img, E, c, extra, t) {
    const px = img.data, ca = Math.cos(c.a), sa = Math.sin(c.a), N = E.tex.N, T = E.tex.t;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; px[i + 3] = 255;
      if (y <= c.hy) { const k = clamp((y - (c.hy - 50)) / 50, 0, 1); for (let j = 0; j < 3; j++) px[i + j] = E.skyTop[j] + (E.skyLow[j] - E.skyTop[j]) * k; continue; }
      const d = CAM * F / (y - c.hy), lat = (x - W / 2) / F * d, wx = c.x + sa * d + ca * lat, wy = c.y + ca * d - sa * lat;
      const v = T[((((wy * 9) | 0) & (N - 1)) * N) + (((wx * 9) | 0) & (N - 1))], fog = Math.min(1, d / E.fogD);
      for (let j = 0; j < 3; j++) px[i + j] = E.ground[j] * v * (1 - fog) + E.fogC[j] * fog; }
    g.putImageData(img, 0, 0);
    const angX = a => W / 2 + Math.tan(a) * F;
    if (E.moon) { E.stars.forEach(s => { const da = ((s.a - c.a + 9.42) % 6.283) - 3.14; if (Math.abs(da) > 0.9) return; const y = c.hy - 6 - s.y; if (y < 0) return;
        g.fillStyle = s.b > 0.8 ? '#fff' : '#9aa3c0'; g.fillRect(angX(da) | 0, y | 0, 1, 1); });
      const ex = angX(0.35 - c.a), ey = c.hy - 30; g.fillStyle = '#2b5fd9'; g.beginPath(); g.arc(ex, ey, 7, 0, 6.283); g.fill(); // Earth
      g.fillStyle = '#3aa35a'; g.fillRect(ex - 3, ey - 2, 3, 3); g.fillRect(ex + 1, ey + 1, 3, 2); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(ex - 5, ey - 4, 4, 1); g.fillRect(ex, ey + 4, 4, 1);
      g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.arc(ex + 3, ey, 7, -1.57, 1.57); g.fill(); }
    else { const sx = angX(-0.4 - c.a), sy = c.hy - 34; g.fillStyle = 'rgba(255,240,220,.35)'; g.beginPath(); g.arc(sx, sy, 6, 0, 6.283); g.fill(); g.fillStyle = '#fff4e6'; g.beginPath(); g.arc(sx, sy, 3, 0, 6.283); g.fill(); }
    for (let x = 0; x < W; x++) { const h = ridge(c.a + Math.atan((x - W / 2) / F)); g.fillStyle = E.moon ? '#3a3a44' : '#a8603e'; g.fillRect(x, c.hy - h, 1, h + 1); }
    const items = E.rocks.concat(extra), seen = {};
    items.forEach(o => { const rx = o.x - c.x, ry = o.y - c.y; o.d = rx * sa + ry * ca; o.l = rx * ca - ry * sa; });
    items.filter(o => o.d > 0.35).sort((p, q) => q.d - p.d).forEach(o => {
      const sx = W / 2 + o.l / o.d * F, gy = c.hy + CAM * F / o.d, u = F / o.d, fog = Math.min(1, o.d / E.fogD);
      seen[o.k] = { sx, gy, u }; if (sx < -60 || sx > W + 60 || o.hide) return;
      if (o.k === 'rock' || o.k === 'sample') { const w = o.r * u * 2, h = o.r * u * 1.2, base = o.k === 'sample' ? [120, 90, 160] : E.ground;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(sx - w / 2, gy - 1, w * 1.1, Math.max(1, h * 0.25));
        g.fillStyle = rgb(base, 0.7, fog, E.fogC); g.beginPath(); g.ellipse(sx, gy - h / 2, w / 2, h / 2, 0, 0, 6.283); g.fill();
        g.fillStyle = rgb(base, 1.05, fog, E.fogC); g.beginPath(); g.ellipse(sx - w * 0.12, gy - h * 0.62, w * 0.3, h * 0.3, 0, 0, 6.283); g.fill();
        if (o.k === 'sample') { const tw = 0.5 + 0.5 * Math.sin(t / 120), sz = Math.max(1, u * 0.06); g.fillStyle = `rgba(240,228,66,${0.5 + 0.5 * tw})`;
          g.fillRect(sx - sz / 2, gy - h - sz * 3, sz, sz * 2); g.fillRect(sx - sz * 1.5, gy - h - sz * 2.5, sz * 3, sz); } }
      if (o.k === 'buddy') { const hgt = 1.8 * u, sw = hgt * 68 / 46, bob = c.walking ? (E.moon ? Math.abs(Math.sin(t / 420 + 1)) * u * 0.25 : Math.abs(Math.sin(t / 190)) * u * 0.05) : 0;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(sx - hgt * 0.2, gy - 1, hgt * 0.4, Math.max(1, hgt * 0.05));
        g.imageSmoothingEnabled = false; g.drawImage(o.img, sx - sw / 2, gy - bob - sw * 56 / 68, sw, sw); }
      if (o.k === 'panel') { const w = 1.6 * u, h = 0.9 * u, top = gy - 1.5 * u; // a solar panel on a post, a little dusty
        g.fillStyle = rgb([120, 120, 130], 1, fog, E.fogC); g.fillRect(sx - u * 0.04, top + h * 0.5, Math.max(1, u * 0.08), gy - top - h * 0.5);
        g.fillStyle = rgb([30, 50, 120], 1, fog, E.fogC); g.beginPath(); g.moveTo(sx - w / 2, top + h * 0.2); g.lineTo(sx + w / 2, top + h * 0.2); g.lineTo(sx + w * 0.45, top + h); g.lineTo(sx - w * 0.45, top + h); g.fill();
        g.fillStyle = rgb([90, 130, 220], 1, fog, E.fogC); for (let i = 1; i < 4; i++) g.fillRect(sx - w / 2 + w * i / 4, top + h * 0.2, Math.max(1, u * 0.02), h * 0.8);
        g.fillStyle = `rgba(${E.ground.join(',')},.45)`; g.fillRect(sx - w * 0.45, top + h * 0.55, w * 0.9, h * 0.45); }
      if (o.k === 'mound') { const w = 5 * u, h = 1.9 * u; // the shelter: a dome of soil with a wall of bags and a door
        g.fillStyle = rgb(E.ground, 0.75, fog, E.fogC); g.beginPath(); g.ellipse(sx, gy, w / 2, h, 0, 3.1416, 6.283); g.fill();
        g.fillStyle = rgb(E.ground, 0.95, fog, E.fogC); g.beginPath(); g.ellipse(sx - w * 0.1, gy - h * 0.15, w * 0.32, h * 0.7, 0, 3.1416, 6.283); g.fill();
        g.fillStyle = rgb([200, 170, 120], 1, fog, E.fogC); for (let r = 0; r < 3; r++) for (let b = 0; b < 5 - r; b++) g.fillRect(sx - w * 0.22 + (b + r * 0.5) * w * 0.09, gy - (r + 1) * u * 0.22, w * 0.08, u * 0.2);
        g.fillStyle = rgb([235, 235, 240], 1, fog, E.fogC); g.fillRect(sx + w * 0.18, gy - h * 0.55, w * 0.08, h * 0.55); } });
    return seen;
  }
  function walkCam(t, t0, t1, end, path, moon, still) { // walking along path from s = 0 to end between t0 and t1
    const w = seg(t, t0, t1), s = (w < 1 ? ease(w) * 0.15 + w * 0.85 : 1) * end, x = path(s), a = Math.atan2((path(s + 0.05) - path(s)) / 0.05, 1) * 0.8;
    const walking = t > t0 && t < t1 && !still, bob = walking ? (moon ? -Math.abs(Math.sin(t / 420)) * 4 : Math.sin(t / 190) * 1.2) : 0;
    return { x, y: s, a, hy: 46 + bob, s, walking };
  }
  function airlockDoor(g, t, sound) { // the airlock opening, for the first 1.6 s
    if (t >= 1600) return; const k = seg(t, 400, 1600), off = k * k * (W / 2 + 4);
    [[-1, 0], [1, W / 2]].forEach(([dir, x0]) => { const x = x0 + dir * off; g.fillStyle = '#8a93a6'; g.fillRect(x, 0, W / 2, H); g.fillStyle = '#6f778a'; for (let i = 0; i < 5; i++) g.fillRect(x + 6, 12 + i * 22, W / 2 - 12, 3);
      for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#111' : '#F0E442'; g.fillRect(dir < 0 ? x + W / 2 - 6 : x, i * 10, 6, 10); } });
    g.fillStyle = t < 400 ? '#d55e00' : '#3ddc97'; g.fillRect(W / 2 - 4, 4, 8, 4); if (t > 380 && t < 430) sound('door');
  }

  // ---------- inside: a corridor of the base (ray caster), with a sliding door at the end ----------
  const LEND = 9, WALLH = 2.4;
  function drawCorridor(g, img, th, c, door) {
    const px = img.data;
    for (let x = 0; x < W; x++) {
      const lat = (x - W / 2) / F, tw = lat > 0.0001 ? (1 - c.x) / lat : lat < -0.0001 ? (-1 - c.x) / lat : 1e9, te = LEND - c.y, end = te < tw, dist = end ? te : tw;
      const u = end ? c.x + lat * te : c.y + tw, top = c.hy - (WALLH - CAM) * F / dist, bot = c.hy + CAM * F / dist, shade = 1 / (1 + dist * 0.09) * (end ? 1 : lat > 0 ? 0.9 : 1);
      for (let y = 0; y < H; y++) { const i = (y * W + x) * 4; let col, m = 1; px[i + 3] = 255;
        if (y < top) { const d = (WALLH - CAM) * F / (c.hy - y), wx = c.x + lat * d, wy = c.y + d; // ceiling, with a strip of light
          col = Math.abs(wx) < 0.18 ? [235, 240, 255] : th.ceil; if ((wy % 1.5) < 0.08) m = 0.7; m *= Math.abs(wx) < 0.18 ? 1 : 1 / (1 + d * 0.09); }
        else if (y > bot) { const d = CAM * F / (y - c.hy), wx = c.x + lat * d, wy = c.y + d; // floor tiles
          col = Math.abs(wx) < 0.08 ? th.stripe : th.floor; if (((wx + 4) % 0.7) < 0.05 || (wy % 0.7) < 0.05) m = 0.65; m *= 1 / (1 + d * 0.09); }
        else { const v = (bot - y) / (bot - top) * WALLH; m = shade; // walls
          if (end && Math.abs(u) < 0.75 && v < 2.0) { const open = door * 0.75; // the door at the end, sliding open
            if (Math.abs(u) < open) { const k = 1 - Math.abs(u) / 0.75; col = [th.glow[0] * (0.6 + 0.4 * k), th.glow[1] * (0.6 + 0.4 * k), th.glow[2] * (0.6 + 0.4 * k)]; m = 1; }
            else { const edge = Math.abs(Math.abs(u) - open) < 0.08; col = edge ? (((v * 5) | 0) % 2 ? [20, 20, 20] : [240, 228, 66]) : [140, 148, 166]; if ((v % 0.5) < 0.04) m *= 0.8; } }
          else if (end && v > 2.05 && v < 2.3 && Math.abs(u) < 0.5) { col = th.glow; m = 1; } // lit sign over the door
          else { col = th.wall; if ((u % 1.5 + 1.5) % 1.5 < 0.05) m *= 0.6; if (v < 0.15) m *= 0.7;
            if (v > 1.0 && v < 1.1) col = th.stripe;
            if (!end && v > 1.55 && v < 1.75) { const q = (u % 3 + 3) % 3; if (q > 1.3 && q < 1.5) col = (((u / 3) | 0) + ((c.t / 400) | 0)) % 2 ? [61, 220, 151] : [40, 70, 60]; } } } // blinking lights
        px[i] = col[0] * m; px[i + 1] = col[1] * m; px[i + 2] = col[2] * m; } }
    g.putImageData(img, 0, 0);
  }
  function corridorCam(t, still) { const w = seg(t, 0, 4800), s = ease(w) * (LEND - 1.6), walking = w > 0 && w < 1 && !still;
    return { x: 0.12 * Math.sin(t / 900), y: s, hy: 50 + (walking ? Math.sin(t / 190) * 1.3 : 0), walking, t }; }

  // ---------- your hand ----------
  function arm(g, gx, gy, holding, tool) { // your glove at (gx, gy); a short forearm comes in from the bottom right
    const ex = gx + 22, ey = gy + 48; g.lineCap = 'round';
    g.strokeStyle = '#b9bfcc'; g.lineWidth = 16; g.beginPath(); g.moveTo(ex, ey); g.lineTo(gx + 2, gy + 6); g.stroke();
    g.strokeStyle = '#e8ebf2'; g.lineWidth = 13; g.stroke();
    g.lineCap = 'butt'; g.strokeStyle = '#d55e00'; g.lineWidth = 13; g.beginPath(); g.moveTo(gx + 6, gy + 16); g.lineTo(gx + 8, gy + 21); g.stroke(); // suit stripe at the cuff
    if (holding) holding(gx, gy + 9);
    g.fillStyle = '#f0f2f7'; g.fillRect(gx - 8, gy - 4, 16, 10); g.fillStyle = '#c9ced9'; g.fillRect(gx - 8, gy + 4, 16, 2);
    for (let f = 0; f < 3; f++) { g.fillStyle = '#f0f2f7'; g.fillRect(gx - 7 + f * 5, gy + 6, 4, holding ? 6 : 4); }
    if (tool) tool(gx, gy);
  }
  const sparkle = (g, x, y, t, s) => { const k = 0.5 + 0.5 * Math.sin(t / 90); g.fillStyle = `rgba(255,250,200,${0.4 + 0.6 * k})`; g.fillRect(x - s * k, y, s * 2 * k + 1, 1); g.fillRect(x, y - s * k, 1, s * 2 * k + 1); };

  // ---------- the six scenes ----------
  // outside scenes: draw(g, img, t, X) draws everything and returns the camera while walking (null in a close-up).
  // inside scenes: the corridor is shared; close(g, t, X) draws the close-up after the door. banner + at = the text at the end.
  const SCENES = {
    trip: { outside: true, banner: 'SAMPLE! +1 ★', at: 8500,
      init: (moon, opt) => { const path = s => 1.3 * Math.sin(s * 0.33); return { path, E: outsideWorld(moon, path), END: 10.5, TARGET: 12.5, opt }; },
      draw(g, img, t, X) { const st = X.st, c = walkCam(t, 1600, 7200, st.END, st.path, X.moon, X.still); c.hy -= ease(seg(t, 7200, 8000)) * 50; // look down at the sample
        const extra = [{ x: st.path(st.TARGET), y: st.TARGET, r: 0.36, k: 'sample', hide: t > 8500 }];
        if (st.opt.partner) { const ps = Math.min(c.s + 4.2, st.TARGET - 0.5); extra.push({ x: st.path(ps) - 1.5, y: ps, k: 'buddy', img: st.opt.partner }); }
        const sp = drawOutside(g, img, st.E, c, extra, t).sample;
        if (sp && t > 7600) { const k = ease(seg(t, 7600, 8500)), lift = ease(seg(t, 8500, 9100)) * 24, w = 0.36 * sp.u * 2, h = 0.36 * sp.u * 1.2;
          const tx = sp.sx, ty = sp.gy - h * 0.8 - lift, gx = W / 2 + 40 + (tx - W / 2 - 40) * k, gy = H + 20 + (ty - H - 20) * k;
          arm(g, gx, gy, t > 8500 ? (x, y) => { g.fillStyle = '#5a4480'; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, 6.283); g.fill(); g.fillStyle = '#8c6cc0'; g.beginPath(); g.ellipse(x - w * 0.12, y - 2, w * 0.3, h * 0.3, 0, 0, 6.283); g.fill(); } : null);
          if (t > 8500) sparkle(g, gx - 10, gy - 4, t, 4); }
        airlockDoor(g, t, X.sound); return c; } },

    clean: { outside: true, banner: 'CLEAN PANELS! +1 ★', at: 9000,
      init: moon => { const path = s => 0.6 * Math.sin(s * 0.25); return { path, E: outsideWorld(moon, path, 2.8), END: 8.5 }; },
      draw(g, img, t, X) { const st = X.st;
        if (t < 6700) { const c = walkCam(t, 1600, 6600, st.END, st.path, X.moon, X.still); drawOutside(g, img, st.E, c, [-2.4, 0, 2.4].map(dx => ({ x: st.path(11) + dx, y: 11, k: 'panel' })), t); airlockDoor(g, t, X.sound); return c; }
        // close-up: a dusty panel; your glove with a cloth wipes it row by row, then it shines
        g.fillStyle = '#1b2d6b'; g.fillRect(0, 0, W, H); for (let r = 0; r < 4; r++) for (let q = 0; q < 8; q++) { g.fillStyle = (r + q) % 2 ? '#2a46a8' : '#2f4fb8'; g.fillRect(4 + q * 23, 6 + r * 27, 21, 25); g.fillStyle = '#6f8ee8'; g.fillRect(6 + q * 23, 8 + r * 27, 6, 1); }
        const rows = [22, 60, 98], wipe = seg(t, 7000, 9000) * 3, row = Math.floor(wipe), fr = wipe - row, cx = row % 2 ? W - 12 - fr * (W - 24) : 12 + fr * (W - 24);
        const rnd = mkRnd(5); for (let i = 0; i < 140; i++) { const x = rnd() * W, y = rnd() * H, r2 = Math.min(2, Math.floor(y / 40)), passed = row > 2 || r2 < row || (r2 === row && (row % 2 ? x > cx : x < cx));
          if (!passed) { g.fillStyle = X.moon ? 'rgba(160,160,165,.85)' : 'rgba(190,110,60,.85)'; g.fillRect(x | 0, y | 0, 3 + (i % 3), 2 + (i % 2)); } }
        if (t > 9000) { const k = seg(t, 9000, 9600) * (W + 60) - 30; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 18, 0); g.lineTo(k - 22, H); g.lineTo(k - 40, H); g.fill(); }
        if (t < 9100) { const gy = rows[Math.min(2, row)] - 6 + Math.sin(t / 60) * 2; arm(g, cx, gy, (x, y) => { g.fillStyle = '#F0E442'; g.fillRect(x - 11, y - 3, 22, 8); g.fillStyle = '#c9b52f'; g.fillRect(x - 11, y + 3, 22, 2); }); }
        flash(g, t, 6700); helmetOverlay(g, t, X); return null; } },

    regolith: { outside: true, banner: 'WALL +1 cm!', at: 8800,
      init: moon => { const path = s => -0.8 * Math.sin(s * 0.3); return { path, E: outsideWorld(moon, path, 3.2), END: 8 }; },
      draw(g, img, t, X) { const st = X.st;
        if (t < 6500) { const c = walkCam(t, 1600, 6400, st.END, st.path, X.moon, X.still); drawOutside(g, img, st.E, c, [{ x: st.path(12.5) + 0.6, y: 12.5, k: 'mound' }], t); airlockDoor(g, t, X.sound); return c; }
        // close-up: dig soil from the pile with a shovel and drop it on the wall; a new bag pops in and the ruler goes up 1 cm
        const soil = X.moon ? [150, 150, 156] : [178, 98, 58]; g.fillStyle = X.moon ? '#05060c' : '#c98a60'; g.fillRect(0, 0, W, 50);
        g.fillStyle = rgb(soil, 0.9, 0, soil); g.fillRect(0, 50, W, H - 50); g.fillStyle = rgb(soil, 1.15, 0, soil); g.beginPath(); g.ellipse(46, 100, 42, 22, 0, 3.1416, 6.283); g.fill(); // the pile
        const bags = t > 8600 ? 10 : 9; for (let b = 0; b < bags; b++) { const r = b < 4 ? 0 : b < 7 ? 1 : b < 9 ? 2 : 3, q = b < 4 ? b : b < 7 ? b - 4 : b < 9 ? b - 7 : 0, pop = b === 9 ? 1 + 0.3 * (1 - seg(t, 8600, 8800)) : 1;
          const bx = 118 + q * 17 + r * 8, by = 104 - r * 14; g.fillStyle = '#c8aa78'; g.fillRect(bx - 8 * pop, by - 6 * pop, 16 * pop, 12 * pop); g.fillStyle = '#a88a58'; g.fillRect(bx - 8 * pop, by + 3 * pop, 16 * pop, 3 * pop); }
        g.fillStyle = '#000'; g.fillRect(182, 40, 6, 72); g.fillStyle = '#F0E442'; g.fillRect(180, 110 - seg(t, 8600, 9000) * 8, 10, 2); // the ruler
        const k1 = ease(seg(t, 6800, 7600)), k2 = ease(seg(t, 7600, 8500)), sx = 60 + k2 * 90, sy = 70 + k1 * 22 - k2 * 50 - Math.sin(k2 * 3.14) * 20, full = t > 7500 && t < 8550;
        arm(g, sx + 6, sy - 26, null, (gx, gy) => { g.strokeStyle = '#7a5a3a'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(gx, gy); g.lineTo(sx - 12, sy + 8); g.stroke(); // the shovel
          g.fillStyle = '#9aa3b5'; g.beginPath(); g.moveTo(sx - 22, sy + 4); g.lineTo(sx - 4, sy + 6); g.lineTo(sx - 8, sy + 18); g.lineTo(sx - 24, sy + 14); g.fill();
          if (full) { g.fillStyle = rgb(soil, 1.2, 0, soil); g.beginPath(); g.ellipse(sx - 14, sy + 6, 9, 5, 0, 3.1416, 6.283); g.fill(); } });
        if (t > 8400 && t < 9200) for (let i = 0; i < 14; i++) { const p = seg(t, 8400 + i * 20, 9000); if (p > 0 && p < 1) { g.fillStyle = rgb(soil, 1.1, 0, soil); g.fillRect(134 + (i % 5) * 4, 40 + p * 40 + (i % 3) * 3, 2, 2); } }
        flash(g, t, 6500); helmetOverlay(g, t, X); return null; } },

    lab: { outside: false, banner: 'DISCOVERY! +1 ★', at: 8200, theme: { wall: [150, 160, 185], ceil: [70, 78, 98], floor: [92, 100, 120], stripe: [86, 180, 233], glow: [120, 220, 255] },
      close(g, t) { // a microscope: blurry, then sharp; one crystal lights up
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.save(); g.beginPath(); g.arc(W / 2, H / 2, 54, 0, 6.283); g.clip(); g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, W, H);
        const blur = 1 - ease(seg(t, 5400, 7000)), rnd = mkRnd(17), rot = t / 6000, cols = ['#8e5bd6', '#3ab7a0', '#e88a3a', '#e8d24a', '#5aa0e8', '#d65b8e'];
        for (let i = 0; i < 16; i++) { const a0 = rnd() * 6.283, r0 = rnd() * 48, jx = (rnd() - 0.5) * blur * 8, jy = (rnd() - 0.5) * blur * 8, n = 5 + ((rnd() * 3) | 0), s = 8 + rnd() * 10;
          const cx = W / 2 + Math.cos(a0 + rot) * r0 + jx, cy = H / 2 + Math.sin(a0 + rot) * r0 + jy;
          g.fillStyle = cols[i % cols.length]; g.globalAlpha = 1 - blur * 0.6; g.beginPath(); for (let k = 0; k < n; k++) { const a = rot * 2 + k / n * 6.283 + rnd() * 0.5; g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s * 0.8); } g.fill();
          if (i === 4 && t > 7400) { g.globalAlpha = 1; g.strokeStyle = Math.floor(t / 200) % 2 ? '#F0E442' : '#fff'; g.lineWidth = 2; g.stroke(); sparkle(g, cx, cy - s, t, 5); } }
        g.globalAlpha = 1; g.restore(); g.strokeStyle = '#222'; g.lineWidth = 6; g.beginPath(); g.arc(W / 2, H / 2, 56, 0, 6.283); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2 - 50, H / 2); g.lineTo(W / 2 + 50, H / 2); g.moveTo(W / 2, H / 2 - 50); g.lineTo(W / 2, H / 2 + 50); g.stroke();
        g.fillStyle = '#7fffd4'; g.font = '7px ui-monospace, Consolas, monospace'; g.textAlign = 'left'; g.fillText('x400', 6, H - 6); } },

    fix: { outside: false, banner: 'FIXED! WATER SAVED', at: 8100, theme: { wall: [175, 180, 190], ceil: [80, 86, 96], floor: [100, 106, 116], stripe: [0, 158, 115], glow: [200, 240, 255] },
      close(g, t, X) { // a leaking pipe; the wrench turns the nut, the leak stops, water flows and the gauge goes green
        g.fillStyle = '#4b5263'; g.fillRect(0, 0, W, H); g.fillStyle = '#596173'; for (let i = 0; i < 6; i++) g.fillRect(i * 34, 0, 2, H);
        g.fillStyle = '#9aa3b5'; g.fillRect(0, 50, W, 22); g.fillStyle = '#c9d0de'; g.fillRect(0, 53, W, 4); g.fillStyle = '#6d7587'; g.fillRect(0, 68, W, 4); // the pipe
        g.fillStyle = '#0b2a40'; g.fillRect(20, 57, 50, 10); g.fillRect(122, 57, 50, 10); // windows to see the water
        if (t > 7900) { g.fillStyle = '#56B4E9'; for (let i = 0; i < 12; i++) { const x = ((t / 12 + i * 18) % 100); g.fillRect(x < 50 ? 20 + x : 122 + x - 50, 59 + (i % 2) * 4, 6, 2); } }
        const leak = t < 7800, cx = W / 2, cy = 61;
        if (leak) for (let i = 0; i < 18; i++) { const p = ((t / 500) + i / 18) % 1, a = -1.2 + (i % 5) * 0.25; g.fillStyle = `rgba(86,180,233,${1 - p})`; g.fillRect(cx + Math.cos(a) * p * 50, cy - 12 + Math.sin(a) * p * 30 + p * p * 60, 2, 3); }
        const turning = t > 5900 && t < 7800, ang = turning ? Math.sin((t - 5900) / 320) * 0.7 : 0, sw = Math.floor((t - 5900) / 1005);
        if (turning && sw !== X.clink) { X.clink = sw; X.sound('clink'); }
        g.save(); g.translate(cx, cy); g.rotate(ang); g.fillStyle = '#d2d6de'; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(Math.cos(k * 1.047) * 13, Math.sin(k * 1.047) * 13); g.fill(); g.fillStyle = '#9aa3b5'; g.beginPath(); g.arc(0, 0, 5, 0, 6.283); g.fill(); g.restore(); // the nut
        const wa = ang + 0.9, hx = cx + Math.cos(wa) * 60, hy = cy + Math.sin(wa) * 60; // the wrench, held by your glove
        g.strokeStyle = '#8c95a8'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + Math.cos(wa) * 16, cy + Math.sin(wa) * 16); g.lineTo(hx, hy); g.stroke(); g.fillStyle = '#8c95a8'; g.beginPath(); g.arc(cx + Math.cos(wa) * 15, cy + Math.sin(wa) * 15, 9, 0, 6.283); g.fill();
        if (t > 5600) arm(g, hx, hy - 4, null);
        const ok = seg(t, 7900, 8600); g.fillStyle = '#111'; g.beginPath(); g.arc(166, 22, 15, 0, 6.283); g.fill(); g.fillStyle = '#d55e00'; g.beginPath(); g.moveTo(166, 22); g.arc(166, 22, 13, 3.14, 4.4); g.fill(); g.fillStyle = '#009E73'; g.beginPath(); g.moveTo(166, 22); g.arc(166, 22, 13, 5.0, 6.28); g.fill();
        const na = 3.4 + ok * 2.6 + (leak ? Math.sin(t / 80) * 0.1 : 0); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(166, 22); g.lineTo(166 + Math.cos(na) * 12, 22 + Math.sin(na) * 12); g.stroke(); } },

    tend: { outside: false, banner: 'HAPPY PLANTS! +2 days', at: 8300, theme: { wall: [170, 150, 190], ceil: [70, 60, 90], floor: [96, 90, 110], stripe: [204, 121, 167], glow: [230, 150, 255] },
      close(g, t) { // grow lights, a tray of lettuce; your glove picks the big ripe one and puts it in the basket
        g.fillStyle = '#2a1f3a'; g.fillRect(0, 0, W, H); const pulse = 0.5 + 0.5 * Math.sin(t / 500);
        g.fillStyle = `rgba(214,120,255,${0.25 + 0.1 * pulse})`; g.fillRect(0, 0, W, H); g.fillStyle = '#f0c8ff'; g.fillRect(10, 4, W - 20, 5); g.fillStyle = '#ff7ad9'; for (let i = 0; i < 10; i++) g.fillRect(16 + i * 17, 9, 8, 2);
        for (let i = 0; i < 9; i++) { const p = ((t / 900) + i / 9) % 1; g.fillStyle = `rgba(150,210,255,${1 - p})`; g.fillRect(20 + i * 19, 14 + p * 60, 1, 3); } // mist
        g.fillStyle = '#5b4632'; g.fillRect(8, 92, W - 16, 22); g.fillStyle = '#3e3022'; g.fillRect(8, 92, W - 16, 4); // the tray
        const k1 = ease(seg(t, 5800, 6800)), k2 = ease(seg(t, 6900, 7900)), picked = t > 6800;
        const lettuce = (x, y, s, sway) => { for (let j = 0; j < 7; j++) { const a = j / 7 * 6.283 + sway; g.fillStyle = j % 2 ? '#4fbf5a' : '#2f9a46'; g.beginPath(); g.ellipse(x + Math.cos(a) * s * 0.5, y - s * 0.4 + Math.sin(a) * s * 0.25, s * 0.45, s * 0.3, a, 0, 6.283); g.fill(); }
          g.fillStyle = '#9be07a'; g.beginPath(); g.ellipse(x, y - s * 0.5, s * 0.3, s * 0.22, 0, 0, 6.283); g.fill(); };
        [30, 62, 130, 162].forEach((x, i) => lettuce(x, 94, 13 + (i % 2) * 3, Math.sin(t / 700 + i) * 0.1));
        g.fillStyle = '#8a6a3a'; g.fillRect(4, 64, 34, 24); g.fillStyle = '#6a4e28'; for (let i = 0; i < 4; i++) g.fillRect(4, 68 + i * 5, 34, 1); // the basket
        if (!picked) { lettuce(96, 94, 22, Math.sin(t / 600) * 0.08); sparkle(g, 108, 62, t, 5); }
        if (t > 7900) lettuce(22, 70, 16, 0);
        const gx = picked ? 96 + (22 - 96) * k2 : W / 2 + 50 + (96 - W / 2 - 50) * k1, gy = picked ? 74 - Math.sin(k2 * 3.14) * 34 - k2 * 6 : H + 20 + (74 - H - 20) * k1;
        if (t > 5700) arm(g, gx, gy, picked && t <= 7900 ? (x, y) => lettuce(x, y + 14, 20, 0) : null); } },
  };

  // ---------- shared overlays ----------
  function flash(g, t, at) { const k = 1 - Math.abs(t - at) / 260; if (k > 0) { g.fillStyle = `rgba(255,255,255,${k})`; g.fillRect(0, 0, W, H); } }
  function helmetOverlay(g, t, X) { // dark corners (inside the helmet when outside) and the suit readout
    const vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, X.outside ? 'rgba(0,0,0,.85)' : 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (X.outside && t > 1600) { g.font = '7px ui-monospace, Consolas, monospace'; g.textAlign = 'left'; g.fillStyle = '#7fffd4'; g.fillText(`SUIT O2 ${Math.round(100 - (t - 1600) / 900)}%`, 8, H - 8);
      g.textAlign = 'right'; g.fillText(X.moon ? 'MOON · EVA' : 'MARS · EVA', W - 8, H - 8); }
  }
  function banner(g, t, S) { if (t < S.at) return; const k = seg(t, S.at, S.at + 400); g.globalAlpha = k; let size = 13; g.font = `bold ${size}px ui-monospace, Consolas, monospace`;
    const w = g.measureText(S.banner).width; if (w > W - 16) { size = Math.floor(size * (W - 16) / w); g.font = `bold ${size}px ui-monospace, Consolas, monospace`; }
    g.textAlign = 'center'; const y = 24 - k * 4; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, y - size, W, size + 7); g.fillStyle = '#000'; g.fillText(S.banner, W / 2 + 1, y + 1); g.fillStyle = '#F0E442'; g.fillText(S.banner, W / 2, y); g.globalAlpha = 1; }

  function play(host, opt, done) {
    const S = SCENES[opt.job] || SCENES.trip, moon = opt.world !== 'mars', still = !!opt.still, fixed = opt.at != null, sound = opt.sound || (() => {});
    host.innerHTML = `<div class="eva"><canvas width="${W}" height="${H}" aria-label="A short animation of the job you just finished"></canvas><button class="evaskip" type="button">Skip ⏭</button></div>`;
    const cv = host.querySelector('canvas'), g = cv.getContext('2d'), img = g.createImageData(W, H);
    const X = { moon, outside: S.outside, still, sound: k => { if (!fixed && !still) sound(k); }, st: S.init ? S.init(moon, opt) : null };
    let finished = false, raf = 0, lastStep = -1; const t0 = performance.now();
    const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); done(); };
    host.querySelector('.evaskip').onclick = finish; cv.onclick = finish;
    function frame(now) {
      if (finished) return; if (!cv.isConnected) { finished = true; return; }
      const t = fixed ? opt.at : still ? S.at + 600 : now - t0; if (t >= DUR && !fixed) { finish(); return; }
      let c = null;
      if (S.outside) { c = S.draw(g, img, t, X); if (c) helmetOverlay(g, t, X); }
      else if (t < 5300) { c = corridorCam(t, still); drawCorridor(g, img, S.theme, c, ease(seg(t, 3600, 4700))); if (t > 3600 && t < 3650) X.sound('door'); helmetOverlay(g, t, X); flash(g, t, 5300); }
      else { S.close(g, t, X); flash(g, t, 5300); helmetOverlay(g, t, X); }
      banner(g, t, S);
      if (c && c.walking) { const step = Math.floor(t / (S.outside && moon ? 840 : 380)); if (step !== lastStep) { lastStep = step; X.sound('step'); } }
      if (t > DUR - 500) { g.fillStyle = `rgba(0,0,0,${(t - DUR + 500) / 500})`; g.fillRect(0, 0, W, H); }
      if (still || fixed) return;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return finish;
  }

  root.JAMT_EVA = { play, has: job => !!SCENES[job], seconds: DUR / 1000 };
})(window);
