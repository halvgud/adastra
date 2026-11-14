// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// A 10-second first-person cutscene after winning the 🚀 Science trip puzzle: the airlock opens, you walk out on the
// Moon or Mars next to your partner, and pick up a glowing rock sample. Old-school "fake 3D": the ground is drawn row
// by row in perspective, and rocks and the partner are flat pictures that grow as you get closer. Everything here is
// drawn by code (no extra images). Called from js/game.js → playMini; skipped when the player prefers less motion.
(function (root) {
  'use strict';
  const W = 192, H = 120, F = 120, CAM = 1.6; // tiny screen (scaled up, pixelated), focal length, eye height
  const DUR = 10000, OPEN = 1600, WALK = 7200, REACH = 7700, PICK = 8500; // timeline in ms: door, walk, reach down, grab

  // ---- ground texture, made once per world: soft noise, craters with a bright rim, pebbles ----
  function makeTex(seed) {
    const N = 128, t = new Float32Array(N * N); let s = seed >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const g = []; for (let i = 0; i < 16 * 16; i++) g.push(rnd());
    const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, at = (a, b) => g[((b & 15) * 16) + (a & 15)];
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) t[y * N + x] = 0.55 + 0.25 * vn(x / 16, y / 16) + 0.12 * vn(x / 5, y / 5) + 0.08 * (rnd() - 0.5);
    for (let c = 0; c < 14; c++) { const cx = rnd() * N, cy = rnd() * N, r = 3 + rnd() * 9;
      for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) { const d = Math.hypot(x, y) / r, i = (((cy + y) | 0) & (N - 1)) * N + (((cx + x) | 0) & (N - 1));
        if (d < 0.85) t[i] -= 0.22 * (1 - d / 0.85) + 0.06; else if (d < 1.15) t[i] += 0.18 * (1 - Math.abs(d - 1) / 0.15); } }
    for (let p = 0; p < 260; p++) { const i = ((rnd() * N) | 0) * N + ((rnd() * N) | 0); t[i] += rnd() < 0.5 ? 0.3 : -0.25; }
    return { N, t };
  }

  function play(host, opt, done) {
    const moon = opt.world !== 'mars', tex = makeTex(moon ? 7 : 11), still = !!opt.still;
    host.innerHTML = `<div class="eva"><canvas width="${W}" height="${H}" aria-label="Your astronaut walks outside and collects a rock sample"></canvas>
      <button class="evaskip" type="button">Skip ⏭</button></div>`;
    const cv = host.querySelector('canvas'), ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), px = img.data;
    let finished = false, raf = 0, lastStep = 0, t0 = performance.now(), sound = opt.sound || (() => {});
    const finish = () => { if (finished) return; finished = true; cancelAnimationFrame(raf); done(); };
    host.querySelector('.evaskip').onclick = finish; cv.onclick = finish;

    // colours per world
    const ground = moon ? [150, 150, 156] : [178, 98, 58], fogC = moon ? [8, 8, 14] : [214, 160, 118];
    const skyTop = moon ? [2, 2, 8] : [196, 128, 92], skyLow = moon ? [10, 10, 22] : [232, 186, 140];

    // the walk: a gentle S-curve; s = meters walked
    const curveX = s => 1.3 * Math.sin(s * 0.33), END = 10.5, TARGET = END + 3;
    let rs = 99; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
    const rocks = []; for (let i = 0; i < 60; i++) { const y = -2 + rnd() * 34, x = (rnd() - 0.5) * 18; if (Math.abs(x - curveX(y)) < 1.1) continue; rocks.push({ x, y, r: 0.15 + rnd() * 0.45, sh: rnd() }); }
    const stars = Array.from({ length: 70 }, () => ({ a: rnd() * 6.283, y: rnd() * 44, b: rnd() }));
    const ridge = a => 4 + 3 * Math.sin(a * 3.1) + 2 * Math.sin(a * 7.3 + 1) + 1.2 * Math.sin(a * 17.9); // far hills, by angle

    function cam(t) { // camera position, heading and horizon for this moment
      const w = Math.min(1, Math.max(0, (t - OPEN) / (WALK - OPEN))), e = w < 1 ? w * w * (3 - 2 * w) * 0.15 + w * 0.85 : 1, s = e * END;
      const x = curveX(s), dx = 1.3 * 0.33 * Math.cos(s * 0.33), a = Math.atan2(dx, 1) * 0.8;
      const walking = t > OPEN && t < WALK, bob = walking && !still ? (moon ? Math.abs(Math.sin(t / 420)) * -4 : Math.sin(t / 190) * 1.2) : 0;
      const look = t < WALK ? 0 : Math.min(1, (t - WALK) / 900); // tilt the head down to the sample
      return { x, y: s, a, hy: Math.round(46 + bob - look * 30), s, look, walking };
    }

    function frame(now) {
      if (finished) return; if (!cv.isConnected) { finished = true; return; }
      const fixed = opt.at != null, t = fixed ? opt.at : still ? PICK + 800 : now - t0; if (t >= DUR && !fixed) { finish(); return; } // opt.at: draw one moment (for checking)
      const c = cam(t), ca = Math.cos(c.a), sa = Math.sin(c.a); // forward = (sa, ca), right = (ca, -sa)
      // sky and far hills
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4;
        if (y <= c.hy) { const k = Math.max(0, Math.min(1, (y - (c.hy - 50)) / 50)); px[i] = skyTop[0] + (skyLow[0] - skyTop[0]) * k; px[i + 1] = skyTop[1] + (skyLow[1] - skyTop[1]) * k; px[i + 2] = skyTop[2] + (skyLow[2] - skyTop[2]) * k; px[i + 3] = 255; continue; }
        // ground: distance of this row, then the point on the ground under this pixel
        const d = CAM * F / (y - c.hy), lat = (x - W / 2) / F * d, wx = c.x + sa * d + ca * lat, wy = c.y + ca * d - sa * lat;
        let v = tex.t[((((wy * 9) | 0) & (tex.N - 1)) * tex.N) + (((wx * 9) | 0) & (tex.N - 1))];
        const fog = Math.min(1, d / (moon ? 40 : 22));
        px[i] = ground[0] * v * (1 - fog) + fogC[0] * fog; px[i + 1] = ground[1] * v * (1 - fog) + fogC[1] * fog; px[i + 2] = ground[2] * v * (1 - fog) + fogC[2] * fog; px[i + 3] = 255; }
      ctx.putImageData(img, 0, 0);
      const angX = a => W / 2 + Math.tan(a) * F; // screen x of a direction (for things far away)
      if (moon) { stars.forEach(s => { let da = ((s.a - c.a + 9.42) % 6.283) - 3.14; if (Math.abs(da) > 0.9) return; const y = c.hy - 6 - s.y; if (y < 0) return;
          ctx.fillStyle = s.b > 0.8 ? '#fff' : '#9aa3c0'; ctx.fillRect(angX(da) | 0, y | 0, 1, 1); });
        const ex = angX(0.35 - c.a), ey = c.hy - 30; ctx.fillStyle = '#2b5fd9'; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, 6.283); ctx.fill(); // Earth
        ctx.fillStyle = '#3aa35a'; ctx.fillRect(ex - 3, ey - 2, 3, 3); ctx.fillRect(ex + 1, ey + 1, 3, 2); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(ex - 5, ey - 4, 4, 1); ctx.fillRect(ex, ey + 4, 4, 1);
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.arc(ex + 3, ey, 7, -1.57, 1.57); ctx.fill(); }
      else { const sx = angX(-0.4 - c.a), sy = c.hy - 34; ctx.fillStyle = 'rgba(255,240,220,.35)'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff4e6'; ctx.beginPath(); ctx.arc(sx, sy, 3, 0, 6.283); ctx.fill(); }
      for (let x = 0; x < W; x++) { const a = c.a + Math.atan((x - W / 2) / F), h = ridge(a); ctx.fillStyle = moon ? '#3a3a44' : '#a8603e'; ctx.fillRect(x, c.hy - h, 1, h + 1); }

      // things standing on the ground, far ones first
      const items = rocks.map(r => ({ ...r, k: 'rock' }));
      items.push({ x: curveX(TARGET), y: TARGET, r: 0.36, k: 'sample' });
      const ps = Math.min(c.s + 4.2, TARGET - 0.8); if (opt.partner) items.push({ x: curveX(ps) - 1.5, y: ps, k: 'buddy' }); // your partner walks a few steps ahead, on the left
      items.forEach(o => { const rx = o.x - c.x, ry = o.y - c.y; o.d = rx * sa + ry * ca; o.l = rx * ca - ry * sa; });
      let SP = null; items.filter(o => o.d > 0.35).sort((p, q) => q.d - p.d).forEach(o => {
        const sx = W / 2 + o.l / o.d * F, gy = c.hy + CAM * F / o.d, u = F / o.d, fog = Math.min(1, o.d / (moon ? 40 : 22));
        if (sx < -40 || sx > W + 40) return;
        if (o.k === 'sample') SP = { sx, top: gy - o.r * u * 1.2, w: o.r * u * 2, h: o.r * u * 1.2 };
        if (o.k === 'sample' && t > PICK) return; // it is in your hand now
        if (o.k === 'rock' || o.k === 'sample') { const w = o.r * u * 2, h = o.r * u * 1.2, base = o.k === 'sample' ? [120, 90, 160] : ground;
          const col = m => `rgb(${(base[0] * m * (1 - fog) + fogC[0] * fog) | 0},${(base[1] * m * (1 - fog) + fogC[1] * fog) | 0},${(base[2] * m * (1 - fog) + fogC[2] * fog) | 0})`;
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx - w / 2, gy - 1, w * 1.1, Math.max(1, h * 0.25)); // shadow
          ctx.fillStyle = col(0.7); ctx.beginPath(); ctx.ellipse(sx, gy - h / 2, w / 2, h / 2, 0, 0, 6.283); ctx.fill();
          ctx.fillStyle = col(1.05); ctx.beginPath(); ctx.ellipse(sx - w * 0.12, gy - h * 0.62, w * 0.3, h * 0.3, 0, 0, 6.283); ctx.fill();
          if (o.k === 'sample' && !still) { const tw = 0.5 + 0.5 * Math.sin(t / 120); ctx.fillStyle = `rgba(240,228,66,${0.5 + 0.5 * tw})`; // it sparkles
            const sz = Math.max(1, u * 0.08); ctx.fillRect(sx - sz / 2, gy - h - sz * 3, sz, sz * 2); ctx.fillRect(sx - sz * 1.5, gy - h - sz * 2.5, sz * 3, sz); } }
        if (o.k === 'buddy') { const hgt = 1.8 * u, sp = opt.partner, bob = c.walking && !still ? (moon ? Math.abs(Math.sin(t / 420 + 1)) * u * 0.25 : Math.abs(Math.sin(t / 190)) * u * 0.05) : 0, sw = hgt * 68 / 46;
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(sx - hgt * 0.2, gy - 1, hgt * 0.4, Math.max(1, hgt * 0.05));
          ctx.imageSmoothingEnabled = false; ctx.drawImage(sp, sx - sw / 2, gy - bob - sw * 56 / 68, sw, sw); } });

      // the pick-up: your arm reaches down to the sample, grabs it and lifts it up, then a "+1 ⭐"
      if (t > REACH && SP) { const e = x => x * x * (3 - 2 * x), k = e(Math.min(1, (t - REACH) / (PICK - REACH))), lift = t > PICK ? e(Math.min(1, (t - PICK) / 600)) * 22 : 0;
        const ax = W / 2 + 46, ay = H + 14, tx = SP.sx, ty = SP.top + SP.h * 0.2 - lift, gx = ax + (tx - ax) * k, gy = ay + (ty - ay) * k;
        ctx.lineCap = 'round'; ctx.strokeStyle = '#c9ced9'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(gx, gy + 6); ctx.stroke(); // sleeve
        ctx.strokeStyle = '#e8ebf2'; ctx.lineWidth = 12; ctx.stroke();
        const cx = gx + (ax - gx) * 0.18, cy = gy + 6 + (ay - gy - 6) * 0.18; ctx.lineCap = 'butt'; ctx.strokeStyle = '#d55e00'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + (ax - gx) * 0.05, cy + (ay - gy) * 0.05); ctx.stroke(); // suit stripe
        if (t > PICK) { ctx.fillStyle = '#5a4480'; ctx.beginPath(); ctx.ellipse(gx, gy + 9, SP.w / 2, SP.h / 2, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#8c6cc0'; ctx.beginPath(); ctx.ellipse(gx - SP.w * 0.12, gy + 7, SP.w * 0.3, SP.h * 0.3, 0, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = '#f0f2f7'; ctx.fillRect(gx - 8, gy - 4, 16, 10); ctx.fillStyle = '#c9ced9'; ctx.fillRect(gx - 8, gy + 4, 16, 2); // glove
        for (let f = 0; f < 3; f++) { ctx.fillStyle = '#f0f2f7'; ctx.fillRect(gx - 7 + f * 5, gy + 6, 4, t > PICK ? 6 : 4); } } // fingers, closed around the rock after the grab
      if (t > PICK) { const k = (t - PICK) / 700; ctx.globalAlpha = Math.min(1, k * 2); ctx.font = 'bold 13px ui-monospace, Consolas, monospace'; ctx.textAlign = 'center';
        const ty = 24 - Math.min(1, k) * 4; ctx.fillStyle = '#000'; ctx.fillText('SAMPLE! +1 ★', W / 2 + 1, ty + 1); ctx.fillStyle = '#F0E442'; ctx.fillText('SAMPLE! +1 ★', W / 2, ty); ctx.globalAlpha = 1; }

      // the airlock door opening at the start
      if (t < OPEN) { const k = Math.max(0, (t - 400) / (OPEN - 400)), off = (k * k) * (W / 2 + 4);
        [[-1, 0], [1, W / 2]].forEach(([dir, x0]) => { const x = x0 + dir * off; ctx.fillStyle = '#8a93a6'; ctx.fillRect(x, 0, W / 2, H); ctx.fillStyle = '#6f778a'; for (let i = 0; i < 5; i++) ctx.fillRect(x + 6, 12 + i * 22, W / 2 - 12, 3);
          for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#111' : '#F0E442'; ctx.fillRect(dir < 0 ? x + W / 2 - 6 : x, i * 10, 6, 10); } });
        ctx.fillStyle = t < 400 ? '#d55e00' : '#3ddc97'; ctx.fillRect(W / 2 - 4, 4, 8, 4); if (t > 380 && t < 420 && !still) sound('door'); }

      // inside the helmet: dark corners and a small suit readout
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.85)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      if (t > OPEN) { const o2 = Math.round(100 - (t - OPEN) / 900); ctx.font = '7px ui-monospace, Consolas, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#7fffd4'; ctx.fillText(`SUIT O2 ${o2}%`, 8, H - 8);
        ctx.textAlign = 'right'; ctx.fillText(moon ? 'MOON · EVA' : 'MARS · EVA', W - 8, H - 8); }
      if (t > DUR - 500) { ctx.fillStyle = `rgba(0,0,0,${(t - DUR + 500) / 500})`; ctx.fillRect(0, 0, W, H); } // fade out
      if (c.walking && !still) { const step = Math.floor(t / (moon ? 840 : 380)); if (step !== lastStep) { lastStep = step; sound('step'); } }
      if (still || fixed) return; // one picture only
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return finish;
  }

  root.JAMT_EVA = { play, seconds: DUR / 1000 };
})(window);
