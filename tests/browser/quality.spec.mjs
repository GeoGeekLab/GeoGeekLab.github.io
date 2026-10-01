import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

const coreRoutes = [
  '/',
  '/field-notes.html',
  '/lab.html',
  '/atlas.html',
  '/elsewhere.html',
  '/earth/',
  '/origin/'
];

function watchRuntime(page) {
  const pageErrors = [];
  const localResourceFailures = [];
  const consoleErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4173' && response.status() >= 400) {
      localResourceFailures.push(`${response.status()} ${url.pathname}`);
    }
  });

  return { pageErrors, localResourceFailures, consoleErrors };
}

async function runAxe(page, testInfo) {
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
      },
      resultTypes: ['violations']
    });
  });

  await testInfo.attach('axe-violations.json', {
    body: Buffer.from(JSON.stringify(results.violations, null, 2)),
    contentType: 'application/json'
  });

  const critical = results.violations.filter(item => item.impact === 'critical');
  const serious = results.violations.filter(item => item.impact === 'serious');
  const actionable = results.violations
    .filter(item => item.impact === 'critical' || item.impact === 'serious')
    .map(item => `${item.impact}:${item.id}[${item.nodes.length}]`)
    .join(', ');

  console.log(`[axe] ${testInfo.project.name} ${page.url()} — critical=${critical.length}, serious=${serious.length}, total=${results.violations.length}${actionable ? ` — ${actionable}` : ''}`);
  expect(critical, `Critical axe violations on ${page.url()}`).toEqual([]);
}

for (const route of coreRoutes) {
  test(`${route} renders without fatal browser regressions`, async ({ page }, testInfo) => {
    const runtime = watchRuntime(page);
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

    expect(response, `No document response for ${route}`).not.toBeNull();
    expect(response.status(), `Unexpected document status for ${route}`).toBeLessThan(400);
    await expect(page.locator('main')).toBeVisible();
    await expect(page).toHaveTitle(/\S+/);
    await page.waitForTimeout(300);

    expect(runtime.pageErrors, `Uncaught page errors on ${route}`).toEqual([]);
    expect(runtime.localResourceFailures, `Broken local resources on ${route}`).toEqual([]);

    if (runtime.consoleErrors.length) {
      await testInfo.attach('console-errors.txt', {
        body: Buffer.from(runtime.consoleErrors.join('\n')),
        contentType: 'text/plain'
      });
      console.log(`[console] ${route}: ${runtime.consoleErrors.length} error message(s) captured for review`);
    }

    await runAxe(page, testInfo);
  });
}

test('Field Notes exposes a statically navigable article', async ({ page }, testInfo) => {
  const runtime = watchRuntime(page);
  await page.goto('/field-notes.html', { waitUntil: 'domcontentloaded' });
  const articleLink = page.locator('a[href*="/field-notes/"]').first();
  await expect(articleLink).toBeVisible();

  const href = await articleLink.getAttribute('href');
  expect(href).toBeTruthy();
  const articleUrl = new URL(href, page.url());
  const response = await page.goto(articleUrl.href, { waitUntil: 'domcontentloaded' });

  expect(response.status()).toBeLessThan(400);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-static-body]')).toBeVisible();
  expect(runtime.pageErrors).toEqual([]);
  expect(runtime.localResourceFailures).toEqual([]);
  await runAxe(page, testInfo);
});

test('Field Notes filters static rows without legacy hydration', async ({ page }) => {
  const localScripts = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:4173' && request.resourceType() === 'script') localScripts.push(url.pathname);
  });

  await page.goto('/field-notes.html', { waitUntil: 'domcontentloaded' });
  const rows = page.locator('[data-static-note-list] .static-note-row');
  const total = await rows.count();
  expect(total).toBeGreaterThan(10);

  const filter = page.locator('[data-note-filter="observation"]');
  await filter.click();
  await expect(filter).toHaveAttribute('aria-pressed', 'true');
  const visible = await rows.evaluateAll(nodes => nodes.filter(node => !node.hidden).length);
  expect(visible).toBeGreaterThan(0);
  expect(visible).toBeLessThan(total);

  await page.waitForTimeout(2000);
  expect(localScripts.some(path => /\/(?:content|archive-content|app)\.js$/.test(path) || /\/core\/(?:site-model|modules)\.js$/.test(path))).toBe(false);
});

test('Lab prioritizes its first-view Earth preview image', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
  const image = page.locator('.earth-preview-screen > img');
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('loading', 'eager');
  await expect(image).toHaveAttribute('fetchpriority', 'high');
});

test('Earth defers MapLibre until explicit activation', async ({ page }) => {
  const maplibreRequests = [];
  page.on('request', request => {
    if (/maplibre-gl@6\.6\.0/.test(request.url())) maplibreRequests.push(request.url());
  });

  await page.goto('/earth/', { waitUntil: 'domcontentloaded' });
  const activate = page.locator('#earthActivate');
  await expect(activate).toBeVisible();
  await page.waitForTimeout(500);
  expect(maplibreRequests).toHaveLength(0);

  await activate.click();
  await expect.poll(() => maplibreRequests.length, { timeout: 10000 }).toBeGreaterThan(0);
  await page.waitForFunction(() => !!document.querySelector('#map canvas'), null, { timeout: 30000 });
  await expect(page.locator('#earthBoot')).toHaveCount(0);
});

test('unknown routes return a real HTTP 404 in the test server', async ({ page }) => {
  const response = await page.goto('/__quality_missing_route__', { waitUntil: 'domcontentloaded' });
  expect(response.status()).toBe(404);
});

test('home exposes a keyboard-reachable skip link', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const skip = page.locator('a.skip');
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute('href', '#main');
});
