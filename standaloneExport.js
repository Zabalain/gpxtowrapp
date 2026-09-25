// standaloneExport.js — genera un .html independiente (sin imports, todo embebido)
// para que el resumen de ruta se pueda guardar y compartir como un único archivo.

const STANDALONE_CSS = `
:root{--ink:#ede4d2;--parch:#231c12;--parchDim:rgba(35,28,18,0.66);--dawn:#c17a2e;--clay:#9a4419;--sage:#5f6e42;--sky:#4c6575;--line:rgba(35,28,18,0.16);--lineStrong:rgba(35,28,18,0.3);box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);}
*{box-sizing:inherit;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;background:var(--ink);}
body{font-family:'Archivo',sans-serif;color:var(--parch);-webkit-font-smoothing:antialiased;}
.num{font-family:'Fraunces',serif;font-weight:800;}
#stage{position:relative;height:100%;width:100%;}
.slide{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:90px 26px 40px;opacity:0;pointer-events:none;transition:opacity .35s ease;}
.slide.active{opacity:1;pointer-events:auto;}
.slide.cover{background-size:cover;background-position:center 55%;}
.slide.cover::before{content:"";position:absolute;inset:0;z-index:0;background:linear-gradient(180deg,rgba(20,17,10,0.88) 0%,rgba(20,17,10,0.52) 30%,rgba(20,17,10,0.14) 55%,rgba(20,17,10,0.55) 100%);}
.slide.cover>*{position:relative;z-index:1;}
.slide.cover .kicker,.slide.cover .headline,.slide.cover .sub{color:#f4ecd9;}
.slide.cover .kicker{color:#e8c088;}
.kicker{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--dawn);margin-bottom:16px;opacity:0;transform:translateY(8px);}
.slide.active .kicker{animation:rise .5s ease .1s forwards;}
.headline{font-size:clamp(22px,6vw,32px);max-width:22ch;opacity:0;transform:translateY(10px);}
.slide.active .headline{animation:rise .5s ease .18s forwards;}
.big{font-family:'Fraunces',serif;font-weight:800;font-size:clamp(64px,20vw,120px);margin:14px 0;line-height:.95;}
.unit{font-size:clamp(20px,5vw,28px);font-weight:600;opacity:.85;}
.sub{margin-top:18px;font-size:15px;color:var(--parchDim);max-width:36ch;line-height:1.55;opacity:0;transform:translateY(10px);}
.slide.active .sub{animation:rise .5s ease .32s forwards;}
@keyframes rise{to{opacity:1;transform:translateY(0);}}
.stat-row{display:flex;gap:28px;margin-top:20px;flex-wrap:wrap;justify-content:center;}
.stat-col .n{font-family:'Fraunces',serif;font-weight:700;font-size:clamp(26px,7vw,38px);}
.stat-col .l{font-size:11.5px;color:var(--parchDim);margin-top:4px;letter-spacing:.02em;}
#progress{position:absolute;top:0;left:0;right:0;display:flex;gap:5px;padding:12px 14px 0;padding-top:calc(12px + env(safe-area-inset-top,0px));z-index:10;}
#progress .seg{flex:1;height:3px;background:var(--line);border-radius:2px;overflow:hidden;}
#progress .seg i{display:block;height:100%;width:0%;background:var(--parch);}
#progress .seg.done i{width:100%;}
#progress .seg.running i{animation:fillbar linear forwards;}
@keyframes fillbar{from{width:0%;}to{width:100%;}}
.navzone{position:absolute;top:0;bottom:0;width:35%;z-index:5;}
.navzone.left{left:0;}.navzone.right{right:0;}
#replay{position:absolute;bottom:calc(26px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);font-size:12.5px;color:var(--parchDim);border:1px solid var(--lineStrong);border-radius:20px;padding:9px 18px;background:rgba(35,28,18,0.05);z-index:6;opacity:0;pointer-events:none;transition:opacity .3s;}
#replay.show{opacity:1;pointer-events:auto;}
.pausehint{position:absolute;top:calc(38px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%) translateY(-6px);font-size:11px;color:var(--parchDim);opacity:0;transition:opacity .2s;z-index:6;pointer-events:none;}
.pausehint.show{opacity:.8;}
`;

