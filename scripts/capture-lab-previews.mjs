import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// These screenshots validate that each Lab instrument renders a usable preview;
// they are not typography visual-regression tests. Playwright otherwise waits
// for document.fonts.ready before every screenshot, which can deadlock CI when
// a third-party webfont is slow or blocked.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const output = path.join(site, 'assets', 'lab', 'previews');
fs.mkdirSync(output, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.resolve(site, `.${pathname}`);
  if (!target.startsWith(site + path.sep) && target !== path.join(site, 'index.html')) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', mime[path.extname(target).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(4173, '127.0.0.1', resolve);
});

const base = 'http://127.0.0.1:4173';
const instruments = ['orbit', 'earth', 'flow', 'pulse', 'figure', 'world', 'locate', 'zone', 'path', 'project'];
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });

async function newPage(viewport = { width: 1600, height: 1000 }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });

  // Preview capture should verify application rendering, not the availability of a
  // third-party font CDN. Aborting font resources makes screenshots deterministic
  // and prevents screenshot font-wait stalls in unrelated labs.
  await page.route('**/*', route => {
    if (route.request().resourceType() === 'font') return route.abort();
    return route.continue();
  });

  await page.addInitScript(() => {
    let seed = 73421;
    Math.random = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  });
  return page;
}

async function installPulseFixtures(page) {
  const generated = Date.now() - 4 * 60 * 1000;
  const fetchedAt = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const landSource = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';
  const landVersion = 'Data current 2024-01-24 · pinned GeoJSON revision 0b9a6ceb0a70';
  const land = {
    type:'FeatureCollection',
    features:[
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-168,12],[-130,12],[-105,35],[-115,70],[-160,70],[-168,12]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-82,10],[-34,10],[-38,-55],[-74,-52],[-82,10]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-10,36],[45,36],[52,-35],[5,-35],[-10,36]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[25,35],[170,35],[150,75],[40,70],[25,35]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[110,-10],[155,-10],[153,-45],[112,-45],[110,-10]]] } },
    ],
  };
  const features = Array.from({ length:48 }, (_, index) => ({
    type:'Feature', id:`preview-${index}`,
    properties:{
      mag:1.8 + (index % 7) * .65,
      place:`Deterministic preview event ${index + 1}`,
      time:generated - (index + 1) * 24 * 60 * 1000,
      updated:generated - index * 18 * 60 * 1000,
      status:index % 3 ? 'reviewed' : 'automatic',
      magType:index % 2 ? 'ml' : 'mww',
      sig:60 + index * 5,
      felt:index % 5 === 0 ? 12 + index : null,
      cdi:index % 5 === 0 ? 2.5 + (index % 4) * .4 : null,
      mmi:index % 6 === 0 ? 2.8 + (index % 3) * .5 : null,
      url:`https://earthquake.usgs.gov/earthquakes/eventpage/preview-${index}`
    },
    geometry:{ type:'Point', coordinates:[-165 + (index * 29) % 330, -55 + (index * 17) % 110, 8 + (index * 31) % 520] },
  }));
  const quakes = {
    type:'FeatureCollection',
    metadata:{ generated, count:features.length, api:'preview-fixture' },
    features,
  };
  const quakeMeta = {
    schemaVersion:2,
    supplyId:'usgs-earthquakes-day',
    dataset:'usgs-earthquakes-day',
    provider:'USGS Earthquake Hazards Program',
    format:'GeoJSON',
    source:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    delivery:'GeoGeek same-origin snapshot',
    transport:'HTTPS GeoJSON feed → scheduled refresh → Pages snapshot',
    scope:'Global rolling past-24-hour event catalogue shared by all visitors',
    fetchedAt,
    recordCount:features.length,
    providerCount:features.length,
    providerGeneratedAt:new Date(generated).toISOString(),
    providerApiVersion:'preview-fixture',
    sha256:'preview-fixture-sha'
  };
  const landMeta = {
    schemaVersion:2,
    supplyId:'natural-earth-land-110m',
    dataset:'natural-earth-land-110m',
    provider:'Natural Earth',
    format:'GeoJSON',
    source:landSource,
    delivery:'GeoGeek same-origin reference',
    version:landVersion,
    recordCount:land.features.length,
    sha256:'preview-reference-sha'
  };

  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(quakeMeta)
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => route.fulfill({
    status:200, contentType:'application/geo+json', body:JSON.stringify(quakes)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(landMeta)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => route.fulfill({
    status:200, contentType:'application/geo+json', body:JSON.stringify(land)
  }));

  // A preview must fail rather than silently regress to direct provider/CDN access.
  await page.route('https://earthquake.usgs.gov/**', route => route.abort());
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/topojson-client@**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/world-atlas@**', route => route.abort());
}

