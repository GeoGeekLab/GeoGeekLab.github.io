import { test, expect } from '@playwright/test';

test('Water as Spectrum opens as a production Lab observatory instrument', async ({ page }) => {
  await page.goto('/lab.html?instrument=water#l13', { waitUntil:'domcontentloaded' });

  const dialog=page.locator('#instrumentDialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-instrument-kind','water');
  await expect(dialog).toHaveAttribute('data-lab-workspace','true');
  await expect(page.locator('#instrumentTitle')).toHaveText('Water as Spectrum');

  await expect(page.locator('.water-lab')).toBeVisible();
  await expect(page.locator('.water-chart')).toHaveCount(3);
  await expect(page.locator('[data-role="a-scale"]')).toContainText('AUTO Y');
  await expect(page.locator('[data-role="bb-scale"]')).toContainText('AUTO Y');
  await expect(page.locator('[data-role="Rrs-scale"]')).toContainText('AUTO Y');
  await expect(page.locator('.water-control-rail')).toBeVisible();
  await expect(page.locator('[data-role="probe-nm"]')).toHaveText('443 nm');
  await expect(page.locator('.water-scene')).toContainText('GLINT PATH · EXCLUDED');
  await expect(page.locator('[data-preset="turbidParticleRich"]')).toHaveText('PARTICLE-RICH');

  const before=await page.locator('[data-role="probe-Rrs"]').textContent();
  await page.locator('[data-preset="cdomRich"]').click();
  await expect(page.locator('[data-output="ag440"]')).toHaveText('0.800 m⁻¹');
  const after=await page.locator('[data-role="probe-Rrs"]').textContent();
  expect(after).not.toBe(before);

  await page.locator('[data-workspace-mode="focus"]').click();
  await expect(page.locator('.water-control-rail')).toBeHidden();
  await expect(page.locator('.water-main')).toBeVisible();

  await page.locator('[data-workspace-mode="inspect"]').click();
  await expect(page.locator('.water-control-rail')).toBeVisible();
  await expect(page.locator('.water-inspect-only')).toBeVisible();
  await expect(page.locator('.water-inspect-only')).toContainText('400–700 nm');
  await expect(page.locator('.water-inspect-only')).toContainText('fixed mean');
  await expect(page.locator('.water-inspect-only')).toContainText('teaching assumption');

  await page.locator('[data-water-mode="iop"]').click();
  await expect(page.locator('.water-lab')).toHaveAttribute('data-mode','iop');

  await page.locator('[data-role="spectrum-panel"]').focus();
  await page.keyboard.press('Shift+ArrowRight');
  await expect(page.locator('[data-role="probe-nm"]')).toHaveText('453 nm');
});

test('Water as Spectrum is listed in Observatory and links to its record', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const card=page.locator('#l13');
  await expect(card).toBeVisible();
  await expect(card.locator('h2')).toHaveText('Water as Spectrum');
  await expect(card).toHaveAttribute('data-instrument-kind','water');
  await expect(card.locator('[data-instrument="water"]')).toBeVisible();
  await expect(card.locator('a[data-record-ref="lab:l13"]')).toHaveAttribute('href',/lab-l13\.html/);
});