const STANDALONE_JS = `
(function(){
  var SLIDES = window.__SLIDES__;
  var DURATION = 8500;
  var idx = 0, timer = null, segStart = 0, remaining = DURATION, isPaused = false;
  var slidesEl = document.getElementById('slides');
  var progEl = document.getElementById('progress');

  SLIDES.forEach(function(s, i){
    var d = document.createElement('div');
    d.className = 'slide' + (s.image ? ' cover' : '');
    if (s.image) d.style.backgroundImage = 'url(' + s.image + ')';
    else {
      var bgs = ['#f4e8d4','#e6ecdf','#f2e2d8','#e4ede6','#f3e4de','#eaeedb','#f4e6d6','#e7e9ee'];
      d.style.background = 'linear-gradient(160deg, ' + bgs[i % bgs.length] + ', var(--ink))';
    }
    d.innerHTML = '<div class="kicker">'+s.kicker+'</div><div class="headline num">'+s.headline+'</div>'+s.body;
    slidesEl.appendChild(d);
    var seg = document.createElement('div'); seg.className = 'seg';
    seg.innerHTML = '<i></i>'; progEl.appendChild(seg);
  });
  var slideEls = document.querySelectorAll('.slide');
  var segEls = document.querySelectorAll('#progress .seg');

  function animateNumbers(slideEl){
    slideEl.querySelectorAll('.num').forEach(function(el){
      if (el.dataset.animated) return;
      var raw = el.textContent.trim().replace(/\\./g,'').replace(',', '.');
      var target = parseFloat(raw);
      if (isNaN(target)) return;
      el.dataset.animated = '1';
      var decimals = (el.textContent.split(',')[1]||'').length;
      var t0 = performance.now(), dur = 1600;
      function step(t){
        var p = Math.min(1, (t-t0)/dur);
        var eased = 1-Math.pow(1-p,3);
        el.textContent = (target*eased).toLocaleString('es-ES',{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
        if (p<1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function render(){
    slideEls.forEach(function(el,i){ el.classList.toggle('active', i===idx); });
    segEls.forEach(function(seg,i){
      seg.classList.remove('running','done');
      seg.querySelector('i').style.animation = 'none';
      if (i<idx) seg.classList.add('done');
    });
    animateNumbers(slideEls[idx]);
    document.getElementById('replay').classList.toggle('show', idx===SLIDES.length-1);
    remaining = DURATION;
    startSegment();
  }
  function startSegment(){
    clearTimeout(timer);
    if (idx===SLIDES.length-1) return;
    var seg = segEls[idx];
    seg.classList.add('running');
    var i = seg.querySelector('i');
    void i.offsetWidth;
    i.style.animation = 'fillbar '+remaining+'ms linear forwards';
    segStart = Date.now();
    timer = setTimeout(next, remaining);
  }
  function pause(){
    if (isPaused || idx===SLIDES.length-1) return;
    isPaused = true;
    clearTimeout(timer);
    remaining -= (Date.now()-segStart);
    if (remaining < 300) remaining = 300;
    var i = segEls[idx].querySelector('i');
    i.style.animationPlayState = 'paused';
    document.getElementById('pausehint').classList.add('show');
  }
  function resume(){
    if (!isPaused) return;
    isPaused = false;
    document.getElementById('pausehint').classList.remove('show');
    if (idx===SLIDES.length-1) return;
    var i = segEls[idx].querySelector('i');
    i.style.animationPlayState = 'running';
    segStart = Date.now();
    timer = setTimeout(next, remaining);
  }
  function next(){ if (idx<SLIDES.length-1){ idx++; render(); } }
  function prev(){ if (idx>0){ idx--; render(); } }

  document.getElementById('navR').addEventListener('click', function(){ if(!isPaused) next(); });
  document.getElementById('navL').addEventListener('click', function(){ if(!isPaused) prev(); });
  document.getElementById('replay').addEventListener('click', function(){ idx=0; render(); });
  document.addEventListener('keydown', function(e){
    if (e.key===' '){ e.preventDefault(); isPaused?resume():pause(); }
    if (e.key==='ArrowRight') next();
    if (e.key==='ArrowLeft') prev();
  });
  document.getElementById('stage').addEventListener('pointerdown', pause);
  document.getElementById('stage').addEventListener('pointerup', resume);
  document.getElementById('stage').addEventListener('pointercancel', resume);

  var touchStartX=null;
  document.addEventListener('touchstart', function(e){ touchStartX=e.touches[0].clientX; }, {passive:true});
  document.addEventListener('touchend', function(e){
    if (touchStartX===null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx)>40){ dx<0?next():prev(); }
    touchStartX=null;
  }, {passive:true});

  render();
})();
`;

export function buildStandaloneHtml(slides, title) {
  const slidesJson = JSON.stringify(slides).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title || 'Resumen de ruta'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,900&family=Archivo:wght@500;600;700&display=swap" rel="stylesheet">
<style>${STANDALONE_CSS}</style>
</head>
<body>
<div id="stage">
  <div id="progress"></div>
  <div class="navzone left" id="navL"></div>
  <div class="navzone right" id="navR"></div>
  <div id="slides"></div>
  <div class="pausehint" id="pausehint">Pausado &mdash; suelta para seguir</div>
  <button id="replay">Volver a ver &#8635;</button>
</div>
<script>window.__SLIDES__ = ${slidesJson};</script>
<script>${STANDALONE_JS}</script>
</body>
</html>`;
}
