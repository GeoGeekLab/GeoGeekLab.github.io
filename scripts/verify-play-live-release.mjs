import { readFile, stat } from 'node:fs/promises';

const kinds = ['locate', 'zone', 'path', 'project', 'light', 'swath'];
const release = '20261008b';
const local = process.argv.includes('--local');
const base = String(process.env.PLAY_RELEASE_BASE_URL || 'https://geogeeklab.github.io/').replace(/\/+$/, '');
const html = await readFile(new URL('../site/lab.html', import.meta.url), 'utf8');
if (!html.includes('<meta content="' + release + '" name="geogeek-lab-release"/>')) {
  throw new Error('Lab release metadata is stale.');
}
const version = html.match(/src="play\/play-runtime\.js\?v=([^"]+)"/)?.[1];
if (!version) throw new Error('Lab HTML is missing the versioned Play runtime.');
const runtime = await readFile(new URL('../site/play/play-runtime.js', import.meta.url), 'utf8');
const manifest = runtime.match(/const SCRIPT\s*=\s*\{([\s\S]*?)\n\s*\};/)?.[1];
if (!manifest) throw new Error('The Play runtime has no SCRIPT manifest.');
for (const kind of kinds) {
  if (!new RegExp('\\b' + kind + ":\\s*['\"]play\\/[a-z-]+\\/[a-z-]+\\.js\\?v=[^'\"]+['\"]").test(manifest)) {
    throw new Error('The Play manifest is missing: ' + kind);
  }
}
const dependencies = [...new Set([...runtime.matchAll(/['"](play\/(?:[a-z-]+\/)?[a-z0-9-]+\.js\?v=[^'"]+)['"]/g)].map(match => match[1]))].sort();
if (dependencies.length < 25) throw new Error('The Play dependency manifest is unexpectedly small.');
if (local) {
  for (const path of dependencies) {
    const file = new URL('../site/' + path.split('?')[0], import.meta.url);
    const result = await stat(file);
    if (!result.isFile() || result.size < 30) throw new Error('Invalid Play file: ' + path);
  }
  console.log('Local six-PLAY manifest verified: ' + dependencies.length + ' files');
} else {
  async function getText(path) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = new URL(base + '/' + path.replace(/^\/+/, ''));
        url.searchParams.set('__play_probe', String(Date.now()) + '-' + attempt);
        const response = await fetch(url, { cache:'no-store', redirect:'follow', signal:AbortSignal.timeout(15_000) });
        if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + url);
        const body = await response.text();
        if (body.length < 30) throw new Error('Empty: ' + url);
        return body;
      } catch(error) {
        lastError = error;
        if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
      }
    }
    throw lastError;
  }
  const liveHtml = await getText('lab.html');
  if (!liveHtml.includes('<meta content="' + release + '" name="geogeek-lab-release"/>')) throw new Error('Live Lab release is stale.');
  if (!liveHtml.includes('play/play-runtime.js?v=' + version)) throw new Error('Live Play runtime reference is stale.');
  const liveRuntime = await getText('play/play-runtime.js?v=' + version);
  if (liveRuntime !== runtime) throw new Error('Live Play runtime differs from the release source.');
  const errors = [];
  for (let i = 0; i < dependencies.length; i += 6) {
    await Promise.all(dependencies.slice(i,i+6).map(async path => {
      try { await getText(path); }
      catch(error) { errors.push(path + ': ' + error.message); }
    }));
  }
  if (errors.length) throw new Error('Missing live Play resources:\n' + errors.join('\n'));
  console.log('Live six-PLAY release verified: ' + dependencies.length + ' files at ' + base);
}
