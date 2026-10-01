import { test, expect } from '@playwright/test';

const tinyGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

test('Earth temporal lab exposes sensor-aware timeline and swipe compare', async ({ page }) => {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.fulfill({
    status: 200,
    contentType: 'image/gif',
    body: tinyGif
  }));

  await page.goto('/lab.html?instrument=earth#l05', { waitUntil: 'domcontentloaded' });

  const lab = page.locator('.earth-observation-lab');
  await expect(lab).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#eoInspectorTitle')).toHaveText('True color');
  await expect(page.locator('[data-earth-layer]')).toHaveCount(3);

  await page.locator('[data-group="THERMAL"]').click();
  const thermal = page.locator('[data-earth-layer="surface-temp"]');
  await expect(thermal).toBeVisible();
  await thermal.click();
  await expect(page.locator('#eoInspectorTitle')).toHaveText('Land surface temperature');
  await expect(page.locator('#eoOpacityWrap')).toBeVisible();

  const compare = page.locator('#eoCompare');
  await compare.click();
  await expect(compare).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#eoCompareHandle')).toBeVisible();
  await expect(page).toHaveURL(/earthCompare=1/);

  await page.locator('[data-offset="30"]').click();
  await expect(page.locator('#eoHudReference')).toContainText('30D');
  await expect(page).toHaveURL(/earthOffset=30/);

  await page.locator('#eoGrid').click();
  await expect(page.locator('#eoGrid')).toHaveAttribute('aria-pressed', 'false');
});
