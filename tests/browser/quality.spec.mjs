import fs from 'node:fs';
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
  console.log(`[axe] ${testInfo.project.name} ${page.url()} — critical=${critical.length}, serious=${serious.length}, total=${results.violations.length}`);

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
