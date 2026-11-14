// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Real data that changes: fetched live when possible, otherwise the archived copy, always saying which.
// Every feed returns the same shape, so the game can label it without knowing where it came from:
//   { source: id in data/sources.js, status: 'LIVE' | 'ARCHIVED', note: short text for the label, ...the data }
// To add a feed (for example a second live source): write a function like sun() and add it to JAMT_FEEDS.
(function (root) {
  const D = root.JAMT_DATA, SIM = root.JAMT_SIM, SNAP = root.DATA_SNAPSHOT;
  const ymd = x => x.toISOString().slice(0, 10);

  // Today's Sun from NASA DONKI. query = the page's URL parameters:
  //   ?sun=may2024  the archived real week of 8–14 May 2024 · ?offline  skip the network (shows the archived snapshot)
  async function sun(query) {
    const src = D.sources.donki, end = new Date(), start = new Date(end - src.days * 864e5);
    const make = (status, note, flares, seps) => ({ source: 'donki', status, note, flares, seps, level: SIM.sunLevel(flares, seps) });
    if (query.get('sun') === 'may2024') return make('ARCHIVED', 'real week of 8–14 May 2024', SNAP.may2024.weekFlares, [{}]);
    try {
      if (query.has('offline')) throw 0;
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), src.timeoutMs);
      const url = k => src.api.replace('{type}', k).replace('{start}', ymd(start)).replace('{end}', ymd(end));
      const [f, s] = await Promise.all(src.types.map(k => fetch(url(k), { signal: ctl.signal }).then(r => { if (!r.ok) throw r.status; return r.json(); })));
      clearTimeout(tm);
      return make('LIVE', `fetched ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, f.map(x => ({ cls: x.classType, peak: x.peakTime })), s);
    } catch (e) {
      return make('ARCHIVED', `snapshot ${SNAP.snapshotOf} · couldn't reach NASA`, SNAP.flares, SNAP.seps);
    }
  }

  root.JAMT_FEEDS = { sun };
})(window);
