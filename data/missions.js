// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Missions and decisions, as data. A new mission or a new decision is a new entry here: no code needed
// as long as it uses the building blocks below. After any change, open tests.html.
//
// In any text: {cmd} = "Commander <name>", [[word|shown text]] = a tappable word from data/text.js.
window.JAMT_DATA = window.JAMT_DATA || {};

// ---------- missions ----------
// world    'moon' or 'mars'
// meters   which meters show on top: 'power', 'life' (air and water), 'rad' (radiation)
// life     true = air and water can run out · rad = true: radiation is counted
// goal     science stars needed for the mission patch (X in "share when you reach X stars")
// patch    (optional) image in assets/pixellab/patches/ if it is not named like the mission id
// tutorial (optional) true = first-time players get the step-by-step tutorial here
// start    (optional) overrides for data/model.js → start, for example { wear: [5, 6] }
// plan     what is scheduled. A value [low, high] is picked from the mission code, so each code is a different version:
//   { type: 'dark',  start, len, longLen, longChance }          Moon: days with no sun
//   { type: 'dust',  start, shape, peak, deepPeak, deepChance,  Mars: sunlight factor per sol ('peak' = the worst sols),
//     events: [{ event, day }] }                                 plus decisions (day: a number, or 'start' = first dusty sol)
//   { type: 'event', event, day }                               a decision from the list below on that day
//   { type: 'cargo', day, food, events: [{ event, day }] }      a cargo ship lands that day with kg of food (use with food: true)
// food     true = food can run out (meter 'food'); the player can switch to small meals in the greenhouse
// repairMatters  true = tests.html checks that a player who never repairs the water recycler does not earn the patch
JAMT_DATA.missions = {
  moon1: {
    world: 'moon', title: 'The long night', teach: '⚡ Power', meters: ['power'], life: false, rad: false, goal: 12, tutorial: true,
    lesson: 'charge the battery before the dark comes.',
    intro: 'A dark spell is coming, {cmd}. No sun means no solar power! Keep the battery alive and collect science stars.',
    // longChance was 0.3 until v0.3. A 4-day night needs 4 × 203 = 812 kWh with everything off, and the battery holds 800,
    // so those versions could not be won (tests.html). Raise it again only together with a bigger battery.
    plan: [{ type: 'dark', start: [13, 15], len: 3, longLen: 4, longChance: 0 }],
  },
  moon2: {
    world: 'moon', title: 'Solar storm!', teach: '⚡ Power + ☢️ Radiation', meters: ['power', 'rad'], life: false, rad: true, goal: 12,
    lesson: 'a few centimeters of moon soil can block a solar storm.',
    intro: 'Space weather is coming, {cmd}. Make your shelter thicker and keep your crew safe.',
    plan: [{ type: 'event', event: 'storm', day: [14, 15] }], // was [13, 14] until v0.3: two full days to get ready, so nobody fails on day 2
  },
  mars1: {
    world: 'mars', title: 'Dust storm', teach: '⚡ Power + 🫁 Air', meters: ['power', 'life'], life: true, rad: false, goal: 12,
    lesson: 'dust storms dim solar panels, so save power and keep them clean.',
    intro: 'A huge dust storm is coming, {cmd}. Your solar panels will go dim, but the nuclear unit keeps working.',
    plan: [{ type: 'dust', start: [13, 15], shape: [0.6, 0.3, 'peak', 'peak', 0.3, 0.6], peak: 0.15, deepPeak: 0.1, deepChance: 0.5,
      events: [{ event: 'dust', day: 12 }, { event: 'panels', day: 'start' }] }],
  },
  mars2: {
    world: 'mars', title: 'Call Earth', teach: '📡 Radio delay + 🫁 Air', meters: ['life', 'power', 'rad'], life: true, rad: true, goal: 12,
    lesson: 'radio to Mars takes minutes, so the crew must solve problems fast.',
    intro: 'Something will break soon, {cmd}. Earth can help, but radio to Mars is slow!',
    // The water recycler is already worn: it breaks after a sol or two. The water tank is small (it was 305 kg until v0.4,
    // and a broken recycler could never empty it), so a crew that never repairs runs dry before sol 20.
    start: { wear: [5, 6], water: 100 },
    repairMatters: true, // tests.html: a player who never repairs the recycler must not earn the patch
    plan: [],
  },
  moon3: {
    world: 'moon', title: 'The late ship', teach: '🍽️ Food', meters: ['food', 'power'], life: false, rad: false, food: true, goal: 12,
    lesson: 'you cannot grow dinner in a week, so pack enough food and stretch it when the ship is late.',
    intro: 'The cargo ship with your food is late, {cmd}. Make the food last until it lands, and keep doing science.',
    // 33 to 36 kg is 5 to 6 days of normal meals (6.24 kg a day), and the ship lands on day 19: normal meals run out on day 17 or 18.
    // The lettuce is nearly ready (24 of 28 days): one harvest is 3.2 kg, about half a day of food.
    start: { food: [33, 36], grow: 24 },
    plan: [{ type: 'cargo', day: 19, food: 60, events: [{ event: 'lateship', day: 12 }] }],
  },
};

