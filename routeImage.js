// routeImage.js — dibuja el track GPS como una imagen SVG, para usar de portada
// cuando el usuario no sube su propia foto.

export function buildRouteImageDataUrl(points, { color = '#e8a866', bg = '#1c1710' } = {}) {
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

// Dibuja el track como SVG en línea (para insertar directamente en el HTML de una diapositiva)
export function buildRouteLineSvg(points, { color = '#c97a2e', width = 300, height = 170 } = {}) {
  const pts = points.filter(p => p.lat != null && p.lon != null);
  if (pts.length < 2) return '';

  const lats = pts.map(p => p.lat), lons = pts.map(p => p.lon);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const latMid = (latMin + latMax) / 2;
  const mLat = 110.54, mLon = 111.32 * Math.cos(latMid * Math.PI / 180);
  const toXY = (lat, lon) => [(lon - lonMin) * mLon, (latMax - lat) * mLat];

  let xMax = 0, yMax = 0;
  pts.forEach(p => { const [x, y] = toXY(p.lat, p.lon); if (x > xMax) xMax = x; if (y > yMax) yMax = y; });
  const pad = Math.max(xMax, yMax) * 0.1 || 1;
  const vbW = xMax + pad * 2, vbH = yMax + pad * 2;

  const step = Math.max(1, Math.floor(pts.length / 500));
  const sampled = pts.filter((_, i) => i % step === 0);
  const coords = sampled.map(p => { const [x, y] = toXY(p.lat, p.lon); return `${(x + pad).toFixed(2)},${(y + pad).toFixed(2)}`; }).join(' ');
  const strokeW = Math.max(vbW, vbH) * 0.015;
  const start = toXY(pts[0].lat, pts[0].lon), end = toXY(pts[pts.length - 1].lat, pts[pts.length - 1].lon);

  return `<svg viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet">` +
    `<polyline points="${coords}" fill="none" stroke="${color}" stroke-width="${strokeW.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${(start[0] + pad).toFixed(2)}" cy="${(start[1] + pad).toFixed(2)}" r="${(strokeW * 1.8).toFixed(2)}" fill="${color}" opacity="0.55"/>` +
    `<circle cx="${(end[0] + pad).toFixed(2)}" cy="${(end[1] + pad).toFixed(2)}" r="${(strokeW * 1.8).toFixed(2)}" fill="${color}"/>` +
    `</svg>`;
}

// Dibuja el perfil de elevación como SVG en línea (área + línea)
export function buildElevationProfileSvg(points, { color = '#c97a2e', fill = 'rgba(201,122,46,0.18)', width = 300, height = 90 } = {}) {
  const eles = points.map(p => p.ele).filter(e => e != null);
  if (eles.length < 2) return '';

  const step = Math.max(1, Math.floor(eles.length / 400));
  const sampled = eles.filter((_, i) => i % step === 0);
  const min = Math.min(...sampled), max = Math.max(...sampled);
  const range = (max - min) || 1;
  const n = sampled.length;
  const pts = sampled.map((e, i) => {
    const x = (i / (n - 1)) * width;
    const y = height - ((e - min) / range) * height * 0.85 - height * 0.08;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPts = `0,${height} ${pts.join(' ')} ${width},${height}`;

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="none">` +
    `<polygon points="${areaPts}" fill="${fill}" stroke="none"/>` +
    `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>` +
    `</svg>`;
}
