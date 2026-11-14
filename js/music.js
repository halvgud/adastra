// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Background music: "Quiet Orbit", an original ambient chiptune made for this game.
// It is not a recording and uses no samples: every note below is played live by the browser (Web Audio),
// in the style of early-2000s tracker music (square-wave arpeggios with echo), slowed down and softened.
// Written for this project, so it carries the project's license. Nothing is downloaded.
//
// To change the mood: CHORDS (harmony), ARP (patterns), BPM, VOL.
(function (root) {
  const BPM = 84, STEP = 60 / BPM / 4, VOL = 0.6;   // STEP = one 16th note
  const PER_CHORD = 32;                             // 2 bars per chord
  // MIDI note numbers. Am(add9) → Fmaj7 → Cmaj7 → Em7: calm, a little mysterious, never resolves completely.
  const CHORDS = [
    { bass: 45, tones: [57, 60, 64, 71] },
    { bass: 41, tones: [53, 57, 60, 64] },
    { bass: 48, tones: [60, 64, 67, 71] },
    { bass: 40, tones: [52, 55, 59, 62] },
  ];
  const ARP = [[0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 1], [4, 3, 1, 2, 0, 2, 3, 1]]; // 4 = the root an octave up
  const SPARKLE = [81, 84, 86, 88, 91];               // A minor pentatonic, high: "stars"
  const LOOP = PER_CHORD * CHORDS.length;            // 8 bars, about 23 seconds

  let ac = null, out = null, padBus, arpBus, dry, timer = null, step = 0, nextT = 0, on = false;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const chance = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }; // the same "random" every loop

  function voice(type, freq, t, dur, peak, dest, attack, detune) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq; o.detune.value = detune || 0;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function build() {
    out = ac.createGain(); out.gain.value = 0.0001; out.connect(ac.destination);
    const soft = ac.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2600; soft.connect(out);
    dry = ac.createGain(); dry.connect(soft);
    padBus = ac.createBiquadFilter(); padBus.type = 'lowpass'; padBus.frequency.value = 900; padBus.connect(soft);
    const echo = ac.createDelay(2), back = ac.createGain(), dull = ac.createBiquadFilter(); // dotted-eighth echo, darker each repeat
    echo.delayTime.value = STEP * 3; back.gain.value = 0.38; dull.type = 'lowpass'; dull.frequency.value = 1800;
    echo.connect(dull); dull.connect(back); back.connect(echo); dull.connect(soft);
    arpBus = ac.createGain(); arpBus.connect(dry); arpBus.connect(echo);
  }
  function play(n, t) {
    const ci = Math.floor(n / PER_CHORD) % CHORDS.length, s = n % PER_CHORD, loop = Math.floor(n / LOOP), C = CHORDS[ci];
    if (s === 0) C.tones.slice(0, 3).forEach(m => { // warm pad: two slightly detuned voices per note
      voice('triangle', hz(m), t, STEP * PER_CHORD + 1.2, 0.022, padBus, 1.6, -7); voice('triangle', hz(m), t, STEP * PER_CHORD + 1.2, 0.022, padBus, 1.6, 7); });
    if (s === 0 || s === 16) voice('triangle', hz(C.bass), t, STEP * 14, 0.1, dry, 0.02);
    if (loop > 0 || s % 2 === 0) { // the first time round, the arpeggio plays at half speed: it fades in
      const k = ARP[loop % ARP.length][s % 8], m = (k === 4 ? C.tones[0] + 12 : C.tones[k]) + 12;
      voice('square', hz(m), t, 0.22, loop > 0 ? 0.03 : 0.02, arpBus, 0.005);
    }
    if (loop > 0 && chance(n) < 0.07) voice('sine', hz(SPARKLE[Math.floor(chance(n + 99) * SPARKLE.length)]), t, 2.6, 0.03, arpBus, 0.02);
  }
  function tick() { while (nextT < ac.currentTime + 0.25) { play(step, nextT); step += 1; nextT += STEP; } }

  root.JAMT_MUSIC = {
    start(ctx) {
      if (on || !ctx) return; ac = ctx; if (!out) build(); on = true; step = 0; nextT = ac.currentTime + 0.1;
      const g = out.gain, now = ac.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now); g.exponentialRampToValueAtTime(VOL, now + 4);
      tick(); timer = setInterval(tick, 50);
    },
    stop() {
      if (!on) return; on = false; clearInterval(timer); timer = null;
      const g = out.gain, now = ac.currentTime; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now); g.exponentialRampToValueAtTime(0.0001, now + 0.8);
    },
    get playing() { return on; },
  };
})(window);
