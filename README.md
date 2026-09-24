# Tu Wrapped

Sube un `.gpx` o `.fit` y genera un "story" animado con las estadísticas de tu ruta
(distancia, desnivel, velocidad, potencia, NP, IF, TSS, frecuencia cardíaca, temperatura...).

Todo el parseo y los cálculos ocurren **en el navegador del visitante** — no hay backend,
no hay servidor, el archivo nunca se sube a ningún sitio. Por eso no hace falta build ni
`npm install`: son ficheros estáticos tal cual.

## Estructura

- `index.html` — pantalla de subida de archivo
- `style.css` — estilos (tema oscuro reutilizado del resto del proyecto)
- `app.js` — orquesta: detecta el tipo de archivo, lo parsea y pinta el Wrapped
- `gpxParser.js` — lee `.gpx` (XML) con `DOMParser`
- `fitParser.js` — parser binario de `.fit` hecho desde cero (sin librerías)
- `computeStats.js` — calcula distancia, desnivel, velocidad, NP, etc. a partir de los puntos
- `wrappedEngine.js` — construye y anima las diapositivas a pantalla completa

## Desplegar en Vercel (desde GitHub)

1. Crea un repo nuevo en GitHub y sube esta carpeta tal cual (sin `node_modules`, no hace falta):
   ```
   git init
   git add .
   git commit -m "wrapped inicial"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```
2. Entra en [vercel.com/new](https://vercel.com/new) y elige "Import Git Repository".
3. Selecciona el repo. **Framework Preset: "Other"** (no hace falta build command ni output directory,
   déjalo todo por defecto — son ficheros estáticos).
4. Deploy. En un minuto tienes una URL pública (tipo `tu-repo.vercel.app`) que funciona para cualquiera,
   sin cuenta de nada.

Cada vez que hagas `git push` a `main`, Vercel vuelve a desplegar solo.

## Siguientes pasos (cuando quieras ampliarlo)

- Soporte `.tcx` (mismo patrón que `gpxParser.js`, es XML también).
- Guardar el resultado como imagen para compartir (con `html2canvas` o similar).
- Dejar elegir qué diapositivas mostrar antes de generar.
- Si más adelante quieres conectar con la cuenta de Strava de cada usuario en vez de pedir el archivo
  a mano, eso sí que necesita el backend con OAuth del que hablamos — este proyecto y aquel no son
  incompatibles, podrían convivir como dos formas de entrada distintas.