// ---------- decisions (pop-ups with choices) ----------
// say       what Mission Control says. Extra words you can use: {sun} {sunSize} {unit} {robotKWh} {soilPerRobot} {dusty}
// timer     (optional) seconds to decide. Players can switch timers off.
// ifIgnored the choice (0 = first) taken when the timer runs out. tests.html also uses it for the careless player.
// safe      the cautious choice (0 = first). tests.html uses it for the careful player.
// storm     true = this decision is a solar particle storm (the simulation gives a radiation dose that night)
// choices   icon, label, sub, and what the choice does:
//   sw:      { save, gh, lab, maker }  switches to set
//   jobsAll: 'rest'                    gives every astronaut this job
//   state:   { tilt: true }            sets a value of the base
//   sim:     for storms only: 'shelter' (no jobs, crew behind the soil), 'exposed' (work goes on), 'robot' (robot adds soil)
// src       the badge and source line under the choices. ids = entries in data/sources.js
JAMT_DATA.events = {
  storm: {
    storm: true, title: '☀️ Solar storm tonight!',
    say: "{cmd}, a [[flare|solar flare]] is sending a particle storm. On the Moon no air protects you. The real Sun today is <b>{sun}</b>, so it's a {sunSize} storm.",
    timer: 15, ifIgnored: 1, safe: 0,
    choices: [
      { icon: '🛡️', label: 'Everyone into the shelter', sub: 'no jobs today · smallest dose', sim: 'shelter', jobsAll: 'rest' },
      { icon: '🚀', label: 'Keep working', sub: 'anyone outside gets a big [[dose|dose]]', sim: 'exposed' },
      { icon: '🤖', label: 'Robot adds {soilPerRobot} cm of moon soil tonight', sub: '−{robotKWh} kWh of battery · jobs still happen', sim: 'robot' },
    ],
    src: { tag: 'REAL', ids: ['radlab_biosentinel', 'donki'],
      text: "In May 2024 NASA's BioSentinel, out in deep space, measured up to 57× a normal day of radiation in a storm (NASA OSDR). Model: RD-07…RD-10. Storm size from the real Sun = game rule." },
  },
  dust: {
    title: '🌪️ Dust storm coming!',
    say: "{cmd}, a [[dust|dust storm]] will dim the sky for 6 [[sol|sols]]. In 2018 one dropped NASA's Opportunity rover from 645 to 22 watt-hours a sol, and it never woke up.",
    ifIgnored: 1, safe: 0,
    choices: [
      { icon: '🌙', label: 'Power-save + greenhouse off', sub: 'air maker runs slower', sw: { save: true, gh: false } },
      { icon: '💡', label: 'Keep everything on', sub: 'the battery may run out', sw: { save: false } },
      { icon: '⚖️', label: 'Turn off the lab and greenhouse', sub: 'a middle path', sw: { lab: false, gh: false } },
    ],
    src: { tag: 'REAL', ids: ['opportunity_2018'], text: 'Opportunity rover, June 2018 (MODEL PW-05/06).' },
  },
  panels: {
    title: '🟫 Dust is landing on your panels!',
    say: 'Quick, {cmd}! Dust is piling up on the solar panels. What do we do?',
    timer: 12, ifIgnored: 1, safe: 0,
    choices: [
      { icon: '📐', label: 'Tilt the panels to shed dust', sub: 'less power during the storm, but they stay clean', state: { tilt: true } },
      { icon: '☀️', label: 'Keep them pointed at the Sun', sub: 'more power now, but dust buries them: only {dusty} % until cleaned', state: { tilt: false } },
    ],
    src: { tag: 'REAL IDEA', ids: ['tilt_arrays'], text: 'NASA studied Mars solar arrays that tilt to 45° to shed dust (NASA/TM-2017-219467). The exact numbers here are game rules.' },
  },
  lateship: {
    title: '📦 The cargo ship is late!',
    say: '{cmd}, the cargo ship with your food will land on day {cargoDay}. You have food for {foodDays} days of normal meals. What do we do?',
    ifIgnored: 1, safe: 0,
    choices: [
      { icon: '🍽️', label: 'Smaller meals until it lands', sub: 'the food lasts longer, but hungry astronauts find less science', sw: { ration: true } },
      { icon: '🍲', label: 'Keep eating normal meals', sub: 'more science now, but the food may run out', sw: { ration: false } },
    ],
    src: { tag: 'REAL', ids: ['csa_food', 'model'],
      text: 'Space food is packed to last the whole mission, and far from Earth cargo ships come rarely or not at all (Canadian Space Agency). Four astronauts eat about 6.2 kg of food a day (NASA, MODEL LS-12). How much smaller the meals are = game rule.' },
  },
};
