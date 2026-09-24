// wrappedEngine.js — construye y anima el "story" a pantalla completa.

export function buildSlidesFromStats(stats, title, coverImage) {
  const fmt = (n, d = 0) => n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const slides = [];

  slides.push({
    kicker: 'Tu Wrapped', headline: title || 'Tu actividad', image: coverImage || null,
    body: `<div class="sub">Esto es lo que ha dado de sí tu ruta. Toca para empezar &rarr;</div>`
  });

  slides.push({
    kicker: 'Distancia', headline: 'Recorriste',
    body: `<div class="big num">${fmt(stats.distanceKm, 1)}</div><div class="unit">kilómetros</div>
      <div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.totalElapsedH, 2)}</div><div class="l">h totales</div></div>
        <div class="stat-col"><div class="n num">${fmt(stats.movingH, 2)}</div><div class="l">h en marcha</div></div>
      </div>
      <div class="sub">${stats.totalElapsedH != null && stats.movingH != null && (stats.totalElapsedH - stats.movingH) > 0.05
        ? `Casi ${fmt((stats.totalElapsedH - stats.movingH) * 60, 0)} minutos parados por el camino &mdash; fotos, comida, o simplemente aire.`
        : `Prácticamente todo el tiempo rodando, con muy pocas paradas.`}</div>`
  });

  if (stats.hasElevation) {
    const ratio = stats.distanceKm ? stats.elevationGainM / stats.distanceKm : null;
    slides.push({
      kicker: 'Desnivel', headline: 'Subiste',
      body: `<div class="big num">${fmt(stats.elevationGainM, 0)}</div><div class="unit">metros</div>
        <div class="sub">Y bajaste ${fmt(stats.elevationLossM, 0)} m. ${ratio != null
          ? (ratio > 12 ? 'Un perfil bastante montañoso, con más de 12 m de subida por kilómetro de media.'
             : ratio > 6 ? 'Un perfil ondulado, con desnivel de sobra para notarlo en las piernas.'
             : 'Un perfil mayormente llano.')
          : ''}</div>`
    });
  }

  slides.push({
    kicker: 'Velocidad', headline: 'A qué ritmo fuiste',
    body: `<div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.avgSpeedKmh, 1)}</div><div class="l">km/h de media</div></div>
        <div class="stat-col"><div class="n num">${fmt(stats.maxSpeedKmh, 1)}</div><div class="l">km/h de pico</div></div>
      </div>
      <div class="sub">La velocidad punta viene del GPS y puede llevar algo de ruido en curvas o bajo árboles &mdash; tómala como orientativa.</div>`
  });

  if (stats.hasPower) {
    slides.push({
      kicker: 'Potencia', headline: 'Lo que diste al pedal',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgPowerW, 0)}</div><div class="l">W de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxPowerW, 0)}</div><div class="l">W de pico</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.normalizedPowerW, 0)}</div><div class="l">W normalizada</div></div>
        </div>
        <div class="sub">La normalizada (NP) siempre es igual o mayor que la media: cuanto más irregular el esfuerzo -subidas, sprints, pausas-, más se separan las dos.</div>`
    });
    if (stats.intensityFactor != null) {
      const ifv = stats.intensityFactor;
      const ifLabel = ifv < 0.65 ? 'una salida tranquila, de recuperación o base' :
        ifv < 0.75 ? 'ritmo de resistencia, cómodo pero sostenido' :
        ifv < 0.85 ? 'zona de tempo / sweet spot, exigente sin llegar al límite' :
        ifv < 0.95 ? 'cerca del umbral: un esfuerzo duro y sostenido' :
        'una prueba a muy alta intensidad';
      slides.push({
        kicker: 'Intensidad', headline: 'Cuánto te costó de verdad',
        body: `<div class="stat-row">
            <div class="stat-col"><div class="n num">${fmt(stats.intensityFactor, 3)}</div><div class="l">Intensity Factor</div></div>
            <div class="stat-col"><div class="n num">${fmt(stats.trainingStressScore, 1)}</div><div class="l">TSS</div></div>
            ${stats.ftpW ? `<div class="stat-col"><div class="n num">${fmt(stats.ftpW, 0)}</div><div class="l">W tu FTP</div></div>` : ''}
          </div>
          <div class="sub">IF = potencia normalizada &divide; FTP. Con ${fmt(ifv, 2)}, esto se lee como ${ifLabel}.</div>`
      });
    }
  }

  if (stats.hasHr) {
    slides.push({
      kicker: 'Frecuencia cardíaca', headline: 'Tu corazón',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgHr, 0)}</div><div class="l">ppm de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxHr, 0)}</div><div class="l">ppm máxima</div></div>
        </div>
        <div class="sub">Sin tu frecuencia de umbral o zonas configuradas no podemos decirte en qué zona exacta rodaste &mdash; esto es la lectura en bruto.</div>`
    });
  }

  if (stats.hasCadence) {
    slides.push({
      kicker: 'Cadencia', headline: 'El ritmo de tus piernas',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgCadence, 0)}</div><div class="l">rpm de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxCadence, 0)}</div><div class="l">rpm máxima</div></div>
        </div>
        <div class="sub">${stats.avgCadence != null
          ? (stats.avgCadence < 70 ? 'Una cadencia baja: pedaleas con desarrollos largos, más de fuerza que de velocidad de piernas.'
             : stats.avgCadence > 90 ? 'Una cadencia alta y ligera, típica de un pedaleo muy fluido.'
             : 'Una cadencia en el rango habitual de la mayoría de ciclistas.')
          : ''}</div>`
    });
  }

  if (stats.hasTemp) {
    slides.push({
      kicker: 'Temperatura', headline: 'El tiempo que hizo',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.minTempC, 0)}</div><div class="l">°C mín.</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.avgTempC, 0)}</div><div class="l">°C media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxTempC, 0)}</div><div class="l">°C máx.</div></div>
        </div>
        <div class="sub">${stats.maxTempC != null && stats.maxTempC >= 35 ? 'Calor de verdad en algún tramo &mdash; con razón se nota en las pulsaciones.'
          : stats.minTempC != null && stats.minTempC <= 8 ? 'Salida fría, de esas que se notan en los dedos al principio.'
          : 'Un rango de temperatura bastante cómodo para rodar.'}</div>`
    });
  }

  slides.push({
    kicker: 'El resumen', headline: title || 'Tu actividad',
    body: `<div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.distanceKm, 1)}</div><div class="l">km</div></div>
        ${stats.hasElevation ? `<div class="stat-col"><div class="n num">${fmt(stats.elevationGainM, 0)}</div><div class="l">m</div></div>` : ''}
        ${stats.hasPower ? `<div class="stat-col"><div class="n num">${fmt(stats.normalizedPowerW, 0)}</div><div class="l">W NP</div></div>` : ''}
        ${stats.hasHr ? `<div class="stat-col"><div class="n num">${fmt(stats.avgHr, 0)}</div><div class="l">ppm</div></div>` : ''}
      </div>`
  });

  return slides;
}

