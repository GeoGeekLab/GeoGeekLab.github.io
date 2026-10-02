import { test, expect } from '@playwright/test';

const tinyGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

async function openEarth(page) {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.fulfill({
    status:200,
    contentType:'image/gif',
    body:tinyGif
  }));
  await page.goto('/lab.html?instrument=earth#l05', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.earth-observation-lab')).toBeVisible({ timeout:10000 });
  await expect(page.locator('.earth-rail-nav')).toBeVisible({ timeout:10000 });
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');
}

test('Earth round two exposes a product-first observation workflow', async ({ page }) => {
  await openEarth(page);

  const dialog = page.locator('#instrumentDialog');
  await expect(dialog).toHaveAttribute('data-workspace-mode', 'work');
  await expect(page.locator('.earth-rail-nav [data-earth-jump]')).toHaveCount(5);
  await expect(page.locator('.earth-observation-summary')).toContainText('ACTIVE OBSERVATION');
  await expect(page.locator('[data-earth-summary-title]')).toHaveText('True color');
  await expect(page.locator('[data-earth-summary-group]')).toHaveText('VISUAL');
  await expect(page.locator('[data-earth-summary-date]')).toContainText('UTC');
  await expect(page.locator('[data-earth-summary-state]')).toContainText('WMS · VIEWPORT');

  const source = page.locator('[data-earth-section="source"]');
  await expect(source).toBeHidden();
  await page.locator('[data-earth-jump="source"]').click();
  await expect(dialog).toHaveAttribute('data-workspace-mode', 'inspect');
  await expect(source).toBeVisible();
  await expect(source).toContainText('OBSERVATION CONDITIONS');

  await page.locator('.instrument-workspace-modes button[data-workspace-mode="work"]').click();
  await expect(source).toBeHidden();
  await page.locator('[data-earth-jump="time"]').click();
  await expect(page.locator('#eoRange')).toBeFocused();
  await expect(page.locator('#earthTimelineHint')).toContainText('DRAG TO PREVIEW');

  const firstLayer = page.locator('#eoLayerList [data-earth-layer]').first();
  const secondLayer = page.locator('#eoLayerList [data-earth-layer]').nth(1);
  await firstLayer.focus();
  await firstLayer.press('ArrowDown');
  await expect(secondLayer).toBeFocused();

  await page.locator('#eoCompare').click();
  const relation = page.locator('.earth-temporal-relation');
  await expect(relation).toBeVisible();
  await expect(relation).toContainText('TIME RELATION');
  await expect(relation.locator('[data-earth-primary-date]')).not.toHaveText('—');
  await expect(relation.locator('[data-earth-reference-date]')).not.toHaveText('—');
  await expect(page).toHaveURL(/earthCompare=1/);

  await relation.locator('[data-earth-relation-off]').click();
  await expect(page.locator('#eoCompare')).toHaveAttribute('aria-pressed', 'false');
  await expect(relation).toBeHidden();
  await expect(page.locator('#instrumentStage')).not.toContainText('DEMO');
});