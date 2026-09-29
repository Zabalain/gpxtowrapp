// elevation.js — desnivel acumulado con "zona muerta".
// Sumar cada diferencia de altitud punto a punto cuenta como subida el ruido del altímetro
// (en nuestras pruebas inflaba el desnivel entre un 25% y un 31% respecto al dato oficial).
// Solo se contabiliza un cambio cuando se aleja al menos DEADBAND_M metros de la última
// altitud de referencia. 1,25 m se calibró contra dos fuentes independientes:
// 11 GPX con total oficial de Strava (+3,3%) y un FIT con el total del propio dispositivo (-2,2%).

export const DEADBAND_M = 1.25;

export function elevationGainLoss(points, threshold = DEADBAND_M) {
  let ref = null, gain = 0, loss = 0;
  for (const p of points) {
    if (p.ele == null) continue;
    if (ref == null) { ref = p.ele; continue; }
    const d = p.ele - ref;
    if (d >= threshold) { gain += d; ref = p.ele; }
    else if (d <= -threshold) { loss += -d; ref = p.ele; }
  }
  return { gain, loss };
}
