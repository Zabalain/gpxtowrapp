// wrappedEngine.js — construye y anima el "Resumen de ruta" a pantalla completa.
// El tono de los comentarios es el de un entrenador revisando los datos después de la
// salida: observaciones y recomendaciones orientativas, nunca un diagnóstico.
//
// Para que el texto varíe de verdad de una ruta a otra, no nos basamos solo en los
// totales: dividimos la ruta en 4 tramos y comparamos primera vs segunda mitad
// (ritmo, potencia, pulso) para sacar conclusiones concretas de ESTA salida.

import { buildRouteLineSvg, buildElevationProfileSvg } from './routeImage.js';
import { buildBalanceScatterSvg } from './pedalChart.js';
import { computeSegments, compareHalves } from './segments.js';
import { buildHrZoneChart, buildSpeedOverElevationChart } from './advancedCharts.js';

function fmtHM(hDecimal) {
  if (hDecimal == null) return '—';
  const totalMin = Math.round(hDecimal * 60);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
function pct(a, b) { return (a == null || b == null || b === 0) ? null : ((a - b) / b) * 100; }
function kmRange(seg) { return seg ? `km ${seg.fromKm.toFixed(0)}-${seg.toKm.toFixed(0)}` : ''; }

export function buildSlidesFromStats(stats, title, coverImage, points) {
  const fmt = (n, d = 0) => n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const slides = [];

  const segs = points ? computeSegments(points, 4) : [];
  const validSegs = segs.filter(Boolean);
  const halves = validSegs.length === 4 ? compareHalves(segs) : null;
  const hardestSeg = validSegs.length ? validSegs.reduce((a, b) => ((b.avgPower ?? b.avgHr ?? 0) > (a.avgPower ?? a.avgHr ?? 0) ? b : a)) : null;
  const climbiestSeg = validSegs.length ? validSegs.reduce((a, b) => (b.gainM > a.gainM ? b : a)) : null;
  const fastestSeg = validSegs.length ? validSegs.reduce((a, b) => ((b.avgSpeedKmh ?? 0) > (a.avgSpeedKmh ?? 0) ? b : a)) : null;
  const slowestSeg = validSegs.length ? validSegs.reduce((a, b) => ((b.avgSpeedKmh ?? Infinity) < (a.avgSpeedKmh ?? Infinity) ? b : a)) : null;

  slides.push({
    kicker: 'Resumen de ruta', headline: title || 'Tu actividad', image: coverImage || null,
    body: `<div class="sub">Análisis de tu ruta, con el mismo criterio que usaría tu entrenador al revisar los datos después de una salida: no solo los totales, también cómo evolucionó el esfuerzo tramo a tramo. Toca para empezar &rarr;</div>`
  });

  // ---------- Distancia y ritmo por tramos ----------
  const stoppedMin = (stats.totalElapsedH != null && stats.movingH != null) ? (stats.totalElapsedH - stats.movingH) * 60 : null;
  let distParas = [];
  if (stoppedMin != null) {
    if (stoppedMin < 3) distParas.push('Prácticamente sin paradas: entraste y saliste casi sin bajarte de la bici.');
    else if (stoppedMin < 15) distParas.push(`Unos ${fmt(stoppedMin, 0)} minutos parado en total, lo normal para repostar o hacer una foto.`);
    else if (stoppedMin < 45) distParas.push(`Casi ${fmt(stoppedMin, 0)} minutos parado por el camino &mdash; una parada larga, o varias cortas.`);
    else distParas.push(`Más de ${fmt(stoppedMin / 60, 1)} horas paradas &mdash; esto tuvo más pinta de excursión con calma que de entrenamiento seguido.`);
  }
  if (fastestSeg && slowestSeg && fastestSeg !== slowestSeg) {
    distParas.push(`Tu tramo más rápido fue el de ${kmRange(fastestSeg)} (${fmt(fastestSeg.avgSpeedKmh, 1)} km/h de media); el más lento, ${kmRange(slowestSeg)} (${fmt(slowestSeg.avgSpeedKmh, 1)} km/h) &mdash; normalmente eso delata un puerto, viento en contra, o simplemente cansancio acumulado si coincide con el tramo final.`);
  }
  slides.push({
    kicker: 'Distancia', headline: 'Recorriste',
    body: `<div class="big num">${fmt(stats.distanceKm, 1)}</div><div class="unit">kilómetros</div>
      <div class="stat-row">
        <div class="stat-col"><div class="n num">${fmtHM(stats.totalElapsedH)}</div><div class="l">h:min totales</div></div>
        <div class="stat-col"><div class="n num">${fmtHM(stats.movingH)}</div><div class="l">h:min en marcha</div></div>
      </div>
      <div class="sub" style="max-width:40ch">${distParas.join(' ')}</div>`
  });

  // ---------- Desnivel ----------
  if (stats.hasElevation) {
    const ratio = stats.distanceKm ? stats.elevationGainM / stats.distanceKm : null;
    let eleParas = [];
    if (ratio != null) {
      if (ratio < 3) eleParas.push('Un perfil prácticamente de mesa de billar: aquí el resultado se explica casi todo por el ritmo, no por el terreno.');
      else if (ratio < 7) eleParas.push('Un perfil ondulado: se nota, pero sin sustos.');
      else if (ratio < 13) eleParas.push('Perfil montañoso de verdad, con desnivel de sobra para notarlo en las piernas.');
      else eleParas.push('Un perfil muy exigente &mdash; más de 13 m de subida por kilómetro de media es palabra mayor, del tipo que condiciona toda la estrategia de la salida.');
    }
    if (climbiestSeg && validSegs.length === 4) {
      const climbShare = stats.elevationGainM ? (climbiestSeg.gainM / stats.elevationGainM) * 100 : null;
      eleParas.push(`El grueso de la subida se concentró en ${kmRange(climbiestSeg)}, con ${fmt(climbiestSeg.gainM, 0)} m${climbShare != null ? ` (casi ${fmt(climbShare, 0)}% de todo el desnivel del día)` : ''} &mdash; el resto de la ruta fue notablemente más digerible.`);
    }
    slides.push({
      kicker: 'Desnivel', headline: 'Subiste',
      body: `<div class="big num">${fmt(stats.elevationGainM, 0)}</div><div class="unit">metros</div>
        <div class="sub" style="max-width:40ch">Y bajaste ${fmt(stats.elevationLossM, 0)} m. ${eleParas.join(' ')}</div>`
    });
  }

  // ---------- Velocidad + gráfica velocidad sobre perfil ----------
  const speedRatio = (stats.avgSpeedKmh && stats.maxSpeedKmh) ? stats.maxSpeedKmh / stats.avgSpeedKmh : null;
  let speedComment;
  if (speedRatio == null) speedComment = '';
  else if (speedRatio < 1.6) speedComment = 'Ritmo muy constante: apenas hay diferencia entre tu punta y tu media, terreno llano o sin muchos frenazos.';
  else if (speedRatio < 2.3) speedComment = 'Diferencia normal entre punta y media &mdash; algún tramo rápido, alguna curva o repecho.';
  else speedComment = 'Mucha diferencia entre tu punta y tu media &mdash; probablemente hubo una bajada seria en algún punto de la ruta.';
  const speedChart = (points && stats.hasElevation) ? buildSpeedOverElevationChart(points, { width: 280, height: 120 }) : '';
  slides.push({
    kicker: 'Velocidad y terreno', headline: 'A qué ritmo fuiste',
    body: `<div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.avgSpeedKmh, 1)}</div><div class="l">km/h de media</div></div>
        <div class="stat-col"><div class="n num">${fmt(stats.maxSpeedKmh, 1)}</div><div class="l">km/h de pico</div></div>
      </div>
      <div class="sub">${speedComment}</div>
      ${speedChart ? `<div style="margin-top:14px;color:var(--sky)">${speedChart}</div>
      <div class="sub" style="font-size:11.5px;margin-top:2px">Fondo: perfil de elevación. Línea: tu velocidad sobre el mismo tramo &mdash; cuando una baja la otra suele subir.</div>` : ''}`
  });

  // ---------- Potencia (con análisis de deriva primera/segunda mitad) ----------
  if (stats.hasPower) {
    const vi = (stats.normalizedPowerW && stats.avgPowerW) ? stats.normalizedPowerW / stats.avgPowerW : null;
    let powerParas = [];
    if (vi != null) {
      if (vi < 1.05) powerParas.push('Un esfuerzo casi de laboratorio: pocas veces se pedalea tan constante como hoy.');
      else if (vi < 1.15) powerParas.push('Ritmo bastante regular, con algún acelerón o repecho suelto.');
      else if (vi < 1.3) powerParas.push('Esfuerzo irregular: hubo tramos claramente más duros que otros.');
      else powerParas.push('Muy irregular &mdash; paradas, sprints o rampas cortas marcaron la ruta más que el ritmo sostenido.');
    }
    if (halves && halves.firstHalf.avgPower != null && halves.secondHalf.avgPower != null) {
      const drop = pct(halves.secondHalf.avgPower, halves.firstHalf.avgPower);
      if (drop != null) {
        if (drop < -15) powerParas.push(`Salida claramente positiva (empezaste fuerte y fuiste soltando): ${fmt(halves.firstHalf.avgPower, 0)} W de media en la primera mitad frente a ${fmt(halves.secondHalf.avgPower, 0)} W en la segunda, un ${fmt(Math.abs(drop), 0)}% menos. Si buscas rendir más en el tramo final, quizá convenga repartir mejor el esfuerzo al principio.`);
        else if (drop > 15) powerParas.push(`Negative split muy marcado: empezaste a ${fmt(halves.firstHalf.avgPower, 0)} W y terminaste a ${fmt(halves.secondHalf.avgPower, 0)} W, un ${fmt(drop, 0)}% más fuerte en la segunda mitad. O calentaste mal al principio, o guardaste piernas a propósito &mdash; en cualquier caso, buena gestión del esfuerzo.`);
        else powerParas.push(`Reparto de esfuerzo muy parejo entre la primera mitad (${fmt(halves.firstHalf.avgPower, 0)} W) y la segunda (${fmt(halves.secondHalf.avgPower, 0)} W) &mdash; señal de un ritmo bien calculado.`);
      }
    }
    if (hardestSeg) powerParas.push(`El tramo más exigente fue ${kmRange(hardestSeg)}, con ${fmt(hardestSeg.avgPower, 0)} W de media.`);
    slides.push({
      kicker: 'Potencia', headline: 'Lo que diste al pedal',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgPowerW, 0)}</div><div class="l">W de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxPowerW, 0)}</div><div class="l">W de pico</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.normalizedPowerW, 0)}</div><div class="l">W normalizada</div></div>
        </div>
        <div class="sub" style="max-width:40ch">${powerParas.join(' ')}</div>`
    });

    if (stats.intensityFactor != null) {
      const ifv = stats.intensityFactor;
      const ifLabel = ifv < 0.6 ? 'una salida muy suave, de recuperación' :
        ifv < 0.72 ? 'ritmo de resistencia, cómodo pero sostenido' :
        ifv < 0.85 ? 'zona de tempo / sweet spot: exigente sin llegar al límite' :
        ifv < 0.95 ? 'cerca del umbral: un esfuerzo duro y sostenido' :
        'una prueba a muy alta intensidad, cerca de tu máximo sostenible';
      slides.push({
        kicker: 'Intensidad', headline: 'Cuánto te costó de verdad',
        body: `<div class="stat-row">
            <div class="stat-col"><div class="n num">${fmt(stats.intensityFactor, 3)}</div><div class="l">Intensity Factor</div></div>
            <div class="stat-col"><div class="n num">${fmt(stats.trainingStressScore, 1)}</div><div class="l">TSS</div></div>
            ${stats.ftpW ? `<div class="stat-col"><div class="n num">${fmt(stats.ftpW, 0)}</div><div class="l">W tu FTP</div></div>` : ''}
          </div>
          <div class="sub">IF = potencia normalizada &divide; FTP. Como entrenador leería un ${fmt(ifv, 2)} como ${ifLabel}. Con un TSS de ${fmt(stats.trainingStressScore, 0)}, ${stats.trainingStressScore > 150 ? 'probablemente notes las piernas cargadas mañana: prioriza la recuperación.' : stats.trainingStressScore > 80 ? 'es una carga moderada-alta, compatible con entrenar de nuevo mañana suave.' : 'la carga fue ligera, sin problema para encadenar otra sesión de calidad pronto.'}</div>`
      });
    }
  }

  // ---------- Eficiencia de pedaleo ----------
  if (stats.pedaling) {
    const pd = stats.pedaling;
    const parts = [];
    let correction = null;

    if (pd.leftBalancePct != null) {
      const dev = Math.abs(50 - pd.leftBalancePct);
      const dominant = pd.leftBalancePct > 50 ? 'izquierda' : 'derecha';
      if (dev <= 5) {
        parts.push(`Reparto equilibrado entre piernas (${fmt(pd.leftBalancePct, 0)}% / ${fmt(pd.rightBalancePct, 0)}%) &mdash; un valor típico de un ciclista sano, no cambiaría nada aquí.`);
        correction = correction === true ? true : false;
      } else if (dev <= 10) {
        parts.push(`Ligera predominancia de la pierna ${dominant} (${fmt(pd.leftBalancePct, 0)}% / ${fmt(pd.rightBalancePct, 0)}%), todavía dentro de lo habitual.`);
        correction = correction === true ? true : false;
      } else {
        parts.push(`Desequilibrio notable hacia la pierna ${dominant} (${fmt(pd.leftBalancePct, 0)}% / ${fmt(pd.rightBalancePct, 0)}%). Si se repite salida tras salida, yo lo revisaría: calas, altura de sillín, o una posible molestia que estés compensando sin darte cuenta.`);
        correction = true;
      }
    }
    if (pd.torqueEffLPct != null && pd.torqueEffRPct != null) {
      const avgTe = (pd.torqueEffLPct + pd.torqueEffRPct) / 2;
      if (avgTe < 60) {
        parts.push(`Torque effectiveness bajo (izq. ${fmt(pd.torqueEffLPct, 0)}% / dcha. ${fmt(pd.torqueEffRPct, 0)}%): trabajar el pedaleo redondo en series cortas podría ayudarte a aprovechar mejor cada pedalada.`);
        correction = true;
      } else {
        parts.push(`Torque effectiveness saludable (izq. ${fmt(pd.torqueEffLPct, 0)}% / dcha. ${fmt(pd.torqueEffRPct, 0)}%), en el rango típico de un ciclista con experiencia.`);
        correction = correction === true ? true : false;
      }
    } else {
      parts.push('El torque effectiveness venía a 0% en todos los puntos: el sensor no lo está reportando de verdad, así que no puedo evaluarlo &mdash; no es que tu pedaleo sea malo, es que falta el dato.');
    }
    const smooth = pd.smoothCombinedPct ?? (pd.smoothLPct != null && pd.smoothRPct != null ? (pd.smoothLPct + pd.smoothRPct) / 2 : null);
    if (smooth != null) {
      parts.push(smooth < 20
        ? `Suavidad de pedalada ${fmt(smooth, 0)}%, en la parte baja de lo normal &mdash; es una métrica poco accionable, no le daría más peso que a lo anterior.`
        : `Suavidad de pedalada ${fmt(smooth, 0)}%, dentro de lo que suele verse en la mayoría de ciclistas.`);
    }
    const verdict = correction === true
      ? '¿Hay algo que corregir? Sí, al menos vale la pena vigilarlo en próximas salidas.'
      : correction === false
        ? '¿Hay algo que corregir? No, con estos datos tu pedaleo no pide ningún ajuste.'
        : '¿Hay algo que corregir? No hay datos suficientes para saberlo con este archivo.';
    const scatter = points ? buildBalanceScatterSvg(points, { width: 280, height: 110 }) : '';
    slides.push({
      kicker: 'Eficiencia de pedaleo', headline: 'Cómo repartiste el esfuerzo entre piernas',
      body: `<div class="sub" style="font-size:14px;max-width:40ch">${parts.join(' ')}</div>
        <div class="sub" style="margin-top:14px;color:var(--dawn);font-weight:600">${verdict}</div>
        ${scatter ? `<div style="margin-top:14px;color:var(--parch)">${scatter}</div>
        <div class="sub" style="font-size:11.5px;margin-top:4px">Cada punto es una muestra del sensor (% pierna derecha); la línea gruesa es tu media. Así puedes comprobar tú mismo que la lectura tiene sentido.</div>` : ''}`
    });
  }

  // ---------- Frecuencia cardíaca (con gráfica por zonas y deriva cardíaca) ----------
  if (stats.hasHr) {
    const reserve = (stats.maxHr != null && stats.avgHr != null) ? stats.maxHr - stats.avgHr : null;
    let hrParas = [];
    if (reserve != null) {
      if (reserve < 15) hrParas.push('Te mantuviste todo el rato muy cerca de tu techo de pulsaciones &mdash; ritmo exigente y sostenido.');
      else if (reserve < 35) hrParas.push('Un pulso que se movió lo normal entre tramos suaves y algún esfuerzo más serio.');
      else hrParas.push('Mucha diferencia entre tu media y tu pico &mdash; hubo tramos muy tranquilos y algún momento puntual bastante más intenso.');
    }
    if (halves && stats.hasPower && halves.firstHalf.avgPower && halves.firstHalf.avgHr && halves.secondHalf.avgPower && halves.secondHalf.avgHr) {
      const efFirst = halves.firstHalf.avgPower / halves.firstHalf.avgHr;
      const efSecond = halves.secondHalf.avgPower / halves.secondHalf.avgHr;
      const efDrop = pct(efSecond, efFirst);
      if (efDrop != null && efDrop < -8) {
        hrParas.push(`Se nota cierta deriva cardíaca: por cada pulsación conseguiste menos vatios en la segunda mitad (factor de eficiencia ${fmt(efFirst, 2)} &rarr; ${fmt(efSecond, 2)}, un ${fmt(Math.abs(efDrop), 0)}% peor). Es normal con fatiga acumulada, calor, o deshidratación &mdash; si se repite mucho de forma sistemática, trabajar la resistencia de base te ayudaría a sostenerlo mejor.`);
      } else if (efDrop != null) {
        hrParas.push(`Tu eficiencia cardíaca (vatios por pulsación) se mantuvo estable entre la primera y la segunda mitad &mdash; buena señal de forma física para la duración de esta salida.`);
      }
    }
    const zoneChart = points ? buildHrZoneChart(points, { width: 280, height: 110 }) : '';
    slides.push({
      kicker: 'Frecuencia cardíaca', headline: 'Tu corazón',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgHr, 0)}</div><div class="l">ppm de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxHr, 0)}</div><div class="l">ppm máxima</div></div>
        </div>
        <div class="sub" style="max-width:40ch">${hrParas.join(' ')}</div>
        ${zoneChart ? `<div style="margin-top:12px;color:var(--parch)">${zoneChart}</div>
        <div class="sub" style="font-size:11.5px;margin-top:2px">Color por intensidad relativa a esta ruta (Z1 más suave &rarr; Z5 más duro) &mdash; no son tus zonas reales de entrenamiento, que requieren una prueba de umbral.</div>` : ''}`
    });
  }

  // ---------- Cadencia ----------
  if (stats.hasCadence) {
    let cadComment;
    if (stats.avgCadence == null) cadComment = '';
    else if (stats.avgCadence < 70) cadComment = stats.hasPower
      ? 'Cadencia baja con desarrollos largos &mdash; más fuerza por pedalada que velocidad de piernas. Si buscas cuidar las rodillas a largo plazo, yo probaría a subir un poco el cambio.'
      : 'Cadencia baja: pedaleas con desarrollos largos, más de fuerza que de giro.';
    else if (stats.avgCadence > 90) cadComment = 'Cadencia alta y ligera, típica de un pedaleo muy fluido.';
    else cadComment = 'Cadencia en el rango habitual de la mayoría de ciclistas.';
    slides.push({
      kicker: 'Cadencia', headline: 'El ritmo de tus piernas',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.avgCadence, 0)}</div><div class="l">rpm de media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxCadence, 0)}</div><div class="l">rpm máxima</div></div>
        </div>
        <div class="sub">${cadComment}</div>`
    });
  }

  // ---------- Temperatura ----------
  if (stats.hasTemp) {
    let tempComment;
    if (stats.maxTempC != null && stats.maxTempC >= 35) tempComment = 'Calor de verdad en algún tramo &mdash; con razón se nota en las pulsaciones.';
    else if (stats.minTempC != null && stats.minTempC <= 5) tempComment = 'Salida fría, de esas que se notan en los dedos al principio.';
    else if (stats.maxTempC != null && stats.minTempC != null && (stats.maxTempC - stats.minTempC) > 12) tempComment = 'Un salto térmico grande entre el momento más frío y el más caluroso del recorrido.';
    else tempComment = 'Un rango de temperatura bastante cómodo para rodar.';
    slides.push({
      kicker: 'Temperatura', headline: 'El tiempo que hizo',
      body: `<div class="stat-row">
          <div class="stat-col"><div class="n num">${fmt(stats.minTempC, 0)}</div><div class="l">°C mín.</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.avgTempC, 0)}</div><div class="l">°C media</div></div>
          <div class="stat-col"><div class="n num">${fmt(stats.maxTempC, 0)}</div><div class="l">°C máx.</div></div>
        </div>
        <div class="sub">${tempComment}</div>`
    });
  }

  // ---------- Resumen final, con perfil y track ----------
  const routeSvg = points ? buildRouteLineSvg(points, { width: 260, height: 150 }) : '';
  const eleSvg = (points && stats.hasElevation) ? buildElevationProfileSvg(points, { width: 260, height: 80 }) : '';
  slides.push({
    kicker: 'El resumen', headline: title || 'Tu actividad',
    body: `<div class="stat-row">
        <div class="stat-col"><div class="n num">${fmt(stats.distanceKm, 1)}</div><div class="l">km</div></div>
        ${stats.hasElevation ? `<div class="stat-col"><div class="n num">${fmt(stats.elevationGainM, 0)}</div><div class="l">m</div></div>` : ''}
        ${stats.hasPower ? `<div class="stat-col"><div class="n num">${fmt(stats.normalizedPowerW, 0)}</div><div class="l">W NP</div></div>` : ''}
        ${stats.hasHr ? `<div class="stat-col"><div class="n num">${fmt(stats.avgHr, 0)}</div><div class="l">ppm</div></div>` : ''}
      </div>
      ${routeSvg ? `<div style="margin-top:18px;color:var(--dawn)">${routeSvg}</div>` : ''}
      ${eleSvg ? `<div style="margin-top:8px;color:var(--dawn)">${eleSvg}</div>` : ''}`
  });

  // ---------- Fuentes y aviso ----------
  const sources = ['Garmin FIT SDK (formato .fit)', 'Especificación GPX 1.1 (formato .gpx)'];
  if (stats.hasPower) sources.push('Potencia normalizada, Intensity Factor y TSS: metodología de Andrew Coggan (Training and Racing with a Power Meter)');
  slides.push({
    kicker: 'Fuentes y aviso', headline: 'Antes de irte',
    body: `<div class="sub" style="max-width:38ch;text-align:left">
        <b>Fuentes de datos:</b><br>${sources.map(s => '&bull; ' + s).join('<br>')}
      </div>
      <div class="sub" style="max-width:38ch;text-align:left;margin-top:16px">
        Los comentarios y recomendaciones de este resumen son <b>orientativos</b>, generados automáticamente a partir de tus propios datos, con el mismo criterio general que aplicaría un entrenador al revisarlos por encima. No sustituyen la valoración de un entrenador certificado ni de un profesional médico &mdash; ante cualquier duda real (dolor, desequilibrio persistente, planificación de entrenamiento), consulta siempre con uno.
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
  const bgs = ['#f4e8d4', '#e6ecdf', '#f2e2d8', '#e4ede6', '#f3e4de', '#eaeedb', '#f4e6d6', '#e7e9ee'];
  let bgIdx = 0;

  slides.forEach((s) => {
    const d = document.createElement('div');
    d.className = 'slide' + (s.image ? ' cover' : '');
    if (s.image) {
      d.style.backgroundImage = `url(${s.image})`;
    } else {
      d.style.background = `linear-gradient(160deg, ${bgs[bgIdx % bgs.length]}, var(--ink))`;
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
  const DURATION = 9500;
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
