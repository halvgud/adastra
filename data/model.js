// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Every number the simulation uses. Change numbers here, not in js/sim.js or js/game.js.
// After any change, open tests.html to see if the missions are still fair.
//
// Three groups:
//   top level  physical numbers. `refs` (below) says which row of docs/MODEL.md each one comes from,
//              and marks with '?' the ones whose derivation still has to be found.
//   start      what a mission starts with.
//   rules      game rules, invented for gameplay. In the game they are labeled "game rule", never "NASA data".
// A value written as [low, high] is picked at random from that range using the mission code.
window.JAMT_DATA = window.JAMT_DATA || {};
JAMT_DATA.model = {
  // per world: power made and used (kWh per day or sol), oxygen made (kg), radiation (mSv)
  moon: { solarKW: 21, sunFrac: 0.97, baseKWh: 290, makerKWh: 84, makerO2: 4.44, makerWater: -1.0, ghKWh: 36, labKWh: 24, doseDay: 0.84 },
  mars: { kiloKWh: 247, arrayKWh: 20, arrays: 8, baseKWh: 298, isruKWh: 86, isruO2: 5.4, slowKWh: 43, slowO2: 2.7, tankKg: 1.0, ghKWh: 37, labKWh: 25, doseDay: 0.64, cruiseDose: 331 },

  // crew of 4, per day: oxygen, water lost with the recycler working and broken, food (kg)
  o2Use: 4.33, waterLoss: 0.36, waterBroken: 17.9, foodUse: 6.24,
  suitO2: 1.0,        // kg of suit air for one science trip
  tripDose: 0.1,      // extra mSv for one science trip
  robotKWh: 160,      // battery the robot uses to add soil in one night

  // radiation: dose of a big solar storm (mSv) behind a shield of [g/cm², mSv]; straight lines between the points
  storm: [[0.5, 500], [4, 250], [10, 125]],
  suitGcm2: 0.5,      // an astronaut outside, in a suit
  habWall: 5,         // g/cm² of the habitat wall, outside the shelter
  soilGcm2PerCm: 1.5, // each cm of moon soil
  limit30: 250,       // mSv: the most NASA allows in 30 days (the mission pauses above this in one night)
  careerLimit: 600,   // mSv: career limit, the top of the radiation meter

  // greenhouse
  harvestKg: 3.2, growDays: 28,

  // Where each number above comes from (checked against docs/MODEL.md on 2026-11-12). tests.html reads this list.
  //   'ROW-ID …'  a row of docs/MODEL.md; the text after it shows the arithmetic, which was re-done and matches
  //   'design'    chosen for this base (how many arrays, how big a lab): not NASA data and not a play rule
  //   'rule'      follows from a game rule
  //   '?'         carried over from mockup E without a written derivation. Find the row or call it a game rule before the README is final
  refs: {
    'moon.solarKW': 'design', 'moon.sunFrac': '?', 'moon.baseKWh': 'LS-14: 12.1 kW × 24 h', 'moon.makerKWh': '?', 'moon.makerO2': 'LS-22: 5.0 kg of water split a day × 16/18',
    'moon.makerWater': '?', 'moon.ghKWh': '?', 'moon.labKWh': 'design', 'moon.doseDay': 'RD-05',
    'mars.kiloKWh': 'PW-11, TR-05: 10 kW × 24.66 h', 'mars.arrayKWh': 'PW-08: 80 kWh a sol from 4 arrays', 'mars.arrays': 'design', 'mars.baseKWh': 'LS-14, TR-05: 12.1 kW × 24.66 h',
    'mars.isruKWh': 'IS-07: half the plant, 5.4 kg × 16 kWh/kg', 'mars.isruO2': 'IS-07: half of 10.8 kg a sol', 'mars.slowKWh': 'rule', 'mars.slowO2': 'rule', 'mars.tankKg': '?',
    'mars.ghKWh': '?', 'mars.labKWh': 'design', 'mars.doseDay': 'RD-01', 'mars.cruiseDose': 'RD-15',
    o2Use: 'LS-03, LS-01: 4 × 1.083', waterLoss: 'LS-09', waterBroken: 'LS-10', foodUse: 'LS-12, LS-01: 4 × 1.56', suitO2: '?', tripDose: '?', robotKWh: '?',
    storm: 'RD-08, RD-09, RD-10', suitGcm2: '?', habWall: '?', soilGcm2PerCm: 'IS-09', limit30: 'RD-07', careerLimit: 'RD-06', harvestKg: '?', growDays: 'FD-01',
  },

  start: {
    day: 12, days: 20,                 // a mission is days 12 to 20
    shelter: 6,                        // cm of soil on the shelter
    spares: 1, tired: 1, lastTend: 12, wear: 2,
    // Tanks, batteries and stocks are 'design' sizes. The starting dose is what the crew already has on day 12:
    //   Moon 16 ≈ 12 days × 0.84 (RD-05) + a 3-day trip (TR-10) × 1.84 (RD-02) = 15.6 · Mars 339 ≈ 331 (RD-15) + 12 sols × 0.64 (RD-01) = 338.7
    moon: { o2: 41, water: 212, food: 268, batt: [380, 440], cap: 800, dose: 16, grow: 21, lab: false },
    mars: { o2: 38, water: 305, food: 1830, batt: [200, 240], cap: 400, dose: 339, grow: 12, lab: true },
  },

  rules: {
    saveFactor: 0.7,                   // power-save: the base uses 30 % less, and the lab stops
    tiltPower: 0.6,                    // tilted panels make 60 % of their power during a dust storm...
    cleanAfterTilt: 0.95,              // ...and stay 95 % clean
    dustyAfter: 0.4,                   // panels left flat are 40 % clean after the storm, until someone cleans them
    crewPerTrip: 2, tripStars: 2, tripStarsTired: 1, labStars: 1,
    jobCap: { lab: 1, tend: 1, fix: 1 },
    // Room minigames: optional puzzles; winning gives a bonus when the day ends (never needed to win a mission).
    minigame: { seconds: 25, stars: 1, soilCm: 1, growDays: 2, mistakes: 2 }, // how many astronauts can do each job in a day (the rooms show "👤 n/1")
    rationFactor: 0.75,                // small meals: the crew eats 75 % of the food, and trips find less science (like a tired crew)
    happyStar: 1, happyDays: 3,        // after a harvest: +1 ⭐ on science days, for 3 days
    tiredAt: 5,                        // days without anyone resting before trips find less science
    tendEvery: 3,                      // plants stop growing if nobody gardens for more than this many days
    wearBreaks: 7,                     // days of wear before the water recycler breaks
    fixWork: 2, fixAlone: 1, fixWithHelp: 2, // repair work needed, and work per day alone or with advice from Earth
    soilPerJob: 2, soilPerRobot: 2,    // cm of soil added to the shelter
    safeSoilCm: 7,                     // the "safe" line shown on the shelter
    // How the real Sun (NASA DONKI, last 7 days) sets the size of storms in the missions.
    // mult = size of the storm, as a part of the "big storm" table above. Until v0.3 these were 0.15 / 0.4 / 1.0, and with a
    // calm or busy Sun nothing bad could happen in a storm (tests.html). Now, with limit30 = 250 mSv in one night:
    //   calm or busy Sun: astronauts caught outside are over the limit; working indoors is fine
    //   stormy Sun:       even the habitat wall is not enough; only the shelter (or the robot's extra soil) is
    sun: {
      QUIET: { mult: 0.6, face: '😊 calm', size: 'small' },
      ACTIVE: { mult: 0.8, minM: 3, face: '😐 busy', size: 'medium' },                       // 3 or more medium (M) flares
      STORMY: { mult: 1.2, minX: 1, orParticleStorm: true, face: '😠 stormy', size: 'big' }, // any big (X) flare, or a particle storm
    },
  },
};
