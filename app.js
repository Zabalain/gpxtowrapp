import { parseGpxText } from './gpxParser.js';
import { parseFitBuffer, fitMessagesToActivity } from './fitParser.js';
import { computeStats } from './computeStats.js';
import { buildSlidesFromStats, renderWrapped } from './wrappedEngine.js';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const errorMsg = document.getElementById('errorMsg');
const uploadScreen = document.getElementById('uploadScreen');
const stage = document.getElementById('stage');

function showError(msg) { errorMsg.textContent = msg; }

async function handleFile(file) {
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
    const slides = buildSlidesFromStats(stats, title);

    uploadScreen.classList.add('hidden');
    stage.classList.remove('hidden');
    renderWrapped(stage, slides);
  } catch (err) {
    console.error(err);
    showError('Algo ha fallado leyendo el archivo: ' + err.message);
  }
}

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

['dragenter', 'dragover'].forEach(ev =>
  dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); })
);
['dragleave', 'drop'].forEach(ev =>
  dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('dragover'); })
);
dropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
