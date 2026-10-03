const base = String(process.env.ORIENT_RELEASE_BASE_URL || 'https://geogeeklab.github.io/').replace(/\/+$/, '');
const expected = {
  runtime: '20261003i',
  feedback: '20261003g',
  trace: '20261003h',
  ergonomics: '20261003i'
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(path, attempts = 8) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${base}${path}${separator}releaseCheck=${Date.now()}-${attempt}`;
    try {
      const response = await fetch(url, { redirect: 'follow', cache: 'no-store' });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(Math.min(1000 * attempt, 5000));
    }
  }
  throw new Error(`Failed to fetch ${path}: ${lastError?.message || lastError}`);
}

function requireText(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label} is missing required release token: ${needle}`);
  }
}

const lab = await fetchText('/lab.html?flowMode=release&instrument=locate&orientSeed=release-live-smoke#l07');
requireText(lab, `play/play-runtime.js?v=${expected.runtime}`, 'live lab.html');

const runtime = await fetchText(`/play/play-runtime.js?v=${expected.runtime}`);
requireText(runtime, `orient-feedback.js?v=${expected.feedback}`, 'live play-runtime.js');
requireText(runtime, `orient-trace-view.js?v=${expected.trace}`, 'live play-runtime.js');
requireText(runtime, `orient-trace-enhancer.js?v=${expected.trace}`, 'live play-runtime.js');
requireText(runtime, `orient-ergonomics.js?v=${expected.ergonomics}`, 'live play-runtime.js');

const ergonomics = await fetchText(`/play/orient/orient-ergonomics.js?v=${expected.ergonomics}`);
requireText(ergonomics, 'orient-ergonomics-1', 'live orient-ergonomics.js');
requireText(ergonomics, `orient-ergonomics.css?v=${expected.ergonomics}`, 'live orient-ergonomics.js');

const trace = await fetchText(`/play/orient/orient-trace-view.js?v=${expected.trace}`);
requireText(trace, 'orient-trace-view-1', 'live orient-trace-view.js');

const placesText = await fetchText('/play/orient/data/places.v1.json');
const relationsText = await fetchText('/play/orient/data/relations.v1.json');
const places = JSON.parse(placesText);
const relations = JSON.parse(relationsText);
if (places.version !== 'orient-content-1') throw new Error(`Unexpected places version: ${places.version}`);
if (relations.version !== 'orient-content-1') throw new Error(`Unexpected relations version: ${relations.version}`);
if (!Array.isArray(places.places) || places.places.length < 40) throw new Error('Live place pool is unexpectedly small.');
if (!Array.isArray(relations.relations) || relations.relations.length < 1000) throw new Error('Live relation pool is unexpectedly small.');

console.log(`ORIENT live release verified at ${base}`);
console.log(`places=${places.places.length} relations=${relations.relations.length}`);
