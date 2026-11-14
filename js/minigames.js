// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Room minigames for kids 7–12. Optional, and only a bonus. Big targets, no fine aiming; the time limit can be switched off (timers setting).
// Each game draws into an element and calls o.win(), o.lose(message) or o.say(message). o.rng is a seeded random function.
// The words and facts are in data/text.js → minigames; the bonus and time limit for each one are in data/model.js → rules.minigame.
//   lab       memory pairs              trip   route through every square, numbers in order (path puzzle)
//   regolith  split the wall into boxes (area puzzle)   fix  turn pipes   tend  pick lettuces before they wilt   clean  wipe dust while wind blows
(function (root) {
  const shuffle = (R, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mistakes = (o, n, msg) => { o.miss = (o.miss || 0) + 1; if (o.miss >= n) o.lose(msg); else o.say(`${msg} (${n - o.miss} more mistake${n - o.miss > 1 ? 's' : ''} allowed)`); };
  const cellAt = (e, sel) => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && t.closest(sel); };

  // 🔬 Lab: memory. Flip two cards; matching pairs stay open.
  function lab(el, o) {
    const PAIRS = [['🌙', 'Moon'], ['🔴', 'Mars'], ['☀️', 'Sun'], ['🛰️', 'Satellite'], ['🚀', 'Rocket'], ['🪨', 'Rock sample']];
    const cards = shuffle(o.rng, PAIRS.flatMap((p, i) => [i, i])); let open = [], found = 0, moves = 0, busy = false, mm = 0;
    el.innerHTML = `<p class="mgq">Moves: <b id="mgmoves">0</b> · Pairs: <b id="mgpairs">0</b>/${PAIRS.length}</p><div class="memo">${cards.map((p, i) =>
      `<button class="mcard" data-i="${i}" aria-label="Card ${i + 1}, face down"><span class="back">?</span><span class="front">${PAIRS[p][0]}<small>${PAIRS[p][1]}</small></span></button>`).join('')}</div>`;
    const btns = [...el.querySelectorAll('.mcard')];
    btns.forEach((b, i) => b.onclick = () => {
      if (busy || b.classList.contains('up') || b.classList.contains('done')) return;
      b.classList.add('up'); b.setAttribute('aria-label', PAIRS[cards[i]][1]); o.tap(); open.push(i);
      if (open.length < 2) return;
      moves += 1; el.querySelector('#mgmoves').textContent = moves; const [a, c] = open; open = [];
      if (cards[a] === cards[c]) { [a, c].forEach(k => btns[k].classList.add('done')); found += 1; el.querySelector('#mgpairs').textContent = found; if (found === PAIRS.length) setTimeout(o.win, 450); }
      // the first few misses are part of the game; more of them lower the star score
      else { if (++mm > 5) o.miss = (o.miss || 0) + 1; busy = true; setTimeout(() => { [a, c].forEach(k => { btns[k].classList.remove('up'); btns[k].setAttribute('aria-label', `Card ${k + 1}, face down`); }); busy = false; }, 850); }
    });
  }

  // 🚀 Science trip: draw one route from 1 to the last number, in order, through every square. Built from a real route, so it can always be solved.
  function trip(el, o) {
    const R = o.rng, N = 5, ALL = N * N, id = (y, x) => y * N + x, yx = c => [Math.floor(c / N), c % N];
    const near = (a, b) => { const [ay, ax] = yx(a), [by, bx] = yx(b); return Math.abs(ay - by) + Math.abs(ax - bx) === 1; };
    let sol = null;
    for (let t = 0; t < 300 && !sol; t++) { // a random route through every square (Warnsdorff's rule with random ties)
      const seen = new Set(), p = []; let cur = Math.floor(R() * ALL);
      const free = c => { const [y, x] = yx(c); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [y + a, x + b]).filter(([ny, nx]) => ny >= 0 && nx >= 0 && ny < N && nx < N && !seen.has(id(ny, nx))).map(([ny, nx]) => id(ny, nx)); };
      while (cur !== undefined) { seen.add(cur); p.push(cur); const opts = free(cur); if (!opts.length) break; const m = Math.min(...opts.map(c => free(c).length)), best = opts.filter(c => free(c).length === m); cur = best[Math.floor(R() * best.length)]; }
      if (p.length === ALL) sol = p; }
    if (!sol) sol = Array.from({ length: ALL }, (_, k) => { const y = Math.floor(k / N), x = k % N; return id(y, y % 2 ? N - 1 - x : x); }); // a zig-zag, just in case
    const marks = [0, 6, 12, 18, ALL - 1], num = {}; marks.forEach((k, i) => { num[sol[k]] = i + 1; }); const LAST = marks.length;
    let route = [sol[0]];
    el.innerHTML = `<p class="mgq" id="mgnext"></p><div class="zip" style="--n:${N}"><svg class="zipline" viewBox="0 0 ${N * 10} ${N * 10}" aria-hidden="true"><polyline points=""/></svg>${Array.from({ length: ALL }, (_, c) =>
      `<button class="zc" data-c="${c}" aria-label="Square ${c + 1}${num[c] ? ', sample ' + num[c] : ''}">${num[c] ? `<b>${num[c]}</b>` : ''}</button>`).join('')}</div>
      <div class="mgrow"><button class="mgsmall" id="mgundo">↩ Undo</button><button class="mgsmall" id="mgclear">⟲ Start over</button></div>`;
    const cells = [...el.querySelectorAll('.zc')], line = el.querySelector('polyline');
    const nextNum = () => route.filter(c => num[c]).length + 1;
    const draw = () => { const on = new Set(route); cells.forEach((b, c) => { b.classList.toggle('on', on.has(c)); b.classList.toggle('head', c === route[route.length - 1]); });
      line.setAttribute('points', route.map(c => { const [y, x] = yx(c); return `${x * 10 + 5},${y * 10 + 5}`; }).join(' '));
      el.querySelector('#mgnext').innerHTML = route.length === ALL ? 'Every square visited!' : `Squares: <b>${route.length}</b>/${ALL} · next sample: <b>${Math.min(nextNum(), LAST)}</b>`; };
    const go = c => {
      const last = route[route.length - 1];
      if (c === last) return;
      const at = route.indexOf(c); if (at >= 0) { route = route.slice(0, at + 1); draw(); return; } // go back to an earlier square
      if (!near(c, last)) return;
      if (num[c] && num[c] !== nextNum()) { o.miss = (o.miss || 0) + 1; o.say(`Sample ${nextNum()} comes first!`); return; }
      if (num[c] === LAST && route.length !== ALL - 1) { o.say('Visit every other square before the last sample.'); return; }
      route.push(c); o.tap(); draw(); if (route.length === ALL) setTimeout(o.win, 400); };
    let drag = false; const grid = el.querySelector('.zip');
    grid.addEventListener('pointerdown', e => { const b = cellAt(e, '.zc'); if (!b) return; drag = true; try { grid.setPointerCapture(e.pointerId); } catch (x) {} go(+b.dataset.c); });
    grid.addEventListener('pointermove', e => { if (!drag) return; const b = cellAt(e, '.zc'); if (b) go(+b.dataset.c); });
    ['pointerup', 'pointercancel'].forEach(k => grid.addEventListener(k, () => { drag = false; }));
    cells.forEach(b => b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(+b.dataset.c); } });
    el.querySelector('#mgundo').onclick = () => { if (route.length > 1) { route.pop(); draw(); } };
    el.querySelector('#mgclear').onclick = () => { route = [sol[0]]; draw(); };
    draw();
  }

  // 🛡️ Shelter: split the wall into boxes; each box holds one number equal to its size. Built from a real split, so it can always be solved.
  function regolith(el, o) {
    const R = o.rng, W = 5, H = 5, MAX = 6, area = r => r.w * r.h;
    let parts = [{ x: 0, y: 0, w: W, h: H }];
    for (let g = 0; g < 400; g++) {
      const big = parts.filter(r => area(r) > MAX || (area(r) >= 4 && R() < 0.2)); if (!big.length) break;
      const r = big[Math.floor(R() * big.length)], vert = r.w > 1 && (r.h === 1 || R() < r.w / (r.w + r.h));
      const cut = 1 + Math.floor(R() * ((vert ? r.w : r.h) - 1));
      const a = vert ? { x: r.x, y: r.y, w: cut, h: r.h } : { x: r.x, y: r.y, w: r.w, h: cut };
      const b = vert ? { x: r.x + cut, y: r.y, w: r.w - cut, h: r.h } : { x: r.x, y: r.y + cut, w: r.w, h: r.h - cut };
      if (area(a) < 2 || area(b) < 2) continue; parts = parts.filter(q => q !== r).concat([a, b]); }
    const clue = {}; parts.forEach(r => { clue[(r.y + Math.floor(R() * r.h)) * W + r.x + Math.floor(R() * r.w)] = area(r); });
    let boxes = [], anchor = null, pending = null;
    const COLORS = ['#8c8174', '#a38b6d', '#7d8a72', '#8a7d95', '#9b7f6a', '#6f8796', '#a0906a', '#88807a', '#7e9480', '#957a7a'];
    el.innerHTML = `<p class="mgq" id="mgleft"></p><div class="patch" style="--w:${W};--h:${H}">${Array.from({ length: W * H }, (_, c) =>
      `<button class="pc" data-c="${c}" aria-label="Square ${c + 1}${clue[c] ? ', number ' + clue[c] : ''}">${clue[c] ? `<b>${clue[c]}</b>` : ''}</button>`).join('')}<div class="boxes"></div></div>
      <div class="mgrow"><button class="mgsmall" id="mgclear">⟲ Start over</button></div>`;
    const grid = el.querySelector('.patch'), layer = el.querySelector('.boxes'), cells = [...el.querySelectorAll('.pc')];
    const pos = c => ({ x: c % W, y: Math.floor(c / W) }), bbox = (a, b) => { const p = pos(a), q = pos(b); return { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y), w: Math.abs(p.x - q.x) + 1, h: Math.abs(p.y - q.y) + 1 }; };
    const inside = (r, c) => { const p = pos(c); return p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h; };
    const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const ok = r => { const k = Object.keys(clue).map(Number).filter(c => inside(r, c)); return k.length === 1 && clue[k[0]] === area(r); };
    const draw = (preview) => {
      layer.innerHTML = boxes.map((r, i) => `<i class="${ok(r) ? 'good' : 'bad'}" style="left:${r.x * 20}%;top:${r.y * 20}%;width:${r.w * 20}%;height:${r.h * 20}%;background:${COLORS[i % COLORS.length]}"></i>`).join('') +
        (preview ? `<i class="prev" style="left:${preview.x * 20}%;top:${preview.y * 20}%;width:${preview.w * 20}%;height:${preview.h * 20}%"></i>` : '');
      cells.forEach((b, c) => b.classList.toggle('pend', c === pending));
      const covered = boxes.reduce((s, r) => s + area(r), 0); el.querySelector('#mgleft').innerHTML = `Wall covered: <b>${covered}</b>/${W * H} squares`;
      if (covered === W * H && boxes.every(ok)) setTimeout(o.win, 450); };
    const place = r => { boxes = boxes.filter(q => !overlap(q, r)).concat([r]); o.tap(); if (!ok(r)) { o.miss = (o.miss || 0) + 1; o.say('Each box needs exactly ONE number, as big as the box.'); } draw(); };
    grid.addEventListener('pointerdown', e => { const b = cellAt(e, '.pc'); if (!b) return; anchor = +b.dataset.c; try { grid.setPointerCapture(e.pointerId); } catch (x) {} draw(bbox(anchor, anchor)); });
    grid.addEventListener('pointermove', e => { if (anchor === null) return; const b = cellAt(e, '.pc'); if (b) draw(bbox(anchor, +b.dataset.c)); });
    grid.addEventListener('pointerup', e => { if (anchor === null) return; const b = cellAt(e, '.pc'), end = b ? +b.dataset.c : anchor, a = anchor; anchor = null;
      if (end !== a) { pending = null; place(bbox(a, end)); return; }
      const hit = boxes.find(r => inside(r, end));                  // tapping a box removes it
      if (pending === null && hit) { boxes = boxes.filter(r => r !== hit); draw(); return; }
      if (pending === null) { pending = end; draw(); return; }      // first corner…
      const p = pending; pending = null; place(bbox(p, end)); });   // …second corner
    el.querySelector('#mgclear').onclick = () => { boxes = []; pending = null; draw(); };
    draw();
  }

  // 🔧 Repair: turn pipe pieces so water flows from the left (💧) to the right (🚰). Directions: N=1 E=2 S=4 W=8.
  function fix(el, o) {
    const R = o.rng, ROWS = 3, COLS = 4, D = { 1: [-1, 0], 2: [0, 1], 4: [1, 0], 8: [0, -1] }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
    const GLYPH = { 10: '═', 5: '║', 6: '╔', 12: '╗', 9: '╝', 3: '╚' }, rot = m => ((m << 1) | (m >> 3)) & 15;
    const ARM = { 1: '19,0,18,28', 2: '28,19,28,18', 4: '19,28,18,28', 8: '0,19,28,18' }; // x,y,w,h of each pipe arm in a 56 × 56 tile
    const svg = m => `<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">${[1, 2, 4, 8].filter(d => m & d).map(d => { const [x, y, w, h] = ARM[d].split(',');
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`; }).join('')}<rect x="19" y="19" width="18" height="18"/></svg>`;
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)), inRow = Math.floor(R() * ROWS);
    let r = inRow, c = 0, from = 8; const path = [];
    while (true) { const seen = path.map(p => p.join()); let to;
      if (c === COLS - 1 && R() < 0.6) to = 2; else { const opts = [2]; if (r > 0 && !seen.includes([r - 1, c].join()) && from !== 1) opts.push(1); if (r < ROWS - 1 && !seen.includes([r + 1, c].join()) && from !== 4) opts.push(4); to = opts[Math.floor(R() * opts.length)]; }
      grid[r][c] = from | to; path.push([r, c]); if (to === 2 && c === COLS - 1) break;
      const [dr, dc] = D[to]; r += dr; c += dc; from = OPP[to]; }
    const outRow = r, shapes = [10, 6, 12, 9, 3, 5];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!grid[y][x]) grid[y][x] = shapes[Math.floor(R() * shapes.length)];
    const flows = () => { let y = inRow, x = 0, enter = 8; const lit = new Set();
      for (let k = 0; k < ROWS * COLS + 1; k++) { const m = grid[y][x]; if (!(m & enter)) return { ok: false, lit }; lit.add(y + ',' + x); const out = m & ~enter;
        const [dy, dx] = D[out]; if (out === 2 && x === COLS - 1) return { ok: y === outRow, lit }; y += dy; x += dx; if (y < 0 || x < 0 || y >= ROWS || x >= COLS) return { ok: false, lit }; enter = OPP[out]; }
      return { ok: false, lit }; };
    path.forEach(([y, x]) => { const n = 1 + Math.floor(R() * 3); for (let i = 0; i < n; i++) grid[y][x] = rot(grid[y][x]); });
    if (flows().ok) { const [y, x] = path[0]; grid[y][x] = rot(grid[y][x]); }
    const draw = () => { const f = flows();
      el.innerHTML = `<div class="pipes" style="--cols:${COLS}">${grid.map((row, y) => `<span class="pend">${y === inRow ? '💧' : ''}</span>` + row.map((m, x) =>
        `<button class="pipe ${f.lit.has(y + ',' + x) ? 'wet' : ''}" data-y="${y}" data-x="${x}" data-m="${GLYPH[m]}" aria-label="Pipe piece, row ${y + 1}, column ${x + 1}: tap to turn">${svg(m)}</button>`).join('') + `<span class="pend">${y === outRow ? '🚰' : ''}</span>`).join('')}</div>`;
      el.querySelectorAll('.pipe').forEach(b => b.onclick = () => { grid[+b.dataset.y][+b.dataset.x] = rot(grid[+b.dataset.y][+b.dataset.x]); o.tap(); draw(); });
      el.dataset.solved = f.ok ? '1' : ''; if (f.ok) setTimeout(o.win, 350); };
    draw();
  }

  // 🌱 Greenhouse: lettuces ripen one at a time; pick 5 before they wilt. Tapping a sprout or letting one wilt is a mistake (3 allowed).
  function tend(el, o) {
    const R = o.rng, N = 9, GOAL = 5, RIPEN = 1300, WILT = 5500, state = Array(N).fill('sprout'), since = Array(N).fill(0); let picked = 0, over = false; tend.last = 0;
    el.innerHTML = `<p class="mgq">Picked: <b id="mgpick">0</b>/${GOAL}</p><div class="tiles" style="--cols:3">${Array.from({ length: N }, (_, i) => `<button class="tile soil" data-i="${i}"></button>`).join('')}</div>`;
    const btns = [...el.querySelectorAll('.tile')];
    const show = () => btns.forEach((b, i) => { b.textContent = { sprout: '🌱', ripe: '🥬', wilt: '🥀', picked: '🧺' }[state[i]]; b.classList.toggle('ripe', state[i] === 'ripe');
      b.setAttribute('aria-label', { sprout: 'small sprout', ripe: 'ripe lettuce: pick it!', wilt: 'wilted', picked: 'picked' }[state[i]]); });
    const stop = () => { over = true; clearInterval(timer); };
    const timer = setInterval(() => { if (over || !el.isConnected) return stop(); const now = performance.now();
      state.forEach((s, i) => { if (s === 'ripe' && now - since[i] > WILT) { state[i] = 'wilt'; since[i] = now; mistakes(o, 3, 'A lettuce wilted!'); } else if (s === 'wilt' && now - since[i] > 1200) state[i] = 'sprout'; });
      if (now - (tend.last || 0) > RIPEN) { const sp = state.map((s, i) => s === 'sprout' ? i : -1).filter(i => i >= 0); if (sp.length && state.filter(s => s === 'ripe').length < 3) { const i = sp[Math.floor(R() * sp.length)]; state[i] = 'ripe'; since[i] = now; } tend.last = now; }
      show(); }, 200);
    btns.forEach((b, i) => b.onclick = () => { if (over) return;
      if (state[i] === 'ripe') { state[i] = 'picked'; picked += 1; o.tap(); el.querySelector('#mgpick').textContent = picked; show(); setTimeout(() => { if (state[i] === 'picked') state[i] = 'sprout'; }, 900); if (picked >= GOAL) { stop(); setTimeout(o.win, 300); } }
      else if (state[i] === 'sprout') mistakes(o, 3, 'That sprout is not ready yet!'); });
    const lose = o.lose; o.lose = m => { stop(); lose(m); }; show();
  }

  // 🧽 Mars panels: wipe the dust while the wind keeps blowing some back for a few seconds.
  function clean(el, o) {
    const R = o.rng, N = 18, WIND = 9000, dust = new Set(shuffle(R, Array.from({ length: N }, (_, i) => i)).slice(0, 7)); let over = false; const t0 = performance.now();
    el.innerHTML = `<p class="mgq" id="mgpow"></p><div class="tiles panel" style="--cols:6">${Array.from({ length: N }, (_, i) => `<button class="tile cell" data-i="${i}"></button>`).join('')}</div>`;
    const btns = [...el.querySelectorAll('.tile')];
    const show = () => { const windy = performance.now() - t0 < WIND;
      btns.forEach((b, i) => { b.textContent = dust.has(i) ? '🟫' : ''; b.setAttribute('aria-label', dust.has(i) ? 'dusty spot: wipe it' : 'clean spot'); });
      el.querySelector('#mgpow').innerHTML = `⚡ Panel power: <b>${Math.round(100 * (1 - dust.size / N))} %</b>${windy ? ' · 💨 the wind is blowing!' : ' · the wind stopped'}`;
      if (!windy && !dust.size && !over) { over = true; clearInterval(timer); setTimeout(o.win, 300); } };
    const timer = setInterval(() => { if (!el.isConnected) { clearInterval(timer); return; }
      if (performance.now() - t0 < WIND && R() < 0.5) { const clean = btns.map((_, i) => i).filter(i => !dust.has(i)); if (clean.length) dust.add(clean[Math.floor(R() * clean.length)]); }
      show(); }, 700);
    btns.forEach((b, i) => b.onclick = () => { if (!dust.has(i) || over) return; dust.delete(i); o.tap(); show(); });
    const lose = o.lose; o.lose = m => { over = true; clearInterval(timer); lose(m); }; show();
  }

  root.JAMT_MINI = { games: { lab, fix, trip, tend, regolith, clean } };
})(window);
