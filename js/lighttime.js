// AI use: written with Claude (Anthropic), an AI assistant, for a NASA Space Apps Challenge 2026 entry. See README.md
// Earth–Mars one-way light-time for a given date, from NASA JPL "Approximate Positions of the
// Planets" (E.M. Standish), Table 1, valid 1800–2050. https://ssd.jpl.nasa.gov/planets/approx_pos.html
// MODEL row DS-04. Pure function; works in the browser and in Node.
(function (root) {
  const EL = {
    earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0],
    mars:  [1.52371034, 0.00001847, 0.09339410,  0.00007882,  1.84969142, -0.00813131,  -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  };
  const rad = d => d * Math.PI / 180;
  function position(body, T) {
    const e0 = EL[body];
    const a = e0[0] + e0[1] * T, e = e0[2] + e0[3] * T, I = e0[4] + e0[5] * T;
    const L = e0[6] + e0[7] * T, w̃ = e0[8] + e0[9] * T, Om = e0[10] + e0[11] * T;
    const w = w̃ - Om; let M = (L - w̃) % 360; if (M > 180) M -= 360; if (M < -180) M += 360;
    let E = rad(M) + e * Math.sin(rad(M));
    for (let k = 0; k < 20; k++) { const dE = (rad(M) - (E - e * Math.sin(E))) / (1 - e * Math.cos(E)); E += dE; if (Math.abs(dE) < 1e-12) break; }
    const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const cw = Math.cos(rad(w)), sw = Math.sin(rad(w)), cO = Math.cos(rad(Om)), sO = Math.sin(rad(Om)), cI = Math.cos(rad(I)), sI = Math.sin(rad(I));
    return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
            (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
            (sw * sI) * xp + (cw * sI) * yp];
  }
  function earthMarsLightTime(date) {
    const jd = date.getTime() / 86400000 + 2440587.5, T = (jd - 2451545.0) / 36525;
    const p = position('earth', T), q = position('mars', T);
    const au = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    const km = au * 149597870.7;
    return { au, km, seconds: km / 299792.458 };
  }
  // Mars–Sun distance today, and how bright the sunshine is compared with Mars' average distance (inverse-square law).
  function marsSun(date) {
    const jd = date.getTime() / 86400000 + 2440587.5, T = (jd - 2451545.0) / 36525, q = position('mars', T);
    const au = Math.hypot(q[0], q[1], q[2]), a = EL.mars[0] + EL.mars[1] * T;
    return { au, factor: (a / au) * (a / au) };
  }
  root.LightTime = { earthMarsLightTime, marsSun };
  if (typeof module !== 'undefined') module.exports = root.LightTime;
})(typeof window !== 'undefined' ? window : globalThis);
