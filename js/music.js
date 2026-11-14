// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Background music: original ambient chiptunes made for this game, one for the menu and one per mission.
// Nothing is recorded or downloaded: every note below is played live by the browser (Web Audio), in the style of
// early-2000s tracker music (square-wave arpeggios with echo), slowed down and kept soft.
// JAMT_MUSIC.song(id) picks the song (crossfading if one is playing); start(ctx) / stop() follow the 🎵 setting.
(function (root) {
  const VOL = 0.32; // overall loudness (kept low: this is background music)
  // MIDI note numbers. Each song: tempo, four chords (2 bars each), arpeggio patterns (4 = root an octave up, -1 = rest),
  // the lead and pad waves, high "star" notes, and how much echo.
  const SONGS = {
    menu:  { name: 'Launch Pad',   bpm: 92, lead: 'square',   pad: 'triangle', echo: 0.32,
      chords: [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]], [41, [53, 57, 60, 64]], [43, [55, 59, 62, 64]]],
      arp: [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 4, 2, 1, 3, 4, 3]], sparkle: [84, 86, 88, 91, 93] },
    moon1: { name: 'Quiet Orbit',  bpm: 84, lead: 'square',   pad: 'triangle', echo: 0.38,
      chords: [[45, [57, 60, 64, 71]], [41, [53, 57, 60, 64]], [48, [60, 64, 67, 71]], [40, [52, 55, 59, 62]]],
      arp: [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 1], [4, 3, 1, 2, 0, 2, 3, 1]], sparkle: [81, 84, 86, 88, 91] },
    moon2: { name: 'Solar Wind',   bpm: 96, lead: 'square',   pad: 'sawtooth', echo: 0.3,
      chords: [[38, [50, 53, 57, 60]], [34, [46, 50, 53, 57]], [41, [53, 57, 60, 64]], [36, [48, 52, 55, 60]]],
      arp: [[0, 2, 4, 2, 0, 2, 4, 3], [4, 3, 2, 1, 0, 1, 2, 3]], sparkle: [74, 77, 79, 81, 84] },
    moon3: { name: 'Cargo Bay',    bpm: 88, lead: 'triangle', pad: 'triangle', echo: 0.34,
      chords: [[43, [55, 59, 62, 66]], [40, [52, 55, 59, 62]], [36, [48, 52, 55, 59]], [38, [50, 54, 57, 60]]],
      arp: [[0, 1, 2, 1, 3, 2, 4, 2], [0, 2, 1, 3, -1, 2, 4, -1]], sparkle: [79, 83, 86, 88, 91] },
    mars1: { name: 'Red Dust',     bpm: 76, lead: 'square',   pad: 'triangle', echo: 0.45,
      chords: [[40, [52, 55, 59, 66]], [36, [48, 52, 55, 59]], [38, [50, 54, 57, 62]], [35, [47, 50, 54, 57]]],
      arp: [[0, -1, 2, -1, 1, 3, -1, 4], [0, 1, -1, 3, 2, -1, 4, -1]], sparkle: [76, 79, 81, 83, 86] },
    mars2: { name: 'Long Signal',  bpm: 90, lead: 'square',   pad: 'sine',     echo: 0.4,
      chords: [[42, [54, 57, 61, 64]], [38, [50, 54, 57, 61]], [45, [57, 61, 64, 68]], [40, [52, 56, 59, 64]]],
      arp: [[0, -1, -1, 4, -1, 2, -1, -1], [0, 4, -1, -1, 3, -1, 1, -1]], sparkle: [78, 81, 85, 88, 90] },
  };
  const PER_CHORD = 32;
  let ac = null, out = null, padBus, arpBus, dry, back, echo, timer = null, step = 0, nextT = 0, on = false, song = SONGS.menu, want = 'menu', swapT = null;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const chance = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const stepLen = () => 60 / song.bpm / 4;
  function voice(type, freq, t, dur, peak, dest, attack, detune) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune || 0;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function build() {
    out = ac.createGain(); out.gain.value = 0.0001; out.connect(ac.destination);
    const soft = ac.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2400; soft.connect(out);
    dry = ac.createGain(); dry.connect(soft);
    padBus = ac.createBiquadFilter(); padBus.type = 'lowpass'; padBus.frequency.value = 850; padBus.connect(soft);
    const dull = ac.createBiquadFilter(); echo = ac.createDelay(2); back = ac.createGain();
    dull.type = 'lowpass'; dull.frequency.value = 1700; echo.connect(dull); dull.connect(back); back.connect(echo); dull.connect(soft);
    arpBus = ac.createGain(); arpBus.connect(dry); arpBus.connect(echo);
  }
  function play(n, t) {
    const S = song, LEN = PER_CHORD * S.chords.length, ci = Math.floor(n / PER_CHORD) % S.chords.length, s = n % PER_CHORD, loop = Math.floor(n / LEN), [bass, tones] = S.chords[ci], st = stepLen();
    const padVol = S.pad === 'sawtooth' ? 0.008 : 0.02;
    if (s === 0) tones.slice(0, 3).forEach(m => { voice(S.pad, hz(m), t, st * PER_CHORD + 1.2, padVol, padBus, 1.6, -7); voice(S.pad, hz(m), t, st * PER_CHORD + 1.2, padVol, padBus, 1.6, 7); });
    if (s === 0 || s === 16) voice('triangle', hz(bass), t, st * 14, 0.09, dry, 0.02);
    if (loop > 0 || s % 2 === 0) { const k = S.arp[loop % S.arp.length][s % 8]; if (k >= 0) { const m = (k === 4 ? tones[0] + 12 : tones[k]) + 12; voice(S.lead, hz(m), t, 0.22, loop > 0 ? 0.026 : 0.018, arpBus, 0.005); } }
    if (loop > 0 && chance(n + S.bpm) < 0.06) voice('sine', hz(S.sparkle[Math.floor(chance(n + 99) * S.sparkle.length)]), t, 2.6, 0.026, arpBus, 0.02);
  }
  function tick() { while (nextT < ac.currentTime + 0.25) { play(step, nextT); step += 1; nextT += stepLen(); } }
  const fade = (to, secs) => { const g = out.gain, now = ac.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now); g.exponentialRampToValueAtTime(Math.max(to, 0.0001), now + secs); };
  function begin() { song = SONGS[want] || SONGS.menu; step = 0; nextT = ac.currentTime + 0.1; echo.delayTime.value = stepLen() * 3; back.gain.value = song.echo; fade(VOL, 3); }

  root.JAMT_MUSIC = {
    songs: SONGS,
    start(ctx) { if (on || !ctx) return; ac = ctx; if (!out) build(); on = true; begin(); tick(); timer = setInterval(tick, 50); },
    stop() { if (!on) return; on = false; clearInterval(timer); timer = null; clearTimeout(swapT); fade(0.0001, 0.8); },
    song(id) { // switch to another song with a short crossfade
      const next = SONGS[id] ? id : 'menu'; if (next === want) return; want = next;
      if (!on) return; clearTimeout(swapT); fade(0.0001, 0.9); swapT = setTimeout(() => { if (on) begin(); }, 1000); },
    get playing() { return on; }, get current() { return want; },
  };
})(window);
