// segments.js — divide la ruta en tramos (por distancia) para poder comparar
// primera mitad vs segunda mitad, o identificar el cuarto más duro/flojo.

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function meanOf(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }

// Añade distancia acumulada (km) a cada punto y devuelve la distancia total
function withCumulativeDistance(points) {
  let dist = 0;
  const out = [];
  let prev = null;
  for (const p of points) {
    if (prev) dist += haversine(prev.lat, prev.lon, p.lat, p.lon);
    out.push({ ...p, cumKm: dist / 1000 });
    prev = p;
  }
  return out;
}

export function computeSegments(points, n = 4) {
  const withDist = withCumulativeDistance(points);
  const totalKm = withDist.length ? withDist[withDist.length - 1].cumKm : 0;
  if (totalKm === 0) return [];

  const segments = [];
  for (let i = 0; i < n; i++) {
    const from = (totalKm / n) * i, to = (totalKm / n) * (i + 1);
    const seg = withDist.filter(p => p.cumKm >= from && p.cumKm < to + 0.0001);
    if (!seg.length) { segments.push(null); continue; }

    const powers = seg.map(p => p.power).filter(v => v != null);
    const hrs = seg.map(p => p.hr).filter(v => v != null && v > 0);
    const cads = seg.map(p => p.cadence).filter(v => v != null && v > 0);
    let gain = 0;
    for (let j = 1; j < seg.length; j++) {
      if (seg[j].ele != null && seg[j - 1].ele != null) {
        const d = seg[j].ele - seg[j - 1].ele;
        if (d > 0) gain += d;
      }
    }
    let segDist = 0;
    for (let j = 1; j < seg.length; j++) segDist += haversine(seg[j - 1].lat, seg[j - 1].lon, seg[j].lat, seg[j].lon);
    let segTimeS = (seg[0].time && seg[seg.length - 1].time) ? (seg[seg.length - 1].time - seg[0].time) / 1000 : null;

    segments.push({
      fromKm: from, toKm: to,
      avgPower: powers.length ? meanOf(powers) : null,
      avgHr: hrs.length ? meanOf(hrs) : null,
      avgCadence: cads.length ? meanOf(cads) : null,
      gainM: Math.round(gain),
      avgSpeedKmh: segTimeS ? (segDist / 1000) / (segTimeS / 3600) : null,
    });
  }
  return segments;
}

// Deriva de 4 segmentos: comparación primera mitad (0+1) vs segunda mitad (2+3)
export function compareHalves(segments) {
  if (segments.length !== 4 || segments.some(s => s == null)) return null;
  const avg = (a, b, key) => {
    const vals = [a?.[key], b?.[key]].filter(v => v != null);
    return vals.length ? meanOf(vals) : null;
  };
  return {
    firstHalf: { avgPower: avg(segments[0], segments[1], 'avgPower'), avgHr: avg(segments[0], segments[1], 'avgHr'), avgSpeedKmh: avg(segments[0], segments[1], 'avgSpeedKmh') },
    secondHalf: { avgPower: avg(segments[2], segments[3], 'avgPower'), avgHr: avg(segments[2], segments[3], 'avgHr'), avgSpeedKmh: avg(segments[2], segments[3], 'avgSpeedKmh') },
  };
}
