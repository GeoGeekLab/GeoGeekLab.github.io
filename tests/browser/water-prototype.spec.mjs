import { test, expect } from '@playwright/test';

test('Water as Spectrum prototype links one state to PATH, IOP and synchronized spectra', async ({ page }) => {
  await page.goto('/water/prototype.html', { waitUntil:'domcontentloaded' });

  await expect(page.locator('h1')).toHaveText('Water as Spectrum');
  await expect(page.locator('#waterWorkbench')).toHaveAttribute('data-mode','path');
  await expect(page.locator('.water-chart')).toHaveCount(3);
  await expect(page.locator('#probeWavelength')).toHaveText('443 nm');

  await page.locator('[data-water-mode="iop"]').click();
  await expect(page.locator('#waterWorkbench')).toHaveAttribute('data-mode','iop');
  await expect(page.locator('[data-water-mode="iop"]')).toHaveAttribute('aria-pressed','true');

  const before=await page.locator('#probeRrsTotal').textContent();
  await page.locator('[data-preset="cdomRich"]').click();
  await expect(page.locator('[data-preset="cdomRich"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#cdomOutput')).toHaveText('0.800 m⁻¹');
  const after=await page.locator('#probeRrsTotal').textContent();
  expect(after).not.toBe(before);
  await expect(page.locator('#causalReadout')).toContainText('PRESET');

  await page.locator('#spectrumPanel').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#probeWavelength')).toHaveText('444 nm');
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('#probeWavelength')).toHaveText('454 nm');

  const napBefore=await page.locator('#napOutput').textContent();
  await page.locator('#bbpControl').fill('800');
  await expect(page.locator('#napOutput')).toHaveText(napBefore);
  await expect(page.locator('#causalReadout')).toContainText('bbp(443)');

  await expect(page.locator('#absorptionBudget .water-budget-row')).toHaveCount(4);
  await expect(page.locator('#backscatterBudget .water-budget-row')).toHaveCount(2);
});

test('Water as Spectrum prototype keeps controls below the visualization on narrow screens', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile layout assertion');
  await page.goto('/water/prototype.html', { waitUntil:'domcontentloaded' });

  const stage=await page.locator('.water-stage').boundingBox();
  const controls=await page.locator('.water-controls').boundingBox();
  expect(stage).not.toBeNull();
  expect(controls).not.toBeNull();
  expect(controls.y).toBeGreaterThanOrEqual(stage.y + stage.height - 2);

  await expect(page.locator('.water-scene-note')).toBeVisible();
  await expect(page.locator('#probeControl')).toBeVisible();
});
