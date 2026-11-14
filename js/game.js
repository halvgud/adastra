// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
(function () {
  const $ = id => document.getElementById(id), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SNAP = window.DATA_SNAPSHOT, DATA = window.JAMT_DATA, T = DATA.text, SIM = window.JAMT_SIM, FEEDS = window.JAMT_FEEDS;
  const r0 = Math.round, r1 = x => Math.round(x * 10) / 10;
  const ART = './assets/pixellab/'; let MCIMG = ART + 'ui/mission-control.png';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  $('coachimg').src = MCIMG;

  // ---------- Mission Control: the person on Earth who talks to the player (data/text.js → missionControl) ----------
  // Her name is hidden by default. It is stored encrypted (data/text.js → secretName) and shown only after ?mc=<passphrase>.
  const MC = T.missionControl || {}; let MCNAME = '';
  const mcLabel = () => MCNAME ? `${esc(MCNAME)} · Mission Control` : 'Mission Control';
  $('coachimg').alt = 'Mission Control';
  // Two private modes, both opened with the owner's passphrase (a wrong one changes nothing), remembered on that device:
  //   ?mc=<passphrase>     her name shows, and the "AI" marks are hidden
  //   ?clean=<passphrase>  no name, and the "AI" marks are hidden
  //   ?mc=off or ?clean=off  back to normal (anonymous, with the AI marks)
  // The public game always shows the AI marks (Space Apps rule): use these modes only for private viewing, never for the demo.
  let NOAI = false;
  async function unlockName() {
    const q = new URLSearchParams(location.search); let pass = q.get('mc'), mode = 'name';
    if (q.get('clean')) { pass = q.get('clean'); mode = 'clean'; }
    if (pass === 'off') { store.set('jamt-mc', ''); store.set('jamt-mcmode', ''); pass = null; }
    else if (pass) { store.set('jamt-mc', pass); store.set('jamt-mcmode', mode); }
    else { pass = store.get('jamt-mc'); mode = store.get('jamt-mcmode') || 'name'; }
    if (q.has('mc') || q.has('clean')) { q.delete('mc'); q.delete('clean'); const s = q.toString(); try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); } catch (e) {} } // keep the key out of the address bar
    const X = MC.secretName; if (!pass || !X || !(window.crypto && crypto.subtle)) return;
    try { const b = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
      const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(X.salt), iterations: X.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const name = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(X.iv) }, key, b(X.data))); // throws if the passphrase is wrong
      NOAI = true; document.documentElement.classList.add('noai');
      if (mode === 'name') { MCNAME = name; $('coachimg').alt = MCNAME + ', Mission Control'; }
    } catch (e) { MCNAME = ''; } } // a wrong key just leaves her anonymous, with the AI marks
  // Glasses on the 64 × 64 portrait: [left, top, width, height] of each lens, found by reading the portrait's pixels.
  const GLASSES_MC = [[18, 21, 8, 5], [30, 21, 8, 5]];
  function dressMissionControl() { if (!MC.glasses) return; const im = new Image();
    im.onload = () => { try { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
      GLASSES_MC.forEach(([x, y, w, h]) => { g.fillStyle = 'rgba(170,220,255,.28)'; g.fillRect(x, y, w, h); g.fillStyle = MC.glassesColor || '#1c1f2b';
        g.fillRect(x, y - 1, w, 1); g.fillRect(x, y + h, w, 1); g.fillRect(x - 1, y, 1, h); g.fillRect(x + w, y, 1, h); });
      const [a, b] = GLASSES_MC; g.fillRect(a[0] + a[2] + 1, a[1] + 1, b[0] - a[0] - a[2] - 2, 1); // the bridge
      MCIMG = c.toDataURL(); document.querySelectorAll('img[data-mc]').forEach(i => { i.src = MCIMG; }); $('coachimg').src = MCIMG; } catch (e) { /* from file:// the portrait stays as it is */ } };
    im.src = MCIMG; }
  dressMissionControl();

  // ---------- the player: a name (kept on this device only) and settings ----------
  const COMMANDER = T.commander || {}; // data/text.js: the default name and look of the player's astronaut
  const typedName = () => { const v = store.get('jamt-name') || ''; return v === 'Rookie' ? '' : v; }; // only a name the player typed counts ("Rookie" was the old stand-in for an empty box)
  let NAME = typedName() || COMMANDER.name || '', TIMERS = store.get('jamt-timers') !== 'off';
  const CMD = () => `Commander ${esc(NAME || 'Rookie')}`;

  // ---------- sound ----------
  let muted = store.get('jamt-mute') === '1', musicOn = store.get('jamt-music') !== 'off', AC = null;
  function audio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { AC = null; } return AC; }
  // Background music (js/music.js). Browsers only allow sound after the first tap or key, and it pauses while the tab is hidden.
  function music() { const M = window.JAMT_MUSIC, b = $('music'); if (b) { b.classList.toggle('off', !musicOn); b.setAttribute('aria-pressed', String(musicOn)); }
    if (!M) return; if (musicOn && !document.hidden && heard) M.start(audio()); else M.stop(); }
  let heard = false; const firstTouch = () => { heard = true; music(); };
  addEventListener('pointerdown', firstTouch, { once: true }); addEventListener('keydown', firstTouch, { once: true });
  document.addEventListener('visibilitychange', music);
  $('music').onclick = () => { musicOn = !musicOn; store.set('jamt-music', musicOn ? 'on' : 'off'); heard = true; music(); };
  music();
  function beep(notes, type = 'square', vol = 0.06) {
    if (muted || !audio()) return;
    let t = AC.currentTime; notes.forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d); t += d * 0.9; });
  }
  const SFX = { tap: () => beep([[660, .05]]), go: () => beep([[523, .07], [784, .09]]), off: () => beep([[392, .07], [262, .09]]), star: () => beep([[784, .07], [1047, .07], [1319, .12]]),
    zoom: () => beep([[330, .05], [494, .05], [659, .07]], 'triangle', .07), tick: () => beep([[1200, .03]], 'square', .03), alarm: () => beep([[880, .12], [660, .12], [880, .12], [660, .12]], 'sawtooth', .04),
    win: () => beep([[523, .1], [659, .1], [784, .1], [1047, .25]]), lose: () => beep([[392, .15], [330, .15], [262, .3]], 'triangle', .07) };

  // ---------- read aloud, for players who are still learning to read. Uses the browser's own voice: nothing is downloaded or sent ----------
  const canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; if (!canSpeak) document.body.classList.add('nospeak');
  let HOLD = false; // true while a message is being read: the decision clock waits
  // Mission Control is a woman: pick a woman's English voice by name (data/text.js → missionControl.voices). Voices load late in some browsers.
  let VOICE = null;
  function pickVoice() { if (!canSpeak) return; const want = (T.missionControl || {}).voices || [], all = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    VOICE = null; for (const w of want) { VOICE = all.find(v => v.name.includes(w) && /en-US/i.test(v.lang)) || all.find(v => v.name.includes(w)); if (VOICE) break; } }
  if (canSpeak) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) {} }
  function speak(text) { if (!canSpeak) return; try { speechSynthesis.cancel(); if (!VOICE) pickVoice();
    const u = new SpeechSynthesisUtterance(String(text).replace(/⭐/g, ' stars ').replace(/💡/g, ' light ').replace(/[\p{Extended_Pictographic}️‍]/gu, ' ').replace(/\s+/g, ' ').trim()); u.lang = 'en-US'; u.rate = 0.9;
    if (VOICE) { u.voice = VOICE; u.lang = VOICE.lang; } else u.pitch = (T.missionControl || {}).pitch || 1;
    u.onend = u.onerror = () => { HOLD = false; }; HOLD = true; speechSynthesis.speak(u); } catch (e) { HOLD = false; } }
  const hush = () => { HOLD = false; if (canSpeak) try { speechSynthesis.cancel(); } catch (e) {} };
  const words = el => el.innerText || el.textContent; // innerText keeps the pauses between paragraphs
  const bindRead = root => root.querySelectorAll('.read').forEach(b => b.onclick = () => speak(words(b.closest('.mc').querySelector('.bubble'))));
  $('coachread').onclick = () => speak(words($('coachtxt')));
  // While the Mission Control box is open, the page gets that much extra room at the bottom, so you can scroll past it.
  if (window.ResizeObserver) new ResizeObserver(() => { const h = $('coach').offsetHeight; document.documentElement.style.setProperty('--coachH', h ? (h + 12) + 'px' : '0px'); }).observe($('coach'));

  // ---------- words kids can tap ----------
  const WORDS = T.words; // data/text.js
  const w = (k, t) => `<button class="word" data-word="${k}">${t}</button>`;
  // fills {name} and [[word|shown text]] in the texts of data/*.js
  const fmt = (t, v = {}) => String(t).replace(/\[\[(\w+)\|([^\]]+)\]\]/g, (m, k, x) => w(k, x)).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
  function bindWords(root) { root.querySelectorAll('.word').forEach(b => b.onclick = () => { const t = root.querySelector('.tip'); if (t) { t.textContent = WORDS[b.dataset.word]; t.classList.add('show'); } }); }

  // ---------- content lives in data/*.js; the simulation lives in js/sim.js ----------
  const N = DATA.model, RU = N.rules, MISSIONS = DATA.missions, EVENTS = DATA.events, ROOMS = T.rooms, CREW = T.crew, JOB = T.jobs;
  const crewName = k => k === 0 ? esc(NAME || 'Rookie') : CREW[k].name;
  // Two women and two men: the commander's choice decides who else is on the crew (data/text.js → crewNames).
  let GENDER = store.get('jamt-gender') || '';
  function setCrew() { const W = (T.crewNames || {}).woman || ['Ana', 'Mia'], M = (T.crewNames || {}).man || ['Leo', 'Max'];
    const others = GENDER === 'man' ? [W[0], W[1], M[0]] : [W[1], M[0], M[1]]; // a woman commander: 1 more woman + 2 men; a man: 2 women + 1 more man
    others.forEach((n, i) => { if (CREW[i + 1]) CREW[i + 1].name = n; }); }
  setCrew();
  const roomFor = j => (JOB[j] || [])[2] || 'shelter';
  const { fresh, step, light, evToday } = SIM;
  let sunMult = RU.sun.QUIET.mult, sunWord = 'QUIET', sunInfo = null;
  const patchSrc = k => `${ART}patches/${MISSIONS[k].patch || k}.png`;
  const isStorm = e => !!EVENTS[e.kind].storm;
  const CARD_SOURCES = [...new Set(Object.values(DATA.sources).filter(x => x.short && x.inGame !== false).map(x => x.short))].join(' · ');

  // ---------- art ----------
  const IMG = {}; const load = (k, src) => new Promise(res => { const i = new Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => res(); i.src = src; });
  const SPR = { walk: [], idle: [], face: [], back: [], act: {} };
  // Action animations made with PixelLab (assets/pixellab/astronaut/Idle/animations/<name>/<direction>/frame_00N.png)
  const ACTS = { pick: 'east', dig: 'east', wipe: 'east', type: 'north', sleep: 'east', water: 'east', repair: 'east', cheer: 'east' }, ACT_FRAMES = 9;
  const JOBANIM = { rest: 'sleep', tend: 'water', fix: 'repair' }; // what an astronaut does in their room
  // Inside the base nobody wears a helmet: PixelLab sprites of a woman (in-w-*) and a man (in-m-*) in the same suit, made by
  // tools/build_atlas.py into assets/pixellab/astronaut/strips/. Helmets stay on outside and in the airlock.
  const INDOOR = ['idle', 'walk', 'water', 'repair', 'type', 'cheer', 'back'];
  const isMan = k => k === 0 ? GENDER === 'man' : GENDER === 'man' ? k === 3 : k >= 2; // the crew is always 2 women and 2 men (setCrew)
  SPR.in = {};
  function buildIndoor() { CREW.forEach((c, k) => { const g = isMan(k) ? 'm' : 'w';
    INDOOR.forEach(n => { (SPR.in[n] = SPR.in[n] || [])[k] = []; for (let i = 0; i < 12; i++) { const im = IMG[`in_${g}_${n}${i}`]; if (im) SPR.in[n][k].push(recolor(im, c.col)); } }); }); }
  // frames of animation `name` for astronaut k: the helmet-free set indoors (when it exists), else the space-suit set
  function spr(k, name, indoor) { const f = indoor && SPR.in[name] && SPR.in[name][k]; if (f && f.length) return f;
    return name === 'idle' ? SPR.idle[k] || [] : name === 'walk' ? SPR.walk[k] || [] : name === 'back' ? (SPR.back[k] ? [SPR.back[k]] : []) : ((SPR.act[name] || [])[k]) || []; }
  // The frame of an action animation for astronaut k, or null. sleep: lie down, then breathe (frames 6-8). cheer: plays once from CHEER[k].
  function actFrame(k, name, t, indoor) { const f = spr(k, name, indoor); if (!f.length) return null;
    if (name === 'sleep') return f[Math.min(f.length - 1, 6 + [0, 1, 2, 1][Math.floor(t / 600 + k) % 4])];
    if (name === 'cheer') { const e = t - (CHEER[k] || -1e9); return e >= 0 && e < f.length * 140 ? f[Math.floor(e / 140)] : null; }
    return f[Math.floor(t / 140 + k * 3) % f.length]; }
  function canvasOf(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c; }
  function keyOut(img) {
    const c = canvasOf(img), g = c.getContext('2d'); let d; try { d = g.getImageData(0, 0, c.width, c.height); } catch (e) { return c; }
    const W = c.width, H = c.height, p = d.data, ref = [p[0], p[1], p[2]], seen = new Uint8Array(W * H), q = [];
    const near = i => Math.abs(p[i] - ref[0]) + Math.abs(p[i + 1] - ref[1]) + Math.abs(p[i + 2] - ref[2]) < 40;
    for (let x = 0; x < W; x++) q.push([x, 0], [x, H - 1]); for (let y = 0; y < H; y++) q.push([0, y], [W - 1, y]);
    while (q.length) { const [x, y] = q.pop(); if (x < 0 || y < 0 || x >= W || y >= H || seen[y * W + x]) continue; seen[y * W + x] = 1; const i = (y * W + x) * 4; if (!near(i)) continue; p[i + 3] = 0; q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
    g.putImageData(d, 0, 0); return c;
  }
  function recolor(img, col) {
    const c = canvasOf(img); if (!col) return c; const g = c.getContext('2d'); let d; try { d = g.getImageData(0, 0, c.width, c.height); } catch (e) { return c; }
    const p = d.data; for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2]; if (p[i + 3] && r > 150 && gg > 60 && gg < 190 && b < 110 && r - b > 90) { const k = (r + gg + b) / 3 / 150; p[i] = Math.min(255, col[0] * k); p[i + 1] = Math.min(255, col[1] * k); p[i + 2] = Math.min(255, col[2] * k); } }
    g.putImageData(d, 0, 0); return c;
  }
  async function loadArt() {
    const jobs = [load('bg_moon', ART + 'bg/moon.png'), load('bg_mars', ART + 'bg/mars.png'), load('panels', ART + 'props/solar-panels.png'), load('reactor', ART + 'props/reactor.png'), load('rover', ART + 'props/rover.png'), ...['soil-moon', 'soil-mars', 'tunnel', 'shaft', 'hatch'].map(n => load('base_' + n, ART + 'base/' + n + '.png')), load('south', ART + 'astronaut/Idle/rotations/south.png'), load('north', ART + 'astronaut/Idle/rotations/north.png')];
    ROOMS.forEach(r => jobs.push(load('room_' + r.img, ART + 'rooms/' + r.img + '.png')));
    Object.keys(MISSIONS).forEach(k => jobs.push(load('patch_' + k, patchSrc(k))));
    // Each animation is one strip of frames side by side (assets/pixellab/astronaut/strips/, made by tools/build_atlas.py)
    ['walk', 'idle', ...Object.keys(ACTS), ...['w', 'm'].flatMap(g => INDOOR.map(n => `in-${g}-${n}`))].forEach(a => jobs.push(load('strip_' + a, `${ART}astronaut/strips/${a}.png`)));
    await Promise.all(jobs);
    const cut = (a, key) => { const st = IMG['strip_' + a]; if (!st) return; const h = st.height, n = Math.round(st.width / h);
      for (let i = 0; i < n; i++) { const c = document.createElement('canvas'); c.width = c.height = h; c.getContext('2d').drawImage(st, i * h, 0, h, h, 0, 0, h, h); IMG[key(i)] = c; } };
    cut('walk', i => 'walk' + i); cut('idle', i => 'idle' + i); Object.keys(ACTS).forEach(a => cut(a, i => `act_${a}${i}`));
    ['w', 'm'].forEach(g => INDOOR.forEach(n => cut(`in-${g}-${n}`, i => `in_${g}_${n}${i}`)));
    ROOMS.forEach(r => { if (IMG['room_' + r.img]) IMG['room_' + r.img] = keyOut(IMG['room_' + r.img]); });
    CREW.forEach((c, k) => { SPR.walk[k] = []; SPR.idle[k] = [];
      const look = (key, img) => { const cv = recolor(img, c.col); return k === 0 && COMMANDER.glasses ? addGlasses(cv, key) : cv; };
      for (let i = 0; i < 6; i++) if (IMG['walk' + i]) SPR.walk[k].push(look('walk' + i, IMG['walk' + i]));
      for (let i = 0; i < 4; i++) if (IMG['idle' + i]) SPR.idle[k].push(look('idle' + i, IMG['idle' + i]));
      if (IMG.south) SPR.face[k] = look('south', IMG.south);
      if (IMG.north) SPR.back[k] = recolor(IMG.north, c.col);
      Object.keys(ACTS).forEach(a => { (SPR.act[a] = SPR.act[a] || [])[k] = []; for (let i = 0; i < ACT_FRAMES; i++) if (IMG[`act_${a}${i}`]) SPR.act[a][k].push(recolor(IMG[`act_${a}${i}`], c.col)); }); }); // seen from behind (at the lab computer); no glasses needed
    buildIndoor();
  }
  // Glasses for the commander. Finds each eye on the sprite (a dark pupil with white on one side and skin on the other)
  // and draws a frame and a light lens around it. EYES is the fallback when the browser will not let us read the pixels (file://).
  const EYES = { south: [[31, -1, 18], [36, 1, 18]], idle0: [[40, -1, 18]], idle1: [[40, -1, 17]], idle2: [[39, -1, 16]], idle3: [[40, -1, 17]],
    walk0: [[39, -1, 17]], walk1: [[39, -1, 17]], walk2: [[39, -1, 17]], walk3: [[39, -1, 17]], walk4: [[39, -1, 17]], walk5: [[39, -1, 17]] }; // [pupil x, side of the white, top row]
  function findEyes(c) {
    const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data, eyes = [];
    const at = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return '.'; const i = (y * W + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2], lum = (r + gg + b) / 3;
      return d[i + 3] < 40 ? '.' : (r > 150 && gg > 90 && gg < 215 && b > 60 && b < 190 && r - b > 35 && r > gg) ? 's' : lum < 70 ? '#' : lum > 200 ? 'W' : '+'; };
    for (let x = 0; x < W; x++) for (let y = 0; y < H * 0.4; y++) { if (at(x, y) !== '#') continue; // the head is the top 40 % of the sprite
      const dir = at(x - 1, y) === 'W' && at(x + 1, y) === 's' ? -1 : at(x + 1, y) === 'W' && at(x - 1, y) === 's' ? 1 : 0; if (!dir) continue;
      const e = eyes.find(e => e[0] === x && e[1] === dir && e[3] === y - 1); if (e) e[3] = y; else eyes.push([x, dir, y, y]); }
    eyes.forEach(e => { if (at(e[0] + e[1], e[2] - 1) === 'W') e[2] -= 1; });
    return eyes;
  }
  function addGlasses(c, key) {
    let eyes = []; try { eyes = findEyes(c); } catch (e) { eyes = []; } if (!eyes.length) eyes = EYES[key] || [];
    const g = c.getContext('2d'), left = e => Math.min(e[0], e[0] + 2 * e[1]), color = COMMANDER.glassesColor || '#1c1f2b';
    eyes.forEach(e => { const x = left(e), y = e[2]; // each lens covers 3 × 2 pixels
      g.fillStyle = 'rgba(170,220,255,.35)'; g.fillRect(x, y, 3, 2);
      g.fillStyle = color; g.fillRect(x, y - 1, 3, 1); g.fillRect(x, y + 2, 3, 1); g.fillRect(x - 1, y, 1, 2); g.fillRect(x + 3, y, 1, 2); });
    if (eyes.length === 2) { const [a, b] = eyes.slice().sort((p, q) => p[0] - q[0]), xa = left(a) + 4, xb = left(b) - 1; if (xb > xa) { g.fillStyle = color; g.fillRect(xa, a[2], xb - xa, 1); } } // the bridge
    return c;
  }

  // ---------- scene ----------
  const cv = $('base'), ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const CW = 384, CH = 352, SKY = 192, RW = 128, RH = 80;
  const roomXY = i => [(i % 3) * RW, SKY + Math.floor(i / 3) * RH];
  const crewPos = CREW.map((c, k) => ({ x: 22 + k * 26, tx: 22 + k * 26, room: 3, facing: 1 }));
  let S = null, view = { mode: 'base', room: null, t0: 0 }, selected = null, FX = null, FLOAT = [], PREV = null, MOODS = {}, BANNER = null, SUMMARY = null, SUMMARY_NEXT = null;
  const SUNPOS = () => S && S.world === 'mars' ? [180, 54, 15] : [26, 96, 10];
  function crewHome() { const n = {}; CREW.forEach((c, k) => { const j = S.jobs[k], ri = ROOMS.findIndex(r => r.id === (j ? roomFor(j) : 'shelter')); n[ri] = (n[ri] || 0) + 1;
    const p = crewPos[k]; if (p.room !== ri) { p.room = ri; p.x = (ri % 3) * RW + 6; } p.tx = p.home = (ri % 3) * RW + 22 + (n[ri] - 1) * 26; p.next = 0; }); }
  // ---------- the crew and the world move on their own ----------
  const OUTSIDE = { trip: 'samples', clean: 'panels', regolith: 'soil' }; // jobs done out on the surface
  let PANELS_DARK = null; // the panel picture with a dark tint on its own pixels only (source-atop), redrawn each frame
  let PANELS_GLINT = null; // a slanted stripe of light, kept only where the panel picture has pixels
  function panelGlint(k) { const im = IMG.panels; if (!PANELS_GLINT) { PANELS_GLINT = document.createElement('canvas'); PANELS_GLINT.width = im.width; PANELS_GLINT.height = im.height; }
    const g = PANELS_GLINT.getContext('2d'), x = k * im.width; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, im.width, im.height); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 7, 0); g.lineTo(x - 9, im.height); g.lineTo(x - 16, im.height); g.fill();
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(0, 0, im.width, im.height); g.globalCompositeOperation = 'source-over'; return PANELS_GLINT; }
  function shadedPanels(a) { const im = IMG.panels; if (!PANELS_DARK) { PANELS_DARK = document.createElement('canvas'); PANELS_DARK.width = im.width; PANELS_DARK.height = im.height; }
    const g = PANELS_DARK.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, im.width, im.height); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, im.width, im.height); g.globalCompositeOperation = 'source-over'; return PANELS_DARK; }
  function drawOutside(t, k, p, job) {
    const zone = job === 'clean' ? [258, 370] : job === 'regolith' ? [20, 150] : [20, 236], foot = SKY - 5;
    if (p.ox === undefined || p.ojob !== job) { p.ox = zone[0] + 10 + k * 14; p.otx = p.ox; p.ojob = job; p.onext = 0; }
    if (Math.abs(p.otx - p.ox) < 1 && t > p.onext) { p.otx = zone[0] + Math.random() * (zone[1] - zone[0]); p.onext = t + 1600 + Math.random() * 2600; }
    const dx = p.otx - p.ox, moving = Math.abs(dx) > 1; if (moving) { p.ox += Math.sign(dx) * 0.55; p.ofacing = Math.sign(dx); }
    const act = ((SPR.act[{ trip: 'pick', clean: 'wipe', regolith: 'dig' }[job]] || [])[k]) || [], useAct = !moving && act.length; // picking up a sample, wiping, digging
    const fr = (moving ? SPR.walk[k] : useAct ? act : SPR.idle[k]) || []; if (!fr.length) return;
    const fi = Math.floor(t / (moving ? 120 : useAct ? 140 : 260) + k * 3) % fr.length, crouch = useAct ? 0 : !moving ? Math.max(0, Math.sin(t / 260 + k)) * 4 : 0;
    drawSprite(fr[fi], p.ox, foot + crouch, p.ofacing || 1, 0.7);
    if (k === 0) text('★', p.ox, foot - 44 + crouch, '#ff9a3c', 8);
    if (!moving && (useAct ? fi >= 3 && fi <= 6 : crouch > 3)) { const hx = p.ox + (p.ofacing || 1) * 10; // what their hands do
      if (job === 'trip') { ctx.fillStyle = '#F0E442'; ctx.fillRect(hx, foot - 4, 2, 2); ctx.fillRect(hx - 2, foot - 2, 1, 1); ctx.fillRect(hx + 3, foot - 3, 1, 1); }
      if (job === 'clean') { ctx.fillStyle = 'rgba(214,150,96,.8)'; for (let i = 0; i < 3; i++) ctx.fillRect(hx + i * 3, foot - 26 - (t / 40 + i * 5) % 10, 2, 2); }
      if (job === 'regolith') { ctx.fillStyle = S.world === 'moon' ? '#b9b2a6' : '#c27a4c'; for (let i = 0; i < 4; i++) ctx.fillRect(hx + i * 2, foot - 2 - ((t / 30 + i * 4) % 12), 2, 2); } }
  }
  function jobFx(t, k, job, x, y) { // a hint of what each astronaut is doing inside
    if (job === 'lab') { if (Math.floor(t / 300 + k) % 2) { ctx.fillStyle = '#56B4E9'; ctx.fillRect(x - 3, y, 6, 4); } }
    if (job === 'tend') for (let i = 0; i < 3; i++) { const ph = ((t / 700) + i / 3) % 1; ctx.fillStyle = `rgba(120,200,255,${1 - ph})`; ctx.fillRect(x + i * 2, y + 6 + ph * 18, 1, 3); }
    if (job === 'fix' && Math.sin(t / 90 + k) > 0.6) { ctx.fillStyle = '#ffe76a'; ctx.fillRect(x, y + 4, 2, 2); ctx.fillRect(x + 3, y + 1, 1, 1); ctx.fillRect(x - 2, y + 7, 1, 1); }
  }
  function drawRover(t, moon) { // a small rover (PixelLab picture, assets/pixellab/props/rover.png) crosses the plain now and then
    const ph = (t / 34000) % 1; if (ph > 0.55) return; const k = ph / 0.55, w = 32, h = 20, x = -40 + k * (CW + 80), y = SKY - 30 + Math.abs(Math.sin(k * 60)) * -0.8;
    if (!moon) for (let i = 0; i < 5; i++) { const a = (i + (t / 120) % 1) / 5; ctx.fillStyle = `rgba(214,150,96,${0.45 * (1 - a)})`; ctx.fillRect((x - 4 - a * 18) | 0, (y + h - 4 - a * 5) | 0, 3 + a * 4, 2); } // dust behind it on Mars
    if (IMG.rover) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(IMG.rover, x | 0, y | 0, w, h); ctx.imageSmoothingEnabled = sm; } }
  const isOn = r => r.sw ? (r.sw === 'lab' ? S.sw.lab && !S.sw.save : S.sw[r.sw]) : null;
  function disc(x, y, r, fill) { ctx.fillStyle = fill; for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r + r) ctx.fillRect(x + xx, y + yy, 1, 1); }
  // A plain sun in the sky (no face: it confused players). Tapping it still shows the real Sun from NASA DONKI,
  // which only sets the size of the solar storms in the two storm missions.
  function drawSun(x, y, r) {
    ctx.fillStyle = 'rgba(255,240,180,.18)'; ctx.beginPath(); ctx.arc(x, y, r + 6, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,180,.28)'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 6.283); ctx.fill();
    disc(x, y, r, '#fff1b8'); disc(x - r * 0.25, y - r * 0.25, r * 0.55, '#fffbe6');
  }
  // Frames are 68 px (idle, walk) or 76 px (the action animations: the same astronaut with room to move); feet sit 8 px
  // above the bottom of a 68 px frame, and the bigger canvas adds the same margin on every side.
  function drawSprite(fr, x, footY, facing, scale) { const s = scale || 1, w = fr.width || 68, pad = (w - 68) / 2; ctx.save(); ctx.translate(x, footY - (60 + pad) * s); if (facing < 0) ctx.scale(-1, 1); ctx.drawImage(fr, -(w / 2) * s, 0, w * s, w * s); ctx.restore(); }
  function text(t, x, y, color, size) { ctx.font = `bold ${size || 12}px ui-monospace, Consolas, monospace`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = color;
    if (window.JAMT_ICON && JAMT_ICON.hasIcon(t)) JAMT_ICON.draw(ctx, t, x, y, size || 12, (p, px) => { ctx.strokeText(p, px, y); ctx.fillText(p, px, y); }); // emoji become pixel icons (js/icons.js)
    else { ctx.strokeText(t, x, y); ctx.fillText(t, x, y); } ctx.textAlign = 'left'; }

  // Small background animations, so the base feels alive. All skipped when the player prefers reduced motion.
  const STARS = Array.from({ length: 16 }, (_, i) => [(i * 97 + 31) % CW, 6 + (i * 53) % 120, (i * 0.7) % 6.28]);
  function ambient(t, s, moon, L) {
    if (moon) STARS.forEach(([x, y, ph]) => { const a = 0.5 + 0.5 * Math.sin(t / 700 + ph); if (a > 0.6) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(x, y, 1, 1); if (a > 0.95) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } } });
    const orb = (t / 26000) % 1; if (orb < 0.6) { const k = orb / 0.6, x = -10 + k * (CW + 20), y = 22 + Math.sin(k * 3.14) * -10 + 10; ctx.fillStyle = '#dfe7ff'; ctx.fillRect(x | 0, y | 0, 2, 2); ctx.fillStyle = 'rgba(223,231,255,.35)'; ctx.fillRect((x - 4) | 0, y | 0, 3, 1); } // an orbiter passing over
    if (!moon) { const dd = (t / 18000) % 1; if (dd < 0.5) { const k = dd / 0.5, x = CW + 20 - k * (CW + 60); // a dust devil crossing the plain
        for (let i = 0; i < 9; i++) { const w = 2 + i * 1.2, sw = Math.sin(t / 120 + i) * w; ctx.fillStyle = `rgba(214,150,96,${0.5 - i * 0.04})`; ctx.fillRect((x + sw) | 0, SKY - 6 - i * 4, Math.max(2, w | 0), 3); } } }
    const [ox, oy] = roomXY(4); if (S.sw.maker) for (let i = 0; i < 6; i++) { const ph = ((t / 1400) + i / 6) % 1; ctx.fillStyle = `rgba(160,220,255,${0.8 - ph * 0.7})`; ctx.fillRect(ox + 52 + (i % 3) * 9 + Math.sin(t / 300 + i) * 2, oy + 66 - ph * 44, 2, 2); } // bubbles in the air maker
    const [gx, gy] = roomXY(2); if (S.sw.gh) { ctx.fillStyle = `rgba(214,120,255,${0.06 + 0.06 * Math.sin(t / 900)})`; ctx.fillRect(gx + 4, gy + 4, RW - 8, RH - 8); } // grow-lights glow
    const [lx, ly] = roomXY(1); if (S.sw.lab && !S.sw.save && S.jobs.includes('lab')) for (let i = 0; i < 4; i++) { const ph = ((t / 1800) + i / 4) % 1; ctx.fillStyle = `rgba(240,228,66,${1 - ph})`; ctx.fillRect(lx + 30 + i * 18, ly + 60 - ph * 40, 2, 2); } // science sparks
    if (PREV) { const [bx, by] = roomXY(5), k = Math.max(0, S.batt) / S.cap, h = 48 * k, ph = (t / 1100) % 1, up = PREV.net >= 0, yy = by + 19 + 48 - (up ? ph * h : (1 - ph) * h);
      if (h > 4) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(bx + 109, yy | 0, 10, 2); } } // charge moving in the battery
  }
  // Where resting astronauts sleep, in the shelter picture's own coordinates (384 x 240): the lower and upper bunk,
  // then sleeping bags on the floor. bag = true for the floor spots.
  const BEDS = [[195, 167, false], [195, 109, false], [78, 214, true], [318, 214, true]];
  function bedSpot(k) { const i = S.jobs.filter((j, kk) => j === 'rest' && kk < k).length; return BEDS[Math.min(i, BEDS.length - 1)]; }
  function drawSleeper(t, k, x, y, s, bag) { // lying on the back, head on the right, under a blanket; breathing and z's
    const fr = spr(k, 'idle', true)[0]; if (!fr) return; const br = still ? 0 : Math.sin(t / 700 + k) * 0.8 * s;
    if (bag) { ctx.fillStyle = '#2f5d8a'; ctx.fillRect(x - 32 * s, y - 9 * s, 56 * s, 18 * s); ctx.fillStyle = '#4a86c2'; ctx.fillRect(x - 32 * s, y - 9 * s, 56 * s, 4 * s); } // sleeping bag
    ctx.save(); ctx.translate(x, y - br); ctx.rotate(Math.PI / 2); ctx.drawImage(fr, -34 * s, -34 * s, 68 * s, 68 * s); ctx.restore();
    ctx.fillStyle = bag ? '#3b74b0' : '#7a5aa8'; ctx.fillRect(x - 30 * s, y - 8 * s - br, 36 * s, 16 * s);            // blanket up to the chest
    ctx.fillStyle = bag ? '#5c97d6' : '#9677c4'; ctx.fillRect(x - 30 * s, y - 8 * s - br, 36 * s, 3 * s); ctx.fillRect(x - 6 * s, y - 8 * s - br, 3 * s, 16 * s);
    if (!still) { const zph = (t / 1600 + k * 0.3) % 1; ctx.globalAlpha = 1 - zph; text('z', x + 20 * s + zph * 14 * s, y - 14 * s - zph * 30 * s, '#cfe3ff', Math.max(8, (9 + zph * 6) * s * 1.6)); ctx.globalAlpha = 1; } }
  // The rooms are one base dug into the ground, seen as a cut-away from the side: soil around them, pressurised tunnels
  // between neighbours, ladder shafts between the two floors, and a hatch on the surface above the airlock.
  // Drawn before the rooms, so each tunnel's ends disappear into the rooms. Pieces: assets/pixellab/base/ (PixelLab).
  function drawUnderground(moon) {
    const soil = IMG[moon ? 'base_soil-moon' : 'base_soil-mars'];
    if (soil) { ctx.save(); ctx.fillStyle = ctx.createPattern(soil, 'repeat'); ctx.translate(0, SKY); ctx.fillRect(0, 0, CW, CH - SKY); ctx.restore(); ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.fillRect(0, SKY, CW, CH - SKY); }
    else { ctx.fillStyle = moon ? '#3a3d45' : '#4a2414'; ctx.fillRect(0, SKY, CW, CH - SKY); }
    ctx.fillStyle = moon ? '#6c6f78' : '#8a3a22'; ctx.fillRect(0, SKY, CW, 2); // the surface edge
    const tun = IMG.base_tunnel, sh = IMG.base_shaft, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    for (let row = 0; row < 2; row++) for (let col = 1; col < 3; col++) { const x = col * RW, y = SKY + row * RH + RH - 30; // side tunnels
      if (tun) ctx.drawImage(tun, x - 26, y, 52, 26); else { ctx.fillStyle = '#9aa0ab'; ctx.fillRect(x - 24, y + 8, 48, 10); } }
    [[0, 96], [2, 34]].forEach(([col, dx]) => { const x = col * RW + dx, y = SKY + RH - 22; // ladder shafts between the floors
      if (sh) ctx.drawImage(sh, x - 9, y, 18, 44); else { ctx.fillStyle = '#9aa0ab'; ctx.fillRect(x - 6, y, 12, 44); } });
    const hx = 30; if (sh) ctx.drawImage(sh, hx - 7, SKY - 6, 14, 22); // from the surface hatch down to the airlock
    if (IMG.base_hatch) ctx.drawImage(IMG.base_hatch, hx - 18, SKY - 22, 36, 24);
    ctx.imageSmoothingEnabled = sm; }
  let SMALLTINT = null;
  function smallTint(im, x, y, color) { if (!im) return; if (!SMALLTINT) SMALLTINT = document.createElement('canvas');
    if (SMALLTINT.width !== im.width || SMALLTINT.height !== im.height) { SMALLTINT.width = im.width; SMALLTINT.height = im.height; }
    const g = SMALLTINT.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, im.width, im.height); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, im.width, im.height); g.globalCompositeOperation = 'source-over'; ctx.drawImage(SMALLTINT, x, y); }
  function drawBase(t) {
    const s = S, moon = s.world === 'moon', L = light(s);
    ctx.fillStyle = moon ? '#000' : '#5a2a17'; ctx.fillRect(0, 0, CW, CH);
    const bg = IMG[moon ? 'bg_moon' : 'bg_mars']; if (bg) ctx.drawImage(bg, 0, 0, 320, 160, 0, 0, CW, SKY);
    if (moon) { const ex = 186, ey = 59, R = 13; for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (xx * xx + yy * yy <= R * R + R) { ctx.fillStyle = xx < 2 ? ((xx * 7 + yy * 3) % 5 === 0 ? '#3fa66b' : '#2f7fd8') : '#0b2440'; ctx.fillRect(ex + xx, ey + yy, 1, 1); } }
    if (moon && L === 0) { ctx.fillStyle = 'rgba(0,0,12,.72)'; ctx.fillRect(0, 0, CW, SKY); }
    const dust = !moon && s.M.dust[s.day] !== undefined ? 1 - s.M.dust[s.day] : 0;
    if (dust > 0) { ctx.fillStyle = `rgba(190,110,50,${0.25 + dust * 0.6})`; ctx.fillRect(0, 0, CW, SKY);
      if (!still) for (let i = 0; i < 70; i++) { const x = ((i * 53 + t * 0.06 * (1 + i % 3)) % CW), y = (i * 37) % SKY; ctx.fillStyle = '#e8b27a'; ctx.fillRect(x | 0, y, 2, 1); } }
    if (!(moon && L === 0)) drawSun(...SUNPOS());
    if (IMG.panels) { ctx.save(); if (s.tilt && dust > 0) { ctx.translate(314, SKY - 32); ctx.transform(1, 0, -0.35, 1, 0, 0); ctx.translate(-314, -(SKY - 32)); }
      const dark = 1 - Math.min(1, L); ctx.drawImage(dark > 0.05 ? shadedPanels(dark * 0.65) : IMG.panels, 250, SKY - 64);
      if (!still && L > 0.5) { const gl = ((t / 2600) % 1.6) - 0.3; if (gl > 0 && gl < 1) ctx.drawImage(panelGlint(gl), 250, SKY - 64); } ctx.restore(); // sunlight glinting on the panels (only on the panels) // less sun: only the panels get darker, not a box around them
      if (!moon && s.clean < 0.9) { ctx.fillStyle = 'rgba(160,90,40,.55)'; ctx.fillRect(254, SKY - 58, 120, 30); } }
    if (!moon && IMG.reactor) ctx.drawImage(IMG.reactor, 182, SKY - 64);
    drawUnderground(moon);
    ROOMS.forEach((r, i) => { const [x, y] = roomXY(i), im = IMG['room_' + r.img]; if (im) ctx.drawImage(im, x, y);
      if (isOn(r) === false) smallTint(im, x, y, 'rgba(0,0,0,.6)'); // lights off: darken the room picture only
      if (r.id === 'battery') { const k = Math.max(0, s.batt) / s.cap; ctx.fillStyle = '#000'; ctx.fillRect(x + 108, y + 18, 12, 50);
        ctx.fillStyle = k < .25 ? '#D55E00' : k < .5 ? '#E69F00' : '#009E73'; const h = r0(48 * k); ctx.fillRect(x + 109, y + 19 + 48 - h, 10, h); }
      if (r.id === 'shelter' && moon && s.M.rad) text(`SOIL ${s.shelter}/${RU.safeSoilCm} cm`, x + 34, y + RH - 6, s.shelter >= RU.safeSoilCm ? '#3ddc97' : '#ff9a3c', 9); // only in missions with solar storms
    });
    if (!still) ambient(t, s, moon, L);
    if (PREV && !still) { const n = PREV.net, k = Math.min(1, Math.abs(n) / 300), cnt = 4 + Math.round(k * 8);
      ctx.fillStyle = '#5b4a1a'; ctx.fillRect(381, SKY - 8, 2, 120); ctx.fillRect(256, 271, 128, 2);
      for (let i = 0; i < cnt; i++) { const ph = ((t / (900 - k * 500)) + i / cnt) % 1;
        if (n >= 0) { ctx.fillStyle = '#F0E442'; ctx.fillRect(380, SKY - 8 + ph * 120, 4, 4); } else { ctx.fillStyle = '#ff7a3c'; ctx.fillRect(384 - ph * 384, 270, 4, 4); } } }
    if (!still) drawRover(t, moon);
    CREW.forEach((c, k) => { const p = crewPos[k], [rx, ry] = roomXY(p.room), job = S.jobs[k];
      // jobs done outside: the astronaut walks on the surface (science trip, cleaning panels, digging soil)
      if (!still && OUTSIDE[job]) { drawOutside(t, k, p, job); return; }
      // wander a little around their spot, then pause (not while resting)
      if (!still && job !== 'rest' && Math.abs(p.tx - p.x) <= 1 && t > (p.next || 0)) { const home = p.home ?? p.tx, range = job ? 14 : 34;
        p.tx = Math.max(rx + 14, Math.min(rx + RW - 14, home + (Math.random() * 2 - 1) * range)); p.next = t + 1800 + Math.random() * 3500; }
      const dx = p.tx - p.x, moving = Math.abs(dx) > 1 && !still;
      if (moving) { p.x += Math.sign(dx) * Math.min(Math.abs(dx), job ? 0.6 : 0.9); p.facing = Math.sign(dx); } else p.x = p.tx;
      const md = MOODS[k], live = md && t >= md.t0 && t - md.t0 < 4200, hop = live && md.hop && !still && t - md.t0 < 1800 ? Math.abs(Math.sin((t - md.t0) / 110)) * 7 : 0;
      const indoor = ROOMS[p.room].id !== 'airlock'; // helmet off inside, on in the airlock
      const fr = spr(k, moving ? 'walk' : 'idle', indoor); if (!fr.length) return;
      const cheer = !still && actFrame(k, 'cheer', t, indoor); // just won a puzzle, or was tapped: a happy jump
      if (cheer) { drawSprite(cheer, p.x, ry + RH - 9, p.facing, 1); if (k === 0) text('★', p.x, ry + RH - 52, '#ff9a3c', 9); return; }
      if (job === 'rest') { // asleep in a bunk (or a sleeping bag) in the shelter
        const [ax, ay, bag] = bedSpot(k), sx = RW / 384, sy = RH / 240; p.x = rx + ax * sx; drawSleeper(t, k, rx + ax * sx, ry + ay * sy, 0.55, bag);
        if (k === 0) text('★', rx + ax * sx + 16, ry + ay * sy - 8, '#ff9a3c', 8); return; }
      const work = !moving && !still && job ? Math.abs(Math.sin(t / 180 + k)) * 1.5 : 0; // a small busy bob while working
      const busy = !moving && !still && JOBANIM[job] && actFrame(k, JOBANIM[job], t, indoor); // watering, repairing
      drawSprite(busy || fr[Math.floor(t / (moving ? 110 : 260)) % fr.length], p.x, ry + RH - 9 - hop - (busy ? 0 : work), p.facing, 1);
      if (!moving && !still) jobFx(t, k, job, p.x + p.facing * 14, ry + RH - 34);
      if (k === 0) text('★', p.x, ry + 16 - hop, '#ff9a3c', 9); if (selected === k) { ctx.fillStyle = '#F0E442'; ctx.fillRect(p.x - 3, ry + 4, 6, 6); }
      if (live) { const by = ry + 2 - hop; ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 9, by - 13, 18, 15); ctx.fillRect(p.x - 2, by + 2, 4, 3); ctx.fillStyle = '#000'; ctx.fillRect(p.x - 9, by - 13, 18, 1);
        ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; if (window.JAMT_ICON && JAMT_ICON.hasIcon(md.e)) JAMT_ICON.draw(ctx, md.e, p.x, by - 1, 10, () => {}); else ctx.fillText(md.e, p.x, by - 2); ctx.textAlign = 'left'; } });
  }
  // Animations inside a zoomed room (the room art fills x 0–384, y 40–280). Skipped when the player prefers reduced motion.
  // Colour the zoomed room picture itself (grow-light pink, lights-off dark) instead of a rectangle that spills outside it.
  let ROOMTINT = null;
  function roomTint(r, color) { const im = IMG['room_' + r.img]; if (!im) return;
    if (!ROOMTINT) { ROOMTINT = document.createElement('canvas'); ROOMTINT.width = im.width; ROOMTINT.height = im.height; }
    const g = ROOMTINT.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, ROOMTINT.width, ROOMTINT.height); g.drawImage(im, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, ROOMTINT.width, ROOMTINT.height); g.globalCompositeOperation = 'source-over';
    ctx.drawImage(ROOMTINT, 0, 40, 384, 240); }
  function roomAmbient(t, r, s) {
    const busy = S.jobs.some(j => j && roomFor(j) === r.id), wave = (p, sp) => 0.5 + 0.5 * Math.sin(t / sp + p);
    const rise = (n, x0, w, y0, h, sp, col, size) => { for (let i = 0; i < n; i++) { const ph = ((t / sp) + i / n) % 1, x = x0 + ((i * 37) % w) + Math.sin(t / 400 + i) * 3;
      ctx.globalAlpha = 1 - ph; ctx.fillStyle = col; ctx.fillRect(x | 0, (y0 + h - ph * h) | 0, size, size); } ctx.globalAlpha = 1; };
    if (r.id === 'airlock') { // status light, and the view outside
      ctx.fillStyle = Math.floor(t / 700) % 2 ? '#3ddc97' : '#1f5f45'; ctx.fillRect(184, 46, 16, 6);
      if (s.world === 'moon') for (let i = 0; i < 8; i++) { const a = wave(i * 1.7, 500); if (a > .7) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(290 + (i * 23) % 82, 54 + (i * 13) % 30, 1, 1); } }
      else for (let i = 0; i < 12; i++) { const x = 286 + ((i * 29 + t * 0.03) % 90); ctx.fillStyle = 'rgba(232,178,122,.7)'; ctx.fillRect(x | 0, 56 + (i * 7) % 50, 2, 1); }
      if (busy) rise(6, 40, 200, 150, 110, 2600, 'rgba(255,255,255,.8)', 2); }            // suit air puffs while the crew gets ready
    if (r.id === 'lab') { const sx = ((t / 1800) % 1) * 360 + 12; ctx.fillStyle = 'rgba(86,180,233,.18)'; ctx.fillRect(sx | 0, 52, 6, 216); // a scanner sweeping the samples
      for (let i = 0; i < 6; i++) { ctx.fillStyle = wave(i * 2.1, 260) > .5 ? ['#3ddc97', '#F0E442', '#56B4E9'][i % 3] : '#1b2233'; ctx.fillRect(30 + i * 10, 60, 6, 4); } // blinking lights
      if (busy) rise(10, 60, 260, 110, 150, 2000, '#F0E442', 3); }                                 // science sparks
    if (r.id === 'greenhouse') { roomTint(r, `rgba(214,120,255,${0.07 + 0.08 * wave(0, 900)})`); // grow-lights, on the room only
      for (let i = 0; i < 10; i++) { const ph = ((t / 1500) + i / 10) % 1; ctx.fillStyle = `rgba(120,200,255,${1 - ph})`; ctx.fillRect(40 + (i * 31) % 300, (70 + ph * 150) | 0, 2, 4); } // watering drops
      if (busy) rise(8, 50, 280, 120, 130, 2400, '#7ee08a', 3); }                                  // little leaves
    if (r.id === 'shelter') { if (busy && S.jobs.includes('rest')) for (let i = 0; i < 3; i++) { const ph = ((t / 2200) + i / 3) % 1; ctx.globalAlpha = 1 - ph; text('z', 120 + i * 50 + ph * 20, 190 - ph * 90, '#cfe3ff', 12 + ph * 10); ctx.globalAlpha = 1; } // sleeping
      if (s.M.rad && s.shelter >= RU.safeSoilCm) { ctx.strokeStyle = `rgba(61,220,151,${0.2 + 0.3 * wave(0, 700)})`; ctx.lineWidth = 3; ctx.strokeRect(14, 54, 320, 212); }
      const storm = s.events.find(e => !e.done && isStorm(e) && e.day - s.day <= 1); if (storm) { ctx.fillStyle = `rgba(213,94,0,${0.12 * wave(0, 300)})`; ctx.fillRect(12, 52, 360, 216); } } // storm warning
    if (r.id === 'oxygen') { if (S.sw.maker) rise(12, 168, 50, 90, 140, 1700, 'rgba(200,240,255,.95)', 3); // bubbles inside the glass column: air being made
      if (s.broken) for (let i = 0; i < 5; i++) { const ph = ((t / 900) + i / 5) % 1; ctx.fillStyle = `rgba(86,180,233,${1 - ph})`; ctx.fillRect(200 + i * 14, (200 + ph * 70) | 0, 3, 5); } } // a leak
    if (r.id === 'battery') { const kk = Math.max(0, s.batt) / s.cap, h = 176 * kk, up = !PREV || PREV.net >= 0;
      for (let i = 0; i < 3; i++) { const ph = ((t / 1300) + i / 3) % 1, yy = 72 + 176 - (up ? ph : 1 - ph) * h; if (h > 8) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(336, yy | 0, 26, 2); } }
      if (up && L_of(s) > 0.3) for (let i = 0; i < 4; i++) { if (wave(i * 2.3, 120) > .93) { ctx.fillStyle = '#F0E442'; ctx.fillRect(300 + i * 8, 90 + i * 30, 3, 3); } } } // little sparks while charging
  }
  const L_of = s => light(s);
  function drawRoom(t, ri, zoomK) {
    const s = S, r = ROOMS[ri], im = IMG['room_' + r.img], [bx, by] = roomXY(ri), k = zoomK;
    const x = bx + (0 - bx) * k, y = by + (40 - by) * k, wd = RW + (384 - RW) * k, ht = RH + (240 - RH) * k;
    if (k < 1) { drawBase(t); ctx.fillStyle = `rgba(0,0,0,${k * 0.9})`; ctx.fillRect(0, 0, CW, CH); }
    else { ctx.fillStyle = s.world === 'moon' ? '#0c1222' : '#1c0e08'; ctx.fillRect(0, 0, CW, CH); for (let i = 0; i < 40; i++) { ctx.fillStyle = '#2b3550'; ctx.fillRect((i * 97) % CW, (i * 53) % 36, 1, 1); } }
    if (im) ctx.drawImage(im, x, y, wd, ht);
    if (k < 1) return;
    const C = roomCtx(ri);
    if (!still && isOn(r) !== false) roomAmbient(t, r, s);
    if (isOn(r) === false) { roomTint(r, 'rgba(0,0,0,.6)'); text('LIGHTS OFF', 192, 160, '#aab4ca', 18); }
    if (C.badge) { ctx.fillStyle = 'rgba(0,0,0,.8)'; ctx.fillRect(250, 4, 130, 26); text(C.badge, 315, 22, C.badgeCol, 13); }
    if (r.id === 'battery') { const kk = Math.max(0, s.batt) / s.cap; ctx.fillStyle = '#000'; ctx.fillRect(334, 70, 30, 180);
      ctx.fillStyle = kk < .25 ? '#D55E00' : kk < .5 ? '#E69F00' : '#009E73'; const h = r0(176 * kk); ctx.fillRect(336, 72 + 176 - h, 26, h); text(`${r0(kk * 100)}%`, 349, 268, '#fff', 14); }
    if (r.id === 'greenhouse') { ctx.fillStyle = '#000'; ctx.fillRect(40, 286, 304, 14); ctx.fillStyle = '#009E73'; ctx.fillRect(42, 288, r0(300 * s.grow / N.growDays), 10); }
    if (r.id === 'shelter' && s.world === 'moon' && s.M.rad) { const gx = 344, gy = 64, gh = 190, max = 14, hh = r0(gh * Math.min(1, s.shelter / max)), sy = gy + gh - r0(gh * RU.safeSoilCm / max);
      ctx.fillStyle = '#000'; ctx.fillRect(gx, gy, 26, gh); ctx.fillStyle = '#8c8174'; ctx.fillRect(gx + 2, gy + gh - hh, 22, hh); ctx.fillStyle = '#F0E442'; ctx.fillRect(gx - 6, sy, 38, 2); text('safe', gx + 13, sy - 4, '#F0E442', 10); }
    if (r.id === 'airlock') { const bg = IMG[s.world === 'moon' ? 'bg_moon' : 'bg_mars'], wx = 286, wy = 50, ww = 90, wh = 60; ctx.fillStyle = '#9aa0a6'; ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
      if (bg) ctx.drawImage(bg, 120, 40, 120, 80, wx, wy, ww, wh); const L = light(s); if (L < .9) { ctx.fillStyle = s.world === 'moon' ? `rgba(0,0,12,${(1 - L) * .75})` : `rgba(190,110,50,${(1 - L) * .7})`; ctx.fillRect(wx, wy, ww, wh); }
      text('outside', wx + ww / 2, wy + wh + 13, '#aab4ca', 10); }
    if (r.id === 'oxygen' && s.broken) { ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(92, 44, 200, 24); text('💥 RECYCLER BROKEN', 192, 61, '#ff7a3c', 15); } // at the top, so it never covers the lines below
    C.lines.forEach((ln, i) => text(ln, 192, (r.id === 'greenhouse' ? 318 : 306) + i * 18, '#fff', 13));
    const here = S.jobs.map((j, kk) => j && roomFor(j) === r.id ? kk : -1).filter(kk => kk >= 0);
    here.forEach((kk, i) => { if (S.jobs[kk] === 'rest' && !(t - (CHEER[kk] || -1e9) < 1260)) { const [ax, ay, bag] = bedSpot(kk); drawSleeper(t, kk, ax, 40 + ay, 1.5, bag); return; } // in a bunk or sleeping bag
      const indoor = r.id !== 'airlock', fr = spr(kk, 'idle', indoor), jt = t - (JUMP[kk] || -9999), cheer = !still && actFrame(kk, 'cheer', t, indoor);
      const hop = !cheer && jt < 500 && !still ? Math.sin(jt / 500 * Math.PI) * 26 : 0; // tapped: a happy jump (or a little hop)
      if (!cheer && S.jobs[kk] === 'lab' && spr(kk, 'back', true).length) { atComputer(t, kk, hop); return; }
      if (!cheer && !still && S.jobs[kk] === 'tend' && indoor) { // walk along the trays, stop at each one and water it
        const P = 3600, st = [128, 206, 284], n = Math.floor(t / P) + kk, ph = (t % P) / P, a = st[(n + 2) % 3], b = st[n % 3], walk = ph < 0.35, x = walk ? a + (b - a) * (ph / 0.35) : b;
        const wk = spr(kk, 'walk', true), wt = spr(kk, 'water', true), f = walk ? wk[Math.floor(t / 110) % (wk.length || 1)] : wt[Math.min(wt.length - 1, Math.floor((ph - 0.35) * P / 140) % (wt.length || 1))];
        if (f) drawSprite(f, x, 274 - hop, walk ? Math.sign(b - a) || 1 : 1, 2); return; }
      const busy = !still && JOBANIM[S.jobs[kk]] && actFrame(kk, JOBANIM[S.jobs[kk]], t, indoor);
      const f = cheer || busy || (fr.length ? fr[Math.floor(t / 260) % fr.length] : null); if (f) drawSprite(f, 70 + i * 90, 274 - hop, 1, 2); });
  }
  // Lab work: the astronaut stands at the big computer, seen from behind, typing. The screen scrolls data and keys flash.
  const PC = { x: 182, foot: 272, scr: [152, 124, 60, 40], keysY: 196 }; // where the astronaut stands, the main screen (x, y, w, h) and the keyboard row, in the zoomed lab
  function atComputer(t, kk, hop) {
    const [sx, sy, sw, sh] = PC.scr, run = !still;
    if (run) { ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip(); ctx.fillStyle = 'rgba(8,40,70,.55)'; ctx.fillRect(sx, sy, sw, sh);
      for (let i = 0; i < 9; i++) { const yy = sy + sh - ((t / 40 + i * 6) % (sh + 6)), w = 8 + ((i * 17) % 34); ctx.fillStyle = ['#7fffd4', '#F0E442', '#bfe8ff'][i % 3]; ctx.fillRect(sx + 4, yy | 0, w, 2); } // data scrolling up
      if (Math.floor(t / 450) % 2) { ctx.fillStyle = '#fff'; ctx.fillRect(sx + sw - 10, sy + sh - 8, 4, 5); } // the cursor
      ctx.restore(); }
    const tap = run ? Math.floor(t / 140) % 4 : 0, sway = run ? Math.round(Math.sin(t / 700)) : 0;
    const typing = spr(kk, 'type', true); // the typing animation (seen from behind, no helmet), or the still back view
    if (typing.length) drawSprite(typing[run ? Math.floor(t / 120) % typing.length : 0], PC.x, PC.foot - hop, 1, 2); else drawSprite(spr(kk, 'back', true)[0], PC.x + sway, PC.foot - hop - (tap === 1 ? 1 : 0), 1, 2);
    if (run && tap !== 3) { ctx.fillStyle = '#F0E442'; ctx.fillRect(PC.x + [-14, 10, -2][tap], PC.keysY, 3, 2); } // keys being pressed
  }
  function drawFloats(t) { FLOAT = FLOAT.filter(f => t - f.t0 < 1800); FLOAT.forEach(f => { if (t < f.t0) return; const k = (t - f.t0) / 1800; ctx.globalAlpha = 1 - k * k;
    ctx.font = 'bold 15px ui-monospace, Consolas, monospace'; const half = ctx.measureText(f.txt).width / 2 + 4, x = Math.min(CW - half, Math.max(half, f.x)); // keep it on screen
    text(f.txt, x, f.y - k * 34, f.col, 15); ctx.globalAlpha = 1; }); }
  function drawFX(t) { if (!FX || still) return; const k = (t - FX.t0) / FX.dur; if (k >= 1) { FX = null; return; }
    if (FX.kind === 'night') { ctx.fillStyle = `rgba(0,0,20,${Math.sin(k * Math.PI) * .75})`; ctx.fillRect(0, 0, CW, CH); }
    if (FX.kind === 'storm') for (let i = 0; i < 90; i++) { const x = (i * 41 + k * 900) % (CW + 100) - 50, y = (i * 67 + k * 600) % CH; ctx.fillStyle = i % 3 ? '#ffe76a' : '#ff6ad5'; ctx.fillRect(x | 0, y | 0, 3, 1); ctx.fillRect((x + 3) | 0, (y + 1) | 0, 2, 1); }
    if (FX.kind === 'confetti') for (let i = 0; i < 80; i++) { ctx.fillStyle = ['#F0E442', '#56B4E9', '#009E73', '#CC79A7', '#E69F00'][i % 5]; ctx.fillRect((i * 47 + Math.sin(i + k * 6) * 20) % CW, (i * 29 % 60) + k * 320, 3, 3); } }
  function drawBanner(t) { if (!BANNER || t < BANNER.t0) return; const k = (t - BANNER.t0) / 3200; if (k >= 1) { BANNER = null; return; }
    ctx.globalAlpha = k < .1 ? k * 10 : k > .85 ? (1 - k) / .15 : 1; ctx.fillStyle = 'rgba(0,0,0,.78)'; ctx.fillRect(72, 18, 240, 64); ctx.fillStyle = '#F0E442'; ctx.fillRect(72, 18, 240, 3); ctx.fillRect(72, 79, 240, 3);
    text(BANNER.title, 192, 42, '#F0E442', 17); text(BANNER.line, 192, 68, '#fff', 13); ctx.globalAlpha = 1; }
  function aiMark() { // visible watermark on the scene itself, so screenshots and videos carry it (Space Apps rule for AI images)
    if (NOAI) return; // private mode only (see unlockName)
    ctx.font = 'bold 8px ui-monospace, Consolas, monospace'; const t = 'AI', w = ctx.measureText(t).width + 8;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(CW - w - 2, CH - 15, w, 13); ctx.fillStyle = '#fff'; ctx.fillText(t, CW - w + 2, CH - 5); }
  function loop(t) { if (S) { if (view.mode === 'room') drawRoom(t, view.room, still ? 1 : Math.min(1, (t - view.t0) / 280)); else { drawBase(t); drawBanner(t); } drawPokes(t); drawFloats(t); drawFX(t); aiMark(); } requestAnimationFrame(loop); }

  // ---------- tap the scene: things react (a small burst, a sound, sometimes a real number) ----------
  let POKES = []; const JUMP = {}, CHEER = {}; // CHEER[k] = when astronaut k started a happy jump
  const POKE_KIND = { oxygen: 'bubble', greenhouse: 'leaf', lab: 'spark', battery: 'zap', shelter: 'dust', airlock: 'star' };
  function poke(x, y, kind) { POKES.push({ x, y, kind, t0: performance.now() }); if (POKES.length > 12) POKES.shift(); }
  function drawPokes(t) { POKES = POKES.filter(p => t - p.t0 < 900); POKES.forEach(p => { const k = (t - p.t0) / 900;
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + p.t0, d = 6 + k * 34, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * (p.kind === 'bubble' || p.kind === 'leaf' ? 0.6 : 1) - (p.kind === 'bubble' ? k * 30 : 0);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = { bubble: '#bfe8ff', leaf: '#7ee08a', spark: '#F0E442', zap: '#fff38a', dust: '#b9aa96', star: '#ffffff' }[p.kind] || '#fff';
      if (p.kind === 'bubble') { ctx.fillRect(x - 1, y - 2, 3, 1); ctx.fillRect(x - 2, y - 1, 1, 3); ctx.fillRect(x + 2, y - 1, 1, 3); ctx.fillRect(x - 1, y + 2, 3, 1); }
      else ctx.fillRect(x | 0, y | 0, p.kind === 'leaf' ? 3 : 2, p.kind === 'zap' ? 4 : 2); } ctx.globalAlpha = 1; }); }
  cv.addEventListener('pointerdown', e => { if (!S) return; const b = cv.getBoundingClientRect(), x = (e.clientX - b.left) * CW / b.width, y = (e.clientY - b.top) * CH / b.height;
    if (view.mode === 'room') { const r = ROOMS[view.room], here = S.jobs.map((j, k) => j && roomFor(j) === r.id ? k : -1).filter(k => k >= 0);
      const hit = here.findIndex((k, i) => Math.abs(x - (70 + i * 90)) < 34 && y > 160 && y < 290);
      if (hit >= 0) { const k = here[hit]; JUMP[k] = CHEER[k] = performance.now(); const L = T.crewLines || ['Hi!']; FLOAT.push({ txt: `${k === 0 ? 'Me' : CREW[k].name}: ${L[Math.floor(Math.random() * L.length)]}`, x: 70 + hit * 90, y: 150, col: '#fff', t0: performance.now() }); beep([[660, .05], [880, .07]], 'square', .04); return; }
      if (y > 40 && y < 280) { poke(x, y, POKE_KIND[r.id] || 'star'); beep([[500 + Math.random() * 500, .05]], 'triangle', .05); } return; }
    // base view: the sky part of the scene (the rooms below have their own buttons)
    const moon = S.world === 'moon';
    if (moon && Math.hypot(x - 186, y - 59) < 16) { FLOAT.push({ txt: '🌍 Earth · radio takes 1.3 s', x: 192, y: 92, col: '#56B4E9', t0: performance.now() }); poke(186, 59, 'star'); beep([[523, .06], [659, .08]], 'triangle', .05); return; }
    if (x >= 250 && y >= SKY - 64 && y <= SKY && PREV) { const L = light(S); FLOAT.push({ txt: `☀️ panels: ${r0(L * 100)} % sunlight${S.world === 'mars' && S.sunFactor ? ` · Sun ${r0(S.sunFactor * 100)} %` : ''}`, x: 300, y: SKY - 74, col: '#F0E442', t0: performance.now() }); poke(x, y, 'zap'); beep([[880, .05]], 'square', .04); return; }
    if (!moon && x >= 182 && x <= 246 && y >= SKY - 64 && y <= SKY) { FLOAT.push({ txt: `⚛️ nuclear unit: ${N.mars.kiloKWh} kWh a sol, day and night`, x: 214, y: SKY - 74, col: '#3ddc97', t0: performance.now() }); poke(x, y, 'spark'); beep([[330, .08]], 'triangle', .05); return; }
    if (y < SKY) { poke(x, y, moon ? 'star' : 'dust'); beep([[1200 + Math.random() * 600, .03]], 'sine', .04); } });

  // ---------- what each room means right now (shown when you zoom in) ----------
  const FACTS = T.facts; // data/text.js
  function roomCtx(ri) {
    const s = S, r = ROOMS[ri], p = PREV || step(s), W = N[s.world], moon = s.world === 'moon', on = isOn(r), stats = [], lines = [];
    let use = 0, badge = '', badgeCol = '#fff', whatif = '';
    if (r.sw === 'gh') use = W.ghKWh; if (r.sw === 'lab') use = W.labKWh; if (r.sw === 'maker') use = moon ? W.makerKWh : (s.sw.save ? W.slowKWh : W.isruKWh);
    const share = p.use ? r0(use / p.use * 100) : 0, here = s.jobs.filter(j => j && roomFor(j) === r.id).length;
    if (r.sw) { badge = on ? `⚡ −${use} a ${s.unit}` : '⚡ 0 (off)'; badgeCol = on ? '#ff9a3c' : '#aab4ca'; stats.push(on ? `⚡ uses ${use} kWh · ${share} % of today` : '⚡ off: uses nothing'); }
    if (r.id === 'airlock') { stats.push(`👤 ${here}/2`); if (!moon) stats.push(`🟫 panels ${r0(s.clean * 100)} % clean`);
      whatif = `🚀 A science trip needs 2 astronauts and earns ⭐⭐${s.M.life ? ', but uses 1 kg of suit air' : ''}${s.M.rad ? ' and adds a little radiation' : ''}.`;
      lines.push(light(s) < .5 ? (moon ? 'Outside: dark! No sun for the panels.' : 'Outside: dusty sky, weak sun.') : 'Outside: sunny.'); }
    if (r.id === 'lab') { stats.push(`👤 ${here}/1`); whatif = on ? `⚫ Switch off: ⚡ +${use} a ${s.unit}, but no lab ⭐.` : `💡 Switch on: a scientist here earns ⭐ (⚡ −${W.labKWh} a ${s.unit}).`;
      lines.push(here ? (on ? 'Science today: ⭐ +1' : 'The scientist can’t work in the dark!') : 'No scientist here today.'); }
    if (r.id === 'greenhouse') { const left = N.growDays - s.grow; stats.push(`👤 ${here}/1`, `🥬 ${s.grow}/${N.growDays} days`);
      whatif = on ? `⚫ Switch off: ⚡ +${use} a ${s.unit}, but the lettuce stops growing.` : `💡 Switch on: the lettuce grows again (⚡ −${W.ghKWh} a ${s.unit}).`;
      lines.push(on ? `Harvest in ${left} ${s.unit}${left === 1 ? '' : 's'} if lights stay on` : 'Lights off: the plants are waiting');
      if (s.M.food) { stats.push(`🍽️ ${r1(Math.max(0, s.food))} kg of food`); whatif += ` 🥬 One harvest is ${N.harvestKg} kg: about half a day of food.`; } }
    if (r.id === 'shelter') { stats.push(`👤 ${here}`); if (!s.M.rad) { whatif = '😴 Beds for resting. No solar storms in this mission (try “Solar storm!”).'; lines.push('Beds for resting'); } else if (moon) { stats.push(`🛡️ ${s.shelter} cm`); const storm = s.events.find(e => !e.done && isStorm(e));
        whatif = s.shelter >= RU.safeSoilCm ? `✅ Thick enough to block most of a big solar storm (safe line: ${RU.safeSoilCm} cm).` : `⚠️ Below the safe line (${RU.safeSoilCm} cm). Add moon soil from the 🚪 AIRLOCK.`;
        lines.push(storm ? `Solar storm forecast: ${s.unit} ${storm.day}` : `${s.shelter} cm of moon soil`); }
      else { whatif = '🌫️ On Mars the air is already a thick blanket against solar storms.'; lines.push('Beds for resting'); } }
    if (r.id === 'oxygen') { stats.push(`👤 ${here}/1`); const daysAir = s.o2 / N.o2Use;
      whatif = on ? `⚫ Switch off: ⚡ +${use} a ${s.unit}${s.M.life ? `, but air goes down ${r1(N.o2Use)} kg a ${s.unit} (tanks: ${Math.floor(daysAir)} ${s.unit}s)` : '. The tanks hold about 9 days of air.'}` : `💡 Switch on: makes air again (⚡ −${use} a ${s.unit}).`;
      lines.push(s.M.life ? `Air tanks: ${r1(s.o2)} kg ≈ ${Math.floor(daysAir)} ${s.unit}s` : 'Air tanks: about 9 days'); if (s.broken) stats.push('💥 recycler broken'); }
    if (r.id === 'battery') { badge = `🔋 ${r0(Math.max(0, s.batt))}/${s.cap}`; badgeCol = '#F0E442';
      const drain = moon ? p.use : Math.max(1, p.use - W.kiloKWh - W.arrays * W.arrayKWh * 0.3), lasts = Math.max(0, s.batt) / drain;
      stats.push(`today ${p.net >= 0 ? '+' : ''}${r0(p.net)} kWh`, s.sw.save ? '🌙 power-save ON' : '☀️ power-save OFF');
      whatif = moon ? `🌑 With no sun, using ${r0(drain)} kWh a day, this battery lasts ${r1(lasts)} days.` : `🌪️ In a dust storm (30 % sun), it lasts ${r1(lasts)} sols at today's use.`;
      lines.push(moon ? `No sun: lasts ${r1(lasts)} days` : `Dust storm: lasts ${r1(lasts)} sols`); }
    // the room's fact, alternating by day with a real NASA study from OSDR (data/text.js → studies)
    const opts = [(FACTS[r.id] || {})[s.world] || {}, ...(T.studies || []).filter(x => x.room === r.id).map(x => ({ text: x.text, tag: 'NASA STUDY · OSDR' }))];
    const fact = opts[s.day % opts.length] || {};
    return { stats, whatif, lines, badge, badgeCol, fact: fact.text || '', factTag: fact.tag || 'REAL NASA' };
  }

  // ---------- room minigames (js/minigames.js; words in data/text.js → minigames; bonus in data/model.js → rules.minigame) ----------
  const MGR = RU.minigame || {};
  function miniReady(j) { const G = window.JAMT_MINI && JAMT_MINI.games[j] && T.minigames && T.minigames[j];
    if (!G || !S.jobs.includes(j) || (S.mgTried || {})[j] === S.day) return false;
    // fix: when broken, winning finishes the repair; when not, it is a check-up and gives a star
    if (j === 'trip') return S.jobs.filter(x => x === 'trip').length >= RU.crewPerTrip;
    if (j === 'lab') return S.sw.lab && !S.sw.save;         // a dark lab gives no science, puzzle or not
    return true; }
  const miniBonus = j => ({ fix: S && S.broken ? 'the repair is finished' : `+${MGR.stars} ⭐`, regolith: `+${MGR.soilCm} cm of soil`, tend: `the lettuce grows ${MGR.growDays} extra days` }[j] || `+${MGR.stars} ⭐`);
  function playMini(j) {
    const G = T.minigames[j], src = DATA.sources[G.src]; S.mgTried = S.mgTried || {}; S.mgTried[j] = S.day; let over = false;
    popup(`<h2>${G.title}</h2>${mcSay(G.how)}${timerBox()}<div class="mg" id="mg"></div><div class="tip" id="mgtip"></div>
      <button class="big" id="mgskip"><span class="e">⏭</span><span>Not now<small>the job still gets done, without the bonus</small></span></button><span data-must></span>`);
    $('popcard').classList.add(S.world); // moon or mars: the puzzle art matches the world (index.html)
    $('popcard').classList.add('mgcard'); // a wider card: the boards scale with the screen (index.html → .mg --cs)
    // Rewards: every good move plays a note a little higher (a combo); a mistake resets it. Winning gives 1–3 stars,
    // a personal best time and a streak of puzzles won in a row. Bonuses in the game stay the same: this is just for fun.
    const T0 = performance.now(); let combo = 0;
    const end = (win, msg) => { if (over) return; over = true; clearTimer();
      const secs = Math.round((performance.now() - T0) / 1000), miss = o.miss || 0, par = (MGR.par || {})[j] || 40;
      const rate = !win ? 0 : miss === 0 && secs <= par ? 3 : miss <= 2 && secs <= par * 1.6 ? 2 : 1;
      let best = {}; try { best = JSON.parse(store.get('jamt-best') || '{}') || {}; } catch (e) {}
      const record = win && (!best[j] || secs < best[j]); if (record) { best[j] = secs; store.set('jamt-best', JSON.stringify(best)); }
      const streak = win ? (+store.get('jamt-streak') || 0) + 1 : 0; store.set('jamt-streak', String(streak));
      if (win) { S.mg = S.mg || {}; S.mg[j] = true; }
      // Puzzle won: first a 10-second first-person scene of the job (js/eva.js), then the result card. Tap or "Skip" to jump ahead.
      if (win && !still && window.JAMT_EVA && JAMT_EVA.has(j)) {
        const team = S.jobs.map((jj, k) => jj === j ? k : -1).filter(k => k >= 0), buddy = team.find(k => k !== 0);
        const head = { trip: '🚀 Out on the surface…', clean: '🧽 Out to the solar panels…', regolith: '🛡️ Out to the shelter wall…', lab: '🔬 To the lab…', fix: '🔧 To the air maker…', tend: '🌱 To the greenhouse…' }[j];
        popup(`<h2>${head}</h2><div id="evahost"></div>`); $('popcard').classList.add('mgcard');
        JAMT_EVA.play($('evahost'), { job: j, world: S.world, noai: NOAI, banner: j === 'fix' && !S.broken ? `ALL CHECKED! +${MGR.stars} ★` : null, partner: j === 'trip' ? SPR.back[buddy != null ? buddy : 1] || null : null,
          sound: k => k === 'door' ? beep([[220, .25], [180, .3]], 'sawtooth', .025) : k === 'clink' ? beep([[1400, .03], [900, .04]], 'square', .03) : k === 'pop' ? beep([[300, .04], [600, .06]], 'triangle', .05) : beep([[90, .05]], 'triangle', .05) }, () => show());
        return; }
      show();
      function show() {
      // the astronauts on that job jump for joy (CHEER), with confetti and star chimes
      if (win) { S.jobs.forEach((jj, k) => { if (jj === j) CHEER[k] = performance.now() + 300; }); SFX.win(); FX = { kind: 'confetti', t0: performance.now(), dur: 2200 };
        for (let i = 0; i < rate; i++) setTimeout(() => beep([[784 * Math.pow(2, i * 4 / 12), .09], [1047 * Math.pow(2, i * 4 / 12), .14]], 'square', .05), 650 + i * 330); } else SFX.lose();
      const praise = ['Good job!', 'Great work!', 'PERFECT!'][rate - 1] || 'Good try!';
      const burst = win && !still ? `<div class="burst" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="--x:${Math.round(Math.cos(i * 2.4) * (90 + (i * 37) % 120))}px;--y:${Math.round(Math.sin(i * 2.4) * (70 + (i * 53) % 110))}px;--r:${(i * 47) % 360}deg;background:${['#F0E442', '#56B4E9', '#009E73', '#CC79A7', '#E69F00'][i % 5]};animation-delay:${(i % 7) * 25}ms"></i>`).join('')}</div>` : '';
      popup(`${burst}<h2 class="${win ? 'cheer' : ''}">${win ? `🎉 ${praise}` : '👍 Good try!'}</h2>
        ${win ? `<div class="rate" aria-label="${rate} of 3 stars">${[0, 1, 2].map(i => `<span class="${i < rate ? 'on' : ''}" style="animation-delay:${650 + i * 330}ms">★</span>`).join('')}</div>
          <p class="wins">⏱ ${secs} s${record ? ' · <b class="rec">🏆 New best time!</b>' : best[j] ? ` · best ${best[j]} s` : ''}${streak > 1 ? ` · 🔥 <b>${streak} in a row!</b>` : ''}</p>` : ''}
        ${mcSay(win ? `You did it, ${CMD()}! Bonus: <b>${miniBonus(j)}</b> when the ${S.unit} ends.` : `${msg || 'Time is up.'} The job still gets done today. You can try again tomorrow.`)}
        <div class="fact"><span class="tag2 real">REAL</span>${G.fact}</div><div class="src">${src ? src.name : ''} · the puzzle itself is a game.</div>
        <button class="big primary" data-close>OK</button>`); hud(); } };
    const say = t => { const tp = $('mgtip'); if (tp) { tp.textContent = t; tp.classList.remove('show'); void tp.offsetWidth; tp.classList.add('show'); } if (combo > 1) SFX.off(); combo = 0; };
    $('mgskip').onclick = () => { over = true; clearTimer(); SFX.tap(); closeAll(); hud(); };
    const o = { rng: SIM.rng(S.code * 97 + S.day * 7 + j.length), win: () => end(true), lose: m => end(false, m), say,
      tap: () => { combo += 1; beep([[523 * Math.pow(2, Math.min(combo, 15) / 12), .06]], 'square', .045); } };
    JAMT_MINI.games[j]($('mg'), o);
    countdown((MGR.seconds || {})[j] || 60, () => end(false, 'Time is up!'));
  }

  // ---------- HUD, forecast, crew bar ----------
  function hud() {
    if (S.mg) Object.keys(S.mg).forEach(j => { if (!S.jobs.includes(j)) delete S.mg[j]; }); // a bonus only counts while someone does that job
    const s = S, p = step(s), ms = []; PREV = p;
    for (const m of s.M.meters) {
      if (m === 'power') { const k = Math.max(0, s.batt) / s.cap; ms.push({ em: '⚡', name: 'Power', val: `${r0(k * 100)}%`, lvl: k, st: k < .25 || (p.net < 0 && s.batt + p.net * 2 < 0) ? 'low' : k < .5 ? 'watch' : 'ok', sub: `${p.net >= 0 ? '+' : ''}${r0(p.net)} today` }); }
      if (m === 'life') { const d = []; if (p.o2Net < 0) d.push(s.o2 / -p.o2Net); if (p.wNet < 0) d.push(s.water / -p.wNet); d.push(s.food / N.foodUse); const min = Math.min(...d);
        ms.push({ em: '🫁', name: 'Air & water', val: min > 99 ? '99+' : `${Math.floor(min)}`, lvl: Math.min(1, min / 40), st: min < 6 ? 'low' : min < 15 ? 'watch' : 'ok', sub: s.broken ? 'recycler broken!' : `${s.unit}s left` }); }
      if (m === 'rad') ms.push({ em: '☢️', name: 'Radiation', val: `${r0(s.dose)}`, lvl: Math.min(1, s.dose / N.careerLimit), st: s.dose > N.careerLimit * .75 ? 'low' : s.dose > N.careerLimit * .5 ? 'watch' : 'ok', sub: s.world === 'mars' ? `${N.mars.cruiseDose} from the trip` : `limit ${N.careerLimit}` });
      if (m === 'food') { const d = Math.max(0, s.food) / (N.foodUse * (s.sw.ration ? RU.rationFactor : 1)), ship = s.M.cargo && s.day <= s.M.cargo.day ? `ship lands ${s.unit} ${s.M.cargo.day}` : `${s.unit}s of food`;
        ms.push({ em: '🍽️', name: 'Food', val: `${Math.floor(d)}`, lvl: Math.min(1, d / 8), st: d < 2 ? 'low' : d < 4 ? 'watch' : 'ok', sub: s.sw.ration ? `small meals · ${ship}` : ship }); }
    }
    $('hud').style.setProperty('--n', ms.length);
    $('hud').innerHTML = ms.map(m => `<button class="meter ${m.st}" data-m="${m.name}" aria-label="${m.name} ${m.val}, ${m.sub}"><div class="row"><span class="em">${m.em}</span>${m.name}<b>${m.val}</b></div><div class="bar"><i style="width:${Math.max(3, m.lvl * 100)}%"></i></div><div class="sub">${m.sub}</div></button>`).join('');
    $('hud').querySelectorAll('.meter').forEach(b => b.onclick = () => { SFX.tap(); popup(`<h2>Why? ${b.dataset.m}</h2>${p.math.map(x => `<p class="mono" style="font-size:.85rem">${x}</p>`).join('')}<div class="src">Numbers from NASA studies. 📚 shows the real data.</div><button class="big primary" data-close>OK</button>`); });
    $('starbar').style.width = Math.min(100, s.stars / s.goal * 100) + '%'; $('startxt').textContent = `${s.stars}/${s.goal}`;
    $('day').innerHTML = s.unit === 'sol' ? `${w('sol', 'SOL')} ${Math.min(s.day, s.days)}/${s.days}` : `DAY ${Math.min(s.day, s.days)}/${s.days}`; bindWordsTop();
    $('mtitle').textContent = `${s.world === 'moon' ? '🌙' : '🔴'} ${s.M.title}`;
    $('end').textContent = `End ${s.unit} ▶`;
    const fc = []; for (let d = s.day; d < s.day + 5 && d <= s.days; d++) { let e = '☀️';
      if (s.world === 'moon' && s.M.dark.includes(d)) e = '🌑'; if (s.world === 'mars' && s.M.dust[d] !== undefined) e = s.M.dust[d] <= 0.3 ? '🌪️' : '🌫️';
      if (s.events.some(x => !x.done && x.day === d && isStorm(x))) e = '☢️'; if (s.M.cargo && s.M.cargo.day === d) e = '📦'; fc.push(`<div class="d ${d === s.day ? 'now' : ''}"><span>${e}</span><small>${d === s.day ? 'now' : d}</small></div>`); }
    if (s.day + 4 >= s.days) fc.push(`<div class="d"><span>🏁</span><small>${s.days}</small></div>`);
    $('forecast').innerHTML = fc.join('');
    crewHome(); renderBaseOverlay(); renderPanel();
    if (TUT) tutShow(); else if (HINT) showHint(HINT);
  }
  function bindWordsTop() { $('day').querySelectorAll('.word').forEach(b => b.onclick = () => popup(`<p>${WORDS.sol}</p><button class="big primary" data-close>OK</button>`)); }
  function renderBaseOverlay() {
    const base = view.mode === 'base';
    $('rooms').style.display = base ? '' : 'none'; $('bulbs').style.display = base ? '' : 'none'; $('roomtop').classList.toggle('show', !base); $('sunbtn').style.display = base ? '' : 'none';
    if (!base) { const r = ROOMS[view.room]; $('roomname').textContent = `${r.icon} ${r.name}`; return; }
    $('rooms').innerHTML = ROOMS.map((r, i) => { const n = S.jobs.filter(j => j && roomFor(j) === r.id).length;
      return `<button class="room ${selected !== null && r.id !== 'battery' ? 'can' : ''}" data-i="${i}" aria-label="${r.name}${n ? ', ' + n + ' astronaut' + (n > 1 ? 's' : '') : ''}"><span class="tag">${r.icon} ${r.name}${n ? ' · 👤' + n : ''}</span></button>`; }).join('');
    $('rooms').querySelectorAll('.room').forEach(b => b.onclick = () => openRoom(+b.dataset.i));
    $('bulbs').innerHTML = ROOMS.map(r => `<div>${r.sw ? `<button class="bulb ${isOn(r) ? '' : 'off'}" data-sw="${r.sw}" aria-label="${r.name} lights ${isOn(r) ? 'on' : 'off'}">💡</button>` : ''}</div>`).join('');
    $('bulbs').querySelectorAll('.bulb').forEach(b => b.onclick = e => { e.stopPropagation(); toggle(b.dataset.sw); });
  }
  function toggle(swk) { if (swk === 'lab' && S.sw.save && !S.sw.lab) S.sw.save = false; S.sw[swk] = !S.sw[swk]; (S.sw[swk] ? SFX.go : SFX.off)();
    const net = step(S).net; FLOAT.push({ txt: swk === 'ration' ? `🍽️ Small meals ${S.sw.ration ? 'ON' : 'OFF'}` : `${S.sw[swk] ? '💡' : '⚫'} ⚡ ${net >= 0 ? '+' : ''}${r0(net)}/${S.unit}`, x: 192, y: 180, col: net >= 0 ? '#F0E442' : '#ff7a3c', t0: performance.now() });
    HINT = null; hud(); tut('switch'); }
  function renderPanel() {
    if (view.mode === 'base') {
      const free = S.jobs.filter(j => !j).length;
      $('panel').innerHTML = `<div class="crewbar">${CREW.map((c, k) => { const j = S.jobs[k];
        return `<button class="crew ${selected === k ? 'sel' : ''} ${j ? 'busy' : ''}" data-k="${k}" aria-label="${crewName(k)}${k === 0 ? ' (you)' : ''}, ${j ? JOB[j][1] : 'free'}"><canvas width="68" height="68"></canvas><b>${crewName(k)}</b>${k === 0 ? '<span class="you">YOU</span>' : ''}<small>${j ? JOB[j][0] + ' ' + JOB[j][1] : 'free'}</small></button>`; }).join('')}</div>
        <p class="say">${selected !== null ? `👉 Now tap a room for <b>${crewName(selected)}</b>` : free ? `Tap an astronaut, then a room. ${free} free.` : `Everyone has a job! Press End ${S.unit}.`}</p>`;
      $('panel').querySelectorAll('.crew').forEach((b, k) => { const c = b.querySelector('canvas'), g = c.getContext('2d'); g.imageSmoothingEnabled = false; if (SPR.face[k]) g.drawImage(SPR.face[k], 0, 0);
        b.onclick = () => { SFX.tap(); if (S.jobs[k]) { const j = S.jobs[k]; if (j === 'trip') S.jobs = S.jobs.map(x => x === 'trip' ? null : x); else S.jobs[k] = null; selected = null; FLOAT.push({ txt: `${crewName(k)} is free`, x: 192, y: 180, col: '#fff', t0: performance.now() }); hud(); return; }
          selected = selected === k ? null : k; HINT = null; renderBaseOverlay(); renderPanel(); tut('crew'); }; });
      return;
    }
    const s = S, r = ROOMS[view.room], moon = s.world === 'moon', acts = [];
    if (r.sw) { const on = isOn(r), kwh = { gh: N[s.world].ghKWh, lab: N[s.world].labKWh, maker: moon ? N.moon.makerKWh : N.mars.isruKWh }[r.sw];
      acts.push([`sw:${r.sw}`, on ? '💡' : '⚫', `Lights ${on ? 'ON' : 'OFF'}`, `${on ? 'uses' : 'would use'} ${kwh} kWh a ${s.unit} · tap to ${on ? 'turn off' : 'turn on'}`, on]); }
    if (r.id === 'airlock') { acts.push(['job:trip', '🚀', 'Science trip', `2 astronauts go out · ⭐⭐ · uses suit air`]);
      if (moon && s.M.rad) acts.push(['job:regolith', '🛡️', 'Add moon soil to the shelter', `1 astronaut · +${RU.soilPerJob} cm`]); if (!moon) acts.push(['job:clean', '🧽', 'Clean the solar panels', `1 astronaut · panels ${r0(s.clean * 100)} % clean`]); }
    if (r.id === 'lab') acts.push(['job:lab', '🔬', 'Do science here', isOn(r) ? '1 astronaut · ⭐' : '⚠️ turn the lights on first']);
    if (r.id === 'greenhouse') acts.push(['job:tend', '🌱', 'Take care of the plants', `1 astronaut · lettuce ${s.grow}/${N.growDays}`]);
    if (r.id === 'greenhouse' && s.M.food) acts.push(['sw:ration', '🍽️', `Small meals ${s.sw.ration ? 'ON' : 'OFF'}`, `the food lasts longer, but hungry astronauts find less science · ${r1(Math.max(0, s.food))} kg of food left`, s.sw.ration]);
    if (r.id === 'oxygen') acts.push(['job:fix', '🔧', s.broken ? 'Fix the recycler!' : 'Check the machines', s.broken ? 'repairs the water recycler' : s.M.life ? 'stops breakdowns' : `the air maker uses ${Math.round((1 - RU.tuneFactor) * 100)} % less power today`]);
    if (r.id === 'shelter') acts.push(['job:rest', '😴', 'Rest here', 'tired astronauts find less science']);
    if (r.id === 'battery') acts.push(['sw:save', s.sw.save ? '🌙' : '☀️', `Power-save ${s.sw.save ? 'ON' : 'OFF'}`, `uses ${r0((1 - RU.saveFactor) * 100)} % less, but the lab stops · battery ${r0(Math.max(0, s.batt))}/${s.cap} kWh`, s.sw.save]);
    const here = S.jobs.map((j, k) => j && roomFor(j) === r.id ? k : -1).filter(k => k >= 0);
    // a minigame for each job someone is doing here today (one try per job per day)
    [...new Set(here.map(k => S.jobs[k]))].filter(miniReady).forEach(j => { const G = T.minigames[j];
      acts.unshift([`mg:${j}`, '🎮', `Play: ${G.title.replace(/^\S+\s/, '')}`, `a short puzzle · win: ${miniBonus(j)} when the ${s.unit} ends`, false, 'mg']); });
    const C = roomCtx(view.room);
    $('panel').innerHTML = `<div class="ctx"><b>${r.icon} ${r.about}</b><div class="stats">${C.stats.map(x => `<span>${x}</span>`).join('')}</div>${C.whatif ? `<p class="whatif">${C.whatif}</p>` : ''}${C.fact ? `<div class="fact"><span class="tag2 real">${C.factTag}</span>${C.fact}</div>` : ''}</div>` +
      acts.map(([id, e, t, sub, on, cls]) => `<button class="big ${on ? 'on' : ''} ${cls || ''}" data-a="${id}"><span class="e">${e}</span><span>${t}<small>${sub}</small></span></button>`).join('') +
      (here.length ? `<div class="chips">${here.map(k => `<button class="chip" data-free="${k}"><span class="dot" style="background:${CREW[k].col ? `rgb(${CREW[k].col})` : '#ff9a3c'}"></span>${crewName(k)} ${JOB[S.jobs[k]][0]} · send back ✕</button>`).join('')}</div>` : '');
    $('panel').querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const [k, v] = b.dataset.a.split(':'); if (k === 'sw') { toggle(v); return; } if (k === 'mg') { playMini(v); return; } assign(v, v === 'trip' ? RU.crewPerTrip : 1); });
    $('panel').querySelectorAll('[data-free]').forEach(b => b.onclick = () => { const k = +b.dataset.free; if (S.jobs[k] === 'trip') S.jobs = S.jobs.map(j => j === 'trip' ? null : j); else S.jobs[k] = null; SFX.off(); hud(); });
  }
  function assign(job, n) {
    const cap = (RU.jobCap || {})[job]; // some jobs have room for one astronaut only (data/model.js → rules.jobCap)
    if (cap && S.jobs.filter(j => j === job).length >= cap) { flash(`${JOB[job][1]} is a job for ${cap} astronaut${cap > 1 ? 's' : ''}. Pick another room for this one.`); return; }
    const free = S.jobs.map((j, k) => j ? -1 : k).filter(k => k >= 0);
    if (selected !== null && free.includes(selected)) { free.splice(free.indexOf(selected), 1); free.unshift(selected); }
    if (free.length < n) { flash(n > 1 ? 'A science trip needs 2 free astronauts: they always go outside in pairs.' : 'Everyone is busy! Send someone back first.'); return; }
    free.slice(0, n).forEach((k, i) => { S.jobs[k] = job; FLOAT.push({ txt: `${crewName(k)} ${JOB[job][0]}`, x: 120 + i * 140, y: 300, col: '#fff', t0: performance.now() }); });
    selected = null; HINT = null; SFX.go(); hud(); tut('assign');
  }
  function flash(msg) { const p = $('panel').querySelector('.say'); if (p) { p.innerHTML = '⚠️ ' + msg; p.style.color = 'var(--sun)'; } else showHint({ text: '⚠️ ' + msg, t: () => null }); SFX.off(); } // inside a room there is no line under the crew, so Mission Control says it
  function openRoom(i) { SFX.zoom(); const sel = selected; view = { mode: 'room', room: i, t0: performance.now() }; HINT = null; hud(); selected = sel; renderPanel(); tut('room', i); window.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' }); }
  $('back').onclick = () => { SFX.tap(); view = { mode: 'base', room: null, t0: 0 }; selected = null; hud(); tut('back'); };

  // ---------- directed help: Mission Control looks at YOUR base and points at what matters ----------
  let HINT = null, hintSeen = {}, hintTok = 0;
  const sel = q => () => document.querySelector(q);
  function upcoming(s) { const days = s.world === 'moon' ? s.M.dark : Object.keys(s.M.dust).map(Number); const fut = days.filter(d => d >= s.day); return fut.length ? { start: fut[0], len: fut.length } : null; }
  function hints() {
    const s = S, p = PREV || step(s), H = [], moon = s.world === 'moon', c = CMD(), free = s.jobs.filter(j => !j).length;
    const onBulb = ['gh', 'lab', 'maker'].find(k => (k === 'lab' ? s.sw.lab && !s.sw.save : s.sw[k]));
    const fixer = onBulb ? { t: sel(`.bulb[data-sw="${onBulb}"]`), what: 'switch off ' + { gh: 'the greenhouse 💡', lab: 'the lab 💡', maker: 'the air maker 💡' }[onBulb] }
      : !s.sw.save ? { t: sel('.room[data-i="5"]'), what: 'turn on power-save in the 🔋 BATTERY room' } : null;
    if (s.broken) H.push({ id: 'broken', pr: 10, t: sel('.room[data-i="4"]'), text: `${c}, the water recycler is broken! Tap the 💨 AIR MAKER and send someone to fix it.` });
    if (fixer && p.net < 0 && s.batt + p.net < 0) H.push({ id: 'empty' + s.day, pr: 10, t: fixer.t, text: `${c}, the battery runs out TONIGHT! Quick: ${fixer.what}.` });
    const up = upcoming(s);
    if (up) { const ahead = up.start - s.day, proj = Math.min(s.cap, s.batt + Math.max(0, p.net) * ahead);
      const need = moon ? up.len * p.use : Math.max(0, up.len * (p.use - N.mars.kiloKWh - N.mars.arrays * N.mars.arrayKWh * 0.3));
      if (fixer && proj < need) H.push({ id: 'dark' + s.day, pr: 9, t: fixer.t, text: `${c}, ${moon ? 'night' : 'the dust storm'} ${ahead <= 0 ? 'is here' : `starts in ${ahead} ${s.unit}${ahead > 1 ? 's' : ''}`} and lasts ${up.len}. Your battery won't make it like this: ${fixer.what}.` }); }
    const storm = s.events.find(e => !e.done && isStorm(e));
    if (s.M.food && s.M.cargo && s.day < s.M.cargo.day && !s.sw.ration && s.food < N.foodUse * (s.M.cargo.day - s.day)) H.push({ id: 'food', pr: 9, t: sel('.room[data-i="2"]'), text: `${c}, the food will run out before the ship lands on ${s.unit} ${s.M.cargo.day}. Tap the 🌱 GREENHOUSE and switch to small meals.` });
    if (s.M.food && s.M.cargo && s.day >= s.M.cargo.day && s.sw.ration) H.push({ id: 'feast', pr: 8, t: sel('.room[data-i="2"]'), text: `${c}, the ship landed with plenty of food! Tap the 🌱 GREENHOUSE and switch small meals off.` });
    if (storm && storm.day - s.day <= 1 && s.shelter < RU.safeSoilCm && !s.jobs.includes('regolith')) H.push({ id: 'storm' + s.day, pr: 8, t: sel('.room[data-i="0"]'), text: `${c}, a solar storm is coming! Thicken the shelter: tap the 🚪 AIRLOCK and add moon soil.` });
    if (!moon && s.clean < 0.9 && !s.jobs.includes('clean')) H.push({ id: 'dusty', pr: 7, t: sel('.room[data-i="0"]'), text: `${c}, your solar panels are dusty. Tap the 🚪 AIRLOCK and send someone to clean them.` });
    if (s.jobs.includes('lab') && !(s.sw.lab && !s.sw.save)) H.push({ id: 'labdark', pr: 7, t: sel('.bulb[data-sw="lab"]'), text: `${c}, your scientist is in a dark lab! Turn on the lab 💡 (or no ⭐).` });
    if (s.M.life && p.o2Net < 0 && !s.sw.maker && s.o2 / -p.o2Net < 6) H.push({ id: 'air', pr: 8, t: sel('.bulb[data-sw="maker"]'), text: `${c}, the air is running low. Turn the air maker 💡 back on.` });
    if (s.tired >= RU.tiredAt - 1 && !s.jobs.includes('rest')) H.push({ id: 'tired', pr: 5, t: sel('.room[data-i="3"]'), text: `${c}, your crew is getting tired. Let someone rest in the 🛡️ SHELTER.` });
    if (s.sw.gh && s.day - s.lastTend >= RU.tendEvery - 1 && !s.jobs.includes('tend')) H.push({ id: 'plants', pr: 4, t: sel('.room[data-i="2"]'), text: `${c}, the plants need a gardener soon. Tap the 🌱 GREENHOUSE.` });
    if (free >= 2 && !s.jobs.includes('trip')) H.push({ id: 'trip', pr: 3, t: sel('.room[data-i="0"]'), text: `${c}, you have ${free} free astronauts. A science trip from the 🚪 AIRLOCK earns ⭐⭐!` });
    else if (free >= 1) H.push({ id: 'free', pr: 2, t: sel(`.crew[data-k="${s.jobs.indexOf(null)}"]`), text: `${c}, ${crewName(s.jobs.indexOf(null))} has no job yet. Tap them, then a room.` });
    H.push({ id: 'ok', pr: 0, t: sel('#end'), text: `Everything looks good, ${c}! Press End ${s.unit}.` });
    return H.sort((a, b) => b.pr - a.pr);
  }
  function showHint(h) { if (TUT) return; HINT = h; SUMMARY = null; $('coachmore').hidden = true; document.querySelectorAll('.target').forEach(e => e.classList.remove('target'));
    $('coachtxt').innerHTML = h.text; $('coachbtn').textContent = 'Got it'; $('coachbtn').className = ''; $('coach').classList.add('show');
    const tok = ++hintTok; setTimeout(() => { if (tok !== hintTok || HINT !== h) return; const t = h.t(); if (t) t.classList.add('target'); }, 40); }
  function hideCoach() { hush(); HINT = null; SUMMARY = null; $('coachmore').hidden = true; $('coach').classList.remove('show'); document.querySelectorAll('.target').forEach(e => e.classList.remove('target')); }
  $('help').onclick = () => { SFX.tap(); if (view.mode === 'room') { view = { mode: 'base', room: null, t0: 0 }; selected = null; } HINT = null; hud(); showHint(hints()[0]); };
  function autoHint() { if (TUT) return; const h = hints()[0]; if (h.pr >= 8 && !hintSeen[h.id]) { hintSeen[h.id] = 1; showHint(h); } }
  $('coachbtn').onclick = () => { if (TUT) { TUT = null; store.set('jamt-tut', '1'); tutShow(); return; } const wasSummary = !!SUMMARY; hideCoach(); if (wasSummary) autoHint(); };
  $('coachmore').onclick = () => { if (SUMMARY) report(SUMMARY); };
  function showSummary(r) { // the day's result, said by Mission Control inside the scene
    if (!r) return; HINT = null; SUMMARY = r; document.querySelectorAll('.target').forEach(e => e.classList.remove('target'));
    $('coachtxt').innerHTML = r.speech; $('coachbtn').textContent = 'OK'; $('coachbtn').className = ''; $('coachmore').hidden = !r.math.length; $('coach').classList.add('show'); }

  // ---------- popups with Mission Control ----------
  const mcSay = html => `<div class="mc"><span class="aiwrap"><img src="${MCIMG}" data-mc alt="${mcLabel()}"><i class="aitag">AI</i></span><div class="bubble"><div class="mcname">${mcLabel()}</div>${html}</div><button class="read" aria-label="Read this aloud">🔊</button></div>`;
  let timerId = null;
  function popup(html) { clearTimer(); hush(); $('popcard').classList.remove('mgcard', 'moon', 'mars'); $('popcard').innerHTML = html; $('pop').classList.add('show'); $('popcard').querySelectorAll('[data-close]').forEach(b => b.onclick = closeAll); bindWords($('popcard'));
    bindRead($('popcard'));
    const b = $('popcard').querySelector('button.primary') || $('popcard').querySelector('input') || $('popcard').querySelector('button'); if (b) b.focus(); }
  function closeAll() { clearTimer(); hush(); $('pop').classList.remove('show'); }
  function clearTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }
  function countdown(secs, onTimeout) { // a visible clock for urgent decisions; can be switched off in settings
    if (!TIMERS) return; const bar = $('popcard').querySelector('.timer i'), txt = $('popcard').querySelector('.timertxt'); if (!bar) return; let t0 = performance.now(), lastTick = 99;
    timerId = setInterval(() => { if (HOLD) { t0 += 100; return; } const left = secs - (performance.now() - t0) / 1000; bar.style.width = Math.max(0, left / secs * 100) + '%'; if (txt) { const n = txt.querySelector('b'), v = String(Math.ceil(Math.max(0, left))); if (n && n.textContent !== v) n.textContent = v; } // only the number changes, so the ⏱ icon stays put
      if (left <= 5 && Math.ceil(left) < lastTick) { lastTick = Math.ceil(left); SFX.tick(); } if (left <= 0) { clearTimer(); onTimeout(); } }, 100); }
  $('pop').onclick = e => { if (e.target.id === 'pop' && !$('popcard').querySelector('[data-must]')) closeAll(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('popcard').querySelector('[data-must]')) closeAll(); });
  const choice = (i, e, t, sub) => `<button class="big" data-c="${i}"><span class="e">${e}</span><span>${'ABC'[i]}. ${t}<small>${sub}</small></span></button>`;
  const timerBox = () => TIMERS ? `<div class="timer"><i></i></div><div class="timertxt">⏱ <b></b> s to decide</div>` : '';

  const srcLine = src => src ? `<div class="src"><span class="tag2 real">${src.tag}</span>${src.text}</div>` : '';
  const eventVars = () => ({ cmd: CMD(), unit: S.unit, cargoDay: S.M.cargo ? S.M.cargo.day : '', foodDays: Math.floor(Math.max(0, S.food) / N.foodUse), sun: sunWord, sunSize: sunWord === 'STORMY' ? RU.sun.STORMY.size.toUpperCase() : RU.sun[sunWord].size,
    robotKWh: N.robotKWh, soilPerRobot: RU.soilPerRobot, dusty: r0(RU.dustyAfter * 100), flare: BIGFLARE || 'none this week',
    delay: (() => { const lt = LightTime.earthMarsLightTime(new Date()); return `${Math.floor(lt.seconds / 60)} min ${r0(lt.seconds % 60)} s`; })() });
  function eventPopup() { // shows today's decision, whatever it is: the text and the effects are in data/missions.js → events
    const ev = evToday(S); if (!ev || ev.choice !== null) return false;
    const E = EVENTS[ev.kind], v = eventVars();
    popup(`<h2>${E.title}</h2>${mcSay(fmt(E.say, v))}${E.timer ? timerBox() : ''}<div class="tip"></div>
      ${E.choices.map((c, i) => choice(i, c.icon, fmt(c.label, v), fmt(c.sub, v))).join('')}${srcLine(E.src)}<span data-must></span>`);
    const apply = i => { SIM.choose(S, ev, i); SFX.go(); closeAll(); hud(); setTimeout(autoHint, 300); };
    $('popcard').querySelectorAll('[data-c]').forEach(b => b.onclick = () => apply(+b.dataset.c));
    if (E.timer) countdown(E.timer, () => { FLOAT.push({ txt: '⏱ Time is up!', x: 192, y: 150, col: '#ff7a3c', t0: performance.now() }); apply(E.ifIgnored); });
    SFX.alarm(); return true;
  }
  function brokenPopup() {
    const moon = S.world === 'moon', c = CMD();
    popup(`<h2>💥 The water recycler broke!</h2>${mcSay(`${c}, without it you lose ${r0(N.waterBroken)} kg of water every ${S.unit}. What do you do?`)}
      ${S.spares > 0 ? `<button class="big" data-b="spare"><span class="e">🧰</span><span>Use the spare part<small>fixed right now · then no spare left</small></span></button>` : ''}
      <button class="big" data-b="earth"><span class="e">📡</span><span>Ask Earth how to fix it<small>${moon ? 'answer in 1.3 seconds' : 'radio to Mars is slow: you will wait'} · then 1 astronaut fixes it</small></span></button>
      <button class="big" data-b="self"><span class="e">🔧</span><span>Figure it out ourselves<small>an astronaut needs 2 ${S.unit}s</small></span></button><span data-must></span>`);
    $('popcard').querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const v = b.dataset.b; closeAll();
      if (v === 'spare') { SIM.useSpare(S); SFX.win(); popup(`${mcSay(`🧰 Nice, ${c}! The spare part fixed it. You have no spare left now.`)}<button class="big primary" data-close>OK</button>`); }
      if (v === 'earth') radio(true);
      if (v === 'self') { popup(`${mcSay(`OK ${c}: send an astronaut to the 💨 AIR MAKER for 2 ${S.unit}s.`)}<button class="big primary" data-close>OK</button>`); $('popcard').querySelector('[data-close]').onclick = () => { closeAll(); showHint(hints()[0]); }; }
      hud(); });
    SFX.alarm();
  }
  function radio(forFix) {
    const moon = S.world === 'moon', lt = moon ? null : LightTime.earthMarsLightTime(new Date()), secs = moon ? 1.3 : Math.round(lt.seconds * 2 / 60), tip = hints()[0].text;
    popup(`<h2>📡 ${mcLabel()}</h2>${moon ? '<p>The Moon is 384,400 km away. Radio takes <b>1.3 seconds</b>.</p>' : `<p>Today Mars is <b>${(lt.km / 1e6).toFixed(0)} million km</b> away. Radio takes <b>${Math.floor(lt.seconds / 60)} min ${r0(lt.seconds % 60)} s</b> each way.</p>`}
      <div class="wave"><i id="sig" style="left:${moon ? 0 : 'calc(100% - 16px)'}"></i></div><div id="ans">${moon ? '' : `<p>📤 Question sent… the answer takes ${secs} minutes (${secs} seconds here). The base doesn’t wait!</p>`}</div>
      <div class="src"><span class="tag2 calc">${moon ? 'REAL DELAY' : 'CALCULATED TODAY'}</span>${moon ? 'Earth–Moon distance ÷ speed of light.' : 'From NASA JPL planet orbits. 1 real minute = 1 second here.'}</div><button class="big primary" data-close>OK</button>`);
    const done = () => { if (forFix) SIM.earthHelp(S); const a = $('ans'); if (a) a.innerHTML = mcSay(`<b>Answer:</b> ${forFix ? `Do steps 1 to 5 on the screen, ${CMD()}. One astronaut can fix it in 1 ${S.unit}.` : tip}`); if (a) bindRead(a); SFX.go(); };
    if (moon) return setTimeout(done, 1300);
    const t0 = performance.now();
    (function anim(now) { const k = Math.min(1, (now - t0) / 1000 / secs), x = k < .5 ? 1 - k * 2 : (k - .5) * 2, sg = $('sig'); if (sg) sg.style.left = `calc(${(x * 100).toFixed(1)}% - ${(x * 16).toFixed(1)}px)`;
      if (k < 1) requestAnimationFrame(anim); else { done(); if (forFix) FLOAT.push({ txt: '📡 Earth answered!', x: 192, y: 150, col: '#F0E442', t0: performance.now() }); } })(t0);
  }
  $('radio').onclick = () => { SFX.tap(); radio(false); };

  // ---------- real NASA data screen (for kids, parents and judges). Names and the list come from data/sources.js ----------
  const STATUS_TAG = { LIVE: 'live', ARCHIVED: 'arch', CALCULATED: 'calc', PUBLISHED: 'real' }, FEED_STATUS = {};
  const srcStatus = (id, x) => x.kind === 'live' ? (FEED_STATUS[id] || 'ARCHIVED') : x.kind.toUpperCase(); // a live source says LIVE only if it was fetched just now
  $('data').onclick = () => { SFX.tap();
    const lt = LightTime.earthMarsLightTime(new Date()), SRC = DATA.sources;
    popup(`<h2>📚 Real NASA data in this game</h2>
      <h3>☀️ The Sun today</h3>${sunInfo || 'Checking with NASA…'}
      <h3>📡 Radio to Mars, today</h3><p>Mars is ${(lt.km / 1e6).toFixed(0)} million km away, so radio takes ${Math.floor(lt.seconds / 60)} min ${r0(lt.seconds % 60)} s each way.</p>${(() => { const ms = LightTime.marsSun(new Date()); return `<p>Mars is ${ms.au.toFixed(2)} times as far from the Sun as Earth is, so its sunshine today is ${r0(ms.factor * 100)} % of its average: that sets the power of your Mars solar panels.</p>`; })()}<div class="src"><span class="tag2 calc">CALCULATED TODAY</span>${SRC.jpl_planets.name}.</div>
      <h3>☢️ A real solar storm: May 2024</h3><canvas class="chart" id="chart" width="240" height="96" role="img" aria-label="Radiation per day in May 2024: deep space up to about 57 times a normal day, Mars surface about 17 times."></canvas>
      <div class="legend"><span><i style="background:#CC79A7"></i>Deep space (BioSentinel)</span><span><i style="background:#E69F00"></i>Mars surface (Curiosity)</span><span><i style="background:#56B4E9"></i>a normal day</span></div>
      <div class="src"><span class="tag2 real">REAL DATA</span>NASA OSDR RadLab: BioSentinel BPD and Curiosity RAD, absorbed dose per day. NASA DONKI: 21 big (X) flares that month.</div>
      <h3>🪫 A real dust storm: Opportunity, 2018</h3><p>NASA's Opportunity rover made 645 watt-hours a sol before the storm, then only 22. It never woke up.</p>
      <h3>🔢 Every other number</h3><p>Air, water, food, power and radiation numbers come from NASA studies. Numbers we had to invent are marked “game rule”.</p>
      ${T.places ? `<h3>📍 Where your bases are</h3>${Object.keys(T.places).map(wd => `<p><b>${wd === 'moon' ? '🌙' : '🔴'} ${esc(T.places[wd].name)}</b></p>${placeHtml(wd)}`).join('')}` : ''}
      <h3>🗂️ Where everything comes from</h3>${Object.entries(SRC).filter(([, x]) => x.inGame !== false).map(([id, x]) => { const st = srcStatus(id, x); return `<p><span class="tag2 ${STATUS_TAG[st]}">${st}</span><b>${x.name}</b>${x.official ? ' <span class="tag2 rule">CHALLENGE RESOURCE</span>' : ''}<br>${x.usedFor}</p>`; }).join('')}
      <div class="tip"></div><button class="big primary" data-close>OK</button>`);
    const c = $('chart'), g = c.getContext('2d'), bio = SNAP.may2024.biosentinelDailyUGy, cur = SNAP.may2024.curiosityDailyUGy, max = 9200, y = v => 90 - Math.round(v / max * 84);
    g.fillStyle = '#05070d'; g.fillRect(0, 0, 240, 96); bio.forEach(([, v], i) => { g.fillStyle = '#CC79A7'; g.fillRect(4 + i * 12, y(v), 9, 90 - y(v)); });
    cur.forEach(([, v], i) => { g.fillStyle = '#E69F00'; g.fillRect(108 + i * 11, y(v), 8, 90 - y(v)); }); g.fillStyle = '#56B4E9'; g.fillRect(0, y(160), 104, 1); g.fillRect(104, y(100), 136, 1); };

  // ---------- end of day ----------
  function report(r) {
    let math = false;
    const render = () => { popup(`<h2>${r.title}</h2>${r.say.slice(0, 4).map(x => `<p>${x}</p>`).join('')}${r.math.length ? `<button class="link" id="mt">${math ? 'Hide' : 'Show'} the math</button>${math ? `<div class="math">${r.math.map(x => `<div>${x}</div>`).join('')}</div>` : ''}` : ''}<button class="big primary">OK</button>`);
      $('popcard').querySelector('.big.primary').onclick = () => { closeAll(); }; const mt = $('mt'); if (mt) mt.onclick = () => { math = !math; render(); }; };
    render();
  }
  function afterReport() { if (eventPopup()) return; if (S.broken && !S._askedBroken) { S._askedBroken = true; brokenPopup(); return; } autoHint(); }
  function endDay(silent) {
    const ev = evToday(S); if (ev && ev.choice === null) { eventPopup(); return false; }
    if (S.broken && !S._askedBroken) { S._askedBroken = true; brokenPopup(); return false; }
    hideCoach();
    const before = S.day, wasBroken = S.broken, asked = S._askedBroken, prevJobs = S.jobs.slice(), r = step(S); S = r.s; S._askedBroken = asked;
    const now = performance.now();
    if (!silent) { view = { mode: 'base', room: null, t0: 0 }; selected = null;
      FX = { kind: r.storm ? 'storm' : 'night', t0: now, dur: r.storm ? 1800 : 900 };
      FLOAT.push({ txt: `⚡ ${r.net >= 0 ? '+' : ''}${r0(r.net)}`, x: 320, y: 312, col: r.net >= 0 ? '#F0E442' : '#ff7a3c', t0: now + 600 });
      if (r.stars) FLOAT.push({ txt: `+${r.stars} ⭐`, x: 64, y: 232, col: '#F0E442', t0: now + 700 });
      if (S.M.life && r.o2Net) FLOAT.push({ txt: `💨 ${r.o2Net >= 0 ? '+' : ''}${r1(r.o2Net)} kg`, x: 192, y: 312, col: r.o2Net >= 0 ? '#56B4E9' : '#ff7a3c', t0: now + 800 });
      if (r.storm) FLOAT.push({ txt: `☢️ +${r0(r.storm)} mSv`, x: 64, y: 312, col: '#CC79A7', t0: now + 900 });
      if (r.stars) setTimeout(SFX.star, 800); }
    if (r.end) { setTimeout(() => finish(r.end), silent ? 0 : 1100); return false; }
    if (!wasBroken && S.broken) { S._askedBroken = false; SFX.alarm(); }
    hud(); tut('end');
    if (!silent) { const delay = r.storm ? 1800 : 1000; dayResult(r, before, prevJobs, now + delay);
      setTimeout(() => { showSummary(SUMMARY_NEXT); if (evToday(S) || (S.broken && !S._askedBroken)) setTimeout(afterReport, 1400); }, delay); }
    return r;
  }
  function dayResult(r, before, prevJobs, t0) {
    const harvest = r.say.some(x => /harvest/.test(x)), lowBatt = S.batt < S.cap * .25, c = CMD();
    MOODS = {}; prevJobs.forEach((j, k) => { let e = lowBatt ? '😰' : r.storm ? '😮' : '🙂', hop = false;
      if (j === 'trip') { e = r.stars ? '⭐' : '🚀'; hop = !!r.stars; } if (j === 'lab') e = r.say.some(x => /lab was dark/.test(x)) ? '😕' : '🔬'; if (j === 'tend') { e = harvest ? '🥬' : '🌱'; hop = harvest; }
      if (j === 'fix') e = '🔧'; if (j === 'rest') e = '😴'; if (j === 'regolith') e = '🛡️'; if (j === 'clean') e = '🧽'; MOODS[k] = { e, hop, t0 }; });
    const bits = [`⚡ ${r.net >= 0 ? '+' : ''}${r0(r.net)}`]; if (r.stars) bits.push(`⭐ +${r.stars}`); if (S.M.life) bits.push(`💨 ${r.o2Net >= 0 ? '+' : ''}${r1(r.o2Net)}`); if (r.storm) bits.push(`☢️ +${r0(r.storm)}`);
    BANNER = { t0, title: `${S.unit === 'day' ? 'DAY' : 'SOL'} ${before} DONE`, line: bits.join('   ') };
    const notes = r.say.filter(x => !/^(🔋|🪫|⭐)/.test(x)).slice(0, 2);
    const mood = r.net < 0 && lowBatt ? `Careful, ${c}!` : r.stars ? `Nice work, ${c}!` : `${S.unit === 'day' ? 'Day' : 'Sol'} done, ${c}.`;
    const batt = r.net >= 0 ? `The battery went up ${r0(r.net)} kWh.` : `The battery went down ${r0(-r.net)} kWh.`;
    SUMMARY_NEXT = { title: `${S.unit === 'day' ? 'Day' : 'Sol'} ${before} report`, say: r.say, math: r.math,
      speech: `${mood} ${r.stars ? `You found ⭐ ${r.stars}. ` : ''}${batt}${notes.length ? '<br>' + notes.join('<br>') : ''}` };
  }
  $('end').onclick = () => { SFX.tap(); endDay(false); };
  $('skip').onclick = () => { SFX.tap(); let n = 0; const said = [];
    while (n < 6) { if (evToday(S)) break; if (n > 0 && (S.M.dark.includes(S.day) || S.M.dust[S.day] !== undefined || S.broken)) break;
      const r = endDay(true); if (!r) return; n++; said.push(...r.say.filter(x => !/^(🔋|🪫)/.test(x))); if (S.batt < S.cap * .25) break; }
    view = { mode: 'base', room: null, t0: 0 }; FX = { kind: 'night', t0: performance.now(), dur: 900 }; hud();
    if (n) { BANNER = { t0: performance.now() + 900, title: `SKIPPED ${n} ${S.unit.toUpperCase()}${n > 1 ? 'S' : ''}`, line: `🔋 ${r0(Math.max(0, S.batt))} kWh   ⭐ ${S.stars}` };
      setTimeout(() => { showSummary({ title: 'Skipped', say: said, math: [], speech: `${n} quiet ${S.unit}${n > 1 ? 's' : ''} went by, ${CMD()}.${said.length ? '<br>' + said.slice(-2).join('<br>') : ''}` }); if (evToday(S) || (S.broken && !S._askedBroken)) setTimeout(afterReport, 1400); }, 900); }
    else afterReport(); };

  function finish(end) {
    hideCoach(); const H = S.hist, moon = S.world === 'moon', c = CMD(); let title, why = '', tryThis = '', disc = '';
    if (end === 'done') { title = S.stars >= S.goal ? `🎉 Mission complete, ${c}!` : `✅ Mission complete, ${c}!`; why = `Your crew is safe and found ${S.stars} of ${S.goal} ⭐.${S.stars >= S.goal ? ' Great engineering!' : ' Next time, try more science when the battery allows.'}`; SFX.win(); FX = { kind: 'confetti', t0: performance.now(), dur: 2500 }; }
    else { title = moon ? '⏸️ Mission paused: the crew heads home safely' : '⏸️ Mission paused: the base needs help'; SFX.lose();
      if (end === 'power') { let k = H.length - 1; while (k > 0 && H[k - 1].net < 0) k--; const st = H[k], dim = st.light < .9;
        const on = ['gh', 'lab', 'maker'].filter(x => st.sw[x]).map(x => ({ gh: 'the greenhouse', lab: 'the lab', maker: 'the air maker' }[x]));
        why = `${c}, the battery ran out on ${S.unit} ${H[H.length - 1].day}. It started on ${S.unit} ${st.day}: ${dim ? (moon ? 'no sun, and ' : 'dust hid the sun, and ') : 'you used more power than you made, and '}${on.length ? on.join(' and ') : 'the base'} kept using power.`;
        tryThis = dim ? `Look at the forecast ☀️🌑. Charge up before the ${moon ? 'dark' : 'storm'}, then tap the 💡 lights off and turn on ${w('save', 'power-save')} in the BATTERY room.` : 'Watch the ⚡ number. When it shows a minus, turn a light off.'; disc = 'darkness and dust drain batteries fast'; }
      if (end === 'storm') { const st = H[H.length - 1]; why = `${c}, the storm gave the crew about ${st.storm} mSv in one night: more than NASA allows in a month (${N.limit30}).`; tryThis = 'Hide in the shelter, or make it thicker with moon soil first.'; disc = 'a few centimeters of moon soil beat a solar storm'; }
      if (end === 'o2') { why = `${c}, the air tanks ran empty.`; tryThis = S.sw.save && !moon ? 'Power-save slows the air maker. Turn it off when the storm is over.' : 'Keep the air maker ON. Science trips use suit air.'; disc = 'every breath has to be made'; }
      if (end === 'water') { why = `${c}, the water ran out while the recycler was broken.`; tryThis = 'Fix it fast: use the spare, or ask Earth and send an astronaut.'; disc = 'spares and repairs keep you alive'; }
      if (end === 'food') { why = `${c}, the food ran out on ${S.unit} ${H[H.length - 1].day}, before the cargo ship landed.`; tryThis = 'Switch to small meals early, in the 🌱 GREENHOUSE, and keep the lettuce growing.'; disc = 'food has to be packed for the whole trip, or grown weeks ahead'; } }
    // a mission patch for a finished mission with enough science stars (the goal, X = MISSIONS[k].goal)
    // Any finished mission can be shared with its stars; only reaching the goal earns the patch for the collection.
    const key = S.key, code = S.code, done = end === 'done', won = done && S.stars >= S.goal, run = { key, stars: S.stars, goal: S.goal, code };
    const isNew = won ? earnPatch(run) : false; if (isNew) setTimeout(SFX.star, 900);
    const patch = won ? `<div class="patchwin"><span class="aiwrap"><img src="${patchSrc(key)}" alt="${esc(S.M.title)} mission patch"><i class="aitag">AI</i></span><div><b>🏅 ${isNew ? 'You earned a NEW mission patch!' : 'You earned this patch again!'}</b><small>It's saved in 🏅 My patches.</small></div></div>`
      : end === 'done' ? `<p>🏅 Get <b>${S.goal} ⭐</b> to earn the <i>${esc(S.M.title)}</i> mission patch!</p>` : '';
    const render = () => {
      popup(`<h2>${title}</h2>${mcSay(`<p style="margin:0">${why}</p>${tryThis ? `<p>💡 ${tryThis}</p>` : ''}`)}${patch}${disc ? `<p>🏅 Discovery: <i>${disc}</i></p>` : ''}<p>⭐ ${run.stars} stars · mission code <b>#${code}</b>. A friend can play this same mission: 🗺️ → 🔢 <i>Play a mission code</i>.</p><div class="tip"></div>
        ${done ? `<button class="big ${won ? 'primary' : ''}" id="share"><span class="e">📸</span><span>${won ? 'Share my mission patch' : `Share my ${run.stars} ⭐`}<small>make a picture to show family and friends</small></span></button>` : ''}
        <button class="big ${won ? '' : 'primary'}" id="again"><span class="e">🔁</span><span>Try this mission again<small>same code, same surprises</small></span></button>
        <button class="big" id="newm"><span class="e">🎲</span><span>New version of this mission<small>different days, different surprises</small></span></button>
        <button class="big" id="other"><span class="e">🗺️</span><span>Choose another mission</span></button><span data-must></span>`);
      $('again').onclick = () => start(key, code); $('newm').onclick = () => start(key); $('other').onclick = missionMenu;
      if (done) $('share').onclick = () => { SFX.tap(); sharePopup(run, render); };
    };
    render();
  }

  // ---------- mission patches: earned, collected and shared ----------
  let PATCHES = {}; try { PATCHES = JSON.parse(store.get('jamt-patches') || '{}') || {}; } catch (e) { PATCHES = {}; }
  function earnPatch(run) { // keeps the best run per mission; returns true the first time
    const old = PATCHES[run.key], isNew = !old; if (!old || run.stars > old.stars) PATCHES[run.key] = { stars: run.stars, goal: run.goal, code: run.code, date: new Date().toLocaleDateString('en-CA') };
    store.set('jamt-patches', JSON.stringify(PATCHES)); return isNew; }
  const SITE = ((T.site || {}).url || '').trim(); // data/text.js → site.url: where the game is published (empty until there is a domain)
  const MONO = 'ui-monospace, "Cascadia Mono", Consolas, Menlo, monospace';
  function drawCard(run, withName) { // 1080×1080 picture: pixel art scaled up, text drawn sharp
    const m = MISSIONS[run.key], moon = m.world === 'moon', c = document.createElement('canvas'); c.width = c.height = 1080;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const say = (t, x, y, size, col, weight = 800, font = MONO, outline = 0) => { let s = size; do { g.font = `${weight} ${s}px ${font}`; s -= 2; } while (g.measureText(t).width > 1000 && s > 16);
      const paint = (p, px) => { if (outline) { g.lineJoin = 'round'; g.lineWidth = outline; g.strokeStyle = '#000'; g.strokeText(p, px, y); } g.fillStyle = col; g.fillText(p, px, y); };
      if (window.JAMT_ICON && JAMT_ICON.hasIcon(t)) JAMT_ICON.draw(g, t, x, y, s + 2, paint); else paint(t, x); };
    g.fillStyle = '#0b1020'; g.fillRect(0, 0, 1080, 1080);
    if (IMG['bg_' + m.world]) g.drawImage(IMG['bg_' + m.world], -100, 0, 1280, 640);
    const fade = g.createLinearGradient(0, 360, 0, 640); fade.addColorStop(0, 'rgba(11,16,32,0)'); fade.addColorStop(1, '#0b1020'); g.fillStyle = fade; g.fillRect(0, 360, 1080, 281);
    g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, 1080, 72); say('JUNIOR ASTRONAUT MISSION TRAINER', 540, 48, 32, '#F0E442');
    g.fillStyle = 'rgba(240,228,66,.16)'; g.beginPath(); g.arc(540, 290, 214, 0, Math.PI * 2); g.fill();
    const earned = run.stars >= run.goal; // below the goal the patch is shown faded, as the next thing to earn
    if (IMG['patch_' + run.key]) { g.globalAlpha = earned ? 1 : 0.35; g.drawImage(IMG['patch_' + run.key], 348, 98, 384, 384); g.globalAlpha = 1; }
    if (!earned) say(`PATCH AT ${run.goal} ★`, 540, 300, 44, '#F0E442', 900, MONO, 10);
    [36, 166, 710, 840].forEach((x, k) => { if (SPR.face[k]) g.drawImage(SPR.face[k], x, 300, 204, 204); });
    say('★', 138, 318, 40, '#F0E442', 800, MONO, 6); // the player, as in the game
    say('MISSION COMPLETE!', 540, 586, 88, '#F0E442', 900, MONO, 12);
    say(`${m.title.toUpperCase()}  ·  ${moon ? 'THE MOON' : 'MARS'}`, 540, 660, 50, '#f4f6fb');
    let y = 730; if (withName) { say(`Commander ${NAME || 'Rookie'}`, 540, y, 46, '#56B4E9'); y += 76; }
    say(`★ ${run.stars} / ${run.goal} science stars`, 540, y, 50, '#F0E442'); y += 74;
    const words = `I learned: ${m.lesson}`.split(' '), lines = ['']; g.font = `600 36px system-ui, "Segoe UI", sans-serif`;
    words.forEach(wd => { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + wd : wd; if (g.measureText(t).width > 900) lines.push(wd); else lines[lines.length - 1] = t; });
    lines.slice(0, 2).forEach((t, i) => say(t, 540, y + i * 46, 36, '#aab4ca', 600, 'system-ui, "Segoe UI", sans-serif'));
    g.fillStyle = '#151c30'; g.fillRect(0, 942, 1080, 138); g.fillStyle = '#2c3a5c'; g.fillRect(0, 942, 1080, 4);
    say(SITE ? `Play my mission at ${SITE.replace(/^https?:\/\//, '').replace(/\/$/, '')} · “${m.title}” · code #${run.code}` : `Play my mission: “${m.title}” · code #${run.code}`, 540, 990, 34, '#F0E442', 800);
    say('Made with real NASA data: ' + CARD_SOURCES, 540, 1030, 26, '#f4f6fb', 700);
    say('Not an official NASA product', 540, 1064, 20, '#aab4ca', 600);
    if (!NOAI) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(1020, 90, 50, 28); say('AI', 1045, 110, 18, '#ffffff', 800); } // visible AI watermark (Space Apps rule; hidden only in private mode)
    return c;
  }
  function shareText(run) { const m = MISSIONS[run.key], url = SITE ? ` ${SITE}#${run.key}-${run.code}` : /^https?:$/.test(location.protocol) ? ` ${location.origin}${location.pathname}#${run.key}-${run.code}` : '';
    const where = m.world === 'moon' ? 'the Moon' : 'Mars', how = `Play the same mission: "${m.title}", code #${run.code}.`;
    return run.stars >= run.goal ? `I earned the "${m.title}" mission patch on ${where} with ${run.stars} science stars! 🚀 Can you do it too? ${how}${url}`
      : `I completed the "${m.title}" mission on ${where} with ${run.stars} science stars! 🚀 Can you beat me? ${how}${url}`; }
  function sharePopup(run, back) {
    let withName = store.get('jamt-sharename') === 'on', file = null, card = null;
    const fname = `mission-${run.key}-${run.code}.png`, tipSay = t => { const tp = $('shtip'); if (tp) { tp.textContent = t; tp.classList.add('show'); } };
    popup(`<h2>📸 ${run.stars >= run.goal ? 'Your mission patch' : `Your ${run.stars} ⭐ mission`}</h2><div class="sharewrap" id="sharewrap"></div>
      <label><input type="checkbox" id="shname" ${withName ? 'checked' : ''}> Put my name on the picture</label>
      <p class="grown">👪 Ask a parent or teacher before you post anything online.</p>
      <button class="big primary" id="shgo" hidden><span class="e">📤</span><span>Share the picture<small>pick an app to send it</small></span></button>
      <button class="big" id="shsave"><span class="e">💾</span><span>Save the picture<small>${fname}</small></span></button>
      <button class="big" id="shcopy"><span class="e">📋</span><span>Copy a message to go with it</span></button>
      <div class="tip" id="shtip"></div><button class="big" id="shback"><span class="e">⬅</span><span>Back</span></button>`);
    const build = () => { card = drawCard(run, withName); $('sharewrap').replaceChildren(card); file = null; $('shgo').hidden = true;
      card.setAttribute('role', 'img'); card.setAttribute('aria-label', `Mission complete picture: ${MISSIONS[run.key].title}, ${run.stars} stars`);
      const mine = card;
      try { card.toBlob(b => { const go = $('shgo'), sv = $('shsave'); if (!b || !go || !sv || card !== mine) return; // the player may have left this screen, or changed the picture, before it was ready
        file = new File([b], fname, { type: 'image/png' });
        try { go.hidden = !(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { go.hidden = true; }
        sv.classList.toggle('primary', go.hidden); }, 'image/png'); } catch (e) { file = null; } };
    build();
    $('shname').onchange = () => { withName = $('shname').checked; store.set('jamt-sharename', withName ? 'on' : 'off'); build(); };
    $('shgo').onclick = async () => { if (!file) return; SFX.tap();
      try { await navigator.share({ files: [file], title: 'Mission complete!', text: shareText(run) }); tipSay('🚀 Sent!'); } catch (e) { if (e && e.name !== 'AbortError') tipSay('Sharing did not work here. Try “Save the picture”.'); } };
    $('shsave').onclick = () => { SFX.tap();
      if (!file) return tipSay('This picture can’t be saved when the game runs from a file. Open the game from its web address, or take a screenshot.');
      const a = document.createElement('a'), u = URL.createObjectURL(file); a.href = u; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      tipSay('💾 Saved! Look in your Downloads folder.'); };
    $('shcopy').onclick = async () => { SFX.tap(); const t = shareText(run);
      try { await navigator.clipboard.writeText(t); tipSay('📋 Copied: ' + t); } catch (e) { tipSay('Copy this: ' + t); } };
    $('shback').onclick = () => { SFX.tap(); back(); };
  }
  function patchBook() {
    const ks = Object.keys(MISSIONS), got = ks.filter(k => PATCHES[k]).length;
    popup(`<h2>🏅 My mission patches · ${got} of ${ks.length}</h2><p>Reach a mission’s ⭐ goal to earn its patch.</p><div class="book">${ks.map(k => { const m = MISSIONS[k], p = PATCHES[k];
      return `<button class="${p ? 'got' : 'locked'}" data-p="${k}"><span class="aiwrap"><img src="${patchSrc(k)}" alt=""><i class="aitag">AI</i></span><b>${m.world === 'moon' ? '🌙' : '🔴'} ${m.title}</b><small>${p ? `Best: ⭐ ${p.stars} · tap to share` : `Get ${m.goal} ⭐ · tap to play`}</small></button>`; }).join('')}</div>
      <button class="big" id="pbback"><span class="e">⬅</span><span>Back to missions</span></button><span data-must></span>`);
    $('popcard').querySelectorAll('[data-p]').forEach(b => b.onclick = () => { const k = b.dataset.p; SFX.tap(); if (PATCHES[k]) sharePopup({ key: k, ...PATCHES[k] }, patchBook); else start(k); });
    $('pbback').onclick = () => { SFX.tap(); missionMenu(); };
  }

  // ---------- tutorial (first Moon mission, about 60 s) ----------
  let TUT = null, tutTok = 0;
  const TSTEPS = [
    { on: 'crew', text: n => `👇 Hi ${n}! You are the astronaut with the ★. Tap <b>yourself</b>!`, target: () => document.querySelector('.crew[data-k="0"]') },
    { on: 'room', text: () => 'Now tap the 🚪 <b>AIRLOCK</b> room. It’s the door to outside.', target: () => document.querySelector('.room[data-i="0"]') },
    { on: 'assign', text: () => 'Tap 🚀 <b>Science trip</b>. Two astronauts go out together and find ⭐⭐.', target: () => document.querySelector('[data-a="job:trip"]') },
    { on: 'back', text: () => 'See 🌑 in the forecast? Night is coming! Tap <b>⬅ Base</b>.', target: () => $('back') },
    { on: 'switch', text: () => 'Each 💡 uses power. Tap the greenhouse 💡 to switch it off and save the battery.', target: () => document.querySelector('.bulb[data-sw="gh"]') },
    { on: 'end', text: () => 'Great! Press <b>End day</b>. Stuck later? Tap the yellow ❓ and I’ll point the way.', target: () => $('end') },
  ];
  function tutShow() { document.querySelectorAll('.target').forEach(e => e.classList.remove('target')); if (!TUT) { if (!HINT) $('coach').classList.remove('show'); return; }
    const st = TSTEPS[TUT.i], tok = ++tutTok; $('coachtxt').innerHTML = st.text(CMD()); $('coachbtn').textContent = 'skip'; $('coachbtn').className = 'skip'; $('coach').classList.add('show');
    setTimeout(() => { if (tok !== tutTok) return; document.querySelectorAll('.target').forEach(e => e.classList.remove('target')); const t = st.target(); if (t) t.classList.add('target'); }, 30); }
  function tut(ev, arg) { if (!TUT) return; const st = TSTEPS[TUT.i]; if (ev !== st.on || (ev === 'room' && arg !== 0)) { tutShow(); return; }
    TUT.i += 1; if (TUT.i >= TSTEPS.length) { TUT = null; store.set('jamt-tut', '1'); } tutShow(); }

  // ---------- name, missions and settings ----------
  function welcome(then) {
    popup(`<h2>👩‍🚀 Welcome to your base!</h2>${mcSay(`${MCNAME ? `Hi! I'm ${esc(MCNAME)}, from Mission Control.` : "Hi! I'm Mission Control."} I'll help you run a base on the Moon or Mars. What should I call you, Commander?`)}
      <input type="text" id="nm" maxlength="14" placeholder="Your first name or a nickname" autocomplete="off" aria-label="Your name" value="${esc(NAME)}">
      <div class="src">🔒 Your name stays on this device. We never send it anywhere.</div>
      <p class="mgq" style="text-align:left">Your commander is a…</p><div class="gender" role="radiogroup" aria-label="Your commander is a woman or a man">
        <button class="big ${GENDER !== 'man' ? 'on' : ''}" data-g="woman" role="radio" aria-checked="${GENDER !== 'man'}"><span class="e">👩‍🚀</span><span>Woman</span></button>
        <button class="big ${GENDER === 'man' ? 'on' : ''}" data-g="man" role="radio" aria-checked="${GENDER === 'man'}"><span class="e">👨‍🚀</span><span>Man</span></button></div>
      <p class="src" id="crewline"></p>
      <label><input type="checkbox" id="tm" ${TIMERS ? 'checked' : ''}> ⏱ Quick-decision timers (turn off for more time)</label>
      <label><input type="checkbox" id="snd" ${muted ? '' : 'checked'}> 🔊 Sounds</label>
      <label><input type="checkbox" id="mus" ${musicOn ? 'checked' : ''}> 🎵 Music</label>
      <button class="big primary" id="go"><span class="e">🚀</span><span>Let's go!</span></button><span data-must></span>`);
    const go = () => { const v = $('nm').value.replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 14); NAME = v || COMMANDER.name || 'Rookie'; TIMERS = $('tm').checked; muted = !$('snd').checked;
      store.set('jamt-name', v === COMMANDER.name ? '' : v); store.set('jamt-welcomed', '1'); store.set('jamt-timers', TIMERS ? 'on' : 'off'); store.set('jamt-mute', muted ? '1' : '0');
      musicOn = $('mus').checked; store.set('jamt-music', musicOn ? 'on' : 'off'); heard = true; music();
      GENDER = pick; store.set('jamt-gender', GENDER); setCrew(); buildIndoor(); if (S) hud(); SFX.go(); then(); };
    let pick = GENDER === 'man' ? 'man' : 'woman';
    const showCrew = () => { const g = GENDER; GENDER = pick; setCrew(); $('crewline').textContent = `Your crew: you, ${CREW[1].name}, ${CREW[2].name} and ${CREW[3].name}.`; GENDER = g; setCrew(); };
    $('popcard').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { pick = b.dataset.g; SFX.tap();
      $('popcard').querySelectorAll('[data-g]').forEach(x => { const on = x.dataset.g === pick; x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); }); showCrew(); });
    showCrew();
    $('go').onclick = go; $('nm').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  const tune = id => { if (window.JAMT_MUSIC) JAMT_MUSIC.song(id); }; // js/music.js: a song for the menu, one per mission
  function missionMenu() { tune('menu');
    popup(`<h2>🚀 Choose a mission, ${CMD()}</h2><p>Each mission teaches one real problem astronauts face.</p><div class="missions">${Object.entries(MISSIONS).map(([k, m]) =>
      `<button class="mission" data-k="${k}"><img src="${ART}bg/${m.world}.png" alt=""><i class="aitag">AI</i>${PATCHES[k] ? `<img class="pt" src="${patchSrc(k)}" alt="patch earned">` : ''}<div><b>${m.world === 'moon' ? '🌙' : '🔴'} ${m.title}</b><small>${m.teach}${PATCHES[k] ? ` · 🏅 best ⭐ ${PATCHES[k].stars}` : ''}</small></div></button>`).join('')}</div>
      <button class="big" id="book"><span class="e">🏅</span><span>My mission patches<small>${Object.keys(PATCHES).filter(k => MISSIONS[k]).length} of ${Object.keys(MISSIONS).length} earned</small></span></button>
      <button class="big" id="playcode"><span class="e">🔢</span><span>Play a mission code<small>a friend's code gives the same days and the same surprises</small></span></button>
      <button class="big" id="settings"><span class="e">⚙️</span><span>Name & settings<small>${CMD()} · timers ${TIMERS ? 'on' : 'off'} · sound ${muted ? 'off' : 'on'} · music ${musicOn ? 'on' : 'off'}</small></span></button><span data-must></span>`);
    $('popcard').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { SFX.go(); start(b.dataset.k); });
    $('settings').onclick = () => welcome(missionMenu); $('book').onclick = () => { SFX.tap(); patchBook(); }; $('playcode').onclick = () => { SFX.tap(); codePopup(); };
  }
  function codePopup() { // every mission has a 4-number code: the same code always gives the same mission (js/sim.js → fresh)
    popup(`<h2>🔢 Play a mission code</h2>${mcSay('Did a friend send you a mission code? Type the 4 numbers, then tap the same mission. You get the same days and the same surprises. Who finds more ⭐?')}
      <input type="text" id="mcode" inputmode="numeric" maxlength="4" placeholder="4 numbers, like 4821" autocomplete="off" aria-label="Mission code">
      <div class="tip" id="ctip"></div><div class="missions">${Object.entries(MISSIONS).map(([k, m]) =>
      `<button class="mission" data-ck="${k}"><img src="${ART}bg/${m.world}.png" alt=""><div><b>${m.world === 'moon' ? '🌙' : '🔴'} ${m.title}</b><small>${m.teach}</small></div></button>`).join('')}</div>
      <button class="big" id="cback"><span class="e">⬅</span><span>Back to missions</span></button><span data-must></span>`);
    const box = $('mcode'), read = () => { const v = +box.value; return box.value.length === 4 && v >= 1000 ? v : null; };
    box.oninput = () => { box.value = box.value.replace(/\D/g, '').slice(0, 4); };
    $('popcard').querySelectorAll('[data-ck]').forEach(b => b.onclick = () => { const c = read();
      if (!c) { const t = $('ctip'); t.textContent = 'First type the 4 numbers of the code (from 1000 to 9999).'; t.classList.add('show'); box.focus(); SFX.off(); return; }
      SFX.go(); start(b.dataset.ck, c); });
    $('cback').onclick = () => { SFX.tap(); missionMenu(); };
  }
  function start(k, code) { tune(k); S = fresh(k, code || (1000 + Math.floor(Math.random() * 9000))); selected = null; HINT = null; hintSeen = {}; view = { mode: 'base', room: null, t0: 0 }; closeAll();
    let sunLine = '';
    if (S.world === 'mars') { const ms = LightTime.marsSun(new Date()); S.sunFactor = Math.round(ms.factor * 100) / 100; // today's real Mars–Sun distance sets how much the panels make
      sunLine = `<p class="src"><span class="tag2 calc">CALCULATED TODAY</span>Today Mars is ${ms.au.toFixed(2)} times as far from the Sun as Earth is: your solar panels get <b>${r0(S.sunFactor * 100)} %</b> of Mars' average sunshine. (NASA JPL orbits)</p>`; }
    CREW.forEach((c, i) => { crewPos[i].room = 3; crewPos[i].x = 22 + i * 26; }); hud();
    const P = (T.places || {})[S.world];
    const intro = () => { popup(`<h2>${S.world === 'moon' ? '🌙' : '🔴'} ${S.M.title}</h2>${mcSay(`<p style="margin:0">${fmt(S.M.intro, { cmd: CMD() })}</p><p>Goal: <b>${S.goal} ⭐</b> by ${S.unit} ${S.days}, and keep everyone safe.</p>`)}${sunLine}<p class="src">Mission code #${S.code}</p>
        <button class="big primary" data-close>Let's go! ▶</button>${P ? `<button class="big" id="where"><span class="e">📍</span><span>Where is your base?<small>${esc(P.name)}</small></span></button>` : ''}`);
      $('popcard').querySelector('[data-close]').onclick = () => { closeAll(); if (S.M.tutorial && !store.get('jamt-tut')) { TUT = { i: 0 }; tutShow(); } else if (!eventPopup()) autoHint(); };
      if (P) $('where').onclick = () => { SFX.tap(); placePopup(S.world, intro); }; };
    intro(); }
  function placeHtml(world) { const P = T.places[world], src = DATA.sources[P.src], map = P.map, msrc = map && DATA.sources[map.src];
    return `<p>${P.text}</p><div class="src"><span class="tag2 real">REAL</span>${src ? src.name : ''}</div>` + (map ? `<p><a class="maplink" href="${map.url}" target="_blank" rel="noopener">🗺️ ${map.label} ↗</a><br><small>${map.how} It opens a NASA website in a new tab.</small></p><div class="src"><span class="tag2 real">REAL</span>${msrc ? msrc.name : ''}</div>` : ''); }
  function placePopup(world, back) {
    popup(`<h2>📍 ${esc(T.places[world].name)}</h2>${placeHtml(world)}<button class="big primary" id="pback">OK</button>`);
    $('pback').onclick = () => { SFX.tap(); back ? back() : closeAll(); }; }
  $('menu').onclick = () => { SFX.tap(); missionMenu(); };

  // ---------- today's real Sun (js/feeds.js: live NASA DONKI, or the archived snapshot, clearly labeled) ----------
  let BIGFLARE = ''; // the real Sun's biggest flare this week, for the storm warnings, e.g. "M5.2 on 10 Nov"
  function setSun(feed) {
    const L = feed.level, src = DATA.sources[feed.source]; sunWord = L.word; sunMult = L.mult; SIM.setSun(L); FEED_STATUS[feed.source] = feed.status;
    const score = c => ('BCMX'.indexOf(c[0]) * 100) + parseFloat(c.slice(1) || 0), big = (feed.flares || []).filter(f => f.cls).sort((a, b) => score(b.cls) - score(a.cls))[0];
    BIGFLARE = big ? `${big.cls}${big.peak ? ' on ' + new Date(big.peak).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}` : '';
    sunInfo = `<span class="tag2 ${STATUS_TAG[feed.status]}">${feed.status}</span> ${src.name} · ${feed.note}<p>In the last ${src.days} days the real Sun made <b>${L.total}</b> ${w('flare', 'flares')}: ${L.x} big (X), ${L.m} medium (M), ${L.small} small. Particle storms: <b>${L.particleStorms ? 'yes' : 'none'}</b>.</p><p>${BIGFLARE ? `<p>Biggest flare: <b>${BIGFLARE}</b>.</p>` : ''}<p>So the Sun this week is <b>${L.face}</b>. This only matters in the two missions with solar storms (<b>Solar storm!</b> and <b>Call Earth</b>): their storm will be <b>${L.size}</b>. In the other missions it changes nothing.</p><div class="src"><span class="tag2 rule">GAME RULE</span>The real Sun sets how big storms are. Game days are not real days. · ${src.name}: ${src.url.replace('https://', '').replace(/\/$/, '')}</div>`;
  }
  async function loadSun() { setSun(await FEEDS.sun(new URLSearchParams(location.search))); }
  function placeSunButton() { const [x, y, r] = SUNPOS(), k = $('base').clientWidth / CW, R = r + 6;
    Object.assign($('sunbtn').style, { left: (x - R) * k + 'px', top: (y - R) * k + 'px', width: 2 * R * k + 'px', height: 2 * R * k + 'px' }); }
  $('sunbtn').onclick = () => { SFX.tap(); popup(`<h2>☀️ Today's real Sun</h2>${sunInfo || 'Checking with NASA…'}<div class="tip"></div><button class="big primary" data-close>OK</button>`); };
  addEventListener('resize', placeSunButton);

  // ---------- boot ----------
  loadArt().then(async () => {
    await unlockName(); await loadSun(); const h = new RegExp('^#(' + Object.keys(MISSIONS).join('|') + ')(?:-(\\d{4}))?$').exec(location.hash); // #mars2 or #mars2-4821 (a friend's mission code)
    S = fresh('moon1', 1234); hud(); placeSunButton(); requestAnimationFrame(loop);
    if (new URLSearchParams(location.search).has('test')) window.JAMT = { get S() { return S; }, finish, drawCard, patchBook, missionMenu }; // for automated tests only
    new MutationObserver(placeSunButton).observe($('mtitle'), { childList: true });
    const go = () => (h ? start(h[1], h[2] ? +h[2] : undefined) : missionMenu());
    if (!NAME && !store.get('jamt-welcomed')) welcome(go); else go(); // with a commander name in data/text.js, nobody is asked
  });
})();
