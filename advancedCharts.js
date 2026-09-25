// advancedCharts.js — gráfica de pulso coloreada por zona de intensidad,
// y gráfica de velocidad superpuesta sobre el perfil de elevación.

const ZONE_COLORS = ['#4c6575', '#5f6e42', '#c17a2e', '#9a4419', '#7a1f10'];
// Z1 muy suave · Z2 suave · Z3 moderado · Z4 dura · Z5 muy dura (relativas al pico de ESTA ruta)

function zoneOf(hr, minHr, maxHr) {
  const range = maxHr - minHr || 1;
  const pct = (hr - minHr) / range; // 0..1 dentro del rango visto en esta ruta
  if (pct < 0.45) return 0;
  if (pct < 0.62) return 1;
  if (pct < 0.78) return 2;
  if (pct < 0.92) return 3;
  return 4;
}

export function buildHrZoneChart(points, { width = 300, height = 110 } = {}) {
  const samples = points.map((p, i) => ({ i, hr: p.hr })).filter(s => s.hr != null && s.hr > 0);
  if (samples.length < 10) return '';

  const step = Math.max(1, Math.floor(samples.length / 400));
  const ds = samples.filter((_, i) => i % step === 0);
  const hrs = ds.map(s => s.hr);
  const minHr = Math.min(...hrs), maxHr = Math.max(...hrs);
  const n = ds.length;

  const padB = 16;
  const x = i => (i / (n - 1)) * width;
  const y = hr => padB + (1 - (hr - minHr) / ((maxHr - minHr) || 1)) * (height - padB - 4);

  let segs = '';
  for (let i = 1; i < n; i++) {
    const z = zoneOf((ds[i].hr + ds[i - 1].hr) / 2, minHr, maxHr);
    segs += `<line x1="${x(i - 1).toFixed(1)}" y1="${y(ds[i - 1].hr).toFixed(1)}" x2="${x(i).toFixed(1)}" y2="${y(ds[i].hr).toFixed(1)}" stroke="${ZONE_COLORS[z]}" stroke-width="2.4" stroke-linecap="round"/>`;
  }

  const legend = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z, i) =>
    `<circle cx="${8 + i * 40}" cy="${height - 4}" r="3" fill="${ZONE_COLORS[i]}"/><text x="${14 + i * 40}" y="${height - 1}" font-size="8" fill="currentColor" opacity="0.6">${z}</text>`
  ).join('');

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${segs}${legend}</svg>`;
}

export function buildSpeedOverElevationChart(points, { width = 300, height = 130, eleColor = 'rgba(193,122,46,0.22)', speedColor = '#4c6575' } = {}) {
  const withEle = points.filter(p => p.ele != null);
  const withSpeed = [];
  let prev = null, cumM = 0;
  for (const p of points) {
    if (prev && prev.time && p.time) {
      const dt = (p.time - prev.time) / 1000;
      if (dt > 0 && p.lat != null && p.lon != null && prev.lat != null) {
        const R = 6371000, toRad = d => d * Math.PI / 180;
        const dphi = toRad(p.lat - prev.lat), dl = toRad(p.lon - prev.lon);
        const a = Math.sin(dphi / 2) ** 2 + Math.cos(toRad(prev.lat)) * Math.cos(toRad(p.lat)) * Math.sin(dl / 2) ** 2;
        const d = 2 * R * Math.asin(Math.sqrt(a));
        cumM += d;
        const v = (d / dt) * 3.6; // km/h
        if (v < 90) withSpeed.push({ idx: withSpeed.length, kmh: v, cumM });
      }
    }
    prev = p;
  }
  if (withEle.length < 10 || withSpeed.length < 10) return '';

  const stepE = Math.max(1, Math.floor(withEle.length / 300));
  const dsE = withEle.filter((_, i) => i % stepE === 0);
  const elevs = dsE.map(p => p.ele);
  const minE = Math.min(...elevs), maxE = Math.max(...elevs);
  const rangeE = (maxE - minE) || 1;

  const stepS = Math.max(1, Math.floor(withSpeed.length / 300));
  const dsS = withSpeed.filter((_, i) => i % stepS === 0);
  // suavizado simple (media móvil de 5) para que la línea de velocidad no sea un serrucho
  const smoothed = dsS.map((s, i, arr) => {
    const win = arr.slice(Math.max(0, i - 2), i + 3);
    return win.reduce((a, w) => a + w.kmh, 0) / win.length;
  });
  const maxV = Math.max(...smoothed), minV = 0;

  const nE = dsE.length, nS = smoothed.length;
  const areaPts = dsE.map((p, i) => {
    const x = (i / (nE - 1)) * width;
    const y = height - ((p.ele - minE) / rangeE) * height * 0.8 - height * 0.05;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const speedPts = smoothed.map((v, i) => {
    const x = (i / (nS - 1)) * width;
    const y = height - (v / (maxV || 1)) * height * 0.85 - height * 0.05;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none">` +
    `<polygon points="0,${height} ${areaPts.join(' ')} ${width},${height}" fill="${eleColor}" stroke="none"/>` +
    `<polyline points="${speedPts.join(' ')}" fill="none" stroke="${speedColor}" stroke-width="1.8" vector-effect="non-scaling-stroke"/>` +
    `</svg>`;
}
