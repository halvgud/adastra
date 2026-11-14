// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// The simulation. Pure and deterministic: no page, no network, no clock.
// Numbers come from data/model.js; missions and decisions from data/missions.js.
// The game (js/game.js) and the checks (tests.html) both use exactly this file.
(function (root) {
  const D = root.JAMT_DATA, N = D.model, RU = N.rules, MISSIONS = D.missions, EVENTS = D.events;
  const r0 = Math.round, r1 = x => Math.round(x * 10) / 10;

  // ---------- today's real Sun sets how big storms are (a game rule; see model.rules.sun) ----------
  let SUN = { word: 'QUIET', mult: RU.sun.QUIET.mult };
  function sunLevel(flares, seps) {
    const by = c => flares.filter(f => f.cls[0] === c).length, x = by('X'), m = by('M'), L = RU.sun;
    const word = (x >= L.STORMY.minX || (L.STORMY.orParticleStorm && seps.length > 0)) ? 'STORMY' : m >= L.ACTIVE.minM ? 'ACTIVE' : 'QUIET';
    return { word, mult: L[word].mult, face: L[word].face, size: L[word].size, x, m, small: by('C') + by('B'), total: flares.length, particleStorms: seps.length };
  }
  const setSun = level => { SUN = { word: level.word, mult: level.mult }; };
  const getSun = () => ({ ...SUN });

  // ---------- each playthrough is different: a mission code seeds the schedule ----------
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function fresh(key, code) {
    const M0 = MISSIONS[key], world = M0.world, moon = world === 'moon', R = rng(code), pick = (a, b) => a + Math.floor(R() * (b - a + 1));
    const val = v => Array.isArray(v) ? pick(v[0], v[1]) : v;
    const st = { ...N.start, ...N.start[world], ...(M0.start || {}) };
    const M = { ...M0, dark: [], dust: {}, events: [], cargo: null };
    // Random draws happen in this order: the plan, then the battery, then the wear. Keep it, or old mission codes change.
    for (const p of M0.plan || []) {
      if (p.type === 'dark') { const d0 = val(p.start), len = R() < p.longChance ? p.longLen : p.len; for (let d = d0; d < d0 + len && d <= st.days - 1; d++) M.dark.push(d); }
      if (p.type === 'event') M.events.push({ kind: p.event, day: val(p.day) });
      if (p.type === 'dust') { const d0 = val(p.start), peak = R() < p.deepChance ? p.deepPeak : p.peak;
        p.shape.forEach((v, i) => { if (d0 + i <= st.days) M.dust[d0 + i] = v === 'peak' ? peak : v; });
        (p.events || []).forEach(e => M.events.push({ kind: e.event, day: e.day === 'start' ? d0 : e.day })); }
      if (p.type === 'cargo') { M.cargo = { day: val(p.day), food: p.food }; (p.events || []).forEach(e => M.events.push({ kind: e.event, day: e.day })); }
    }
    const batt = val(st.batt), wear = val(st.wear), food = val(st.food);
    return { key, code, M, world, unit: moon ? 'day' : 'sol', day: st.day, days: st.days, o2: st.o2, water: st.water, food,
      batt, cap: st.cap, dose: st.dose, shelter: st.shelter, stars: 0, goal: M.goal, sw: { gh: true, maker: true, lab: st.lab, save: false, ration: false },
      grow: st.grow, lastTend: st.lastTend, wear, broken: false, fixHelp: false, fixProg: 0, spares: st.spares, tired: st.tired, happy: 0, clean: 1, tilt: false,
      events: M.events.map(e => ({ ...e, choice: null, done: false })), jobs: [null, null, null, null], hist: [] };
  }
  const evToday = s => s.events.find(e => !e.done && e.day === s.day) || null;

  // ---------- what the player can do besides jobs and switches ----------
  // Answer a decision: i = index of the choice in data/missions.js → events.
  function choose(s, ev, i) { const c = EVENTS[ev.kind].choices[i]; ev.choice = i;
    if (c.sw) Object.assign(s.sw, c.sw); if (c.jobsAll) s.jobs = s.jobs.map(() => c.jobsAll); if (c.state) Object.assign(s, c.state); }
  const useSpare = s => { s.spares -= 1; s.broken = false; s.wear = 0; }; // the spare part fixes the recycler at once
  const earthHelp = s => { s.fixHelp = true; };                           // advice from Earth: one astronaut fixes it in one day
  const picked = ev => ev && ev.choice !== null && ev.choice !== undefined ? (EVENTS[ev.kind].choices[ev.choice] || {}).sim || null : null;

  // ---------- one day of simulation ----------
  const light = s => s.world === 'moon' ? (s.M.dark.includes(s.day) ? 0 : N.moon.sunFrac) : (s.M.dust[s.day] ?? 1) * s.clean * (s.tilt && s.M.dust[s.day] !== undefined ? RU.tiltPower : 1);
  function stormDose(g) { const t = N.storm; if (g <= t[0][0]) return t[0][1]; for (let i = 1; i < t.length; i++) if (g <= t[i][0]) { const [a, da] = t[i - 1], [b, db] = t[i]; return da + (db - da) * (g - a) / (b - a); } return t[t.length - 1][1]; }
  function step(s0) {
    const s = JSON.parse(JSON.stringify(s0)); s.M = s0.M; const W = N[s.world], say = [], math = [];
    const ev = s.events.find(e => !e.done && e.day === s.day && EVENTS[e.kind].storm) || null, pick = picked(ev);
    const jobs = pick === 'shelter' ? [] : s.jobs.filter(Boolean);
    const trips = jobs.filter(j => j === 'trip').length >= RU.crewPerTrip ? 1 : 0;
    let robot = 0, stars = 0, extraO2 = 0, extraDose = 0, outside = 0, labs = 0, fixes = 0;
    const cap = j => (RU.jobCap || {})[j] || 99; // extra astronauts beyond a job's cap do nothing
    if (pick === 'robot') { robot = N.robotKWh; s.shelter += RU.soilPerRobot; }
    if (trips) { stars += (s.tired >= RU.tiredAt || s.sw.ration) ? RU.tripStarsTired : RU.tripStars; extraO2 += N.suitO2; extraDose += N.tripDose; outside += RU.crewPerTrip; }
    for (const j of jobs) {
      if (j === 'lab' && ++labs <= cap('lab')) { if (s.sw.lab && !s.sw.save) stars += RU.labStars; else say.push('🔬 The lab was dark, so no science there.'); }
      if (j === 'regolith') { s.shelter += RU.soilPerJob; outside += 1; }
      if (j === 'clean') { s.clean = 1; outside += 1; }
      if (j === 'tend') s.lastTend = s.day;
      if (j === 'fix' && ++fixes <= cap('fix')) { if (s.broken) { s.fixProg += s.fixHelp ? RU.fixWithHelp : RU.fixAlone; if (s.fixProg >= RU.fixWork) { s.broken = false; s.fixProg = 0; s.fixHelp = false; s.wear = 0; say.push('🔧 The water recycler works again!'); } else say.push('🔧 Half fixed… one more day of work (or advice from Earth).'); } else s.wear = 0; }
      if (j === 'rest') s.tired = 0;
    }
    // Room minigames (js/minigames.js): s.mg[job] = true when the player won that job's puzzle today. Only a bonus, never needed.
    const mg = s.mg || {}, MG = RU.minigame || {}, did = j => jobs.includes(j);
    if (mg.lab && did('lab') && s.sw.lab && !s.sw.save) { stars += MG.stars; say.push(`🎮 Rock match solved: +${MG.stars} ⭐`); }
    if (mg.trip && trips) { stars += MG.stars; say.push(`🎮 Best samples collected: +${MG.stars} ⭐`); }
    if (mg.clean && did('clean')) { stars += MG.stars; say.push(`🎮 Spotless panels: +${MG.stars} ⭐`); }
    if (mg.regolith && did('regolith')) { s.shelter += MG.soilCm; say.push(`🎮 A neat wall: +${MG.soilCm} cm of soil`); }
    if (mg.tend && did('tend')) { s.grow += MG.growDays; say.push(`🎮 A careful harvest: the lettuce grew ${MG.growDays} extra days`); }
    if (mg.fix && did('fix') && s.broken) { s.broken = false; s.fixProg = 0; s.fixHelp = false; s.wear = 0; say.push('🎮 Pipes connected: the water recycler works again!'); }
    s.mg = {};
    if (stars && s.happy > 0) stars += RU.happyStar;
    const L = light(s), base = W.baseKWh * (s.sw.save ? RU.saveFactor : 1);
    const maker = s.sw.maker ? (s.world === 'mars' ? (s.sw.save ? W.slowKWh : W.isruKWh) : W.makerKWh) : 0;
    const gh = s.sw.gh ? W.ghKWh : 0, lab = s.sw.lab && !s.sw.save ? W.labKWh : 0;
    const sunAU = s.sunFactor || 1; // Mars only: today's real Mars–Sun distance (NASA JPL, js/lighttime.js); 1 = average distance
    const gen = s.world === 'moon' ? W.solarKW * 24 * L : W.kiloKWh + W.arrays * W.arrayKWh * L * sunAU;
    const use = base + maker + gh + lab + robot, net = gen - use;
    s.batt = Math.min(s.cap, s.batt + net);
    math.push(s.world === 'moon' ? `Made: ${W.solarKW} kW × 24 h × ${r0(L * 100)} % sun = ${r0(gen)} kWh` : `Made: reactor ${W.kiloKWh} + panels ${W.arrays} × ${W.arrayKWh} × ${r0(L * 100)} %${sunAU !== 1 ? ` × ${r0(sunAU * 100)} % (Sun distance)` : ''} = ${r0(gen)} kWh`);
    math.push(`Used: base ${r0(base)} + air maker ${r0(maker)} + greenhouse ${gh} + lab ${lab}${robot ? ' + robot ' + robot : ''} = ${r0(use)} → ${net >= 0 ? '+' : ''}${r0(net)} kWh`);
    if (s.world === 'moon' && L === 0) say.push(`🌑 No sun! The base used ${r0(use)} kWh from the battery.`);
    else if (s.world === 'mars' && s.M.dust[s.day] !== undefined) say.push(`🌪️ Dust storm: the panels got only ${r0(L * 100)} % of the sunlight${s.tilt ? ' (tilted)' : ''}.`);
    else say.push(`${net >= 0 ? '🔋 Battery up' : '🪫 Battery down'}: made ${r0(gen)}, used ${r0(use)} kWh.`);
    if (s.world === 'mars' && s.M.dust[s.day] !== undefined && s.M.dust[s.day + 1] === undefined) {
      s.clean = s.tilt ? RU.cleanAfterTilt : RU.dustyAfter; say.push(s.tilt ? '😎 The storm is over. Tilting kept your panels almost clean!' : `🟫 The storm is over, but dust buried your panels (${r0(RU.dustyAfter * 100)} %). Send someone to clean them at the AIRLOCK!`); s.tilt = false; }
    let o2Net = 0, wNet = 0;
    if (s.M.life) {
      const made = s.sw.maker ? (s.world === 'moon' ? W.makerO2 : (s.sw.save ? W.slowO2 : W.isruO2) - W.tankKg) : 0;
      o2Net = made - N.o2Use - extraO2; s.o2 += o2Net;
      wNet = -(s.broken ? N.waterBroken : N.waterLoss) + (s.world === 'moon' && s.sw.maker ? W.makerWater : 0); s.water += wNet; if (!s.M.food) s.food -= N.foodUse;
      math.push(`Air: made ${r1(made)} − 4 astronauts ${N.o2Use}${extraO2 ? ' − suits ' + extraO2 : ''} → ${o2Net >= 0 ? '+' : ''}${r1(o2Net)} kg`);
      math.push(`Water: ${s.broken ? 'broken recycler −' + N.waterBroken : 'recycler −' + N.waterLoss} → ${r1(wNet)} kg · Food −${N.foodUse} kg`);
      if (!s.sw.maker) say.push(`💨 The air maker was off: the crew used ${r1(-o2Net)} kg of air from the tanks.`);
      if (s.broken) say.push(`💧 The recycler is broken: −${r0(N.waterBroken)} kg of water a day!`);
      s.wear += 1; if (!s.broken && s.wear >= RU.wearBreaks) { s.broken = true; s.fixProg = 0; s.fixHelp = false; say.push('💥 The water recycler just broke!'); }
    }
    if (s.M.food) { // a mission where food can run out: the ship lands in the morning, then the crew eats
      if (s.M.cargo && s.M.cargo.day === s.day) { s.food += s.M.cargo.food; say.push(`📦 The cargo ship landed with ${s.M.cargo.food} kg of food!`); }
      const eat = N.foodUse * (s.sw.ration ? RU.rationFactor : 1); s.food -= eat;
      math.push(`Food: 4 astronauts ate ${r1(eat)} kg${s.sw.ration ? ' (small meals)' : ''} → ${r1(Math.max(0, s.food))} kg left`);
    }
    let storm = 0;
    if (s.M.rad) {
      if (ev && s.world === 'mars') { // Mars: the thick air already shields; size from NASA's Curiosity rover in May 2024 (RD-13), times the real Sun
        const base = W.doseDay * N.marsStormX * SUN.mult; storm = pick === 'shelter' ? base * RU.marsShelterFactor : base;
        say.push(`☢️ A solar storm reached Mars. ${pick === 'shelter' ? 'Inside the shelter' : 'Under the thick Martian air'}: about ${r1(storm)} mSv each.`);
        math.push(`Storm on Mars: ${W.doseDay} × ${N.marsStormX} (Curiosity, May 2024) × ${SUN.mult} (real Sun: ${SUN.word})${pick === 'shelter' ? ` × ${RU.marsShelterFactor} (shelter)` : ''} = ${r1(storm)} mSv`); }
      else if (ev) { const out = pick === 'exposed' && outside > 0, g = out ? N.suitGcm2 : (pick === 'exposed' ? N.habWall : s.shelter * N.soilGcm2PerCm);
        storm = stormDose(g) * SUN.mult;
        say.push(out ? `☢️ The storm hit while astronauts were outside: about ${r0(storm)} mSv each!` : `☢️ The storm hit. Behind ${pick === 'exposed' ? 'thin walls' : s.shelter + ' cm of moon soil'}: about ${r0(storm)} mSv each.`);
        math.push(`Storm: ${r0(stormDose(g))} for a big storm at ${r1(g)} g/cm² × ${SUN.mult} (real Sun: ${SUN.word}) = ${r0(storm)} mSv`); }
      s.dose += W.doseDay + extraDose + storm;
      math.push(`Radiation: ${W.doseDay}/${s.unit}${extraDose ? ' + trip ' + extraDose : ''}${storm ? ' + storm ' + r0(storm) : ''} mSv`);
    }
    if (s.sw.gh && s.day - s.lastTend <= RU.tendEvery) s.grow += 1; else if (s.sw.gh) say.push(`🌱 Nobody tended the plants for ${RU.tendEvery} days, so they stopped growing.`);
    if (s.grow >= N.growDays) { s.grow = 0; s.food += N.harvestKg; s.happy = RU.happyDays; say.push(`🥬 Lettuce harvest! Only half a day of food, but everyone is happier: +${RU.happyStar} ⭐ on science days.`); }
    else if (s.happy > 0) s.happy -= 1;
    s.tired += 1; if (s.tired === RU.tiredAt) say.push('😩 The crew is tired. Send someone to rest in the SHELTER.');
    s.stars += stars; if (stars) say.push(`⭐ +${stars} science!`);
    s.events.forEach(e => { if (e.day === s.day) e.done = true; });
    s.hist.push({ day: s.day, net: r0(net), batt: r0(s.batt), sw: { ...s.sw }, light: L, storm: r0(storm), outside });
    let end = null;
    if (s.batt < 0) end = 'power'; else if (s.M.life && s.o2 <= 0) end = 'o2'; else if (s.M.life && s.water <= 0) end = 'water'; else if (s.M.food && s.food < 0) end = 'food'; else if (storm > N.limit30) end = 'storm';
    s.day += 1; s.jobs = s.jobs.map(() => null);
    if (!end && s.day > s.days) end = 'done';
    return { s, say, math, end, net, o2Net, wNet, stars, storm, use };
  }

  root.JAMT_SIM = { rng, fresh, step, light, stormDose, evToday, choose, useSpare, earthHelp, sunLevel, setSun, getSun };
})(typeof window !== 'undefined' ? window : globalThis);
