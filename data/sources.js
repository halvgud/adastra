// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Every real-data source the game uses, in one place.
// The 📚 screen, the badges, the share picture and the README table (see tests.html) are built from this list.
//
// To add a source (for example one from the official Resources tab):
//   1. Add an entry below. Use only links you have opened and checked.
//   2. Point to it by id from an event (data/missions.js → src.ids) or a fact (data/text.js → src).
//   3. If it is a live feed, add a small adapter in js/feeds.js that returns { source, status, note, ... }.
//   4. Open tests.html: it fails if an id is misspelled or an in-game source is never used.
//
// kind: 'live'       fetched when the game opens; falls back to an archived copy and says so
//       'archived'   a dated copy embedded in the game (never shown as live)
//       'calculated' computed in the browser from published constants
//       'published'  numbers or findings from a report or paper
// model: the row or source id in docs/MODEL.md. short: the word used on the share picture.
// official: true = it is on the Resources tab of the challenge page. inGame: false = listed, but nothing in the game uses it yet.
window.JAMT_DATA = window.JAMT_DATA || {};
JAMT_DATA.sources = {
  donki: {
    name: 'NASA DONKI', full: 'Space Weather Database Of Notifications, Knowledge, Information (NASA CCMC)', agency: 'NASA', short: 'DONKI',
    kind: 'live', model: 'DS-01', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/', feature: 'sun', official: true,
    api: 'https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{type}?startDate={start}&endDate={end}', types: ['FLR', 'SEP'], days: 7, timeoutMs: 5000,
    archive: 'data/donki-snapshot.js',
    usedFor: 'The Sun’s face in the sky, and how big solar storms are in your missions.',
  },
  radlab_biosentinel: {
    name: 'NASA OSDR RadLab · BioSentinel', full: 'NASA Open Science Data Repository, RadLab: BPD detector on BioSentinel (deep space)', agency: 'NASA', short: 'OSDR',
    kind: 'archived', retrieved: '2026-10-28', model: 'DS-03', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', feature: 'chart', official: true,
    archive: 'data/donki-snapshot.js',
    usedFor: 'The real solar storm of May 2024 in deep space: up to 57× a normal day of radiation.',
  },
  radlab_curiosity: {
    name: 'NASA OSDR RadLab · Curiosity RAD', full: 'NASA Open Science Data Repository, RadLab: RAD detector on the Curiosity rover (Mars surface)', agency: 'NASA', short: 'OSDR',
    kind: 'archived', retrieved: '2026-10-28', model: 'DS-02', url: 'https://visualization.osdr.nasa.gov/radlab/gui/data-api/', feature: 'chart', official: true,
    archive: 'data/donki-snapshot.js',
    usedFor: 'The same May 2024 storm on the surface of Mars: about 17× a normal sol.',
  },
  jpl_planets: {
    name: 'NASA JPL “Approximate Positions of the Planets”', agency: 'NASA', short: 'JPL',
    kind: 'calculated', model: 'DS-04', url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html', feature: 'radio',
    usedFor: 'How long a radio message takes between Earth and Mars today.',
  },
  opportunity_2018: {
    name: 'NASA’s Opportunity rover, 2018 dust storm', full: 'Opportunity energy figures as reported by The Planetary Society, MER update (Aug 2018)', agency: 'NASA rover data',
    kind: 'published', model: 'PW-05 (S13), PW-06', url: 'https://www.planetary.org/articles/08-mer-update-opportunity-sleeps',
    usedFor: 'The Mars dust storm: solar power fell from 645 to 22 watt-hours a sol.',
  },
  tilt_arrays: {
    name: 'NASA/TM-2017-219467', full: 'Gibson et al., NASA’s Kilopower Reactor Development and the Path to Higher Power Missions', agency: 'NASA',
    kind: 'published', model: 'S15', url: 'https://ntrs.nasa.gov/api/citations/20170011067/downloads/20170011067.pdf',
    usedFor: 'The idea of tilting Mars solar panels to shed dust. The exact numbers are game rules.',
  },
  dlr_shielding: {
    name: 'Matthiä & Berger (DLR), 2024', full: 'Radiation Exposure and Shielding Effects on the Lunar Surface, Space Weather (2024)', agency: 'DLR (Germany)',
    kind: 'published', model: 'S7', url: 'https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2024SW004095',
    usedFor: 'How much radiation a few centimeters of moon soil block in a solar storm.',
  },
  veggie: {
    name: 'NASA Veggie on the Space Station', full: 'Massa et al., VEG-01: Veggie Hardware Validation Testing on the ISS', agency: 'NASA',
    kind: 'published', model: 'FD-02 · S30', url: 'https://ntrs.nasa.gov/citations/20160004060',
    usedFor: 'How long lettuce takes to grow in space.',
  },
  moxie: {
    name: 'NASA MOXIE on Perseverance', full: 'NASA, Perseverance science highlights (MOXIE)', agency: 'NASA',
    kind: 'published', model: 'IS-04 · S25', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/science-highlights/',
    usedFor: 'Making oxygen from the air of Mars.',
  },
  model: {
    name: 'NASA studies and reports', full: 'Life support, power, radiation and food numbers; every row and its source is listed in docs/MODEL.md', agency: 'NASA and others',
    kind: 'published', model: 'all rows', url: 'docs/MODEL.md', feature: 'numbers',
    usedFor: 'Air, water, food, power and radiation numbers in the simulation.',
  },
  // Pages opened and checked on 2026-11-13 (the sentence each fact uses is on the page).
  csa_food: {
    name: 'Canadian Space Agency · Food production', full: 'Growing healthy food in space and in remote areas (from the CSA toolkit "Food production on the Moon and in remote areas")', agency: 'CSA (Canada)',
    kind: 'published', model: '—', url: 'https://www.asc-csa.gc.ca/eng/sciences/food-production/growing-healthy-food-in-space-and-remote-areas.asp', official: true,
    usedFor: 'Why food must be packed for the whole mission: far from Earth, cargo ships come rarely or not at all.',
  },
  nasa_dust_storms: {
    name: 'NASA · The Fact and Fiction of Martian Dust Storms', agency: 'NASA', kind: 'published', model: 'EV-02 · S33',
    url: 'https://www.nasa.gov/solar-system/the-fact-and-fiction-of-martian-dust-storms/',
    usedFor: 'How often global dust storms happen on Mars, and how long they last.',
  },
  apollo_samples: {
    name: 'NASA · Lunar Rocks and Soils from Apollo Missions', agency: 'NASA', kind: 'published', model: '—', url: 'https://curator.jsc.nasa.gov/lunar/',
    usedFor: 'The 382 kg of Moon rocks the Apollo astronauts brought home.',
  },
  perseverance_samples: {
    name: 'NASA · Mars Rock Samples (Perseverance)', agency: 'NASA', kind: 'published', model: '—', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/',
    usedFor: 'The rock samples the Perseverance rover collects, after landing in Jezero Crater in 2021.',
  },
  nasa_spacewalk: {
    name: 'NASA · What Is a Spacewalk?', agency: 'NASA', kind: 'published', model: '—', url: 'https://www.nasa.gov/learning-resources/for-kids-and-students/what-is-a-spacewalk-grades-5-8/',
    usedFor: 'How long spacewalks last, and what a spacesuit gives the astronaut.',
  },

  // On the official Resources tab of the challenge (read 2026-11-13), but not used in the game yet.
  nasa_open_apis: {
    name: 'NASA Open APIs', agency: 'NASA', kind: 'live', model: '—', url: 'https://api.nasa.gov/', inGame: false, official: true,
    usedFor: 'Portal with a free key for NASA data. The game reads DONKI straight from NASA CCMC, which needs no key.',
  },
  osdr_search: {
    name: 'NASA Open Science Data Repository (OSDR)', agency: 'NASA', kind: 'live', model: '—', url: 'https://osdr.nasa.gov/bio/repo/', inGame: false, official: true,
    usedFor: 'Space biology and astronaut health studies. Idea: a "real study" card about bones, muscles or sleep.',
  },
  mars_trek: {
    name: 'NASA Mars Trek', agency: 'NASA', kind: 'published', model: '—', url: 'https://trek.nasa.gov/mars/', official: true, feature: 'place',
    usedFor: 'Real Mars maps: the "Where is your base?" card links to it, to explore Jezero Crater.',
  },
  perseverance_mission: {
    name: 'NASA · Mars 2020: Perseverance Rover', agency: 'NASA', kind: 'published', model: '—', url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    usedFor: 'Where the Mars base is: Jezero Crater, where Perseverance landed on 18 February 2021, once flooded with water.',
  },
  lunar_poles: {
    name: 'Gläser et al., Illumination conditions at the lunar poles (2018)', agency: 'NASA (NTRS)', kind: 'published', model: 'TR-03 · S14',
    url: 'https://ntrs.nasa.gov/api/citations/20170007365/downloads/20170007365.pdf',
    usedFor: 'Where the Moon base is: near the south pole, where the best ridges get sunlight about 88 % of the time.',
  },
  csa_stem: {
    name: 'Canadian Space Agency · Space resources for STEM and youth organizations', agency: 'CSA (Canada)', kind: 'published', model: '—',
    url: 'https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp', inGame: false, official: true,
    usedFor: 'Activities for educators. Idea: link them from a page for teachers.',
  },

  // Tested and ready as a backup for DONKI, but not wired into the game yet.
  noaa_swpc: {
    name: 'NOAA SWPC GOES feeds', agency: 'NOAA', kind: 'live', model: 'DS-05', url: 'https://services.swpc.noaa.gov/json/', inGame: false,
    usedFor: 'Backup live feed for solar flares if DONKI is down (must be labeled NOAA).',
  },
};
