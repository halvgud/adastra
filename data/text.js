// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Words, rooms, crew, jobs and facts. Change wording here, not in js/game.js.
// Every fact needs a source id from data/sources.js (src). tests.html lists the ones that still have none.
window.JAMT_DATA = window.JAMT_DATA || {};
JAMT_DATA.text = {
  // Words kids can tap. In any text, write [[key|shown words]] to make them tappable.
  words: {
    sol: 'A sol is one day on Mars: 24 hours and 40 minutes.',
    dose: 'Radiation dose is how much space radiation your body soaked up. Astronauts wear a badge that counts it, in millisieverts (mSv).',
    regolith: 'Regolith is the dusty, rocky soil of the Moon and Mars. A few centimeters of it block most of a solar storm.',
    flare: 'A solar flare is a sudden flash on the Sun. Big ones can send out fast, dangerous particles.',
    dust: 'In a Martian dust storm, dust fills the sky and blocks sunlight, so solar panels make much less power.',
    save: 'Power-save turns down heaters and lights: 30 % less power, but the lab can’t run. (Game rule.)',
  },

  // The six rooms, in screen order (3 × 2). img = file in assets/pixellab/rooms/. sw = the light switch it has.
  rooms: [
    { id: 'airlock', name: 'AIRLOCK', icon: '🚪', img: 'airlock', about: 'The door to outside. Astronauts always go out in pairs.' },
    { id: 'lab', name: 'LAB', icon: '🔬', img: 'lab', sw: 'lab', about: 'Science happens here. It needs power.' },
    { id: 'greenhouse', name: 'GREENHOUSE', icon: '🌱', img: 'greenhouse', sw: 'gh', about: 'Grows fresh lettuce. Plants need light and a gardener.' },
    { id: 'shelter', name: 'SHELTER', icon: '🛡️', img: 'shelter', about: 'Beds, and a thick wall of soil against solar storms.' },
    { id: 'oxygen', name: 'AIR MAKER', icon: '💨', img: 'oxygen', sw: 'maker', about: 'Makes the air the crew breathes.' },
    { id: 'battery', name: 'BATTERY', icon: '🔋', img: 'battery', about: 'Stores power for the night and for storms.' },
  ],

  // The mission commander: crew #0, the astronaut with the ★ that the player controls.
  //   name          used until the player types another one in ⚙️ Name & settings. '' = ask for a name on the first run.
  //   glasses       true = the commander's astronaut wears glasses (drawn on the sprite by js/game.js)
  //   glassesColor  colour of the frame
  // The owner asked (2026-11-13): the commander is the player and stays configurable; nobody is named here by default.
  commander: { name: '', glasses: false, glassesColor: '#1c1f2b' },

  // Mission Control: the person on Earth who talks to the player in every message (portrait: assets/pixellab/ui/mission-control.png).
  //   secretName  her name, ENCRYPTED (AES-256-GCM, key from a passphrase with PBKDF2-SHA-256). By default nobody sees a name:
  //               messages say just "Mission Control". Opening the game with ?mc=<passphrase> decrypts it and that device remembers it;
  //               ?mc=off forgets it. The passphrase is not in this project: the owner keeps it.
  //   glasses  true = glasses drawn on the portrait by js/game.js (GLASSES_MC says where)
  //   voices   the 🔊 read-aloud uses the first browser voice whose name contains one of these words (English, women's voices on
  //            Windows, Chrome, Edge, macOS, iOS and Android). Browsers do not say which voices are female, so this goes by name.
  //   pitch    used only when none of those voices exists (1 = normal; a little higher sounds less like a man's voice)
  missionControl: { glasses: true, glassesColor: '#1c1f2b',
    secretName: { salt: 'uklP6YbE1464n1h7ybLQTw==', iv: 'rhpTnYKOYzzIg+xQ', iter: 150000, data: 'NwR2AwamYX91U2a17Fot2AcDmBeCvU5rUN/7sEwdI/Y=' },
    voices: ['Aria', 'Jenny', 'Zira', 'Michelle', 'Ava', 'Emma', 'Libby', 'Sonia', 'Natasha', 'Google US English', 'Google UK English Female',
      'Samantha', 'Karen', 'Moira', 'Tessa', 'Victoria', 'Susan', 'Hazel', 'Female', 'female'],
    pitch: 1.2 },

  // Crew #0 is the player (shown with the commander's name). col = suit stripe colour.
  // The crew is always two women and two men: the player picks woman or man for the commander, and crew #1–3 are
  // filled from these names to make it 2 and 2 (crewNames.woman for the women, crewNames.man for the men).
  crew: [{ name: 'You', col: null, you: true }, { name: 'Mia', col: [70, 140, 255] }, { name: 'Leo', col: [40, 200, 120] }, { name: 'Max', col: [200, 110, 230] }],
  crewNames: { woman: ['Ana', 'Mia'], man: ['Leo', 'Max'] },
  // What crew members say when the player taps them inside a room.
  crewLines: ['On it!', 'Hi, Commander!', 'Science time!', 'All good here.', 'Look at that!', 'Ready!', 'Teamwork!'],

  // job id: [icon, name, room where the astronaut goes]
  jobs: {
    trip: ['🚀', 'Science trip', 'airlock'], lab: ['🔬', 'Lab work', 'lab'], tend: ['🌱', 'Gardening', 'greenhouse'], fix: ['🔧', 'Fixing', 'oxygen'],
    rest: ['😴', 'Resting', 'shelter'], regolith: ['🛡️', 'Adding soil', 'airlock'], clean: ['🧽', 'Cleaning', 'airlock'],
  },

  // Where the game is published. Fill it in when the domain exists (for example 'https://juniorastronaut.earth/'):
  // the share picture then says where to play, and the copied message links to the same mission.
  // Empty = use the page's own address when it is served over http(s).
  site: { url: 'https://adastra.earth/' },

  // "Where is your base?" cards (mission start and the 📚 screen). src = a checked source in data/sources.js.
  places: {
    moon: { name: 'Near the Moon’s south pole', text: 'Your Moon base sits near the south pole. Some ridges there get sunlight about 88 % of the time, but dark spells still last days: that is why the battery matters.',
      src: 'lunar_poles' },
    mars: { name: 'Jezero Crater, Mars', text: 'Your Mars base is in Jezero Crater, where NASA’s Perseverance rover landed on 18 February 2021. Scientists believe the crater was once flooded with water, with a river and a delta.',
      src: 'perseverance_mission', map: { label: 'Explore Mars on NASA Mars Trek', url: 'https://trek.nasa.gov/mars/', how: 'Type “Jezero” in its search box.', src: 'mars_trek' } },
  },

  // Room minigames (js/minigames.js): offered inside a room once an astronaut has that job today. Optional; winning gives a bonus.
  // how = what Mission Control says before the puzzle. fact + src = the real thing it is about (a checked source in data/sources.js).
  minigames: {
    lab: { title: '🔬 Sample memory', how: 'The lab cards got mixed up! Flip two cards at a time and find all the matching pairs.',
      fact: 'Between 1969 and 1972, six Apollo missions brought back 2,200 separate samples from six different places on the Moon.', src: 'apollo_samples' },
    trip: { title: '🚀 Rover route', how: 'Drag a path from 1 to the last number, in order. The route must pass through EVERY square, without crossing itself.',
      fact: 'The record for the most spacewalks is 16, by cosmonaut Anatoly Solovyev: more than 82 hours outside in space.', src: 'nasa_spacewalk' },
    fix: { title: '🔧 Fix the pipes', how: 'Tap pipe pieces to turn them, until the water can flow from 💧 to 🚰!',
      fact: 'With the water recycler broken, four astronauts would lose about 18 kg of water every day.', src: 'model' },
    tend: { title: '🌱 Harvest time', how: 'Lettuces 🥬 ripen one by one. Pick 5 of them before they wilt 🥀, and leave the sprouts 🌱 alone!',
      fact: 'While it grows, one square meter of lettuce makes about 7.8 grams of oxygen a day.', src: 'model' },
    regolith: { title: '🛡️ Soil bags', how: 'Cover the whole wall with soil bags. Drag (or tap two corners) to make a box. Each box must hold exactly one number, as big as the box.',
      fact: 'About 7 cm of moon soil cuts the dose of a big solar storm to half of NASA’s 30-day limit. That is the yellow “safe” line in your shelter.', src: 'dlr_shielding' },
    clean: { title: '🧽 Windy panels', how: 'Wipe the dust 🟫 off the solar panels. The wind keeps blowing more in for a while: keep going until it stops!',
      fact: 'Global dust storms on Mars happen about once every three Mars years, and they can last for weeks or months.', src: 'nasa_dust_storms' },
  },

  // Real NASA studies from OSDR (archived copy, see data/sources.js), shown in rooms on alternate days next to the room's fact.
  studies: [
    { room: 'shelter', text: 'NASA scientists study why astronauts can lose 10 to 15 % of their bone mass during spaceflight.', src: 'osdr_bone' },
    { room: 'shelter', text: 'In one NASA study, 14 volunteers stayed in bed for 21 days, so scientists could see how muscles change when they are not used.', src: 'osdr_bedrest' },
    { room: 'airlock', text: 'Long trips in space make muscles and bones weaker. On the Space Station, scientists tested a way to protect them.', src: 'osdr_muscle' },
    { room: 'greenhouse', text: 'Lettuce grown in NASA’s Veggie garden on the Space Station was brought back to Earth so scientists could check its nutrients and microbes.', src: 'osdr_lettuce' },
  ],

  // One real fact per room and world, shown when the player zooms into a room.
  // tag = the badge in front of it (default 'REAL NASA'). src = id in data/sources.js, or null if not attached yet.
  facts: {
    airlock: {
      moon: { text: 'On the Space Station, a spacewalk usually lasts between five and eight hours. The spacesuit gives the astronaut oxygen to breathe and water to drink.', src: 'nasa_spacewalk' },
      mars: { text: 'A spacesuit gives the astronaut oxygen to breathe and water to drink. That is why every trip outside uses suit air.', src: 'nasa_spacewalk' },
    },
    lab: {
      moon: { text: 'Between 1969 and 1972, six Apollo missions brought 382 kg of Moon rocks, sand and dust home for scientists to study.', src: 'apollo_samples' },
      mars: { text: 'NASA’s Perseverance rover landed in Jezero Crater in 2021. It collects rock samples that NASA plans to bring to labs on Earth.', src: 'perseverance_samples' },
    },
    greenhouse: {
      moon: { text: 'On the Space Station, NASA’s Veggie garden grew red romaine lettuce in 33 days. Growing ALL the food for one astronaut would need about 50 m² of plants!', src: 'veggie' },
      mars: { text: 'On the Space Station, NASA’s Veggie garden grew red romaine lettuce in 33 days. Growing ALL the food for one astronaut would need about 50 m² of plants!', src: 'veggie' },
    },
    shelter: {
      moon: { text: 'A 2024 study by Germany’s space agency (DLR) found that a few centimeters of moon soil block most of a big solar storm.', src: 'dlr_shielding', tag: 'REAL STUDY' },
      mars: { text: 'Mars’ thin air already blocks part of a storm. In May 2024, NASA’s Curiosity rover measured a storm at about 17× a normal day.', src: 'radlab_curiosity' },
    },
    oxygen: {
      moon: { text: 'The Space Station makes oxygen by splitting water with electricity. Each kg of oxygen uses about 1.1 kg of water.', src: 'model' },
      mars: { text: 'From 2021 to 2023, NASA’s MOXIE on the Perseverance rover made 122 grams of oxygen from the Martian air!', src: 'moxie' },
    },
    battery: {
      moon: { text: 'Batteries are heavy: storing power for a whole 2-week lunar night for this base would take about 25 tonnes of batteries!', src: 'model' },
      mars: { text: 'In 2018 a dust storm cut NASA’s Opportunity rover from 645 to 22 watt-hours a sol. Its battery ran out.', src: 'opportunity_2018' },
    },
  },
};
