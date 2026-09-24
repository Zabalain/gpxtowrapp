// routeImage.js — dibuja el track GPS como una imagen SVG, para usar de portada
// cuando el usuario no sube su propia foto.

export function buildRouteImageDataUrl(points, { color = '#e8a33d', bg = '#1c222c' } = {}) {
  const pts = points.filter(p => p.lat != null && p.lon != null);
  if (pts.length < 2) return null;

  const lats = pts.map(p => p.lat), lons = pts.map(p => p.lon);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const latMid = (latMin + latMax) / 2;
  const mLat = 110.54, mLon = 111.32 * Math.cos(latMid * Math.PI / 180);
  const toXY = (lat, lon) => [(lon - lonMin) * mLon, (latMax - lat) * mLat];

  let xMax = 0, yMax = 0;
  pts.forEach(p => { const [x, y] = toXY(p.lat, p.lon); if (x > xMax) xMax = x; if (y > yMax) yMax = y; });
  const pad = Math.max(xMax, yMax) * 0.12 || 1;
  const vbW = xMax + pad * 2, vbH = yMax + pad * 2;

  // muestreo a un máximo de ~600 puntos para no generar un SVG gigante
  const step = Math.max(1, Math.floor(pts.length / 600));
  const sampled = pts.filter((_, i) => i % step === 0);
  const coords = sampled.map(p => { const [x, y] = toXY(p.lat, p.lon); return `${(x + pad).toFixed(2)},${(y + pad).toFixed(2)}`; }).join(' ');
  const strokeW = Math.max(vbW, vbH) * 0.012;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    `<polyline points="${coords}" fill="none" stroke="${color}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;

  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
