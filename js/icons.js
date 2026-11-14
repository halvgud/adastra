// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Pixel-art icons instead of emoji. Every emoji in data/*.js, js/*.js and index.html stays in the text as it is (so the
// words are easy to edit); this file swaps each one for a 32 px PixelLab icon wherever it shows up on the page, also in
// text added later. On the canvas, js/game.js draws them with JAMT_ICON.draw. Icons: assets/pixellab/icons/ (and a few
// shared with the garden puzzle in assets/pixellab/garden/). An emoji with no icon here stays an emoji.
(function (root) {
  'use strict';
  const MAP = {
    '⭐': 'star', '⚡': 'power', '🚀': 'rocket', '💡': 'bulb', '🌱': 'g:sprout', '☀': 'sun', '🛡': 'shield', '🌙': 'moon', '🔧': 'wrench',
    '🔬': 'microscope', '☢': 'radiation', '🎮': 'gamepad', '👤': 'person', '🔋': 'battery', '🧽': 'sponge', '🔴': 'mars', '💨': 'air',
    '🏅': 'medal', '💧': 'g:drop', '📡': 'dish', '🥬': 'g:lettuce', '🍽': 'plate', '🚪': 'door', '📚': 'books', '⬅': 'back', '🟫': 'dust',
    '⚫': 'off', '🌑': 'dark', '🗺': 'map', '🔊': 'speaker', '💥': 'boom', '😴': 'sleep', '⚠': 'warning', '🌪': 'duststorm', '⏱': 'timer',
    '🪫': 'lowbatt', '🔢': 'numbers', '✨': 'sparkles', '🎵': 'music', '🫁': 'lungs', '📦': 'box', '📍': 'pin', '🚰': 'tap', '❓': 'question',
    '⏭': 'skip', '✅': 'check', '🌫': 'fog', '🎉': 'party', '🧰': 'toolbox', '📤': 'share', '⏸': 'pause', '📸': 'camera', '💾': 'save',
    '📋': 'clipboard', '👩‍🚀': 'woman', '👨‍🚀': 'man', '👩': 'woman', '👨': 'man', '⚙': 'gear', '🦠': 'g:mold', '⏩': 'ffwd', '📊': 'chart',
    '🌍': 'earth', '⚛': 'atom', '👍': 'thumbsup', '🏆': 'trophy', '🔥': 'fire', '🏁': 'flag', '👉': 'pointright', '🗂': 'folders',
    '😰': 'worried', '😮': 'surprised', '🙂': 'smile', '😕': 'confused', '😎': 'cool', '😩': 'weary', '😊': 'happy', '😐': 'neutral', '😠': 'angry',
    '🔁': 'repeat', '🎲': 'dice', '👪': 'family', '👇': 'pointdown', '🔒': 'lock', '🛰': 'satellite', '🪨': 'rock', '🥀': 'g:wilt', '🧺': 'basket',
    '💦': 'splash', '🤖': 'robot', '⚖': 'scales', '📐': 'setsquare', '🍲': 'stew',
  };
  // All icons live in ONE picture (assets/pixellab/icons.png, made by tools/build_atlas.py; js/iconatlas.js says where each one is),
  // so the page loads one file and a re-drawn icon can never blink.
  const A = root.JAMT_ICON_ATLAS || { names: [], cols: 1, rows: 1, cell: 32, src: '' }, AT = {}; A.names.forEach((n, i) => { AT[n] = i; });
  const cellOf = e => { const n = MAP[e]; if (!n) return -1; const k = n.startsWith('g:') ? 'g_' + n.slice(2) : n; return k in AT ? AT[k] : -1; };
  const css = document.createElement('style');
  // !important: rules like `.bar i` or `.legend i` in index.html must never reshape an icon
  css.textContent = `i.ico{display:inline-block!important;position:static!important;width:1.15em;height:1.15em;vertical-align:-0.22em;margin:0 .05em!important;padding:0!important;border:0!important;box-shadow:none!important;transform:none!important;animation:none!important;opacity:1!important;background-image:url(${A.src})!important;background-repeat:no-repeat!important;background-color:transparent!important;background-size:${A.cols * 100}% ${A.rows * 100}%!important;image-rendering:pixelated;font-style:normal}`;
  document.head.appendChild(css);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RE = new RegExp('(' + Object.keys(MAP).filter(e => cellOf(e) >= 0).sort((a, b) => b.length - a.length).map(esc).join('|') + ')\\uFE0F?', 'gu');
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'TITLE', 'CANVAS']);

  function fixText(tn) {
    const p = tn.parentNode, s = tn.nodeValue; if (!p || !s || SKIP.has(p.nodeName) || (p.closest && p.closest('[data-noicon]'))) return;
    RE.lastIndex = 0; if (!RE.test(s)) return; RE.lastIndex = 0;
    const frag = document.createDocumentFragment(); let last = 0, m;
    while ((m = RE.exec(s))) { if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      const i = cellOf(m[1]), im = document.createElement('i'); im.className = 'ico'; im.setAttribute('role', 'img'); im.setAttribute('aria-label', m[1]);
      im.style.backgroundPosition = `${(i % A.cols) / Math.max(1, A.cols - 1) * 100}% ${Math.floor(i / A.cols) / Math.max(1, A.rows - 1) * 100}%`; frag.appendChild(im); last = m.index + m[0].length; }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, tn);
  }
  function iconify(node) {
    if (node.nodeType === 3) return fixText(node); if (node.nodeType !== 1 || SKIP.has(node.nodeName)) return;
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), list = []; let n; while ((n = w.nextNode())) list.push(n); list.forEach(fixText);
  }
  function start() { iconify(document.body);
    new MutationObserver(ms => ms.forEach(m => { if (m.type === 'characterData') fixText(m.target); else m.addedNodes.forEach(iconify); }))
      .observe(document.body, { childList: true, subtree: true, characterData: true }); }

  // Canvas: split a string into text and icons, and draw it centred at (x, y) with the icons as tall as the text.
  const SHEET = new Image(); SHEET.src = A.src; // the same picture, for the canvas
  function parts(s) { const out = []; let last = 0, m; RE.lastIndex = 0; while ((m = RE.exec(s))) { if (m.index > last) out.push(s.slice(last, m.index)); out.push({ e: m[1] }); last = m.index + m[0].length; } if (last < s.length) out.push(s.slice(last)); return out; }
  function hasIcon(s) { RE.lastIndex = 0; const r = RE.test(s); RE.lastIndex = 0; return r; }
  // ctx with font already set; paint(str, x) draws a text piece left-aligned at x (stroke and fill as the caller likes)
  function draw(ctx, s, x, y, size, paint) {
    const ps = parts(s), sz = Math.round(size * 1.15), w = ps.reduce((a, p) => a + (typeof p === 'string' ? ctx.measureText(p).width : sz + 1), 0); let cx = x - w / 2;
    const al = ctx.textAlign; ctx.textAlign = 'left';
    ps.forEach(p => { if (typeof p === 'string') { paint(p, cx); cx += ctx.measureText(p).width; } else { const i = cellOf(p.e); if (i >= 0 && SHEET.complete && SHEET.naturalWidth) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(SHEET, (i % A.cols) * A.cell, Math.floor(i / A.cols) * A.cell, A.cell, A.cell, Math.round(cx), Math.round(y - sz * 0.85), sz, sz); ctx.imageSmoothingEnabled = sm; } cx += sz + 1; } });
    ctx.textAlign = al;
  }
  root.JAMT_ICON = { iconify, hasIcon, draw };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})(window);
