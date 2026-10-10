import { test, expect } from '@playwright/test';

const cases = [
  ['locate', 'orient'],
  ['zone', 'bound'],
  ['path', 'connect'],
  ['project', 'project'],
  ['light', 'light'],
  ['swath', 'swath']
];
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 }
];
const shellFor = kind =>
  `.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1',
      JSON.stringify({ version: 'orient-primer-1', seen: true }));
  });
});

for (const [instrument, kind] of cases) {
  test(`STEP 12: ${kind} returns with browser Back and restores with Forward`,
    async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop-chromium',
        'Browser history and desktop workspace release gate');
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto('/lab.html', { waitUntil: 'domcontentloaded' });
      const initial = await page.evaluate(() =>
        location.pathname + location.search + location.hash);
      const initialHistoryLength = await page.evaluate(() => history.length);

      await page.locator(`[data-instrument="${instrument}"]`).first().click();
      const dialog = page.locator('#instrumentDialog');
      const shell = page.locator(shellFor(kind));
      await expect(shell).toBeVisible({ timeout: 20_000 });
      await expect(dialog).toHaveAttribute('data-play-workspace', 'true');
      await expect.poll(() => page.evaluate(() => history.length))
        .toBe(initialHistoryLength + 1);
      await expect.poll(() => page.evaluate(() =>
        new URL(location.href).searchParams.get('instrument'))).toBe(instrument);

      await page.evaluate(() => history.back());
      await expect.poll(() => page.evaluate(() =>
        location.pathname + location.search + location.hash)).toBe(initial);
      await expect(dialog).not.toHaveAttribute('open', '');
      await expect(dialog).not.toHaveAttribute('data-play-workspace', 'true');
      await expect(shell).toHaveCount(0);

      await page.evaluate(() => history.forward());
      await expect.poll(() => page.evaluate(() =>
        new URL(location.href).searchParams.get('instrument'))).toBe(instrument);
      await expect(shell).toBeVisible({ timeout: 20_000 });
      await expect(shell).toHaveCount(1);
      await expect(dialog).toHaveAttribute('data-play-workspace', 'true');
      await info.attach(`step12-history-forward-${kind}-1366`, {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png'
      });
    });
}

test('STEP 12: all six workspaces retain full viewport geometry in final desktop matrix',
  async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop-chromium',
      'Final desktop visual geometry matrix');
    for (const size of viewports) {
      await page.setViewportSize(size);
      for (const [instrument, kind] of cases) {
        await page.goto(`/lab.html?instrument=${instrument}`,
          { waitUntil: 'domcontentloaded' });
        const shell = page.locator(shellFor(kind));
        const dialog = page.locator('#instrumentDialog');
        await expect(shell).toBeVisible({ timeout: 20_000 });
        const geometry = await shell.evaluate(root => {
          const rect = element => {
            const r = element.getBoundingClientRect();
            return { x:r.x, y:r.y, right:r.right, bottom:r.bottom,
              width:r.width, height:r.height };
          };
          return {
            shell:rect(root),
            stage:rect(root.closest('#instrumentStage')),
            dialog:rect(document.getElementById('instrumentDialog')),
            viewport:{width:innerWidth,height:innerHeight},
            scrollWidth:document.documentElement.scrollWidth
          };
        });
        expect(Math.abs(geometry.dialog.width - size.width)).toBeLessThanOrEqual(2);
        expect(Math.abs(geometry.dialog.height - size.height)).toBeLessThanOrEqual(2);
        expect(Math.abs(geometry.shell.width - geometry.stage.width)).toBeLessThanOrEqual(2);
        expect(Math.abs(geometry.shell.height - geometry.stage.height)).toBeLessThanOrEqual(2);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(size.width + 2);
        await expect(dialog.locator('#instrumentClose')).toBeVisible();
        await info.attach(`step12-${kind}-entry-${size.width}`, {
          body: await page.screenshot({ animations: 'disabled' }),
          contentType: 'image/png'
        });
      }
    }
  });
