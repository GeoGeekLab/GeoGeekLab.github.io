import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
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
const previewRuntime = path.join(site, 'lab-real-previews.js');
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
const instruments = ['orbit', 'earth', 'flow', 'pulse', 'figure', 'world', 'locate', 'zone', 'path', 'project', 'light'];
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

function assertPulseProductionSupply() {
  const required = [
    'data/snapshots/usgs-earthquakes-day.meta.json',
    'data/snapshots/usgs-earthquakes-day.geojson',
    'data/reference/natural-earth-land-110m.meta.json',
    'data/reference/natural-earth-land-110m.geojson'
  ];
  const missing = required.filter(relative => {
    const file = path.join(site, relative);
    return !fs.existsSync(file) || fs.statSync(file).size < 100;
  });
  if (missing.length) {
    throw new Error(`pulse: production preview data missing: ${missing.join(', ')}. Prepare the data supply before preview capture.`);
  }
}

async function lockPulseToSameOrigin(page) {
  // A production preview must use the same files that the deployed instrument reads.
  // Fail instead of silently falling back to provider or CDN access.
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
    if (kind === 'pulse') {
      assertPulseProductionSupply();
      await lockPulseToSameOrigin(page);
    }

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
      await page.waitForFunction(() => !!window.GeoPulseObservationLab && window.GeoGeekInstrumentMounts?.pulse === window.GeoPulseObservationLab.mount, null, { timeout: 10000 });
      await page.waitForSelector('.pulse-observation-lab[data-state="ready"]', { state: 'visible', timeout: 10000 });
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

function updatePreviewCacheVersion(files) {
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(path.basename(file));
    hash.update(fs.readFileSync(file));
  }
  const version = `capture-${hash.digest('hex').slice(0, 12)}`;
  const source = fs.readFileSync(previewRuntime, 'utf8');
  const versionPattern = /const VERSION = ['"][^'"]+['"];/;
  if (!versionPattern.test(source)) throw new Error('Lab preview runtime is missing the VERSION declaration.');
  fs.writeFileSync(previewRuntime, source.replace(versionPattern, `const VERSION = '${version}';`));
  console.log(`Lab preview cache version: ${version}`);
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

updatePreviewCacheVersion(expected);
console.log(`Generated ${expected.length} real Lab preview images.`);
