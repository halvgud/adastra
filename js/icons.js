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
  const src = e => { const n = MAP[e]; return !n ? null : n.startsWith('g:') ? `assets/pixellab/garden/${n.slice(2)}.png` : `assets/pixellab/icons/${n}.png`; };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const RE = new RegExp('(' + Object.keys(MAP).sort((a, b) => b.length - a.length).map(esc).join('|') + ')\\uFE0F?', 'gu');
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'TITLE', 'CANVAS']);

  // decoding = 'sync' below: a cached icon paints in the same frame, so re-drawn text does not blink.
  function fixText(tn) {
    const p = tn.parentNode, s = tn.nodeValue; if (!p || !s || SKIP.has(p.nodeName) || (p.closest && p.closest('[data-noicon]'))) return;
    RE.lastIndex = 0; if (!RE.test(s)) return; RE.lastIndex = 0;
    const frag = document.createDocumentFragment(); let last = 0, m;
    while ((m = RE.exec(s))) { if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      const im = document.createElement('img'); im.className = 'ico'; im.decoding = 'sync'; im.src = src(m[1]); im.alt = m[1]; im.draggable = false; frag.appendChild(im); last = m.index + m[0].length; }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, tn);
  }
  function iconify(node) {
    if (node.nodeType === 3) return fixText(node); if (node.nodeType !== 1 || SKIP.has(node.nodeName)) return;
    const w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), list = []; let n; while ((n = w.nextNode())) list.push(n); list.forEach(fixText);
  }
  function start() { Object.keys(MAP).forEach(e => img(e)); iconify(document.body); // preload, so the canvas and the share picture have them
    new MutationObserver(ms => ms.forEach(m => { if (m.type === 'characterData') fixText(m.target); else m.addedNodes.forEach(iconify); }))
      .observe(document.body, { childList: true, subtree: true, characterData: true }); }

  // Canvas: split a string into text and icons, and draw it centred at (x, y) with the icons as tall as the text.
  const CACHE = {}; const img = e => { const u = src(e); if (!u) return null; if (!CACHE[u]) { CACHE[u] = new Image(); CACHE[u].src = u; } return CACHE[u]; };
  function parts(s) { const out = []; let last = 0, m; RE.lastIndex = 0; while ((m = RE.exec(s))) { if (m.index > last) out.push(s.slice(last, m.index)); out.push({ e: m[1] }); last = m.index + m[0].length; } if (last < s.length) out.push(s.slice(last)); return out; }
  function hasIcon(s) { RE.lastIndex = 0; const r = RE.test(s); RE.lastIndex = 0; return r; }
  // ctx with font already set; paint(str, x) draws a text piece left-aligned at x (stroke and fill as the caller likes)
  function draw(ctx, s, x, y, size, paint) {
    const ps = parts(s), sz = Math.round(size * 1.15), w = ps.reduce((a, p) => a + (typeof p === 'string' ? ctx.measureText(p).width : sz + 1), 0); let cx = x - w / 2;
    const al = ctx.textAlign; ctx.textAlign = 'left';
    ps.forEach(p => { if (typeof p === 'string') { paint(p, cx); cx += ctx.measureText(p).width; } else { const im = img(p.e); if (im && im.complete && im.naturalWidth) { const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(im, Math.round(cx), Math.round(y - sz * 0.85), sz, sz); ctx.imageSmoothingEnabled = sm; } cx += sz + 1; } });
    ctx.textAlign = al;
  }
  root.JAMT_ICON = { src, iconify, hasIcon, draw, img };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})(window);
