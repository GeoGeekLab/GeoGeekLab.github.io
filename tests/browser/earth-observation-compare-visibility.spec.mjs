import { test, expect } from '@playwright/test';

const tinyGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

test('Earth compare OFF never masks the primary raster, even with a persisted split', async ({ page }) => {
  await page.route('https://gibs.earthdata.nasa.gov/**', route => route.fulfill({
    status:200,
    contentType:'image/gif',
    body:tinyGif
  }));

  await page.goto('/lab.html?instrument=earth&earthSplit=12#l05', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.earth-observation-lab')).toBeVisible({ timeout:10000 });
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');

  await expect(page.locator('#eoHudReference')).toHaveText('OFF');
  await expect(page.locator('#eoCompare')).toHaveAttribute('aria-pressed', 'false');
  await expect(page).not.toHaveURL(/earthCompare=1/);
  await expect(page).not.toHaveURL(/earthSplit=/);

  const initial = await page.evaluate(() => {
    const frame = document.querySelector('#eoFrame');
    const primary = document.querySelector('#eoImageA img[data-eo-role="observation"]');
    const reference = document.querySelector('#eoImageB');
    const referenceLabel = document.querySelector('#eoLabelBWrap');
    const handle = document.querySelector('#eoCompareHandle');
    const frameRect = frame.getBoundingClientRect();
    const primaryRect = primary.getBoundingClientRect();
    return {
      referenceHidden:reference.hidden,
      referenceDisplay:getComputedStyle(reference).display,
      referenceLabelHidden:referenceLabel.hidden,
      referenceLabelDisplay:getComputedStyle(referenceLabel).display,
      handleHidden:handle.hidden,
      handleDisplay:getComputedStyle(handle).display,
      primaryWidth:primaryRect.width,
      primaryHeight:primaryRect.height,
      frameWidth:frameRect.width,
      frameHeight:frameRect.height
    };
  });

  expect(initial.referenceHidden).toBe(true);
  expect(initial.referenceDisplay).toBe('none');
  expect(initial.referenceLabelHidden).toBe(true);
  expect(initial.referenceLabelDisplay).toBe('none');
  expect(initial.handleHidden).toBe(true);
  expect(initial.handleDisplay).toBe('none');
  expect(Math.abs(initial.primaryWidth - initial.frameWidth)).toBeLessThanOrEqual(1);
  expect(Math.abs(initial.primaryHeight - initial.frameHeight)).toBeLessThanOrEqual(1);

  await page.locator('#eoCompare').click();
  await expect(page.locator('#eoCompare')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');
  const handle = page.locator('#eoCompareHandle');
  await expect(handle).toBeVisible();
  await handle.focus();
  await handle.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '5');

  await page.locator('#eoCompare').click();
  await expect(page.locator('#eoHudReference')).toHaveText('OFF');
  await expect(page.locator('#eoCompare')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#eoImageB')).toBeHidden();
  await expect(page.locator('#eoLabelBWrap')).toBeHidden();
  await expect(page.locator('#eoCompareHandle')).toBeHidden();

  const after = await page.evaluate(() => ({
    referenceDisplay:getComputedStyle(document.querySelector('#eoImageB')).display,
    referenceBackground:getComputedStyle(document.querySelector('#eoImageB')).backgroundColor,
    labelDisplay:getComputedStyle(document.querySelector('#eoLabelBWrap')).display,
    handleDisplay:getComputedStyle(document.querySelector('#eoCompareHandle')).display
  }));
  expect(after.referenceDisplay).toBe('none');
  expect(after.labelDisplay).toBe('none');
  expect(after.handleDisplay).toBe('none');
  expect(after.referenceBackground).toBe('rgba(0, 0, 0, 0)');
});
