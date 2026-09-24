// wrappedEngine.js — construye y anima el "story" a pantalla completa a partir de una lista de slides.

export function buildSlidesFromStats(stats, title) {
  const fmt = (n, d = 0) => n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const slides = [];

  slides.push({
    kicker: 'Tu Wrapped', headline: title || 'Tu actividad',
    body: `<div class="sub">Generado a partir de tu archivo, directamente en el navegador. Toca para empezar &rarr;</div>`
  });

  slides.push({
    kicker: 'Distancia', headline: 'Recorriste',
    body: `<div class="big num">${fmt(stats.distanceKm, 1)}</div><div class="unit">kilómetros</div>
      <div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.totalElapsedH, 2)}</div><div class="l">h totales</div></div>
        <div class="stat-col"><div class="n num">${fmt(stats.movingH, 2)}</div><div class="l">h en marcha</div></div>
      </div>`
  });

  if (stats.hasElevation) {
    slides.push({
      kicker: 'Desnivel', headline: 'Subiste',
      body: `<div class="big num">${fmt(stats.elevationGainM, 0)}</div><div class="unit">metros</div>
        <div class="sub">Y bajaste ${fmt(stats.elevationLossM, 0)} m.</div>`
    });
  }

  slides.push({
    kicker: 'Velocidad', headline: 'A qué ritmo fuiste',
    body: `<div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.avgSpeedKmh, 1)}</div><div class="l">km/h de media</div></div>
        <div class="stat-col"><div class="n num">${fmt(stats.maxSpeedKmh, 1)}</div><div class="l">km/h de pico</div></div>
      </div>`
  });

  if (stats.hasPower) {
    slides.push({
      kicker: 'Potencia', headline: 'Lo que diste al pedal',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgPowerW, 0)}</div><div class="l">W de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxPowerW, 0)}</div><div class="l">W de pico</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.normalizedPowerW, 0)}</div><div class="l">W normalizada</div></div>
        </div>`
    });
    if (stats.intensityFactor != null) {
      slides.push({
        kicker: 'Intensidad', headline: 'Cuánto te costó',
        body: `<div class="stat-row">
            <div class="stat-col"><div class="n num">${fmt(stats.intensityFactor, 3)}</div><div class="l">Intensity Factor</div></div>
            <div class="stat-col"><div class="n num">${fmt(stats.trainingStressScore, 1)}</div><div class="l">TSS</div></div>
            ${stats.ftpW ? `<div class="stat-col"><div class="n num">${fmt(stats.ftpW, 0)}</div><div class="l">W tu FTP</div></div>` : ''}
          </div>`
      });
    }
  }

  if (stats.hasHr) {
    slides.push({
      kicker: 'Frecuencia cardíaca', headline: 'Tu corazón',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgHr, 0)}</div><div class="l">ppm de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxHr, 0)}</div><div class="l">ppm máxima</div></div>
        </div>`
    });
  }

  if (stats.hasTemp) {
    slides.push({
      kicker: 'Temperatura', headline: 'El tiempo que hizo',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.minTempC, 0)}</div><div class="l">°C mín.</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.avgTempC, 0)}</div><div class="l">°C media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxTempC, 0)}</div><div class="l">°C máx.</div></div>
        </div>`
    });
  }

  slides.push({
    kicker: 'El resumen', headline: title || 'Tu actividad',
    body: `<div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.distanceKm, 1)}</div><div class="l">km</div></div>
        ${stats.hasElevation ? `<div class="stat-col"><div class="n num">${fmt(stats.elevationGainM, 0)}</div><div class="l">m</div></div>` : ''}
        ${stats.hasPower ? `<div class="stat-col"><div class="n num">${fmt(stats.normalizedPowerW, 0)}</div><div class="l">W NP</div></div>` : ''}
        ${stats.hasHr ? `<div class="stat-col"><div class="n num">${fmt(stats.avgHr, 0)}</div><div class="l">ppm</div></div>` : ''}
      </div>
      <div class="sub" style="margin-top:22px">Generado por completo en tu navegador, sin subir tu archivo a ningún servidor.</div>`
  });

  return slides;
}

export function renderWrapped(container, slides) {
  container.innerHTML = `
    <div id="progress"></div>
    <div class="navzone left" id="navL"></div>
    <div class="navzone right" id="navR"></div>
    <div id="slides"></div>
    <button id="replay">Volver a ver &#8635;</button>
  `;
  const slidesEl = container.querySelector('#slides');
  const progEl = container.querySelector('#progress');
  const bgs = ['#1c222c', '#241a10', '#141f24', '#24141c', '#141f1c', '#241417', '#1c1f14'];

  slides.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'slide';
    d.style.background = `linear-gradient(160deg, ${bgs[i % bgs.length]}, #14181f)`;
    d.innerHTML = `<div class="kicker">${s.kicker}</div><div class="headline num">${s.headline}</div>${s.body}`;
    slidesEl.appendChild(d);
    const seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = '<i></i>';
    progEl.appendChild(seg);
  });

  const slideEls = container.querySelectorAll('.slide');
  const segEls = container.querySelectorAll('#progress .seg');
  const DURATION = 8500;
  let idx = 0, timer = null;

  function animateNumbers(slideEl) {
    slideEl.querySelectorAll('.num').forEach(el => {
      // Cuenta hacia arriba solo si el texto es puramente numérico (con coma decimal opcional)
      const raw = el.textContent.trim().replace(/\./g, '').replace(',', '.');
      const target = parseFloat(raw);
      if (isNaN(target) || el.dataset.animated) return;
      el.dataset.animated = '1';
      const decimals = (el.textContent.split(',')[1] || '').length;
      const t0 = performance.now(), dur = 1600;
      function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function render() {
    slideEls.forEach((el, i) => el.classList.toggle('active', i === idx));
    segEls.forEach((seg, i) => {
      seg.classList.remove('running', 'done');
      seg.querySelector('i').style.animation = 'none';
      if (i < idx) seg.classList.add('done');
    });
    animateNumbers(slideEls[idx]);
    container.querySelector('#replay').classList.toggle('show', idx === slides.length - 1);
    startSegment();
  }
  function startSegment() {
    clearTimeout(timer);
    if (idx === slides.length - 1) return;
    const seg = segEls[idx];
    seg.classList.add('running');
    void seg.querySelector('i').offsetWidth;
    seg.querySelector('i').style.animation = `fillbar ${DURATION}ms linear forwards`;
    timer = setTimeout(next, DURATION);
  }
  function next() { if (idx < slides.length - 1) { idx++; render(); } }
  function prev() { if (idx > 0) { idx--; render(); } }

  container.querySelector('#navR').addEventListener('click', next);
  container.querySelector('#navL').addEventListener('click', prev);
  container.querySelector('#replay').addEventListener('click', () => { idx = 0; render(); });
  document.addEventListener('keydown', e => { if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); });

  let touchStartX = null;
  container.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  container.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });

  render();
}
