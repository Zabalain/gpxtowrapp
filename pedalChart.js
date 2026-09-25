// pedalChart.js — gráfico de dispersión del balance izq/dcha muestra a muestra,
// para poder verificar a simple vista que la lectura del sensor tiene sentido.

export function buildBalanceScatterSvg(points, { width = 300, height = 140, color = '#c17a2e' } = {}) {
  const samples = points
    .map((p, i) => ({ i, v: p.rightBalancePct }))
    .filter(s => s.v != null);
  if (samples.length < 5) return '';

  const n = samples.length;
  const padL = 26, padR = 6, padT = 8, padB = 18;
  const plotW = width - padL - padR, plotH = height - padT - padB;

  const x = i => padL + (i / (n - 1)) * plotW;
  const y = v => padT + (1 - v / 100) * plotH;

  const dots = samples.map(s => `<circle cx="${x(s.i).toFixed(1)}" cy="${y(s.v).toFixed(1)}" r="1.3" fill="${color}" opacity="0.45"/>`).join('');
  const avg = samples.reduce((a, s) => a + s.v, 0) / n;

  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    // líneas de referencia 0/50/100%
    `<line x1="${padL}" y1="${y(50).toFixed(1)}" x2="${width - padR}" y2="${y(50).toFixed(1)}" stroke="currentColor" stroke-width="1" stroke-dasharray="3,3" opacity="0.35"/>` +
    `<text x="2" y="${(y(50) + 3).toFixed(1)}" font-size="8" fill="currentColor" opacity="0.55">50%</text>` +
    `<text x="2" y="${(y(100) + 8).toFixed(1)}" font-size="8" fill="currentColor" opacity="0.55">100%</text>` +
    `<text x="2" y="${(y(0)).toFixed(1)}" font-size="8" fill="currentColor" opacity="0.55">0%</text>` +
    dots +
    `<line x1="${padL}" y1="${y(avg).toFixed(1)}" x2="${width - padR}" y2="${y(avg).toFixed(1)}" stroke="${color}" stroke-width="1.6"/>` +
    `</svg>`;
}
