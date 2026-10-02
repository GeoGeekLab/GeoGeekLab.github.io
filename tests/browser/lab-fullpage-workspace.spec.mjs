import { test, expect } from '@playwright/test';

const instruments = [
  ['orbit', '<div class="orbit-layout"><section class="orbit-stage"></section><aside class="orbit-panel"></aside></div>', '.orbit-panel'],
  ['earth', '<div class="earth-observation-lab"><section class="earth-observation-canvas"></section><aside class="earth-observation-panel"></aside></div>', '.earth-observation-panel'],
  ['flow', '<div class="flow-lab"><section class="flow-map-shell"></section><aside class="flow-rail"></aside></div>', '.flow-rail'],
  ['pulse', '<div class="pulse-observation-lab"><section class="pulse-map-wrap"></section><aside class="pulse-panel"></aside></div>', '.pulse-panel'],
  ['figure', '<div class="figure-layout figure-workbench"><section class="figure-stage"></section><aside class="figure-control"></aside></div>', '.figure-control'],
  ['world', '<div class="world-layout"><section class="world-map-wrap"></section><aside class="world-panel"></aside></div>', '.world-panel']
];

for (const [kind, fixture, railSelector] of instruments) {
  test(`${kind} uses the shared full-page Focus / Work / Inspect workspace`, async ({ page }) => {
    await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => Boolean(document.querySelector('link[data-lab-fullpage]')?.sheet));

    await page.evaluate(({ kind, fixture }) => {
      const dialog = document.getElementById('instrumentDialog');
      const stage = document.getElementById('instrumentStage');
      dialog.dataset.instrumentKind = kind;
      dialog.dataset.instrumentFamily = kind === 'figure' ? 'transform' : 'map';
      stage.innerHTML = fixture;
      dialog.showModal();
      document.body.classList.add('instrument-open');
    }, { kind, fixture });

    const dialog = page.locator('#instrumentDialog');
    await expect(dialog).toHaveAttribute('data-lab-workspace', 'true');
    await expect(dialog).toHaveAttribute('data-workspace-mode', 'work');
    await expect(page.locator('.instrument-workspace-modes')).toBeVisible();
    await expect(page.locator('#instrumentClose')).toContainText('LAB INDEX');

    const viewport = page.viewportSize();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(box.width - viewport.width)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - viewport.height)).toBeLessThanOrEqual(2);

    const rail = page.locator(railSelector);
    await expect(rail).toBeVisible();
    await page.locator('[data-workspace-mode="focus"]').click();
    await expect(dialog).toHaveAttribute('data-workspace-mode', 'focus');
    await expect(page.locator('.instrument-meta')).toBeHidden();
    await expect(rail).toBeHidden();

    await page.locator('[data-workspace-mode="inspect"]').click();
    await expect(dialog).toHaveAttribute('data-workspace-mode', 'inspect');
    await expect(rail).toBeVisible();

    const titleSize = await page.locator('#instrumentTitle').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
    expect(titleSize).toBeGreaterThanOrEqual(30);
  });
}
