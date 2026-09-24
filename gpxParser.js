// gpxParser.js — parser de archivos .GPX (XML), sin dependencias externas.

export function parseGpxText(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const trkpts = Array.from(doc.getElementsByTagName('trkpt'));

  const getTag = (el, tag) => {
    const found = el.getElementsByTagName(tag)[0];
    return found ? found.textContent : null;
  };
  // extensiones tipo Garmin TrackPointExtension (hr, cad, atemp) buscando por sufijo de nombre local
  const getExt = (el, localName) => {
    const nodes = el.getElementsByTagName('*');
    for (const n of nodes) {
      if (n.localName === localName) return n.textContent;
    }
    return null;
  };

  const points = trkpts.map(pt => ({
    lat: parseFloat(pt.getAttribute('lat')),
    lon: parseFloat(pt.getAttribute('lon')),
    ele: getTag(pt, 'ele') != null ? parseFloat(getTag(pt, 'ele')) : null,
    time: getTag(pt, 'time') != null ? new Date(getTag(pt, 'time')) : null,
    hr: getExt(pt, 'hr') != null ? parseInt(getExt(pt, 'hr')) : null,
    cadence: getExt(pt, 'cad') != null ? parseInt(getExt(pt, 'cad')) : null,
    power: getExt(pt, 'power') != null ? parseInt(getExt(pt, 'power')) : null,
    temp: getExt(pt, 'atemp') != null ? parseFloat(getExt(pt, 'atemp')) : null,
  }));

  return { points, summary: { source: 'gpx' } };
}
