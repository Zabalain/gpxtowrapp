// computeStats.js — calcula todas las métricas a partir del array de puntos normalizado.

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dphi = toRad(lat2 - lat1);
  const dlambda = toRad(lon2 - lon1);
  const a = Math.sin(dphi / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dlambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function meanOf(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null; }
function maxOf(arr) { return arr.length ? Math.max(...arr) : null; }
function minOf(arr) { return arr.length ? Math.min(...arr) : null; }

// Potencia normalizada: media móvil de 30s elevada a la 4, raíz cuarta de su media (algoritmo estándar de Coggan)
function normalizedPower(powers) {
  const valid = powers.filter(p => p != null);
  if (valid.length < 30) return null;
  const window = 30;
  const rollingAvgs = [];
  let sum = valid.slice(0, window).reduce((a, b) => a + b, 0);
  rollingAvgs.push(sum / window);
  for (let i = window; i < valid.length; i++) {
    sum += valid[i] - valid[i - window];
    rollingAvgs.push(sum / window);
  }
  const meanFourth = meanOf(rollingAvgs.map(v => v ** 4));
  return meanFourth != null ? Math.pow(meanFourth, 0.25) : null;
}

export function computeStats(points, existingSummary = {}) {
  let distM = 0, gainM = 0, lossM = 0, movingS = 0, maxSpeed = 0;
  const speeds = [];
  let prev = null;

  for (const p of points) {
    if (prev) {
      const d = haversine(prev.lat, prev.lon, p.lat, p.lon);
      distM += d;
      if (p.ele != null && prev.ele != null) {
        const diff = p.ele - prev.ele;
        if (diff > 0) gainM += diff; else lossM += -diff;
      }
      if (prev.time && p.time) {
        const dt = (p.time - prev.time) / 1000;
        if (dt > 0) {
          const v = d / dt;
          if (v < 20) { // filtra saltos GPS irreales (>72 km/h)
            speeds.push(v);
            if (v > 0.5) movingS += dt;
            if (v > maxSpeed) maxSpeed = v;
          }
        }
      }
    }
    prev = p;
  }

  const hrs = points.map(p => p.hr).filter(v => v != null && v > 0);
  const powers = points.map(p => p.power).filter(v => v != null);
  const cads = points.map(p => p.cadence).filter(v => v != null && v > 0);
  const temps = points.map(p => p.temp).filter(v => v != null);

  // ---------- eficiencia de pedaleo ----------
  const balances = points.map(p => p.rightBalancePct).filter(v => v != null);
  const teL = points.map(p => p.torqueEffL).filter(v => v != null);
  const teR = points.map(p => p.torqueEffR).filter(v => v != null);
  const smL = points.map(p => p.smoothL).filter(v => v != null);
  const smR = points.map(p => p.smoothR).filter(v => v != null);
  const smC = points.map(p => p.smoothCombined).filter(v => v != null);

  // el torque effectiveness a veces se define pero el sensor solo manda ceros: lo tratamos como no disponible
  const teLValid = teL.length && teL.some(v => v > 0);
  const teRValid = teR.length && teR.some(v => v > 0);
  const avgRightBalance = balances.length ? meanOf(balances) : null;

  const pedaling = (balances.length || teLValid || teRValid || smL.length || smR.length || smC.length) ? {
    rightBalancePct: avgRightBalance,
    leftBalancePct: avgRightBalance != null ? 100 - avgRightBalance : null,
    balanceSamples: balances.length,
    torqueEffLPct: teLValid ? meanOf(teL) : null,
    torqueEffRPct: teRValid ? meanOf(teR) : null,
    smoothLPct: smL.length ? meanOf(smL) : null,
    smoothRPct: smR.length ? meanOf(smR) : null,
    smoothCombinedPct: smC.length ? meanOf(smC) : null,
  } : null;

  const totalElapsedS = (points[0]?.time && points[points.length - 1]?.time)
    ? (points[points.length - 1].time - points[0].time) / 1000 : null;

  const np = existingSummary.normalizedPowerW ?? normalizedPower(powers);

  return {
    distanceKm: existingSummary.totalDistanceM != null ? existingSummary.totalDistanceM / 1000 : distM / 1000,
    elevationGainM: existingSummary.totalAscentM ?? Math.round(gainM),
    elevationLossM: existingSummary.totalDescentM ?? Math.round(lossM),
    totalElapsedH: existingSummary.totalElapsedS != null ? existingSummary.totalElapsedS / 3600 : (totalElapsedS != null ? totalElapsedS / 3600 : null),
    movingH: existingSummary.totalMovingS != null ? existingSummary.totalMovingS / 3600 : movingS / 3600,
    avgSpeedKmh: (existingSummary.totalDistanceM != null && existingSummary.totalMovingS)
      ? (existingSummary.totalDistanceM / 1000) / (existingSummary.totalMovingS / 3600)
      : (movingS ? (distM / 1000) / (movingS / 3600) : null),
    maxSpeedKmh: maxSpeed * 3.6,
    avgHr: existingSummary.avgHr ?? (hrs.length ? Math.round(meanOf(hrs)) : null),
    maxHr: existingSummary.maxHr ?? maxOf(hrs),
    avgPowerW: existingSummary.avgPowerW ?? (powers.length ? Math.round(meanOf(powers)) : null),
    maxPowerW: existingSummary.maxPowerW ?? maxOf(powers),
    normalizedPowerW: np != null ? Math.round(np) : null,
    intensityFactor: existingSummary.intensityFactor ?? null,
    trainingStressScore: existingSummary.trainingStressScore ?? null,
    ftpW: existingSummary.ftpW ?? null,
    avgCadence: existingSummary.avgCadence ?? (cads.length ? Math.round(meanOf(cads)) : null),
    maxCadence: existingSummary.maxCadence ?? maxOf(cads),
    avgTempC: existingSummary.avgTempC ?? (temps.length ? Math.round(meanOf(temps)) : null),
    maxTempC: existingSummary.maxTempC ?? maxOf(temps),
    minTempC: minOf(temps),
    calories: existingSummary.calories ?? null,
    pedaling,
    hasPower: powers.length > 0,
    hasHr: hrs.length > 0,
    hasCadence: cads.length > 0,
    hasTemp: temps.length > 0,
    hasElevation: points.some(p => p.ele != null),
    nPoints: points.length,
  };
}
