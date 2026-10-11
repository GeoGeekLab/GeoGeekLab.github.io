import {test, expect} from '@playwright/test';

async function openQuietWater(page) {
  await page.goto('/lab.html?instrument=water#l13', {waitUntil:'domcontentloaded'});
  await expect(page.locator('iframe.water-v102-frame')).toBeVisible({timeout:45000});
  const frame = page.frameLocator('iframe.water-v102-frame');
  await expect(frame.locator('.water-scope-strip')).toBeVisible({timeout:30000});
  await expect(frame.locator('#mainContent')).toBeVisible();
  return frame;
}

test('Water displays the scientific boundary and progressively discloses methods', async ({page}) => {
  const frame = await openQuietWater(page);
  await expect(frame.locator('.water-scope-boundary')).toContainText('Not externally validated');
  await expect(frame.locator('#uiStatusBar')).toBeHidden();
  await expect(frame.locator('#v10Science')).toBeHidden();
  await frame.locator('.water-scope-more > summary').click();
  await expect(frame.locator('#uiStatusBar')).toBeVisible();
  await expect(frame.locator('#uiValidationStatus')).not.toBeEmpty();
  await expect(frame.locator('#v10Science')).toBeVisible();
  await frame.locator('.water-scope-more > summary').click();
  await expect(frame.locator('#uiStatusBar')).toBeHidden();
});

test('Water optics keeps all original controls and preserves disclosure state after model updates', async ({page}) => {
  const frame = await openQuietWater(page);
  await expect(frame.locator('#range-chl')).toBeVisible();
  await expect(frame.locator('#range-ag')).toBeVisible();
  await expect(frame.locator('#range-anap')).toBeHidden();
  await expect(frame.locator('#range-bbp')).toBeHidden();

  const more = frame.locator('#controls details[data-quiet-disclosure="iop:constituents"]');
  await expect(more).toBeVisible();
  await more.locator('summary').click();
  await expect(more).toHaveAttribute('open', '');
  await expect(frame.locator('#range-anap')).toBeVisible();
  await expect(frame.locator('#range-bbp')).toBeVisible();

  await frame.locator('[data-preset="cdom"]').click();
  await expect(frame.locator('#controls details[data-quiet-disclosure="iop:constituents"]')).toHaveAttribute('open', '');
  await expect(frame.locator('#range-anap')).toBeVisible();
  await expect(frame.locator('#mainContent')).not.toContainText('Workspace unavailable');
});

test('Secondary atmosphere settings remain reachable, including keyboard navigation', async ({page}) => {
  const frame = await openQuietWater(page);
  await frame.locator('#mainNav [data-tab="atm"]').click();
  await expect(frame.locator('#range-aot')).toBeVisible();
  await expect(frame.locator('#range-pressure')).toBeHidden();
  const details = frame.locator('#controls details[data-quiet-disclosure="atm:geometry"]');
  await details.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(frame.locator('#range-pressure')).toBeVisible();
  await expect(frame.locator('#range-sza')).toBeVisible();
  await expect(frame.locator('#mainContent')).not.toContainText('Workspace unavailable');
});

test('Water Optics places the spectrum before secondary metric cards', async ({page}) => {
  const frame = await openQuietWater(page);
  const details = frame.locator('.water-chart-method');
  await expect(details).toBeVisible();
  await expect(frame.locator('.p6-limit')).toBeHidden();

  const chart = await frame.locator('.p6-optics-plots').boundingBox();
  const readings = await frame.locator('.p6-reading-grid').boundingBox();
  expect(chart).not.toBeNull();
  expect(readings).not.toBeNull();
  expect(chart.y).toBeLessThan(readings.y);

  await details.locator('summary').click();
  await expect(frame.locator('.p6-limit')).toBeVisible();
  await expect(frame.locator('.p6-reading')).toHaveCount(3);
});

test('Sensitivity keeps the working parameter editor immediately actionable', async ({page}) => {
  const frame = await openQuietWater(page);
  await frame.locator('#mainNav [data-tab="sensitivity"]').click();
  await expect(frame.locator('#num-chl')).toBeVisible();
  await frame.locator('#num-chl').fill('0.02');
  await frame.locator('#num-chl').dispatchEvent('change');
  await expect(frame.locator('#mainContent')).toContainText('ONE-SIDED BOUNDARY');
  await expect(frame.locator('#num-chl')).toHaveValue('0.02');
});

test('The original Water share link displays the quiet, cache-busted workbench', async ({page}) => {
  await page.goto('/lab.html?release=20261010v103play3&instrument=water#l13', {waitUntil:'domcontentloaded'});
  await expect(page.locator('meta[name="geogeek-lab-release"]')).toHaveAttribute('content','20261011v107watercache1');
  const frame = page.frameLocator('#instrumentStage iframe.water-v102-frame');
  await expect(frame.locator('.water-scope-boundary')).toContainText('Not externally validated', {timeout:45000});
  await expect(frame.locator('#range-chl')).toBeVisible();
  await expect(frame.locator('#range-anap')).toBeHidden();
  // The Water adapter is loaded through dynamic import(), not a script tag.
  const iframeUrl = await page.locator('#instrumentStage iframe.water-v102-frame').getAttribute('src');
  expect(new URL(iframeUrl, page.url()).searchParams.get('chartfix')).toBe('10.2.0-quiet2');
});
