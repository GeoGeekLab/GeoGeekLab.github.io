import { test, expect } from '@playwright/test';

const principalRoutes = [
  '/index.html',
  '/field-notes.html',
  '/lab.html',
  '/atlas.html',
  '/elsewhere.html',
  '/origin/',
  '/stories/geospatial-ai-limits/'
];

async function expectReady(page) {
  await expect(page.locator('html')).toHaveAttribute('data-geogeek-boot', 'ready');
  await expect(page.locator('#geogeek-boot-cover')).toHaveCSS('opacity', '0');
  await expect.poll(() => page.evaluate(() => window.__GEOGEEK_VISUAL_READY__)).toBe(true);
}

test.describe('site-wide visual readiness', () => {
  test('all principal document entries reveal only through the shared ready state', async ({ page }) => {
    for (const route of principalRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expectReady(page);
      await expect(page.locator('script[data-geogeek-visual-readiness="true"]')).toHaveCount(1);
      await expect(page.locator('#geogeek-boot-cover')).toHaveCount(1);
    }
  });

  test('root path uses the index artifact without a client-side redirect navigation', async ({ page }) => {
    const navigations = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) navigations.push(new URL(frame.url()).pathname);
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expectReady(page);
    expect(new URL(page.url()).pathname).toBe('/');
    expect(navigations.filter(path => path === '/' || path === '/index.html')).toEqual(['/']);
  });

  test('same-origin navigation covers the outgoing document before navigation', async ({ page }) => {
    await page.goto('/index.html');
    await expectReady(page);

    let releaseRequest;
    await page.route('**/field-notes.html', async route => {
      await new Promise(resolve => { releaseRequest = resolve; });
      await route.continue();
    });

    await page.locator('a[href="field-notes.html"]').first().click({ noWaitAfter: true });
    await expect(page.locator('html')).toHaveAttribute('data-geogeek-boot', 'leaving');
    await expect(page.locator('#geogeek-boot-cover')).toHaveCSS('opacity', '1');
    await expect.poll(() => Boolean(releaseRequest)).toBe(true);

    releaseRequest();
    await page.waitForURL('**/field-notes.html');
    await expectReady(page);
  });

  test('main entry routes return through a stable Back/Forward state', async ({ page }) => {
    const entries = [
      ['Field Notes', '/field-notes.html'],
      ['Lab', '/lab.html'],
      ['Atlas', '/atlas.html'],
      ['Elsewhere', '/elsewhere.html']
    ];

    for (const [label, route] of entries) {
      await page.goto('/index.html');
      await expectReady(page);
      await page.getByRole('link', { name: label, exact: true }).first().click();
      await page.waitForURL(`**${route}`);
      await expectReady(page);

      await page.goBack({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/index\.html(?:[?#].*)?$/);
      await expectReady(page);
      await expect(page.locator('html')).not.toHaveAttribute('data-geogeek-boot', /loading|leaving|frozen|restoring/);
    }
  });

  test('record pages inherit the same gate automatically', async ({ page }) => {
    await page.goto('/records/lab-l01.html', { waitUntil: 'domcontentloaded' });
    await expectReady(page);
  });
});
