// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Room minigames: short tap puzzles (about 15 seconds) for kids 7–12. Optional, and only a bonus.
// No fine aiming and no fast reflexes: big buttons, a few allowed mistakes, and the time limit can be switched off (timers setting).
// Each game draws into an element and calls o.win(), o.lose(message) or o.say(message). o.rng is a seeded random function.
// The words and facts are in data/text.js → minigames; the bonus each one gives is in data/model.js → rules.minigame.
(function (root) {
  const shuffle = (R, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mistakes = (o, n, msg) => { o.miss = (o.miss || 0) + 1; if (o.miss >= n) o.lose(msg); else o.say(`${msg} (${n - o.miss} more mistake${n - o.miss > 1 ? 's' : ''} allowed)`); };

  // 🔬 Lab: find the sample with the same color pattern (a "fingerprint", like the light a rock gives off).
  function lab(el, o) {
    const R = o.rng, COL = ['#D55E00', '#E69F00', '#F0E442', '#009E73', '#56B4E9', '#CC79A7'];
    const target = COL.map(() => 1 + Math.floor(R() * 5));
    const near = () => { const v = target.slice(); shuffle(R, [0, 1, 2, 3, 4, 5]).slice(0, 2).forEach(i => { v[i] = 1 + (v[i] + 1 + Math.floor(R() * 3)) % 5; }); return v; };
    let opts = [target]; while (opts.length < 3) { const v = near(); if (!opts.some(x => x.join() === v.join())) opts.push(v); }
    opts = shuffle(R, opts);
    const bars = v => `<span class="spec">${v.map((h, i) => `<i style="height:${h * 9}px;background:${COL[i]}"></i>`).join('')}</span>`;
    el.innerHTML = `<p class="mgq">The rock your crew found:</p>${bars(target)}<p class="mgq">Which sample has the same pattern?</p>
      <div class="mgrow">${opts.map((v, i) => `<button class="mgopt" data-i="${i}" aria-label="Sample ${'ABC'[i]}">${bars(v)}<b>${'ABC'[i]}</b></button>`).join('')}</div>`;
    el.querySelectorAll('.mgopt').forEach(b => b.onclick = () => { if (opts[+b.dataset.i] === target) o.win(); else { b.disabled = true; mistakes(o, 2, 'Not that one: compare each color bar.'); } });
  }

  // 🔧 Repair: turn pipe pieces so water flows from the left (💧) to the right (🚰). Directions: N=1 E=2 S=4 W=8.
  function fix(el, o) {
    const R = o.rng, ROWS = 3, COLS = 4, D = { 1: [-1, 0], 2: [0, 1], 4: [1, 0], 8: [0, -1] }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
    const GLYPH = { 10: '═', 5: '║', 6: '╔', 12: '╗', 9: '╝', 3: '╚' }, rot = m => ((m << 1) | (m >> 3)) & 15;
    const ARM = { 1: '19,0,18,28', 2: '28,19,28,18', 4: '19,28,18,28', 8: '0,19,28,18' }; // x,y,w,h of each pipe arm in a 56 × 56 tile
    const svg = m => `<svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">${[1, 2, 4, 8].filter(d => m & d).map(d => { const [x, y, w, h] = ARM[d].split(',');
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`; }).join('')}<rect x="19" y="19" width="18" height="18"/></svg>`;
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0)), inRow = Math.floor(R() * ROWS);
    // a random path from the left edge to the right edge, never going back left
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
    path.forEach(([y, x]) => { const n = 1 + Math.floor(R() * 3); for (let i = 0; i < n; i++) grid[y][x] = rot(grid[y][x]); }); // scramble
    if (flows().ok) { const [y, x] = path[0]; grid[y][x] = rot(grid[y][x]); }
    const draw = () => { const f = flows();
      el.innerHTML = `<div class="pipes" style="--cols:${COLS}">${grid.map((row, y) => `<span class="pend">${y === inRow ? '💧' : ''}</span>` + row.map((m, x) =>
        `<button class="pipe ${f.lit.has(y + ',' + x) ? 'wet' : ''}" data-y="${y}" data-x="${x}" data-m="${GLYPH[m]}" aria-label="Pipe piece, row ${y + 1}, column ${x + 1}: tap to turn">${svg(m)}</button>`).join('') + `<span class="pend">${y === outRow ? '🚰' : ''}</span>`).join('')}</div>`;
      el.querySelectorAll('.pipe').forEach(b => b.onclick = () => { grid[+b.dataset.y][+b.dataset.x] = rot(grid[+b.dataset.y][+b.dataset.x]); o.tap(); draw(); });
      el.dataset.solved = f.ok ? '1' : ''; if (f.ok) setTimeout(o.win, 350); };
    draw();
  }

  // 🚀 Science trip: tap all the shiny ✨ rocks (new samples); plain 🪨 rocks are not new.
  function trip(el, o) {
    const R = o.rng, N = 15, cells = shuffle(R, Array.from({ length: N }, (_, i) => i)), shiny = new Set(cells.slice(0, 4)), plain = new Set(cells.slice(4, 8));
    let left = shiny.size;
    el.innerHTML = `<p class="mgq">Samples left: <b id="mgleft">${left}</b></p><div class="tiles" style="--cols:5">${Array.from({ length: N }, (_, i) =>
      `<button class="tile ground" data-i="${i}" aria-label="${shiny.has(i) ? 'shiny rock' : plain.has(i) ? 'plain rock' : 'ground'}">${shiny.has(i) ? '✨' : plain.has(i) ? '🪨' : ''}</button>`).join('')}</div>`;
    el.querySelectorAll('.tile').forEach(b => b.onclick = () => { const i = +b.dataset.i; b.disabled = true;
      if (shiny.has(i)) { b.textContent = '🧪'; left -= 1; o.tap(); el.querySelector('#mgleft').textContent = left; if (!left) o.win(); }
      else if (plain.has(i)) mistakes(o, 3, 'We already have that kind of rock.'); });
  }

  // 🌱 Greenhouse: pick only the ripe lettuces.
  function tend(el, o) {
    const R = o.rng, N = 9, ripe = new Set(shuffle(R, Array.from({ length: N }, (_, i) => i)).slice(0, 4)); let left = ripe.size;
    el.innerHTML = `<div class="tiles" style="--cols:3">${Array.from({ length: N }, (_, i) => `<button class="tile soil" data-i="${i}" aria-label="${ripe.has(i) ? 'ripe lettuce' : 'small sprout'}">${ripe.has(i) ? '🥬' : '🌱'}</button>`).join('')}</div>`;
    el.querySelectorAll('.tile').forEach(b => b.onclick = () => { const i = +b.dataset.i; b.disabled = true;
      if (ripe.has(i)) { b.textContent = '🧺'; left -= 1; o.tap(); if (!left) o.win(); } else { b.disabled = false; mistakes(o, 2, 'That sprout is not ready yet!'); } });
  }

  // 🛡️ Shelter: add soil bags so every column reaches the safe line, without overfilling.
  function regolith(el, o) {
    const R = o.rng, LINE = 7, MAX = 9, cols = Array.from({ length: 5 }, () => 3 + Math.floor(R() * 4));
    const draw = () => {
      el.innerHTML = `<div class="wall">${cols.map((h, i) => `<button class="wcol" data-i="${i}" aria-label="Column ${i + 1}: ${h} of ${LINE} bags">${Array.from({ length: MAX }, (_, k) =>
        `<i class="${k < h ? (k >= LINE ? 'over' : 'bag') : ''} ${k === LINE - 1 ? 'line' : ''}"></i>`).reverse().join('')}</button>`).join('')}</div>`;
      el.querySelectorAll('.wcol').forEach(b => b.onclick = () => { const i = +b.dataset.i;
        if (cols[i] >= LINE) { mistakes(o, 3, 'That column is already high enough.'); return; }
        cols[i] += 1; o.tap(); draw(); if (cols.every(h => h >= LINE)) setTimeout(o.win, 300); }); };
    draw();
  }

  // 🧽 Mars panels: tap each speck of dust.
  function clean(el, o) {
    const R = o.rng, N = 18, dust = new Set(shuffle(R, Array.from({ length: N }, (_, i) => i)).slice(0, 9)); let left = dust.size; const total = left;
    const bar = () => `<p class="mgq">⚡ Panel power: <b>${Math.round(40 + 60 * (1 - left / total))} %</b></p>`;
    el.innerHTML = `<div id="mgpow">${bar()}</div><div class="tiles panel" style="--cols:6">${Array.from({ length: N }, (_, i) => `<button class="tile cell" data-i="${i}" aria-label="${dust.has(i) ? 'dusty spot' : 'clean spot'}">${dust.has(i) ? '🟫' : ''}</button>`).join('')}</div>`;
    el.querySelectorAll('.tile').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (!dust.has(i)) return; dust.delete(i); b.textContent = '✨'; b.disabled = true; left -= 1; o.tap();
      el.querySelector('#mgpow').innerHTML = bar(); if (!left) setTimeout(o.win, 250); });
  }

  root.JAMT_MINI = { games: { lab, fix, trip, tend, regolith, clean } };
})(window);