async function exerciseFlowLab(page) {
  await page.waitForFunction(() => {
    const lab = document.querySelector('#instrumentStage .flow-lab');
    return !!lab && !!window.GeoFlowLab && !!window.GeoFlowLabPolish && window.GeoGeekInstrumentMounts?.flow === window.GeoFlowLab.mount;
  }, null, { timeout: 25000 });

  const tabs = page.locator('#instrumentStage .flow-tabs [data-mode]');
  const count = await tabs.count();
  if (count !== 4) throw new Error(`flow: expected four representation modes, found ${count}`);

  const title = await page.locator('#instrumentTitle').textContent();
  if (title?.trim() !== 'Geographic Flow Laboratory') throw new Error(`flow: stale instrument title "${title?.trim() || ''}"`);

  const checks = [
    ['od', '#instrumentStage .flow-svg [data-type="od"]'],
    ['trips', '#instrumentStage #flTripTime'],
    ['release', '#instrumentStage #flReleaseCount'],
    ['field', '#instrumentStage #flDensity']
  ];
  for (const [mode, selector] of checks) {
    await page.locator(`#instrumentStage .flow-tabs [data-mode="${mode}"]`).click();
    await page.waitForFunction(value => document.querySelector('#instrumentStage .flow-lab')?.dataset.mode === value, mode, { timeout: 5000 });
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  }
}

async function captureInstrument(kind) {
  const page = await newPage();
  const url = `${base}/lab.html?instrument=${encodeURIComponent(kind)}`;
  try {
    if (kind === 'pulse') await installPulseFixtures(page);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.getElementById('instrumentDialog')?.open === true, null, { timeout: 20000 });
    await page.waitForSelector('#instrumentStage > *', { state: 'visible', timeout: 20000 });

    if (kind === 'earth') {
      await page.waitForSelector('.earth-observation-lab', { state: 'visible', timeout: 10000 });
      await page.waitForFunction(() => {
        const loading = document.querySelector('#eoLoading');
        return !!loading && loading.dataset.state !== 'loading';
      }, null, { timeout: 18000 }).catch(() => {});
    }

    if (kind === 'pulse') {
      await page.waitForFunction(() => !!window.GeoPulseObservationLab && window.GeoGeekInstrumentMounts?.pulse === window.GeoPulseObservationLab.mount, null, { timeout:10000 });
      await page.waitForSelector('.pulse-observation-lab[data-state="ready"]', { state:'visible', timeout:10000 });
    }

    if (kind === 'flow') await exerciseFlowLab(page);

    const settle = kind === 'flow' || kind === 'orbit' ? 6500 : 2800;
    await page.waitForTimeout(settle);

    if (await page.locator('#instrumentStage .instrument-error').count()) {
      throw new Error(`${kind}: instrument rendered an error state`);
    }

    const stage = page.locator('#instrumentStage');
    const box = await stage.boundingBox();
    if (!box || box.width < 300 || box.height < 180) throw new Error(`${kind}: invalid stage bounds`);

    await stage.screenshot({
      path: path.join(output, `${kind}.jpg`),
      type: 'jpeg',
      quality: 86,
      animations: 'disabled',
      timeout: 20000
    });
    console.log(`Captured Lab instrument: ${kind}`);
  } finally {
    await page.close();
  }
}

const failures = [];
try {
  for (const kind of instruments) {
    try { await captureInstrument(kind); }
    catch (error) { failures.push(`${kind}: ${error.message}`); console.error(error); }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const expected = instruments.map(name => path.join(output, `${name}.jpg`));
const missing = expected.filter(file => !fs.existsSync(file) || fs.statSync(file).size < 8000);
if (failures.length || missing.length) {
  if (failures.length) console.error('Capture failures:', failures.join(' | '));
  if (missing.length) console.error('Missing/invalid Lab previews:', missing.map(file => path.basename(file)).join(', '));
  process.exit(1);
}

console.log(`Generated ${expected.length} real Lab preview images.`);