import { parseGpxText } from './gpxParser.js';
import { parseFitBuffer, fitMessagesToActivity } from './fitParser.js';
import { computeStats } from './computeStats.js';
import { buildSlidesFromStats, renderWrapped } from './wrappedEngine.js';
import { buildRouteImageDataUrl } from './routeImage.js';
import { buildStandaloneHtml } from './standaloneExport.js';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileStatus = document.getElementById('fileStatus');
const imgDropZone = document.getElementById('imgDropZone');
const imgInput = document.getElementById('imgInput');
const imgStatus = document.getElementById('imgStatus');
const generateBtn = document.getElementById('generateBtn');
const errorMsg = document.getElementById('errorMsg');
const uploadScreen = document.getElementById('uploadScreen');
const stage = document.getElementById('stage');

let trackFile = null;
let coverImageDataUrl = null; // foto subida por el usuario, si la hay

function showError(msg) { errorMsg.textContent = msg; }

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupDropZone(zone, onFile) {
  ['dragenter', 'dragover'].forEach(ev =>
    zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('dragover'); })
  );
  ['dragleave', 'drop'].forEach(ev =>
    zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('dragover'); })
  );
  zone.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) onFile(f); });
}

setupDropZone(dropZone, f => { trackFile = f; fileStatus.textContent = '✓ ' + f.name; generateBtn.disabled = false; });
setupDropZone(imgDropZone, async f => {
  coverImageDataUrl = await readFileAsDataUrl(f);
  imgStatus.textContent = '✓ ' + f.name;
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) { trackFile = e.target.files[0]; fileStatus.textContent = '✓ ' + trackFile.name; generateBtn.disabled = false; }
});
imgInput.addEventListener('change', async e => {
  if (e.target.files[0]) { coverImageDataUrl = await readFileAsDataUrl(e.target.files[0]); imgStatus.textContent = '✓ ' + e.target.files[0].name; }
});

generateBtn.addEventListener('click', () => handleFile(trackFile));

let lastSlides = null, lastTitle = null;

async function handleFile(file) {
  if (!file) return;
  showError('');
  const name = file.name.toLowerCase();
  try {
    let points, summary, title;
    if (name.endsWith('.gpx')) {
      const text = await file.text();
      ({ points, summary } = parseGpxText(text));
      title = file.name.replace(/\.gpx$/i, '');
    } else if (name.endsWith('.fit')) {
      const buffer = await file.arrayBuffer();
      const messages = parseFitBuffer(buffer);
      ({ points, summary } = fitMessagesToActivity(messages));
      title = file.name.replace(/\.fit$/i, '');
    } else {
      showError('Formato no soportado todavía. Sube un .gpx o un .fit.');
      return;
    }

    if (!points || points.length < 2) {
      showError('No se ha podido leer ningún punto de ruta en este archivo.');
      return;
    }

    const stats = computeStats(points, summary);
    // portada: la foto subida, o si no hay, el dibujo del propio track
    const cover = coverImageDataUrl || buildRouteImageDataUrl(points);
    const slides = buildSlidesFromStats(stats, title, cover, points);
    lastSlides = slides; lastTitle = title;

    uploadScreen.classList.add('hidden');
    stage.classList.remove('hidden');
    renderWrapped(stage, slides, {
      onSave: saveAsFile,
      onShare: shareWrapped,
    });
  } catch (err) {
    console.error(err);
    showError('Algo ha fallado leyendo el archivo: ' + err.message);
  }
}

function buildFile() {
  const html = buildStandaloneHtml(lastSlides, lastTitle);
  const safe = (lastTitle || 'resumen').replace(/[^a-z0-9\-_]+/gi, '-').toLowerCase();
  return new File([html], `resumen-ruta-${safe}.html`, { type: 'text/html' });
}

function saveAsFile() {
  const file = buildFile();
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function shareWrapped() {
  const file = buildFile();
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: lastTitle || 'Mi resumen de ruta', text: 'Mira el resumen de mi ruta' });
      return;
    } catch (e) {
      // el usuario canceló el share, o el navegador lo rechazó: caemos a la descarga
    }
  }
  saveAsFile();
}