export function renderWrapped(container, slides, { onSave, onShare } = {}) {
  container.innerHTML = `
    <div id="progress"></div>
    <div class="navzone left" id="navL"></div>
    <div class="navzone right" id="navR"></div>
    <div id="slides"></div>
    <div class="pausehint" id="pausehint">Pausado &mdash; suelta para seguir</div>
    <div id="actions">
      <button id="saveBtn" title="Guardar como archivo">&#8681; Guardar</button>
      <button id="shareBtn" title="Compartir">&#8599; Compartir</button>
    </div>
    <button id="replay">Volver a ver &#8635;</button>
  `;
  const slidesEl = container.querySelector('#slides');
  const progEl = container.querySelector('#progress');
  const bgs = ['#241a10', '#141f24', '#24141c', '#141f1c', '#241417', '#1c1f14', '#241f14'];
  let bgIdx = 0;

  slides.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'slide' + (s.image ? ' cover' : '');
    if (s.image) {
      d.style.backgroundImage = `url(${s.image})`;
    } else {
      d.style.background = `linear-gradient(160deg, ${bgs[bgIdx % bgs.length]}, #14181f)`;
      bgIdx++;
    }
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
  let idx = 0, timer = null, segStart = 0, remaining = DURATION, isPaused = false;

  function animateNumbers(slideEl) {
    slideEl.querySelectorAll('.num').forEach(el => {
      if (el.dataset.animated) return;
      const raw = el.textContent.trim().replace(/\./g, '').replace(',', '.');
      const target = parseFloat(raw);
      if (isNaN(target)) return;
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
    remaining = DURATION;
    startSegment();
  }
  function startSegment() {
    clearTimeout(timer);
    if (idx === slides.length - 1) return;
    const seg = segEls[idx];
    seg.classList.add('running');
    const i = seg.querySelector('i');
    void i.offsetWidth;
    i.style.animation = `fillbar ${remaining}ms linear forwards`;
    segStart = Date.now();
    timer = setTimeout(next, remaining);
  }
  function pause() {
    if (isPaused || idx === slides.length - 1) return;
    isPaused = true;
    clearTimeout(timer);
    remaining -= (Date.now() - segStart);
    if (remaining < 300) remaining = 300;
    segEls[idx].querySelector('i').style.animationPlayState = 'paused';
    container.querySelector('#pausehint').classList.add('show');
  }
  function resume() {
    if (!isPaused) return;
    isPaused = false;
    container.querySelector('#pausehint').classList.remove('show');
    if (idx === slides.length - 1) return;
    segEls[idx].querySelector('i').style.animationPlayState = 'running';
    segStart = Date.now();
    timer = setTimeout(next, remaining);
  }
  function next() { if (idx < slides.length - 1) { idx++; render(); } }
  function prev() { if (idx > 0) { idx--; render(); } }

  container.querySelector('#navR').addEventListener('click', () => { if (!isPaused) next(); });
  container.querySelector('#navL').addEventListener('click', () => { if (!isPaused) prev(); });
  container.querySelector('#replay').addEventListener('click', () => { idx = 0; render(); });
  document.addEventListener('keydown', e => {
    if (e.key === ' ') { e.preventDefault(); isPaused ? resume() : pause(); }
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });
  // mantener pulsado para pausar y poder leer con calma; soltar para seguir
  container.addEventListener('pointerdown', pause);
  container.addEventListener('pointerup', resume);
  container.addEventListener('pointercancel', resume);

  let touchStartX = null;
  container.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  container.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40 && !isPaused) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });

  if (onSave) container.querySelector('#saveBtn').addEventListener('click', (e) => { e.stopPropagation(); onSave(); });
  if (onShare) container.querySelector('#shareBtn').addEventListener('click', (e) => { e.stopPropagation(); onShare(); });

  render();
}
